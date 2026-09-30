// Pure game logic + rendering for Cap Quest. No React imports here —
// GameCanvas.tsx drives this class and forwards discrete events to React.

import * as audio from './audio'
import { Camera } from './camera'
import {
  ACCEL,
  AIR_ACCEL,
  AIR_FRICTION,
  COYOTE_TIME,
  createPlayer,
  FRICTION,
  GRAVITY,
  JUMP_BUFFER,
  JUMP_VEL,
  MAX_FALL,
  MAX_RUN,
  POWERUP_DURATION,
  SPEED_BOOST_MULT,
  circleOverlapsRect,
  rectsOverlap,
  type BouncePad,
  type Coin,
  type LevelData,
  type MovingPlatform,
  type Player,
  type PowerUp,
  type PowerUpType,
  type Rect,
  type WindZone,
} from './entities'
import { KILL_Y, PLAYER_SPAWN_X } from './level'

export type GameMode = 'menu' | 'play' | 'win' | 'over'

export interface InputState {
  left: boolean
  right: boolean
  jumpHeld: boolean
  /**
   * Set for one frame when a jump is newly requested. A tap can be shorter than
   * a single frame, so a plain `jumpHeld` edge can be missed entirely by the
   * update loop; this latch guarantees a quick tap is never dropped. The engine
   * clears it after consuming it.
   */
  jumpPressed?: boolean
}

export interface GameCallbacks {
  onCoin: (score: number) => void
  onLives: (lives: number) => void
  onWin: (score: number) => void
  onGameOver: (score: number) => void
  onCheckpoint: (index: number) => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  life: number
  maxLife: number
  size: number
  color: string
  rot: number
  vr: number
}

interface Cloud {
  x: number
  y: number
  r: number
  speed: number
  alpha: number
}

const CONFETTI = ['#f2b233', '#ff6b6b', '#4dd2a0', '#5f8bff', '#e879f9', '#ffd166', '#ffe5b4', '#ffb6c1']

function haptic(ms = 15): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(ms) } catch {}
  }
}

const PALETTE = {
  skyTop: '#141433',
  skyMid: '#3b2f63',
  skyHorizon: '#d96a5a',
  sun: 'rgba(255,215,180,0.95)',
  sunGlow: 'rgba(255,190,140,0.85)',
  mountainFar: '#1d1b40',
  mountainFarShadow: '#16163a',
  skyline: '#241f4d',
  skylineWindow: 'rgba(255,209,102,0.55)',
  hillNear: '#16163a',
  hillNearShadow: '#10102e',
  cloud: 'rgba(255,190,170,',
  mote: 'rgba(255,214,120,',
  platTop: '#3a4180',
  platBodyTop: '#333a70',
  platBodyBot: '#242a52',
  platHighlight: 'rgba(255,255,255,0.08)',
  platShadow: 'rgba(0,0,0,0.12)',
  platBevel: 'rgba(0,0,0,0.16)',
  platEdge: 'rgba(0,0,0,0.14)',
  playerBody: '#1b2838',
  playerBodyLight: '#2c3e50',
  playerGold: '#f2b233',
  playerWhite: '#ffffff',
  playerBlush: 'rgba(255,182,193,0.55)',
  playerSkin: '#ffe5c0',
  spikeBody: '#5c1a2e',
  spikeLight: '#8f2f48',
  spikeStripe: '#f2b233',
  spikeGlow: 'rgba(140,40,64,0.25)',
  moverBody: '#c03a4e',
  moverAccent: '#f2b233',
  flagBannerTop: '#f2b233',
  flagBannerBot: '#c87f1e',
  vignetteInner: 'rgba(20,10,30,0)',
  vignetteOuter: 'rgba(20,10,30,0.42)',
} as const

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

export class Game {
  mode: GameMode = 'menu'
  time = 0
  score = 0
  lives = 3
  shake = 0

  private level: LevelData
  private player: Player
  private camera: Camera
  private callbacks: GameCallbacks
  private particles: Particle[] = []
  private clouds: Cloud[] = []
  private prevJump = false
  private lastCheckpoint = -1
  private movingPlatforms: MovingPlatform[] = []
  private bouncePads: BouncePad[] = []
  private windZones: WindZone[] = []
  private powerUps: PowerUp[] = []
  private powerUpTimers: Partial<Record<PowerUpType, number>> = {}

  constructor(level: LevelData, viewW: number, callbacks: GameCallbacks) {
    this.level = level
    this.camera = new Camera(viewW, level.width)
    this.callbacks = callbacks
    this.player = createPlayer(PLAYER_SPAWN_X, this.groundY() - 58)
    this.camera.snap(PLAYER_SPAWN_X)
    this.movingPlatforms = level.movingPlatforms.map(p => ({ ...p }))
    this.bouncePads = level.bouncePads.map(p => ({ ...p }))
    this.windZones = level.windZones.map(z => ({ ...z }))
    this.powerUps = level.powerUps.map(p => ({ ...p }))
    for (let i = 0; i < 26; i++) {
      this.clouds.push({
        x: Math.random() * 2400,
        y: 30 + Math.random() * 260,
        r: 26 + Math.random() * 42,
        speed: 6 + Math.random() * 10,
        alpha: 0.12 + Math.random() * 0.16,
      })
    }
  }

  private groundY(): number {
    return this.level.checkpoints.length > 0 ? this.level.checkpoints[0].y : 460
  }

  reset(): void {
    this.score = 0
    this.lives = 3
    this.mode = 'play'
    this.shake = 0
    this.particles = []
    this.lastCheckpoint = -1
    this.level.coins.forEach((c) => (c.collected = false))
    this.level.checkpoints.forEach((c) => (c.active = false))
    this.level.flag.unfurl = 0
    this.player = createPlayer(PLAYER_SPAWN_X, this.groundY() - 58)
    this.player.facing = 1
    this.camera.snap(PLAYER_SPAWN_X)
    this.movingPlatforms = this.level.movingPlatforms.map(p => ({ ...p }))
    this.bouncePads = this.level.bouncePads.map(p => ({ ...p }))
    this.windZones = this.level.windZones.map(z => ({ ...z }))
    this.powerUps = this.level.powerUps.map(p => ({ ...p }))
    this.powerUpTimers = {}
  }

