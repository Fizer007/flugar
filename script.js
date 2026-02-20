let peer, conn;
const myIdDisplay = document.getElementById('my-id');
const statusDisplay = document.getElementById('status');
let role = ''; // 'host' или 'guest'
let currentGame = '';

// --- СЕТЕВАЯ ЛОГИКА ---
peer = new Peer();

peer.on('open', (id) => {
    myIdDisplay.innerText = id;
});

peer.on('connection', (c) => {
    conn = c;
    role = 'host';
    setupConnection();
});

function connectToPeer() {
    const peerId = document.getElementById('peer-id-input').value;
    conn = peer.connect(peerId);
    role = 'guest';
    setupConnection();
}

function setupConnection() {
    conn.on('open', () => {
        statusDisplay.innerText = "Подключено!";
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-selection').classList.remove('hidden');
    });

    conn.on('data', (data) => {
        handleData(data);
    });
}

function sendData(type, payload) {
    if (conn && conn.open) {
        conn.send({ type, payload });
    }
}

// --- УПРАВЛЕНИЕ ИГРАМИ ---
function handleData(data) {
    if (data.type === 'switch-game') {
        renderGame(data.payload, false);
    } else if (data.type === 'game-action') {
        processGameMove(data.payload);
    }
}

function selectGame(game) {
    renderGame(game, true);
    sendData('switch-game', game);
}

function renderGame(game, isInitiator) {
    currentGame = game;
    document.getElementById('game-selection').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    const area = document.getElementById('game-area');
    area.innerHTML = '';

    if (game === 'tictactoe') {
        area.innerHTML = <h3>Крестики-Нолики</h3><div class="ttt-grid" id="ttt"></div>;
        for(let i=0; i<9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                cell.innerText = role === 'host' ? 'X' : 'O';
                sendData('game-action', { index: i, sign: cell.innerText });
            };
            cell.id = cell-${i};
            document.getElementById('ttt').appendChild(cell);
        }
    } else if (game === 'clicker') {
        area.innerHTML = <h3>Кто быстрее нажмет 50 раз!</h3><button onclick="clickMe()">ЖМИ!</button><p id="count">0</p>;
    } else if (game === 'guess') {
        area.innerHTML = <h3>Загадай число (0-10)</h3><input type="number" id="num-in"><button onclick="sendGuess()">Ок</button>;
    } else if (game === 'reaction') {
        area.innerHTML = <h3>Жди зеленого...</h3><div id="box" style="width:200px;height:200px;background:red;margin:auto"></div>;
        if(role === 'host') setTimeout(() => {
            document.getElementById('box').style.background = 'green';
            sendData('game-action', 'go');
        }, Math.random() * 3000 + 2000);
    } else if (game === 'pong') {
        area.innerHTML = <canvas id="pong-canvas" width="300" height="400"></canvas><br>Двигай пальцем/мышью;
        startPong();
    }
}

function processGameMove(payload) {
    if (currentGame === 'tictactoe') {
        document.getElementById(cell-${payload.index}).innerText = payload.sign;
    } else if (currentGame === 'clicker') {
        statusDisplay.innerText = "Оппонент кликает!";
    } else if (currentGame === 'reaction' && payload === 'go') {
        document.getElementById('box').style.background = 'green';
    }
}

// Пример логики кликера
let clicks = 0;
function clickMe() {
    clicks++;
    document.getElementById('count').innerText = clicks;
    if(clicks >= 50) alert("ТЫ ПОБЕДИЛ!");
    sendData('game-action', {clicks});
}

function backToMenu() {
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('game-selection').classList.remove('hidden');
}
