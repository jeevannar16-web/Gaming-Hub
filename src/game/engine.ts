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
  circleOverlapsRect,
  rectsOverlap,
  type Coin,
  type LevelData,
  type Player,
  type Rect,
} from './entities'
import { KILL_Y, PLAYER_SPAWN_X } from './level'

export type GameMode = 'menu' | 'play' | 'win' | 'over'

export interface InputState {
  left: boolean
  right: boolean
  jumpHeld: boolean
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

const CONFETTI = ['#f2b233', '#ff6b6b', '#4dd2a0', '#5f8bff', '#e879f9', '#ffd166']

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

  constructor(level: LevelData, viewW: number, callbacks: GameCallbacks) {
    this.level = level
    this.camera = new Camera(viewW, level.width)
    this.callbacks = callbacks
    this.player = createPlayer(PLAYER_SPAWN_X, this.groundY() - 58)
    this.camera.snap(PLAYER_SPAWN_X)
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
  }

  toMenu(): void {
    this.mode = 'menu'
    this.camera.x = 0
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
      this.updatePlayer(dt, input)
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
    const accel = p.onGround ? ACCEL : AIR_ACCEL
    if (input.right && !input.left) {
      p.vx = Math.min(p.vx + accel * dt, MAX_RUN)
      p.facing = 1
    } else if (input.left && !input.right) {
      p.vx = Math.max(p.vx - accel * dt, -MAX_RUN)
      p.facing = -1
    } else {
      const fr = p.onGround ? FRICTION : AIR_FRICTION
      const d = fr * dt
      if (Math.abs(p.vx) <= d) p.vx = 0
      else p.vx -= Math.sign(p.vx) * d
    }

    // Coyote time: we keep the "last walked on ground" window fresh while on
    // the ground, and let it drain while airborne so a late jump still works.
    if (p.onGround) p.coyote = COYOTE_TIME
    else p.coyote -= dt

    // Jump buffering: remember a press for a short window; if it lands while
    // still on the ground (or within coyote time) it fires.
    const jumpPressed = input.jumpHeld && !this.prevJump
    this.prevJump = input.jumpHeld
    if (jumpPressed) p.buffer = JUMP_BUFFER
    else if (p.buffer > 0) p.buffer -= dt

    if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = JUMP_VEL
      p.onGround = false
      p.coyote = 0
      p.buffer = 0
      p.squash = 0.8 // stretch on takeoff
      audio.playJump()
    }

    // Variable jump height: extra gravity while ascending with jump released.
    const g = input.jumpHeld || p.vy >= 0 ? GRAVITY : GRAVITY * 1.9
    p.vy = Math.min(p.vy + g * dt, MAX_FALL)

    this.moveAndCollide(p, dt)

    // Squash/stretch eases back to neutral.
    p.squash += (0 - p.squash) * Math.min(1, dt * 9)

    // Motion streak timer.
    if (p.onGround && Math.abs(p.vx) > MAX_RUN * 0.78) p.runTrail = 1
    else p.runTrail = Math.max(0, p.runTrail - dt * 6)

