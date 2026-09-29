import { useRef, useEffect } from 'react'
import { Game, type InputState, type GameCallbacks } from './engine'
import { buildLevel } from './level'
import { unlockAudio } from './audio'

interface GameCanvasProps {
  gameState: 'menu' | 'playing' | 'win' | 'over'
  inputRef: React.MutableRefObject<InputState>
  callbacks: GameCallbacks
}

const VIEW_W = 960
const VIEW_H = 540
/** Bottom of the ground block; never frame below it (that would be void). */
const WORLD_BOTTOM = 660
/** Top colour of the engine's sky gradient, so padding joins invisibly. */
const SKY_TOP = '#141433'
/** Darkest tone of the terrain gradient, so padding under the ground matches. */
const GROUND_UNDER = '#1f2448'

export default function GameCanvas({ gameState, inputRef, callbacks }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const pausedRef = useRef<boolean>(false)
  const sizeRef = useRef<{ dpr: number; scale: number; viewW: number; bandH: number; padY: number }>(
    { dpr: 1, scale: 1, viewW: VIEW_W, bandH: VIEW_H, padY: 0 }
  )

  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  if (!gameRef.current) {
    const gameCallbacks: GameCallbacks = {
      onCoin: (s) => callbacksRef.current.onCoin(s),
      onLives: (l) => callbacksRef.current.onLives(l),
      onWin: (s) => callbacksRef.current.onWin(s),
      onGameOver: (s) => callbacksRef.current.onGameOver(s),
      onCheckpoint: (i) => callbacksRef.current.onCheckpoint(i),
    }
    gameRef.current = new Game(buildLevel(), VIEW_W, gameCallbacks)
  }

  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    if (gameState === 'playing') {
      game.reset()
    } else if (gameState === 'menu') {
      game.toMenu()
    }
  }, [gameState])

  useEffect(() => {
    function resize() {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
      const w = window.innerWidth
      const h = window.innerHeight

      // The canvas always covers the whole viewport, so there are never any
      // empty letterbox bars showing the page background. The engine draws in a
      // fixed VIEW_W x VIEW_H design space, so we scale that space uniformly
      // (no distortion, no cropping) and widen it on wide screens, which shows
      // more of the level instead of leaving a bar at the left edge.
      const scale = Math.min(w / VIEW_W, h / VIEW_H)
      const viewW = Math.ceil(w / scale)
      const viewH = h / scale
      // Never show less than the designed frame, but stop at the bottom of the
      // ground block so tall screens pad with sky/ground rather than void.
      const bandH = Math.min(viewH, WORLD_BOTTOM)
      const padY = (viewH - bandH) / 2

      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      canvas.width = Math.ceil(w * dpr)
      canvas.height = Math.ceil(h * dpr)
      sizeRef.current = { dpr, scale, viewW, bandH, padY }
      gameRef.current?.setViewW(viewW)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const onFocus = () => { pausedRef.current = false }
    const onBlur = () => { pausedRef.current = true }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function loop(timestamp: number) {
      const game = gameRef.current
      if (!game) return

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      let dt = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp
      dt = Math.min(dt, 0.033)

      if (!pausedRef.current) {
        try {
          game.update(dt, inputRef.current)
        } catch (err) {
          console.error('[GameCanvas] update error:', err)
        }
      }

      const { dpr, scale, viewW, bandH, padY } = sizeRef.current
      ctx.save()
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
      ctx.translate(0, padY)
      try {
        // Fill the vertical padding with the game's own colours so the edges
        // blend into the frame instead of showing as a hard rectangle: sky
        // gradient above, the ground's own tone below.
        if (padY > 0.5) {
          const sky = ctx.createLinearGradient(0, -padY, 0, 0)
          sky.addColorStop(0, '#06061a')
          sky.addColorStop(1, SKY_TOP)
          ctx.fillStyle = sky
          ctx.fillRect(0, -padY, viewW, padY)
          ctx.fillStyle = GROUND_UNDER
          ctx.fillRect(0, bandH, viewW, padY)
        }
        game.render(ctx, viewW, bandH)
      } catch (err) {
        console.error('[GameCanvas] render error:', err)
      }
      ctx.restore()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [inputRef])

  useEffect(() => {
    const onInteraction = () => {
      unlockAudio();
    };
    window.addEventListener('mousedown', onInteraction);
    window.addEventListener('touchstart', onInteraction);
    return () => {
      window.removeEventListener('mousedown', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" />
}