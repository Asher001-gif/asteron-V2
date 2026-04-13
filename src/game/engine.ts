import {
  Player, GameState, Role,
  PLAYER_RADIUS, KILL_RANGE, FREEZE_RANGE, FREEZE_DURATION,
  KILL_COOLDOWN, FREEZE_COOLDOWN, MAP_WIDTH, MAP_HEIGHT, TASK_RANGE, TOTAL_TASKS
} from './types';
import { createTaskStations } from './tasks';
import { resolveCollisions } from './collision';
import { getNavigationDirection, getRoomAt } from './navigation';

const NAMES = ['Astro', 'Nova', 'Blaze', 'Comet', 'Orbit', 'Dust', 'Nebula', 'Crater', 'Titan', 'Cosmo'];

// Vision radii - bots can only see within these
const BOT_VISION: Record<Role, number> = {
  crewmate: 220,
  protector: 170,
  imposter: 120,
};

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Patrol waypoints spread across the map
const PATROL_POINTS = [
  { x: 800, y: 200 },   // near research
  { x: 200, y: 625 },   // near ecosystem
  { x: 1400, y: 625 },  // near recover
  { x: 800, y: 900 },   // bottom center
  { x: 400, y: 300 },   // top left
  { x: 1200, y: 300 },  // top right
  { x: 400, y: 1000 },  // bottom left
  { x: 1200, y: 1000 }, // bottom right
];

export function createGame(playerRole: Role): GameState {
  const roles: Role[] = ['imposter', 'imposter', 'protector', 'protector',
    'crewmate', 'crewmate', 'crewmate', 'crewmate', 'crewmate', 'crewmate'];
  
  const roleIdx = roles.indexOf(playerRole);
  [roles[0], roles[roleIdx]] = [roles[roleIdx], roles[0]];
  
  for (let i = roles.length - 1; i > 1; i--) {
    const j = 1 + Math.floor(Math.random() * i);
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  const players: Player[] = roles.map((role, i) => ({
    id: i,
    x: 200 + Math.random() * (MAP_WIDTH - 400),
    y: 200 + Math.random() * (MAP_HEIGHT - 400),
    role,
    alive: true,
    frozen: false,
    frozenUntil: 0,
    name: NAMES[i],
    isHuman: i === 0,
    speed: role === 'imposter' ? 2.4 : 2.2,
    direction: { x: 0, y: 0 },
    aiTargetX: MAP_WIDTH / 2,
    aiTargetY: MAP_HEIGHT / 2,
    aiChangeTime: 0,
    killCooldown: 0,
    freezeCooldown: 0,
    doingTask: false,
    taskStationId: null,
    taskProgress: 0,
  }));

  return {
    players,
    phase: 'playing',
    winner: null,
    timeElapsed: 0,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    taskStations: createTaskStations(),
    tasksCompleted: 0,
    totalTasks: TOTAL_TASKS,
    activeTask: null,
    projectiles: [],
  };
}

// Get visible players within bot's vision radius
function getVisiblePlayers(player: Player, allPlayers: Player[]): Player[] {
  const vision = BOT_VISION[player.role];
  return allPlayers.filter(p => p.id !== player.id && p.alive && dist(player, p) <= vision);
}

function updateAI(player: Player, allPlayers: Player[], state: GameState, now: number) {
  if (!player.alive || player.frozen || player.isHuman) return;

  const visible = getVisiblePlayers(player, allPlayers);

  if (player.role === 'imposter') {
    aiImposterBehavior(player, visible, now);
  } else if (player.role === 'protector') {
    aiProtectorBehavior(player, visible, allPlayers, now);
  } else {
    aiCrewmateBehavior(player, visible, state, now);
  }
}

function aiImposterBehavior(player: Player, visible: Player[], now: number) {
  // Only react to visible players
  const visibleCrew = visible.filter(p => p.role === 'crewmate');
  const visibleProtectors = visible.filter(p => p.role === 'protector');

  // Flee from nearby protectors
  const nearbyProtector = visibleProtectors.find(p => dist(player, p) < 180);
  if (nearbyProtector && Math.random() < 0.7) {
    const dir = getNavigationDirection(player.x, player.y,
      player.x + (player.x - nearbyProtector.x),
      player.y + (player.y - nearbyProtector.y));
    player.direction = dir;
    return;
  }

  // Hunt visible crewmates
  if (visibleCrew.length > 0) {
    const nearest = visibleCrew.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b);
    player.direction = getNavigationDirection(player.x, player.y, nearest.x, nearest.y);
    return;
  }

  // No targets visible - explore
  wanderAI(player, now);
}

