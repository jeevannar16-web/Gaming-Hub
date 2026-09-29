import type { BouncePad, Checkpoint, Coin, Flag, LevelData, MovingHazard, MovingPlatform, Platform, PowerUp, SpikeStrip, WindZone } from './entities'

export const TILE = 40
export const GROUND_Y = 460
export const LEVEL_HEIGHT = 540
export const KILL_Y = 640
export const LEVEL_WIDTH = 14000
export const PLAYER_SPAWN_X = 60

// Authoring rules (matches the physics in entities.ts):
//   - Standing jump apex ~48px, running jump covers ~120px.
//   - Vertical rises between surfaces: at most 40px (one tile).
//   - Horizontal gaps between platforms: at most 40px (comfortable landing).

function platform(x: number, y: number, w: number, h: number, variant = 0): Platform {
  return { x, y, w, h, seed: Math.floor(x / TILE), variant }
}

function coin(x: number, y: number, phase = 0): Coin {
  return { x, y, r: 9, phase, collected: false }
}

function coinsLine(xStart: number, y: number, count: number, spacing = 120): Coin[] {
  const arr: Coin[] = []
  for (let i = 0; i < count; i++) arr.push(coin(xStart + i * spacing, y, i * 0.5))
  return arr
}

function coinsArc(xStart: number, baseY: number, count: number, step = 120, heightStep = 20): Coin[] {
  const arr: Coin[] = []
  for (let i = 0; i < count; i++) {
    arr.push(coin(xStart + i * step, baseY - i * heightStep, i * 0.7))
  }
  return arr
}

function spikes(x: number, w: number = 44): SpikeStrip {
  return { x, y: GROUND_Y - 16, w, h: 16 }
}

function mover(x: number, y: number, r: number, minX: number, maxX: number, speed: number, seed: number): MovingHazard {
  return { x, y, r, minX, maxX, speed, dir: 1, rot: 0, seed }
}

function movingPlatform(x: number, y: number, w: number, h: number, axis: 'x' | 'y', distance: number, speed: number, phase = 0): MovingPlatform {
  return { x, y, w, h, startX: x, startY: y, endX: axis === 'x' ? x + distance : x, endY: axis === 'y' ? y + distance : y, speed, phase, axis }
}

function bouncePad(x: number, y: number, w: number, h: number, strength = 1.6): BouncePad {
  return { x, y, w, h, strength }
}

function windZone(x: number, y: number, w: number, h: number, force: number, direction: 1 | -1 = 1): WindZone {
  return { x, y, w, h, force, direction }
}

function powerUp(x: number, y: number, type: 'doubleJump' | 'speedBoost' | 'magnet' | 'shield'): PowerUp {
  return { x, y, r: 10, type, collected: false }
}

