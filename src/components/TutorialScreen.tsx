interface Props {
  onBack: () => void;
}

export default function TutorialScreen({ onBack }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="relative max-w-lg w-full mx-4 p-8 rounded-xl border border-border bg-card shadow-2xl space-y-6">
        <h2 className="text-3xl font-bold font-mono tracking-wider text-primary text-center">
          HOW TO PLAY
        </h2>

        <div className="space-y-4 text-sm font-mono text-muted-foreground">
          <div>
            <h3 className="text-foreground font-bold mb-1">Roles</h3>
            <p><span className="text-blue-400 font-bold">Crewmate</span> – Complete tasks and avoid the traitor. Win by finishing all tasks.</p>
            <p><span className="text-red-400 font-bold">Traitor</span> – Eliminate crewmates without getting caught. Win when no crewmates remain.</p>
            <p><span className="text-yellow-400 font-bold">Protector</span> – Patrol the map and arrest suspicious players. Win with the crew.</p>
          </div>

          <div>
            <h3 className="text-foreground font-bold mb-1">Controls</h3>
            <p>WASD / Arrow Keys – Move</p>
            <p>SPACE / E – Action (task, kill, arrest, open/close doors)</p>
            <p>Mobile – Joystick + action button</p>
          </div>

          <div>
            <h3 className="text-foreground font-bold mb-1">Tips</h3>
            <p>• Stay alert – bots patrol rooms and may arrest or kill.</p>
            <p>• Use doors to block pursuers or hide.</p>
            <p>• Protectors can jail players they suspect.</p>
            <p>• Tasks are shared – every completed task helps the crew win.</p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-mono font-bold text-lg hover:opacity-90 transition-opacity"
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
