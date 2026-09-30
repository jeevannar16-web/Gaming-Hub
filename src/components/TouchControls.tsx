import { useRef, useCallback, useState } from 'react'
import { InputState } from '../game/engine'

interface TouchControlsProps {
  inputRef: React.MutableRefObject<InputState>
}

/**
 * Mobile controls, laid out the way mobile platformers actually work:
 *
 *  - The runner moves forward on its own (auto-run), so the player only ever
 *    needs one thumb for one job.
 *  - Tapping ANYWHERE on the play area jumps. There is no jump button to hunt
 *    for, which is how games like these are played.
 *  - A single hold button in the bottom-left slows/stops and reverses the run,
 *    for lining up a tricky jump.
 *
 * Both actions support multi-touch, so holding back and tapping to jump at the
 * same time works.
 */
function TouchControls({ inputRef }: TouchControlsProps) {
  const backZoneRef = useRef<HTMLDivElement>(null)
  const backBtnRef = useRef<HTMLButtonElement>(null)
  const jumpPointers = useRef<Set<number>>(new Set())
  const backPointers = useRef<Set<number>>(new Set())
  const autoRun = true

  const updateInput = useCallback(() => {
    const movingBack = backPointers.current.size > 0
    inputRef.current.right = autoRun && !movingBack
    inputRef.current.left = movingBack
    inputRef.current.jumpHeld = jumpPointers.current.size > 0
  }, [inputRef])

  // Tap anywhere (the full-screen layer) to jump.
  const handleJumpDown = useCallback((e: React.PointerEvent) => {
    // Ignore taps that land on the back button, so holding it never jumps.
    if (backZoneRef.current?.contains(e.target as Node)) return
    e.preventDefault()
    // A tap can be shorter than one animation frame, so latch the press. The
    // engine consumes and clears this, guaranteeing a fast tap always jumps.
    inputRef.current.jumpPressed = true
    jumpPointers.current.add(e.pointerId)
    updateInput()
  }, [updateInput, inputRef])

  const handleJumpUp = useCallback((e: React.PointerEvent) => {
    jumpPointers.current.delete(e.pointerId)
    updateInput()
  }, [updateInput])

  const handleBackDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement
    try { target.setPointerCapture(e.pointerId) } catch { /* capture is best-effort */ }
    backPointers.current.add(e.pointerId)
    backBtnRef.current?.classList.add('pressed')
    updateInput()
  }, [updateInput])

  const handleBackUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    backPointers.current.delete(e.pointerId)
    backBtnRef.current?.classList.remove('pressed')
    updateInput()
  }, [updateInput])

  const [isTouchDevice] = useState(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  )

  if (!isTouchDevice) return null

  return (
    <>
      {/* Full-screen tap-to-jump layer. Sits under the HUD and overlay screens
          (which stop propagation) so menu buttons and the HUD stay tappable. */}
      <div
        className="touch-jump-layer"
        onPointerDown={handleJumpDown}
        onPointerUp={handleJumpUp}
        onPointerCancel={handleJumpUp}
        aria-hidden="true"
      />

      <div className="touch-controls">
        {/* Hold to slow / stop / reverse */}
        <div
          ref={backZoneRef}
          className="touch-back-zone"
          onPointerDown={handleBackDown}
          onPointerUp={handleBackUp}
          onPointerCancel={handleBackUp}
          onPointerLeave={handleBackUp}
        >
          <button ref={backBtnRef} className="touch-btn back-btn" aria-label="Hold to slow or reverse">
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="back-hint">HOLD</span>
        </div>
      </div>
    </>
  )
}

export default TouchControls