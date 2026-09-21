import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

    playStep() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            const freq = 120 + Math.random() * 40;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.08);
        } catch(e) {}
    }

    playShoot(type = 'tear') {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            if (type === 'bullet') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            } else if (type === 'fire') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(250, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
            }

            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch(e) {}
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
        } catch(e) {}
    }

    playJoin() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, this.ctx.currentTime);
            osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.25);
        } catch(e) {}
    }

    playChat() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, this.ctx.currentTime);
            osc.frequency.setValueAtTime(660, this.ctx.currentTime + 0.06);

            gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        } catch(e) {}
    }
}

const audio = new SoundEngine();

const appId = typeof __app_id !== 'undefined' ? __app_id : 'isaac-flash-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "demo",
    authDomain: "demo.firebaseapp.com",
    projectId: "demo",
    storageBucket: "demo.appspot.com",
    messagingSenderId: "123",
    appId: "1:123:web:123"
};

let db = null;
let auth = null;
let isAuthReady = false;
let myPlayerId = 'p_' + Math.random().toString(36).substr(2, 6);
let currentRoomId = null;
let roomUnsubscribe = null;

async function initFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
        isAuthReady = true;
    } catch (err) {
        console.warn("Offline / Local mode active:", err);
        isAuthReady = false;
    }
}

initFirebase();

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    toastMsg.innerText = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2500);
}

const CHARACTERS = {
    isaac: { 
        id: 'isaac', 
        name: 'Isaac', 
        skin: '#fbcfe8', 
        speed: 215, 
        attackType: 'tear', 
        tearColor: '#60a5fa', 
        desc: 'Розовый • Слёзы под глазами',
        avatar: '💧'
    },
    hank: { 
        id: 'hank', 
        name: 'Hank J.', 
        skin: '#334155', 
        speed: 240, 
        attackType: 'bullet', 
        tearColor: '#facc15', 
        desc: 'Красные очки • Чёрная маска',
        avatar: '🕶️'
    },
    judas: { 
        id: 'judas', 
        name: 'Judas', 
        skin: '#1e1b18', 
        speed: 210, 
        attackType: 'tear', 
        tearColor: '#dc2626', 
        desc: 'Красная феска • Тёмный плащ',
        avatar: '☪️'
    },
    azazel: { 
        id: 'azazel', 
        name: 'Azazel', 
        skin: '#475569', 
        speed: 220, 
        attackType: 'fire', 
        tearColor: '#ef4444', 
        desc: 'Чёрные рожки • Демонические крылья',
        avatar: '😈'
    },
    cain: { 
        id: 'cain', 
        name: 'Cain', 
        skin: '#fef08a', 
        speed: 230, 
        attackType: 'tear', 
        tearColor: '#fbbf24', 
        desc: 'Золотые волосы • Повязка на глаз',
        avatar: '👁️'
    },
    tricky: { 
        id: 'tricky', 
        name: 'Tricky', 
        skin: '#15803d', 
        speed: 235, 
        attackType: 'fire', 
        tearColor: '#22c55e', 
        desc: 'Зелёный клоун • Стальная челюсть',
        avatar: '🤡'
    },
    sanford: { 
        id: 'sanford', 
        name: 'Sanford', 
        skin: '#fdba74', 
        speed: 225, 
        attackType: 'bullet', 
        tearColor: '#fb923c', 
        desc: 'Оранжевая бандана • Тёмные очки',
        avatar: '🧣'
    },
    lost: { 
        id: 'lost', 
        name: 'The Lost', 
        skin: '#f8fafc', 
        speed: 245, 
        attackType: 'tear', 
        tearColor: '#e2e8f0', 
        desc: 'Парящий призрак • Белая аура',
        avatar: '👻'
    }
};

const ROOM_WIDTH = 800;
const ROOM_HEIGHT = 500;
const WALL_THICKNESS = 40;
const DOOR_SIZE = 100;

const ROOM_THEMES = {
    basement: {
        name: 'Basement',
        floor: '#221b19',
        grid: '#181211',
        wall: '#3a302c',
        border: '#171210',
        obstacleRock: '#524640',
        label: '🏚️ Подвал'
    },
    cellar: {
        name: 'Cellar',
        floor: '#1a2228',
        grid: '#12181d',
        wall: '#2a3842',
        border: '#0d1318',
        obstacleRock: '#435866',
        label: '🪨 Погреб'
    },
    burningBasement: {
        name: 'Burning Basement',
        floor: '#2d140e',
        grid: '#1e0c08',
        wall: '#4a1f16',
        border: '#1a0805',
        obstacleRock: '#733123',
        label: '🔥 Горящий Подвал'
    },
    cathedral: {
        name: 'Cathedral',
        floor: '#2a333d',
        grid: '#1f2730',
        wall: '#4b5b6d',
        border: '#e2e8f0',
        obstacleRock: '#94a3b8',
        label: '🏛️ Собор'
    },
    sheol: {
        name: 'Sheol',
        floor: '#140c10',
        grid: '#0a0508',
        wall: '#2e121e',
        border: '#991b1b',
        obstacleRock: '#581c27',
        label: '🌋 Преисподняя (Sheol)'
    },
    greed: {
        name: 'Greed Room',
        floor: '#282310',
        grid: '#1a170a',
        wall: '#4a3f18',
        border: '#facc15',
        obstacleRock: '#857022',
        label: '💰 Сокровищница (Greed)'
    },
    chest: {
        name: 'The Chest',
        floor: '#302612',
        grid: '#1d170b',
        wall: '#54421d',
        border: '#fbbf24',
        obstacleRock: '#927230',
        label: '📦 Сундук (Chest)'
    },
    devil: {
        name: 'Devil Room',
        floor: '#1a0505',
        grid: '#100202',
        wall: '#3d0a0a',
        border: '#dc2626',
        obstacleRock: '#6b1111',
        label: '😈 Комната Дьявола'
    }
};

