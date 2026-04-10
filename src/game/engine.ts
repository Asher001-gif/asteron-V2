import {
  Player, GameState, Role,
  PLAYER_RADIUS, KILL_RANGE, FREEZE_RANGE, FREEZE_DURATION,
  KILL_COOLDOWN, FREEZE_COOLDOWN, MAP_WIDTH, MAP_HEIGHT
} from './types';

const NAMES = ['Astro', 'Nova', 'Blaze', 'Comet', 'Orbit', 'Dust', 'Nebula', 'Crater', 'Titan', 'Cosmo'];

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function createGame(playerRole: Role): GameState {
  const roles: Role[] = ['imposter', 'imposter', 'protector', 'protector',
    'crewmate', 'crewmate', 'crewmate', 'crewmate', 'crewmate', 'crewmate'];
  
  // Put chosen role at index 0
  const roleIdx = roles.indexOf(playerRole);
  [roles[0], roles[roleIdx]] = [roles[roleIdx], roles[0]];
  
  // Shuffle rest
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
    speed: role === 'imposter' ? 2.8 : role === 'protector' ? 2.5 : 2.2,
    direction: { x: 0, y: 0 },
    aiTargetX: MAP_WIDTH / 2,
    aiTargetY: MAP_HEIGHT / 2,
    aiChangeTime: 0,
    killCooldown: 0,
    freezeCooldown: 0,
  }));

  return {
    players,
    phase: 'playing',
    winner: null,
    timeElapsed: 0,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
  };
}

export function updateAI(player: Player, allPlayers: Player[], now: number) {
  if (!player.alive || player.frozen || player.isHuman) return;

  const alive = allPlayers.filter(p => p.alive && p.id !== player.id);

  if (player.role === 'imposter') {
    // Chase nearest crewmate/protector
    const targets = alive.filter(p => p.role !== 'imposter');
    if (targets.length === 0) return;
    const nearest = targets.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b);
    
    // Check for nearby protectors - flee if one is close
    const nearbyProtector = alive.find(p => p.role === 'protector' && dist(player, p) < 200);
    if (nearbyProtector && Math.random() < 0.7) {
      const dx = player.x - nearbyProtector.x;
      const dy = player.y - nearbyProtector.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      player.direction = { x: dx / d, y: dy / d };
    } else {
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      player.direction = { x: dx / d, y: dy / d };
    }
  } else if (player.role === 'protector') {
    // Move toward nearest crewmate being chased or nearest imposter
    const imposters = alive.filter(p => p.role === 'imposter');
    if (imposters.length > 0) {
      const nearest = imposters.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b);
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      player.direction = { x: dx / d, y: dy / d };
    } else {
      wanderAI(player, now);
    }
  } else {
    // Crewmate: flee from nearest imposter
    const imposters = alive.filter(p => p.role === 'imposter');
    if (imposters.length > 0) {
      const nearest = imposters.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b);
      if (dist(player, nearest) < 250) {
        const dx = player.x - nearest.x;
        const dy = player.y - nearest.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        player.direction = { x: dx / d, y: dy / d };
      } else {
        wanderAI(player, now);
      }
    } else {
      wanderAI(player, now);
    }
  }
}

function wanderAI(player: Player, now: number) {
  if (now > player.aiChangeTime) {
    player.aiTargetX = 100 + Math.random() * (MAP_WIDTH - 200);
    player.aiTargetY = 100 + Math.random() * (MAP_HEIGHT - 200);
    player.aiChangeTime = now + 2000 + Math.random() * 3000;
  }
  const dx = player.aiTargetX - player.x;
  const dy = player.aiTargetY - player.y;
  const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  player.direction = { x: dx / d, y: dy / d };
}

export function performAIActions(player: Player, allPlayers: Player[], now: number) {
  if (!player.alive || player.frozen || player.isHuman) return;

  if (player.role === 'imposter' && player.killCooldown <= 0) {
    const targets = allPlayers.filter(p => p.alive && p.role !== 'imposter' && dist(player, p) < KILL_RANGE);
    if (targets.length > 0) {
      targets[0].alive = false;
      player.killCooldown = KILL_COOLDOWN;
    }
  }

  if (player.role === 'protector' && player.freezeCooldown <= 0) {
    const targets = allPlayers.filter(p => p.alive && p.role === 'imposter' && !p.frozen && dist(player, p) < FREEZE_RANGE);
    if (targets.length > 0) {
      targets[0].frozen = true;
      targets[0].frozenUntil = now + FREEZE_DURATION;
      player.freezeCooldown = FREEZE_COOLDOWN;
    }
  }
}

export function updateGame(state: GameState, dt: number, keys: Set<string>, now: number): GameState {
  if (state.phase !== 'playing') return state;

  const human = state.players[0];

  // Human input
  if (human.alive && !human.frozen) {
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
  }

  // Update all players
  for (const p of state.players) {
    if (!p.alive) continue;

    // Unfreeze
    if (p.frozen && now >= p.frozenUntil) {
      p.frozen = false;
    }
    if (p.frozen) continue;

    // Cooldowns
    if (p.killCooldown > 0) p.killCooldown -= dt;
    if (p.freezeCooldown > 0) p.freezeCooldown -= dt;

    // AI
    if (!p.isHuman) {
      updateAI(p, state.players, now);
      performAIActions(p, state.players, now);
    }

    // Movement
    p.x += p.direction.x * p.speed;
    p.y += p.direction.y * p.speed;
    p.x = Math.max(PLAYER_RADIUS, Math.min(state.mapWidth - PLAYER_RADIUS, p.x));
    p.y = Math.max(PLAYER_RADIUS, Math.min(state.mapHeight - PLAYER_RADIUS, p.y));
  }

  // Check win conditions
  const aliveImposters = state.players.filter(p => p.alive && p.role === 'imposter').length;
  const aliveCrew = state.players.filter(p => p.alive && p.role !== 'imposter').length;

  if (aliveImposters === 0) {
    return { ...state, phase: 'gameover', winner: 'crew', timeElapsed: state.timeElapsed + dt };
  }
  if (aliveCrew === 0) {
    return { ...state, phase: 'gameover', winner: 'imposters', timeElapsed: state.timeElapsed + dt };
  }

  return { ...state, timeElapsed: state.timeElapsed + dt };
}

export function humanKill(state: GameState, now: number): boolean {
  const human = state.players[0];
  if (!human.alive || human.frozen || human.role !== 'imposter' || human.killCooldown > 0) return false;
  
  const targets = state.players.filter(p => p.alive && p.id !== 0 && p.role !== 'imposter' && dist(human, p) < KILL_RANGE);
  if (targets.length > 0) {
    targets[0].alive = false;
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
    targets[0].frozen = true;
    targets[0].frozenUntil = now + FREEZE_DURATION;
    human.freezeCooldown = FREEZE_COOLDOWN;
    return true;
  }
  return false;
}
