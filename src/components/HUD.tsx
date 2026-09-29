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
             <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path className="cap-shape" d="M5 4 L19 4 L17 16 L3 16 Z" fill="#ffd166" stroke="#b8860b" strokeWidth="1.5" strokeLinejoin="round"/>
               <line className="tassel-line" x1="10" y1="16" x2="12" y2="20" stroke="#f2b233" strokeWidth="1.3" strokeLinecap="round"/>
               <circle className="tassel-dot" cx="12.5" cy="20.5" r="1.8" fill="#ffd166"/>
             </svg>
           </span>
         ))}
       </div>
    </div>
  )
}

export default HUD