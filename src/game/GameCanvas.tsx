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

export default function GameCanvas({ gameState, inputRef, callbacks }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const pausedRef = useRef<boolean>(false)
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: VIEW_W, h: VIEW_H, dpr: 1 })

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
      const maxW = window.innerWidth
      const maxH = window.innerHeight
      const ratio = VIEW_W / VIEW_H
      let w = maxW
      let h = Math.round(w / ratio)
      if (h > maxH) {
        h = maxH
        w = Math.round(h * ratio)
      }
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      canvas.width = w * dpr
      canvas.height = h * dpr
      sizeRef.current = { w, h, dpr }
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
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function loop(timestamp: number) {
      const game = gameRef.current
      if (!game) return

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      let dt = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp
      dt = Math.min(dt, 0.033)

      if (!pausedRef.current) {
        const input = inputRef.current
        game.update(dt, input)
      }

      const { dpr } = sizeRef.current
      ctx.save()
      ctx.scale(dpr, dpr)
      game.render(ctx, VIEW_W, VIEW_H)
      ctx.restore()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [inputRef])

  useEffect(() => {
    const onInteraction = () => {
      unlockAudio()
      window.removeEventListener('keydown', onInteraction)
      window.removeEventListener('mousedown', onInteraction)
      window.removeEventListener('touchstart', onInteraction)
    }
    window.addEventListener('keydown', onInteraction)
    window.addEventListener('mousedown', onInteraction)
    window.addEventListener('touchstart', onInteraction)
  }, [])

  return <canvas ref={canvasRef} className="game-canvas" />
}