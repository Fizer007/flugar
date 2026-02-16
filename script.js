const MAIN_ID = "jopa-global-chat-room-v3"; // Новый ID для чистого теста
let peer = null;
let connections = []; 
let myProfile = { name: "Аноним", avatar: null };
const alertSound = new Audio('1.mp3');

// Настройка профиля
document.getElementById('avatar-input').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = () => {
        myProfile.avatar = reader.result;
        document.getElementById('avatar-preview').style.backgroundImage = `url(${reader.result})`;
    };
    reader.readAsDataURL(e.target.files[0]);
};

document.getElementById('join-btn').onclick = () => {
    const name = document.getElementById('username-input').value;
    if (name) myProfile.name = name;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    connectToNetwork();
};

function connectToNetwork() {
    if (peer) peer.destroy();
    
    // Пытаемся стать хостом
    peer = new Peer(MAIN_ID);

    peer.on('open', (id) => {
        addSystemMsg("Вы зашли как ХОСТ (Главный)");
        listenForGuests();
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id' || err.type === 'id-taken') {
            // Если ID занят, заходим как обычный юзер
            joinAsGuest();
        } else {
            console.error("Ошибка:", err);
            // Если критическая ошибка, пробуем переподключиться через 3 сек
            setTimeout(connectToNetwork, 3000);
        }
    });
}

function listenForGuests() {
    peer.on('connection', (conn) => {
        setupConn(conn);
    });
}

function joinAsGuest() {
    peer = new Peer(); // Генерируем случайный ID для себя
    peer.on('open', () => {
        const conn = peer.connect(MAIN_ID, { reliable: true });
        setupConn(conn);
        addSystemMsg("Подключено к хосту");
    });
}

function setupConn(conn) {
    conn.on('open', () => {
        if (!connections.find(c => c.peer === conn.peer)) {
            connections.push(conn);
        }
        
        conn.on('data', (data) => {
            if (data.type === 'sound') {
                alertSound.play();
                addSystemMsg(`${data.sender} отправил сигнал!`);
            } else {
                addMessage(data, 'friend');
            }

            // Реле: если мы хост, рассылаем всем остальным
            if (peer.id === MAIN_ID) {
                broadcast(data, conn.peer);
            }
        });

        conn.on('close', () => {
            connections = connections.filter(c => c.peer !== conn.peer);
        });
    });
}

function broadcast(data, skipId) {
    connections.forEach(c => {
        if (c.open && c.peer !== skipId) c.send(data);
    });
}

// Отправка звука
document.getElementById('alert-btn').onclick = () => {
    const data = { type: 'sound', sender: myProfile.name };
    alertSound.play();
    sendRawData(data);
};

function sendMessage() {
    const textInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    if (!textInput.value && !fileInput.files[0]) return;

    let payload = {
        type: 'msg',
        name: myProfile.name,
        avatar: myProfile.avatar,
        text: textInput.value,
        file: null
    };

    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
            payload.file = reader.result;
            payload.fileName = fileInput.files[0].name;
            payload.fileType = fileInput.files[0].type;
            sendRawData(payload);
            addMessage(payload, 'my');
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        sendRawData(payload);
        addMessage(payload, 'my');
    }
    textInput.value = '';
    fileInput.value = '';
}

function sendRawData(data) {
    if (peer.id === MAIN_ID) {
        broadcast(data, null);
    } else {
        const host = connections.find(c => c.peer === MAIN_ID);
        if (host && host.open) host.send(data);
    }
}

function addMessage(data, type) {
    const box = document.getElementById('messages');
    const msg = document.createElement('div');
    msg.className = `msg ${type === 'my' ? 'my-msg' : ''}`;
    const avatar = data.avatar ? `<img src="${data.avatar}" class="msg-avatar">` : "";
    msg.innerHTML = `<div class="msg-info">${avatar}<b>${data.name}</b></div>`;
    if (data.text) msg.innerHTML += `<div>${data.text}</div>`;
    if (data.file) {
        if (data.fileType.startsWith('image/')) {
            msg.innerHTML += `<img src="${data.file}" class="msg-img" onclick="window.open(this.src)">`;
        } else {
            msg.innerHTML += `<a href="${data.file}" download="${data.fileName}" class="msg-file">📎 ${data.fileName}</a>`;
        }
    }
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}

function addSystemMsg(text) {
    const box = document.getElementById('messages');
    const div = document.createElement('div');
    div.style.cssText = "text-align:center; font-size:10px; color:gray; margin: 5px 0;";
    div.innerText = text;
    box.appendChild(div);
}

document.getElementById('send-btn').onclick = sendMessage;
