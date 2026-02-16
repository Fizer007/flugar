const peer = new Peer(); // Создаем объект Peer
let conn;

// Отображаем твой ID
peer.on('open', (id) => {
    document.getElementById('my-id').innerText = id;
});

// Слушаем входящие подключения
peer.on('connection', (connection) => {
    conn = connection;
    setupChat();
});

// Кнопка подключения к другу
document.getElementById('connect-btn').onclick = () => {
    const friendId = document.getElementById('friend-id').value;
    conn = peer.connect(friendId);
    setupChat();
};

function setupChat() {
    conn.on('data', (data) => {
        addMessage(data, 'friend');
    });
    
    conn.on('open', () => {
        addMessage("Система: Подключено!", "system");
    });
}

// Отправка сообщений
document.getElementById('send-btn').onclick = sendMessage;
function sendMessage() {
    const msg = document.getElementById('message-input').value;
    if (conn && conn.open) {
        conn.send(msg);
        addMessage(msg, 'my');
        document.getElementById('message-input').value = '';
    }
}

function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg');
    if (type === 'my') msgDiv.classList.add('my-msg');
    msgDiv.innerText = text;
    document.getElementById('messages').appendChild(msgDiv);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
}