function aiProtectorBehavior(player: Player, visible: Player[], allPlayers: Player[], now: number) {
  const visibleCrew = visible.filter(p => p.role === 'crewmate');
  const visibleImposters = visible.filter(p => p.role === 'imposter');

  // Find the other protector to coordinate
  const otherProtector = allPlayers.find(p => p.id !== player.id && p.role === 'protector' && p.alive);

  // Check if any visible crew is in danger (imposter within 200px of them)
  const endangeredCrew = visibleCrew.filter(c =>
    visibleImposters.some(imp => dist(imp, c) < 200)
  );

  if (endangeredCrew.length > 0) {
    // Find the threatening imposter closest to endangered crew
    const threatImposter = visibleImposters
      .filter(imp => endangeredCrew.some(c => dist(imp, c) < 200))
      .reduce((a, b) => {
        const aD = Math.min(...endangeredCrew.map(c => dist(a, c)));
        const bD = Math.min(...endangeredCrew.map(c => dist(b, c)));
        return aD < bD ? a : b;
      });

    // Rush to help - move toward the threatening imposter
    player.direction = getNavigationDirection(player.x, player.y, threatImposter.x, threatImposter.y);
    return;
  }

  // No immediate danger - patrol the map
  // Each protector patrols different waypoints based on their ID
  patrolAI(player, otherProtector, now);
}

function patrolAI(player: Player, otherProtector: Player | undefined, now: number) {
  if (now > player.aiChangeTime) {
    // Pick a patrol point, prefer points far from the other protector
    let bestPoint = PATROL_POINTS[Math.floor(Math.random() * PATROL_POINTS.length)];
    
    if (otherProtector) {
      // Sort patrol points by distance from other protector (prefer far ones)
      const sorted = [...PATROL_POINTS].sort((a, b) => {
        const dA = dist(otherProtector, a);
        const dB = dist(otherProtector, b);
        return dB - dA; // farther from other protector = better
      });
      // Pick from top 3 farthest points randomly
      bestPoint = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
    }

    player.aiTargetX = bestPoint.x + (Math.random() - 0.5) * 100;
    player.aiTargetY = bestPoint.y + (Math.random() - 0.5) * 100;
    player.aiChangeTime = now + 3000 + Math.random() * 2000;
  }

  const d = dist(player, { x: player.aiTargetX, y: player.aiTargetY });
  if (d < 30) {
    // Reached waypoint, pick next one soon
    player.aiChangeTime = now + 500;
    player.direction = { x: 0, y: 0 };
    return;
  }

  player.direction = getNavigationDirection(player.x, player.y, player.aiTargetX, player.aiTargetY);
}

function aiCrewmateBehavior(player: Player, visible: Player[], state: GameState, now: number) {
  const visibleImposters = visible.filter(p => p.role === 'imposter');

  // Flee if imposter is very close
  const nearestImposter = visibleImposters.length > 0
    ? visibleImposters.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b)
    : null;

  if (nearestImposter && dist(player, nearestImposter) < 150) {
    player.doingTask = false;
    player.taskStationId = null;
    player.taskProgress = 0;
    // Flee away from imposter using navigation
    const fleeX = player.x + (player.x - nearestImposter.x);
    const fleeY = player.y + (player.y - nearestImposter.y);
    player.direction = getNavigationDirection(player.x, player.y, fleeX, fleeY);
    return;
  }

  // If doing a task, stay put
  if (player.doingTask) {
    player.direction = { x: 0, y: 0 };
    return;
  }

  // Look for nearby incomplete tasks within vision
  const vision = BOT_VISION[player.role];
  const nearbyTasks = state.taskStations.filter(t => !t.completed && dist(player, t) <= vision);

  if (nearbyTasks.length > 0) {
    // Move toward closest task
    const closest = nearbyTasks.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b);
    player.direction = getNavigationDirection(player.x, player.y, closest.x, closest.y);
    return;
  }

  // No nearby tasks - explore randomly
  wanderAI(player, now);
}

function wanderAI(player: Player, now: number) {
  if (now > player.aiChangeTime) {
    player.aiTargetX = 100 + Math.random() * (MAP_WIDTH - 200);
    player.aiTargetY = 100 + Math.random() * (MAP_HEIGHT - 200);
    player.aiChangeTime = now + 2000 + Math.random() * 3000;
  }

  const d = dist(player, { x: player.aiTargetX, y: player.aiTargetY });
  if (d < 30) {
    player.aiChangeTime = now + 500;
    player.direction = { x: 0, y: 0 };
    return;
  }

  player.direction = getNavigationDirection(player.x, player.y, player.aiTargetX, player.aiTargetY);
}

