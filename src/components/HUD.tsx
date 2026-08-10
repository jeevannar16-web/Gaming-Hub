interface HUDProps {
  score: number
  lives: number
}

function HUD({ score, lives }: HUDProps) {
  return (
    <div className="hud">
      <div className="hud-left">
        <div className="medallion-icon" aria-hidden="true" />
        <span className="score-label">SCORE</span>
        <span className="score-value">{score.toLocaleString()}</span>
      </div>
      <div className="hud-title">CAP QUEST</div>
      <div className="hud-right" aria-label={`Lives: ${lives}`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`life-icon${i >= lives ? ' lost' : ''}`} aria-hidden="true">
            <svg viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 10 L11 2 L21 10 L11 14 L1 10 Z" fill="#c03a4e" stroke="#f2b233" strokeWidth="1.5"/>
              <rect x="7" y="10" width="8" height="6" rx="1" fill="#1a2350"/>
              <line x1="11" y1="12" x2="11" y2="16" stroke="#f2b233" strokeWidth="1.2"/>
            </svg>
          </span>
        ))}
      </div>
    </div>
  )
}

export default HUD