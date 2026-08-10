import { useRef, useEffect, useCallback } from 'react'
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

  const updateInput = useCallback(() => {
    inputRef.current.left = leftPointers.current.size > 0
    inputRef.current.right = rightPointers.current.size > 0
    inputRef.current.jumpHeld = jumpPointers.current.size > 0
  }, [inputRef])

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
    } else {
      const side = getDpadSide(e.clientX)
      if (side === 'left') leftPointers.current.add(e.pointerId)
      else if (side === 'right') rightPointers.current.add(e.pointerId)
    }
    updateInput()
  }, [getDpadSide, updateInput])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget === dpadRef.current) {
      const side = getDpadSide(e.clientX)
      if (side === 'left') {
        rightPointers.current.delete(e.pointerId)
        leftPointers.current.add(e.pointerId)
      } else if (side === 'right') {
        leftPointers.current.delete(e.pointerId)
        rightPointers.current.add(e.pointerId)
      }
      updateInput()
    }
  }, [getDpadSide, updateInput])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    leftPointers.current.delete(e.pointerId)
    rightPointers.current.delete(e.pointerId)
    jumpPointers.current.delete(e.pointerId)
    updateInput()
  }, [updateInput])

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    leftPointers.current.delete(e.pointerId)
    rightPointers.current.delete(e.pointerId)
    jumpPointers.current.delete(e.pointerId)
    updateInput()
  }, [updateInput])

  const isTouchDevice = useRef(false)
  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  if (!isTouchDevice.current) return null

  return (
    <div className="touch-controls">
      <div
        ref={dpadRef}
        className="touch-dpad"
        onPointerDown={(e) => handlePointerDown(e, 'dpad')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
      >
        <button className="touch-btn dpad-left" aria-label="Left">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="touch-btn dpad-center" />
        <button className="touch-btn dpad-right" aria-label="Right">
          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div
        ref={jumpRef}
        className="touch-jump"
        onPointerDown={(e) => handlePointerDown(e, 'jump')}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <button className="touch-btn jump-btn" aria-label="Jump">
          <svg viewBox="0 0 24 24"><path d="M12 18V6M18 12L12 6 6 12"/></svg>
        </button>
      </div>
    </div>
  )
}

export default TouchControls