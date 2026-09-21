import { ROOM_W, ROOM_H, WALL, PLAYER_R, CHARACTERS, SHOT_TYPES, ENEMY_TYPES, UPGRADES } from './config.js';
import { getRoomInfo, clearRoomCache, KIND_LABEL } from './world.js';
import { HostSim, stepShot, roomKey } from './sim.js';
import { resolveObstacles, clampRoom, overlapsSpike } from './physics.js';
import { Net } from './net.js';
import { input } from './input.js';
import * as R from './render.js';

const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;

export class Game {
  constructor(ui, audio) {
    this.ui = ui;
    this.audio = audio;
    this.canvas = ui.el.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.mm = ui.el.minimap.getContext('2d');

    this.state = 'lobby';            // lobby | play | over
    this.mode = null;                // solo | host | guest
    this.profile = { name: 'Isaac', char: 'isaac' };
    this.cheats = new Set();

    this.net = null;
    this.sim = null;
    this.me = null;
    this.myId = 'host';
    this.roomCode = null;
    this.remote = new Map();
    this.bubbles = new Map();
    this.shots = [];
    this.fx = [];
    this.visited = new Set(['0,0']);
    this.guestView = null;
    this.placeholder = null;
    this.cur = null;
    this.seed = 1;
    this.epoch = 0;
    this.kills = 0;
    this.time = 0;
    this.shake = 0;
    this.trk = { k: null, en: new Map(), cl: true };
    this.timers = { st: 0, w: 0, ping: 0, step: 0 };
    this.welcomeCb = null;
    this.lastOver = null;

    this.dpr = 1; this.scale = 1; this.ox = 0; this.oy = 0; this.cw = 0; this.ch = 0;
    this.last = performance.now();
    window.addEventListener('resize', () => this.resize());
  }

