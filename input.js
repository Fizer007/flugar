// Ввод. Используем event.code, поэтому WASD работает и на русской раскладке.
const MOVE = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
const AIM = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

const isTyping = () => {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
};

export const input = {
  move: { up: false, down: false, left: false, right: false },
  aim:  { up: false, down: false, left: false, right: false },
  tMove: { up: false, down: false, left: false, right: false }, // тач
  tAim:  { up: false, down: false, left: false, right: false },
  mouse: { x: 0, y: 0, down: false, seen: false },
  onEnter: null,
  onEscape: null,

  clear() {
    for (const g of [this.move, this.aim, this.tMove, this.tAim]) for (const k in g) g[k] = false;
    this.mouse.down = false;
  },

  moveVec() {
    const m = this.move, t = this.tMove;
    let x = (m.right || t.right ? 1 : 0) - (m.left || t.left ? 1 : 0);
    let y = (m.down || t.down ? 1 : 0) - (m.up || t.up ? 1 : 0);
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },

  /** Направление стрельбы стрелками/тач-кнопками или null. */
  aimVec() {
    const a = this.aim, t = this.tAim;
    let x = (a.right || t.right ? 1 : 0) - (a.left || t.left ? 1 : 0);
    let y = (a.down || t.down ? 1 : 0) - (a.up || t.up ? 1 : 0);
    if (!x && !y) return null;
    const l = Math.hypot(x, y);
    return { x: x / l, y: y / l };
  },
};

export function initInput(canvas, touchRoot) {
  window.addEventListener('keydown', e => {
    if (e.code === 'Enter' && !e.repeat) { input.onEnter?.(); if (isTyping()) return; }
    if (e.code === 'Escape') { input.onEscape?.(); return; }
    if (isTyping()) return;
    const m = MOVE[e.code], a = AIM[e.code];
    if (m) { input.move[m] = true; e.preventDefault(); }
    if (a) { input.aim[a] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const m = MOVE[e.code], a = AIM[e.code];
    if (m) input.move[m] = false;
    if (a) input.aim[a] = false;
  });
  window.addEventListener('blur', () => input.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) input.clear(); });

  // мышь: зажмите ЛКМ — стреляем в сторону курсора
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.seen = true;
  });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.seen = true;
    input.mouse.down = true;
  });
  window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') input.mouse.down = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // тач-кнопки: data-pad="move|aim", data-dir="up|down|left|right"
  touchRoot.querySelectorAll('[data-pad]').forEach(btn => {
    const group = btn.dataset.pad === 'move' ? input.tMove : input.tAim;
    const dir = btn.dataset.dir;
    const on = e => { e.preventDefault(); group[dir] = true; try { btn.setPointerCapture(e.pointerId); } catch { /* */ } };
    const off = e => { e.preventDefault(); group[dir] = false; };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('lostpointercapture', () => { group[dir] = false; });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });
}