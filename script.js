import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- ЗВУКОВОЙ ДВИЖОК ---
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    playShoot() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }
    playDoor() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);
        } catch (e) {}
    }
}

const audio = new SoundEngine();

// --- ДАННЫЕ ПЕРСОНАЖЕЙ И НАСТРОЙКИ ---
const CHARACTERS = {
    isaac: { id: 'isaac', name: 'Isaac', skin: '#fbcfe8', speed: 220, avatar: '💧' },
    hank: { id: 'hank', name: 'Hank J.', skin: '#334155', speed: 250, avatar: '🕶️' },
    judas: { id: 'judas', name: 'Judas', skin: '#1e1b18', speed: 210, avatar: '☪️' },
    azazel: { id: 'azazel', name: 'Azazel', skin: '#475569', speed: 230, avatar: '😈' },
    cain: { id: 'cain', name: 'Cain', skin: '#fef08a', speed: 235, avatar: '👁️' },
    tricky: { id: 'tricky', name: 'Tricky', skin: '#15803d', speed: 240, avatar: '🤡' },
    sanford: { id: 'sanford', name: 'Sanford', skin: '#fdba74', speed: 230, avatar: '🧣' },
    lost: { id: 'lost', name: 'The Lost', skin: '#f8fafc', speed: 260, avatar: '👻' }
};

const ROOM_WIDTH = 800;
const ROOM_HEIGHT = 500;
const WALL = 40;
const DOOR_SIZE = 100;

// Игрок
let localPlayer = {
    id: 'p_' + Math.random().toString(36).substr(2, 6),
    name: 'Isaac_Player',
    character: 'isaac',
    speed: 220,
    rx: 0,
    ry: 0,
    x: ROOM_WIDTH / 2,
    y: ROOM_HEIGHT / 2,
    radius: 18,
    hp: 6
};

// Хранилище сгенерированных комнат и мух
const roomCache = {}; 
let projectiles = [];
let keys = {};
let isGameRunning = false;
let lastTime = performance.now();
let visitedRooms = new Set(["0,0"]);

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 2500);
}

// Псевдослучайный генератор для процедурной генерации комнат по координатам (rx, ry)
function pseudoRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Генерация / Получение комнаты
function getOrCreateRoom(rx, ry) {
    const key = `${rx},${ry}`;
    if (roomCache[key]) return roomCache[key];

    // Генерируем мух на основе координат
    const seed = rx * 73856093 ^ ry * 19349663;
    const flyCount = Math.floor(pseudoRandom(seed) * 5) + 2; // От 2 до 6 мух в комнате
    const flies = [];

    for (let i = 0; i < flyCount; i++) {
        flies.push({
            id: i,
            x: WALL + 50 + pseudoRandom(seed + i * 2) * (ROOM_WIDTH - WALL * 2 - 100),
            y: WALL + 50 + pseudoRandom(seed + i * 3) * (ROOM_HEIGHT - WALL * 2 - 100),
            vx: (pseudoRandom(seed + i * 4) - 0.5) * 100,
            vy: (pseudoRandom(seed + i * 5) - 0.5) * 100,
            radius: 10,
            hp: 3,
            maxHp: 3
        });
    }

    // Выбор цвета пола
    const colors = ['#221b19', '#1a2228', '#2d140e', '#2a333d', '#140c10'];
    const colorIdx = Math.abs(rx * 31 + ry * 17) % colors.length;

    roomCache[key] = {
        rx, ry,
        color: colors[colorIdx],
        flies: flies
    };

    return roomCache[key];
}

// --- ВЫБОР ПЕРСОНАЖА В ЛОББИ ---
function buildCharacterSelector() {
    const grid = document.getElementById('charSelectorGrid');
    grid.innerHTML = '';
    Object.values(CHARACTERS).forEach(char => {
        const card = document.createElement('div');
        card.className = `char-card p-2.5 flex flex-col items-center justify-center gap-1 text-center ${localPlayer.character === char.id ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center shadow text-lg" style="background-color: ${char.skin}">
                <span>${char.avatar}</span>
            </div>
            <span class="text-xs font-bold text-neutral-200 leading-tight">${char.name}</span>
        `;
        card.addEventListener('click', () => {
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            localPlayer.character = char.id;
            localPlayer.speed = char.speed;
            document.getElementById('selectedCharTitle').innerText = char.name;
        });
        grid.appendChild(card);
    });
}
buildCharacterSelector();

// --- УПРАВЛЕНИЕ И ВВОД ---
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        shootTear(e.code);
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

// Экранные кнопки для мобильных
const dpadMap = { btnUp: 'KeyW', btnDown: 'KeyS', btnLeft: 'KeyA', btnRight: 'KeyD' };
Object.entries(dpadMap).forEach(([btnId, code]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[code] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[code] = false; });
    btn.addEventListener('mousedown', () => keys[code] = true);
    btn.addEventListener('mouseup', () => keys[code] = false);
});

