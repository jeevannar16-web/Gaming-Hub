interface HubHomeProps {
  onLaunch: () => void
}

function HubHome({ onLaunch }: HubHomeProps) {
  return (
    <main className="hub">
      <div className="hub-glow hub-glow--pink" aria-hidden="true" />
      <div className="hub-glow hub-glow--cyan" aria-hidden="true" />

      <header className="hub-header">
        <div className="hub-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <rect x="6" y="6" width="52" height="52" rx="16" stroke="url(#lg)" strokeWidth="2.5" fill="none" />
            <path d="M22 28h20v8H22z" stroke="#ff2fb8" strokeWidth="3" strokeLinejoin="round" fill="none" />
            <path d="M17 33v4M21 33v4M25 33v4" stroke="#34f5ff" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="39" cy="35.5" r="2.4" fill="#ffd166" />
            <path d="M28 43a4.5 4.5 0 0 0 9 0" stroke="#ff2fb8" strokeWidth="3" strokeLinecap="round" fill="none" />
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#34f5ff" />
                <stop offset="1" stopColor="#ff2fb8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="hub-heading">
          <p className="hub-kicker">POCKET ARCADE</p>
          <h1 className="hub-title">
            NEON <span className="hub-title--accent">ARCADE</span>
          </h1>
          <p className="hub-subtitle">Two games. Zero downloads. All offline.</p>
        </div>

        <span className="hub-count" aria-label="2 games in collection">
          <span className="hub-count__num">2</span>
          <span className="hub-count__label">GAMES</span>
        </span>
      </header>

      <section className="hub-grid" aria-label="Available games">
        <article className="game-card game-card--gold">
          <div className="game-art game-art--gold" aria-hidden="true">
            <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="cqSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1b1b4b" />
                  <stop offset="0.72" stopColor="#3b2d6e" />
                  <stop offset="1" stopColor="#f2b233" />
                </linearGradient>
              </defs>
              <rect width="320" height="180" fill="url(#cqSky)" />
              <circle cx="46" cy="30" r="1.7" fill="#fff" opacity="0.9" />
              <circle cx="120" cy="20" r="1.4" fill="#fff" opacity="0.7" />
              <circle cx="200" cy="34" r="1.8" fill="#fff" opacity="0.85" />
              <circle cx="262" cy="18" r="1.3" fill="#fff" opacity="0.7" />
              <circle cx="58" cy="64" r="1.3" fill="#fff" opacity="0.6" />
              <circle cx="286" cy="66" r="1.5" fill="#fff" opacity="0.8" />
              <circle cx="276" cy="46" r="15" fill="#ffe08a" opacity="0.92" />
              <circle cx="282" cy="40" r="13" fill="#3b2d6e" />
              <rect x="56" y="122" width="208" height="16" rx="7" fill="#1a1750" />
              <rect x="56" y="122" width="208" height="7" rx="3.5" fill="#2b2870" />
              <rect x="96" y="96" width="14" height="26" rx="3" fill="#1a1750" />
              <rect x="210" y="104" width="14" height="18" rx="3" fill="#1a1750" />
              <path d="M142 66 L182 82 L142 98 L102 82 Z" fill="#ffd166" stroke="#b8860b" strokeWidth="2" strokeLinejoin="round" />
              <line x1="142" y1="98" x2="148" y2="116" stroke="#f2b233" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="149.5" cy="117" r="3.2" fill="#ffd166" />
              <circle cx="116" cy="110" r="5" fill="#ffe08a" stroke="#b8860b" strokeWidth="1.4" />
              <circle cx="172" cy="112" r="4.4" fill="#ffe08a" stroke="#b8860b" strokeWidth="1.4" />
              <circle cx="60" cy="30" r="15" fill="#ff2fb8" opacity="0.14" />
              <circle cx="290" cy="150" r="22" fill="#34f5ff" opacity="0.12" />
            </svg>
            <span className="game-art__badge game-art__badge--gold">PLATFORMER</span>
          </div>

          <div className="game-body">
            <div className="game-tags">
              <span>ARCADE</span>
              <span>KEYBOARD + TOUCH</span>
              <span>SAVE SYSTEM</span>
            </div>
            <h2 className="game-title">CAP QUEST</h2>
            <p className="game-desc">
              A graduation platformer — collect coins, dodge gaps and rush to the ceremony before the bell rings.
            </p>
            <div className="game-meta">
              <span className="keycaps" aria-hidden="true">
                <kbd title="Move left">◀</kbd>
                <kbd title="Move right">▶</kbd>
                <kbd title="Jump">SPACE</kbd>
              </span>
            </div>
            <button className="game-play game-play--gold" type="button" onClick={onLaunch}>
              <span>PLAY NOW</span>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </article>

        <article className="game-card game-card--violet">
          <div className="game-art game-art--violet" aria-hidden="true">
            <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="spBg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#241447" />
                  <stop offset="1" stopColor="#0e0a26" />
                </linearGradient>
              </defs>
              <rect width="320" height="180" fill="url(#spBg)" />
              <circle cx="44" cy="54" r="2.2" fill="#a78bfa" opacity="0.8" />
              <circle cx="288" cy="38" r="2.4" fill="#34f5ff" opacity="0.8" />
              <circle cx="64" cy="140" r="2" fill="#ffd166" opacity="0.7" />
              <circle cx="278" cy="148" r="2.2" fill="#ff2fb8" opacity="0.8" />
              <circle cx="250" cy="96" r="1.8" fill="#4ade80" opacity="0.7" />
              <circle cx="38" cy="22" r="1.8" fill="#fb923c" opacity="0.7" />
              <circle cx="310" cy="112" r="2.6" fill="#ffd166" opacity="0.6" />
              <circle cx="120" cy="150" r="2" fill="#22d3ee" opacity="0.6" />
              <g className="wheel-wrap">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 160 88"
                  to="360 160 88"
                  dur="16s"
                  repeatCount="indefinite"
                />
                <g transform="translate(160 88)">
                  <g transform="rotate(0)"><path d="M0 0 L0 -50 A50 50 0 0 1 35.4 -35.4 Z" fill="#ff2fb8" /></g>
                  <g transform="rotate(45)"><path d="M0 0 L0 -50 A50 50 0 0 1 35.4 -35.4 Z" fill="#34f5ff" /></g>
                  <g transform="rotate(90)"><path d="M0 0 L0 -50 A50 50 0 0 1 35.4 -35.4 Z" fill="#ffd166" /></g>
                  <g transform="rotate(135)"><path d="M0 0 L0 -50 A50 50 0 0 1 35.4 -35.4 Z" fill="#a78bfa" /></g>
                  <g transform="rotate(180)"><path d="M0 0 L0 -50 A50 50 0 0 1 35.4 -35.4 Z" fill="#4ade80" /></g>
                  <g transform="rotate(225)"><path d="M0 0 L0 -50 A50 50 0 0 1 35.4 -35.4 Z" fill="#fb923c" /></g>
                  <g transform="rotate(270)"><path d="M0 0 L0 -50 A50 50 0 0 1 35.4 -35.4 Z" fill="#f43f5e" /></g>
                  <g transform="rotate(315)"><path d="M0 0 L0 -50 A50 50 0 0 1 35.4 -35.4 Z" fill="#22d3ee" /></g>
                  <circle r="47" fill="none" stroke="#0e0a26" strokeWidth="3.5" />
                  <circle r="19" fill="#0e0a26" />
                  <circle r="8" fill="#fff" />
                  <circle r="4" fill="#0e0a26" />
                </g>
              </g>
              <path d="M150 30 L170 30 L160 46 Z" fill="#34f5ff" />
            </svg>
            <span className="game-art__badge game-art__badge--violet">WHEEL</span>
          </div>

          <div className="game-body">
            <div className="game-tags">
              <span>RANDOM PICKER</span>
              <span>PRIVACY-FIRST</span>
              <span>OFFLINE</span>
            </div>
            <h2 className="game-title">SPINORA</h2>
            <p className="game-desc">
              Spin the wheel and pick a winner — perfect for giveaways, raffles, teams and everyday decisions.
            </p>
            <div className="game-meta">
              <span className="game-meta__hint">No sign-up · No uploads · Nothing leaves your device</span>
            </div>
            <a className="game-play game-play--violet" href="games/pickora/">
              <span>PLAY NOW</span>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
        </article>
      </section>

      <footer className="hub-footer">
        <span>NEON ARCADE</span>
        <span className="hub-footer__dot">·</span>
        <span>2 games</span>
        <span className="hub-footer__dot">·</span>
        <span>Made with ♥ on Arch</span>
      </footer>
    </main>
  )
}

export default HubHome