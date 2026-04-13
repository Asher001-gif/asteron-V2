import { GameState, Player, PLAYER_RADIUS, TASK_RANGE } from './types';
import { ROOM_WALLS, OBSTACLES, ROOMS } from './collision';

const FROZEN_COLOR = '#40d8f0';

// Vision radii per role
const VISION_RADIUS: Record<string, number> = {
  crewmate: 220,
  protector: 170,
  imposter: 120,
};

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

  // Fill entire canvas black first (fog base)
  ctx.fillStyle = '#000';
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

  // Draw fog of war overlay
  const visionR = VISION_RADIUS[human.role] || 270;
  const screenX = human.x - camX;
  const screenY = human.y - camY;

  // Create radial gradient mask: clear center -> dark edges
  const fogGrad = ctx.createRadialGradient(screenX, screenY, visionR * 0.5, screenX, screenY, visionR);
  fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fogGrad.addColorStop(0.7, 'rgba(0,0,0,0.3)');
  fogGrad.addColorStop(1, 'rgba(0,0,0,0.92)');

  ctx.save();
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Hard fog outside vision radius
  ctx.beginPath();
  ctx.rect(0, 0, canvasW, canvasH);
  ctx.arc(screenX, screenY, visionR, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fill();
  ctx.restore();

  drawHUD(ctx, state, canvasW, canvasH);
}

/* ==================== MAP DRAWING ==================== */

function drawMarsSurface(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Mars soil background
  const grad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w);
  grad.addColorStop(0, '#c4622a');
  grad.addColorStop(0.5, '#a0451e');
  grad.addColorStop(1, '#7a3015');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle terrain texture dots
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  const seed = 42;
  for (let i = 0; i < 300; i++) {
    const rx = ((seed * (i + 1) * 7919) % w);
    const ry = ((seed * (i + 1) * 6271) % h);
    const rr = ((seed * (i + 1) * 3571) % 8) + 2;
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw rooms
  for (const room of ROOMS) {
    // Room floor (darker)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(room.x, room.y, room.w, room.h);

    // Floor grid lines
    ctx.strokeStyle = 'rgba(80,80,80,0.3)';
    ctx.lineWidth = 1;
    for (let gx = room.x + 40; gx < room.x + room.w; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, room.y);
      ctx.lineTo(gx, room.y + room.h);
      ctx.stroke();
    }
    for (let gy = room.y + 40; gy < room.y + room.h; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(room.x, gy);
      ctx.lineTo(room.x + room.w, gy);
      ctx.stroke();
    }

    // Room label
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(room.label, room.x + room.w / 2, room.y + room.h / 2 + 10);

    // Room-specific decorations
    if (room.label === 'RESEARCH') drawResearchDecor(ctx, room);
    else if (room.label === 'ECOSYSTEM') drawEcosystemDecor(ctx, room);
    else if (room.label === 'RECOVER') drawRecoverDecor(ctx, room);
  }

  // Draw walls (thick black)
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  for (const wall of ROOM_WALLS) {
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();
  }

  // Door indicators (small green markers)
  ctx.fillStyle = '#3dba6f';
  // Research door (bottom center)
  ctx.fillRect(775, 336, 50, 8);
  // Ecosystem door (right center)
  ctx.fillRect(386, 600, 8, 50);
  // Recover door (left center)
  ctx.fillRect(1206, 600, 8, 50);

  // Draw rock obstacles
  for (const obs of OBSTACLES) {
    // Rock shadow
    ctx.beginPath();
    ctx.ellipse(obs.x + 3, obs.y + 5, obs.r, obs.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Rock body
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
    const rockGrad = ctx.createRadialGradient(obs.x - obs.r * 0.3, obs.y - obs.r * 0.3, 2, obs.x, obs.y, obs.r);
    rockGrad.addColorStop(0, '#8a7060');
    rockGrad.addColorStop(1, '#4a3525');
    ctx.fillStyle = rockGrad;
    ctx.fill();
    ctx.strokeStyle = '#3a2515';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rock highlight
    ctx.beginPath();
    ctx.arc(obs.x - obs.r * 0.25, obs.y - obs.r * 0.25, obs.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
  }

  // Small decorative craters
  const craters = [
    { x: 450, y: 420, r: 18 },
    { x: 1000, y: 850, r: 22 },
    { x: 300, y: 1050, r: 15 },
    { x: 1350, y: 1050, r: 20 },
    { x: 750, y: 1100, r: 12 },
  ];
  for (const c of craters) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Rim highlight
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r + 2, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.strokeStyle = 'rgba(255,200,150,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Map border
  ctx.strokeStyle = '#3a1a0a';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, w, h);
}

