// ===== Константы игры =====
export const ROOM_W = 800;
export const ROOM_H = 500;
export const WALL = 40;
export const DOOR = 100;
export const PLAYER_R = 16;
export const MAX_PLAYERS = 4;

// hp считается в «половинках сердец»: 6 = 3 сердца
export const CHARACTERS = {
  isaac:   { id: 'isaac',   name: 'Isaac',    skin: '#fbcfe8', body: '#e5e7eb', speed: 215, attack: 'tear',   color: '#60a5fa', hp: 6, dmg: 3.5, delay: 0.36, crit: 0,    fly: false, desc: 'Слёзы под глазами',           avatar: '💧' },
  hank:    { id: 'hank',    name: 'Hank J.',  skin: '#cbd5e1', body: '#334155', speed: 240, attack: 'bullet', color: '#facc15', hp: 6, dmg: 3.0, delay: 0.32, crit: 0,    fly: false, desc: 'Очки и чёрная маска',         avatar: '🕶️' },
  judas:   { id: 'judas',   name: 'Judas',    skin: '#d6c3a5', body: '#1e1b18', speed: 210, attack: 'tear',   color: '#dc2626', hp: 4, dmg: 5.0, delay: 0.38, crit: 0,    fly: false, desc: 'Феска. Хрупкий, но бьёт больно', avatar: '☪️' },
  azazel:  { id: 'azazel',  name: 'Azazel',   skin: '#6b7280', body: '#1f1f2e', speed: 220, attack: 'fire',   color: '#ef4444', hp: 6, dmg: 3.4, delay: 0.40, crit: 0,    fly: false, desc: 'Рога и крылья, огонь',        avatar: '😈' },
  cain:    { id: 'cain',    name: 'Cain',     skin: '#fef3c7', body: '#92400e', speed: 230, attack: 'tear',   color: '#fbbf24', hp: 6, dmg: 3.2, delay: 0.34, crit: 0.18, fly: false, desc: 'Повязка на глаз, криты',      avatar: '👁️' },
  tricky:  { id: 'tricky',  name: 'Tricky',   skin: '#4ade80', body: '#166534', speed: 235, attack: 'fire',   color: '#22c55e', hp: 8, dmg: 3.6, delay: 0.44, crit: 0,    fly: false, desc: 'Стальная челюсть, больше HP', avatar: '🤡' },
  sanford: { id: 'sanford', name: 'Sanford',  skin: '#f5c396', body: '#c2410c', speed: 225, attack: 'bullet', color: '#fb923c', hp: 6, dmg: 3.3, delay: 0.28, crit: 0,    fly: false, desc: 'Бандана, быстрая стрельба',   avatar: '🧣' },
  lost:    { id: 'lost',    name: 'The Lost', skin: '#f8fafc', body: '#e2e8f0', speed: 245, attack: 'tear',   color: '#e2e8f0', hp: 2, dmg: 3.0, delay: 0.33, crit: 0,    fly: true,  desc: 'Призрак: летает сквозь камни', avatar: '👻' },
};

export const SHOT_TYPES = {
  tear:   { speed: 380, life: 0.85, r: 7, pierce: false },
  bullet: { speed: 560, life: 0.70, r: 5, pierce: false },
  fire:   { speed: 330, life: 0.55, r: 9, pierce: true  },
};

export const ENEMY_TYPES = {
  fly:     { hp: 4,   r: 11, speed: 105, w: 3 },
  gaper:   { hp: 11,  r: 16, speed: 68,  w: 3 },
  spitter: { hp: 9,   r: 15, speed: 55,  w: 1, shootDelay: 1.7 },
  charger: { hp: 13,  r: 17, speed: 55,  w: 1, chargeSpeed: 330 },
  boss:    { hp: 170, r: 42, speed: 52,  w: 0 },
};

export const UPGRADES = {
  dmg:   { label: 'Урон +',             icon: '🔥' },
  rate:  { label: 'Скорострельность +', icon: '⚡' },
  speed: { label: 'Скорость +',         icon: '👟' },
  hp:    { label: 'Макс. здоровье +',   icon: '💖' },
  range: { label: 'Дальность +',        icon: '🎯' },
};

