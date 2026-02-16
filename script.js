const MAIN_ID = "jopa-global-chat-room-v2"; // Изменил ID, чтобы сбросить старые сессии
let peer = null;
let connections = []; 
let myProfile = { name: "Аноним", avatar: null };

// Выбор аватара
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
    startChat();
};

function startChat() {
    // Пытаемся стать главным узлом (хостом)
    peer = new Peer(MAIN_ID);

    peer.on('open', (id) => {
        addSystemMsg("Вы создали комнату. Ждем друзей...");
        initPeerLogic();
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            // Если ID jopa занят, создаем обычный Peer и подключаемся к jopa
            peer = new Peer();
            peer.on('open', () => {
                const conn = peer.connect(MAIN_ID, { reliable: true });
                setupConnection(conn);
                addSystemMsg("Подключаемся к общему чату...");
            });
        } else {
            console.error("Ошибка Peer:", err);
        }
    });
}

function initPeerLogic() {
    peer.on('connection', (conn) => {
        setupConnection(conn);
    });
}

function setupConnection(conn) {
    conn.on('open', () => {
        if (!connections.find(c => c.peer === conn.peer)) {
            connections.push(conn);
        }
        addSystemMsg("Связь установлена!");

        conn.on('data', (data) => {
            // Если мы ХОСТ, пересылаем сообщение всем остальным
            if (peer.id === MAIN_ID) {
                broadcast(data, conn.peer);
            }
            addMessage(data, 'friend');
        });

        conn.on('close', () => {
            addSystemMsg("Кто-то покинул чат");
            connections = connections.filter(c => c.peer !== conn.peer);
        });
    });
}

function broadcast(data, skipPeerId) {
    connections.forEach(c => {
        if (c.open && c.peer !== skipPeerId) {
            c.send(data);
        }
    });
}

function sendMessage() {
    const textInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    
    if (!textInput.value && !fileInput.files[0]) return;

    let payload = {
        name: myProfile.name,
        avatar: myProfile.avatar,
        text: textInput.value,
        file: null,
        fileName: "",
        fileType: ""
    };

    const sendAction = () => {
        // Если мы клиент, шлем хосту
        if (peer.id !== MAIN_ID) {
            const hostConn = connections.find(c => c.peer === MAIN_ID);
            if (hostConn && hostConn.open) hostConn.send(payload);
        } 
        // Если мы хост, шлем всем клиентам
        else {
            broadcast(payload, null);
        }

        addMessage(payload, 'my');
        textInput.value = '';
        fileInput.value = '';
    };

    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
            payload.file = reader.result;
            payload.fileName = fileInput.files[0].name;
            payload.fileType = fileInput.files[0].type;
            sendAction();
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        sendAction();
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
    div.innerText = "Система: " + text;
    box.appendChild(div);
}

document.getElementById('send-btn').onclick = sendMessage;
document.getElementById('message-input').onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
