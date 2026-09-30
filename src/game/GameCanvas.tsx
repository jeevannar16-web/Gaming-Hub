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
  const sizeRef = useRef<{ dpr: number; scale: number; viewW: number; viewH: number; bandH: number; bandTop: number }>(
    { dpr: 1, scale: 1, viewW: VIEW_W, viewH: VIEW_H, bandH: VIEW_H, bandTop: 0 }
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
    // Test hook for the automated smoke suite. Inert unless the page is loaded
    // with ?debug=1, so it exposes nothing during normal play.
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      ;(window as unknown as Record<string, unknown>).__cqGame = gameRef.current
    }
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
      const aspect = w / h

      // The canvas always covers the whole viewport, so there are never any
      // empty letterbox bars showing the page background. The engine draws in a
      // fixed VIEW_W x VIEW_H design space, so we scale that space uniformly
      // (no distortion) and pick the framing per aspect ratio:
      //
      //  - Wide (aspect >= 1): scale to fit the design height and widen the view
      //    to cover the full width, showing more of the level.
      //  - Tall/portrait (phones): scale to fit the design WIDTH but zoom in
      //    enough that the character is large and readable, then anchor the
      //    world so the ground sits near the bottom with sky above.
      let scale: number
      if (aspect >= 1) {
        scale = h / VIEW_H
      } else {
        // Zoom in well past the full design width so the character is a decent
        // size on a phone. The cap keeps a useful amount of the level visible
        // ahead of the player so obstacles can still be read in time.
        const fitWidth = w / VIEW_W
        scale = Math.min(fitWidth * 2.4, h / VIEW_H * 0.9)
        scale = Math.max(scale, fitWidth * 1.5)
      }

      const viewW = Math.ceil(w / scale)
      const viewH = h / scale

      // How tall the world band is, and where it starts, in design units.
      // bandTop is the design Y that maps to the top of the canvas; the engine
      // always draws the world from y=0, so bandTop is how far we push it down.
      let bandTop: number
      let bandH: number
      if (aspect >= 1) {
        // Centre the world band vertically, capped at the ground block.
        bandH = Math.min(viewH, WORLD_BOTTOM)
        bandTop = (viewH - bandH) / 2
      } else {
        // Tall: show the ground block and push it toward the bottom, leaving
        // sky above. bandTop is a NEGATIVE design offset once the world is
        // taller than the visible area.
        bandH = WORLD_BOTTOM
        // Offset so the ground (GROUND_Y=460) sits at ~82% down the screen,
        // keeping the character low and large.
        const groundOnScreen = viewH * 0.82
        bandTop = groundOnScreen - 460
      }

      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      canvas.width = Math.ceil(w * dpr)
      canvas.height = Math.ceil(h * dpr)
      sizeRef.current = { dpr, scale, viewW, viewH, bandH, bandTop }
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

      const { dpr, scale, viewW, viewH, bandH, bandTop } = sizeRef.current
      ctx.save()
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
      ctx.translate(0, bandTop)
      try {
        // The visible design-space area is y in [bandTop, bandTop + viewH].
        // Paint any part of that area that the world band does not cover with
        // the game's own colours, so there is never a hard rectangle: sky
        // gradient above the world, the ground's own tone below it.
        const gapTop = Math.max(0, bandTop)                    // sky above the world
        const gapBottom = Math.max(0, bandTop + viewH - bandH) // ground below

        if (gapTop > 0.5) {
          const sky = ctx.createLinearGradient(0, -gapTop, 0, 0)
          sky.addColorStop(0, '#06061a')
          sky.addColorStop(1, SKY_TOP)
          ctx.fillStyle = sky
          ctx.fillRect(0, -gapTop, viewW, gapTop)
        }
        if (gapBottom > 0.5) {
          ctx.fillStyle = GROUND_UNDER
          ctx.fillRect(0, bandH, viewW, gapBottom)
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