let peer, conn;
const myIdDisplay = document.getElementById('my-id');
const statusDisplay = document.getElementById('status');
const connectBtn = document.getElementById('connect-btn');

// --- Инициализация PeerJS ---
function initPeer() {
    // Создаем случайный ID, если сервер задерживается
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    
    peer = new Peer('game-' + randomId); 

    peer.on('open', (id) => {
        myIdDisplay.innerText = id;
        statusDisplay.innerText = "Готов к подключению";
        statusDisplay.style.color = "#44ff44";
    });

    peer.on('error', (err) => {
        console.error(err);
        statusDisplay.innerText = "Ошибка: " + err.type;
        // Если ID занят, пробуем еще раз
        if(err.type === 'unavailable-id') setTimeout(initPeer, 1000);
    });

    // Слушаем входящие подключения
    peer.on('connection', (incomingConn) => {
        conn = incomingConn;
        setupChat();
        statusDisplay.innerText = "Друг подключился!";
        goToMenu();
    });
}

connectBtn.onclick = () => {
    const peerId = document.getElementById('peer-id-input').value;
    if (!peerId) return alert("Введите ID!");
    
    conn = peer.connect(peerId);
    setupChat();
    statusDisplay.innerText = "Подключение...";
};

function setupChat() {
    conn.on('open', () => {
        statusDisplay.innerText = "Связь установлена!";
        goToMenu();
    });
    conn.on('data', (data) => handleIncomingData(data));
    conn.on('close', () => {
        alert("Связь потеряна");
        location.reload();
    });
}

function skipConnection() {
    goToMenu();
    statusDisplay.innerText = "Одиночный режим (тест)";
}

function goToMenu() {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-selection').classList.remove('hidden');
}

// --- Логика выбора игр ---
function selectGame(gameName) {
    renderGame(gameName);
    if (conn && conn.open) {
        conn.send({ type: 'switch-game', name: gameName });
    }
}

function handleIncomingData(data) {
    if (data.type === 'switch-game') {
        renderGame(data.name);
    }
    if (data.type === 'move') {
        updateGameSate(data.payload);
    }
}

function renderGame(name) {
    document.getElementById('game-selection').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    const area = document.getElementById('game-area');
    document.getElementById('game-title').innerText = name.toUpperCase();
    
    area.innerHTML = ''; // Очистка

    if (name === 'tictactoe') {
        area.innerHTML = <div class="ttt-grid"> + 
            Array(9).fill().map((_, i) => <div class="cell" onclick="makeMove(${i}) "id="c${i}"></div>).join('') + 
            </div>;
    } else if (name === 'clicker') {
        area.innerHTML = <h3>Кликай быстрее!</h3><button class="huge-btn" onclick="makeMove('click')">КЛИК!</button><div id="score">0</div>;
    } else if (name === 'guess') {
        area.innerHTML = <h3>Угадай число 1-10</h3><input type="number" id="guessInput"><button onclick="makeMove(document.getElementById('guessInput').value)">Проверить</button>;
    } else {
        area.innerHTML = <h3>Игра ${name} в разработке</h3>;
    }
}

// Запуск Peer при загрузке
initPeer();
