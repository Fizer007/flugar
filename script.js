let peer = null;
let myPeerId = null;
let connectedConnection = null;
let isHost = false;

// Генерация короткого кода комнаты (например, "K9X2")
function generateShortCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function initPeer(customId = null) {
    const idToUse = customId || generateShortCode().toLowerCase();
    
    // Инициализируем PeerJS с бесплатным публичным сервером
    peer = new Peer(idToUse, {
        debug: 1
    });

    peer.on('open', (id) => {
        myPeerId = id.toUpperCase();
        document.getElementById('myRoomCode').innerText = myPeerId;
        console.log('Peer подключен с ID:', myPeerId);
    });

    // Если к нам подключается другой игрок (мы хост)
    peer.on('connection', (conn) => {
        isHost = true;
        connectedConnection = conn;
        setupConnectionHandlers();
        showToast('Игрок подключился к вашей комнате!');
        document.getElementById('uiPlayerCount').innerText = '2';
    });

    peer.on('error', (err) => {
        console.warn('Ошибка PeerJS, пробуем другой ID...', err);
        if (err.type === 'unavailable-id') {
            initPeer(); // Пересоздаем с новым ID, если этот занят
        }
    });
}

// Запускаем инициализацию при загрузке
initPeer();

// Копирование кода комнаты
document.getElementById('btnCopyRoomCode').addEventListener('click', () => {
    if (!myPeerId) return;
    navigator.clipboard.writeText(myPeerId).then(() => {
        showToast('Код комнаты скопирован: ' + myPeerId);
    });
});

// Кнопка подключения к комнате друга
document.getElementById('btnJoinRoom').addEventListener('click', () => {
    const code = document.getElementById('inputRoomId').value.trim().toLowerCase();
    if (!code) {
        showToast('Введите код комнаты!');
        return;
    }

    showToast('Подключение к ' + code.toUpperCase() + '...');
    isHost = false;
    
    connectedConnection = peer.connect(code);
    setupConnectionHandlers();
});

function setupConnectionHandlers() {
    if (!connectedConnection) return;

    connectedConnection.on('open', () => {
        showToast('Успешное подключение к комнате!');
        startGameScreen(connectedConnection.peer.toUpperCase());
    });

    connectedConnection.on('data', (data) => {
        handleNetworkData(data);
    });

    connectedConnection.on('close', () => {
        showToast('Игрок отключился');
        document.getElementById('uiPlayerCount').innerText = '1';
    });
}

function handleNetworkData(data) {
    // Здесь обрабатываются пакеты синхронизации игроков (позиция, выстрелы)
    if (data.type === 'pos') {
        // Логика получения позиции другого игрока
    }
}

// Переход в игру (Соло или Сеть)
document.getElementById('btnPlaySolo').addEventListener('click', () => {
    startGameScreen('SOLO');
});

function startGameScreen(roomCode) {
    document.getElementById('screenLobby').classList.add('hidden');
    document.getElementById('screenGame').classList.remove('hidden');
    document.getElementById('uiRoomCode').innerText = roomCode;
}

document.getElementById('btnLeaveGame').addEventListener('click', () => {
    if (connectedConnection) {
        connectedConnection.close();
    }
    document.getElementById('screenGame').classList.add('hidden');
    document.getElementById('screenLobby').classList.remove('hidden');
});

// Выбор персонажей для визуала
const CHARACTERS = {
    isaac: { name: 'Isaac', skin: '#fbcfe8', avatar: '💧' },
    hank: { name: 'Hank J.', skin: '#334155', avatar: '🕶️' },
    judas: { name: 'Judas', skin: '#1e1b18', avatar: '☪️' },
    azazel: { name: 'Azazel', skin: '#475569', avatar: '😈' }
};

let selectedChar = 'isaac';
function buildSelector() {
    const grid = document.getElementById('charSelectorGrid');
    grid.innerHTML = '';
    Object.entries(CHARACTERS).forEach(([key, char]) => {
        const card = document.createElement('div');
        card.className = `char-card p-2.5 flex flex-col items-center justify-center gap-1 text-center ${selectedChar === key ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-sm" style="background-color: ${char.skin}">${char.avatar}</div>
            <span class="text-xs font-bold text-neutral-200">${char.name}</span>
        `;
        card.addEventListener('click', () => {
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedChar = key;
            document.getElementById('selectedCharTitle').innerText = char.name;
        });
        grid.appendChild(card);
    });
}
buildSelector();

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2500);
}
