const ROOM_NAME = "gemini_global_relay_"; // Префикс для общей комнаты
let myId = "";
let myProfile = { name: "Аноним", avatar: null };
let connections = [];

const peer = new Peer();

// Генерация аватара
document.getElementById('avatar-input').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = () => {
        myProfile.avatar = reader.result;
        document.getElementById('avatar-preview').style.backgroundImage = `url(${reader.result})`;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// Вход
document.getElementById('join-btn').onclick = () => {
    const name = document.getElementById('username-input').value;
    if (name) myProfile.name = name;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    initDiscovery();
};

// Поиск других участников (симуляция сервера)
function initDiscovery() {
    // В реальном PeerJS без сервера мы просто ждем входящих 
    // или подключаемся к известному ID. Для "общего чата" 
    // обычно используется один ID как координатор.
}

peer.on('open', (id) => {
    myId = id;
    console.log("Мой ID:", id);
});

peer.on('connection', (conn) => {
    setupConn(conn);
});

function setupConn(conn) {
    conn.on('open', () => {
        if (!connections.includes(conn)) connections.push(conn);
        
        conn.on('data', (data) => {
            addMessage(data, 'friend');
            // Пересылка сообщения другим (relay), чтобы все видели всех
            connections.forEach(c => {
                if (c.peer !== conn.peer && c.open) c.send(data);
            });
        });
    });
}

// Отправка данных
document.getElementById('send-btn').onclick = () => {
    const text = document.getElementById('message-input').value;
    const file = document.getElementById('file-input').files[0];

    const data = {
        name: myProfile.name,
        avatar: myProfile.avatar,
        text: text,
        file: null,
        fileName: "",
        fileType: ""
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            data.file = reader.result;
            data.fileName = file.name;
            data.fileType = file.type;
            finalizeSend(data);
        };
        reader.readAsDataURL(file);
    } else if (text.trim() !== "") {
        finalizeSend(data);
    }
};

function finalizeSend(data) {
    connections.forEach(c => { if(c.open) c.send(data); });
    addMessage(data, 'my');
    document.getElementById('message-input').value = "";
    document.getElementById('file-input').value = "";
}

function addMessage(data, type) {
    const box = document.getElementById('messages');
    const msg = document.createElement('div');
    msg.className = `msg ${type === 'my' ? 'my-msg' : ''}`;

    const avatarHtml = data.avatar ? `<img src="${data.avatar}" class="msg-avatar">` : "";
    msg.innerHTML = `
        <div class="msg-info">${avatarHtml} <b>${data.name}</b></div>
        ${data.text ? `<div>${data.text}</div>` : ""}
    `;

    if (data.file) {
        if (data.fileType.startsWith('image/')) {
            msg.innerHTML += `<img src="${data.file}" class="msg-img">`;
        } else {
            msg.innerHTML += `<a href="${data.file}" download="${data.fileName}" class="msg-file">📎 ${data.fileName}</a>`;
        }
    }

    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}
