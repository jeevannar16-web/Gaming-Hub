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
    platform(2400, GROUND_Y, 1200, 200),

    platform(560, 400, 120, 40, 1),
    platform(800, 360, 120, 40, 2),
    platform(1040, 320, 120, 40, 1),

    platform(4080, GROUND_Y, 800, 200),
    platform(4240, 400, 120, 40, 1),
    platform(4480, 360, 120, 40, 2),
    platform(4720, 320, 120, 40, 1),

    platform(5160, GROUND_Y, 1200, 200),

    platform(6560, 400, 120, 40, 1),
    platform(6800, 360, 120, 40, 2),
    platform(7040, 320, 120, 40, 1),
    platform(7280, 400, 120, 40, 2),
    platform(7520, 440, 160, 40, 1),

    platform(7840, GROUND_Y, 1040, 200),
    platform(8880, 400, 200, 40, 1),

    platform(9200, 400, 160, 40, 1),
    platform(9440, 360, 160, 40, 2),
    platform(9680, 320, 160, 40, 1),
    platform(9920, GROUND_Y, 720, 200),

    platform(10800, 400, 120, 40, 1),
    platform(11040, 360, 120, 40, 2),
    platform(11280, 320, 120, 40, 1),
    platform(11520, 400, 160, 40, 1),

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
    coin(9360, 360, 1),
    coin(9600, 320, 2),
    coin(9840, 280, 3),
    coin(10800, 360, 1),
    coin(11040, 320, 2),
    coin(11280, 280, 3),
    ...coinsLine(11940, 400, 14, 140),
  ]

  const spikeList: SpikeStrip[] = [
    spikes(3200, 120),
    spikes(6000, 120),
    spikes(10400, 120),
    spikes(12200, 120),
  ]

  const movers: MovingHazard[] = [
    mover(8200, 398, 22, 8120, 8400, 140, 7),
    mover(9160, 398, 22, 9080, 9260, 160, 11),
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
    movingPlatform(3360, 320, 120, 28, 'x', 100, 60),
    movingPlatform(5760, 280, 120, 28, 'y', 80, 55),
    movingPlatform(8560, 320, 120, 28, 'x', 120, 70),
    movingPlatform(10240, 280, 120, 28, 'y', 100, 60),
    movingPlatform(12240, 320, 120, 28, 'x', 140, 75),
  ]

  const bouncePads: BouncePad[] = [
    bouncePad(4080, GROUND_Y - 18, 80, 18, 1.6),
    bouncePad(7840, GROUND_Y - 18, 80, 18, 1.7),
    bouncePad(9920, GROUND_Y - 18, 80, 18, 1.5),
  ]

  const windZones: WindZone[] = [
    windZone(6560, 200, 280, 220, 280, 1),
    windZone(8960, 200, 260, 220, -260, -1),
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