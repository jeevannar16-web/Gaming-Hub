import type { BouncePad, Checkpoint, Coin, Flag, LevelData, MovingHazard, MovingPlatform, Platform, PowerUp, SpikeStrip, WindZone } from './entities'

export const TILE = 40
export const GROUND_Y = 460
export const LEVEL_HEIGHT = 540
export const KILL_Y = 640
export const LEVEL_WIDTH = 14000
export const PLAYER_SPAWN_X = 60

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

function spikes(x: number, w: number): SpikeStrip {
  return { x, y: GROUND_Y - 26, w, h: 26 }
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
  // PLATFORMS — Designed in 7 "phrases" with clear rise/fall rhythm.
  // Each phrase is a short musical motif: flat → rise → peak → fall/breathe.
  // -----------------------------------------------------------------------
  const platforms: Platform[] = [
    // PHRASE 1 — Tutorial approach: easy ground + gentle rise
    platform(0, GROUND_Y, 1400, 220),
    platform(1560, GROUND_Y, 1000, 220),
    platform(2680, GROUND_Y, 1200, 220),

    platform(700, 420, 140, 40, 1),
    platform(920, 380, 140, 40, 2),
    platform(1140, 340, 140, 40, 1),

    // PHRASE 2 — First jump challenge: two gaps + rising stairs
    platform(4000, GROUND_Y, 820, 220),
    platform(4200, 420, 160, 40, 1),
    platform(4440, 380, 160, 40, 2),
    platform(4680, 340, 160, 40, 1),

    // PHRASE 3 — Breather: long flat section for recovery
    platform(5000, GROUND_Y, 1400, 220),

    // PHRASE 4 — Pit crossing: stepping stones over a deep pit
    platform(6600, 420, 120, 40, 1),
    platform(6760, 380, 120, 40, 2),
    platform(6920, 340, 120, 40, 1),
    platform(7080, 420, 120, 40, 2),
    platform(7240, 460, 160, 40, 1),

    // PHRASE 5 — Moving obstacle walkway
    platform(7600, GROUND_Y, 1100, 220),
    platform(8680, 420, 240, 40, 1),

    // PHRASE 6 — Checkpoint approach: descending stairs
    platform(9000, 420, 160, 40, 1),
    platform(9220, 380, 160, 40, 2),
    platform(9440, 340, 160, 40, 1),
    platform(9640, GROUND_Y, 720, 220),

    // PHRASE 7 — Final challenge: high gauntlet
    platform(10400, 420, 140, 40, 1),
    platform(10560, 380, 140, 40, 2),
    platform(10720, 340, 140, 40, 1),
    platform(10900, 420, 180, 40, 1),

    platform(11200, GROUND_Y, 2800, 220),
  ]

  // -----------------------------------------------------------------------
  // COINS — Placed to visually guide jump paths.
  // -----------------------------------------------------------------------
  const coins: Coin[] = [
    // Phrase 1: starter flat coins
    ...coinsLine(180, 420, 5, 240),
    // Phrase 1: above starter climb
    ...coinsArc(740, 400, 3, 140, 18),
    // Phrase 2: gap coins
    coin(4280, 380, 1),
    coin(4520, 340, 2),
    coin(4760, 300, 3),
    // Phrase 3: breather run
    ...coinsLine(5100, 420, 7, 140),
    // Phrase 4: pit stones
    coin(6680, 380, 1),
    coin(6840, 340, 2),
    coin(7000, 380, 1),
    // Phrase 5: walkway coins
    ...coinsLine(7800, 380, 5, 140),
    // Phrase 6: descending stairs coins
    coin(9080, 380, 1),
    coin(9300, 340, 2),
    coin(9520, 300, 3),
    // Phrase 7: high gauntlet coins
    coin(10480, 380, 1),
    coin(10640, 340, 2),
    coin(10800, 300, 3),
    // Phrase 7: final flat run
    ...coinsLine(11300, 420, 14, 160),
  ]

  // -----------------------------------------------------------------------
  // HAZARDS
  // -----------------------------------------------------------------------
  const spikeList: SpikeStrip[] = [
    spikes(2800, 120),
    spikes(5800, 120),
    spikes(10000, 120),
    spikes(11800, 120),
  ]

  const movers: MovingHazard[] = [
    mover(7960, 398, 22, 7880, 8160, 140, 7),
    mover(9000, 398, 22, 8920, 9100, 160, 11),
  ]

  // -----------------------------------------------------------------------
  // CHECKPOINTS — Placed after major challenge phrases
  // -----------------------------------------------------------------------
  const checkpoints: Checkpoint[] = [
    { x: 2750, y: GROUND_Y, active: false },
    { x: 4980, y: GROUND_Y, active: false },
    { x: 7300, y: GROUND_Y, active: false },
    { x: 9620, y: GROUND_Y, active: false },
  ]

  // -----------------------------------------------------------------------
  // FLAG — End of level
  // -----------------------------------------------------------------------
  const flag: Flag = {
    x: 13800,
    y: GROUND_Y,
    poleTop: 300,
    unfurl: 0,
  }

  const movingPlatforms: MovingPlatform[] = [
    movingPlatform(3400, 340, 120, 28, 'x', 100, 60),
    movingPlatform(6000, 300, 120, 28, 'y', 80, 55),
    movingPlatform(8600, 360, 140, 28, 'x', 120, 70),
    movingPlatform(10200, 280, 120, 28, 'y', 100, 60),
    movingPlatform(12000, 340, 120, 28, 'x', 140, 75),
  ]

  const bouncePads: BouncePad[] = [
    bouncePad(4000, GROUND_Y - 18, 80, 18, 1.6),
    bouncePad(8200, GROUND_Y - 18, 80, 18, 1.7),
    bouncePad(9800, GROUND_Y - 18, 80, 18, 1.5),
  ]

  const windZones: WindZone[] = [
    windZone(6800, 200, 280, 220, 280, 1),
    windZone(9200, 180, 260, 240, -260, -1),
    windZone(11000, 220, 300, 200, 300, 1),
  ]

  const powerUps: PowerUp[] = [
    powerUp(740, 360, 'doubleJump'),
    powerUp(4280, 340, 'speedBoost'),
    powerUp(6680, 340, 'shield'),
    powerUp(9080, 340, 'magnet'),
    powerUp(12000, 300, 'doubleJump'),
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