import { GameState, Player, PLAYER_RADIUS, TASK_RANGE } from './types';
import { ROOM_WALLS, ROVER_OBSTACLE } from './collision';

const ROLE_COLORS: Record<string, string> = {
  imposter: '#e03030',
  crewmate: '#4a90d9',
  protector: '#3dba6f',
};

const FROZEN_COLOR = '#40d8f0';

// Preload map image
let mapImage: HTMLImageElement | null = null;
let mapLoaded = false;
const img = new Image();
img.onload = () => { mapImage = img; mapLoaded = true; };
img.src = '/images/mars-map.jpg';

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
  // Draw the map image as background
  if (mapLoaded && mapImage) {
    ctx.drawImage(mapImage, 0, 0, w, h);
  } else {
    // Fallback while loading
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, w, h);
  }

  // Debug: draw wall outlines (subtle)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.0)';
  ctx.lineWidth = 2;
  for (const wall of ROOM_WALLS) {
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();
  }

  // Rover obstacle zone
  ctx.beginPath();
  ctx.arc(ROVER_OBSTACLE.x, ROVER_OBSTACLE.y, ROVER_OBSTACLE.r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.0)';
  ctx.lineWidth = 2;
  ctx.stroke();
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
  const x = p.x;
  const y = p.y;
  const s = 1.4; // scale

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

  // Name
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

  // Body (egg shape)
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 16 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Helmet dome
  ctx.beginPath();
  ctx.arc(x, y - 12 * s, 14 * s, Math.PI, 0);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Visor (dark area)
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a2a3a';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eyes (^^ happy)
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  // Left eye ^
  ctx.beginPath();
  ctx.moveTo(x - 5 * s, y - 9 * s);
  ctx.lineTo(x - 3 * s, y - 12 * s);
  ctx.lineTo(x - 1 * s, y - 9 * s);
  ctx.stroke();
  // Right eye ^
  ctx.beginPath();
  ctx.moveTo(x + 1 * s, y - 9 * s);
  ctx.lineTo(x + 3 * s, y - 12 * s);
  ctx.lineTo(x + 5 * s, y - 9 * s);
  ctx.stroke();

  // Antenna with blue orb
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
  // Glow
  ctx.beginPath();
  ctx.arc(x - 14 * s, y + 20 * s, 6 * s, 0, Math.PI * 2);
  ctx.fillStyle = frozen ? 'rgba(64,216,240,0.3)' : 'rgba(74,144,217,0.3)';
  ctx.fill();
}

function drawImposterChar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frozen: boolean) {
  const bodyColor = frozen ? FROZEN_COLOR : '#888';
  const accentColor = frozen ? '#80e8f8' : '#e03030';

  // Body (slightly wider, menacing)
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 17 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Helmet dome
  ctx.beginPath();
  ctx.arc(x, y - 12 * s, 14 * s, Math.PI, 0);
  ctx.fillStyle = frozen ? FROZEN_COLOR : '#666';
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Visor
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Angry eyes (XX / angry brows)
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;
  // Left X
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y - 12 * s);
  ctx.lineTo(x - 2 * s, y - 8 * s);
  ctx.moveTo(x - 2 * s, y - 12 * s);
  ctx.lineTo(x - 6 * s, y - 8 * s);
  ctx.stroke();
  // Right X
  ctx.beginPath();
  ctx.moveTo(x + 2 * s, y - 12 * s);
  ctx.lineTo(x + 6 * s, y - 8 * s);
  ctx.moveTo(x + 6 * s, y - 12 * s);
  ctx.lineTo(x + 2 * s, y - 8 * s);
  ctx.stroke();

  // Knife arms
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  // Left arm/blade
  ctx.beginPath();
  ctx.moveTo(x - 16 * s, y - 2 * s);
  ctx.lineTo(x - 22 * s, y - 10 * s);
  ctx.lineTo(x - 20 * s, y - 14 * s);
  ctx.stroke();
  ctx.fillStyle = '#888';
  ctx.fill();
  // Right arm/blade
  ctx.beginPath();
  ctx.moveTo(x + 16 * s, y - 2 * s);
  ctx.lineTo(x + 22 * s, y - 10 * s);
  ctx.lineTo(x + 20 * s, y - 14 * s);
  ctx.stroke();

  // Red orb
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

  // Body
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 16 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Helmet dome
  ctx.beginPath();
  ctx.arc(x, y - 12 * s, 14 * s, Math.PI, 0);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Visor
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0a2a1a';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Glowing green eyes (diamond/determined)
  ctx.fillStyle = accentColor;
  // Left eye
  ctx.beginPath();
  ctx.moveTo(x - 5 * s, y - 10 * s);
  ctx.lineTo(x - 3 * s, y - 13 * s);
  ctx.lineTo(x - 1 * s, y - 10 * s);
  ctx.lineTo(x - 3 * s, y - 7 * s);
  ctx.closePath();
  ctx.fill();
  // Right eye
  ctx.beginPath();
  ctx.moveTo(x + 1 * s, y - 10 * s);
  ctx.lineTo(x + 3 * s, y - 13 * s);
  ctx.lineTo(x + 5 * s, y - 10 * s);
  ctx.lineTo(x + 3 * s, y - 7 * s);
  ctx.closePath();
  ctx.fill();
  // Eye glow
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(61,186,111,0.15)';
  ctx.fill();

  // Shield device on side
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 14 * s, y - 6 * s, 6 * s, 10 * s);
  ctx.fillStyle = accentColor;
  ctx.fillRect(x + 15 * s, y - 4 * s, 4 * s, 3 * s);
  ctx.fillRect(x + 15 * s, y + 1 * s, 4 * s, 2 * s);

  // Green orb antenna
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
  const s = 1.4;

  // Fallen body
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  ctx.globalAlpha = 0.5;

  // Collapsed body shape
  ctx.beginPath();
  ctx.ellipse(0, 0, 16 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cracked visor
  ctx.beginPath();
  ctx.ellipse(- 6 * s, 0, 7 * s, 5 * s, 0, 0, Math.PI * 2);
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

  // Skull marker
  ctx.fillStyle = '#ff4444';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('☠', x, y - 18 * s);
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
