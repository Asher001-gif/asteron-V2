import { useState, useEffect, useRef } from 'react';
import { TaskChallenge } from '@/game/types';

interface Props {
  task: TaskChallenge;
  onComplete: () => void;
  onCancel: () => void;
}

export default function TaskOverlay({ task, onComplete, onCancel }: Props) {
  const [input, setInput] = useState('');
  const [sliderVal, setSliderVal] = useState(20);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus
  useEffect(() => {
    if (task.type === 'math') inputRef.current?.focus();
    if (task.type === 'email') textRef.current?.focus();
  }, [task.type]);

  // Scan auto-progress
  useEffect(() => {
    if (task.type !== 'scan') return;
    const duration = task.duration || 4500;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      setScanProgress(p);
      if (p >= 1) {
        clearInterval(interval);
        setTimeout(onComplete, 300);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [task, onComplete]);

  const handleMathSubmit = () => {
    if (input.trim() === task.answer) {
      onComplete();
    } else {
      setError('Wrong! Try again.');
      setInput('');
    }
  };

  const handleTempSubmit = () => {
    if (sliderVal === task.targetTemp) {
      onComplete();
    } else {
      setError(`Not quite! Target is ${task.targetTemp}°C`);
    }
  };

  const handleEmailSubmit = () => {
    if (input.trim().length >= 10) {
      onComplete();
    } else {
      setError('Write at least 10 characters');
    }
  };

  // Stop keyboard events from reaching game
  const stopProp = (e: React.KeyboardEvent) => e.stopPropagation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onKeyDown={stopProp} onKeyUp={stopProp}>
      <div className="bg-card border-2 border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-mono font-bold text-lg text-foreground">
            {task.type === 'math' && '🧮 CALCULATE'}
            {task.type === 'temperature' && '🌡️ ADJUST TEMP'}
            {task.type === 'email' && '📧 SEND EMAIL'}
            {task.type === 'scan' && '📡 SCAN DATA'}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground font-mono text-sm">
            ✕ ESC
          </button>
        </div>

        {task.type === 'math' && (
          <div className="space-y-3">
            <p className="font-mono text-xl text-center text-foreground">{task.prompt}</p>
            <input
              ref={inputRef}
              type="number"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleMathSubmit(); if (e.key === 'Escape') onCancel(); }}
              onKeyUp={e => e.stopPropagation()}
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-center font-mono text-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="?"
            />
            <button onClick={handleMathSubmit}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-mono font-bold hover:opacity-90">
              SUBMIT
            </button>
          </div>
        )}

        {task.type === 'temperature' && (
          <div className="space-y-3">
            <p className="font-mono text-center text-foreground">{task.prompt}</p>
            <div className="text-center font-mono text-4xl text-foreground">{sliderVal}°C</div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => { setSliderVal(v => Math.max(10, v - 1)); setError(''); }}
                onKeyDown={e => e.stopPropagation()}
                onKeyUp={e => e.stopPropagation()}
                className="w-14 h-14 rounded-lg bg-muted border border-border text-2xl font-mono font-bold text-foreground hover:bg-accent active:scale-95 transition-all"
              >
                ▼
              </button>
              <div className="font-mono text-sm text-muted-foreground w-20 text-center">
                {sliderVal < (task.targetTemp || 0) ? '↑ Too low' : sliderVal > (task.targetTemp || 0) ? '↓ Too high' : '✓ Perfect!'}
              </div>
              <button
                onClick={() => { setSliderVal(v => Math.min(50, v + 1)); setError(''); }}
                onKeyDown={e => e.stopPropagation()}
                onKeyUp={e => e.stopPropagation()}
                className="w-14 h-14 rounded-lg bg-muted border border-border text-2xl font-mono font-bold text-foreground hover:bg-accent active:scale-95 transition-all"
              >
                ▲
              </button>
            </div>
            <button onClick={handleTempSubmit}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-mono font-bold hover:opacity-90">
              CONFIRM
            </button>
          </div>
        )}

        {task.type === 'email' && (
          <div className="space-y-3">
            <p className="font-mono text-sm text-foreground">{task.prompt}</p>
            <p className="font-mono text-primary font-bold text-center">"{task.topic}"</p>
            <textarea
              ref={textRef}
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') onCancel(); }}
              onKeyUp={e => e.stopPropagation()}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
              placeholder="Type your email..."
            />
            <button onClick={handleEmailSubmit}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-mono font-bold hover:opacity-90">
              SEND
            </button>
          </div>
        )}

        {task.type === 'scan' && (
          <div className="space-y-3">
            <p className="font-mono text-center text-foreground">{task.prompt}</p>
            <div className="w-full h-6 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all duration-100 rounded-full"
                style={{ width: `${scanProgress * 100}%` }} />
            </div>
            <p className="font-mono text-center text-sm text-muted-foreground">
              {scanProgress < 1 ? `${Math.floor(scanProgress * 100)}% complete...` : '✓ Scan complete!'}
            </p>
            <p className="font-mono text-xs text-center text-muted-foreground">Stay near the station!</p>
          </div>
        )}

        {error && <p className="font-mono text-sm text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
}
