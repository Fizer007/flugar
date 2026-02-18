const PEER_ID = "novella-pro-room-v8";
let peer = null, conn = null, activeImage = null, isWaiting = false, isOffline = false;
let lastActiveField = null;

const randomData = {
    "quest-text": ["Слышен скрип двери...", "Внезапно гаснет свет.", "Вы находите записку.", "Кто-то шепчет ваше имя."],
    "location-input": ["Тёмный лес", "Замок", "Бункер", "Чердак"],
    "default": ["Бежать", "Спрятаться", "Закричать", "Ждать"]
};

function init() {
    peer = new Peer(PEER_ID);
    peer.on('open', () => setStatus("Вы Автор"));
    peer.on('connection', c => { conn = c; setupConn(); });
    peer.on('error', () => {
        peer = new Peer();
        peer.on('open', () => { conn = peer.connect(PEER_ID); setupConn(); setStatus("Вы Игрок"); });
    });
}

function setupConn() {
    conn.on('data', data => handleData(data));
    conn.on('open', () => setStatus("Связь установлена"));
}

// Рандомайзер
document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') lastActiveField = e.target;
});

document.getElementById('idea-btn').onclick = () => {
    if (!lastActiveField) return;
    const pool = randomData[lastActiveField.id] || randomData["default"];
    lastActiveField.value = pool[Math.floor(Math.random() * pool.length)];
};

// Картинка
document.getElementById('image-input').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = () => {
        activeImage = reader.result;
        document.getElementById('img-preview-container').style.display = 'block';
        document.getElementById('preview-src').src = activeImage;
    };
    reader.readAsDataURL(e.target.files[0]);
};

function clearImage() { activeImage = null; document.getElementById('img-preview-container').style.display = 'none'; }

// UI Настройки
function updateActionUI() {
    const mode = document.getElementById('action-type').value;
    document.getElementById('ui-choice').style.display = (mode === 'choice' || mode === 'timed_choice') ? 'block' : 'none';
    document.getElementById('ui-timed').style.display = (mode === 'timed_choice') ? 'block' : 'none';
    document.getElementById('ui-clicker').style.display = (mode === 'clicker') ? 'block' : 'none';
}

document.getElementById('add-opt').onclick = () => {
    const inp = document.createElement('input'); inp.className = 'opt-input'; inp.placeholder = 'Вариант...';
    document.getElementById('options-list').appendChild(inp);
};
document.getElementById('rem-opt').onclick = () => {
    const list = document.getElementById('options-list');
    if(list.children.length > 2) list.removeChild(list.lastChild);
};

// Отправка
document.getElementById('send-btn').onclick = () => {
    if(isWaiting && !isOffline) return;
    const mode = document.getElementById('action-type').value;
    const color = document.getElementById('bg-color').value;

    let packet = {
        type: 'quest', mode: mode, color: color, img: activeImage,
        text: document.getElementById('quest-text').value,
        loc: document.getElementById('location-input').value || "Локация"
    };

    if(mode.includes('choice')) {
        packet.options = Array.from(document.querySelectorAll('.opt-input')).map(i => i.value).filter(v => v);
        if(mode === 'timed_choice') packet.time = Math.min(document.getElementById('time-limit').value || 10, 60);
    } else if(mode === 'clicker') {
        packet.target = document.getElementById('qte-target').value || 10;
        packet.time = Math.min(document.getElementById('qte-time').value || 5, 60);
    }

    if(isOffline) handleData(packet); else if(conn) { conn.send(packet); setLock(true); }
    addLog(`Отправлено: ${packet.loc}`, color);
};

function handleData(data) {
    if(data.type === 'quest') { switchRole('player'); renderQuest(data); }
    if(data.type === 'answer') { setLock(false); addLog(`Ответ: ${data.val}`, data.color); }
}

function renderQuest(data) {
    const actions = document.getElementById('player-actions');
    const timerBox = document.getElementById('timer-bar');
    const fill = document.getElementById('timer-fill');

    document.getElementById('player-story-text').innerText = data.text;
    document.getElementById('player-loc').innerText = data.loc;
    document.getElementById('player-loc').style.backgroundColor = data.color;
    document.getElementById('dynamic-bg').style.background = `radial-gradient(circle at 50% 50%, ${data.color} 0%, transparent 70%)`;
    
    if(data.img) {
        document.getElementById('player-img-box').style.display = 'block';
        document.getElementById('view-img').src = data.img;
    } else document.getElementById('player-img-box').style.display = 'none';

    actions.innerHTML = "";
    timerBox.style.display = 'none';

    if(data.mode.includes('choice')) {
        data.options.forEach(opt => {
            const b = document.createElement('button'); b.className = 'choice-btn'; b.innerText = opt;
            b.onclick = () => sendAns(opt, data.color);
            actions.appendChild(b);
        });
        if(data.mode === 'timed_choice') {
            timerBox.style.display = 'block'; fill.style.width = '100%';
            setTimeout(() => { fill.style.transition = `width ${data.time}s linear`; fill.style.width = '0%'; }, 50);
            window.qteT = setTimeout(() => { actions.innerHTML = "ВРЕМЯ ВЫШЛО"; sendAns("Время вышло", data.color); }, data.time * 1000);
        }
    } else if(data.mode === 'text_input') {
        actions.innerHTML = '<input type="text" id="p-ans" placeholder="Ваш ответ..."><button class="primary-btn" id="p-send">Ответить</button>';
        document.getElementById('p-send').onclick = () => sendAns(document.getElementById('p-ans').value, data.color);
    } else if(data.mode === 'clicker') {
        let c = 0;
        const b = document.createElement('button'); b.className = 'qte-btn'; b.innerText = data.target;
        b.onclick = () => { c++; b.innerText = data.target - c; if(c >= data.target) { clearTimeout(window.qteT); sendAns("Успех!", data.color); }};
        actions.appendChild(b);
        window.qteT = setTimeout(() => { if(c < data.target) sendAns("Провал", data.color); }, data.time * 1000);
    }
}

function sendAns(val, color) {
    clearTimeout(window.qteT);
    const p = { type: 'answer', val: val, color: color };
    if(isOffline) handleData(p); else if(conn) conn.send(p);
    document.getElementById('player-actions').innerHTML = "Отправлено...";
}

function setLock(l) { isWaiting = l; document.getElementById('send-btn').disabled = l; }
function addLog(t, c) {
    const d = document.createElement('div'); d.className = 'history-item';
    d.style.borderLeftColor = c; d.innerText = t;
    document.getElementById('answers-history').prepend(d);
}
function setStatus(s) { document.getElementById('status-bar').innerText = "Система: " + s; }
function switchRole(r) {
    document.getElementById('author-panel').style.display = r === 'author' ? 'block' : 'none';
    document.getElementById('player-panel').style.display = r === 'player' ? 'block' : 'none';
    document.getElementById('btn-author').classList.toggle('active', r === 'author');
    document.getElementById('btn-player').classList.toggle('active', r === 'player');
}
document.getElementById('offline-mode').onchange = (e) => isOffline = e.target.checked;

init();
