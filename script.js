const MAIN_ID = "jopa-global-v4";
let peer = null;
let connections = [];
let myProfile = { name: "Аноним", avatar: null };
const alertSound = new Audio('1.mp3');

// Превью аватара
document.getElementById('avatar-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        myProfile.avatar = reader.result;
        document.getElementById('avatar-preview').style.backgroundImage = `url(${reader.result})`;
    };
    reader.readAsDataURL(file);
};

document.getElementById('join-btn').onclick = () => {
    const n = document.getElementById('username-input').value;
    if (n) myProfile.name = n;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    initNetwork();
};

function initNetwork() {
    peer = new Peer(MAIN_ID);
    peer.on('open', () => { setStatus("Хост"); listen(); });
    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            peer = new Peer();
            peer.on('open', () => {
                const c = peer.connect(MAIN_ID, { reliable: true });
                setup(c);
                setStatus("В сети");
            });
        }
    });
}

function setStatus(s) { document.getElementById('status').innerText = s; }

function listen() {
    peer.on('connection', (c) => setup(c));
}

function setup(c) {
    c.on('open', () => {
        if (!connections.find(x => x.peer === c.peer)) connections.push(c);
        c.on('data', (data) => {
            if (data.type === 'sound') alertSound.play();
            if (peer.id === MAIN_ID) broadcast(data, c.peer);
            addMessage(data, 'friend');
        });
    });
}

function broadcast(d, skip) {
    connections.forEach(c => { if(c.open && c.peer !== skip) c.send(d); });
}

function sendMessage() {
    const ti = document.getElementById('message-input');
    const fi = document.getElementById('file-input');
    const val = ti.value.trim();

    // Система команд
    if (val === "!tictac") {
        sendData({ type: 'game', game: 'tictac', board: Array(9).fill(null) });
        ti.value = ''; return;
    }

    if (!val && !fi.files[0]) return;

    let p = { type: 'msg', name: myProfile.name, avatar: myProfile.avatar, text: val };

    if (fi.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
            p.file = reader.result;
            p.fileName = fi.files[0].name;
            p.fileType = fi.files[0].type;
            sendData(p);
            addMessage(p, 'my');
        };
        reader.readAsDataURL(fi.files[0]);
    } else {
        sendData(p);
        addMessage(p, 'my');
    }
    ti.value = ''; fi.value = '';
}

function sendData(d) {
    if (peer.id === MAIN_ID) broadcast(d, null);
    else {
        const h = connections.find(x => x.peer === MAIN_ID);
        if (h && h.open) h.send(d);
    }
}

function addMessage(d, type) {
    const box = document.getElementById('messages');
    const m = document.createElement('div');
    m.className = `msg ${type === 'my' ? 'my-msg' : ''}`;
    
    if (d.type === 'game') {
        m.innerHTML = `<b>Игра: Крестики-нолики</b><div class="ttt-grid"></div>`;
        const grid = m.querySelector('.ttt-grid');
        d.board.forEach((cell, i) => {
            const c = document.createElement('div');
            c.className = 'ttt-cell';
            c.innerText = cell || '';
            grid.appendChild(c);
        });
    } else {
        const ava = d.avatar ? `<img src="${d.avatar}" class="msg-avatar">` : "";
        m.innerHTML = `<div class="msg-info">${ava}<b>${d.name || 'Аноним'}</b></div>`;
        if (d.text) m.innerHTML += `<div>${d.text}</div>`;
        if (d.file) {
            if (d.fileType.startsWith('image/')) m.innerHTML += `<img src="${d.file}" class="msg-img">`;
            else m.innerHTML += `<a href="${d.file}" download="${d.fileName}" style="color:#0f8;">📎 ${d.fileName}</a>`;
        }
    }
    box.appendChild(m);
    box.parentElement.scrollTop = box.parentElement.scrollHeight;
}

document.getElementById('send-btn').onclick = sendMessage;
document.getElementById('alert-btn').onclick = () => {
    alertSound.play();
    sendData({ type: 'sound', sender: myProfile.name });
};