export const ROOM_THEMES = {
  basement:        { name: 'Basement',         floor: '#221b19', grid: '#181211', wall: '#3a302c', border: '#171210', rock: '#524640', label: '🏚️ Подвал' },
  cellar:          { name: 'Cellar',           floor: '#1a2228', grid: '#12181d', wall: '#2a3842', border: '#0d1318', rock: '#435866', label: '🪨 Погреб' },
  burningBasement: { name: 'Burning Basement', floor: '#2d140e', grid: '#1e0c08', wall: '#4a1f16', border: '#1a0805', rock: '#733123', label: '🔥 Горящий подвал' },
  cathedral:       { name: 'Cathedral',        floor: '#2a333d', grid: '#1f2730', wall: '#4b5b6d', border: '#cbd5e1', rock: '#94a3b8', label: '🏛️ Собор' },
  sheol:           { name: 'Sheol',            floor: '#140c10', grid: '#0a0508', wall: '#2e121e', border: '#991b1b', rock: '#581c27', label: '🌋 Преисподняя' },
  greed:           { name: 'Greed',            floor: '#282310', grid: '#1a170a', wall: '#4a3f18', border: '#facc15', rock: '#857022', label: '💰 Сокровищница' },
  chest:           { name: 'The Chest',        floor: '#302612', grid: '#1d170b', wall: '#54421d', border: '#fbbf24', rock: '#927230', label: '📦 Сундук' },
  devil:           { name: 'Devil',            floor: '#1a0505', grid: '#100202', wall: '#3d0a0a', border: '#dc2626', rock: '#6b1111', label: '😈 Комната Дьявола' },
};

export function getRoomTheme(rx, ry) {
  const T = ROOM_THEMES;
  if (rx === 0 && ry === 0) return T.basement;
  const list = [T.basement, T.cellar, T.burningBasement, T.cathedral, T.sheol, T.greed, T.chest, T.devil];
  return list[Math.abs(rx * 31 + ry * 17) % 8];
}

// Координаты — центры препятствий
export const TEMPLATES = [
  [],
  [
    { x: 200, y: 150, w: 50, h: 50, type: 'rock' }, { x: 600, y: 150, w: 50, h: 50, type: 'rock' },
    { x: 200, y: 350, w: 50, h: 50, type: 'rock' }, { x: 600, y: 350, w: 50, h: 50, type: 'rock' },
  ],
  [
    { x: 400, y: 250, w: 60, h: 60, type: 'rock' }, { x: 400, y: 170, w: 50, h: 50, type: 'rock' },
    { x: 400, y: 330, w: 50, h: 50, type: 'rock' }, { x: 320, y: 250, w: 50, h: 50, type: 'rock' },
    { x: 480, y: 250, w: 50, h: 50, type: 'rock' },
  ],
  [
    { x: 300, y: 180, w: 45, h: 45, type: 'rock' }, { x: 500, y: 180, w: 45, h: 45, type: 'rock' },
    { x: 300, y: 320, w: 45, h: 45, type: 'rock' }, { x: 500, y: 320, w: 45, h: 45, type: 'rock' },
    { x: 400, y: 250, w: 40, h: 40, type: 'pillar' },
  ],
  [
    { x: 180, y: 120, w: 40, h: 40, type: 'spike' }, { x: 620, y: 120, w: 40, h: 40, type: 'spike' },
    { x: 180, y: 380, w: 40, h: 40, type: 'spike' }, { x: 620, y: 380, w: 40, h: 40, type: 'spike' },
    { x: 400, y: 250, w: 50, h: 50, type: 'rock' },
  ],
  [
    { x: 280, y: 200, w: 55, h: 100, type: 'rock' }, { x: 520, y: 200, w: 55, h: 100, type: 'rock' },
    { x: 400, y: 150, w: 40, h: 40, type: 'chest' },
  ],
];
