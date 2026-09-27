// Мультиплеер через WebRTC (PeerJS). Сервер на Vercel не нужен:
// PeerJS Cloud нужен только для «знакомства» игроков, дальше данные идут напрямую.
import { MAX_PLAYERS } from './config.js';

const PREFIX = 'isaacflash-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без 0/O/1/I

// STUN помогает пробиться через NAT. TURN — запасной вариант для «строгих» сетей
// (мобильные операторы, корпоративные Wi-Fi). Публичный TURN может быть перегружен —
// при желании поставьте свой (см. README).
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

export const normalizeCode = s => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const makeCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export class Net {
  /** handlers: onConnect(id), onMessage(id,msg), onDisconnect(id), onError(err) */
  constructor(handlers) {
    this.h = handlers;
    this.peer = null;
    this.conns = new Map(); // host: id -> conn
    this.hostConn = null;   // guest: соединение с хостом
    this.role = null;
    this.id = null;
    this.code = null;
  }

  static available() { return typeof window !== 'undefined' && typeof window.Peer === 'function'; }

  _open(id) {
    return new Promise((resolve, reject) => {
      const opts = { config: { iceServers: ICE_SERVERS }, debug: 1 };
      const p = id ? new window.Peer(id, opts) : new window.Peer(opts);
      const timer = setTimeout(() => { try { p.destroy(); } catch { /* */ } reject({ type: 'timeout' }); }, 12000);
      p.on('open', () => { clearTimeout(timer); this.peer = p; resolve(); });
      p.on('error', e => { clearTimeout(timer); reject(e); });
    });
  }

  /** Создать комнату. Возвращает 6-значный код. */
  async host() {
    let lastErr;
    for (let i = 0; i < 5; i++) {
      const code = makeCode();
      try {
        await this._open(PREFIX + code);
        this.code = code;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (e?.type !== 'unavailable-id') break;
      }
    }
    if (lastErr || !this.peer) throw lastErr || { type: 'unknown' };

    this.role = 'host';
    this.id = 'host';
    this.peer.on('connection', conn => this._incoming(conn));
    this.peer.on('error', e => this.h.onError?.(e));
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch { /* */ } });
    return this.code;
  }

  _incoming(conn) {
    conn.on('open', () => {
      if (this.conns.size >= MAX_PLAYERS - 1) {
        conn.send({ t: 'full' });
        setTimeout(() => { try { conn.close(); } catch { /* */ } }, 400);
        return;
      }
      this.conns.set(conn.peer, conn);
      this.h.onConnect?.(conn.peer);
    });
    conn.on('data', d => { if (this.conns.has(conn.peer)) this.h.onMessage?.(conn.peer, d); });
    conn.on('close', () => {
      if (this.conns.delete(conn.peer)) this.h.onDisconnect?.(conn.peer);
    });
    conn.on('error', () => {
      if (this.conns.delete(conn.peer)) this.h.onDisconnect?.(conn.peer);
    });
  }

  /** Подключиться к комнате по коду. */
  async join(code) {
    await this._open(null);
    this.role = 'guest';
    this.id = this.peer.id;
    await new Promise((resolve, reject) => {
      const conn = this.peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      const timer = setTimeout(() => reject({ type: 'timeout' }), 15000);
      const onPeerErr = e => { clearTimeout(timer); reject(e); };
      this.peer.on('error', onPeerErr);
      conn.on('open', () => {
        clearTimeout(timer);
        this.peer.off('error', onPeerErr);
        this.peer.on('error', e => this.h.onError?.(e));
        this.hostConn = conn;
        conn.on('data', d => this.h.onMessage?.('host', d));
        conn.on('close', () => this.h.onDisconnect?.('host'));
        conn.on('error', () => this.h.onDisconnect?.('host'));
        resolve();
      });
    });
  }

  send(id, msg) {
    try {
      const c = this.role === 'host' ? this.conns.get(id) : this.hostConn;
      if (c && c.open) c.send(msg);
    } catch { /* соединение могло закрыться */ }
  }

  broadcast(msg, exceptId = null) {
    if (this.role === 'host') {
      for (const [id, c] of this.conns) {
        if (id !== exceptId && c.open) { try { c.send(msg); } catch { /* */ } }
      }
    } else this.send('host', msg);
  }

  get peerCount() { return this.role === 'host' ? this.conns.size : 0; }

  close() {
    try { this.hostConn?.close(); } catch { /* */ }
    for (const c of this.conns.values()) { try { c.close(); } catch { /* */ } }
    this.conns.clear();
    try { this.peer?.destroy(); } catch { /* */ }
    this.peer = null; this.hostConn = null; this.role = null;
  }
}
