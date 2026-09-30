import { useState, useEffect } from 'react'

interface StartScreenProps {
  onStart: () => void
}

function StartScreen({ onStart }: StartScreenProps) {
  // Touch players have no keyboard, so tell them to tap instead of press Space.
  const [isTouch] = useState(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        onStart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  return (
    <div
      className="overlay-screen"
      onPointerDown={(e) => { e.preventDefault(); onStart() }}
      role="button"
      aria-label={isTouch ? 'Tap to start' : 'Press Space to start'}
    >
      <h1 className="overlay-title">CAP QUEST</h1>
      <p className="overlay-subtitle">A graduation platformer</p>
      <p className="overlay-prompt">{isTouch ? 'TAP TO START' : 'PRESS SPACE TO START'}</p>
      {isTouch && <p className="overlay-hint">Tap anywhere to jump &middot; hold the left button to brake</p>}
    </div>
  )
}

export default StartScreen