function performAIActions(player: Player, allPlayers: Player[], state: GameState, now: number) {
  if (!player.alive || player.frozen || player.isHuman) return;

  const visible = getVisiblePlayers(player, allPlayers);

  if (player.role === 'imposter' && player.killCooldown <= 0) {
    // Can only kill visible crewmates within kill range
    const targets = visible.filter(p => p.role === 'crewmate' && dist(player, p) < KILL_RANGE);
    if (targets.length > 0) {
      targets[0].alive = false;
      targets[0].doingTask = false;
      targets[0].taskStationId = null;
      player.killCooldown = KILL_COOLDOWN;
    }
  }

  if (player.role === 'protector' && player.freezeCooldown <= 0) {
    const targets = visible.filter(p => p.role === 'imposter' && !p.frozen && dist(player, p) < FREEZE_RANGE);
    if (targets.length > 0) {
      const target = targets[0];
      // Spawn projectile
      state.projectiles.push({
        x: player.x, y: player.y,
        targetX: target.x, targetY: target.y,
        speed: 6,
        startTime: now,
        duration: 300,
      });
      target.frozen = true;
      target.frozenUntil = now + FREEZE_DURATION;
      player.freezeCooldown = FREEZE_COOLDOWN;
    }
  }

  // AI crewmate task start
  if (player.role === 'crewmate' && !player.doingTask) {
    const incompleteTasks = state.taskStations.filter(t => !t.completed);
    const nearTask = incompleteTasks.find(t => dist(player, t) < TASK_RANGE);
    if (nearTask) {
      player.doingTask = true;
      player.taskStationId = nearTask.id;
      player.taskProgress = 0;
    }
  }

  // Progress AI task
  if (player.role === 'crewmate' && player.doingTask && player.taskStationId !== null) {
    player.taskProgress += 0.004;
    if (player.taskProgress >= 1) {
      const station = state.taskStations.find(t => t.id === player.taskStationId);
      if (station && !station.completed) {
        station.completed = true;
        state.tasksCompleted++;
      }
      player.doingTask = false;
      player.taskStationId = null;
      player.taskProgress = 0;
    }
  }
}

export function updateGame(state: GameState, dt: number, keys: Set<string>, now: number): GameState {
  if (state.phase !== 'playing') return state;

  const human = state.players[0];

  // Human input (skip if doing task)
  if (human.alive && !human.frozen && !human.doingTask) {
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (dx || dy) {
      const d = Math.sqrt(dx * dx + dy * dy);
      human.direction = { x: dx / d, y: dy / d };
    } else {
      human.direction = { x: 0, y: 0 };
    }
  } else if (human.doingTask) {
    human.direction = { x: 0, y: 0 };
  }

  for (const p of state.players) {
    if (!p.alive) continue;

    if (p.frozen && now >= p.frozenUntil) {
      p.frozen = false;
    }
    if (p.frozen) continue;

    if (p.killCooldown > 0) p.killCooldown -= dt;
    if (p.freezeCooldown > 0) p.freezeCooldown -= dt;

    if (!p.isHuman) {
      updateAI(p, state.players, state, now);
      performAIActions(p, state.players, state, now);
    }

    p.x += p.direction.x * p.speed;
    p.y += p.direction.y * p.speed;
    p.x = Math.max(PLAYER_RADIUS, Math.min(state.mapWidth - PLAYER_RADIUS, p.x));
    p.y = Math.max(PLAYER_RADIUS, Math.min(state.mapHeight - PLAYER_RADIUS, p.y));

    const resolved = resolveCollisions(p.x, p.y);
    p.x = resolved.x;
    p.y = resolved.y;
  }

  // Remove expired projectiles
  state.projectiles = state.projectiles.filter(p => now - p.startTime < p.duration);

  // Win: all tasks completed
  if (state.tasksCompleted >= state.totalTasks) {
    return { ...state, phase: 'gameover', winner: 'crew', timeElapsed: state.timeElapsed + dt };
  }

  // Win: all crew dead
  const aliveCrew = state.players.filter(p => p.alive && p.role === 'crewmate').length;
  if (aliveCrew === 0) {
    return { ...state, phase: 'gameover', winner: 'imposters', timeElapsed: state.timeElapsed + dt };
  }

  return { ...state, timeElapsed: state.timeElapsed + dt };
}

export function humanKill(state: GameState, now: number): boolean {
  const human = state.players[0];
  if (!human.alive || human.frozen || human.role !== 'imposter' || human.killCooldown > 0) return false;
  
  const targets = state.players.filter(p => p.alive && p.id !== 0 && p.role === 'crewmate' && dist(human, p) < KILL_RANGE);
  if (targets.length > 0) {
    targets[0].alive = false;
    targets[0].doingTask = false;
    human.killCooldown = KILL_COOLDOWN;
    return true;
  }
  return false;
}

export function humanFreeze(state: GameState, now: number): boolean {
  const human = state.players[0];
  if (!human.alive || human.frozen || human.role !== 'protector' || human.freezeCooldown > 0) return false;
  
  const targets = state.players.filter(p => p.alive && p.role === 'imposter' && !p.frozen && dist(human, p) < FREEZE_RANGE);
  if (targets.length > 0) {
    const target = targets[0];
    state.projectiles.push({
      x: human.x, y: human.y,
      targetX: target.x, targetY: target.y,
      speed: 6,
      startTime: now,
      duration: 300,
    });
    target.frozen = true;
    target.frozenUntil = now + FREEZE_DURATION;
    human.freezeCooldown = FREEZE_COOLDOWN;
    return true;
  }
  return false;
}

export function getNearbyTask(state: GameState): number | null {
  const human = state.players[0];
  if (!human.alive || human.frozen || human.role !== 'crewmate') return null;
  
  const nearby = state.taskStations.find(t => !t.completed && dist(human, t) < TASK_RANGE);
  return nearby ? nearby.id : null;
}
