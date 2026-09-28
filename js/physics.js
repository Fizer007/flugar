import { ROOM_W, ROOM_H, WALL, DOOR } from './config.js';

export const SOLID = new Set(['rock', 'pillar', 'chest']);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Расстояние от точки до прямоугольника (центр + w/h). */
export function rectDist(x, y, o) {
  const nx = clamp(x, o.x - o.w / 2, o.x + o.w / 2);
  const ny = clamp(y, o.y - o.h / 2, o.y + o.h / 2);
  return Math.hypot(x - nx, y - ny);
}

/** Выталкивает круг e{x,y} радиуса r из твёрдых препятствий. */
export function resolveObstacles(e, r, obstacles) {
  for (const o of obstacles) {
    if (!SOLID.has(o.type)) continue;
    const hw = o.w / 2, hh = o.h / 2;
    const nx = clamp(e.x, o.x - hw, o.x + hw);
    const ny = clamp(e.y, o.y - hh, o.y + hh);
    const dx = e.x - nx, dy = e.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      e.x += (dx / d) * (r - d);
      e.y += (dy / d) * (r - d);
    } else {
      // центр внутри прямоугольника — выталкиваем по кратчайшей оси
      const px = hw - Math.abs(e.x - o.x), py = hh - Math.abs(e.y - o.y);
      if (px < py) e.x += (e.x < o.x ? -1 : 1) * (px + r);
      else e.y += (e.y < o.y ? -1 : 1) * (py + r);
    }
  }
}

/**
 * Держит круг внутри комнаты. Если двери открыты, разрешает
 * заходить в проём (коридор шириной DOOR).
 */
export function clampRoom(e, r, open) {
  const cx = ROOM_W / 2, cy = ROOM_H / 2;
  const half = DOOR / 2 - r;
  const minX = WALL + r, maxX = ROOM_W - WALL - r;
  const minY = WALL + r, maxY = ROOM_H - WALL - r;

  if (e.x < minX || e.x > maxX) {
    if (open && Math.abs(e.y - cy) <= half + 2) e.y = clamp(e.y, cy - half, cy + half);
    else e.x = clamp(e.x, minX, maxX);
  }
  if (e.y < minY || e.y > maxY) {
    if (open && Math.abs(e.x - cx) <= half + 2) e.x = clamp(e.x, cx - half, cx + half);
    else e.y = clamp(e.y, minY, maxY);
  }
  e.x = clamp(e.x, -r, ROOM_W + r);
  e.y = clamp(e.y, -r, ROOM_H + r);
}

export function overlapsSpike(p, r, obstacles) {
  for (const o of obstacles) {
    if (o.type === 'spike' && rectDist(p.x, p.y, o) < r * 0.55) return true;
  }
  return false;
}
