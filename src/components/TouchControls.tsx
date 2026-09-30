import { useRef, useCallback, useState, useEffect } from 'react'
import { InputState } from '../game/engine'

interface TouchControlsProps {
  inputRef: React.MutableRefObject<InputState>
}

function TouchControls({ inputRef }: TouchControlsProps) {
  const jumpZoneRef = useRef<HTMLDivElement>(null)
  const backZoneRef = useRef<HTMLDivElement>(null)
  const jumpBtnRef = useRef<HTMLButtonElement>(null)
  const backBtnRef = useRef<HTMLButtonElement>(null)
  
  const jumpPointers = useRef<Set<number>>(new Set())
  const backPointers = useRef<Set<number>>(new Set())
  
  // Auto-run state: true = auto-moving right, false = manual control
  const [autoRun] = useState(true)

  const updateInput = useCallback(() => {
    // Auto-run: always move right unless back button is held
    const movingBack = backPointers.current.size > 0
    const jumping = jumpPointers.current.size > 0
    
    inputRef.current.right = autoRun && !movingBack
    inputRef.current.left = movingBack
    inputRef.current.jumpHeld = jumping
  }, [inputRef, autoRun])

  const setBtnPressed = useCallback((btn: HTMLButtonElement | null, pressed: boolean) => {
    if (btn) btn.classList.toggle('pressed', pressed)
  }, [])

  const handleJumpDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    jumpPointers.current.add(e.pointerId)
    setBtnPressed(jumpBtnRef.current, true)
    updateInput()
  }, [updateInput, setBtnPressed])

  const handleJumpUp = useCallback((e: React.PointerEvent) => {
    jumpPointers.current.delete(e.pointerId)
    setBtnPressed(jumpBtnRef.current, false)
    updateInput()
  }, [updateInput, setBtnPressed])

  const handleBackDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    backPointers.current.add(e.pointerId)
    setBtnPressed(backBtnRef.current, true)
    updateInput()
  }, [updateInput, setBtnPressed])

  const handleBackUp = useCallback((e: React.PointerEvent) => {
    backPointers.current.delete(e.pointerId)
    setBtnPressed(backBtnRef.current, false)
    updateInput()
  }, [updateInput, setBtnPressed])

  // Detect touch device once during render
  const [isTouchDevice] = useState(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  )

  // Initialize auto-run on mount
  useEffect(() => {
    if (isTouchDevice) {
      updateInput()
    }
  }, [isTouchDevice, updateInput])

  if (!isTouchDevice) return null

  return (
    <div className="touch-controls">
      {/* Jump zone - large area on right side, tap anywhere to jump */}
      <div
        ref={jumpZoneRef}
        className="touch-jump-zone"
        onPointerDown={handleJumpDown}
        onPointerUp={handleJumpUp}
        onPointerLeave={handleJumpUp}
        onPointerCancel={handleJumpUp}
      >
        <button ref={jumpBtnRef} className="touch-btn jump-btn" aria-label="Jump">
          <svg viewBox="0 0 24 24"><path d="M12 18V6M18 12L12 6 6 12"/></svg>
        </button>
      </div>
      
      {/* Back/stop zone - left side, hold to slow down or move backward */}
      <div
        ref={backZoneRef}
        className="touch-back-zone"
        onPointerDown={handleBackDown}
        onPointerUp={handleBackUp}
        onPointerLeave={handleBackUp}
        onPointerCancel={handleBackUp}
      >
        <button ref={backBtnRef} className="touch-btn back-btn" aria-label="Slow / Back">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>

      {/* Auto-run indicator */}
      <div className="auto-run-indicator" aria-hidden="true">
        <span className={autoRun ? 'active' : ''}>AUTO</span>
      </div>
    </div>
  )
}

export default TouchControls