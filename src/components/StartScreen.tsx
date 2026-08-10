interface StartScreenProps {
  onStart: () => void
}

function StartScreen({ onStart }: StartScreenProps) {
  const handleClick = () => onStart()
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault()
      onStart()
    }
  }

  return (
    <div className="overlay-screen" onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={0} role="button" aria-label="Press Space or tap to start">
      <h1 className="overlay-title">CAP QUEST</h1>
      <p className="overlay-subtitle">A graduation platformer</p>
      <p className="overlay-prompt">PRESS SPACE TO START</p>
    </div>
  )
}

export default StartScreen