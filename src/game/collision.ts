import { PLAYER_RADIUS } from './types';

export interface Wall {
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface CollisionCircle {
  x: number; y: number;
  r: number;
}

// Room walls based on the map image (1600x1200 game coords)
// Top-left biodome (triangle)
// Top-right server room (rectangle)
// Middle-left storage (rectangle)
// Bottom-right rover (circle obstacle)

// Wall segments: players collide from outside but can walk through door openings
export const ROOM_WALLS: Wall[] = [
  // === Top-left Biodome (triangular) ===
  // Left edge (vertical)
  { x1: 30, y1: 30, x2: 30, y2: 420 },
  // Top edge (horizontal)
  { x1: 30, y1: 30, x2: 380, y2: 30 },
  // Diagonal wall with door gap
  { x1: 380, y1: 30, x2: 250, y2: 250 },
  { x1: 200, y1: 310, x2: 30, y2: 420 },

  // === Top-right Server/Comms Room ===
  // Top wall
  { x1: 950, y1: 30, x2: 1400, y2: 30 },
  // Right wall
  { x1: 1400, y1: 30, x2: 1400, y2: 480 },
  // Bottom wall (door gap in middle)
  { x1: 950, y1: 480, x2: 1100, y2: 480 },
  { x1: 1200, y1: 480, x2: 1400, y2: 480 },
  // Left wall
  { x1: 950, y1: 30, x2: 950, y2: 480 },

  // === Middle-left Storage/Water Tank Room ===
  // Top wall
  { x1: 80, y1: 560, x2: 700, y2: 560 },
  // Bottom wall (door gap on right)
  { x1: 80, y1: 740, x2: 550, y2: 740 },
  // Left wall
  { x1: 80, y1: 560, x2: 80, y2: 740 },
  // Right wall (partial, door gap)
  { x1: 700, y1: 560, x2: 700, y2: 640 },
];

// Rover obstacle (circular, impassable)
export const ROVER_OBSTACLE: CollisionCircle = {
  x: 1150, y: 900, r: 100,
};

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

  // Rover collision
  const rov = ROVER_OBSTACLE;
  const rdx = x - rov.x;
  const rdy = y - rov.y;
  const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
  const minDist = rov.r + r;
  if (rDist < minDist && rDist > 0) {
    const push = minDist - rDist;
    x += (rdx / rDist) * push;
    y += (rdy / rDist) * push;
  }

  return { x, y };
}