  toMenu(): void {
    this.mode = 'menu'
    this.camera.x = 0
  }

  /** Keep the camera framing in step with a resized viewport. */
  setViewW(viewW: number): void {
    this.camera.setViewW(viewW)
  }

  get snapshot() {
    return { score: this.score, lives: this.lives, mode: this.mode }
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  update(dt: number, input: InputState): void {
    this.time += dt
    this.shake = Math.max(0, this.shake - dt * 1.7)

    if (this.mode === 'play') {
      for (const m of this.level.movers) {
        m.x += m.dir * m.speed * dt
        m.rot += dt * 4
        if (m.x > m.maxX) {
          m.x = m.maxX
          m.dir = -1
        } else if (m.x < m.minX) {
          m.x = m.minX
          m.dir = 1
        }
      }

      for (const mp of this.movingPlatforms) {
        const t = (Math.sin(this.time * mp.speed * 0.001 + mp.phase) + 1) / 2
        if (mp.axis === 'x') {
          mp.x = mp.startX + (mp.endX - mp.startX) * t
        } else {
          mp.y = mp.startY + (mp.endY - mp.startY) * t
        }
      }

      this.updatePlayer(dt, input)
      this.applyWindZones(dt)
      this.checkBouncePads()
      this.checkPowerUps()
      this.updatePowerUpTimers(dt)
      this.checkInteractions()
      if (Number.isFinite(this.player.x) && Number.isFinite(this.player.y)) {
        this.camera.update(dt, this.player.x + this.player.w / 2)
      }
    } else if (this.mode === 'menu') {
      this.camera.x = 0
    } else if (this.mode === 'win') {
      this.level.flag.unfurl = Math.min(1, this.level.flag.unfurl + dt * 0.9)
    }

    this.updateParticles(dt)
  }

  private updatePlayer(dt: number, input: InputState): void {
    const p = this.player
    const speedMult = p.activePowerUps.includes('speedBoost') ? SPEED_BOOST_MULT : 1
    const accel = p.onGround ? ACCEL : AIR_ACCEL
    if (input.right && !input.left) {
      p.vx = Math.min(p.vx + accel * dt * speedMult, MAX_RUN * speedMult)
      p.facing = 1
    } else if (input.left && !input.right) {
      p.vx = Math.max(p.vx - accel * dt * speedMult, -MAX_RUN * speedMult)
      p.facing = -1
    } else {
      const fr = p.onGround ? FRICTION : AIR_FRICTION
      const d = fr * dt
      if (Math.abs(p.vx) <= d) p.vx = 0
      else p.vx -= Math.sign(p.vx) * d
    }

    if (p.onGround) p.coyote = COYOTE_TIME
    else p.coyote -= dt

    // A jump is requested either by the explicit one-frame latch (which a touch
    // tap sets, so a sub-frame tap is never lost) or by a rising edge on the
    // held key/button.
    const jumpPressed = input.jumpPressed === true || (input.jumpHeld && !this.prevJump)
    this.prevJump = input.jumpHeld
    if (jumpPressed) p.buffer = JUMP_BUFFER
    else if (p.buffer > 0) p.buffer -= dt
    // Consume the latch so one tap produces exactly one jump.
    input.jumpPressed = false

    if (p.buffer > 0 && (p.onGround || p.coyote > 0 || (p.activePowerUps.includes('doubleJump') && p.jumpsLeft > 0))) {
      p.vy = JUMP_VEL
      p.onGround = false
      p.coyote = 0
      p.buffer = 0
      p.squash = 0.8
      audio.playJump()
      if (!p.onGround && p.activePowerUps.includes('doubleJump')) {
        p.jumpsLeft -= 1
      }
    }

    const g = input.jumpHeld || p.vy >= 0 ? GRAVITY : GRAVITY * 1.9
    const vy = Number.isFinite(g) ? Math.min(p.vy + g * dt, MAX_FALL) : p.vy
    p.vy = Number.isFinite(vy) ? vy : p.vy

    this.moveAndCollide(p, dt)

    if (p.onGround) p.jumpsLeft = p.activePowerUps.includes('doubleJump') ? 2 : 1

    p.squash += (0 - p.squash) * Math.min(1, dt * 9)

    if (p.onGround && Math.abs(p.vx) > MAX_RUN * 0.78) p.runTrail = 1
    else p.runTrail = Math.max(0, p.runTrail - dt * 6)

    if (p.invuln > 0) p.invuln -= dt
  }

  /**
   * Axis-separated AABB resolution: move along X first and resolve, then move
   * along Y and resolve. Resolving one axis at a time prevents corner clipping
   * and lets us determine the side of impact (landing, ceiling, or wall).
   *
   * Gap protection: if the player was standing on a platform and horizontal
   * motion would carry them into a gap, revert the horizontal move so they
   * don't accidentally walk off ledges.
   */
  private moveAndCollide(p: Player, dt: number): void {
    const plats = this.level.platforms
    const prevX = p.x
    const wasOnGround = p.onGround

    p.x = Number.isFinite(p.vx) ? p.x + p.vx * dt : p.x
    for (const plat of plats) {
      if (rectsOverlap(p, plat)) {
        if (p.vx > 0) p.x = plat.x - p.w
        else if (p.vx < 0) p.x = plat.x + plat.w
        p.vx = 0
      }
    }

    const wasFalling = p.vy > 0
    p.y = Number.isFinite(p.vy) ? p.y + p.vy * dt : p.y
    p.onGround = false
    for (const plat of plats) {
      if (rectsOverlap(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.h
          p.vy = 0
          p.onGround = true
          if (wasFalling) p.squash = -0.6
        } else if (p.vy < 0) {
          p.y = plat.y + plat.h
          p.vy = 0
        }
      }
    }

    for (const mp of this.movingPlatforms) {
      if (rectsOverlap(p, mp)) {
        if (p.vy > 0) {
          p.y = mp.y - p.h
          p.vy = 0
          p.onGround = true
          if (wasFalling) p.squash = -0.6
          p.x += (mp.x - mp.startX) * dt
        } else if (p.vy < 0) {
          p.y = mp.y + mp.h
          p.vy = 0
        }
      }
    }

    if (wasOnGround && !p.onGround && p.vy > 0) {
      p.x = prevX
      p.vx = 0
    }

    if (Number.isFinite(p.vx) && Number.isFinite(p.vy)) {
  p.x = Math.max(0, Math.min(this.level.width - p.w, p.x))
  p.y = Math.max(-200, Math.min(KILL_Y, p.y))
  p.x = Math.max(0, Math.min(this.level.width - p.w, p.x))
  p.y = Math.max(-200, Math.min(KILL_Y, p.y))
    }
  }

  private applyWindZones(dt: number): void {
    const p = this.player
    for (const z of this.windZones) {
      if (rectsOverlap(p, z)) {
        const windEffect = z.force * z.direction * dt
        const nextX = p.x + windEffect
        if (nextX >= 0 && nextX + p.w <= this.level.width) {
          p.vx += windEffect
        }
      }
    }
  }

  private checkBouncePads(): void {
    const p = this.player
    for (const bp of this.bouncePads) {
      if (rectsOverlap(p, bp) && p.vy >= 0) {
        const nextY = p.y - JUMP_VEL * bp.strength
        let blocked = false
        for (const plat of this.level.platforms) {
          if (rectsOverlap({ x: p.x, y: nextY, w: p.w, h: p.h }, plat)) {
            blocked = true
            break
          }
        }
        if (!blocked) {
          p.vy = Math.max(p.vy, JUMP_VEL * bp.strength)
          p.onGround = false
          p.squash = 0.7
          haptic(25)
          this.spawnBurst(bp.x + bp.w / 2, bp.y, '#4dd2a0', 8)
        }
      }
    }
  }

  private checkPowerUps(): void {
    const p = this.player
    for (const pu of this.powerUps) {
      if (pu.collected) continue
      if (circleOverlapsRect(pu.x, pu.y, pu.r, p)) {
        pu.collected = true
        this.powerUpTimers[pu.type] = POWERUP_DURATION
        if (!p.activePowerUps.includes(pu.type)) {
          p.activePowerUps.push(pu.type)
        }
        if (pu.type === 'shield') p.invuln = Math.max(p.invuln, POWERUP_DURATION)
        haptic(10)
        audio.playPowerUp()
        this.spawnBurst(pu.x, pu.y, '#5f8bff', 10)
      }
    }
  }

  private updatePowerUpTimers(dt: number): void {
    const p = this.player
    for (const type of Object.keys(this.powerUpTimers) as PowerUpType[]) {
      const remaining = this.powerUpTimers[type]
      if (remaining === undefined || remaining <= 0) continue
      const next = Math.max(0, remaining - dt)
      this.powerUpTimers[type] = next
      if (next <= 0) {
        p.activePowerUps = p.activePowerUps.filter(t => t !== type)
        delete this.powerUpTimers[type]
      }
    }
  }

  private checkInteractions(): void {
    const p = this.player

    for (const c of this.level.coins) {
      if (c.collected) continue
      if (circleOverlapsRect(c.x, c.y, c.r, p)) this.collectCoin(c)
    }

    // Static spike shards (slightly inset hitbox so corners are forgiving).
    for (const s of this.level.spikes) {
      const hit: Rect = { x: s.x + 5, y: s.y, w: s.w - 10, h: s.h - 2 }
      if (rectsOverlap(p, hit)) {
        this.damage()
        return
      }
    }

    // Moving hazards (circle vs player rect).
    for (const m of this.level.movers) {
      if (circleOverlapsRect(m.x, m.y, m.r - 3, p)) {
        this.damage()
        return
      }
    }

    // Checkpoints.
    for (let i = 0; i < this.level.checkpoints.length; i++) {
      const cp = this.level.checkpoints[i]
      if (cp.active) continue
      const region: Rect = { x: cp.x - 24, y: cp.y - 64, w: 48, h: 64 }
      if (rectsOverlap(p, region)) {
        cp.active = true
        this.lastCheckpoint = i
        audio.playCheckpoint()
        this.spawnBurst(cp.x, cp.y - 60, '#ffd166', 14)
        this.callbacks.onCheckpoint(i)
      }
    }

    // Finish flag.
    const f = this.level.flag
    const flagRect: Rect = { x: f.x - 8, y: f.poleTop, w: 16, h: f.y - f.poleTop }
    if (rectsOverlap(p, flagRect)) {
      this.win()
      return
    }

    // Fell into a pit.
    if (p.y > KILL_Y) this.damage()
  }

  private collectCoin(c: Coin): void {
    c.collected = true
    this.score += 100
    audio.playCoin()
    this.spawnBurst(c.x, c.y, '#ffd166', 9)
    this.callbacks.onCoin(this.score)
  }

  private win(): void {
    if (this.mode !== 'play') return
    this.mode = 'win'
    audio.playWin()
    this.confetti()
    this.callbacks.onWin(this.score)
    this.saveProgress()
  }

  private damage(): void {
    if (this.player.invuln > 0 || this.mode !== 'play') return
    this.lives -= 1
    this.shake = 0.45
    this.player.invuln = 1.5
    this.player.activePowerUps = []
    this.player.powerUpTimers = {}
    this.powerUpTimers = {}
    audio.playHit()
    this.spawnBurst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#ff6b6b', 10)
    haptic(30)
    this.callbacks.onLives(this.lives)
    if (this.lives <= 0) {
      this.mode = 'over'
      audio.playGameOver()
      this.callbacks.onGameOver(this.score)
      this.saveProgress()
      return
    }
    this.respawn()
  }

  private respawn(): void {
    const p = this.player
    if (this.lastCheckpoint >= 0) {
      const cp = this.level.checkpoints[this.lastCheckpoint]
      p.x = cp.x - 40
    } else {
      p.x = PLAYER_SPAWN_X
    }
    p.y = this.groundY() - p.h
    p.vx = 0
    p.vy = 0
    p.onGround = true
    this.camera.snap(p.x)
  }

  private saveProgress(): void {
    try {
      const data = {
        highScore: Math.max(this.score, this.getHighScore()),
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('capquest_save', JSON.stringify(data))
      }
    } catch {}
  }

  private getHighScore(): number {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('capquest_save')
        if (raw) return JSON.parse(raw).highScore ?? 0
      }
    } catch {}
    return 0
  }

  // -------------------------------------------------------------------------
  // Particles
  // -------------------------------------------------------------------------
  private spawnBurst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 60 + Math.random() * 160
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        gravity: 420,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 2 + Math.random() * 3,
        color,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
      })
    }
  }

  private confetti(): void {
    for (let i = 0; i < 130; i++) {
      this.particles.push({
        x: Math.random() * this.camera.getViewW(),
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 220,
        vy: 120 + Math.random() * 220,
        gravity: 260,
        life: 1.6 + Math.random() * 1.2,
        maxLife: 2.8,
        size: 4 + Math.random() * 5,
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 10,
      })
    }
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particles) {
      pt.x += pt.vx * dt
      pt.y += pt.vy * dt
      pt.vy += pt.gravity * dt
      pt.rot += pt.vr * dt
      pt.life -= dt
    }
    this.particles = this.particles.filter((pt) => pt.life > 0)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
   render(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    this.renderBackground(ctx, viewW, viewH)

    ctx.save()
    const s = this.shake
    ctx.translate(
      -this.camera.x + (Math.random() * 2 - 1) * s * 22,
      (Math.random() * 2 - 1) * s * 18,
    )

    this.renderTerrain(ctx)
    this.renderMovingPlatforms(ctx)
    this.renderCheckpoints(ctx)
    this.renderCoins(ctx)
    this.renderBouncePads(ctx)
    this.renderSpikes(ctx)
    this.renderMovers(ctx)
    this.renderWindZones(ctx)
    this.renderPowerUps(ctx)
    this.renderFlag(ctx)
    if (this.mode === 'menu') this.renderMenuPlayer(ctx)
    else this.renderPlayer(ctx)
    this.renderParticles(ctx)
    ctx.restore()

    this.renderVignette(ctx, viewW, viewH)
  }

  // --- Background ----------------------------------------------------------
  private renderBackground(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    // Dusk sky: deep indigo at top, violet, warm coral at the horizon.
    const sky = ctx.createLinearGradient(0, 0, 0, 460)
    sky.addColorStop(0, '#141433')
    sky.addColorStop(0.42, '#3b2f63')
    sky.addColorStop(0.75, '#7a4a6b')
    sky.addColorStop(1, '#d96a5a')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, viewW, viewH)

    // Soft pale pink-orange moon glow near the horizon.
    const sx = viewW * 0.72
    const sy = 330
    const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 170)
    glow.addColorStop(0, 'rgba(255,190,140,0.85)')
    glow.addColorStop(0.35, 'rgba(255,150,110,0.35)')
    glow.addColorStop(1, 'rgba(255,150,110,0)')
    ctx.fillStyle = glow
    ctx.fillRect(sx - 190, sy - 190, 380, 380)
    ctx.fillStyle = 'rgba(255,215,180,0.95)'
    ctx.beginPath()
    ctx.arc(sx, sy, 34, 0, Math.PI * 2)
    ctx.fill()

    // Far mountains (dark jagged triangles), parallax 0.1.
    const mh = this.camera.x * 0.1
    this.drawMountains(ctx, viewW, 396, '#1d1b40', mh, 460, [190, 120, 260, 170, 300, 140, 240, 200, 110, 260, 180, 220])

    // Soft glowing fog/atmosphere spots scattered among the peaks.
    const spots = ['rgba(255,190,140,0.16)', 'rgba(255,214,120,0.11)', 'rgba(255,150,110,0.13)']
    for (let i = 0; i < 12; i++) {
      const px = (((i * 137 - mh) % viewW) + viewW) % viewW
      const py = 292 + ((i * 61) % 92)
      const pr = 30 + ((i * 17) % 44)
      const pa = 0.5 + 0.5 * Math.sin(this.time * 1.2 + i)
      const g = ctx.createRadialGradient(px, py, 2, px, py, pr)
      g.addColorStop(0, spots[i % 3])
      g.addColorStop(1, 'rgba(255,190,140,0)')
      ctx.fillStyle = g
      ctx.globalAlpha = pa
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Mid skyline (buildings), parallax 0.3.
    const skylineX = -((this.camera.x * 0.3) % 700)
    this.drawSkyline(ctx, viewW, 440, '#241f4d', skylineX, 700, 24)

    // Soft fog between layers.
    const fog = ctx.createLinearGradient(0, 250, 0, 450)
    fog.addColorStop(0, 'rgba(217,106,90,0)')
    fog.addColorStop(1, 'rgba(217,106,90,0.28)')
    ctx.fillStyle = fog
    ctx.fillRect(0, 250, viewW, 200)

    // Clouds drifting, parallax 0.15.
    for (const c of this.clouds) {
      const span = viewW + 400
      const cx = (((c.x - this.camera.x * 0.15 + this.time * c.speed) % span) + span) % span - 200
      const g = ctx.createRadialGradient(cx, c.y, c.r * 0.1, cx, c.y, c.r)
      g.addColorStop(0, `rgba(255,190,170,${c.alpha})`)
      g.addColorStop(1, 'rgba(255,190,170,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, c.y, c.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Near rolling hills, parallax 0.55.
    const nearX = -((this.camera.x * 0.55) % 800)
    this.drawHills(ctx, viewW, 470, '#16163a', nearX, 800, 40, 70)

    // Ambient drifting motes.
    ctx.save()
    for (let i = 0; i < 40; i++) {
      const px = ((i * 137) % viewW) + viewW * Math.floor((this.camera.x * 0.25) / viewW) - (this.camera.x * 0.25) % viewW
      const x = ((px % viewW) + viewW) % viewW
      const y = 60 + ((i * 53) % 300)
      const a = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(this.time * 1.6 + i))
      ctx.fillStyle = `rgba(255,214,120,${a})`
      ctx.beginPath()
      ctx.arc(x, y, i % 2 === 0 ? 1.6 : 1, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawMountains(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    baseY: number,
    color: string,
    offset: number,
    patternW: number,
    peaks: number[],
  ): void {
    if (!peaks || peaks.length === 0 || patternW <= 0) return
    ctx.fillStyle = color
    const span = viewW + patternW * 2
    const start = -patternW - ((offset % patternW) + patternW) % patternW
    for (let x = start; x < span; x += patternW) {
      peaks.forEach((h, i) => {
        const cx = x + (i / peaks.length) * patternW
        const w = patternW / peaks.length + 20
        ctx.beginPath()
        ctx.moveTo(cx - w, baseY)
        ctx.quadraticCurveTo(cx - w * 0.3, baseY - h * 0.7, cx, baseY - h)
        ctx.quadraticCurveTo(cx + w * 0.3, baseY - h * 0.7, cx + w, baseY)
        ctx.closePath()
        ctx.fill()
      })
    }
  }

  private drawSkyline(ctx: CanvasRenderingContext2D, viewW: number, baseY: number, color: string, offset: number, patternW: number, maxH: number): void {
    if (maxH <= 0 || patternW <= 0) return
    ctx.fillStyle = color
    const heights = [maxH * 0.7, maxH, maxH * 0.5, maxH * 0.85, maxH * 0.6, maxH * 0.95]
    const widths = [55, 40, 70, 48, 62, 44]
    const span = viewW + patternW * 2
    const start = -patternW - ((offset % patternW) + patternW) % patternW
    for (let x = start; x < span; x += patternW) {
      heights.forEach((h, i) => {
        const bx = x + i * (patternW / 6)
        const bw = widths[i]
        ctx.beginPath()
        ctx.moveTo(bx, baseY)
        ctx.lineTo(bx, baseY - h + 8)
        ctx.quadraticCurveTo(bx + bw / 2, baseY - h - 4, bx + bw, baseY - h + 8)
        ctx.lineTo(bx + bw, baseY)
        ctx.closePath()
        ctx.fill()
        if (i % 2 === 0) {
          ctx.fillStyle = PALETTE.skylineWindow
          ctx.fillRect(bx + bw * 0.2, baseY - h + 16, 4, 5)
          ctx.fillRect(bx + bw * 0.55, baseY - h + 24, 4, 5)
          ctx.fillStyle = color
        }
      })
    }
  }

  private drawHills(ctx: CanvasRenderingContext2D, viewW: number, baseY: number, color: string, offset: number, patternW: number, amp: number, len: number): void {
    if (patternW <= 0 || len <= 0) return
    ctx.fillStyle = color
    const span = viewW + patternW * 2
    const start = -patternW - ((offset % patternW) + patternW) % patternW
    for (let x = start; x < span; x += patternW) {
      ctx.beginPath()
      ctx.moveTo(x, baseY + 30)
      ctx.quadraticCurveTo(x + len * 0.5, baseY - amp, x + len, baseY + 20)
      ctx.quadraticCurveTo(x + patternW - len * 0.3, baseY - amp * 0.6, x + patternW, baseY + 30)
      ctx.closePath()
      ctx.fill()
    }
  }

  // --- World ---------------------------------------------------------------
  private renderTerrain(ctx: CanvasRenderingContext2D): void {
    const tones = [
      ['#333a70', '#242a52'],
      ['#3a4180', '#2a3059'],
      ['#2c3266', '#1f2448'],
    ]
    for (const p of this.level.platforms) {
      const t = tones[p.variant % 3]
      const grad = ctx.createLinearGradient(0, p.y, 0, p.y + Math.min(p.h, 90))
      grad.addColorStop(0, t[0])
      grad.addColorStop(1, t[1])
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(p.x + 8, p.y)
      ctx.lineTo(p.x + p.w - 8, p.y)
      ctx.lineTo(p.x + p.w, p.y + 10)
      ctx.lineTo(p.x + p.w, p.y + p.h)
      ctx.lineTo(p.x, p.y + p.h)
      ctx.lineTo(p.x, p.y + 10)
      ctx.closePath()
      ctx.fill()

      // Crisp gold highlight strip on every top walkable edge.
      ctx.fillStyle = 'rgba(242,178,51,0.9)'
      ctx.fillRect(p.x + 8, p.y, p.w - 16, 2.5)
      // Subtle light slab under the edge.
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(p.x + 8, p.y + 2.5, p.w - 16, 6)
      // Low-poly notch facets on the sides.
      ctx.fillStyle = 'rgba(0,0,0,0.16)'
      ctx.beginPath()
      ctx.moveTo(p.x, p.y + 10)
      ctx.lineTo(p.x + 14, p.y + 10)
      ctx.lineTo(p.x + 14, p.y + 34)
      ctx.closePath()
      ctx.fill()
      // Sparse texture dots.
      ctx.fillStyle = 'rgba(0,0,0,0.14)'
      for (let k = 0; k < 3; k++) {
        const nx = p.x + 18 + ((p.seed * 37 + k * 53) % Math.max(10, p.w - 50))
        const ny = p.y + 16 + ((p.seed * 11 + k * 29) % Math.min(50, Math.max(8, p.h - 10)))
        ctx.fillRect(nx, ny, 6, 3)
      }
    }
  }

  private renderMovingPlatforms(ctx: CanvasRenderingContext2D): void {
    for (const mp of this.movingPlatforms) {
      ctx.save()
      const x = mp.x
      const y = mp.y
      const w = mp.w
      const h = mp.h

      const bodyGrad = ctx.createLinearGradient(0, y, 0, y + h)
      bodyGrad.addColorStop(0, '#3a4180')
      bodyGrad.addColorStop(1, '#2a3059')
      ctx.fillStyle = bodyGrad
      ctx.beginPath()
      ctx.moveTo(x + 7, y)
      ctx.lineTo(x + w - 7, y)
      ctx.lineTo(x + w, y + 9)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x, y + h)
      ctx.lineTo(x, y + 9)
      ctx.closePath()
      ctx.fill()

      // Crisp gold highlight strip on the top walkable edge.
      ctx.fillStyle = 'rgba(242,178,51,0.9)'
      ctx.fillRect(x + 7, y, w - 14, 2.5)
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(x + 7, y + 2.5, w - 14, 5)

      // Brass rail markers so it reads as a travelling platform.
      ctx.fillStyle = '#f2b233'
      for (let k = 0; k < 3; k++) {
        const rx = x + 12 + k * ((w - 24) / 2)
        ctx.fillRect(rx, y + h - 5, 3, 3)
      }

      ctx.restore()
    }
  }

  private renderBouncePads(ctx: CanvasRenderingContext2D): void {
    for (const bp of this.bouncePads) {
      ctx.save()
      const x = bp.x
      const y = bp.y
      const w = bp.w
      const h = bp.h

      ctx.fillStyle = '#2e7d63'
      ctx.beginPath()
      ctx.moveTo(x + 8, y)
      ctx.lineTo(x + w - 8, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + 8)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x, y + h)
      ctx.lineTo(x, y + 8)
      ctx.quadraticCurveTo(x, y, x + 8, y)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#f2b233'
      ctx.fillRect(x + 8, y, w - 16, 2.5)

      ctx.fillStyle = '#1d5544'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(x + 16 + i * 20, y + h - 4)
        ctx.lineTo(x + 24 + i * 20, y + h - 12)
        ctx.lineTo(x + 32 + i * 20, y + h - 4)
        ctx.closePath()
        ctx.fill()
      }

      ctx.restore()
    }
  }

  private renderWindZones(ctx: CanvasRenderingContext2D): void {
    for (const z of this.windZones) {
      ctx.save()
      ctx.globalAlpha = 0.16
      ctx.fillStyle = '#4a3a8f'
      ctx.fillRect(z.x, z.y, z.w, z.h)

      ctx.strokeStyle = 'rgba(255,209,102,0.35)'
      ctx.lineWidth = 1.2
      for (let i = 0; i < 5; i++) {
        const lx = z.x + 8 + i * 28
        ctx.beginPath()
        ctx.moveTo(lx, z.y + 6)
        ctx.lineTo(lx + 14, z.y + z.h / 2)
        ctx.lineTo(lx, z.y + z.h - 6)
        ctx.stroke()
      }

      for (let i = 0; i < 6; i++) {
        const px = z.x + ((this.time * 40 + i * 37) % z.w)
        const py = z.y + ((i * 43) % z.h)
        ctx.fillStyle = 'rgba(255,214,120,0.5)'
        ctx.beginPath()
        ctx.arc(px, py, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  }

  private renderPowerUps(ctx: CanvasRenderingContext2D): void {
    for (const pu of this.powerUps) {
      if (pu.collected) continue
      ctx.save()
      const bob = Math.sin(this.time * 3 + pu.x) * 3
      const pulse = 0.35 + 0.25 * Math.sin(this.time * 4 + pu.x)
      const glow = ctx.createRadialGradient(pu.x, pu.y + bob, 2, pu.x, pu.y + bob, 22)
      glow.addColorStop(0, `rgba(95,139,255,${pulse})`)
      glow.addColorStop(1, 'rgba(95,139,255,0)')
      ctx.fillStyle = glow
      ctx.fillRect(pu.x - 22, pu.y + bob - 22, 44, 44)

      ctx.translate(pu.x, pu.y + bob)
      ctx.scale(0.7, 0.7)

      const colors: Record<PowerUpType, { main: string; light: string; dark: string }> = {
        doubleJump: { main: '#5f8bff', light: '#8aabff', dark: '#3a5fc7' },
        speedBoost: { main: '#ff6b6b', light: '#ff8e8e', dark: '#c73e3e' },
        magnet: { main: '#e879f9', light: '#f0a0ff', dark: '#b34db5' },
        shield: { main: '#4dd2a0', light: '#7ae8c4', dark: '#2a9d6e' },
      }
      const c = colors[pu.type]
      const g = ctx.createLinearGradient(0, -pu.r, 0, pu.r)
      g.addColorStop(0, c.light)
      g.addColorStop(0.5, c.main)
      g.addColorStop(1, c.dark)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, pu.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const labels: Record<PowerUpType, string> = {
        doubleJump: '2X',
        speedBoost: '>>',
        magnet: '<3',
        shield: 'O',
      }
      ctx.fillText(labels[pu.type], 0, 0)

      ctx.restore()
    }
  }

  private renderCheckpoints(ctx: CanvasRenderingContext2D): void {
    for (const cp of this.level.checkpoints) {
      const y = cp.y
      ctx.save()
      if (cp.active) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 5)
        const glow = ctx.createRadialGradient(cp.x, y - 66, 2, cp.x, y - 66, 22)
        glow.addColorStop(0, `rgba(255,209,102,${0.5 + pulse * 0.3})`)
        glow.addColorStop(1, 'rgba(255,209,102,0)')
        ctx.fillStyle = glow
        ctx.fillRect(cp.x - 26, y - 92, 52, 52)
      }
      ctx.fillStyle = cp.active ? '#ffd166' : '#56598c'
      ctx.fillRect(cp.x - 3, y - 60, 6, 60)
      ctx.fillStyle = cp.active ? '#ffd166' : '#43467a'
      ctx.beginPath()
      ctx.arc(cp.x, y - 62, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1b1f42'
      ctx.fillRect(cp.x - 12, y - 6, 24, 6)
      ctx.restore()
    }
  }

  private renderCoins(ctx: CanvasRenderingContext2D): void {
    for (const c of this.level.coins) {
      if (c.collected) continue
      const bob = Math.sin(this.time * 3 + c.phase) * 3
      const flip = Math.abs(Math.cos(this.time * 3 + c.phase))
      const sc = 0.35 + flip * 0.65
      const y = c.y + bob

      // Soft glow pulse.
      const pulse = 0.35 + 0.25 * Math.sin(this.time * 4 + c.phase)
      const glow = ctx.createRadialGradient(c.x, y, 2, c.x, y, 26)
      glow.addColorStop(0, `rgba(255,209,102,${pulse})`)
      glow.addColorStop(1, 'rgba(255,209,102,0)')
      ctx.fillStyle = glow
      ctx.fillRect(c.x - 28, y - 28, 56, 56)

      ctx.save()
      ctx.translate(c.x, y)
      ctx.scale(sc, 1)

      const g = ctx.createLinearGradient(0, -c.r, 0, c.r)
      g.addColorStop(0, '#ffe08a')
      g.addColorStop(0.5, '#f2b233')
      g.addColorStop(1, '#c87f1e')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, c.r, 0, Math.PI * 2)
      ctx.fill()

      // Gold rim
      ctx.strokeStyle = '#9a5f14'
      ctx.lineWidth = 2
      ctx.stroke()

      // Inner highlight ring
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, c.r * 0.55, 0, Math.PI * 2)
      ctx.stroke()

      // Medallion star/ribbon detail (graduation theme)
      ctx.fillStyle = '#e8a31a'
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2
        const outerR = c.r * 0.45
        const innerR = c.r * 0.18
        const x = Math.cos(angle) * outerR
        const y = Math.sin(angle) * outerR
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        const innerAngle = angle + Math.PI / 5
        const ix = Math.cos(innerAngle) * innerR
        const iy = Math.sin(innerAngle) * innerR
        ctx.lineTo(ix, iy)
      }
      ctx.closePath()
      ctx.fill()

      // Center dot
      ctx.fillStyle = '#c87f1e'
      ctx.beginPath()
      ctx.arc(0, 0, c.r * 0.12, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  }

  private renderSpikes(ctx: CanvasRenderingContext2D): void {
    for (const s of this.level.spikes) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || s.w <= 0 || s.h <= 0) continue
      const step = 18
      for (let x = s.x; x < s.x + s.w - 2; x += step) {
        if (!Number.isFinite(x)) break
        const baseW = Math.min(step, s.x + s.w - x)
        if (!Number.isFinite(baseW) || baseW <= 0) continue
        ctx.save()
        const glow = ctx.createRadialGradient(x + baseW / 2, s.y + s.h, Math.min(8, baseW), x + baseW / 2, s.y + s.h, Math.min(300, baseW))
        glow.addColorStop(0, PALETTE.spikeGlow)
        glow.addColorStop(1, 'rgba(140,40,64,0)')
        ctx.fillStyle = glow
        ctx.fillRect(x + baseW / 2 - baseW, s.y, baseW * 2, s.h)

        const g = ctx.createLinearGradient(x, s.y + s.h, x, s.y - 6)
        g.addColorStop(0, PALETTE.spikeBody)
        g.addColorStop(1, PALETTE.spikeLight)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x, s.y + s.h)
        ctx.lineTo(x + baseW / 2, s.y - 6)
        ctx.lineTo(x + baseW, s.y + s.h)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = PALETTE.spikeStripe
        ctx.globalAlpha = 0.35
        for (let i = -2; i < 4; i++) {
          const stripeX = x + (baseW / 6) * i
          ctx.beginPath()
          ctx.moveTo(stripeX, s.y + s.h)
          ctx.lineTo(stripeX + baseW * 0.28, s.y - 4)
          ctx.lineTo(stripeX + baseW * 0.18, s.y - 4)
          ctx.lineTo(stripeX - baseW * 0.1, s.y + s.h)
          ctx.closePath()
          ctx.fill()
        }
        ctx.globalAlpha = 1

        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, s.y + s.h)
        ctx.lineTo(x + baseW / 2, s.y - 6)
        ctx.stroke()

        ctx.restore()
      }
    }
  }

  private renderMovers(ctx: CanvasRenderingContext2D): void {
    for (const m of this.level.movers) {
      if (m.r <= 0 || !Number.isFinite(m.r) || !Number.isFinite(m.x) || !Number.isFinite(m.y)) continue
      ctx.save()
      ctx.translate(m.x, m.y + Math.sin(this.time * 2.5 + m.seed) * 2)

      const auraR = Math.min(250, m.r * 2)
      const aura = ctx.createRadialGradient(0, 0, Math.min(8, auraR), 0, 0, auraR)
      aura.addColorStop(0, 'rgba(140,40,64,0.24)')
      aura.addColorStop(1, 'rgba(140,40,64,0)')
      ctx.fillStyle = aura
      ctx.beginPath()
      ctx.arc(0, 0, auraR, 0, Math.PI * 2)
      ctx.fill()

      ctx.rotate(m.rot)
      ctx.fillStyle = PALETTE.moverBody
      for (let k = 0; k < 6; k++) {
        ctx.save()
        ctx.rotate((k * Math.PI) / 3)
        ctx.beginPath()
        ctx.moveTo(-5, 0)
        ctx.lineTo(m.r * 1.45, -6)
        ctx.lineTo(m.r * 1.45, 6)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(242,178,51,0.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(-5, 0)
        ctx.lineTo(m.r * 1.45, -6)
        ctx.stroke()
        ctx.restore()
      }
      ctx.fillStyle = '#c03a4e'
      ctx.beginPath()
      ctx.arc(0, 0, m.r * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = PALETTE.moverAccent
      ctx.beginPath()
      ctx.arc(0, 0, m.r * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private renderFlag(ctx: CanvasRenderingContext2D): void {
    const f = this.level.flag
    const poleX = f.x
    // Pole.
    ctx.fillStyle = '#4a4f86'
    ctx.fillRect(poleX - 2, f.poleTop, 4, f.y - f.poleTop)
    ctx.fillStyle = '#f2b233'
    ctx.fillRect(poleX - 3, f.poleTop, 6, 4)
    // Diploma scroll.
    const unfurl = f.unfurl
    const bannerW = 8 + unfurl * 82
    const bannerH = 26
    const bx = poleX + 2
    const by = f.poleTop + 2
    ctx.save()
    // Wave distortion along the free edge.
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      const wx = bx + bannerW * t
      const wy = by + Math.sin(this.time * 6 + t * 5) * 3
      if (i === 0) ctx.moveTo(wx, wy)
      else ctx.lineTo(wx, wy)
    }
    for (let i = 6; i >= 0; i--) {
      const t = i / 6
      const wx = bx + bannerW * t
      const wy = by + bannerH + Math.sin(this.time * 6 + t * 5) * 3
      ctx.lineTo(wx, wy)
    }
    ctx.closePath()
    const g = ctx.createLinearGradient(0, by, 0, by + bannerH)
    g.addColorStop(0, PALETTE.flagBannerTop)
    g.addColorStop(1, PALETTE.flagBannerBot)
    ctx.fillStyle = g
    ctx.fill()
    // Gold seal.
    ctx.fillStyle = '#7e2233'
    ctx.beginPath()
    ctx.arc(bx + bannerW * 0.5, by + bannerH / 2, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffd166'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
  }

  private renderMenuPlayer(ctx: CanvasRenderingContext2D): void {
    // A static hero pose on the menu, standing at the start of the level.
    const p = this.player
    this.drawPlayer(ctx, p, p.x + p.w / 2, p.y + p.h, 0, 0)
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const p = this.player
    if (p.invuln > 0 && this.mode === 'play' && Math.floor(this.time * 14) % 2 === 0) return
    const cx = p.x + p.w / 2
    const bottom = p.y + p.h
    const lean = p.onGround ? (p.vx / MAX_RUN) * 0.08 : 0
    this.drawPlayer(ctx, p, cx, bottom, lean, p.squash)
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, p: Player, cx: number, bottom: number, lean: number, squash: number): void {
    if (p.w <= 0 || p.h <= 0) return
    ctx.save()
    ctx.translate(cx, bottom)
    ctx.rotate(lean)
    const sx = 1 - squash * 0.22
    const sy = 1 + squash * 0.22
    ctx.scale(sx, sy)
    ctx.scale(p.facing, 1)

    const w = p.w
    const h = p.h

    if (p.runTrail > 0) {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.12 * (1 - i / 4) * p.runTrail
        ctx.fillStyle = PALETTE.playerBody
        rr(ctx, -w / 2 - i * 8 - 4, -h + 2, w, h - 8, 7)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const bodyGrad = ctx.createLinearGradient(0, -h, 0, 0)
    bodyGrad.addColorStop(0, PALETTE.playerBodyLight)
    bodyGrad.addColorStop(1, PALETTE.playerBody)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.moveTo(-w / 2, 0)
    ctx.lineTo(-w / 2, -h * 0.32)
    ctx.quadraticCurveTo(-w / 2 - 3, -h * 0.52, -w / 2 + 6, -h * 0.68)
    ctx.quadraticCurveTo(-w / 2 + 10, -h * 0.82, -w / 2 + 14, -h)
    ctx.quadraticCurveTo(0, -h - 5, w / 2 - 14, -h)
    ctx.quadraticCurveTo(w / 2 - 10, -h * 0.82, w / 2 - 6, -h * 0.68)
    ctx.quadraticCurveTo(w / 2 + 3, -h * 0.52, w / 2, -h * 0.32)
    ctx.lineTo(w / 2, 0)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(242,178,51,0.45)'
    ctx.lineWidth = 1.6
    ctx.stroke()

    const eyeY = -h * 0.52
    const eyeX = w * 0.22
    const eyeR = 3.6

    ctx.fillStyle = PALETTE.playerBody
    ctx.beginPath()
    ctx.arc(-eyeX, eyeY, eyeR, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = PALETTE.playerWhite
    ctx.beginPath()
    ctx.arc(-eyeX + 1.3, eyeY - 1.3, 1.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeX + 1.3, eyeY - 1.3, 1.25, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = PALETTE.playerBlush
    ctx.beginPath()
    ctx.arc(-eyeX - 4, eyeY + 5, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeX + 4, eyeY + 5, 3.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = PALETTE.playerBody
    ctx.lineWidth = 1.1
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, eyeY + 3, 2.8, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()

    const capY = -h - 6
    ctx.fillStyle = PALETTE.playerBody
    ctx.beginPath()
    ctx.moveTo(-w / 2 - 2, capY + 8)
    ctx.lineTo(-w / 2 - 12, capY - 2)
    ctx.lineTo(w / 2 + 12, capY - 2)
    ctx.lineTo(w / 2 + 2, capY + 8)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = PALETTE.playerGold
    ctx.fillRect(-w / 2 - 12, capY + 5, w + 24, 2.5)

    const tasselX = w / 2 + 2
    const tasselY = capY + 8
    ctx.strokeStyle = PALETTE.playerGold
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(tasselX, tasselY)
    ctx.lineTo(tasselX + 7, tasselY + 11)
    ctx.stroke()
    ctx.fillStyle = PALETTE.playerGold
    ctx.beginPath()
    ctx.arc(tasselX + 7, tasselY + 12, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#e74c3c'
    ctx.beginPath()
    ctx.moveTo(-w / 2 - 3, -h * 0.28)
    ctx.lineTo(-w / 2 - 7, -h * 0.28)
    ctx.lineTo(-w / 2 - 7, -h * 0.28 + 10)
    ctx.lineTo(-w / 2 - 3, -h * 0.28 + 10)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#1b2838'
    ctx.beginPath()
    ctx.ellipse(-w / 2 + 6, -1, 5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(w / 2 - 6, -1, 5, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const pt of this.particles) {
      const a = clamp(pt.life / pt.maxLife, 0, 1)
      ctx.save()
      ctx.globalAlpha = a
      ctx.translate(pt.x, pt.y)
      ctx.rotate(pt.rot)
      ctx.fillStyle = pt.color
      ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  private renderVignette(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const g = ctx.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.45, viewW / 2, viewH / 2, viewH * 0.95)
    g.addColorStop(0, PALETTE.vignetteInner)
    g.addColorStop(1, PALETTE.vignetteOuter)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, viewW, viewH)
  }
}
