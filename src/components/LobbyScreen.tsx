interface Props {
  onEnter: () => void;
  onTutorial: () => void;
}

export default function LobbyScreen({ onEnter, onTutorial }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background overflow-y-auto py-8">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/20"
            style={{
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative text-center space-y-6 p-8 max-w-lg flex flex-col items-center mt-auto mb-auto">
        <div>
          <h1 className="text-5xl font-bold font-mono tracking-widest text-primary mb-2">
            ASTERON
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            Customizable rules & roles • Up to 12 players
          </p>
        </div>

        <p className="text-muted-foreground font-mono text-xs">
          WASD/Arrows to move • SPACE: action (task / kill / arrest) • Mobile: joystick + button
        </p>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={onTutorial}
            className="px-5 py-2 rounded-lg border-2 border-primary text-primary font-mono font-bold hover:bg-primary/10 transition-colors"
          >
            Tutorial
          </button>
          <a
            href="https://forms.gle/CLdBLKCmYo3h9EQX7"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 rounded-lg border-2 border-primary text-primary font-mono font-bold hover:bg-primary/10 transition-colors"
          >
            Suggestion
          </a>
        </div>
      </div>

      <div className="relative mb-6">
        <button
          onClick={onEnter}
          aria-label="Enter game"
          className="px-12 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold tracking-[0.4em] text-2xl shadow-xl shadow-blue-900/40 border border-blue-400 transition-transform hover:scale-105 active:scale-95"
        >
          ENTER
        </button>
      </div>
    </div>
  );
}
