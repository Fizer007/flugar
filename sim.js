// Авторитетная симуляция. Работает у хоста (и в соло-режиме).
// Гости получают от хоста снимки комнаты и рисуют их.
import { ROOM_W, ROOM_H, WALL, PLAYER_R, ENEMY_TYPES, UPGRADES } from './config.js';
import { getRoomInfo } from './world.js';
import { SOLID, resolveObstacles, clampRoom, rectDist, lerp } from './physics.js';

export const roomKey = (rx, ry) => rx + ',' + ry;
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/**
 * Один шаг снаряда. Общая функция: хост применяет урон (onHit),
 * гости используют её только для визуала (onHit = null).
 * Возвращает null, если снаряд жив, иначе причину: expire|wall|obstacle|hit.
 */
export function stepShot(s, dt, obstacles, enemies, onHit) {
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.life -= dt;
  if (s.life <= 0) return 'expire';
  if (s.x < WALL - 4 || s.x > ROOM_W - WALL + 4 || s.y < WALL - 4 || s.y > ROOM_H - WALL + 4) return 'wall';
  for (const o of obstacles) {
    if (!SOLID.has(o.type)) continue;
    if (Math.abs(s.x - o.x) < o.w / 2 + s.r * 0.5 && Math.abs(s.y - o.y) < o.h / 2 + s.r * 0.5) return 'obstacle';
  }
  for (const e of enemies) {
    if (e.spawn > 0 || s.hit.has(e.id)) continue;
    if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) {
      if (onHit) onHit(e, s);
      if (s.pierce) s.hit.add(e.id);
      else return 'hit';
    }
  }
  return null;
}

export class HostSim {
  constructor(seed, hooks = {}) {
    this.hooks = hooks;
    this.players = new Map(); // id -> состояние игрока (присылает сам клиент)
    this.epoch = 0;
    this.reset(seed);
  }

  reset(seed) {
    this.seed = seed;
    this.rooms = new Map();
    this.shots = [];
    this.kills = 0;
    this.nid = 1;
    this.time = 0;
    this.over = false;
    this.visited = new Set(['0,0']);
  }

  setPlayer(id, st) {
    const old = this.players.get(id);
    this.players.set(id, old ? Object.assign(old, st) : { ...st });
  }
  removePlayer(id) { this.players.delete(id); }

  markVisited(k) {
    if (this.visited.has(k)) return;
    this.visited.add(k);
    this.hooks.visited?.(k);
  }

  // ---------- комнаты ----------
  ensureRoom(rx, ry) {
    const k = roomKey(rx, ry);
    let R = this.rooms.get(k);
    if (R) return R;
    const info = getRoomInfo(this.seed, rx, ry);
    R = { k, rx, ry, info, cleared: false, chestOpen: false, enemies: [], pickups: [], eshots: [] };
    this.rooms.set(k, R);
    this.markVisited(k);

    if (info.kind === 'start') R.cleared = true;
    else if (info.kind === 'treasure') {
      R.cleared = true;
      this.addPickup(R, 'up:' + pick(Object.keys(UPGRADES)), ROOM_W / 2, ROOM_H / 2);
    } else if (info.kind === 'boss') {
      const hpMul = 1 + info.d * 0.05;
      this.addEnemy(R, 'boss', ROOM_W / 2, 170, hpMul, 1.6);
    } else {
      this.spawnWave(R);
    }
    return R;
  }

  spawnWave(R) {
    const d = R.info.d;
    const n = Math.min(8, 2 + Math.floor(d / 2) + Math.floor(Math.random() * 2) + (d > 0 ? 1 : 0));
    const weights = {
      fly: ENEMY_TYPES.fly.w,
      gaper: ENEMY_TYPES.gaper.w,
      spitter: 0.8 + d * 0.25,
      charger: 0.8 + d * 0.25,
    };
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    const hpMul = 1 + d * 0.08;
    for (let i = 0; i < n; i++) {
      let roll = Math.random() * total, type = 'fly';
      for (const [t, w] of Object.entries(weights)) { roll -= w; if (roll <= 0) { type = t; break; } }
      const T = ENEMY_TYPES[type];
      const p = this.findSpawn(R, T.r);
      this.addEnemy(R, type, p.x, p.y, hpMul);
    }
  }

