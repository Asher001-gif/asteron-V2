import { useState, useCallback, useEffect } from 'react';
import { GameState, Role } from '@/game/types';
import { createGame } from '@/game/engine';
import GameCanvas from '@/components/GameCanvas';
import LobbyScreen from '@/components/LobbyScreen';
import GameOverScreen from '@/components/GameOverScreen';
import LoadingScreen from '@/components/LoadingScreen';

export default function Index() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string>('Astro');
  const [draftName, setDraftName] = useState<string>('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('mb_username');
    const name = stored && stored.trim() ? stored : 'Astro';
    setUsername(name);
    setDraftName(name);
  }, []);

  const handleSaveName = useCallback(() => {
    const name = draftName.trim() || 'Astro';
    localStorage.setItem('mb_username', name);
    setUsername(name);
    setDraftName(name);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [draftName]);

  const handleStart = useCallback((role: Role) => {
    setLoading(true);
    setTimeout(() => {
      setGameState(createGame(role, username));
      setLoading(false);
    }, 2500);
  }, [username]);

  const handleRestart = useCallback(() => {
    setGameState(null);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!gameState) return (
    <>
      <div className="fixed top-3 left-3 z-[60] flex flex-col gap-2 p-3 rounded-lg bg-card/90 border border-primary/40 backdrop-blur-sm max-w-[260px]">
        <div className="font-mono text-xs text-primary">Welcome, {username}!</div>
        <div className="flex gap-2">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Enter username"
            maxLength={20}
            className="flex-1 min-w-0 px-2 py-1 rounded bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSaveName}
            className="px-3 py-1 rounded bg-primary text-primary-foreground font-mono text-xs font-bold hover:bg-primary/90"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
      <LobbyScreen onStart={handleStart} />
    </>
  );

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <GameCanvas gameState={gameState} setGameState={setGameState} onExit={handleRestart} />
      {gameState.phase === 'gameover' && (
        <GameOverScreen state={gameState} onRestart={handleRestart} />
      )}
    </div>
  );
}