function getRoomTheme(rx, ry) {
    if (rx === 0 && ry === 0) return ROOM_THEMES.basement;
    const h = Math.abs(rx * 31 + ry * 17);
    const mod = h % 8;
    switch (mod) {
        case 0: return ROOM_THEMES.basement;
        case 1: return ROOM_THEMES.cellar;
        case 2: return ROOM_THEMES.burningBasement;
        case 3: return ROOM_THEMES.cathedral;
        case 4: return ROOM_THEMES.sheol;
        case 5: return ROOM_THEMES.greed;
        case 6: return ROOM_THEMES.chest;
        case 7: return ROOM_THEMES.devil;
        default: return ROOM_THEMES.basement;
    }
}

const TEMPLATES = [
    [],
    [
        { x: 200, y: 150, w: 50, h: 50, type: 'rock' },
        { x: 600, y: 150, w: 50, h: 50, type: 'rock' },
        { x: 200, y: 350, w: 50, h: 50, type: 'rock' },
        { x: 600, y: 350, w: 50, h: 50, type: 'rock' }
    ],
    [
        { x: 400, y: 250, w: 60, h: 60, type: 'rock' },
        { x: 400, y: 170, w: 50, h: 50, type: 'rock' },
        { x: 400, y: 330, w: 50, h: 50, type: 'rock' },
        { x: 320, y: 250, w: 50, h: 50, type: 'rock' },
        { x: 480, y: 250, w: 50, h: 50, type: 'rock' }
    ],
    [
        { x: 300, y: 180, w: 45, h: 45, type: 'rock' },
        { x: 500, y: 180, w: 45, h: 45, type: 'rock' },
        { x: 300, y: 320, w: 45, h: 45, type: 'rock' },
        { x: 500, y: 320, w: 45, h: 45, type: 'rock' },
        { x: 400, y: 250, w: 40, h: 40, type: 'pillar' }
    ],
    [
        { x: 180, y: 120, w: 40, h: 40, type: 'spike' },
        { x: 620, y: 120, w: 40, h: 40, type: 'spike' },
        { x: 180, y: 380, w: 40, h: 40, type: 'spike' },
        { x: 620, y: 380, w: 40, h: 40, type: 'spike' },
        { x: 400, y: 250, w: 50, h: 50, type: 'rock' }
    ],
    [
        { x: 280, y: 200, w: 55, h: 100, type: 'rock' },
        { x: 520, y: 200, w: 55, h: 100, type: 'rock' },
        { x: 400, y: 150, w: 40, h: 40, type: 'chest' }
    ]
];

let localPlayer = {
    name: 'Isaac_Player',
    character: 'isaac',
    speed: 215,
    rx: 0,
    ry: 0,
    x: ROOM_WIDTH / 2,
    y: ROOM_HEIGHT / 2,
    radius: 18,
    walkTimer: 0,
    isMoving: false,
    lastShootTime: 0
};

let activeCheats = new Set();
let keys = { w: false, a: false, s: false, d: false };
let mobileDir = { x: 0, y: 0 };
let projectiles = [];
let remotePlayers = {};
let visitedRooms = new Set(["0,0"]);
let chatLogs = [];

// Chat Toggle Handling for Mobile
let isChatVisible = true;
const chatBox = document.getElementById('chatBoxContainer');
const btnToggleChat = document.getElementById('btnToggleChat');
const btnCloseChat = document.getElementById('btnCloseChat');

function setChatVisibility(visible) {
    isChatVisible = visible;
    if (visible) {
        chatBox.classList.remove('hidden');
        document.getElementById('btnToggleChatText').innerText = 'Скрыть чат';
    } else {
        chatBox.classList.add('hidden');
        document.getElementById('btnToggleChatText').innerText = 'Чат';
    }
}

btnToggleChat.addEventListener('click', () => {
    setChatVisibility(!isChatVisible);
});

btnCloseChat.addEventListener('click', () => {
    setChatVisibility(false);
});

if (window.innerWidth < 640) {
    setChatVisibility(false);
}

function buildCharacterSelector() {
    const grid = document.getElementById('charSelectorGrid');
    grid.innerHTML = '';

    Object.values(CHARACTERS).forEach(char => {
        const card = document.createElement('div');
        card.className = `char-card p-2.5 flex flex-col items-center justify-center gap-1 text-center ${localPlayer.character === char.id ? 'selected' : ''}`;
        card.dataset.char = char.id;

        card.innerHTML = `
            <div class="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center shadow text-lg" style="background-color: ${char.skin}">
                <span>${char.avatar}</span>
            </div>
            <span class="text-xs font-bold text-neutral-200 leading-tight">${char.name}</span>
            <span class="text-[9px] text-amber-400 font-mono">${char.desc}</span>
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

document.getElementById('btnApplyCheat').addEventListener('click', () => {
    const input = document.getElementById('inputCheatCode');
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    if (code === 'MADNESS') {
        activeCheats.add('MADNESS');
        showToast('Чит-код MADNESS активирован!');
    }
});
