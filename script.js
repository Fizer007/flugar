const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const myIdDisplay = document.getElementById('my-id');
const peerInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const statusMsg = document.getElementById('status');

let peer, conn;
let myRole = null; // 'sink' или 'sponge'
let gameState = {
    sink: { x: 100, y: 100, w: 80, h: 80 },
    sponge: { x: 300, y: 300, w: 40, h: 50, hp: 100 }
};

// Инициализация PeerJS
peer = new Peer();

peer.on('open', (id) => {
    myIdDisplay.innerText = id;
});

// Когда кто-то подключается к нам
peer.on('connection', (connection) => {
    conn = connection;
    myRole = 'sink'; // Хост всегда раковина
    setupConnection();
    startGame();
});

// Когда мы подключаемся к другу
connectBtn.onclick = () => {
    const friendId = peerInput.value;
    if (!friendId) return;
    conn = peer.connect(friendId);
    myRole = 'sponge'; // Гость - мочалка
    setupConnection();
    conn.on('open', startGame);
};

function setupConnection() {
    conn.on('data', (data) => {
        if (myRole === 'sink') {
            gameState.sponge.x = data.x;
            gameState.sponge.y = data.y;
        } else {
            gameState.sink.x = data.x;
            gameState.sink.y = data.y;
            gameState.sponge.hp = data.hp;
        }
    });
}

// Управление
const keys = {};
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

// Для мобилок
if ('ontouchstart' in window) {
    document.getElementById('joystick-zone').style.display = 'block';
}

let moveDir = { x: 0, y: 0 };
// (Тут можно добавить логику джойстика, но для краткости ограничимся WASD и тачем)

function update() {
    const speed = 5;
    let moved = false;
    const player = gameState[myRole];

    if (keys['KeyW'] || keys['ArrowUp']) { player.y -= speed; moved = true; }
    if (keys['KeyS'] || keys['ArrowDown']) { player.y += speed; moved = true; }
    if (keys['KeyA'] || keys['ArrowLeft']) { player.x -= speed; moved = true; }
    if (keys['KeyD'] || keys['ArrowRight']) { player.x += speed; moved = true; }

    // Логика столкновения (только на стороне хоста для честности)
    if (myRole === 'sink') {
        const s = gameState.sink;
        const sp = gameState.sponge;
        if (sp.x > s.x && sp.x < s.x + s.w && sp.y > s.y && sp.y < s.y + s.h) {
            sp.hp -= 0.5; // Мочалка сохнет в раковине!
        }
    }

    if (conn && conn.open) {
        conn.send({ x: player.x, y: player.y, hp: gameState.sponge.hp });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем Раковину (Прямоугольник с дыркой)
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(gameState.sink.x, gameState.sink.y, gameState.sink.w, gameState.sink.h);
    ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.arc(gameState.sink.x + 40, gameState.sink.y + 40, 10, 0, Math.PI*2);
    ctx.fill();

    // Рисуем Мочалку (Желтая и пористая)
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(gameState.sponge.x, gameState.sponge.y, gameState.sponge.w, gameState.sponge.h);
    
    document.getElementById('hp-fill').style.width = gameState.sponge.hp + '%';
    
    requestAnimationFrame(() => {
        update();
        draw();
    });
}

function startGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.getElementById('role-tag').innerText = "Вы: " + (myRole === 'sink' ? "РАКОВИНА" : "МОЧАЛКА");
    draw();
}