/* ==================== TASK STATIONS ==================== */

function drawTaskStations(ctx: CanvasRenderingContext2D, state: GameState) {
  const human = state.players[0];

  for (const station of state.taskStations) {
    const completed = station.completed;
    const nearby = !completed && Math.sqrt((human.x - station.x) ** 2 + (human.y - station.y) ** 2) < TASK_RANGE;

    ctx.beginPath();
    ctx.arc(station.x, station.y, 25, 0, Math.PI * 2);
    ctx.fillStyle = completed ? 'rgba(61, 186, 111, 0.3)' : 'rgba(74, 144, 217, 0.3)';
    ctx.fill();
    ctx.strokeStyle = completed ? '#3dba6f' : (nearby ? '#ffd700' : '#4a90d9');
    ctx.lineWidth = nearby ? 3 : 2;
    ctx.setLineDash(completed ? [] : [4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = completed ? '#3dba6f' : '#4a90d9';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    const icons: Record<string, string> = { 'Calculate': '🧮', 'Adj. Temp': '🌡️', 'Send Email': '📧', 'Scan Data': '📡' };
    ctx.fillText(completed ? '✓' : (icons[station.label] || '📋'), station.x, station.y + 5);

    ctx.fillStyle = completed ? '#3dba6f' : '#cc8860';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(completed ? 'DONE' : station.label, station.x, station.y + 22);

    if (nearby && human.role === 'crewmate' && human.alive && !human.frozen && !human.doingTask) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('[E] USE', station.x, station.y - 30);
    }

    const aiWorker = state.players.find(p => p.doingTask && p.taskStationId === station.id && !p.isHuman);
    if (aiWorker) {
      ctx.fillStyle = 'rgba(74, 144, 217, 0.5)';
      ctx.fillRect(station.x - 20, station.y + 28, 40, 5);
      ctx.fillStyle = '#4a90d9';
      ctx.fillRect(station.x - 20, station.y + 28, 40 * aiWorker.taskProgress, 5);
    }
  }
}

/* ==================== PLAYER DRAWING ==================== */

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, human: Player) {
  const x = p.x;
  const y = p.y;
  const s = 1.0;

  if (p.frozen) {
    ctx.beginPath();
    ctx.arc(x, y, 28 * s, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(64, 216, 240, 0.2)';
    ctx.fill();
    ctx.strokeStyle = FROZEN_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (p.doingTask) {
    ctx.beginPath();
    ctx.arc(x, y - 5 * s, 26 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.taskProgress);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (p.role === 'imposter') {
    drawImposterChar(ctx, x, y, s, p.frozen);
  } else if (p.role === 'protector') {
    drawProtectorChar(ctx, x, y, s, p.frozen);
  } else {
    drawCrewmateChar(ctx, x, y, s, p.frozen);
  }

  ctx.fillStyle = '#ddd';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, x, y - 32 * s);

  if (p.isHuman) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('▼ YOU', x, y - 40 * s);
  }
}

function drawCrewmateChar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frozen: boolean) {
  const bodyColor = frozen ? FROZEN_COLOR : '#e8e8e8';
  const accentColor = frozen ? '#80e8f8' : '#4a90d9';

  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 16 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y - 12 * s, 14 * s, Math.PI, 0);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a2a3a';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 5 * s, y - 9 * s);
  ctx.lineTo(x - 3 * s, y - 12 * s);
  ctx.lineTo(x - 1 * s, y - 9 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 1 * s, y - 9 * s);
  ctx.lineTo(x + 3 * s, y - 12 * s);
  ctx.lineTo(x + 5 * s, y - 9 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y + 8 * s);
  ctx.lineTo(x - 14 * s, y + 18 * s);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - 14 * s, y + 20 * s, 4 * s, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 14 * s, y + 20 * s, 6 * s, 0, Math.PI * 2);
  ctx.fillStyle = frozen ? 'rgba(64,216,240,0.3)' : 'rgba(74,144,217,0.3)';
  ctx.fill();
}

