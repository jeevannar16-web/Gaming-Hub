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
  const platforms: Platform[] = [
    platform(0, GROUND_Y, 1200, 200),
    platform(1200, GROUND_Y, 1200, 200),
    platform(2480, GROUND_Y, 1200, 200),

    platform(560, 400, 120, 40, 1),
    platform(800, 360, 120, 40, 2),
    platform(1040, 320, 120, 40, 1),

    platform(3920, GROUND_Y, 800, 200),
    platform(4080, 400, 120, 40, 1),
    platform(4320, 360, 120, 40, 2),
    platform(4560, 320, 120, 40, 1),

    platform(5000, GROUND_Y, 1200, 200),

    platform(6400, 400, 120, 40, 1),
    platform(6640, 360, 120, 40, 2),
    platform(6880, 320, 120, 40, 1),
    platform(7120, 400, 120, 40, 2),
    platform(7360, 440, 160, 40, 1),

    platform(7680, GROUND_Y, 1040, 200),
    platform(8800, 400, 200, 40, 1),

    platform(9120, 400, 160, 40, 1),
    platform(9360, 360, 160, 40, 2),
    platform(9600, 320, 160, 40, 1),
    platform(9840, GROUND_Y, 720, 200),

    platform(10560, 400, 120, 40, 1),
    platform(10800, 360, 120, 40, 2),
    platform(11040, 320, 120, 40, 1),
    platform(11280, 400, 160, 40, 1),

    platform(11600, GROUND_Y, 2400, 200),
  ]

  // -----------------------------------------------------------------------
  // COINS — Placed to visually guide jump paths.
  // -----------------------------------------------------------------------
  const coins: Coin[] = [
    ...coinsLine(160, 400, 5, 200),
    ...coinsArc(600, 380, 3, 120, 18),
    coin(4160, 360, 1),
    coin(4400, 320, 2),
    coin(4640, 280, 3),
    ...coinsLine(5200, 400, 7, 120),
    coin(6480, 360, 1),
    coin(6720, 320, 2),
    coin(6960, 360, 1),
    ...coinsLine(7880, 360, 5, 120),
    coin(9200, 360, 1),
    coin(9440, 320, 2),
    coin(9680, 280, 3),
    coin(10640, 360, 1),
    coin(10880, 320, 2),
    coin(11120, 280, 3),
    ...coinsLine(11700, 400, 14, 140),
  ]

  const spikeList: SpikeStrip[] = [
    spikes(2800, 120),
    spikes(5600, 120),
    spikes(9800, 120),
    spikes(11600, 120),
  ]

  const movers: MovingHazard[] = [
    mover(8040, 398, 22, 7960, 8240, 140, 7),
    mover(9000, 398, 22, 8920, 9100, 160, 11),
  ]

  const checkpoints: Checkpoint[] = [
    { x: 2560, y: GROUND_Y, active: false },
    { x: 4960, y: GROUND_Y, active: false },
    { x: 7440, y: GROUND_Y, active: false },
    { x: 9840, y: GROUND_Y, active: false },
  ]

  const flag: Flag = {
    x: 13800,
    y: GROUND_Y,
    poleTop: 300,
    unfurl: 0,
  }

  const movingPlatforms: MovingPlatform[] = [
    movingPlatform(3200, 320, 120, 28, 'x', 100, 60),
    movingPlatform(5600, 280, 120, 28, 'y', 80, 55),
    movingPlatform(8400, 320, 120, 28, 'x', 120, 70),
    movingPlatform(10000, 280, 120, 28, 'y', 100, 60),
    movingPlatform(12000, 320, 120, 28, 'x', 140, 75),
  ]

  const bouncePads: BouncePad[] = [
    bouncePad(3920, GROUND_Y - 18, 80, 18, 1.6),
    bouncePad(7680, GROUND_Y - 18, 80, 18, 1.7),
    bouncePad(9800, GROUND_Y - 18, 80, 18, 1.5),
  ]

  const windZones: WindZone[] = [
    windZone(6400, 200, 280, 220, 280, 1),
    windZone(8800, 200, 260, 220, -260, -1),
    windZone(10800, 200, 300, 200, 300, 1),
  ]

  const powerUps: PowerUp[] = [
    powerUp(600, 320, 'doubleJump'),
    powerUp(4160, 320, 'speedBoost'),
    powerUp(6480, 320, 'shield'),
    powerUp(9200, 320, 'magnet'),
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