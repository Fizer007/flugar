import { ROOM_W, ROOM_H, WALL, DOOR, UPGRADES } from './config.js';
import { getRoomInfo } from './world.js';

const TAU = Math.PI * 2;
const OUT = '#000';

function ell(ctx, x, y, rx, ry, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ================= КОМНАТА =================
export function drawRoom(ctx, info, view, t) {
  const th = info.theme;
  ctx.fillStyle = th.border; ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  ctx.fillStyle = th.wall;   ctx.fillRect(5, 5, ROOM_W - 10, ROOM_H - 10);

  // кирпичная кладка стен
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  for (let y = 10; y < ROOM_H; y += 20) {
    ctx.beginPath(); ctx.moveTo(5, y); ctx.lineTo(ROOM_W - 5, y); ctx.stroke();
  }
  ctx.fillStyle = th.floor; ctx.fillRect(WALL, WALL, ROOM_W - 2 * WALL, ROOM_H - 2 * WALL);

  // клетки пола
  ctx.strokeStyle = th.grid; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = WALL + 50; x < ROOM_W - WALL; x += 50) { ctx.moveTo(x, WALL); ctx.lineTo(x, ROOM_H - WALL); }
  for (let y = WALL + 50; y < ROOM_H - WALL; y += 50) { ctx.moveTo(WALL, y); ctx.lineTo(ROOM_W - WALL, y); }
  ctx.stroke();

  // внутренняя тень
  const g = ctx.createLinearGradient(0, WALL, 0, WALL + 40);
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(WALL, WALL, ROOM_W - 2 * WALL, 40);

  // двери
  const open = view.cleared;
  drawDoor(ctx, ROOM_W / 2, WALL / 2, 0, open, th, t);
  drawDoor(ctx, ROOM_W - WALL / 2, ROOM_H / 2, Math.PI / 2, open, th, t);
  drawDoor(ctx, ROOM_W / 2, ROOM_H - WALL / 2, Math.PI, open, th, t);
  drawDoor(ctx, WALL / 2, ROOM_H / 2, -Math.PI / 2, open, th, t);

  // препятствия
  for (const o of info.obstacles) drawObstacle(ctx, o, th, view.chestOpen, t);
}

function drawDoor(ctx, x, y, rot, open, th, t) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const hw = DOOR / 2, hh = WALL / 2;
  // рама
  ctx.fillStyle = '#0a0606';
  ctx.fillRect(-hw - 6, -hh - 2, DOOR + 12, WALL + 4);
  if (open) {
    const g = ctx.createLinearGradient(0, -hh, 0, hh);
    g.addColorStop(0, '#000'); g.addColorStop(1, th.floor);
    ctx.fillStyle = g; ctx.fillRect(-hw, -hh - 2, DOOR, WALL + 4);
    ctx.fillStyle = th.border;
    ctx.fillRect(-hw - 6, -hh - 2, 6, WALL + 4);
    ctx.fillRect(hw, -hh - 2, 6, WALL + 4);
  } else {
    ctx.fillStyle = '#2a2320'; ctx.fillRect(-hw, -hh - 2, DOOR, WALL + 4);
    ctx.fillStyle = '#4a3f3a';
    for (let i = -hw + 8; i < hw; i += 16) ctx.fillRect(i, -hh - 2, 8, WALL + 4);
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = OUT; ctx.fillRect(-1.5, -1, 3, 6);
  }
  ctx.restore();
}