const shootMap = { btnShootUp: 'ArrowUp', btnShootDown: 'ArrowDown', btnShootLeft: 'ArrowLeft', btnShootRight: 'ArrowRight' };
Object.entries(shootMap).forEach(([btnId, code]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); shootTear(code); });
    btn.addEventListener('click', () => shootTear(code));
});

function shootTear(dirCode) {
    if (!isGameRunning) return;
    let vx = 0, vy = 0;
    const speed = 400;
    if (dirCode === 'ArrowUp') vy = -speed;
    if (dirCode === 'ArrowDown') vy = speed;
    if (dirCode === 'ArrowLeft') vx = -speed;
    if (dirCode === 'ArrowRight') vx = speed;

    if (vx !== 0 || vy !== 0) {
        projectiles.push({
            x: localPlayer.x,
            y: localPlayer.y,
            vx: vx,
            vy: vy,
            radius: 6,
            life: 1.2
        });
        audio.playShoot();
    }
}

// --- СТАРТ И ВЫХОД ИЗ ИГРЫ ---
const screenLobby = document.getElementById('screenLobby');
const screenGame = document.getElementById('screenGame');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function startGame() {
    audio.init();
    localPlayer.name = document.getElementById('inputName').value || 'Isaac';
    screenLobby.classList.add('hidden');
    screenGame.classList.remove('hidden');
    screenGame.classList.add('flex');
    
    resizeCanvas();
    isGameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
    showToast(`Добро пожаловать, ${localPlayer.name}!`);
}

document.getElementById('btnPlaySolo').addEventListener('click', () => {
    document.getElementById('uiRoomCode').innerText = "SOLO";
    startGame();
});

document.getElementById('btnLeaveGame').addEventListener('click', () => {
    isGameRunning = false;
    screenGame.classList.add('hidden');
    screenGame.classList.remove('flex');
    screenLobby.classList.remove('hidden');
});

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);

// --- ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ ---
function gameLoop(now) {
    if (!isGameRunning) return;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ОБНОВЛЕНИЕ ЛОГИКИ
function update(dt) {
    // 1. Движение игрока
    let moveX = 0, moveY = 0;
    if (keys['KeyW']) moveY -= 1;
    if (keys['KeyS']) moveY += 1;
    if (keys['KeyA']) moveX -= 1;
    if (keys['KeyD']) moveX += 1;

    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
    }

    localPlayer.x += moveX * localPlayer.speed * dt;
    localPlayer.y += moveY * localPlayer.speed * dt;

    // 2. Двери и Переход между комнатами (Бесконечная генерация)
    const doorMinX = ROOM_WIDTH / 2 - DOOR_SIZE / 2;
    const doorMaxX = ROOM_WIDTH / 2 + DOOR_SIZE / 2;
    const doorMinY = ROOM_HEIGHT / 2 - DOOR_SIZE / 2;
    const doorMaxY = ROOM_HEIGHT / 2 + DOOR_SIZE / 2;

    // Верхняя дверь
    if (localPlayer.y - localPlayer.radius < WALL) {
        if (localPlayer.x > doorMinX && localPlayer.x < doorMaxX) {
            localPlayer.ry -= 1;
            localPlayer.y = ROOM_HEIGHT - WALL - localPlayer.radius - 10;
            audio.playDoor();
        } else {
            localPlayer.y = WALL + localPlayer.radius;
        }
    }
    // Нижняя дверь
    if (localPlayer.y + localPlayer.radius > ROOM_HEIGHT - WALL) {
        if (localPlayer.x > doorMinX && localPlayer.x < doorMaxX) {
            localPlayer.ry += 1;
            localPlayer.y = WALL + localPlayer.radius + 10;
            audio.playDoor();
        } else {
            localPlayer.y = ROOM_HEIGHT - WALL - localPlayer.radius;
        }
    }
    // Левая дверь
    if (localPlayer.x - localPlayer.radius < WALL) {
        if (localPlayer.y > doorMinY && localPlayer.y < doorMaxY) {
            localPlayer.rx -= 1;
            localPlayer.x = ROOM_WIDTH - WALL - localPlayer.radius - 10;
            audio.playDoor();
        } else {
            localPlayer.x = WALL + localPlayer.radius;
        }
    }
    // Правая дверь
    if (localPlayer.x + localPlayer.radius > ROOM_WIDTH - WALL) {
        if (localPlayer.y > doorMinY && localPlayer.y < doorMaxY) {
            localPlayer.rx += 1;
            localPlayer.x = WALL + localPlayer.radius + 10;
            audio.playDoor();
        } else {
            localPlayer.x = ROOM_WIDTH - WALL - localPlayer.radius;
        }
    }

    visitedRooms.add(`${localPlayer.rx},${localPlayer.ry}`);
    document.getElementById('uiCoord').innerText = `(${localPlayer.rx}, ${localPlayer.ry})`;

    // Получаем текущую комнату
    const room = getOrCreateRoom(localPlayer.rx, localPlayer.ry);

    // 3. Обновление Мух (AI)
    room.flies.forEach(fly => {
        // Движение в сторону игрока
        const dx = localPlayer.x - fly.x;
        const dy = localPlayer.y - fly.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            fly.vx += (dx / dist) * 120 * dt;
            fly.vy += (dy / dist) * 120 * dt;
        }

        // Ограничение скорости
        const maxSpeed = 90;
        const currentSpeed = Math.hypot(fly.vx, fly.vy);
        if (currentSpeed > maxSpeed) {
            fly.vx = (fly.vx / currentSpeed) * maxSpeed;
            fly.vy = (fly.vy / currentSpeed) * maxSpeed;
        }

        fly.x += fly.vx * dt;
        fly.y += fly.vy * dt;
    });

    // 4. Обновление Снарядов (Слёз) и Столкновения
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        let hit = false;

        // Попадание по мухам
        for (let j = room.flies.length - 1; j >= 0; j--) {
            const fly = room.flies[j];
            const dist = Math.hypot(p.x - fly.x, p.y - fly.y);
            if (dist < p.radius + fly.radius) {
                fly.hp -= 1;
                hit = true;
                if (fly.hp <= 0) {
                    room.flies.splice(j, 1);
                }
                break;
            }
        }

        // Вылет за пределы стены
        if (p.x < WALL || p.x > ROOM_WIDTH - WALL || p.y < WALL || p.y > ROOM_HEIGHT - WALL || p.life <= 0 || hit) {
            projectiles.splice(i, 1);
        }
    }
}

