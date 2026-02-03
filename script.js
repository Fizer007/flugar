let peer = new Peer();
let conn;
let myRole = ""; 
let chatHistory = [];
let isMyTurn = false;

// Элементы
const myIdDisplay = document.getElementById('my-id');
const peerIdInput = document.getElementById('peer-id');
const connectBtn = document.getElementById('connect-btn');
const testBtn = document.getElementById('test-btn');
const gameArea = document.getElementById('game-area');
const setupRoom = document.getElementById('setup-room');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const roleDisplay = document.getElementById('role-display');
const statusDiv = document.getElementById('judge-status');

peer.on('open', id => myIdDisplay.innerText = id);

peer.on('connection', c => {
    conn = c;
    setupConnectionListeners();
});

connectBtn.onclick = () => {
    const remoteId = peerIdInput.value.trim();
    if (!remoteId) return alert("Введите ID!");
    conn = peer.connect(remoteId);
    conn.on('open', () => {
        const r = Math.random() > 0.5 ? "ОБВИНИТЕЛЬ" : "АДВОКАТ";
        conn.send({ type: 'START', role: (r === "ОБВИНИТЕЛЬ" ? "АДВОКАТ" : "ОБВИНИТЕЛЬ") });
        startGame(r);
    });
    setupConnectionListeners();
};

function setupConnectionListeners() {
    conn.on('data', data => {
        if (data.type === 'START') startGame(data.role);
        if (data.type === 'MSG') processMove("ОППОНЕНТ", data.text);
    });
}

function startGame(role) {
    myRole = role;
    chatHistory = [];
    setupRoom.classList.add('hidden');
    gameArea.classList.remove('hidden');
    roleDisplay.innerText = "Роль: " + myRole;
    isMyTurn = myRole.includes("ОБВИНИТЕЛЬ");
    updateInputState();
    addMessage("СИСТЕМА", isMyTurn ? "Ваш ход. Начните суд." : "Ждем оппонента...");
}

function updateInputState() {
    messageInput.disabled = !isMyTurn;
    sendBtn.disabled = !isMyTurn;
}

sendBtn.onclick = async () => {
    const text = messageInput.value.trim();
    if (!text) return;
    addMessage("ВЫ", text);
    if (conn) conn.send({ type: 'MSG', text: text });
    messageInput.value = "";
    isMyTurn = false;
    updateInputState();
    await processMove("ВЫ", text); 
};

async function processMove(sender, text) {
    chatHistory.push(`${sender === "ВЫ" ? myRole : "ОППОНЕНТ"}: ${text}`);
    await askJudge();
    if (sender === "ОППОНЕНТ" && !statusDiv.innerText.includes("ВЕРДИКТ")) {
        isMyTurn = true;
        updateInputState();
    }
}

// ФУНКЦИЯ С ИИ БЕЗ КЛЮЧА
async function askJudge() {
    async function askJudge() {
   async function askJudge() {
    if (!statusDiv) return;
    statusDiv.innerHTML = '🔨 СУДЬЯ ВЫХОДИТ ИЗ ТЕНИ...';

    // Текст для ИИ
    const lastMsg = chatHistory[chatHistory.length - 1];
    const prompt = `Ты строгий судья. Одной короткой фразой прокомментируй: ${lastMsg}`;

    // Настройка прерывания (если сеть висит дольше 3 секунд)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        // Используем Pollinations через простой URL (это решает проблемы CORS)
        const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`;
        
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) throw new Error("API не отвечает");

        const aiText = await response.text();
        clearTimeout(timeoutId);
        
        statusDiv.innerHTML = ""; 
        addMessage("СУДЬЯ", aiText);

    } catch (e) {
        // ЕСЛИ СЕТЬ ИЛИ ХОСТИНГ БЛОКИРУЮТ — ВКЛЮЧАЕМ ЛОКАЛЬНОГО БОТА
        clearTimeout(timeoutId);
        console.warn("Сеть заблокирована, включен локальный режим");
        
        const backupPhrases = [
            "Суд принял это к сведению. Что скажет защита?",
            "Это серьезное заявление. Продолжайте.",
            "Интересная позиция. Суд слушает дальше.",
            "Протест отклонен! Говорите по существу.",
            "Хмм... Звучит сомнительно. Есть ли факты?"
        ];
        
        const randomPhrase = backupPhrases[Math.floor(Math.random() * backupPhrases.length)];
        statusDiv.innerHTML = "";
        addMessage("СУДЬЯ (AUTO)", randomPhrase);
    }

    // Логика финала процесса (после 6 сообщений)
    if (chatHistory.length >= 6) {
        const winner = Math.random() > 0.5 ? "ОБВИНИТЕЛЬ" : "АДВОКАТ";
        setTimeout(() => {
            addMessage("СУДЬЯ", `ВЕРДИКТ ВЫНЕСЕН! Победил ${winner}. Заседание окончено.`);
            isMyTurn = false;
            updateInputState();
        }, 500);
    }
}


    try {
        const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                model: "openai"
            }),
            signal: controller.signal // Привязываем таймер
        });

        const aiText = await response.text();
        clearTimeout(timeoutId);
        statusDiv.innerHTML = ""; 
        addMessage("СУДЬЯ", aiText);

    } catch (e) {
        // ЕСЛИ ИИ НЕ ОТВЕТИЛ (БЛОКИРОВКА ИЛИ СЕТЬ) - ВКЛЮЧАЕМ БОТА
        console.log("ИИ недоступен, включаю запасного судью...");
        const backupPhrases = [
            "Суд принял ваше заявление.",
            "Обвинение звучит серьезно. Что скажет защита?",
            "Интересный аргумент. Продолжайте.",
            "Соблюдайте тишину! Суд слушает."
        ];
        const randomPhrase = backupPhrases[Math.floor(Math.random() * backupPhrases.length)];
        
        statusDiv.innerHTML = "";
        addMessage("СУДЬЯ (БОТ)", randomPhrase);
    }

    // Проверка на вердикт
    if (chatHistory.length >= 6) {
        addMessage("СУДЬЯ", "ВЕРДИКТ ВЫНЕСЕН! Процесс завершен.");
        isMyTurn = false;
        updateInputState();
    }
}

    try {
        // Используем публичный прокси для Llama (бесплатно, без ключа)
        const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                model: "openai" // Использует GPT-подобную модель через прокси
            })
        });

        const aiText = await response.text();
        
        statusDiv.innerHTML = ""; 
        addMessage("СУДЬЯ", aiText);

        if (aiText.includes("ВЕРДИКТ ВЫНЕСЕН")) {
            isMyTurn = false;
            updateInputState();
        }
    } catch (e) {
        statusDiv.innerHTML = "Судья взял перерыв (ошибка сети)";
        console.error(e);
    }
}

function addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

testBtn.onclick = () => startGame("ОБВИНИТЕЛЬ (ТЕСТ)");
