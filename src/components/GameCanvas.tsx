import { useRef, useEffect, useCallback, useState } from 'react';
import { GameState } from '@/game/types';
import { updateGame, humanKill, humanFreeze, getNearbyTask } from '@/game/engine';
import { generateTaskChallenge } from '@/game/tasks';
import { renderGame } from '@/game/renderer';
import TaskOverlay from './TaskOverlay';

interface Props {
  gameState: GameState;
  setGameState: (s: GameState) => void;
}

export default function GameCanvas({ gameState, setGameState }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef(new Set<string>());
  const stateRef = useRef(gameState);
  const animRef = useRef(0);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [showTask, setShowTask] = useState(false);

  stateRef.current = gameState;

  useEffect(() => {
    const resize = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleKey = useCallback((e: KeyboardEvent, down: boolean) => {
    // Don't handle game keys when task overlay is open
    if (showTask) return;

    const key = e.key.toLowerCase();
    if (down) {
      keysRef.current.add(key);
      if (key === ' ' || key === 'space') {
        e.preventDefault();
        const now = performance.now();
        const s = stateRef.current;
        if (s.players[0].role === 'imposter') humanKill(s, now);
        else if (s.players[0].role === 'protector') humanFreeze(s, now);
      }
      if (key === 'e') {
        e.preventDefault();
        const s = stateRef.current;
        const taskId = getNearbyTask(s);
        if (taskId !== null) {
          const station = s.taskStations.find(t => t.id === taskId);
          if (station) {
            const challenge = generateTaskChallenge(station);
            s.activeTask = challenge;
            s.players[0].doingTask = true;
            s.players[0].taskStationId = taskId;
            setShowTask(true);
            setGameState({ ...s });
          }
        }
      }
    } else {
      keysRef.current.delete(key);
    }
  }, [showTask, setGameState]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => handleKey(e, true);
    const ku = (e: KeyboardEvent) => handleKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [handleKey]);

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(time - lastTime, 50);
      lastTime = time;

      if (stateRef.current.phase === 'playing') {
        const newState = updateGame(stateRef.current, dt, keysRef.current, time);
        stateRef.current = newState;
        setGameState(newState);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) renderGame(ctx, stateRef.current, size.w, size.h);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [size, setGameState]);

  const handleTaskComplete = useCallback(() => {
    const s = stateRef.current;
    if (s.activeTask) {
      const station = s.taskStations.find(t => t.id === s.activeTask!.stationId);
      if (station && !station.completed) {
        station.completed = true;
        s.tasksCompleted++;
      }
    }
    s.players[0].doingTask = false;
    s.players[0].taskStationId = null;
    s.activeTask = null;
    setShowTask(false);
    setGameState({ ...s });
  }, [setGameState]);

  const handleTaskCancel = useCallback(() => {
    const s = stateRef.current;
    s.players[0].doingTask = false;
    s.players[0].taskStationId = null;
    s.activeTask = null;
    setShowTask(false);
    setGameState({ ...s });
  }, [setGameState]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        className="block"
        style={{ cursor: 'none' }}
      />
      {showTask && gameState.activeTask && (
        <TaskOverlay
          task={gameState.activeTask}
          onComplete={handleTaskComplete}
          onCancel={handleTaskCancel}
        />
      )}
    </>
  );
}
