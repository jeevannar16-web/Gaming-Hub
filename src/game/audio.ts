// Synthesized sound effects via the Web Audio API. No audio files.
// The AudioContext is created lazily on the first user gesture to satisfy
// browser autoplay policies.

interface ToneOptions {
  freq: number
  freqEnd?: number
  type?: OscillatorType
  dur?: number
  gain?: number
  delay?: number
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

function getCtor(): typeof AudioContext {
  if (typeof window !== 'undefined' && window.AudioContext) return window.AudioContext
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext }
  if (w.webkitAudioContext) return w.webkitAudioContext
  throw new Error('Web Audio API not supported')
}

/** Must be called from a user gesture (keydown/tap) to unlock audio. */
export function unlockAudio(): void {
  if (!ctx) {
    const Ctor = getCtor()
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
    // Pre-render a short white-noise buffer for the hit/gameover thud.
    const len = Math.floor(ctx.sampleRate * 0.3)
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

function tone(opts: ToneOptions): void {
  if (!ctx || !master || ctx.state !== 'running') return
  const t0 = ctx.currentTime + (opts.delay ?? 0)
  const dur = opts.dur ?? 0.12
  const osc = ctx.createOscillator()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, t0)
  if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + dur)

  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.25, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function thump(dur: number, delay?: number): void {
  if (!ctx || !master || !noiseBuffer || ctx.state !== 'running') return
  const t0 = ctx.currentTime + (delay ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1200, t0)
  filter.frequency.exponentialRampToValueAtTime(120, t0 + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.35, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

export function playJump(): void {
  tone({ freq: 260, freqEnd: 620, type: 'square', dur: 0.13, gain: 0.12 })
}

export function playCoin(): void {
  tone({ freq: 880, type: 'triangle', dur: 0.09, gain: 0.18 })
  tone({ freq: 1318, type: 'triangle', dur: 0.16, gain: 0.18, delay: 0.06 })
}

export function playCheckpoint(): void {
  tone({ freq: 660, type: 'triangle', dur: 0.12, gain: 0.16 })
  tone({ freq: 990, type: 'triangle', dur: 0.2, gain: 0.16, delay: 0.08 })
}

export function playHit(): void {
  thump(0.22)
  tone({ freq: 180, freqEnd: 60, type: 'sawtooth', dur: 0.2, gain: 0.2 })
}

export function playWin(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
  notes.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.28, gain: 0.2, delay: i * 0.1 }))
  tone({ freq: 1568, type: 'sine', dur: 0.5, gain: 0.16, delay: notes.length * 0.1 })
}

export function playGameOver(): void {
  const notes = [392, 311, 233, 155]
  notes.forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.24, gain: 0.12, delay: i * 0.16 }))
  thump(0.4, notes.length * 0.16 + 0.05)
}
