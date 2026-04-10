import { useState, useCallback } from 'react';
import { GameState, Role } from '@/game/types';
import { createGame } from '@/game/engine';
import GameCanvas from '@/components/GameCanvas';
import LobbyScreen from '@/components/LobbyScreen';
import GameOverScreen from '@/components/GameOverScreen';

export default function Index() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleStart = useCallback((role: Role) => {
    setGameState(createGame(role));
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(null);
  }, []);

  if (!gameState) return <LobbyScreen onStart={handleStart} />;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <GameCanvas gameState={gameState} setGameState={setGameState} />
      {gameState.phase === 'gameover' && (
        <GameOverScreen state={gameState} onRestart={handleRestart} />
      )}
    </div>
  );
}