function drawObstacle(ctx, o, th, chestOpen, t) {
  ctx.save();
  ctx.translate(o.x, o.y);
  const hw = o.w / 2, hh = o.h / 2;
  if (o.type === 'rock') {
    rrect(ctx, -hw, -hh, o.w, o.h, 10);
    ctx.fillStyle = th.rock; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-hw + 8, -hh + 10); ctx.lineTo(-hw + 8, hh - 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, -hh + 6); ctx.lineTo(4, 0); ctx.lineTo(-2, hh - 6); ctx.stroke();
  } else if (o.type === 'pillar') {
    ell(ctx, 0, hh - 4, hw, hh * 0.35, 'rgba(0,0,0,0.4)');
    rrect(ctx, -hw + 4, -hh, o.w - 8, o.h, 4);
    ctx.fillStyle = th.rock; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-hw + 8, -hh + 3, 6, o.h - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(hw - 14, -hh + 3, 6, o.h - 6);
  } else if (o.type === 'spike') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-hw, -hh, o.w, o.h);
    const n = 3, w = o.w / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const bx = -hw + i * w, by = -hh + j * w;
        ctx.beginPath();
        ctx.moveTo(bx + 2, by + w - 2); ctx.lineTo(bx + w / 2, by + 2); ctx.lineTo(bx + w - 2, by + w - 2); ctx.closePath();
        ctx.fillStyle = '#b8bec8'; ctx.fill();
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  } else if (o.type === 'chest') {
    ell(ctx, 0, hh - 2, hw, 7, 'rgba(0,0,0,0.4)');
    rrect(ctx, -hw, -hh + 8, o.w, o.h - 8, 4);
    ctx.fillStyle = '#7c4a1e'; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
    if (chestOpen) {
      ctx.fillStyle = '#1a0d05'; ctx.fillRect(-hw + 4, -hh + 12, o.w - 8, 8);
      ctx.save(); ctx.translate(0, -hh + 8); ctx.rotate(-0.5);
      rrect(ctx, -hw, -16, o.w, 16, 4); ctx.fillStyle = '#93551f'; ctx.fill();
      ctx.stroke(); ctx.restore();
    } else {
      rrect(ctx, -hw, -hh, o.w, 16, 5);
      ctx.fillStyle = '#93551f'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#facc15'; ctx.fillRect(-4, -hh + 10, 8, 10);
      ctx.strokeRect(-4, -hh + 10, 8, 10);
    }
  }
  ctx.restore();
}

// ================= ПРЕДМЕТЫ =================
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(x - s * 1.25, y - s * 0.05, x - s * 0.65, y - s * 0.95, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.65, y - s * 0.95, x + s * 1.25, y - s * 0.05, x, y + s * 0.85);
  ctx.closePath();
}

export function drawPickup(ctx, pk, t) {
  const bob = Math.sin(t * 4 + pk.id) * 2;
  ctx.save();
  ctx.translate(pk.x, pk.y);
  ell(ctx, 0, 12, 9, 3.5, 'rgba(0,0,0,0.4)');
  if (pk.kind === 'heart') {
    heartPath(ctx, 0, bob - 2, 10);
    ctx.fillStyle = '#ef4444'; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    ell(ctx, -4, bob - 6, 2.5, 1.8, 'rgba(255,255,255,0.7)');
  } else if (pk.kind === 'coin') {
    ell(ctx, 0, bob, 8, 8, '#facc15', OUT, 2.5);
    ell(ctx, 0, bob, 4.5, 4.5, null, '#a16207', 2);
  } else {
    // предмет на пьедестале
    const key = pk.kind.split(':')[1];
    const up = UPGRADES[key] || { icon: '❔' };
    ctx.fillStyle = '#6b7280'; rrect(ctx, -16, 2, 32, 12, 3); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(-12, 2, 24, 3);
    const glow = ctx.createRadialGradient(0, -12 + bob, 2, 0, -12 + bob, 26);
    glow.addColorStop(0, 'rgba(250,204,21,0.55)'); glow.addColorStop(1, 'rgba(250,204,21,0)');
    ctx.fillStyle = glow; ctx.fillRect(-28, -40 + bob, 56, 56);
    ctx.font = '22px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(up.icon, 0, -12 + bob);
  }
  ctx.restore();
}

