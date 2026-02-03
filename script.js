const peer = new Peer(Math.floor(1000 + Math.random() * 9000).toString());
let conn = null;
let myRole = null; // 'DEFENDANT' или 'LAWYER'
let round = 1;
let justiceHistory = [50]; // Стартовая точка шкалы (0-100)
let myChoice = null;
let opponentChoice = null;

const scenarios = [
    { q: "ЭТАП 1: Первое заявление", choices: ["Признать вину частично", "Отрицать всё"] },
    { q: "ЭТАП 2: Улики", choices: ["Предоставить алиби", "Объявить улики фальшивкой"] },
    { q: "ЭТАП 3: Допрос свидетеля", choices: ["Давить на свидетеля", "Игнорировать показания"] },
    { q: "ЭТАП 4: Секретный протокол", choices: ["Раскрыть правду", "Уничтожить документ"] },
    { q: "ЭТАП 5: Последнее слово", choices: ["Просить о милосердии", "Обвинить систему"] }
];

peer.on('open', id => {
    document.getElementById('my-id').innerText = id;
    document.getElementById('case-id').innerText = id;
});

// Инициатор подключения
document.getElementById('connect-btn').onclick = () => {
    const peerId = document.getElementById('peer-id-input').value;
    setupConnection(peer.connect(peerId));
};

// Прием подключения
peer.on('connection', setupConnection);

function setupConnection(connection) {
    conn = connection;
    conn.on('open', () => {
        // Рандом ролей: инициатор будет LAWYER, если id меньше
        myRole = peer.id < conn.peer ? 'ПОДСУДИМЫЙ' : 'АДВОКАТ';
        startGame();
    });

    conn.on('data', data => {
        if (data.type === 'choice') {
            opponentChoice = data.value;
            checkRoundEnd();
        }
    });
}

function startGame() {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('role-display').innerText = `ВАША РОЛЬ: ${myRole}`;
    renderRound();
}

function renderRound() {
    opponentChoice = null;
    myChoice = null;
    const s = scenarios[round - 1];
    document.getElementById('scenario-text').innerText = s.q;
    document.getElementById('turn-status').innerText = `Раунд ${round} из 5`;
    
    const actionsDiv = document.getElementById('actions');
    actionsDiv.innerHTML = '';
    s.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.innerText = choice;
        btn.onclick = () => makeChoice(index);
        actionsDiv.appendChild(btn);
    });
}

function makeChoice(idx) {
    myChoice = idx;
    document.getElementById('actions').innerHTML = '<p>ОЖИДАНИЕ ХОДА ОППОНЕНТА...</p>';
    conn.send({ type: 'choice', value: idx });
    checkRoundEnd();
}

function checkRoundEnd() {
    if (myChoice !== null && opponentChoice !== null) {
        // Логика изменения шкалы (упрощенная)
        const diff = (myChoice + opponentChoice + 1) * 10; 
        const change = (round % 2 === 0) ? diff : -diff;
        const lastValue = justiceHistory[justiceHistory.length - 1];
        justiceHistory.push(Math.max(0, Math.min(100, lastValue + change)));

        if (round < 5) {
            round++;
            renderRound();
        } else {
            showFinal();
        }
    }
}

function showFinal() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('final-screen').classList.remove('hidden');
    
    const finalScore = justiceHistory[justiceHistory.length - 1];
    document.getElementById('verdict-text').innerText = finalScore > 50 ? "ВИНОВЕН" : "СВОБОДЕН";
    
    const container = document.getElementById('chart-container');
    justiceHistory.forEach(val => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${val}%`;
        container.appendChild(bar);
    });
}
