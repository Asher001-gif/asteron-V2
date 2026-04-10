import { Role } from '@/game/types';

interface Props {
  onStart: (role: Role) => void;
}

const roles: { role: Role; label: string; desc: string; color: string; icon: string }[] = [
  { role: 'imposter', label: 'IMPOSTER', desc: 'Kill all crewmates before tasks are done', color: '#e03030', icon: '🔪' },
  { role: 'crewmate', label: 'CREWMATE', desc: 'Complete 10 tasks to win! Press E near stations', color: '#4a90d9', icon: '🏃' },
  { role: 'protector', label: 'PROTECTOR', desc: 'Freeze imposters to protect crew (can\'t do tasks)', color: '#3dba6f', icon: '🛡️' },
];

export default function LobbyScreen({ onStart }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
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
      <div className="relative text-center space-y-8 p-8 max-w-lg">
        <div>
          <h1 className="text-5xl font-bold font-mono tracking-widest text-primary mb-2">
            MARS BETRAYAL
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            10 Players • 2 Imposters • 2 Protectors • 6 Crew
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-foreground font-mono text-lg">Choose your role:</p>
          {roles.map(r => (
            <button
              key={r.role}
              onClick={() => onStart(r.role)}
              className="w-full p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-card text-left"
              style={{ borderColor: r.color }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{r.icon}</span>
                <div>
                  <div className="font-mono font-bold text-lg" style={{ color: r.color }}>
                    {r.label}
                  </div>
                  <div className="text-muted-foreground font-mono text-sm">{r.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-muted-foreground font-mono text-xs">
          WASD/Arrows to move • SPACE for action
        </p>
      </div>
    </div>
  );
}