// ================= ПЕРСОНАЖИ =================
export function drawCharacter(ctx, ch, o) {
  const { x, y, fx = 0, fy = 1, walk = 0, moving = false, alpha = 1, t = 0, dead = false } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = dead ? 0.35 : alpha;

  const lost = ch.id === 'lost';
  ell(ctx, 0, 18, 13, 5, 'rgba(0,0,0,0.35)');
  const bob = moving ? -Math.abs(Math.sin(walk)) * 3 : 0;
  const float = lost ? Math.sin(t * 3) * 3 - 6 : 0;
  ctx.translate(0, bob + float);

  // --- то, что за спиной ---
  if (lost) {
    const g = ctx.createRadialGradient(0, -6, 4, 0, -6, 34);
    g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-36, -42, 72, 72);
  }
  if (ch.id === 'azazel') {
    const flap = Math.sin(t * 7) * 4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 8, 0);
      ctx.lineTo(s * 30, -18 + flap);
      ctx.lineTo(s * 27, -4);
      ctx.lineTo(s * 33, 4 + flap * 0.5);
      ctx.lineTo(s * 22, 6);
      ctx.lineTo(s * 14, 10);
      ctx.closePath();
      ctx.fillStyle = '#26263a'; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  // --- тело ---
  if (lost) {
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-14, 16);
    for (let i = 0; i <= 4; i++) ctx.lineTo(-14 + i * 7, 16 + (i % 2 ? -4 : 3) + Math.sin(t * 6 + i) * 1.5);
    ctx.lineTo(14, -4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(248,250,252,0.92)'; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
  } else {
    const sw = moving ? Math.sin(walk) * 4 : 0;
    ctx.fillStyle = '#1f1a17';
    ctx.fillRect(-8, 10 + sw * 0.5, 6, 8); ctx.fillRect(2, 10 - sw * 0.5, 6, 8);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.strokeRect(-8, 10 + sw * 0.5, 6, 8); ctx.strokeRect(2, 10 - sw * 0.5, 6, 8);
    rrect(ctx, -10, 0, 20, 14, 5);
    ctx.fillStyle = ch.body; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
  }

  // --- голова ---
  const HY = -8;
  ell(ctx, 0, HY, 16, 15, ch.skin, OUT, 3);

  const clipHead = fn => {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, HY, 16, 15, 0, 0, TAU); ctx.clip();
    fn(); ctx.restore();
  };

  // предметы, лежащие под глазами
  if (ch.id === 'tricky') {
    clipHead(() => {
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(-18, HY + 3, 36, 14);
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
      for (let i = -14; i <= 14; i += 4) { ctx.beginPath(); ctx.moveTo(i, HY + 3); ctx.lineTo(i, HY + 17); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-18, HY + 9); ctx.lineTo(18, HY + 9); ctx.stroke();
    });
  }
  if (ch.id === 'hank') {
    clipHead(() => { ctx.fillStyle = '#0b0b0b'; ctx.fillRect(-18, HY + 2, 36, 16); });
  }

  // --- глаза ---
  const ey = HY + 1 + fy * 1.2;
  const eyeCol = ch.id === 'azazel' ? '#dc2626' : ch.id === 'tricky' ? '#ef4444' : OUT;
  if (lost) {
    for (const s of [-1, 1]) ell(ctx, s * 5.5, ey, 3.6, 4.6, '#0b0b0b');
    ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, HY + 10, 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else {
    for (const s of [-1, 1]) {
      ell(ctx, s * 5.5, ey, 4.4, 5.2, '#fff', OUT, 1.5);
      ell(ctx, s * 5.5 + fx * 2, ey + fy * 2, 2, 2.4, eyeCol);
    }
  }

  // --- аксессуары поверх ---
  switch (ch.id) {
    case 'isaac':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 6, ey + 6); ctx.quadraticCurveTo(s * 9, ey + 11, s * 6, ey + 14); ctx.quadraticCurveTo(s * 3, ey + 11, s * 6, ey + 6);
        ctx.fillStyle = '#60a5fa'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, HY + 11, 3, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      break;
    case 'hank':
      ctx.fillStyle = '#7f1d1d'; rrect(ctx, -15, HY - 6, 30, 9, 3); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      for (const s of [-1, 1]) {
        ell(ctx, s * 6, HY - 1.5, 5, 4.2, '#ef4444', OUT, 1.8);
        ell(ctx, s * 6 - 1.5, HY - 3, 1.5, 1, 'rgba(255,255,255,0.8)');
      }
      break;
    case 'judas':
      ctx.beginPath();
      ctx.moveTo(-10, HY - 12); ctx.lineTo(10, HY - 12); ctx.lineTo(12, HY - 25); ctx.lineTo(-12, HY - 25); ctx.closePath();
      ctx.fillStyle = '#b91c1c'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(6, HY - 25); ctx.lineTo(15, HY - 17); ctx.stroke();
      ell(ctx, 15, HY - 15, 2.6, 2.6, '#facc15', OUT, 1);
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-9, ey - 8); ctx.lineTo(-2, ey - 5); ctx.moveTo(9, ey - 8); ctx.lineTo(2, ey - 5); ctx.stroke();
      break;
    case 'azazel':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 6, HY - 12); ctx.lineTo(s * 12, HY - 27); ctx.lineTo(s * 13, HY - 10); ctx.closePath();
        ctx.fillStyle = '#111'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      }
      break;
    case 'cain':
      clipHead(() => {
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.ellipse(0, HY - 7, 17, 11, 0, 0, TAU); ctx.fill();
        ctx.fillRect(-17, HY - 10, 5, 12); ctx.fillRect(12, HY - 10, 5, 12);
      });
      ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, HY - 7, 16, 9, 0, Math.PI, TAU); ctx.stroke();
      ell(ctx, -5.5, ey, 5.4, 6, '#0b0b0b');
      ctx.strokeStyle = '#0b0b0b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-15, HY - 8); ctx.lineTo(13, HY + 4); ctx.stroke();
      break;
    case 'tricky':
      for (const s of [-1, 1]) {
        ell(ctx, s * 13, HY - 13, 6, 6, '#f97316', OUT, 2);
        ell(ctx, s * 13, HY - 13, 2.5, 2.5, '#fde047');
      }
      break;
    case 'sanford':
      clipHead(() => { ctx.fillStyle = '#f97316'; ctx.fillRect(-18, HY - 18, 36, 10); });
      ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-16, HY - 8); ctx.lineTo(16, HY - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, HY - 13); ctx.lineTo(24, HY - 19); ctx.lineTo(22, HY - 8); ctx.closePath();
      ctx.fillStyle = '#f97316'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0b0b0b'; rrect(ctx, -13, HY - 4, 26, 8, 3); ctx.fill();
      ell(ctx, -7, HY - 1.5, 2, 1, 'rgba(255,255,255,0.6)');
      break;
  }

  ctx.restore();
}

