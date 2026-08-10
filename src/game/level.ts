// Cap Quest level data. Plain, data-driven definitions built from small
// helpers so it stays easy to extend. All coordinates in world pixels.
//
// Grid rules used while authoring (TILE = 40):
//   - A full-speed running jump crosses ~3 tiles (120px).
//   - Standing jump apex ~52px, so vertical rises between platforms are kept
//     at most 40px (one tile) and horizontal gaps at most ~120px.
//   - Ground top sits at GROUND_Y; falling past KILL_Y costs a life.

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

function spikes(x: number, w: number): SpikeStrip {
  return { x, y: GROUND_Y - 26, w, h: 26 }
}

function mover(x: number, y: number, r: number, minX: number, maxX: number, speed: number, seed: number): MovingHazard {
  return { x, y, r, minX, maxX, speed, dir: 1, rot: 0, seed }
}

export function buildLevel(): LevelData {
  const ground = (x0: number, x1: number): Platform[] => {
    const segs: Platform[] = []
    const step = 400
    for (let x = x0; x < x1; x += step) {
      segs.push(platform(x, GROUND_Y, Math.min(step, x1 - x), 220))
    }
    return segs
  }

  const platforms: Platform[] = [
    ...ground(0, 1560),
    ...ground(1680, 2800),
    ...ground(2920, 4200),
    ...ground(4300, 5200),
    ...ground(5320, 8000),
    ...ground(8560, 9600),
    ...ground(9720, 10600),
    ...ground(10880, 12800),
    ...ground(13360, 15200),
    // Starter climb (Segment A)
    platform(760, 420, 160, 40, 1),
    platform(1000, 380, 160, 40, 2),
    platform(1240, 340, 160, 40, 1),
    // Moving-shard walkway (Segment D)
    platform(4700, 420, 240, 40, 2),
    // Coin ladder (Segment E)
    platform(6200, 420, 160, 40, 1),
    platform(6400, 380, 160, 40, 2),
    platform(6600, 340, 160, 40, 1),
    platform(6800, 300, 160, 40, 2),
    // Pit stones across 8000-8560
    platform(8000, 420, 120, 40, 1),
    platform(8180, 380, 120, 40, 2),
    platform(8360, 340, 120, 40, 1),
    platform(8540, 420, 120, 40, 2),
    // Second mover walkway (Segment F)
    platform(9000, 420, 200, 40, 1),
    // Stones across 10600-10880
    platform(10600, 420, 120, 40, 2),
    platform(10740, 420, 120, 40, 1),
    // High gauntlet (Segment H)
    platform(11400, 420, 120, 40, 1),
    platform(11560, 380, 120, 40, 2),
    platform(11720, 340, 120, 40, 1),
    platform(11880, 340, 120, 40, 2),
    // Final bridge: flag platform + two stones over 12800-13360
    platform(12800, 420, 200, 40, 1),
    platform(13080, 420, 120, 40, 2),
    platform(13240, 420, 120, 40, 1),
  ]

  const coins: Coin[] = [
    // Start flat
    coin(140, 410), coin(260, 410), coin(380, 410), coin(500, 410), coin(620, 410),
    // Above starter climb
    coin(840, 380, 1), coin(1080, 340, 2), coin(1320, 300, 3),
    // Segment B flat
    coin(1760, 410), coin(1840, 410), coin(1920, 410), coin(2000, 410), coin(2080, 410), coin(2160, 410),
    // Segment C (post first pit, around checkpoint)
    coin(2960, 410), coin(3040, 410), coin(3260, 380), coin(3500, 410), coin(3520, 410), coin(3680, 380),
    // Segment D
    coin(4400, 410), coin(4480, 410), coin(4560, 410), coin(4640, 410), coin(4780, 340, 2), coin(4860, 340, 1),
    // Segment E
    coin(5480, 380), coin(5520, 410), coin(5600, 410), coin(5680, 410), coin(5760, 410), coin(5840, 410),
    coin(5920, 410), coin(6000, 410), coin(6080, 410), coin(6160, 410),
    coin(6280, 380, 1), coin(6480, 340, 2), coin(6680, 300, 3), coin(6880, 260, 4),
    coin(7080, 410), coin(7160, 410), coin(7240, 410), coin(7320, 410), coin(7400, 410), coin(7480, 410),
    coin(7560, 410), coin(7640, 410), coin(7720, 410), coin(7800, 410), coin(7880, 410),
    // Pit stones
    coin(8080, 360, 2), coin(8260, 320, 3), coin(8440, 360, 2),
    // Segment F
    coin(8640, 410), coin(8720, 410), coin(8800, 410), coin(8880, 410), coin(8960, 410),
    coin(9100, 340, 2), coin(9200, 410), coin(9280, 410), coin(9360, 410), coin(9440, 410), coin(9520, 410),
    coin(9680, 340, 1),
    // Segment G
    coin(9800, 410), coin(9840, 410), coin(9880, 410), coin(10220, 380),
    coin(10320, 410), coin(10400, 410), coin(10560, 410),
    // Stones across 10600-10880
    coin(10660, 360, 1), coin(10800, 360, 2),
    // Segment H
    coin(10960, 410), coin(11000, 410), coin(11160, 380),
    coin(11260, 410), coin(11320, 410),
    coin(11460, 380, 1), coin(11620, 340, 2), coin(11780, 300, 3), coin(11940, 300, 2),
    coin(12120, 410), coin(12240, 410), coin(12360, 410), coin(12480, 410), coin(12600, 410), coin(12720, 410),
    // Final bridge
    coin(12840, 380, 2), coin(12920, 380, 1), coin(13140, 380, 2),
    // Final stretch
    coin(13440, 410), coin(13520, 410), coin(13600, 410), coin(13680, 410), coin(13760, 410), coin(13840, 410),
    coin(14060, 380), coin(14200, 410), coin(14320, 410), coin(14440, 410), coin(14560, 410), coin(14680, 410), coin(14800, 410),
  ]

  const spikeList: SpikeStrip[] = [
    spikes(3200, 120),
    spikes(3600, 120),
    spikes(5400, 120),
    spikes(10160, 120),
    spikes(11100, 120),
    spikes(14000, 120),
  ]

  const movers: MovingHazard[] = [
    mover(4830, 398, 22, 4720, 4940, 130, 7),
    mover(9100, 398, 22, 9015, 9185, 160, 11),
  ]

  const checkpoints: Checkpoint[] = [
    { x: 2950, y: GROUND_Y, active: false },
    { x: 6400, y: GROUND_Y, active: false },
    { x: 10000, y: GROUND_Y, active: false },
  ]

  const flag: Flag = {
    x: 15000,
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
