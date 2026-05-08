import { useState, useCallback } from 'react';
import { GameState, Role } from '@/game/types';
import { createGame } from '@/game/engine';
import GameCanvas from '@/components/GameCanvas';
import LobbyScreen from '@/components/LobbyScreen';
import GameOverScreen from '@/components/GameOverScreen';
import LoadingScreen from '@/components/LoadingScreen';

export default function Index() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = useCallback((role: Role) => {
    setLoading(true);
    setTimeout(() => {
      setGameState(createGame(role));
      setLoading(false);
    }, 2500);
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(null);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!gameState) return <LobbyScreen onStart={handleStart} />;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <GameCanvas gameState={gameState} setGameState={setGameState} onExit={handleRestart} />
      {gameState.phase === 'gameover' && (
        <GameOverScreen state={gameState} onRestart={handleRestart} />
      )}
    </div>
  );
}