export function drawLabel(ctx, x, y, name, color = '#e5e7eb') {
  ctx.save();
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(name, x, y);
  ctx.fillStyle = color; ctx.fillText(name, x, y);
  ctx.restore();
}

export function drawBubble(ctx, x, y, text) {
  ctx.save();
  ctx.font = '600 12px Inter, sans-serif';
  const w = Math.min(180, ctx.measureText(text).width + 16);
  const shown = text.length > 26 ? text.slice(0, 25) + '…' : text;
  ctx.textAlign = 'center';
  rrect(ctx, x - w / 2, y - 22, w, 20, 6);
  ctx.fillStyle = 'rgba(15,10,8,0.92)'; ctx.fill();
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#fef3c7'; ctx.textBaseline = 'middle';
  ctx.fillText(shown, x, y - 12);
  ctx.restore();
}

// ================= ВРАГИ =================
export function drawEnemy(ctx, e, t) {
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.spawn > 0) ctx.globalAlpha = 0.3 + 0.25 * Math.sin(t * 20);
  const F = e.flash > 0;
  const r = e.r;
  ell(ctx, 0, r * 0.9, r * 0.8, r * 0.3, 'rgba(0,0,0,0.35)');

  switch (e.type) {
    case 'fly': {
      const flap = Math.sin(t * 40 + e.id) * 0.5;
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(s * 5, -6); ctx.rotate(s * (0.5 + flap));
        ell(ctx, s * 5, 0, 7, 4, 'rgba(203,213,225,0.75)', OUT, 1.2);
        ctx.restore();
      }
      ell(ctx, 0, 0, 9, 9, F ? '#fff' : '#374151', OUT, 2.5);
      ell(ctx, -3, -1, 2.2, 2.2, '#ef4444'); ell(ctx, 3, -1, 2.2, 2.2, '#ef4444');
      break;
    }
    case 'gaper': {
      ell(ctx, 0, 0, r, r, F ? '#fff' : '#e8a0a0', OUT, 3);
      ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(-7, 12); ctx.moveTo(6, 2); ctx.lineTo(8, 10); ctx.stroke();
      ell(ctx, -6, -4, 3.6, 5, '#0b0b0b'); ell(ctx, 6, -4, 3.6, 5, '#0b0b0b');
      ell(ctx, 0, 8, 6, 4.5, '#3b0a0a');
      break;
    }
    case 'spitter': {
      ell(ctx, 0, 0, r, r, F ? '#fff' : '#cbd5e1', OUT, 3);
      ell(ctx, -5.5, -3, 3.5, 4.5, '#0b0b0b'); ell(ctx, 5.5, -3, 3.5, 4.5, '#0b0b0b');
      const open = e.state === 'aim';
      ell(ctx, 0, 7, open ? 7 : 4, open ? 5.5 : 2.2, open ? '#7f1d1d' : '#0b0b0b');
      if (open) ell(ctx, 0, 7, 3, 2.5, '#ef4444');
      break;
    }
    case 'charger': {
      const tele = e.state === 'tele', charge = e.state === 'charge';
      if (tele) {
        ctx.strokeStyle = 'rgba(239,68,68,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(e.ang) * 140, Math.sin(e.ang) * 140); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 8, -12); ctx.lineTo(s * 15, -22); ctx.lineTo(s * 14, -9); ctx.closePath();
        ctx.fillStyle = '#e5e7eb'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      }
      ell(ctx, 0, 0, r, r * 0.92, F || (tele && Math.sin(t * 30) > 0) ? '#fff' : charge ? '#c2410c' : '#9a3412', OUT, 3);
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-2, -4); ctx.moveTo(10, -8); ctx.lineTo(2, -4); ctx.stroke();
      ell(ctx, -5, -1, 2.5, 2.5, '#fde047'); ell(ctx, 5, -1, 2.5, 2.5, '#fde047');
      ell(ctx, 0, 9, 7, 3, '#1c0a05');
      break;
    }
    case 'boss': {
      const shake = e.state === 'tele' ? Math.sin(t * 60) * 2 : 0;
      ctx.translate(shake, 0);
      ell(ctx, 0, 0, r, r * 0.95, F ? '#fff' : '#f0a6c0', OUT, 4);
      ell(ctx, -18, 12, 8, 6, 'rgba(159,18,57,0.35)'); ell(ctx, 20, -16, 7, 5, 'rgba(159,18,57,0.35)');
      for (const s of [-1, 1]) {
        ell(ctx, s * 15, -12, 10, 12, '#fff', OUT, 3);
        ell(ctx, s * 15, -10, 4.5, 5, '#111');
      }
      ctx.beginPath(); ctx.ellipse(0, 16, 22, e.state === 'move' ? 11 : 15, 0, 0, TAU);
      ctx.fillStyle = '#3b0a0a'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#f5f5f4';
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * 6 - 3, 8); ctx.lineTo(i * 6, 15); ctx.lineTo(i * 6 + 3, 8); ctx.fill();
      }
      break;
    }
  }

  if (e.type !== 'boss' && e.hp < e.maxhp) {
    const w = r * 1.8;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-w / 2, -r - 12, w, 5);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-w / 2 + 1, -r - 11, (w - 2) * Math.max(0, e.hp / e.maxhp), 3);
  }
  ctx.restore();
}

