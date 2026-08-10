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

export interface LevelData {
  platforms: Platform[]
  coins: Coin[]
  spikes: SpikeStrip[]
  movers: MovingHazard[]
  checkpoints: Checkpoint[]
  flag: Flag
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
}

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    w: 26,
    h: 34,
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
  }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function circleOverlapsRect(cx: number, cy: number, r: number, r2: Rect): boolean {
  const px = Math.max(r2.x, Math.min(cx, r2.x + r2.w))
  const py = Math.max(r2.y, Math.min(cy, r2.y + r2.h))
  const dx = cx - px
  const dy = cy - py
  return dx * dx + dy * dy <= r * r
}
