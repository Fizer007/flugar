/**
 * HACKER_CONSOLE_v1 - Debug & Duel Edition
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(f = 500, d = 0.05) {
    try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.value = f; g.gain.value = 0.05;
        o.start(); o.stop(audioCtx.currentTime + d);
    } catch(e) {}
}

const myId = Math.random().toString(36).substr(2, 6).toUpperCase();
// Создаем Peer с выводом ошибок в лог
const peer = new Peer(myId, {
    debug: 3 // Включает детальный лог в консоль браузера
});

let conn = null;
let gameState = "IDLE"; 
let originalCode = "";
let attackCount = 0;

const output = document.getElementById('output');
const input = document.getElementById('command-input');
input.setAttribute('readonly', 'true');

function log(msg, type = "info") {
    const div = document.createElement('div');
    div.textContent = (type === "err" ? "[ERROR] " : (type === "sys" ? ">> " : "")) + msg;
    div.style.color = type === "err" ? "#ff4444" : (type === "sys" ? "#888" : "#fff");
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    beep(type === "err" ? 150 : 400);
}

// --- ОТЛАДКА ОШИБОК ---
peer.on('error', (err) => {
    log(`PEER_ERROR: ${err.type} - ${err.message}`, "err");
});

peer.on('open', id => {
    log(`CONSOLE_ONLINE. YOUR_ID: ${id}`);
    log(`COMMAND: MINIGAME2_[ID]`);
});

// --- ПРИЕМ СОЕДИНЕНИЯ ---
peer.on('connection', c => {
    conn = c;
    log(`INCOMING CONNECTION FROM: ${c.peer}`, "sys");
    setupPeerListeners();
});

function setupPeerListeners() {
    conn.on('open', () => {
        log("P2P_LINK_ACTIVE: READY TO PLAY", "sys");
    });

    conn.on('data', data => {
        log(`DEBUG_DATA_RECEIVED: ${data.type}`, "sys"); // Отладка пакетов
        
        if (data.type === 'G2_INIT') {
            originalCode = data.code;
            log("MEMORIZE YOUR CODE: " + originalCode);
            setTimeout(() => {
                for(let i=0; i<15; i++) log(""); 
                log("WAITING FOR ENEMY ATTACK...", "sys");
                gameState = "AWAITING_ATTACK";
            }, 5000);
        }
        
        if (data.type === 'YOUR_TURN_ATTACK') {
            log("PHASE: ATTACK! REMOVE 3 SYMBOLS FROM ENEMY CODE", "sys");
            log("TARGET: " + data.code);
            gameState = "G2_ATTACK";
        }
    });

    conn.on('close', () => log("CONNECTION_LOST", "err"));
    conn.on('error', (err) => log("CONN_ERROR: " + err, "err"));
}

// --- ОБРАБОТКА КОМАНД ---
function handleCommand(val) {
    val = val.toUpperCase().trim();
    if (!val) return;

    if (gameState === "IDLE") {
        if (val.startsWith("MINIGAME2_")) {
            const targetId = val.split("_")[1];
            if (!targetId) { log("INVALID_ID", "err"); return; }
            
            log(`ATTEMPTING CONNECT TO: ${targetId}...`, "sys");
            conn = peer.connect(targetId);
            
            // Навешиваем слушателей сразу
            setupPeerListeners();

            conn.on('open', () => {
                const code = "ROOT_KEY_" + Math.floor(Math.random()*999);
                originalCode = code;
                log("LINK_STABLE. SENDING INIT...");
                conn.send({type: 'G2_INIT', code: code});
                
                log("MEMORIZE YOUR CODE: " + originalCode);
                setTimeout(() => {
                    for(let i=0; i<15; i++) log(""); 
                    gameState = "G2_ATTACK";
                    log("PHASE: ATTACK! REMOVE 3 SYMBOLS", "sys");
                    log("TARGET: " + code);
                }, 5000);
            });
        } else {
            log(`UNKNOWN: ${val}`);
        }
        return;
    }

    // Логика атаки
    if (gameState === "G2_ATTACK") {
        if (val.length === 1 && originalCode.includes(val)) {
            attackCount++;
            originalCode = originalCode.replace(val, "_");
            log(`REMOVED: ${val} (${attackCount}/3)`);
            if (attackCount === 3) {
                conn.send({type: 'YOUR_TURN_ATTACK', code: originalCode});
                log("ATTACK_SENT. WAIT...", "sys");
                gameState = "IDLE";
                attackCount = 0;
            }
        }
    }
}

// --- КЛАВИАТУРА ---
const vKey = document.getElementById('v-keyboard');
vKey.innerHTML = ""; // Очистка перед рендером
vKey.style.display = "grid";
vKey.style.gridTemplateColumns = "repeat(10, 1fr)";
vKey.style.gap = "4px";

const layout = "1234567890QWERTYUIOPASDFGHJKLZXCVBNM@._".split("");
layout.forEach(char => {
    const k = document.createElement('div');
    k.className = 'key'; k.innerText = char;
    k.onclick = () => { input.value += char; beep(300, 0.02); };
    vKey.appendChild(k);
});

const nav = document.createElement('div');
nav.style = "grid-column: span 10; display: flex; gap: 5px; margin-top: 5px;";
const btnS = "flex: 1; border: 1px solid #fff; color: #fff; text-align: center; padding: 18px; cursor: pointer; font-family: inherit;";

const back = document.createElement('div'); back.innerText = "BACK"; back.style = btnS;
const spc = document.createElement('div'); spc.innerText = "SPACE"; spc.style = btnS + "flex: 2;";
const ent = document.createElement('div'); ent.innerText = "ENTER"; ent.style = btnS;

back.onclick = () => { input.value = input.value.slice(0, -1); beep(200); };
spc.onclick = () => { input.value += " "; beep(200); };
ent.onclick = () => { 
    handleCommand(input.value); 
    input.value = ""; 
    beep(600); 
};

nav.append(back, spc, ent);
vKey.appendChild(nav);
