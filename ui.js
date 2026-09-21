// Всё, что касается DOM: лобби, HUD, чат, оверлеи
import { CHARACTERS } from './config.js';

const $ = id => document.getElementById(id);

export const el = {
  lobby: $('screenLobby'), game: $('screenGame'), toast: $('toast'), toastMsg: $('toastMsg'),
  name: $('inputName'), grid: $('charGrid'), charTitle: $('selectedChar'),
  btnSolo: $('btnSolo'), btnCreate: $('btnCreate'), btnJoin: $('btnJoin'), inputRoom: $('inputRoom'),
  inputCheat: $('inputCheat'), btnCheat: $('btnCheat'), status: $('lobbyStatus'),
  invite: $('inviteBox'), inviteCode: $('inviteCode'), cheatList: $('cheatList'),
  topBar: $('topBar'), roomCode: $('uiRoomCode'), btnCopy: $('btnCopy'), players: $('uiPlayers'), ping: $('uiPing'),
  hearts: $('hearts'), coins: $('uiCoins'), kills: $('uiKills'), rooms: $('uiRooms'),
  btnMute: $('btnMute'), btnChat: $('btnChat'), chatBadge: $('chatBadge'), btnLeave: $('btnLeave'),
  canvas: $('gameCanvas'), minimap: $('minimap'), banner: $('banner'), touch: $('touchControls'),
  chat: $('chatBox'), chatMsgs: $('chatMessages'), chatForm: $('chatForm'), chatInput: $('chatInput'), btnCloseChat: $('btnCloseChat'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), ovStats: $('ovStats'),
  btnRestart: $('btnRestart'), btnOvLobby: $('btnOvLobby'),
};

let toastTimer = 0;
let bannerTimer = 0;
let lastHearts = '';
let unread = 0;

export const ui = {
  el,

  toast(msg, ms = 2600) {
    el.toastMsg.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
  },

  showScreen(name) {
    el.lobby.hidden = name !== 'lobby';
    el.game.hidden = name !== 'game';
  },

  setStatus(text, isError = false) {
    el.status.textContent = text || '';
    el.status.classList.toggle('err', !!isError);
    el.status.hidden = !text;
  },

  setBusy(busy) {
    for (const b of [el.btnSolo, el.btnCreate, el.btnJoin]) b.disabled = busy;
  },

  buildCharacters(selected, onSelect) {
    el.grid.innerHTML = '';
    for (const ch of Object.values(CHARACTERS)) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'char-card' + (ch.id === selected ? ' selected' : '');
      card.dataset.char = ch.id;
      card.innerHTML = `
        <span class="avatar" style="background:${ch.skin}">${ch.avatar}</span>
        <span class="cname"></span>
        <span class="cstat">❤${ch.hp / 2} ⚔${ch.dmg}</span>
        <span class="cdesc"></span>`;
      card.querySelector('.cname').textContent = ch.name;
      card.querySelector('.cdesc').textContent = ch.desc;
      card.addEventListener('click', () => {
        el.grid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        el.charTitle.textContent = ch.name;
        onSelect(ch.id);
      });
      el.grid.appendChild(card);
    }
    el.charTitle.textContent = CHARACTERS[selected].name;
  },

  setRoomInfo(code, mode) {
    el.roomCode.textContent = code || 'СОЛО';
    el.btnCopy.hidden = mode !== 'host';
    el.ping.hidden = mode !== 'guest';
    el.btnChat.hidden = mode === 'solo';
    if (mode === 'solo') this.setChatVisible(false);
  },

  setPlayers(n) { el.players.textContent = n; },
  setPing(ms) { el.ping.textContent = ms == null ? '' : ms + ' мс'; },

  setHearts(hp, max) {
    const key = hp + '/' + max;
    if (key === lastHearts) return;
    lastHearts = key;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < Math.ceil(max / 2); i++) {
      const left = hp - i * 2;
      const s = document.createElement('span');
      s.className = 'heart ' + (left >= 2 ? 'full' : left === 1 ? 'half' : 'empty');
      s.textContent = '♥';
      frag.appendChild(s);
    }
    el.hearts.replaceChildren(frag);
  },

  setStats({ coins, kills, rooms }) {
    el.coins.textContent = coins;
    el.kills.textContent = kills;
    el.rooms.textContent = rooms;
  },

  banner(text, sub = '') {
    el.banner.innerHTML = '';
    const a = document.createElement('div'); a.className = 'b1'; a.textContent = text;
    el.banner.appendChild(a);
    if (sub) { const b = document.createElement('div'); b.className = 'b2'; b.textContent = sub; el.banner.appendChild(b); }
    el.banner.classList.remove('show'); void el.banner.offsetWidth; el.banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.banner.classList.remove('show'), 2200);
  },

  // ----- чат -----
  chatVisible: false,
  setChatVisible(v) {
    this.chatVisible = v;
    el.chat.hidden = !v;
    if (v) { unread = 0; el.chatBadge.hidden = true; el.chatMsgs.scrollTop = el.chatMsgs.scrollHeight; }
  },
  addChat({ name, text, color, self, system }) {
    const row = document.createElement('div');
    row.className = 'msg' + (system ? ' sys' : '');
    if (system) row.textContent = text;
    else {
      const n = document.createElement('b');
      n.textContent = name + ': ';
      n.style.color = color || '#fbbf24';
      const t = document.createElement('span');
      t.textContent = text;
      row.append(n, t);
    }
    el.chatMsgs.appendChild(row);
    while (el.chatMsgs.children.length > 60) el.chatMsgs.firstChild.remove();
    el.chatMsgs.scrollTop = el.chatMsgs.scrollHeight;
    if (!this.chatVisible && !self && !system) {
      unread++;
      el.chatBadge.textContent = unread;
      el.chatBadge.hidden = false;
    }
  },
  clearChat() {
    el.chatMsgs.innerHTML = '';
    this.addChat({ system: true, text: 'Добро пожаловать в чат комнаты!' });
  },

  // ----- оверлей смерти / конца игры -----
  showOverlay({ title, text, stats, canRestart }) {
    el.ovTitle.textContent = title;
    el.ovText.textContent = text || '';
    el.ovStats.textContent = stats || '';
    el.btnRestart.hidden = !canRestart;
    el.overlay.hidden = false;
  },
  hideOverlay() { el.overlay.hidden = true; },
};