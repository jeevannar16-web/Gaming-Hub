import { useState, useRef, useEffect, useCallback } from 'react'
import GameCanvas from './game/GameCanvas'
import TouchControls from './components/TouchControls'
import HUD from './components/HUD'
import StartScreen from './components/StartScreen'
import WinScreen from './components/WinScreen'
import GameOverScreen from './components/GameOverScreen'
import { InputState } from './game/engine'
import { unlockAudio } from './game/audio'

type GameState = 'menu' | 'playing' | 'win' | 'over'

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)

  const inputRef = useRef<InputState>({ left: false, right: false, jumpHeld: false })
  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current

      if (state === 'playing') {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
          inputRef.current.left = true
          e.preventDefault()
        }
        if (e.code === 'KeyD' || e.code === 'ArrowRight') {
          inputRef.current.right = true
          e.preventDefault()
        }
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          inputRef.current.jumpHeld = true
          e.preventDefault()
        }
        if (e.code === 'Home') {
          inputRef.current.left = true
          inputRef.current.right = false
          e.preventDefault()
        }
        if (e.code === 'End') {
          inputRef.current.right = true
          inputRef.current.left = false
          e.preventDefault()
        }
      } else {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault()
          if (state === 'menu') {
            setGameState('playing')
          } else if (state === 'win' || state === 'over') {
            setGameState('menu')
          }
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const state = gameStateRef.current
      if (state !== 'playing') return
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.left = false
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.right = false
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') inputRef.current.jumpHeld = false
      if (e.code === 'Home' || e.code === 'End') {
        inputRef.current.left = false
        inputRef.current.right = false
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const resetCallbacks = useCallback(() => ({
    onCoin: (s: number) => setScore(s),
    onLives: (l: number) => setLives(l),
    onWin: (s: number) => { setScore(s); setGameState('win') },
    onGameOver: (s: number) => { setScore(s); setGameState('over') },
    onCheckpoint: () => {},
  }), [])

  const startGame = useCallback(() => {
    unlockAudio()
    setScore(0)
    setLives(3)
    setGameState('playing')
  }, [])

  return (
    <div className="game-container">
      <GameCanvas
        gameState={gameState}
        inputRef={inputRef}
        callbacks={resetCallbacks()}
      />
      <HUD score={score} lives={lives} />

      {gameState === 'menu' && <StartScreen onStart={startGame} />}
      {gameState === 'win' && <WinScreen score={score} onRestart={() => setGameState('menu')} />}
      {gameState === 'over' && <GameOverScreen score={score} onRestart={() => setGameState('menu')} />}

      <TouchControls inputRef={inputRef} />
    </div>
  )
}

export default App