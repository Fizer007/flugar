// ===== Точка входа: связывает игру, UI, звук и ввод =====
import { ui } from './ui.js';
import { SoundEngine } from './audio.js';
import { Game } from './game.js';
import { input, initInput } from './input.js';
import { normalizeCode } from './net.js';

const audio = new SoundEngine();
const game = new Game(ui, audio);

initInput(ui.el.canvas, ui.el.touch);
ui.showScreen('lobby');

// ---- имя и персонаж ----
const savedName = localStorage.getItem('isaac.name');
if (savedName) ui.el.name.value = savedName;
game.setProfile({ name: (ui.el.name.value || 'Isaac').trim().slice(0, 14) || 'Isaac' });

ui.el.name.addEventListener('input', () => {
  const v = ui.el.name.value.trim().slice(0, 14);
  game.setProfile({ name: v || 'Isaac' });
  localStorage.setItem('isaac.name', v);
});

ui.buildCharacters(game.profile.char, (id) => {
  game.setProfile({ char: id });
  localStorage.setItem('isaac.char', id);
});
const savedChar = localStorage.getItem('isaac.char');
if (savedChar) {
  const card = ui.el.grid.querySelector(`[data-char="${savedChar}"]`);
  if (card) card.click();
}

// ---- лобби: кнопки ----
ui.el.btnSolo.addEventListener('click', () => {
  audio.init();
  game.startSolo();
});

ui.el.btnCreate.addEventListener('click', () => {
  audio.init();
  game.startHost();
});

ui.el.btnJoin.addEventListener('click', () => joinRoom());
ui.el.inputRoom.addEventListener('input', () => {
  ui.el.inputRoom.value = normalizeCode(ui.el.inputRoom.value);
});
ui.el.inputRoom.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(); });

function joinRoom() {
  const code = normalizeCode(ui.el.inputRoom.value);
  if (!code) { ui.setStatus('Введите код комнаты', true); return; }
  audio.init();
  game.startGuest(code);
}

// ---- читы ----
ui.el.btnCheat.addEventListener('click', () => applyCheatInput());
ui.el.inputCheat.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCheatInput(); });
function applyCheatInput() {
  const msg = game.applyCheat(ui.el.inputCheat.value);
  ui.el.inputCheat.value = '';
  if (msg) ui.toast(msg);
}

// ---- топбар: во время игры ----
ui.el.btnCopy.addEventListener('click', async () => {
  const code = game.roomCode || '';
  try {
    await navigator.clipboard.writeText(code);
    ui.toast('Код скопирован: ' + code);
  } catch {
    ui.toast('Код комнаты: ' + code, 4000);
  }
});

ui.el.btnMute.addEventListener('click', () => {
  audio.muted = !audio.muted;
  ui.el.btnMute.textContent = audio.muted ? '🔇' : '🔊';
});

ui.el.btnChat.addEventListener('click', () => ui.setChatVisible(!ui.chatVisible));
ui.el.btnCloseChat.addEventListener('click', () => ui.setChatVisible(false));
ui.el.chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = ui.el.chatInput.value;
  if (v.trim()) game.sendChat(v);
  ui.el.chatInput.value = '';
});

ui.el.btnLeave.addEventListener('click', () => {
  if (confirm('Выйти в лобби? Прогресс текущего забега будет потерян.')) game.leave();
});

// ---- оверлей окончания забега ----
ui.el.btnRestart.addEventListener('click', () => game.restartRun());
ui.el.btnOvLobby.addEventListener('click', () => game.leave());

// ---- Enter в лобби подтверждает выбранное действие ----
input.onEnter = () => {
  if (game.state !== 'lobby') return;
  if (document.activeElement === ui.el.inputRoom) joinRoom();
  else if (document.activeElement === ui.el.inputCheat) applyCheatInput();
};
input.onEscape = () => {
  if (game.state === 'play' && ui.chatVisible) ui.setChatVisible(false);
};

// ---- игровой цикл ----
function loop(now) {
  game.tick(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Предупреждение перед закрытием вкладки во время активного забега
window.addEventListener('beforeunload', (e) => {
  if (game.state === 'play' && game.mode !== 'solo') {
    e.preventDefault();
    e.returnValue = '';
  }
});
