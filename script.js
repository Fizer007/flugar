const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const myIdDisplay = document.getElementById('my-id');
const connectBtn = document.getElementById('connect-btn');
const peerInput = document.getElementById('peer-id-input');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- СЕТЕВАЯ ЛОГИКА ---
const peer = new Peer(); // Генерирует случайный ID
let conn;
let players = {};
let myId = null;

peer.on('open', (id) => {
    myId = id;
    myIdDisplay.innerText = id;
    players[id] = { x: 100, y: 100, hp: 100, res: 0, color: 'cyan' };
});

peer.on('connection', (connection) => {
    conn = connection;
    setupConnection();
});

connectBtn.onclick = () => {
    const friendId = peerInput.value;
    conn = peer.connect(friendId);
    setupConnection();
};

function setupConnection() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('game-stats').classList.remove('hidden');
    
    conn.on('data', (data) => {
        // Получаем координаты другого игрока
        players[data.id] = data;
    });
}

// --- УПРАВЛЕНИЕ (ДЖОЙСТИК) ---
let moveDir = { x: 0, y: 0 };
const stick = document.getElementById('joystick-stick');
const base = document.getElementById('joystick-base');

base.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = 40;

    if (dist > maxDist) {
        dx *= maxDist / dist;
        dy *= maxDist / dist;
    }

    stick.style.transform = translate(${dx}px, ${dy}px);
    moveDir.x = dx / maxDist;
    moveDir.y = dy / maxDist;
});

base.addEventListener('touchend', () => {
    stick.style.transform = translate(0, 0);
    moveDir = { x: 0, y: 0 };
});

// Клавиатура для ПК
window.addEventListener('keydown', (e) => {
    if(e.code === 'KeyW') moveDir.y = -1;
    if(e.code === 'KeyS') moveDir.y = 1;
    if(e.code === 'KeyA') moveDir.x = -1;
    if(e.code === 'KeyD') moveDir.x = 1;
});
window.addEventListener('keyup', () => moveDir = { x: 0, y: 0 });

// --- ИГРОВОЙ ЦИКЛ ---
function update() {
    if (myId && players[myId]) {
        players[myId].x += moveDir.x * 5;
        players[myId].y += moveDir.y * 5;

        // Отправка данных другу
        if (conn && conn.open) {
            conn.send({ id: myId, x: players[myId].x, y: players[myId].y });
        }
    }
    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем игроков
    for (let id in players) {
        const p = players[id];
        ctx.fillStyle = (id === myId) ? '#00ff00' : '#ff0000'; // Isaac/Dota style
        ctx.fillRect(p.x, p.y, 40, 40); // Майнкрафт-куб
        
        // Маленький декор "слез" Isaac
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(p.x + 20, p.y - 10, 5, 0, Math.PI*2);
        ctx.fill();
    }
}

update();
