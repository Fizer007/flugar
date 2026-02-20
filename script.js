const peer = new Peer(); // Создаем объект Peer
let conn;
let mySymbol = ''; // 'X' или 'O'
let board = Array(9).fill(null);
let isMyTurn = false;

// Элементы DOM
const myIdDisplay = document.getElementById('my-id');
const peerIdInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const status = document.getElementById('game-status');
const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');

// 1. Получаем свой ID
peer.on('open', (id) => {
    myIdDisplay.innerText = id;
});

// 2. Ждем входящего подключения (Ты — Хост)
peer.on('connection', (connection) => {
    conn = connection;
    mySymbol = 'X';
    isMyTurn = true;
    setupGame();
});

// 3. Инициируем подключение (Ты — Гость)
connectBtn.addEventListener('click', () => {
    const peerId = peerIdInput.value;
    conn = peer.connect(peerId);
    mySymbol = 'O';
    isMyTurn = false;
    setupGame();
});

function setupGame() {
    status.innerText = Игра началась! Вы играете за: ${mySymbol};
    boardEl.classList.remove('hidden');
    document.getElementById('setup').classList.add('hidden');
    handleData();
}

// Обработка данных
function handleData() {
    conn.on('data', (data) => {
        if (data.type === 'move') {
            updateBoard(data.index, mySymbol === 'X' ? 'O' : 'X');
            isMyTurn = true;
            status.innerText = "Твой ход!";
        }
    });
}

// Ход игрока
cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        if (isMyTurn && !board[index]) {
            updateBoard(index, mySymbol);
            conn.send({ type: 'move', index: index });
            isMyTurn = false;
            status.innerText = "Ожидание хода противника...";
        }
    });
});

function updateBoard(index, symbol) {
    board[index] = symbol;
    cells[index].innerText = symbol;
    checkWinner();
}

function checkWinner() {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let combo of wins) {
        if (board[combo[0]] && board[combo[0]] === board[combo[1]] && board[combo[0]] === board[combo[2]]) {
            status.innerText = Победил ${board[combo[0]]}!;
            isMyTurn = false;
        }
    }
}
