import { ROOM_W, ROOM_H, TEMPLATES, getRoomTheme } from './config.js';
import { hash, mulberry32 } from './rng.js';

const cache = new Map();
export const clearRoomCache = () => cache.clear();

/** Информация о комнате (тема, препятствия, тип) — чистая функция от seed и координат. */
export function getRoomInfo(seed, rx, ry) {
  const key = `${seed}:${rx},${ry}`;
  let info = cache.get(key);
  if (info) return info;

  const rng = mulberry32(hash(seed, rx, ry, 7));
  const d = Math.abs(rx) + Math.abs(ry);

  let kind = 'normal';
  if (rx === 0 && ry === 0) kind = 'start';
  else {
    const r = rng();
    if (d >= 3 && r < 0.08) kind = 'boss';
    else if (r < 0.18) kind = 'treasure';
  }

  const tpl = kind === 'normal' ? Math.floor(rng() * TEMPLATES.length) : 0;
  const flipX = rng() < 0.5, flipY = rng() < 0.5;
  const obstacles = TEMPLATES[tpl].map(o => ({
    ...o,
    x: flipX ? ROOM_W - o.x : o.x,
    y: flipY ? ROOM_H - o.y : o.y,
  }));

  info = { rx, ry, d, kind, theme: getRoomTheme(rx, ry), obstacles };
  cache.set(key, info);
  return info;
}

export const KIND_LABEL = {
  start: '',
  normal: '',
  treasure: '⭐ Комната сокровищ',
  boss: '☠️ БОСС',
};
