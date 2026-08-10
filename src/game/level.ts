import type { Checkpoint, Coin, Flag, LevelData, MovingHazard, Platform, SpikeStrip } from './entities'

export const TILE = 40
export const GROUND_Y = 460
export const LEVEL_HEIGHT = 540
export const KILL_Y = 640
export const LEVEL_WIDTH = 15200
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

export function buildLevel(): LevelData {
  // -----------------------------------------------------------------------
  // PLATFORMS — Designed in 7 "phrases" with clear rise/fall rhythm.
  // Each phrase is a short musical motif: flat → rise → peak → fall/breathe.
  // -----------------------------------------------------------------------
  const platforms: Platform[] = [
    // PHRASE 1 — Tutorial approach: easy ground + gentle rise
    platform(0, GROUND_Y, 1600, 220),
    platform(1680, GROUND_Y, 1120, 220),
    platform(2880, GROUND_Y, 1320, 220),

    platform(760, 420, 160, 40, 1),
    platform(1000, 380, 160, 40, 2),
    platform(1240, 340, 160, 40, 1),

    // PHRASE 2 — First jump challenge: two gaps + rising stairs
    platform(4280, GROUND_Y, 920, 220),
    platform(4520, 420, 200, 40, 1),
    platform(4760, 380, 200, 40, 2),
    platform(5000, 340, 200, 40, 1),

    // PHRASE 3 — Breather: long flat section for recovery
    platform(5280, GROUND_Y, 1600, 220),

    // PHRASE 4 — Pit crossing: stepping stones over a deep pit
    platform(7000, 420, 140, 40, 1),
    platform(7180, 380, 140, 40, 2),
    platform(7360, 340, 140, 40, 1),
    platform(7540, 420, 140, 40, 2),
    platform(7720, 460, 200, 40, 1),

    // PHRASE 5 — Moving obstacle walkway
    platform(8000, GROUND_Y, 1200, 220),
    platform(9280, 420, 280, 40, 1),

    // PHRASE 6 — Checkpoint approach: descending stairs
    platform(9600, 420, 200, 40, 1),
    platform(9840, 380, 200, 40, 2),
    platform(10080, 340, 200, 40, 1),
    platform(10320, GROUND_Y, 800, 220),

    // PHRASE 7 — Final challenge: high gauntlet
    platform(11200, 420, 160, 40, 1),
    platform(11360, 380, 160, 40, 2),
    platform(11520, 340, 160, 40, 1),
    platform(11680, 340, 40, 40, 2),

    platform(12000, GROUND_Y, 3200, 220),
  ]

  // -----------------------------------------------------------------------
  // COINS — Placed to visually guide jump paths.
  // -----------------------------------------------------------------------
  const coins: Coin[] = [
    // Phrase 1: starter flat coins
    ...coinsLine(200, 420, 5, 280),
    // Phrase 1: above starter climb
    ...coinsArc(840, 400, 3, 160, 20),
    // Phrase 2: gap coins
    coin(4680, 380, 1),
    coin(4920, 340, 2),
    coin(5160, 300, 3),
    // Phrase 3: breather run
    ...coinsLine(5400, 420, 8, 160),
    // Phrase 4: pit stones
    coin(7080, 380, 1),
    coin(7260, 340, 2),
    coin(7440, 380, 1),
    // Phrase 5: walkway coins
    ...coinsLine(8120, 380, 6, 160),
    // Phrase 6: descending stairs coins
    coin(9680, 380, 1),
    coin(9920, 340, 2),
    coin(10160, 300, 3),
    // Phrase 7: high gauntlet coins
    coin(11280, 380, 1),
    coin(11440, 340, 2),
    coin(11600, 300, 3),
    // Phrase 7: final flat run
    ...coinsLine(12200, 420, 16, 180),
  ]

  // -----------------------------------------------------------------------
  // HAZARDS
  // -----------------------------------------------------------------------
  const spikeList: SpikeStrip[] = [
    spikes(3000, 120),
    spikes(6200, 120),
    spikes(10800, 120),
    spikes(12600, 120),
  ]

  const movers: MovingHazard[] = [
    mover(8360, 398, 22, 8280, 8560, 140, 7),
    mover(9400, 398, 22, 9320, 9500, 160, 11),
  ]

  // -----------------------------------------------------------------------
  // CHECKPOINTS — Placed after major challenge phrases
  // -----------------------------------------------------------------------
  const checkpoints: Checkpoint[] = [
    { x: 2950, y: GROUND_Y, active: false },
    { x: 5260, y: GROUND_Y, active: false },
    { x: 7700, y: GROUND_Y, active: false },
    { x: 10280, y: GROUND_Y, active: false },
  ]

  // -----------------------------------------------------------------------
  // FLAG — End of level
  // -----------------------------------------------------------------------
  const flag: Flag = {
    x: 14800,
    y: GROUND_Y,
    poleTop: 300,
    unfurl: 0,
  }

  return {
    platforms,
    coins,
    spikes: spikeList,
    movers,
    checkpoints,
    flag,
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
  }
}