const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let peer = new Peer();
let conn, playerHero = 'axe';

// Параметры мира
const WORLD = { w: 800, h: 2000 };
let cam = { y: 1500 }; // Начинаем снизу
let p = { x: 400, y: 1800, hp: 100, gold: 600, range: 60, dmg: 10, vX: 0, vY: 0 };
let enemy = { x: 400, y: 200, hp: 100 };
let creeps = [];
let timer = 30;

peer.on('open', id => document.getElementById('my-id').innerText = id);
peer.on('connection', c => { conn = c; start(); });
document.getElementById('connect-btn').onclick = () => {
    conn = peer.connect(document.getElementById('join-id').value);
    start();
};

function selHero(type) {
    playerHero = type;
    p.range = (type === 'sniper') ? 250 : 60;
    document.querySelectorAll('.hero-opt').forEach(el => el.classList.remove('active'));
    document.getElementById('hero-'+type).classList.add('active');
}

function start() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    resize();
    spawnWave();
    setInterval(updateTimer, 1000);
    loop();
}

function updateTimer() {
    timer--;
    if(timer <= 0) {
        spawnWave();
        timer = 30;
        document.getElementById('shop').classList.add('hidden');
    } else if (timer < 5) {
        document.getElementById('shop').classList.remove('hidden'); // Магазин за 5 сек до волны
    }
    document.getElementById('timer').innerText = timer;
}

function spawnWave() {
    for(let i=0; i<3; i++) {
        creeps.push({ x: 400 + (i*30-30), y: 1800, side: 'radiant', hp: 50 });
        creeps.push({ x: 400 + (i*30-30), y: 200, side: 'dire', hp: 50 });
    }
}

// Управление
const stick = document.getElementById('joy-stick');
document.getElementById('joy-base').ontouchmove = (e) => {
    const rect = e.target.getBoundingClientRect();
    const dx = e.touches[0].clientX - (rect.left + 50);
    const dy = e.touches[0].clientY - (rect.top + 50);
    const angle = Math.atan2(dy, dx);
    p.vX = Math.cos(angle) * 5;
    p.vY = Math.sin(angle) * 5;
    stick.style.transform = `translate(${dx/2}px, ${dy/2}px)`;
};
document.getElementById('joy-base').ontouchend = () => {
    p.vX = 0; p.vY = 0;
    stick.style.transform = `translate(0,0)`;
};

// Атака
document.getElementById('atk-btn').onclick = () => {
    creeps.forEach(c => {
        let d = Math.sqrt((p.x-c.x)**2 + (p.y-c.y)**2);
        if(d < p.range && c.side === 'dire') {
            c.hp -= p.dmg;
            if(c.hp <= 0) p.gold += 40;
        }
    });
    document.getElementById('gold-val').innerText = p.gold;
};

function loop() {
    p.x += p.vX; p.y += p.vY;
    cam.y = p.y - canvas.height / 2;
    
    if(conn && conn.open) conn.send({x: p.x, y: p.y, hp: p.hp});
    conn?.on('data', data => enemy = data);

    render();
    requestAnimationFrame(loop);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cam.y);

    // Карта
    ctx.fillStyle = "#1b2814"; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    ctx.fillStyle = "#333"; ctx.fillRect(350, 0, 100, WORLD.h); // Мид дорога

    // Трон (Снизу посередине)
    ctx.fillStyle = "#2ecc71"; ctx.fillRect(300, 1900, 200, 50);
    ctx.fillStyle = "#fff"; ctx.fillText("ВАШ ТРОН", 370, 1930);

    // Крипы и Герои
    creeps = creeps.filter(c => c.hp > 0);
    creeps.forEach(c => {
        c.y += (c.side === 'radiant' ? -1.5 : 1.5);
        ctx.fillStyle = (c.side === 'radiant') ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(c.x, c.y, 20, 20);
    });

    drawEnt(p.x, p.y, "#3498db", "ВЫ");
    drawEnt(enemy.x, enemy.y, "#e67e22", "ВРАГ");

    ctx.restore();
}

function drawEnt(x, y, col, txt) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(txt, x-10, y-35);
    // Радиус атаки (тонкий круг)
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.beginPath(); ctx.arc(x, y, p.range, 0, Math.PI*2); ctx.stroke();
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.onresize = resize;
