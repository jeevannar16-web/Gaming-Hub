import { useState, useEffect } from 'react'

interface GameOverScreenProps {
  score: number
  onRestart: () => void
}

function GameOverScreen({ score, onRestart }: GameOverScreenProps) {
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
      aria-label={isTouch ? 'Tap to restart' : 'Press Space to restart'}
    >
      <h1 className="overlay-title">GAME OVER</h1>
      <div className="overlay-score">{score.toLocaleString()}</div>
      <p className="overlay-prompt">{isTouch ? 'TAP TO RESTART' : 'PRESS SPACE TO RESTART'}</p>
    </div>
  )
}

export default GameOverScreen