function drawImposterChar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frozen: boolean) {
  const bodyColor = frozen ? FROZEN_COLOR : '#888';
  const accentColor = frozen ? '#80e8f8' : '#e03030';

  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 17 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y - 12 * s, 14 * s, Math.PI, 0);
  ctx.fillStyle = frozen ? FROZEN_COLOR : '#666';
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y - 12 * s);
  ctx.lineTo(x - 2 * s, y - 8 * s);
  ctx.moveTo(x - 2 * s, y - 12 * s);
  ctx.lineTo(x - 6 * s, y - 8 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 2 * s, y - 12 * s);
  ctx.lineTo(x + 6 * s, y - 8 * s);
  ctx.moveTo(x + 6 * s, y - 12 * s);
  ctx.lineTo(x + 2 * s, y - 8 * s);
  ctx.stroke();

  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 16 * s, y - 2 * s);
  ctx.lineTo(x - 22 * s, y - 10 * s);
  ctx.lineTo(x - 20 * s, y - 14 * s);
  ctx.stroke();
  ctx.fillStyle = '#888';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 16 * s, y - 2 * s);
  ctx.lineTo(x + 22 * s, y - 10 * s);
  ctx.lineTo(x + 20 * s, y - 14 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + 10 * s);
  ctx.lineTo(x, y + 20 * s);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y + 22 * s, 4 * s, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + 22 * s, 6 * s, 0, Math.PI * 2);
  ctx.fillStyle = frozen ? 'rgba(64,216,240,0.3)' : 'rgba(224,48,48,0.3)';
  ctx.fill();
}

function drawProtectorChar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frozen: boolean) {
  const bodyColor = frozen ? FROZEN_COLOR : '#e8e8e8';
  const accentColor = frozen ? '#80e8f8' : '#3dba6f';

  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 16 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y - 12 * s, 14 * s, Math.PI, 0);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0a2a1a';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(x - 5 * s, y - 10 * s);
  ctx.lineTo(x - 3 * s, y - 13 * s);
  ctx.lineTo(x - 1 * s, y - 10 * s);
  ctx.lineTo(x - 3 * s, y - 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 1 * s, y - 10 * s);
  ctx.lineTo(x + 3 * s, y - 13 * s);
  ctx.lineTo(x + 5 * s, y - 10 * s);
  ctx.lineTo(x + 3 * s, y - 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(61,186,111,0.15)';
  ctx.fill();

  ctx.fillStyle = '#555';
  ctx.fillRect(x + 14 * s, y - 6 * s, 6 * s, 10 * s);
  ctx.fillStyle = accentColor;
  ctx.fillRect(x + 15 * s, y - 4 * s, 4 * s, 3 * s);
  ctx.fillRect(x + 15 * s, y + 1 * s, 4 * s, 2 * s);

  ctx.beginPath();
  ctx.moveTo(x + 6 * s, y + 10 * s);
  ctx.lineTo(x + 10 * s, y + 20 * s);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 10 * s, y + 22 * s, 4 * s, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10 * s, y + 22 * s, 6 * s, 0, Math.PI * 2);
  ctx.fillStyle = frozen ? 'rgba(64,216,240,0.3)' : 'rgba(61,186,111,0.3)';
  ctx.fill();
}

function drawDeadPlayer(ctx: CanvasRenderingContext2D, p: Player) {
  const x = p.x;
  const y = p.y;
  const s = 1.0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  ctx.globalAlpha = 0.5;

  ctx.beginPath();
  ctx.ellipse(0, 0, 16 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-6 * s, 0, 7 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.strokeStyle = '#e03030';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8 * s, -2 * s);
  ctx.lineTo(-4 * s, 2 * s);
  ctx.moveTo(-6 * s, -3 * s);
  ctx.lineTo(-3 * s, 0);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.fillStyle = '#ff4444';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('☠', x, y - 18 * s);
}

/* ==================== HUD ==================== */

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  const human = state.players[0];
  const aliveCrew = state.players.filter(p => p.alive && p.role === 'crewmate').length;
  const aliveImposters = state.players.filter(p => p.alive && p.role === 'imposter').length;

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

  ctx.fillStyle = 'rgba(10, 5, 3, 0.7)';
  ctx.fillRect(0, h - 30, w, 30);
  ctx.fillStyle = '#886644';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WASD/Arrows: Move | SPACE: Action | E: Task', w / 2, h - 10);
}
