const peerIdEl = document.getElementById('peer-id');
const statusEl = document.getElementById('status');
const copyBtn = document.getElementById('copy-btn');
const connectBtn = document.getElementById('connect-btn');
const joinInput = document.getElementById('join-id');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let peer = new Peer(); 
let conn;

// Автоматически создаем "комнату" при открытии
peer.on('open', (id) => {
    peerIdEl.innerText = id;
});

// Копирование ID
copyBtn.onclick = () => {
    navigator.clipboard.writeText(peerIdEl.innerText);
    copyBtn.innerText = "Готово!";
    setTimeout(() => copyBtn.innerText = "Копировать", 2000);
};

// Кто-то ввел наш ID и подключился к нам
peer.on('connection', (c) => {
    conn = c;
    initGame();
});

// Мы ввели ID друга и подключаемся к нему
connectBtn.onclick = () => {
    const friendId = joinInput.value.trim();
    if (!friendId) return alert("Вставь ID друга!");
    conn = peer.connect(friendId);
    initGame();
};

function initGame() {
    statusEl.innerText = "Подключение...";
    conn.on('open', () => {
        document.getElementById('menu').style.display = 'none';
        canvas.style.display = 'block';
        resize();
        setupListeners();
        gameLoop();
    });

    conn.on('data', (data) => {
        enemy.x = data.x;
        enemy.y = data.y;
    });
}

// Данные игроков
const me = { x: 200, y: 200, tX: 200, tY: 200, color: '#3498db' };
const enemy = { x: -100, y: -100, color: '#e74c3c' };

function setupListeners() {
    window.addEventListener('mousedown', (e) => {
        me.tX = e.clientX;
        me.tY = e.clientY;
    });
    window.addEventListener('resize', resize);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function gameLoop() {
    // Движение
    const dx = me.tX - me.x;
    const dy = me.tY - me.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > 5) {
        me.x += (dx/dist) * 5;
        me.y += (dy/dist) * 5;
        if(conn && conn.open) conn.send({ x: me.x, y: me.y });
    }

    // Фон (Мид)
    ctx.fillStyle = "#161b22";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисуем персонажей
    drawHero(me.x, me.y, me.color, "Вы");
    drawHero(enemy.x, enemy.y, enemy.color, "Враг");

    requestAnimationFrame(gameLoop);
}

function drawHero(x, y, color, name) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(name, x, y - 30);
}
