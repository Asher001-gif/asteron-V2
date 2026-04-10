import { GameState, Player, PLAYER_RADIUS } from './types';

const ROLE_COLORS: Record<string, string> = {
  imposter: '#e03030',
  crewmate: '#4a90d9',
  protector: '#3dba6f',
};

const FROZEN_COLOR = '#40d8f0';

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasW: number,
  canvasH: number
) {
  const human = state.players[0];
  const camX = Math.max(0, Math.min(state.mapWidth - canvasW, human.x - canvasW / 2));
  const camY = Math.max(0, Math.min(state.mapHeight - canvasH, human.y - canvasH / 2));

  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Mars sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  skyGrad.addColorStop(0, '#1a0a08');
  skyGrad.addColorStop(1, '#2d1810');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.translate(-camX, -camY);

  // Mars surface
  drawMarsSurface(ctx, state.mapWidth, state.mapHeight);

  // Draw structures
  drawStructures(ctx, state.mapWidth, state.mapHeight);

  // Draw dead players
  for (const p of state.players) {
    if (!p.alive) drawDeadPlayer(ctx, p);
  }

  // Draw alive players
  for (const p of state.players) {
    if (p.alive) drawPlayer(ctx, p, human);
  }

  ctx.restore();

  // HUD
  drawHUD(ctx, state, canvasW, canvasH);
}

function drawMarsSurface(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#3d1f14';
  ctx.fillRect(0, 0, w, h);

  // Craters
  const craters = [
    { x: 200, y: 300, r: 60 }, { x: 600, y: 150, r: 40 },
    { x: 1000, y: 400, r: 80 }, { x: 400, y: 800, r: 50 },
    { x: 1200, y: 700, r: 70 }, { x: 800, y: 900, r: 45 },
    { x: 300, y: 600, r: 35 }, { x: 1400, y: 300, r: 55 },
    { x: 900, y: 200, r: 30 }, { x: 1100, y: 1000, r: 65 },
  ];
  for (const c of craters) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1510';
    ctx.fill();
    ctx.strokeStyle = '#4a2820';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Grid lines (habitat floor)
  ctx.strokeStyle = 'rgba(100, 60, 40, 0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

function drawStructures(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const structures = [
    { x: 400, y: 300, w: 120, h: 80, label: 'O2 Lab' },
    { x: 800, y: 500, w: 150, h: 100, label: 'Command' },
    { x: 1200, y: 200, w: 100, h: 100, label: 'Reactor' },
    { x: 600, y: 800, w: 130, h: 90, label: 'Med Bay' },
    { x: 1100, y: 900, w: 110, h: 80, label: 'Storage' },
    { x: 200, y: 700, w: 100, h: 100, label: 'Comms' },
  ];

  for (const s of structures) {
    ctx.fillStyle = 'rgba(60, 30, 20, 0.8)';
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeRect(s.x, s.y, s.w, s.h);

    // Glow
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#cc8860';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.label, s.x + s.w / 2, s.y + s.h / 2 + 4);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, human: Player) {
  const color = p.frozen ? FROZEN_COLOR : ROLE_COLORS[p.role];

  // Frozen effect
  if (p.frozen) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_RADIUS + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(64, 216, 240, 0.2)';
    ctx.fill();
    ctx.strokeStyle = FROZEN_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Body (spacesuit shape)
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Visor
  ctx.beginPath();
  ctx.arc(p.x + 5, p.y - 4, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
  ctx.fill();

  // Name
  ctx.fillStyle = '#ddd';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, p.x, p.y - PLAYER_RADIUS - 6);

  // Role indicator for human
  if (p.isHuman) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('▼ YOU', p.x, p.y - PLAYER_RADIUS - 18);
  }
}

function drawDeadPlayer(ctx: CanvasRenderingContext2D, p: Player) {
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 5, PLAYER_RADIUS, PLAYER_RADIUS * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(120, 30, 30, 0.6)';
  ctx.fill();

  ctx.fillStyle = '#ff4444';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('☠', p.x, p.y + 8);
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  const human = state.players[0];
  const alive = state.players.filter(p => p.alive);
  const aliveCrew = alive.filter(p => p.role !== 'imposter').length;
  const aliveImposters = alive.filter(p => p.role === 'imposter').length;

  // Top bar
  ctx.fillStyle = 'rgba(10, 5, 3, 0.85)';
  ctx.fillRect(0, 0, w, 50);
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(w, 50); ctx.stroke();

  ctx.fillStyle = '#cc8860';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Role: ${human.role.toUpperCase()}`, 15, 22);
  ctx.fillText(`Crew: ${aliveCrew} | Imposters: ${aliveImposters}`, 15, 40);

  const time = Math.floor(state.timeElapsed / 1000);
  ctx.textAlign = 'right';
  ctx.fillText(`Time: ${time}s`, w - 15, 22);

  if (!human.alive) {
    ctx.fillStyle = '#ff3333';
    ctx.fillText('☠ DEAD - Spectating', w - 15, 40);
  } else if (human.frozen) {
    ctx.fillStyle = FROZEN_COLOR;
    ctx.fillText('❄ FROZEN', w - 15, 40);
  }

  // Action button hint
  if (human.alive && !human.frozen) {
    ctx.textAlign = 'center';
    if (human.role === 'imposter') {
      const ready = human.killCooldown <= 0;
      ctx.fillStyle = ready ? '#ff4444' : '#664444';
      ctx.fillText(ready ? '[SPACE] KILL' : `Kill: ${Math.ceil(human.killCooldown / 1000)}s`, w / 2, 35);
    } else if (human.role === 'protector') {
      const ready = human.freezeCooldown <= 0;
      ctx.fillStyle = ready ? FROZEN_COLOR : '#446666';
      ctx.fillText(ready ? '[SPACE] FREEZE' : `Freeze: ${Math.ceil(human.freezeCooldown / 1000)}s`, w / 2, 35);
    } else {
      ctx.fillStyle = '#888';
      ctx.fillText('RUN! Stay alive!', w / 2, 35);
    }
  }

  // Controls
  ctx.fillStyle = 'rgba(10, 5, 3, 0.7)';
  ctx.fillRect(0, h - 30, w, 30);
  ctx.fillStyle = '#886644';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WASD/Arrows: Move | SPACE: Action', w / 2, h - 10);
}