  // ======================= экран =======================
  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr; this.cw = w; this.ch = h;
    const bar = this.ui.el.topBar.offsetHeight || 44;
    const availH = h - bar - 6;
    this.scale = Math.min(w / ROOM_W, availH / ROOM_H);
    this.ox = (w - ROOM_W * this.scale) / 2;
    this.oy = bar + 3 + (availH - ROOM_H * this.scale) / 2;
  }

  screenToWorld(sx, sy) {
    return { x: (sx - this.ox) / this.scale, y: (sy - this.oy) / this.scale };
  }

  // ======================= запуск режимов =======================
  setProfile(p) { Object.assign(this.profile, p); }

  applyCheat(raw) {
    const code = (raw || '').trim().toUpperCase();
    if (!code) return null;
    const map = {
      MADNESS: ['MADNESS', '🩸 БЕЗУМИЕ: двойной урон и скорострельность'],
      GOD: ['GOD', '🛡️ Бессмертие включено'],
      SPEED: ['SPEED', '⚡ Суперскорость включена'],
    };
    if (code === 'RESET') { this.cheats.clear(); return 'Читы отключены'; }
    const c = map[code];
    if (!c) return 'Неизвестный код. Попробуйте: MADNESS, GOD, SPEED, RESET';
    this.cheats.add(c[0]);
    return c[1];
  }

  startSolo() { this.beginRun('solo'); }

  async startHost() {
    const ui = this.ui;
    if (!Net.available()) { ui.setStatus('Не загрузилась библиотека PeerJS. Проверьте интернет и обновите страницу.', true); return; }
    ui.setBusy(true); ui.setStatus('Создаём комнату…');
    const net = new Net(this.netHandlers());
    try {
      this.roomCode = await net.host();
      this.net = net;
      ui.setStatus('');
      this.beginRun('host');
    } catch (e) {
      net.close();
      ui.setStatus(this.netErrText(e), true);
    }
    ui.setBusy(false);
  }

  async startGuest(code) {
    const ui = this.ui;
    if (code.length !== 6) { ui.setStatus('Введите 6-значный код комнаты', true); return; }
    if (!Net.available()) { ui.setStatus('Не загрузилась библиотека PeerJS. Проверьте интернет и обновите страницу.', true); return; }
    ui.setBusy(true); ui.setStatus('Подключаемся к комнате ' + code + '…');
    const net = new Net(this.netHandlers());
    this.net = net;
    try {
      await net.join(code);
      const welcome = await new Promise((res, rej) => {
        this.welcomeCb = { res, rej };
        net.send('host', { t: 'hello', n: this.profile.name, c: this.profile.char });
        setTimeout(() => rej({ type: 'timeout' }), 8000);
      });
      this.welcomeCb = null;
      this.roomCode = code;
      ui.setStatus('');
      this.beginRun('guest', welcome);
    } catch (e) {
      this.welcomeCb = null;
      net.close(); this.net = null;
      ui.setStatus(this.netErrText(e), true);
    }
    ui.setBusy(false);
  }

  netErrText(e) {
    switch (e?.type) {
      case 'peer-unavailable': return 'Комната не найдена. Проверьте код — хост должен быть в игре.';
      case 'timeout': return 'Не удалось подключиться (таймаут). Возможно, сеть блокирует прямое соединение.';
      case 'full': return 'Комната заполнена.';
      case 'unavailable-id': return 'Не удалось создать комнату, попробуйте ещё раз.';
      case 'network': case 'server-error': case 'socket-error': case 'socket-closed':
        return 'Нет связи с сервером знакомств PeerJS. Проверьте интернет.';
      case 'browser-incompatible': return 'Ваш браузер не поддерживает WebRTC.';
      default: return 'Ошибка сети' + (e?.type ? ': ' + e.type : '') + '. Попробуйте ещё раз.';
    }
  }

  beginRun(mode, welcome = null) {
    const ui = this.ui;
    this.mode = mode;
    this.state = 'play';
    this.time = 0;
    clearRoomCache();
    this.seed = welcome ? welcome.seed : (Math.random() * 2 ** 31) | 0;
    this.epoch = welcome ? welcome.epoch : 0;
    this.kills = 0;
    this.remote = new Map();
    this.bubbles = new Map();
    this.fx = [];
    this.visited = new Set(welcome ? welcome.vis : ['0,0']);
    this.myId = mode === 'guest' ? this.net.id : 'host';
    this.lastOver = null;

    this.initLocal();
    if (mode === 'guest') {
      this.sim = null;
      this.me.rx = welcome.hrx; this.me.ry = welcome.hry;
      this.me.x = ROOM_W / 2 + (Math.random() * 80 - 40);
      this.me.y = ROOM_H / 2 + 40;
      for (const [id, s] of Object.entries(welcome.players || {})) if (id !== this.myId) this.applyRemote(id, s);
    } else {
      this.sim = new HostSim(this.seed, this.simHooks());
      this.sim.epoch = this.epoch;
    }

    ui.showScreen('game');
    ui.setRoomInfo(this.roomCode, mode);
    ui.clearChat();
    ui.hideOverlay();
    ui.setPlayers(1 + this.remote.size);
    this.resize();
    this.enterRoom(true);
    this.audio.init();
    if (mode === 'guest') this.sendState();
    if (mode === 'host') ui.toast('Комната ' + this.roomCode + ' создана. Отправьте код или ссылку другу!', 4500);
    if (window.innerHeight > window.innerWidth && matchMedia('(pointer: coarse)').matches) {
      setTimeout(() => ui.toast('📱 Поверните телефон горизонтально — играть удобнее', 4000), 800);
    }
  }

  leave() {
    try { this.net?.close(); } catch { /* */ }
    this.net = null; this.sim = null;
    this.state = 'lobby'; this.mode = null; this.me = null;
    this.welcomeCb = null;
    input.clear();
    this.ui.hideOverlay();
    this.ui.showScreen('lobby');
    this.ui.setBusy(false);
  }

  initLocal() {
    const ch = CHARACTERS[this.profile.char] || CHARACTERS.isaac;
    this.me = {
      name: this.profile.name, char: ch.id,
      maxHp: ch.hp, hp: ch.hp, dmg: ch.dmg, delay: ch.delay, speed: ch.speed, range: 0,
      rx: 0, ry: 0, x: ROOM_W / 2, y: ROOM_H / 2 + 40, vx: 0, vy: 0, fx: 0, fy: 1,
      dead: false, inv: 0, coins: 0, cd: 0, walk: 0, moving: false,
    };
  }

  // ======================= комнаты =======================
  get info() { return this.cur.info; }

  get view() {
    if (this.sim) return this.sim.ensureRoom(this.me.rx, this.me.ry);
    if (this.guestView && this.guestView.k === this.cur.key) return this.guestView;
    if (!this.placeholder || this.placeholder.k !== this.cur.key) {
      const kind = this.cur.info.kind;
      this.placeholder = {
        k: this.cur.key, cleared: kind === 'start' || kind === 'treasure',
        chestOpen: false, enemies: [], pickups: [], eshots: [],
      };
    }
    return this.placeholder;
  }

  enterRoom(silent = false) {
    const me = this.me;
    const key = roomKey(me.rx, me.ry);
    this.cur = { key, info: getRoomInfo(this.seed, me.rx, me.ry) };
    this.visited.add(key);
    this.shots = [];
    this.guestView = null;
    this.placeholder = null;
    if (this.sim) this.sim.ensureRoom(me.rx, me.ry);
    if (!silent) {
      this.ui.banner(this.cur.info.theme.label, KIND_LABEL[this.cur.info.kind]);
    }
  }

  go(dx, dy) {
    const me = this.me;
    me.rx += dx; me.ry += dy;
    if (dx === 1) me.x = WALL + 24; else if (dx === -1) me.x = ROOM_W - WALL - 24;
    if (dy === 1) me.y = WALL + 24; else if (dy === -1) me.y = ROOM_H - WALL - 24;
    this.audio.door();
    this.enterRoom();
    this.sendState();
  }

  // ======================= игрок =======================
  localState() {
    const m = this.me;
    return {
      n: m.name, c: m.char, rx: m.rx, ry: m.ry, x: r1(m.x), y: r1(m.y), fx: r2(m.fx), fy: r2(m.fy),
      hp: m.hp, mh: m.maxHp, d: m.dead ? 1 : 0, m: m.moving ? 1 : 0, iv: m.inv > 0 ? 1 : 0, co: m.coins,
    };
  }

  sendState() {
    if (this.mode === 'guest') this.net?.send('host', { t: 'st', e: this.epoch, s: this.localState() });
  }

  updateLocal(dt) {
    const me = this.me;
    if (me.inv > 0) me.inv -= dt;
    if (me.dead) { me.moving = false; return; }

    const ch = CHARACTERS[me.char];
    const mv = input.moveVec();
    const sp = me.speed * (this.cheats.has('SPEED') ? 1.45 : 1);
    const k = Math.min(1, dt * 14);
    me.vx += (mv.x * sp - me.vx) * k;
    me.vy += (mv.y * sp - me.vy) * k;
    me.moving = Math.hypot(mv.x, mv.y) > 0.1;

    me.x += me.vx * dt;
    me.y += me.vy * dt;

    const info = this.info, view = this.view;
    if (!ch.fly) resolveObstacles(me, PLAYER_R - 2, info.obstacles);
    const open = view.cleared;
    clampRoom(me, PLAYER_R, open);

    if (me.moving) {
      me.walk += dt * sp * 0.05;
      this.timers.step -= dt;
      if (this.timers.step <= 0) { this.audio.step(); this.timers.step = 0.28; }
      me.fx = mv.x; me.fy = mv.y;
    }

    this.shoot(dt, ch);

    if (open) {
      if (me.y < 6) this.go(0, -1);
      else if (me.y > ROOM_H - 6) this.go(0, 1);
      else if (me.x < 6) this.go(-1, 0);
      else if (me.x > ROOM_W - 6) this.go(1, 0);
    }

    if (!ch.fly && overlapsSpike(me, PLAYER_R, info.obstacles)) this.hurtLocal(1);
  }

  shoot(dt, ch) {
    const me = this.me;
    me.cd = Math.max(me.cd - dt, -0.05);
    let aim = input.aimVec();
    if (!aim && input.mouse.down && input.mouse.seen) {
      const w = this.screenToWorld(input.mouse.x, input.mouse.y);
      const dx = w.x - me.x, dy = w.y - me.y, l = Math.hypot(dx, dy) || 1;
      aim = { x: dx / l, y: dy / l };
    }
    if (aim) { me.fx = aim.x; me.fy = aim.y; }
    if (!aim || me.cd > 0) return;

    const mad = this.cheats.has('MADNESS');
    const S = SHOT_TYPES[ch.attack];
    const crit = ch.crit > 0 && Math.random() < ch.crit;
    me.cd = me.delay * (mad ? 0.5 : 1);
    const dmg = me.dmg * (mad ? 2 : 1) * (crit ? 2 : 1);
    const shot = {
      k: this.cur.key,
      x: me.x + aim.x * 18, y: me.y + aim.y * 18 - 4,
      vx: aim.x * S.speed + me.vx * 0.35, vy: aim.y * S.speed + me.vy * 0.35,
      life: S.life + me.range, r: S.r * (crit ? 1.35 : 1), dmg,
      pierce: S.pierce, color: crit ? '#fff7ae' : ch.color, ty: ch.attack,
      hit: new Set(), o: this.myId,
    };
    this.emitShot(shot);
    this.audio.shoot(ch.attack);
  }

  emitShot(s) {
    const msg = {
      t: 'shot', o: s.o, k: s.k, x: r1(s.x), y: r1(s.y), vx: r1(s.vx), vy: r1(s.vy),
      l: r2(s.life), r: s.r, d: s.dmg, p: s.pierce ? 1 : 0, c: s.color, ty: s.ty,
    };
    if (this.sim) { this.sim.shots.push(s); this.net?.broadcast(msg); }
    else { this.shots.push(s); this.net?.send('host', msg); }
  }

  shotFromMsg(m) {
    return {
      k: m.k, x: m.x, y: m.y, vx: m.vx, vy: m.vy, life: Math.min(m.l, 3), r: m.r,
      dmg: Math.min(Math.max(m.d, 0), 60), pierce: !!m.p, color: m.c, ty: m.ty, hit: new Set(), o: m.o,
    };
  }

  hurtLocal(d) {
    const me = this.me;
    if (!me || me.dead || me.inv > 0 || this.state !== 'play') return;
    if (this.cheats.has('GOD')) return;
    me.hp = Math.max(0, me.hp - d);
    me.inv = 1.2;
    this.shake = 8;
    this.audio.hurt();
    this.burst(me.x, me.y, '#dc2626', 8, 110);
    if (me.hp <= 0) this.die();
  }

  die() {
    const me = this.me;
    me.dead = true; me.vx = me.vy = 0;
    this.audio.die();
    if (this.mode !== 'solo') this.ui.banner('💀 Вы погибли', 'Когда напарник зачистит комнату — вы воскреснете');
    this.sendState();
  }

  reviveLocal() {
    const me = this.me;
    if (!me || !me.dead) return;
    me.dead = false;
    me.hp = Math.max(2, Math.ceil(me.maxHp / 2));
    me.inv = 2.5;
    this.audio.powerup();
    this.ui.banner('✨ Воскрешён!', 'Напарник зачистил комнату');
    this.sendState();
  }

  applyCollect(kind) {
    const me = this.me;
    if (!me || me.dead) return;
    if (kind === 'heart') {
      me.hp = Math.min(me.maxHp, me.hp + 2);
      this.audio.pickup();
    } else if (kind === 'coin') {
      me.coins++;
      this.audio.pickup();
    } else if (kind.startsWith('up:')) {
      const u = kind.slice(3);
      switch (u) {
        case 'dmg': me.dmg += 1; break;
        case 'rate': me.delay = Math.max(0.12, me.delay * 0.85); break;
        case 'speed': me.speed += 22; break;
        case 'hp': me.maxHp = Math.min(24, me.maxHp + 2); me.hp = Math.min(me.maxHp, me.hp + 2); break;
        case 'range': me.range += 0.12; break;
      }
      this.audio.powerup();
      const up = UPGRADES[u];
      if (up) this.ui.banner(up.icon + ' ' + up.label, 'Предмет подобран');
    }
  }

  // ======================= хост-хуки =======================
  simHooks() {
    return {
      hurt: (id, d) => (id === 'host' ? this.hurtLocal(d) : this.net?.send(id, { t: 'hurt', d })),
      collect: (id, k) => (id === 'host' ? this.applyCollect(k) : this.net?.send(id, { t: 'collect', k })),
      revive: id => (id === 'host' ? this.reviveLocal() : this.net?.send(id, { t: 'revive' })),
      visited: k => { this.visited.add(k); this.net?.broadcast({ t: 'vis', k }); },
      gameOver: stats => this.onGameOver(stats),
      shotEnd: s => { if (this.cur && s.k === this.cur.key) this.burst(s.x, s.y, s.color, 4, 70); },
    };
  }

  onGameOver(stats) {
    this.state = 'over';
    this.lastOver = stats;
    this.net?.broadcast({ t: 'over', s: stats });
    this.showOver(stats, true);
  }

  showOver(stats, canRestart) {
    this.ui.showOverlay({
      title: 'ВЫ ПОГИБЛИ',
      text: canRestart ? 'Начать заново с новым подвалом?' : 'Ждём, пока хост начнёт новую игру…',
      stats: `Убито: ${stats.kills}  •  Комнат открыто: ${stats.rooms}`,
      canRestart,
    });
  }

  restartRun() {
    if (!this.sim) return;
    const seed = (Math.random() * 2 ** 31) | 0;
    this.epoch++;
    this.seed = seed;
    clearRoomCache();
    this.sim.reset(seed);
    this.sim.epoch = this.epoch;
    this.sim.players.clear();
    this.net?.broadcast({ t: 'restart', seed, epoch: this.epoch });
    this.resetRun();
  }

  resetRun() {
    this.visited = new Set(['0,0']);
    this.kills = 0;
    this.fx = [];
    this.initLocal();
    this.state = 'play';
    this.lastOver = null;
    this.ui.hideOverlay();
    this.enterRoom(true);
    this.ui.banner('Новая игра', 'Удачи!');
    this.sendState();
  }

  // ======================= сеть =======================
  netHandlers() {
    return {
      onConnect: () => {},
      onMessage: (id, m) => this.onNet(id, m),
      onDisconnect: id => this.onNetClose(id),
      onError: e => {
        if (this.state === 'lobby') return;
        this.ui.toast('Сеть: ' + (e?.type || 'ошибка'));
      },
    };
  }

  onNetClose(id) {
    if (this.mode === 'guest' || id === 'host') {
      if (this.welcomeCb) { this.welcomeCb.rej({ type: 'closed' }); return; }
      if (this.state !== 'lobby') {
        this.leave();
        this.ui.setStatus('Хост отключился — игра завершена.', true);
      }
      return;
    }
    // хост: ушёл гость
    const p = this.sim?.players.get(id);
    this.sim?.removePlayer(id);
    this.remote.delete(id);
    this.net?.broadcast({ t: 'leave', id });
    this.ui.toast(`${p?.n || 'Игрок'} вышел`);
    this.ui.addChat({ system: true, text: `${p?.n || 'Игрок'} вышел из комнаты` });
    this.ui.setPlayers(1 + this.remote.size);
  }

  onNet(id, m) {
    if (!m || typeof m !== 'object') return;
    if (this.mode === 'guest' || id === 'host') return this.onGuestMsg(m);
    return this.onHostMsg(id, m);
  }

  onHostMsg(id, m) {
    if (this.state === 'lobby' || !this.sim) return;
    switch (m.t) {
      case 'hello': {
        const n = String(m.n || 'Player').slice(0, 12);
        const c = CHARACTERS[m.c] ? m.c : 'isaac';
        const hp = CHARACTERS[c].hp;
        this.sim.setPlayer(id, { n, c, rx: this.me.rx, ry: this.me.ry, x: this.me.x, y: this.me.y, fx: 0, fy: 1, hp, mh: hp, d: 0, m: 0, iv: 0, co: 0 });
        const players = { host: this.localState() };
        for (const [pid, p] of this.sim.players) if (pid !== id) players[pid] = p;
        this.net.send(id, {
          t: 'welcome', seed: this.seed, epoch: this.epoch, vis: [...this.visited],
          hrx: this.me.rx, hry: this.me.ry, players,
        });
        if (this.state === 'over' && this.lastOver) this.net.send(id, { t: 'over', s: this.lastOver });
        this.net.broadcast({ t: 'join', id, n, c }, id);
        this.applyRemote(id, this.sim.players.get(id));
        this.ui.toast(`${n} присоединился!`);
        this.ui.addChat({ system: true, text: `${n} присоединился к игре` });
        this.ui.setPlayers(1 + this.remote.size);
        this.audio.join();
        break;
      }
      case 'st':
        if (m.e !== this.sim.epoch || !m.s || !this.sim.players.has(id)) return;
        this.sanitizeState(m.s);
        this.sim.setPlayer(id, m.s);
        break;
      case 'shot': {
        const s = this.shotFromMsg(m); s.o = id;
        this.sim.shots.push(s);
        this.net.broadcast({ ...m, o: id }, id);
        break;
      }
      case 'chat': {
        const p = this.sim.players.get(id);
        const text = String(m.x || '').slice(0, 60);
        if (!text) return;
        const color = CHARACTERS[p?.c]?.color;
        this.showChat(id, p?.n || 'Игрок', text, color, false);
        this.net.broadcast({ t: 'chat', o: id, n: p?.n, x: text, c: color }, id);
        break;
      }
      case 'ping':
        this.net.send(id, { t: 'pong', ts: m.ts });
        break;
    }
  }

  sanitizeState(s) {
    s.n = String(s.n || 'Player').slice(0, 12);
    if (!CHARACTERS[s.c]) s.c = 'isaac';
    for (const k of ['rx', 'ry']) s[k] = s[k] | 0;
    s.x = Number(s.x) || 0; s.y = Number(s.y) || 0;
  }

  onGuestMsg(m) {
    switch (m.t) {
      case 'welcome': this.welcomeCb?.res(m); this.welcomeCb = null; return;
      case 'full': this.welcomeCb?.rej({ type: 'full' }); return;
    }
    if (this.state === 'lobby') return;
    switch (m.t) {
      case 'w': this.applyWorld(m); break;
      case 'shot':
        if (m.o !== this.myId && m.k === this.cur.key) this.shots.push(this.shotFromMsg(m));
        break;
      case 'chat': {
        if (m.o === this.myId) break;
        this.showChat(m.o, m.n || 'Игрок', String(m.x || '').slice(0, 60), m.c, false);
        break;
      }
      case 'join':
        this.ui.toast(`${m.n} присоединился!`);
        this.ui.addChat({ system: true, text: `${m.n} присоединился к игре` });
        this.audio.join();
        break;
      case 'leave': {
        const r = this.remote.get(m.id);
        this.ui.addChat({ system: true, text: `${r?.name || 'Игрок'} вышел из комнаты` });
        this.remote.delete(m.id);
        this.ui.setPlayers(1 + this.remote.size);
        break;
      }
      case 'hurt': this.hurtLocal(m.d | 0 || 1); break;
      case 'collect': this.applyCollect(String(m.k)); break;
      case 'revive': this.reviveLocal(); break;
      case 'vis': this.visited.add(m.k); break;
      case 'over':
        this.state = 'over'; this.lastOver = m.s;
        this.showOver(m.s || { kills: 0, rooms: this.visited.size }, false);
        break;
      case 'restart':
        this.seed = m.seed; this.epoch = m.epoch;
        clearRoomCache();
        this.resetRun();
        break;
      case 'pong':
        this.ui.setPing(Math.round(performance.now() - m.ts));
        break;
    }
  }

  applyWorld(m) {
    const seen = new Set();
    for (const [id, s] of Object.entries(m.p || {})) {
      if (id === this.myId) continue;
      seen.add(id);
      this.applyRemote(id, s);
    }
    for (const id of [...this.remote.keys()]) if (!seen.has(id)) this.remote.delete(id);
    this.ui.setPlayers(1 + this.remote.size);
    this.kills = m.kl || 0;
    if (m.r && m.r.k === this.cur.key) this.applyRoomSnap(m.r);
  }

  applyRoomSnap(s) {
    const prev = new Map((this.guestView?.enemies || []).map(e => [e.id, e]));
    const enemies = s.e.map(d => {
      let e = prev.get(d.i);
      if (!e) e = { id: d.i, x: d.x, y: d.y };
      Object.assign(e, {
        type: d.t, tx: d.x, ty: d.y, hp: d.h, maxhp: d.m,
        flash: d.f ? 0.1 : 0, spawn: d.s ? 1 : 0, state: d.st, ang: d.a, r: ENEMY_TYPES[d.t]?.r || 14,
      });
      return e;
    });
    this.guestView = {
      k: s.k, cleared: !!s.cl, chestOpen: !!s.co, enemies,
      pickups: s.p.map(p => ({ id: p.i, kind: p.k, x: p.x, y: p.y })),
      eshots: s.s.map(q => ({ x: q.x, y: q.y, vx: q.vx, vy: q.vy, r: q.r })),
    };
  }

  applyRemote(id, s) {
    if (!s) return;
    let r = this.remote.get(id);
    if (!r) { r = { x: s.x, y: s.y, tx: s.x, ty: s.y, walk: 0 }; this.remote.set(id, r); }
    if (r.rx !== s.rx || r.ry !== s.ry) r.jump = true;
    r.name = s.n; r.char = s.c; r.rx = s.rx; r.ry = s.ry;
    r.tx = s.x; r.ty = s.y; r.fx = s.fx; r.fy = s.fy;
    r.hp = s.hp; r.mh = s.mh; r.dead = !!s.d; r.moving = !!s.m; r.inv = !!s.iv; r.coins = s.co;
  }

  // ======================= чат =======================
  sendChat(raw) {
    const text = String(raw || '').trim().slice(0, 60);
    if (!text || !this.me) return;
    if (this.mode === 'solo') { this.ui.toast('Чат доступен в мультиплеер-комнате'); return; }
    const color = CHARACTERS[this.me.char].color;
    this.showChat(this.myId, this.me.name, text, color, true);
    this.net?.broadcast({ t: 'chat', o: this.myId, n: this.me.name, x: text, c: color });
  }

  showChat(id, name, text, color, self) {
    this.ui.addChat({ name, text, color, self });
    this.bubbles.set(id, { text, t: 5 });
    if (!self) this.audio.chat();
  }

  // ======================= главный цикл =======================
  tick(now) {
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt <= 0) return;
    if (dt > 0.1) dt = 0.1;
    this.update(dt);
    if (!document.hidden) this.render();
  }

  update(dt) {
    if (this.state === 'lobby' || !this.me) return;
    this.time += dt;
    const playing = this.state === 'play';

    if (playing) {
      this.updateLocal(dt);
      if (this.sim) {
        this.sim.setPlayer('host', this.localState());
        this.sim.update(dt);
        this.syncRemoteFromSim();
        this.kills = this.sim.kills;
      }
    }
    this.smooth(dt);
    if (playing) this.updateGuestShots(dt);
    this.trackView();
    this.updateFx(dt);
    this.networkTick(dt);
    this.updateHud();
  }

  syncRemoteFromSim() {
    const seen = new Set();
    for (const [id, p] of this.sim.players) {
      if (id === 'host') continue;
      seen.add(id);
      this.applyRemote(id, p);
    }
    for (const id of [...this.remote.keys()]) if (!seen.has(id)) this.remote.delete(id);
  }

  smooth(dt) {
    if (!this.sim && this.guestView) {
      const k = Math.min(1, dt * 16);
      for (const e of this.guestView.enemies) {
        e.x += (e.tx - e.x) * k;
        e.y += (e.ty - e.y) * k;
      }
      for (const s of this.guestView.eshots) { s.x += s.vx * dt; s.y += s.vy * dt; }
    }
    const k = Math.min(1, dt * 14);
    for (const r of this.remote.values()) {
      if (r.jump) { r.x = r.tx; r.y = r.ty; r.jump = false; }
      else { r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; }
      if (r.moving) r.walk += dt * 10;
    }
    for (const [id, b] of this.bubbles) { b.t -= dt; if (b.t <= 0) this.bubbles.delete(id); }
  }

  // На хосте снаряды двигает sim; у гостя — только визуальные копии
  updateGuestShots(dt) {
    if (this.sim) return;
    const view = this.view, obs = this.info.obstacles;
    this.shots = this.shots.filter(s => {
      const res = stepShot(s, dt, obs, view.enemies, null);
      if (res !== null) this.burst(s.x, s.y, s.color, 4, 70);
      return res === null;
    });
  }

  currentShots() {
    return this.sim ? this.sim.shots.filter(s => s.k === this.cur.key) : this.shots;
  }

  // Определяем гибель врагов, зачистку и попадания по изменению вида комнаты
  trackView() {
    const view = this.view;
    const cur = new Map();
    for (const e of view.enemies) cur.set(e.id, { x: e.x, y: e.y, type: e.type, f: e.flash > 0 });
    const t = this.trk;
    if (t.k === view.k) {
      for (const [id, o] of t.en) {
        if (cur.has(id)) continue;
        this.burst(o.x, o.y, o.type === 'fly' ? '#4b5563' : '#b91c1c', o.type === 'boss' ? 30 : 10, 160);
        this.audio.kill();
        if (o.type === 'boss') this.shake = 14;
      }
      for (const [id, o] of cur) {
        const p = t.en.get(id);
        if (p && !p.f && o.f) this.audio.hit();
      }
      if (t.en.size > 0 && !t.cl && view.cleared) {
        this.audio.clear();
        this.ui.banner('Комната зачищена', 'Двери открыты');
      }
    }
    this.trk = { k: view.k, en: cur, cl: view.cleared };
  }

  burst(x, y, color, n = 6, speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.8);
      this.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.25, max: 0.6, color, size: 1.5 + Math.random() * 2.5 });
    }
  }

  updateFx(dt) {
    for (const p of this.fx) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
    if (this.fx.length) this.fx = this.fx.filter(p => p.life > 0);
    this.shake *= 0.88;
  }

  networkTick(dt) {
    const net = this.net;
    if (!net) return;
    const T = this.timers;
    if (this.mode === 'guest') {
      T.st += dt; T.ping += dt;
      if (T.st >= 0.05) { T.st = 0; this.sendState(); }
      if (T.ping >= 2) { T.ping = 0; net.send('host', { t: 'ping', ts: performance.now() }); }
    } else if (this.mode === 'host' && net.conns.size) {
      T.w += dt;
      if (T.w < 1 / 15) return;
      T.w = 0;
      const players = { host: this.localState() };
      for (const [id, p] of this.sim.players) if (id !== 'host') players[id] = p;
      const snaps = new Map();
      for (const id of net.conns.keys()) {
        const p = this.sim.players.get(id);
        let r = null;
        if (p) {
          const k = roomKey(p.rx, p.ry);
          if (!snaps.has(k)) snaps.set(k, this.sim.snapshotRoom(k));
          r = snaps.get(k);
        }
        net.send(id, { t: 'w', p: players, r, kl: this.sim.kills });
      }
    }
  }

  updateHud() {
    const me = this.me;
    this.ui.setHearts(me.hp, me.maxHp);
    this.ui.setStats({ coins: me.coins, kills: this.kills, rooms: this.visited.size });
  }

  // ======================= отрисовка =======================
  render() {
    if (this.state === 'lobby' || !this.me || !this.cur) return;
    const ctx = this.ctx, dpr = this.dpr, t = this.time, me = this.me;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050303';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const sx = this.shake > 0.3 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0.3 ? (Math.random() - 0.5) * this.shake : 0;
    ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scale, dpr * (this.ox + sx), dpr * (this.oy + sy));
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, ROOM_W, ROOM_H); ctx.clip();

    const info = this.info, view = this.view;
    R.drawRoom(ctx, info, view, t);
    for (const pk of view.pickups) R.drawPickup(ctx, pk, t);

    const items = [];
    const meCh = CHARACTERS[me.char];
    const blink = me.inv > 0 && !me.dead && Math.sin(t * 40) > 0;
    items.push({
      y: me.y,
      f: () => {
        R.drawCharacter(ctx, meCh, { x: me.x, y: me.y, fx: me.fx, fy: me.fy, walk: me.walk, moving: me.moving, alpha: blink ? 0.35 : 1, t, dead: me.dead });
        R.drawLabel(ctx, me.x, me.y - 44, me.name, '#fde68a');
        const b = this.bubbles.get(this.myId);
        if (b) R.drawBubble(ctx, me.x, me.y - 50, b.text);
      },
    });
    for (const [id, r] of this.remote) {
      if (r.rx !== me.rx || r.ry !== me.ry) continue;
      const ch = CHARACTERS[r.char] || CHARACTERS.isaac;
      items.push({
        y: r.y,
        f: () => {
          R.drawCharacter(ctx, ch, { x: r.x, y: r.y, fx: r.fx, fy: r.fy, walk: r.walk, moving: r.moving, alpha: r.inv ? 0.5 : 1, t, dead: r.dead });
          R.drawLabel(ctx, r.x, r.y - 44, r.name, ch.color);
          const b = this.bubbles.get(id);
          if (b) R.drawBubble(ctx, r.x, r.y - 50, b.text);
        },
      });
    }
    for (const e of view.enemies) items.push({ y: e.y, f: () => R.drawEnemy(ctx, e, t) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();

    for (const s of this.currentShots()) R.drawShot(ctx, s, t);
    for (const s of view.eshots) R.drawEnemyShot(ctx, s);
    R.drawParticles(ctx, this.fx);

    const boss = view.enemies.find(e => e.type === 'boss');
    if (boss) R.drawBossBar(ctx, boss);

    if (this.cheats.has('MADNESS')) {
      ctx.fillStyle = `rgba(190,0,0,${0.07 + 0.04 * Math.sin(t * 6)})`;
      ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    }
    ctx.restore();

    const size = this.ui.el.minimap.width;
    const others = [];
    for (const r of this.remote.values()) others.push({ rx: r.rx, ry: r.ry, color: (CHARACTERS[r.char] || CHARACTERS.isaac).color });
    R.drawMinimap(this.mm, size, this.seed, me, this.visited, others);
  }
}