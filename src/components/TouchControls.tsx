import { useRef, useCallback, useState } from 'react'
import { InputState } from '../game/engine'

interface TouchControlsProps {
  inputRef: React.MutableRefObject<InputState>
}

function TouchControls({ inputRef }: TouchControlsProps) {
  const dpadRef = useRef<HTMLDivElement>(null)
  const jumpRef = useRef<HTMLDivElement>(null)
  const leftPointers = useRef<Set<number>>(new Set())
  const rightPointers = useRef<Set<number>>(new Set())
  const jumpPointers = useRef<Set<number>>(new Set())
  const leftBtnRef = useRef<HTMLButtonElement>(null)
  const rightBtnRef = useRef<HTMLButtonElement>(null)
  const jumpBtnRef = useRef<HTMLButtonElement>(null)

  const updateInput = useCallback(() => {
    inputRef.current.left = leftPointers.current.size > 0
    inputRef.current.right = rightPointers.current.size > 0
    inputRef.current.jumpHeld = jumpPointers.current.size > 0
  }, [inputRef])

  const setBtnPressed = useCallback((btn: HTMLButtonElement | null, pressed: boolean) => {
    if (btn) btn.classList.toggle('pressed', pressed)
  }, [])

  const getDpadSide = useCallback((clientX: number): 'left' | 'right' | null => {
    const dpad = dpadRef.current
    if (!dpad) return null
    const rect = dpad.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    if (clientX < centerX) return 'left'
    return 'right'
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent, zone: 'dpad' | 'jump') => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    if (zone === 'jump') {
      jumpPointers.current.add(e.pointerId)
      setBtnPressed(jumpBtnRef.current, true)
    } else {
      const side = getDpadSide(e.clientX)
      if (side === 'left') {
        leftPointers.current.add(e.pointerId)
        setBtnPressed(leftBtnRef.current, true)
      } else if (side === 'right') {
        rightPointers.current.add(e.pointerId)
        setBtnPressed(rightBtnRef.current, true)
      }
    }
    updateInput()
  }, [getDpadSide, updateInput, setBtnPressed])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget === dpadRef.current) {
      const side = getDpadSide(e.clientX)
      if (side === 'left') {
        rightPointers.current.delete(e.pointerId)
        leftPointers.current.add(e.pointerId)
        setBtnPressed(rightBtnRef.current, false)
        setBtnPressed(leftBtnRef.current, true)
      } else if (side === 'right') {
        leftPointers.current.delete(e.pointerId)
        rightPointers.current.add(e.pointerId)
        setBtnPressed(leftBtnRef.current, false)
        setBtnPressed(rightBtnRef.current, true)
      }
      updateInput()
    }
  }, [getDpadSide, updateInput, setBtnPressed])

  const handlePointerUp = useCallback((e: React.PointerEvent, zone: 'dpad' | 'jump') => {
    leftPointers.current.delete(e.pointerId)
    rightPointers.current.delete(e.pointerId)
    jumpPointers.current.delete(e.pointerId)
    if (zone === 'dpad') {
      setBtnPressed(leftBtnRef.current, false)
      setBtnPressed(rightBtnRef.current, false)
    } else {
      setBtnPressed(jumpBtnRef.current, false)
    }
    updateInput()
  }, [updateInput, setBtnPressed])

  const handlePointerLeave = useCallback((e: React.PointerEvent, zone: 'dpad' | 'jump') => {
    leftPointers.current.delete(e.pointerId)
    rightPointers.current.delete(e.pointerId)
    jumpPointers.current.delete(e.pointerId)
    if (zone === 'dpad') {
      setBtnPressed(leftBtnRef.current, false)
      setBtnPressed(rightBtnRef.current, false)
    } else {
      setBtnPressed(jumpBtnRef.current, false)
    }
    updateInput()
  }, [updateInput, setBtnPressed])

  // Detect once during render (SSR-safe; Vite is client-only anyway)
  const [isTouchDevice] = useState(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  )

  if (!isTouchDevice) return null

  return (
    <div className="touch-controls">
      <div
        ref={dpadRef}
        className="touch-dpad"
        onPointerDown={(e) => handlePointerDown(e, 'dpad')}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp(e, 'dpad')}
        onPointerLeave={(e) => handlePointerLeave(e, 'dpad')}
        onPointerCancel={(e) => handlePointerUp(e, 'dpad')}
      >
        <button ref={leftBtnRef} className="touch-btn dpad-left" aria-label="Left">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="touch-btn dpad-center" />
        <button ref={rightBtnRef} className="touch-btn dpad-right" aria-label="Right">
          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div
        ref={jumpRef}
        className="touch-jump"
        onPointerDown={(e) => handlePointerDown(e, 'jump')}
        onPointerUp={(e) => handlePointerUp(e, 'jump')}
        onPointerLeave={(e) => handlePointerLeave(e, 'jump')}
        onPointerCancel={(e) => handlePointerUp(e, 'jump')}
      >
        <button ref={jumpBtnRef} className="touch-btn jump-btn" aria-label="Jump">
          <svg viewBox="0 0 24 24"><path d="M12 18V6M18 12L12 6 6 12"/></svg>
        </button>
      </div>
    </div>
  )
}

export default TouchControls