// Shared entity types and the Player class for Cap Quest.

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// A solid platform tile (ground segments and floating platforms).
export interface Platform extends Rect {
  // Deterministic seed so per-platform color variation stays stable.
  seed: number
  variant: number
}

export interface Coin {
  x: number
  y: number
  r: number
  phase: number
  collected: boolean
}

// A strip of static spike/shard hazards sitting on a surface.
export interface SpikeStrip extends Rect {}

// A patrolling rotating shard that moves horizontally between bounds.
export interface MovingHazard {
  x: number
  y: number
  r: number
  minX: number
  maxX: number
  speed: number
  dir: number
  rot: number
  seed: number
}

export interface Checkpoint {
  x: number
  y: number
  active: boolean
}

export interface Flag {
  x: number
  y: number
  poleTop: number
  unfurl: number // 0..1 progress of the win animation
}

export interface MovingPlatform extends Rect {
  startX: number
  startY: number
  endX: number
  endY: number
  speed: number
  phase: number
  axis: 'x' | 'y'
}

export interface BouncePad extends Rect {
  strength: number
}

export interface WindZone extends Rect {
  force: number
  direction: 1 | -1
}

export type PowerUpType = 'doubleJump' | 'speedBoost' | 'magnet' | 'shield'

export interface PowerUp {
  x: number
  y: number
  r: number
  type: PowerUpType
  collected: boolean
}

export interface LevelData {
  platforms: Platform[]
  coins: Coin[]
  spikes: SpikeStrip[]
  movers: MovingHazard[]
  checkpoints: Checkpoint[]
  flag: Flag
  movingPlatforms: MovingPlatform[]
  bouncePads: BouncePad[]
  windZones: WindZone[]
  powerUps: PowerUp[]
  width: number
  height: number
}

// ---------------------------------------------------------------------------
// Player physics constants (px, seconds). Tuned so a full-speed jump arcs
// over roughly 2.5-3 tiles horizontally.
// ---------------------------------------------------------------------------
export const GRAVITY = 2600
export const MAX_FALL = 1000
export const MAX_RUN = 300
export const ACCEL = 2400
export const FRICTION = 3200
export const AIR_ACCEL = 1700
export const AIR_FRICTION = 400
export const JUMP_VEL = -520
export const COYOTE_TIME = 0.1
export const JUMP_BUFFER = 0.12
export const MAX_JUMP_CUT = 0.4 // multiplier applied to upward velocity on early release
export const POWERUP_DURATION = 6
export const SPEED_BOOST_MULT = 1.5
export const BOUNCE_MULT = 1.6
export const WIND_FORCE = 280

export interface Player extends Rect {
  vx: number
  vy: number
  onGround: boolean
  facing: 1 | -1
  coyote: number
  buffer: number
  invuln: number
  squash: number // -1..1, negative = squash, positive = stretch
  runTrail: number
  alive: boolean
  jumpsLeft: number
  activePowerUps: PowerUpType[]
  powerUpTimers: Partial<Record<PowerUpType, number>>
}

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    w: 44,
    h: 58,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    coyote: 0,
    buffer: 0,
    invuln: 0,
    squash: 0,
    runTrail: 0,
    alive: true,
    jumpsLeft: 2,
    activePowerUps: [],
    powerUpTimers: {},
  }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  const buffer = 1
  return a.x + buffer < b.x + b.w && a.x + a.w - buffer > b.x && a.y + buffer < b.y + b.h && a.y + a.h - buffer > b.y
}

export function circleOverlapsRect(cx: number, cy: number, r: number, r2: Rect): boolean {
  const px = Math.max(r2.x, Math.min(cx, r2.x + r2.w))
  const py = Math.max(r2.y, Math.min(cy, r2.y + r2.h))
  const dx = cx - px
  const dy = cy - py
  return dx * dx + dy * dy <= r * r
}

export function createMovingPlatform(x: number, y: number, w: number, h: number, axis: 'x' | 'y', distance: number, speed: number, phase = 0): MovingPlatform {
  return {
    x,
    y,
    w,
    h,
    startX: x,
    startY: y,
    endX: axis === 'x' ? x + distance : x,
    endY: axis === 'y' ? y + distance : y,
    speed,
    phase,
    axis,
  }
}

export function createBouncePad(x: number, y: number, w: number, h: number, strength = 1.5): BouncePad {
  return { x, y, w, h, strength }
}

export function createWindZone(x: number, y: number, w: number, h: number, force: number, direction: 1 | -1 = 1): WindZone {
  return { x, y, w, h, force, direction }
}

export function createPowerUp(x: number, y: number, type: PowerUpType): PowerUp {
  return { x, y, r: 10, type, collected: false }
}