  findSpawn(R, r) {
    for (let i = 0; i < 60; i++) {
      const x = WALL + 70 + Math.random() * (ROOM_W - 2 * WALL - 140);
      const y = WALL + 70 + Math.random() * (ROOM_H - 2 * WALL - 140);
      let ok = true;
      for (const o of R.info.obstacles) {
        if (SOLID.has(o.type) && rectDist(x, y, o) < r + 14) { ok = false; break; }
      }
      if (ok) for (const e of R.enemies) if (Math.hypot(e.x - x, e.y - y) < 60) { ok = false; break; }
      if (ok) for (const p of this.players.values()) {
        if (p.rx === R.rx && p.ry === R.ry && Math.hypot(p.x - x, p.y - y) < 150) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return { x: ROOM_W / 2, y: ROOM_H / 2 };
  }

  addEnemy(R, type, x, y, hpMul = 1, spawn) {
    const T = ENEMY_TYPES[type];
    const hp = Math.round(T.hp * hpMul * 10) / 10;
    R.enemies.push({
      id: this.nid++, type, x, y, vx: 0, vy: 0, hp, maxhp: hp, r: T.r,
      spawn: spawn ?? 0.9 + Math.random() * 0.4, flash: 0,
      cd: 0.8 + Math.random(), state: 'move', st: 0, ang: Math.random() * 6.28,
      touch: {}, t: Math.random() * 10,
    });
  }

  addPickup(R, kind, x, y) {
    R.pickups.push({ id: this.nid++, kind, x, y });
  }

  // ---------- главный шаг ----------
  update(dt) {
    if (this.over) return;
    this.time += dt;

    // кто в какой комнате
    const byRoom = new Map();
    for (const [id, p] of this.players) {
      if (p.rx == null) continue;
      const R = this.ensureRoom(p.rx, p.ry);
      let list = byRoom.get(R.k);
      if (!list) byRoom.set(R.k, list = []);
      list.push({ id, p });
    }

    for (const [k, list] of byRoom) {
      const R = this.rooms.get(k);
      const alive = list.filter(q => !q.p.d);
      this.updateEnemies(R, alive, dt);
      this.updateEnemyShots(R, alive, dt);
      this.updatePickups(R, alive);
      this.updateChest(R, alive);
    }

    // выстрелы игроков
    this.shots = this.shots.filter(s => {
      const R = this.rooms.get(s.k);
      if (!R || !byRoom.has(s.k)) return false;
      const res = stepShot(s, dt, R.info.obstacles, R.enemies, (e, sh) => this.damageEnemy(R, e, sh));
      return res === null;
    });
    // убитых удаляем после прохода по снарядам
    for (const R of this.rooms.values()) this.sweepDead(R);

    // все погибли?
    if (this.players.size > 0 && [...this.players.values()].every(p => p.d)) {
      this.over = true;
      this.hooks.gameOver?.({ kills: this.kills, rooms: this.visited.size });
    }
  }

  // ---------- враги ----------
  updateEnemies(R, alive, dt) {
    for (const e of R.enemies) if (!e.dead) this.updateEnemy(R, e, alive, dt);
    // расталкиваем врагов друг от друга
    const en = R.enemies;
    for (let i = 0; i < en.length; i++) {
      for (let j = i + 1; j < en.length; j++) {
        const a = en[i], b = en[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r - 4;
        if (d > 0.01 && d < min) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
        }
      }
    }
  }

  updateEnemy(R, e, alive, dt) {
    const T = ENEMY_TYPES[e.type];
    if (e.flash > 0) e.flash -= dt;
    if (e.spawn > 0) { e.spawn -= dt; return; }
    e.t += dt;
    for (const k in e.touch) e.touch[k] -= dt;

    let tgt = null, td = 1e9;
    for (const q of alive) {
      const d = Math.hypot(q.p.x - e.x, q.p.y - e.y);
      if (d < td) { td = d; tgt = q.p; }
    }
    const px = e.x, py = e.y;

    if (!tgt) {
      e.vx *= 0.9; e.vy *= 0.9;
    } else {
      const dx = tgt.x - e.x, dy = tgt.y - e.y, d = td || 1;
      const ux = dx / d, uy = dy / d;
      const k = Math.min(1, dt * 5);
      switch (e.type) {
        case 'fly': {
          const a = Math.atan2(dy, dx) + Math.sin(e.t * 5 + e.id) * 0.9;
          e.vx = lerp(e.vx, Math.cos(a) * T.speed, k);
          e.vy = lerp(e.vy, Math.sin(a) * T.speed, k);
          break;
        }
        case 'gaper':
          e.vx = lerp(e.vx, ux * T.speed, k);
          e.vy = lerp(e.vy, uy * T.speed, k);
          break;
        case 'spitter': {
          const mv = d < 200 ? -1 : d > 300 ? 1 : 0;
          const sd = Math.sin(e.id) > 0 ? 1 : -1;
          e.vx = lerp(e.vx, ux * T.speed * mv + -uy * sd * T.speed * 0.6, k);
          e.vy = lerp(e.vy, uy * T.speed * mv + ux * sd * T.speed * 0.6, k);
          e.cd -= dt;
          e.state = e.cd < 0.35 ? 'aim' : 'move';
          if (e.cd <= 0) {
            this.enemyShot(R, e.x, e.y, ux * 210, uy * 210, 6);
            e.cd = T.shootDelay;
          }
          break;
        }
        case 'charger':
          if (e.state === 'move') {
            e.vx = lerp(e.vx, ux * T.speed, k);
            e.vy = lerp(e.vy, uy * T.speed, k);
            e.cd -= dt;
            if (e.cd <= 0 && d < 380) { e.state = 'tele'; e.st = 0.55; e.ang = Math.atan2(dy, dx); e.vx = e.vy = 0; }
          } else if (e.state === 'tele') {
            e.st -= dt;
            if (e.st <= 0) { e.state = 'charge'; e.st = 1.2; }
          } else if (e.state === 'charge') {
            e.vx = Math.cos(e.ang) * T.chargeSpeed;
            e.vy = Math.sin(e.ang) * T.chargeSpeed;
            e.st -= dt;
            if (e.st <= 0) { e.state = 'stun'; e.st = 0.7; e.vx = e.vy = 0; }
          } else { // stun
            e.st -= dt; e.vx *= 0.8; e.vy *= 0.8;
            if (e.st <= 0) { e.state = 'move'; e.cd = 1.2 + Math.random(); }
          }
          break;
        case 'boss':
          e.cd -= dt;
          if (e.state === 'move') {
            e.vx = lerp(e.vx, ux * T.speed, dt * 3);
            e.vy = lerp(e.vy, uy * T.speed, dt * 3);
            if (e.cd <= 0) {
              if (Math.random() < 0.55) {
                for (let i = 0; i < 14; i++) {
                  const a = (i / 14) * Math.PI * 2 + e.t;
                  this.enemyShot(R, e.x, e.y, Math.cos(a) * 170, Math.sin(a) * 170, 7);
                }
                e.cd = 2.2;
              } else { e.state = 'tele'; e.st = 0.7; e.ang = Math.atan2(dy, dx); e.vx = e.vy = 0; }
            }
          } else if (e.state === 'tele') {
            e.st -= dt;
            if (e.st <= 0) { e.state = 'charge'; e.st = 0.75; }
          } else { // charge
            e.vx = Math.cos(e.ang) * 300; e.vy = Math.sin(e.ang) * 300;
            e.st -= dt;
            if (e.st <= 0) {
              e.state = 'move'; e.cd = 1.8; e.vx = e.vy = 0;
              for (let i = -2; i <= 2; i++) {
                const a = Math.atan2(dy, dx) + i * 0.22;
                this.enemyShot(R, e.x, e.y, Math.cos(a) * 220, Math.sin(a) * 220, 7);
              }
            }
          }
          break;
      }
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.type !== 'fly') resolveObstacles(e, e.r, R.info.obstacles);
    clampRoom(e, e.r, false);

    // charger/boss врезались в стену или камень
    if ((e.type === 'charger' && e.state === 'charge')) {
      const moved = Math.hypot(e.x - px - e.vx * dt, e.y - py - e.vy * dt);
      if (moved > 0.8) { e.state = 'stun'; e.st = 0.8; e.vx = e.vy = 0; }
    }

    // урон при касании
    for (const q of alive) {
      if (Math.hypot(q.p.x - e.x, q.p.y - e.y) < e.r + PLAYER_R - 4 && (e.touch[q.id] ?? 0) <= 0) {
        e.touch[q.id] = 0.6;
        const dmg = e.type === 'boss' ? 2 : (e.type === 'charger' && e.state === 'charge') ? 2 : 1;
        this.hooks.hurt?.(q.id, dmg);
      }
    }
  }

  enemyShot(R, x, y, vx, vy, r) {
    R.eshots.push({ x, y, vx, vy, r, life: 4 });
  }

  updateEnemyShots(R, alive, dt) {
    for (const s of R.eshots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0 || s.x < WALL - 6 || s.x > ROOM_W - WALL + 6 || s.y < WALL - 6 || s.y > ROOM_H - WALL + 6) { s.dead = true; continue; }
      for (const o of R.info.obstacles) {
        if (SOLID.has(o.type) && Math.abs(s.x - o.x) < o.w / 2 + s.r * 0.5 && Math.abs(s.y - o.y) < o.h / 2 + s.r * 0.5) { s.dead = true; break; }
      }
      if (s.dead) continue;
      for (const q of alive) {
        if (Math.hypot(q.p.x - s.x, q.p.y - s.y) < s.r + PLAYER_R - 4) {
          this.hooks.hurt?.(q.id, 1);
          s.dead = true;
          break;
        }
      }
    }
    R.eshots = R.eshots.filter(s => !s.dead);
  }

  // ---------- урон и смерть ----------
  damageEnemy(R, e, shot) {
    if (e.dead) return;
    e.hp -= shot.dmg;
    e.flash = 0.12;
    if (e.type !== 'boss') {
      const sp = Math.hypot(shot.vx, shot.vy) || 1;
      e.x += (shot.vx / sp) * 3;
      e.y += (shot.vy / sp) * 3;
    }
    if (e.hp <= 0) {
      e.dead = true;
      this.kills++;
      const roll = Math.random();
      if (e.type !== 'boss') {
        if (roll < 0.22) this.addPickup(R, 'coin', e.x, e.y);
        else if (roll < 0.30) this.addPickup(R, 'heart', e.x, e.y);
      }
    }
  }

  sweepDead(R) {
    if (!R.enemies.some(e => e.dead)) return;
    R.enemies = R.enemies.filter(e => !e.dead);
    if (R.enemies.length === 0 && !R.cleared) {
      R.cleared = true;
      if (R.info.kind === 'boss') {
        this.addPickup(R, 'up:' + pick(Object.keys(UPGRADES)), ROOM_W / 2, ROOM_H / 2);
        this.addPickup(R, 'heart', ROOM_W / 2 - 60, ROOM_H / 2 + 40);
        this.addPickup(R, 'heart', ROOM_W / 2 + 60, ROOM_H / 2 + 40);
      } else if (Math.random() < 0.35) {
        this.addPickup(R, Math.random() < 0.6 ? 'heart' : 'coin', ROOM_W / 2, ROOM_H / 2);
      }
      this.hooks.cleared?.(R.k);
      // клир комнаты воскрешает погибших напарников
      for (const [id, p] of this.players) {
        if (p.d) { p.d = 0; this.hooks.revive?.(id); }
      }
    }
  }

  // ---------- подборы и сундуки ----------
  updatePickups(R, alive) {
    if (!R.pickups.length) return;
    R.pickups = R.pickups.filter(pk => {
      const reach = pk.kind.startsWith('up:') ? 28 : 22;
      for (const q of alive) {
        if (Math.hypot(q.p.x - pk.x, q.p.y - pk.y) > reach) continue;
        if (pk.kind === 'heart' && q.p.hp >= q.p.mh) continue; // полное здоровье — не берём
        this.hooks.collect?.(q.id, pk.kind);
        return false;
      }
      return true;
    });
  }

  updateChest(R, alive) {
    if (R.chestOpen) return;
    const chest = R.info.obstacles.find(o => o.type === 'chest');
    if (!chest) return;
    for (const q of alive) {
      if (rectDist(q.p.x, q.p.y, chest) < PLAYER_R + 8) {
        R.chestOpen = true;
        this.addPickup(R, 'coin', chest.x - 26, chest.y + 44);
        this.addPickup(R, 'coin', chest.x + 26, chest.y + 44);
        if (Math.random() < 0.5) this.addPickup(R, 'heart', chest.x, chest.y + 58);
        if (Math.random() < 0.25) this.addPickup(R, 'up:' + pick(Object.keys(UPGRADES)), chest.x, chest.y + 90);
        break;
      }
    }
  }

  // ---------- снимок комнаты для гостей ----------
  snapshotRoom(k) {
    const R = this.rooms.get(k);
    if (!R) return null;
    return {
      k: R.k, cl: R.cleared ? 1 : 0, co: R.chestOpen ? 1 : 0,
      e: R.enemies.map(e => ({
        i: e.id, t: e.type, x: r1(e.x), y: r1(e.y), h: r1(e.hp), m: e.maxhp,
        f: e.flash > 0 ? 1 : 0, s: e.spawn > 0 ? 1 : 0, st: e.state, a: r2(e.ang),
      })),
      p: R.pickups.map(p => ({ i: p.id, k: p.kind, x: r1(p.x), y: r1(p.y) })),
      s: R.eshots.map(s => ({ x: r1(s.x), y: r1(s.y), vx: r1(s.vx), vy: r1(s.vy), r: s.r })),
    };
  }
}