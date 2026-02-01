const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const myIdDisplay = document.getElementById('my-id');
const peerInput = document.getElementById('peer-id-input');
const gridSize = 40;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let blocks = [];
let connections = [];
const peer = new Peer(); 

peer.on('open', (id) => { myIdDisplay.innerText = id; });
peer.on('connection', (conn) => { setupConnection(conn); });

function connectToFriend() {
    const friendId = peerInput.value;
    if (friendId) setupConnection(peer.connect(friendId));
}

function setupConnection(conn) {
    connections.push(conn);
    conn.on('data', (data) => {
        if (data.type === 'newBlock') {
            blocks.push(data.block);
            draw();
        }
    });
}

// Выбор цвета
let selectedColor = '#4CAF50';
document.querySelectorAll('.block-opt').forEach(opt => {
    opt.style.background = opt.dataset.color;
    opt.onclick = () => {
        document.querySelector('.selected').classList.remove('selected');
        opt.classList.add('selected');
        selectedColor = opt.dataset.color;
    };
});

// Функция установки блока
function placeBlock(clientX, clientY) {
    const myNick = document.getElementById('nickname').value || "Я";
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / gridSize) * gridSize;
    const y = Math.floor((clientY - rect.top) / gridSize) * gridSize;
    
    // Проверка, нет ли уже блока здесь (чтобы не спамить)
    if (blocks.some(b => b.x === x && b.y === y)) return;

    const newBlock = { x, y, color: selectedColor, owner: myNick };
    blocks.push(newBlock);
    draw();

    connections.forEach(conn => {
        if (conn.open) conn.send({ type: 'newBlock', block: newBlock });
    });
}

// Для ПК
canvas.addEventListener('mousedown', (e) => placeBlock(e.clientX, e.clientY));

// ДЛЯ ТЕЛЕФОНОВ
canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    placeBlock(touch.clientX, touch.clientY);
}, { passive: false });

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем сетку (слабую)
    ctx.strokeStyle = '#2a2a2a';
    for(let i=0; i<canvas.width; i+=gridSize) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=gridSize) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    blocks.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, gridSize, gridSize);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '9px Arial';
        ctx.fillText(b.owner, b.x + 2, b.y + 10);
    });
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});

draw();
