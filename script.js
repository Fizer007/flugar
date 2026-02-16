const MAIN_ID = "jopa-global-chat-room"; // Уникальный ID комнаты
let peer = null;
let conn = null;
let connections = []; 
let myProfile = { name: "Аноним", avatar: null };

// Превью аватара
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
    startPeer();
};

function startPeer() {
    // Пытаемся создать Peer с нашим общим ID
    peer = new Peer(MAIN_ID);

    peer.on('open', (id) => {
        document.getElementById('status').innerText = "Ты — хост чата";
        listenMessages();
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            // Если ID занят, значит хост уже есть. Подключаемся к нему.
            peer = new Peer(); // Создаем случайный ID для себя
            peer.on('open', () => {
                conn = peer.connect(MAIN_ID);
                setupConnection(conn);
                document.getElementById('status').innerText = "В сети (Общий чат)";
            });
        }
    });
}

function listenMessages() {
    peer.on('connection', (c) => {
        connections.push(c);
        c.on('data', (data) => {
            addMessage(data, 'friend');
            broadcast(data, c.peer); // Рассылаем всем остальным
        });
    });
}

function setupConnection(c) {
    c.on('data', (data) => {
        addMessage(data, 'friend');
    });
}

function broadcast(data, skipPeer) {
    connections.forEach(c => {
        if (c.open && c.peer !== skipPeer) c.send(data);
    });
}

document.getElementById('send-btn').onclick = sendMessage;

function sendMessage() {
    const text = document.getElementById('message-input').value;
    const fileInput = document.getElementById('file-input');
    
    let payload = {
        name: myProfile.name,
        avatar: myProfile.avatar,
        text: text,
        file: null,
        fileName: "",
        fileType: ""
    };

    const finalize = () => {
        if (conn && conn.open) conn.send(payload); // Шлем хосту
        if (connections.length > 0) broadcast(payload, null); // Шлем гостям, если мы хост
        
        addMessage(payload, 'my');
        document.getElementById('message-input').value = '';
        fileInput.value = '';
    };

    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
            payload.file = reader.result;
            payload.fileName = fileInput.files[0].name;
            payload.fileType = fileInput.files[0].type;
            finalize();
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else if (text.trim() !== "") {
        finalize();
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