// ОТРИСОВКА
function render() {
    const room = getOrCreateRoom(localPlayer.rx, localPlayer.ry);

    // Масштабирование Canvas под пропорции комнаты 800x500
    const scale = Math.min(canvas.width / ROOM_WIDTH, canvas.height / ROOM_HEIGHT);
    const offsetX = (canvas.width - ROOM_WIDTH * scale) / 2;
    const offsetY = (canvas.height - ROOM_HEIGHT * scale) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Пол комнаты
    ctx.fillStyle = room.color;
    ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    // Стены
    ctx.fillStyle = '#110d0c';
    ctx.fillRect(0, 0, ROOM_WIDTH, WALL);
    ctx.fillRect(0, ROOM_HEIGHT - WALL, ROOM_WIDTH, WALL);
    ctx.fillRect(0, 0, WALL, ROOM_HEIGHT);
    ctx.fillRect(ROOM_WIDTH - WALL, 0, WALL, ROOM_HEIGHT);

    // Двери
    ctx.fillStyle = '#facc15';
    // Верхняя
    ctx.fillRect(ROOM_WIDTH / 2 - DOOR_SIZE / 2, 0, DOOR_SIZE, WALL / 2);
    // Нижняя
    ctx.fillRect(ROOM_WIDTH / 2 - DOOR_SIZE / 2, ROOM_HEIGHT - WALL / 2, DOOR_SIZE, WALL / 2);
    // Левая
    ctx.fillRect(0, ROOM_HEIGHT / 2 - DOOR_SIZE / 2, WALL / 2, DOOR_SIZE);
    // Правая
    ctx.fillRect(ROOM_WIDTH - WALL / 2, ROOM_HEIGHT / 2 - DOOR_SIZE / 2, WALL / 2, DOOR_SIZE);

    // 1. Отрисовка Мух
    room.flies.forEach(fly => {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(fly.x, fly.y, fly.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Крылышки
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(fly.x - 6, fly.y - 6, 5, 0, Math.PI * 2);
        ctx.arc(fly.x + 6, fly.y - 6, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // 2. Отрисовка Снарядов
    ctx.fillStyle = '#60a5fa';
    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 3. Отрисовка Игрока
    const charData = CHARACTERS[localPlayer.character] || CHARACTERS.isaac;
    ctx.fillStyle = charData.skin;
    ctx.beginPath();
    ctx.arc(localPlayer.x, localPlayer.y, localPlayer.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Глаза
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(localPlayer.x - 5, localPlayer.y - 3, 3, 0, Math.PI * 2);
    ctx.arc(localPlayer.x + 5, localPlayer.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Никнейм
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(localPlayer.name, localPlayer.x, localPlayer.y - localPlayer.radius - 8);

    ctx.restore();

    renderMinimap();
}

// Отрисовка миникарты
function renderMinimap() {
    const mCanvas = document.getElementById('minimapCanvas');
    const mCtx = mCanvas.getContext('2d');
    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);

    const size = 12;
    const cx = mCanvas.width / 2;
    const cy = mCanvas.height / 2;

    visitedRooms.forEach(key => {
        const [rx, ry] = key.split(',').map(Number);
        const x = cx + (rx - localPlayer.rx) * (size + 3) - size / 2;
        const y = cy + (ry - localPlayer.ry) * (size + 3) - size / 2;

        if (rx === localPlayer.rx && ry === localPlayer.ry) {
            mCtx.fillStyle = '#facc15';
        } else {
            mCtx.fillStyle = '#4b5b6d';
        }
        mCtx.fillRect(x, y, size, size);
    });
}
