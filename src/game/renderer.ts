import { GameState, Player, PLAYER_RADIUS, TASK_RANGE } from './types';

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

  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  skyGrad.addColorStop(0, '#1a0a08');
  skyGrad.addColorStop(1, '#2d1810');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.translate(-camX, -camY);

  drawMarsSurface(ctx, state.mapWidth, state.mapHeight);
  drawTaskStations(ctx, state);

  for (const p of state.players) {
    if (!p.alive) drawDeadPlayer(ctx, p);
  }
  for (const p of state.players) {
    if (p.alive) drawPlayer(ctx, p, human);
  }

  ctx.restore();

  drawHUD(ctx, state, canvasW, canvasH);
}

function drawMarsSurface(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#3d1f14';
  ctx.fillRect(0, 0, w, h);

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

  ctx.strokeStyle = 'rgba(100, 60, 40, 0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

function drawTaskStations(ctx: CanvasRenderingContext2D, state: GameState) {
  const human = state.players[0];

  for (const station of state.taskStations) {
    const completed = station.completed;
    const nearby = !completed && Math.sqrt((human.x - station.x) ** 2 + (human.y - station.y) ** 2) < TASK_RANGE;

    // Station base
    ctx.beginPath();
    ctx.arc(station.x, station.y, 25, 0, Math.PI * 2);
    ctx.fillStyle = completed ? 'rgba(61, 186, 111, 0.3)' : 'rgba(74, 144, 217, 0.3)';
    ctx.fill();
    ctx.strokeStyle = completed ? '#3dba6f' : (nearby ? '#ffd700' : '#4a90d9');
    ctx.lineWidth = nearby ? 3 : 2;
    ctx.setLineDash(completed ? [] : [4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Icon
    ctx.fillStyle = completed ? '#3dba6f' : '#4a90d9';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    const icons: Record<string, string> = { 'Calculate': '🧮', 'Adj. Temp': '🌡️', 'Send Email': '📧', 'Scan Data': '📡' };
    ctx.fillText(completed ? '✓' : (icons[station.label] || '📋'), station.x, station.y + 5);

    // Label
    ctx.fillStyle = completed ? '#3dba6f' : '#cc8860';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(completed ? 'DONE' : station.label, station.x, station.y + 22);

    // Interaction hint
    if (nearby && human.role === 'crewmate' && human.alive && !human.frozen && !human.doingTask) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('[E] USE', station.x, station.y - 30);
    }

    // Show AI doing task
    const aiWorker = state.players.find(p => p.doingTask && p.taskStationId === station.id && !p.isHuman);
    if (aiWorker) {
      ctx.fillStyle = 'rgba(74, 144, 217, 0.5)';
      ctx.fillRect(station.x - 20, station.y + 28, 40, 5);
      ctx.fillStyle = '#4a90d9';
      ctx.fillRect(station.x - 20, station.y + 28, 40 * aiWorker.taskProgress, 5);
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, human: Player) {
  const color = p.frozen ? FROZEN_COLOR : ROLE_COLORS[p.role];

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

  // Task indicator
  if (p.doingTask) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_RADIUS + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.taskProgress);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p.x + 5, p.y - 4, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
  ctx.fill();

  ctx.fillStyle = '#ddd';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, p.x, p.y - PLAYER_RADIUS - 6);

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
  const aliveCrew = state.players.filter(p => p.alive && p.role === 'crewmate').length;
  const aliveImposters = state.players.filter(p => p.alive && p.role === 'imposter').length;

  // Top bar
  ctx.fillStyle = 'rgba(10, 5, 3, 0.85)';
  ctx.fillRect(0, 0, w, 55);
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 55); ctx.lineTo(w, 55); ctx.stroke();

  ctx.fillStyle = '#cc8860';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Role: ${human.role.toUpperCase()}`, 15, 20);
  ctx.fillText(`Crew: ${aliveCrew} | Imposters: ${aliveImposters}`, 15, 40);

  // Task progress bar
  const barW = 200;
  const barH = 14;
  const barX = w / 2 - barW / 2;
  const barY = 8;
  ctx.fillStyle = 'rgba(40, 20, 10, 0.8)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#3dba6f';
  ctx.fillRect(barX, barY, barW * (state.tasksCompleted / state.totalTasks), barH);
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`TASKS: ${state.tasksCompleted}/${state.totalTasks}`, w / 2, barY + 11);

  const time = Math.floor(state.timeElapsed / 1000);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#cc8860';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`Time: ${time}s`, w - 15, 20);

  if (!human.alive) {
    ctx.fillStyle = '#ff3333';
    ctx.fillText('☠ DEAD - Spectating', w - 15, 40);
  } else if (human.frozen) {
    ctx.fillStyle = FROZEN_COLOR;
    ctx.fillText('❄ FROZEN', w - 15, 40);
  }

  // Action hints
  if (human.alive && !human.frozen) {
    ctx.textAlign = 'center';
    if (human.role === 'imposter') {
      const ready = human.killCooldown <= 0;
      ctx.fillStyle = ready ? '#ff4444' : '#664444';
      ctx.fillText(ready ? '[SPACE] KILL' : `Kill: ${Math.ceil(human.killCooldown / 1000)}s`, w / 2, 48);
    } else if (human.role === 'protector') {
      const ready = human.freezeCooldown <= 0;
      ctx.fillStyle = ready ? FROZEN_COLOR : '#446666';
      ctx.fillText(ready ? '[SPACE] FREEZE' : `Freeze: ${Math.ceil(human.freezeCooldown / 1000)}s`, w / 2, 48);
    } else {
      ctx.fillStyle = '#888';
      ctx.fillText('[E] Do Tasks | Avoid Imposters!', w / 2, 48);
    }
  }

  // Bottom controls
  ctx.fillStyle = 'rgba(10, 5, 3, 0.7)';
  ctx.fillRect(0, h - 30, w, 30);
  ctx.fillStyle = '#886644';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WASD/Arrows: Move | SPACE: Action | E: Task', w / 2, h - 10);
}
