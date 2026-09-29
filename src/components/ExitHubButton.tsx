interface ExitHubButtonProps {
  onExit: () => void
}

function ExitHubButton({ onExit }: ExitHubButtonProps) {
  return (
    <button className="exit-hub-btn" type="button" onClick={onExit} aria-label="Back to Neon Arcade">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span>ARCADE</span>
    </button>
  )
}

export default ExitHubButton