export function drawBossBar(ctx, e) {
  const w = 360, x = (ROOM_W - w) / 2, y = ROOM_H - 30;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x - 3, y - 3, w + 6, 14);
  ctx.fillStyle = '#7f1d1d'; ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = '#ef4444'; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxhp), 8);
  ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#fecaca'; ctx.fillText('БОСС', ROOM_W / 2, y - 6);
}

// ================= СНАРЯДЫ =================
export function drawShot(ctx, s, t) {
  ctx.save();
  ctx.translate(s.x, s.y);
  if (s.ty === 'bullet') {
    const a = Math.atan2(s.vy, s.vx);
    ctx.rotate(a);
    ctx.fillStyle = s.color; ctx.globalAlpha = 0.35; ctx.fillRect(-16, -1.5, 14, 3);
    ctx.globalAlpha = 1;
    rrect(ctx, -4, -3, 10, 6, 3); ctx.fillStyle = s.color; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (s.ty === 'fire') {
    const fl = 1 + Math.sin(t * 40 + s.x) * 0.15;
    ell(ctx, 0, 0, s.r * 1.2 * fl, s.r * 1.2 * fl, 'rgba(239,68,68,0.45)');
    ell(ctx, 0, 0, s.r * 0.9 * fl, s.r * 0.9 * fl, '#f97316', OUT, 1.5);
    ell(ctx, 0, 1, s.r * 0.5, s.r * 0.5, '#fde047');
  } else {
    ell(ctx, 0, 0, s.r, s.r, s.color, OUT, 2);
    ell(ctx, -s.r * 0.3, -s.r * 0.3, s.r * 0.3, s.r * 0.3, 'rgba(255,255,255,0.8)');
  }
  ctx.restore();
}

export function drawEnemyShot(ctx, s) {
  ell(ctx, s.x, s.y, s.r + 3, s.r + 3, 'rgba(239,68,68,0.3)');
  ell(ctx, s.x, s.y, s.r, s.r, '#7f1d1d', OUT, 2);
  ell(ctx, s.x - 1.5, s.y - 1.5, s.r * 0.35, s.r * 0.35, '#fca5a5');
}

export function drawParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ================= МИНИКАРТА =================
export function drawMinimap(ctx, size, seed, cur, visited, others) {
  const N = 5, half = 2, gap = 3;
  const cell = (size - gap * (N + 1)) / N;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(10,7,6,0.92)'; ctx.fillRect(0, 0, size, size);

  const has = (x, y) => visited.has(x + ',' + y);
  for (let j = -half; j <= half; j++) {
    for (let i = -half; i <= half; i++) {
      const rx = cur.rx + i, ry = cur.ry + j;
      const seen = has(rx, ry);
      const near = seen || has(rx + 1, ry) || has(rx - 1, ry) || has(rx, ry + 1) || has(rx, ry - 1);
      if (!near) continue;
      const x = gap + (i + half) * (cell + gap), y = gap + (j + half) * (cell + gap);
      const info = getRoomInfo(seed, rx, ry);
      const isCur = i === 0 && j === 0;
      ctx.fillStyle = isCur ? '#fbbf24' : seen ? '#57534e' : '#1c1917';
      ctx.fillRect(x, y, cell, cell);
      if (!seen) { ctx.strokeStyle = '#44403c'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1); }
      if (info.kind === 'treasure' || info.kind === 'boss') {
        ctx.fillStyle = info.kind === 'boss' ? '#ef4444' : '#facc15';
        ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.22, 0, TAU); ctx.fill();
        if (isCur) { ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); }
      }
      // напарники
      for (const o of others) {
        if (o.rx === rx && o.ry === ry) {
          ctx.fillStyle = o.color || '#22c55e';
          ctx.fillRect(x + cell - 6, y + 1, 5, 5);
        }
      }
    }
  }
}