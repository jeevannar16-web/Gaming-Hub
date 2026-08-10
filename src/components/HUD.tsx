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
              {/* Flat square top (mortarboard) */}
              <rect x="2" y="5" width="18" height="10" rx="1" fill="#ffd166" />
              {/* Cap body - dark crown */}
              <rect x="5" y="5" width="12" height="4" rx="0.5" fill="#1a2350" />
              {/* Tassel hanging down */}
              <line x1="11" y1="5" x2="11" y2="11" stroke="#f2b233" strokeWidth="1.5" />
              <circle cx="11" cy="11" r="2.5" fill="#ffd166" />
              <circle cx="11" cy="11" r="2" fill="#e8a31a" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  )
}

export default HUD