    if (p.invuln > 0) p.invuln -= dt
  }

  /**
   * Axis-separated AABB resolution: move along X first and resolve, then move
   * along Y and resolve. Resolving one axis at a time prevents corner clipping
   * and lets us determine the side of impact (landing, ceiling, or wall).
   */
  private moveAndCollide(p: Player, dt: number): void {
    const plats = this.level.platforms

    p.x += p.vx * dt
    for (const plat of plats) {
      if (rectsOverlap(p, plat)) {
        if (p.vx > 0) p.x = plat.x - p.w
        else if (p.vx < 0) p.x = plat.x + plat.w
        p.vx = 0
      }
    }

    const wasFalling = p.vy > 0
    p.y += p.vy * dt
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

    if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
      p.x = Math.max(0, Math.min(this.level.width - p.w, p.x))
      p.y = Math.max(-200, Math.min(KILL_Y, p.y))
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
  }

  private damage(): void {
    if (this.player.invuln > 0 || this.mode !== 'play') return
    this.lives -= 1
    this.shake = 0.45
    this.player.invuln = 1.5
    audio.playHit()
    this.spawnBurst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#ff6b6b', 10)
    this.callbacks.onLives(this.lives)
    if (this.lives <= 0) {
      this.mode = 'over'
      audio.playGameOver()
      this.callbacks.onGameOver(this.score)
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

    // World transform with screen shake.
    ctx.save()
    const s = this.shake
    ctx.translate(
      -this.camera.x + (Math.random() * 2 - 1) * s * 22,
      (Math.random() * 2 - 1) * s * 18,
    )

    this.renderTerrain(ctx)
    this.renderCheckpoints(ctx)
    this.renderCoins(ctx)
    this.renderSpikes(ctx)
    this.renderMovers(ctx)
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

    // Sun glow near the horizon.
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

    // Far mountains (triangles), parallax 0.1.
    const mh = this.camera.x * 0.1
    this.drawMountains(ctx, viewW, 396, '#1d1b40', mh, 460, [190, 120, 260, 170, 300, 140, 240, 200, 110, 260, 180, 220])

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
        const w = patternW / peaks.length + 30
        ctx.beginPath()
        ctx.moveTo(cx - w, baseY)
        ctx.lineTo(cx, baseY - h)
        ctx.lineTo(cx + w, baseY)
        ctx.closePath()
        ctx.fill()
      })
    }
  }

  private drawSkyline(ctx: CanvasRenderingContext2D, viewW: number, baseY: number, color: string, offset: number, patternW: number, maxH: number): void {
    if (maxH <= 0 || patternW <= 0) return
    ctx.fillStyle = color
    const heights = [maxH * 0.7, maxH, maxH * 0.5, maxH * 0.85, maxH * 0.6, maxH * 0.95]
    const widths = [70, 50, 90, 60, 80, 55]
    const span = viewW + patternW * 2
    const start = -patternW - ((offset % patternW) + patternW) % patternW
    for (let x = start; x < span; x += patternW) {
      heights.forEach((h, i) => {
        const bx = x + i * (patternW / 6)
        ctx.fillRect(bx, baseY - h, widths[i], h)
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(255,209,102,0.55)'
          ctx.fillRect(bx + 12, baseY - h + 14, 4, 6)
          ctx.fillRect(bx + 28, baseY - h + 30, 4, 6)
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
      ctx.moveTo(x, baseY + 40)
      ctx.quadraticCurveTo(x + len / 2, baseY - amp, x + len, baseY + 20)
      ctx.quadraticCurveTo(x + patternW - len / 2, baseY - amp * 0.5, x + patternW, baseY + 40)
      ctx.closePath()
      ctx.fill()
    }
  }

  // --- World ---------------------------------------------------------------
  private renderTerrain(ctx: CanvasRenderingContext2D): void {
    const tones = [
      ['#3d4590', '#2a2f5a'],
      ['#4a529e', '#363d80'],
      ['#3d4590', '#2a2f5a'],
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

      // Rim darkening on platform edges for silhouette clarity.
      ctx.fillStyle = 'rgba(0,0,0,0.34)'
      ctx.fillRect(p.x, p.y + 10, 3, p.h - 10)
      ctx.fillRect(p.x + p.w - 3, p.y + 10, 3, p.h - 10)

      // Bright gold highlight strip on top walkable edge (high contrast).
      ctx.fillStyle = '#f2b233'
      ctx.fillRect(p.x + 8, p.y, p.w - 16, 4)
      // Soft inner glow under the edge.
      ctx.fillStyle = 'rgba(242,178,51,0.45)'
      ctx.fillRect(p.x + 8, p.y + 4, p.w - 16, 5)
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
      if (s.w <= 0 || s.h <= 0) continue
      const step = 20
      for (let x = s.x; x < s.x + s.w - 2; x += step) {
        const baseW = Math.min(step, s.x + s.w - x)
        ctx.save()
        const g = ctx.createLinearGradient(x, s.y + s.h, x, s.y - 8)
        g.addColorStop(0, '#5c1a2e')
        g.addColorStop(1, '#8f2f48')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x, s.y + s.h)
        ctx.lineTo(x + baseW / 2, s.y - 8)
        ctx.lineTo(x + baseW, s.y + s.h)
        ctx.closePath()
        ctx.fill()
        // Gold glint on the leading edge.
        ctx.strokeStyle = 'rgba(242,178,51,0.55)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(x, s.y + s.h)
        ctx.lineTo(x + baseW / 2, s.y - 8)
        ctx.stroke()
        ctx.restore()
      }
    }
  }

  private renderMovers(ctx: CanvasRenderingContext2D): void {
    for (const m of this.level.movers) {
      if (m.r <= 0) continue
      ctx.save()
      ctx.translate(m.x, m.y + Math.sin(this.time * 2.5 + m.seed) * 2)

      // Danger aura.
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, m.r * 2)
      aura.addColorStop(0, 'rgba(242,90,110,0.28)')
      aura.addColorStop(1, 'rgba(242,90,110,0)')
      ctx.fillStyle = aura
      ctx.beginPath()
      ctx.arc(0, 0, m.r * 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.rotate(m.rot)
      ctx.fillStyle = '#c03a4e'
      for (let k = 0; k < 6; k++) {
        ctx.save()
        ctx.rotate((k * Math.PI) / 3)
        ctx.beginPath()
        ctx.moveTo(-5, 0)
        ctx.lineTo(m.r * 1.45, -6)
        ctx.lineTo(m.r * 1.45, 6)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(242,178,51,0.7)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(-5, 0)
        ctx.lineTo(m.r * 1.45, -6)
        ctx.stroke()
        ctx.restore()
      }
      ctx.fillStyle = '#7e2233'
      ctx.beginPath()
      ctx.arc(0, 0, m.r * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f2b233'
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
    g.addColorStop(0, '#f2b233')
    g.addColorStop(1, '#c87f1e')
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

    // Running streak ghosts (unchanged)
    if (p.runTrail > 0) {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.16 * (1 - i / 4) * p.runTrail
        ctx.fillStyle = '#4a3f7a'
        rr(ctx, -w / 2 - i * 8 - 4, -h + 2, w, h - 8, 7)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    // Rim lighting on character outline for better contrast
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.moveTo(-w / 2, 0)
    ctx.lineTo(w / 2, 0)
    ctx.lineTo(w / 2, -h)
    ctx.lineTo(-w / 2, -h)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Robe body (rounded, slightly flared) - with visible rim outline
    const grad = ctx.createLinearGradient(0, -h, 0, 0)
    grad.addColorStop(0, '#3443a3')
    grad.addColorStop(1, '#222c6b')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(-w / 2 - 4, 0)
    ctx.lineTo(-w / 2, -h + 12)
    ctx.quadraticCurveTo(-w / 2, -h + 3, -w / 2 + 4, -h)
    ctx.lineTo(w / 2 - 4, -h)
    ctx.quadraticCurveTo(w / 2, -h + 3, w / 2, -h + 12)
    ctx.lineTo(w / 2 + 4, 0)
    ctx.closePath()
    ctx.fill()
    // Bright rim/outline for silhouette clarity against terrain.
    ctx.strokeStyle = 'rgba(242,178,51,0.7)'
    ctx.lineWidth = 2
    ctx.stroke()
    // Hem highlight
    ctx.fillStyle = 'rgba(255,255,255,0.09)'
    ctx.fillRect(-w / 2 + 3, -5, w - 6, 3)

    // Face (direction aware through the facing scale)
    const eyeY = -h * 0.58
    ctx.fillStyle = '#0c1030'
    ctx.beginPath()
    ctx.arc(w * 0.18, eyeY, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(w * 0.35, eyeY, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.arc(w * 0.18 + 0.8, eyeY - 0.8, 0.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(w * 0.35 + 0.8, eyeY - 0.8, 0.9, 0, Math.PI * 2)
    ctx.fill()

    // Graduation cap - enhanced with shadow and texture
    const capW = w + 16
    const capY = -h - 8
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 3
    ctx.fillStyle = '#1a2350'
    ctx.fillRect(-capW / 2, capY, capW, 7)
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0d1440'
    ctx.beginPath()
    ctx.moveTo(-capW / 2, capY + 7)
    ctx.lineTo(capW / 2, capY + 7)
    ctx.lineTo(capW / 2 - 3, capY + 15)
    ctx.lineTo(-capW / 2 + 3, capY + 15)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#f2b233'
    ctx.fillRect(-capW / 2, capY, capW, 2.2)

    // Add subtle texture to cap surface
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(-capW / 2 + 8, capY + 2, capW - 16, 3)
    ctx.restore()

    // Tassel swings with velocity and idle sway - enhanced visibility
    const sway = clamp(p.vx / MAX_RUN, -1, 1) * 1.1 + Math.sin(this.time * 5 + (p.facing > 0 ? 0 : Math.PI)) * 0.18
    ctx.strokeStyle = '#f2b233'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(0, capY + 2)
    const ex = Math.sin(sway) * 13
    const ey = capY + 15 + Math.abs(Math.sin(sway)) * 4
    ctx.lineTo(ex, ey)
    ctx.stroke()
    // Tassel ball with enhanced contrast
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 2
    ctx.fillStyle = '#ffd166'
    ctx.beginPath()
    ctx.arc(ex, ey + 1, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#e8a31a'
    ctx.beginPath()
    ctx.arc(ex, ey + 1, 1, 0, Math.PI * 2)
    ctx.fill()

    // Feet
    ctx.fillStyle = '#161c47'
    ctx.beginPath()
    ctx.ellipse(-w / 2 + 5, -1, 5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(w / 2 - 5, -1, 5, 3, 0, 0, Math.PI * 2)
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
    g.addColorStop(0, 'rgba(10,8,30,0)')
    g.addColorStop(1, 'rgba(10,8,30,0.42)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, viewW, viewH)
  }
}
