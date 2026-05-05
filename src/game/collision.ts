import { PLAYER_RADIUS } from './types';

export interface Wall {
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface CollisionCircle {
  x: number; y: number;
  r: number;
}

// === Room definitions (1600x1200 map) ===
// Research room: top-center, door at bottom
// Ecosystem room: left-center, door on right
// Recover room: right-center, door on left

const DOOR_WIDTH = 70;

export const ROOM_WALLS: Wall[] = [
  // === Research Room (top center) ===
  // Rect: x=550, y=40, w=500, h=300
  // Top wall
  { x1: 550, y1: 40, x2: 1050, y2: 40 },
  // Left wall
  { x1: 550, y1: 40, x2: 550, y2: 340 },
  // Right wall
  { x1: 1050, y1: 40, x2: 1050, y2: 340 },
  // Bottom wall with door gap in center (800±35)
  { x1: 550, y1: 340, x2: 765, y2: 340 },
  { x1: 835, y1: 340, x2: 1050, y2: 340 },

  // === Ecosystem Room (left center) ===
  // Rect: x=40, y=450, w=350, h=350
  // Top wall
  { x1: 40, y1: 450, x2: 390, y2: 450 },
  // Left wall
  { x1: 40, y1: 450, x2: 40, y2: 800 },
  // Bottom wall
  { x1: 40, y1: 800, x2: 390, y2: 800 },
  // Right wall with door gap in center (625±35)
  { x1: 390, y1: 450, x2: 390, y2: 590 },
  { x1: 390, y1: 660, x2: 390, y2: 800 },

  // === Recover Room (right center) ===
  // Rect: x=1210, y=450, w=350, h=350
  // Top wall
  { x1: 1210, y1: 450, x2: 1560, y2: 450 },
  // Right wall
  { x1: 1560, y1: 450, x2: 1560, y2: 800 },
  // Bottom wall
  { x1: 1210, y1: 800, x2: 1560, y2: 800 },
  // Left wall with door gap in center (625±35)
  { x1: 1210, y1: 450, x2: 1210, y2: 590 },
  { x1: 1210, y1: 660, x2: 1210, y2: 800 },

  // === Jail Room (bottom-right corner) ===
  { x1: JAIL_RECT.x, y1: JAIL_RECT.y, x2: JAIL_RECT.x + JAIL_RECT.w, y2: JAIL_RECT.y },
  { x1: JAIL_RECT.x, y1: JAIL_RECT.y + JAIL_RECT.h, x2: JAIL_RECT.x + JAIL_RECT.w, y2: JAIL_RECT.y + JAIL_RECT.h },
  { x1: JAIL_RECT.x, y1: JAIL_RECT.y, x2: JAIL_RECT.x, y2: JAIL_RECT.y + JAIL_RECT.h },
  { x1: JAIL_RECT.x + JAIL_RECT.w, y1: JAIL_RECT.y, x2: JAIL_RECT.x + JAIL_RECT.w, y2: JAIL_RECT.y + JAIL_RECT.h },
];

// Decorative obstacles (circular, impassable)
export const OBSTACLES: CollisionCircle[] = [
  // Rock formations in the open area
  { x: 800, y: 600, r: 40 },   // Center rock
  { x: 600, y: 950, r: 30 },   // Bottom-left rock
  { x: 1100, y: 1000, r: 35 }, // Bottom-right rock
];

// Room info for rendering
export interface RoomInfo {
  label: string;
  x: number; y: number; w: number; h: number;
  doorSide: 'top' | 'bottom' | 'left' | 'right';
  doorCenter: number;
}

export const ROOMS: RoomInfo[] = [
  { label: 'RESEARCH', x: 550, y: 40, w: 500, h: 300, doorSide: 'bottom', doorCenter: 800 },
  { label: 'ECOSYSTEM', x: 40, y: 450, w: 350, h: 350, doorSide: 'right', doorCenter: 625 },
  { label: 'RECOVER', x: 1210, y: 450, w: 350, h: 350, doorSide: 'left', doorCenter: 625 },
];

function pointToSegDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): { dist: number; nx: number; ny: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const npx = px - closestX;
  const npy = py - closestY;
  const dist = Math.sqrt(npx * npx + npy * npy);
  return { dist, nx: dist > 0 ? npx / dist : 0, ny: dist > 0 ? npy / dist : 0 };
}

export function resolveCollisions(px: number, py: number): { x: number; y: number } {
  let x = px;
  let y = py;
  const r = PLAYER_RADIUS;

  // Wall collisions
  for (const wall of ROOM_WALLS) {
    const { dist, nx, ny } = pointToSegDist(x, y, wall.x1, wall.y1, wall.x2, wall.y2);
    if (dist < r) {
      const push = r - dist;
      x += nx * push;
      y += ny * push;
    }
  }

  // Obstacle collisions
  for (const obs of OBSTACLES) {
    const dx = x - obs.x;
    const dy = y - obs.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = obs.r + r;
    if (dist < minDist && dist > 0) {
      const push = minDist - dist;
      x += (dx / dist) * push;
      y += (dy / dist) * push;
    }
  }

  return { x, y };
}
