interface GameOverScreenProps {
  score: number
  onRestart: () => void
}

function GameOverScreen({ score, onRestart }: GameOverScreenProps) {
  const handleClick = () => onRestart()
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault()
      onRestart()
    }
  }

  return (
    <div className="overlay-screen" onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={0} role="button" aria-label="Press Space or tap to restart">
      <h1 className="overlay-title">GAME OVER</h1>
      <div className="overlay-score">{score.toLocaleString()}</div>
      <p className="overlay-prompt">PRESS SPACE TO RESTART</p>
    </div>
  )
}

export default GameOverScreen