export function buildLevel(): LevelData {
  // -----------------------------------------------------------------------
  // PLATFORMS — contiguous ground broken only by two stepped pit crossings.
  // Raised stairs use 40px rises and 40px gaps so every jump is comfortable
  // (the running jump covers ~120px, leaving a wide takeoff margin).
  // -----------------------------------------------------------------------
  const platforms: Platform[] = [
    // Long flat start with the starter climb (Segment A)
    platform(0, GROUND_Y, 3600, 200),
    platform(560, 420, 160, 40, 1),
    platform(760, 380, 160, 40, 2),
    platform(960, 340, 160, 40, 1),

    // Segment B stairs over flat ground
    platform(3600, GROUND_Y, 1280, 200),
    platform(4240, 420, 160, 40, 1),
    platform(4440, 380, 160, 40, 2),
    platform(4680, 340, 160, 40, 1),

    // Long breather flat, then Segment C stairs
    platform(4880, GROUND_Y, 2960, 200),
    platform(6560, 420, 160, 40, 1),
    platform(6760, 380, 160, 40, 2),
    platform(6960, 340, 160, 40, 1),
    platform(7160, 400, 160, 40, 2),
    platform(7360, 440, 160, 40, 1),

    // Segment D — descending-then-ascending stepped ramp (ends on G7)
    platform(7840, GROUND_Y, 1040, 200),
    platform(8880, 420, 160, 40, 1),
    platform(9080, 380, 160, 40, 2),
    platform(9280, 340, 160, 40, 0),
    platform(9480, 380, 160, 40, 2),
    platform(9680, 420, 160, 40, 1),
    platform(9880, 460, 160, 40, 0),
    platform(9920, GROUND_Y, 720, 200),

    // Segment E — descending-then-ascending stepped ramp (ends on G8)
    platform(10640, 420, 160, 40, 1),
    platform(10840, 380, 160, 40, 2),
    platform(11040, 340, 160, 40, 0),
    platform(11240, 380, 160, 40, 2),
    platform(11440, 420, 160, 40, 1),
    platform(11640, 460, 160, 40, 0),
    platform(11840, GROUND_Y, 2400, 200),
  ]

  // -----------------------------------------------------------------------
  // COINS — Placed to visually guide jump paths.
  // -----------------------------------------------------------------------
  const coins: Coin[] = [
    ...coinsLine(160, 400, 5, 200),
    ...coinsArc(600, 380, 3, 120, 18),
    coin(4320, 360, 1),
    coin(4560, 320, 2),
    coin(4800, 280, 3),
    ...coinsLine(5360, 400, 7, 120),
    coin(6640, 360, 1),
    coin(6880, 320, 2),
    coin(7120, 360, 1),
    ...coinsLine(8040, 360, 5, 120),
    coin(8960, 380, 1),
    coin(9160, 340, 2),
    coin(9360, 300, 1),
    coin(9560, 340, 2),
    coin(9760, 380, 3),
    coin(9960, 420, 0),
    coin(10720, 380, 1),
    coin(10920, 340, 2),
    coin(11120, 300, 1),
    coin(11320, 340, 2),
    coin(11520, 380, 3),
    coin(11720, 420, 0),
    ...coinsLine(11940, 400, 14, 140),
  ]

  const spikeList: SpikeStrip[] = [
    // Narrow (one tile wide) so a single running jump clears them comfortably.
    spikes(3200, 24),
    spikes(6000, 24),
    spikes(10400, 24),
    spikes(12200, 24),
  ]

  const movers: MovingHazard[] = [
    // Way above ground traversal so the player runs under them comfortably;
    // they're menacing visually but only catch an apex jump that's mistimed.
    mover(8200, 160, 22, 8120, 8400, 140, 7),
    mover(9160, 200, 22, 9080, 9260, 160, 11),
  ]

  const checkpoints: Checkpoint[] = [
    { x: 2560, y: GROUND_Y, active: false },
    { x: 5120, y: GROUND_Y, active: false },
    { x: 7760, y: GROUND_Y, active: false },
    { x: 10080, y: GROUND_Y, active: false },
  ]

  const flag: Flag = {
    x: 14000,
    y: GROUND_Y,
    poleTop: 300,
    unfurl: 0,
  }

  const movingPlatforms: MovingPlatform[] = [
    // Horizontal floaters — never intersect a standing player (below feet) or a
    // rising jump (apex body top >= 354). Kept well clear of spike takeoff zones.
    movingPlatform(3360, 320, 120, 28, 'x', 100, 60),
    movingPlatform(5760, 280, 120, 28, 'y', 80, 55),
    movingPlatform(8560, 320, 120, 28, 'x', 120, 70),
    // (the 10240 vertical mover that clipped the 10400 spike jump was moved here)
    movingPlatform(10560, 160, 120, 28, 'y', 80, 60),
    movingPlatform(12240, 320, 120, 28, 'x', 140, 75),
  ]

  const bouncePads: BouncePad[] = [
    bouncePad(4080, GROUND_Y - 18, 80, 18, 1.6),
    bouncePad(7840, GROUND_Y - 18, 80, 18, 1.7),
    bouncePad(9920, GROUND_Y - 18, 80, 18, 1.5),
  ]

  const windZones: WindZone[] = [
    windZone(6560, 200, 280, 220, 280, 1),
    windZone(2000, 200, 260, 220, 260, -1),
    windZone(11040, 200, 300, 200, 300, 1),
  ]

  const powerUps: PowerUp[] = [
    powerUp(600, 320, 'doubleJump'),
    powerUp(4320, 320, 'speedBoost'),
    powerUp(6640, 320, 'shield'),
    powerUp(9360, 320, 'magnet'),
    powerUp(12240, 300, 'doubleJump'),
  ]

  return {
    platforms,
    coins,
    spikes: spikeList,
    movers,
    checkpoints,
    flag,
    movingPlatforms,
    bouncePads,
    windZones,
    powerUps,
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
  }
}
