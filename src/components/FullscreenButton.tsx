import { useCallback, useEffect, useState } from 'react'

interface FullscreenButtonProps {
  /** Called after entering or leaving fullscreen, so the parent can react. */
  onChange?: (isFullscreen: boolean) => void
}

/**
 * Toggles browser fullscreen, the way a browser game should.
 *
 * The Fullscreen API needs a user gesture, so this is only ever called from a
 * click handler. It also handles the cases that quietly break in the wild:
 * iOS Safari only supports fullscreen on the video element and ignores
 * `Element.requestFullscreen`, and a page can leave fullscreen on its own
 * (Esc on desktop, the home gesture on mobile), so we listen for the change and
 * keep the button label in sync instead of assuming we are still fullscreen.
 */
function FullscreenButton({ onChange }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Track fullscreen state from the document rather than from our own call, so
  // Esc / swipe-out / tab-switch are all reflected correctly.
  useEffect(() => {
    function onFullscreenChange() {
      const active = document.fullscreenElement != null
      setIsFullscreen(active)
      onChange?.(active)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [onChange])

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen({
          navigationUI: 'hide',
        })
      }
    } catch {
      // Fullscreen can be refused (no user gesture, iOS restrictions, embedded
      // webviews). The game is fully playable without it, so just re-sync.
      setIsFullscreen(document.fullscreenElement != null)
    }
  }, [])

  return (
    <button
      className="fullscreen-btn"
      type="button"
      onClick={toggle}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
    >
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isFullscreen ? (
          // "Collapse" corners: pointing inwards
          <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
        ) : (
          // "Expand" corners: pointing outwards
          <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
        )}
      </svg>
    </button>
  )
}

export default FullscreenButton