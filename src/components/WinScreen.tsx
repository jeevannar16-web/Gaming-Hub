import { useEffect, useState } from 'react'

interface WinScreenProps {
  score: number
  onRestart: () => void
}

function WinScreen({ score, onRestart }: WinScreenProps) {
  const [displayScore, setDisplayScore] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (started) return
    setStarted(true)
    const target = score
    const duration = 1200
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = Math.floor(target * eased)
      if (next !== displayScore) setDisplayScore(next)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score, started])

  const [isTouch] = useState(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        onRestart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRestart])

  return (
    <div
      className="overlay-screen"
      onPointerDown={(e) => { e.preventDefault(); onRestart() }}
      role="button"
      aria-label={isTouch ? 'Tap to continue' : 'Press Space to continue'}
    >
      <h1 className="overlay-title">LEVEL CLEAR</h1>
      <div className="overlay-score">{displayScore.toLocaleString()}</div>
      <p className="overlay-prompt">{isTouch ? 'TAP TO CONTINUE' : 'PRESS SPACE TO CONTINUE'}</p>
    </div>
  )
}

export default WinScreen