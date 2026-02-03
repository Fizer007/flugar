/**
 * HACKER_CONSOLE_v1 - Duel System
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(f = 500, d = 0.05) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = f; g.gain.value = 0.05;
    o.start(); o.stop(audioCtx.currentTime + d);
}

const myId = Math.random().toString(36).substr(2, 6).toUpperCase();
const peer = new Peer(myId);
let conn = null;
let gameState = "IDLE"; 
let originalCode = "";
let currentCode = "";
let attackCount = 0;
let gameTimer = null;

const output = document.getElementById('output');
const input = document.getElementById('command-input');
input.setAttribute('readonly', 'true');

function log(msg, type = "info") {
    const div = document.createElement('div');
    div.textContent = (type === "sys" ? ">> " : "") + msg;
    div.style.color = type === "err" ? "#f00" : (type === "sys" ? "#888" : "#fff");
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    beep(type === "err" ? 200 : 400);
}

// --- СЕТЕВАЯ ЛОГИКА ---
peer.on('open', id => {
    log(`CONSOLE_READY. ID: ${id}`);
    log(`MINIGAME1_[ID] / MINIGAME2_[ID]`);
});

peer.on('connection', c => { conn = c; setupPeer(); });

function setupPeer() {
    conn.on('data', data => {
        if (data.type === 'G2_INIT') {
            originalCode = data.code;
            log("G2: MEMORIZE YOUR CODE: " + originalCode);
            setTimeout(() => {
                for(let i=0; i<15; i++) log(""); // Очистка
                log("WAITING FOR ENEMY ATTACK...", "sys");
                gameState = "AWAITING_MY_TURN_TO_ATTACK";
            }, 5000);
        }
        if (data.type === 'YOUR_TURN_ATTACK') {
            currentCode = data.code;
            gameState = "G2_ATTACK";
            log("PHASE: YOUR TURN TO ATTACK! REMOVE 3 SYMBOLS FROM ENEMY CODE", "sys");
            log("TARGET: " + currentCode);
        }
        if (data.type === 'G2_FINAL_START') {
            currentCode = data.corrupted;
            startFinalRepair();
        }
        if (data.type === 'WIN') {
            clearInterval(gameTimer);
            log("FAIL: ENEMY REPAIRED FIRST.", "err");
            gameState = "IDLE";
        }
    });
}

// --- МЕХАНИКА G2 (DUEL) ---
function startFinalRepair() {
    gameState = "G2_REPAIR";
    log("--- FINAL PHASE: REPAIR! ---", "sys");
    log("YOUR_CORRUPTED_CODE: " + currentCode);
    let timeLeft = 60;
    gameTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            log("TIME EXPIRED. DRAW.", "err");
            gameState = "IDLE";
        }
    }, 1000);
}

function handleCommand(val) {
    val = val.toUpperCase().trim();
    if (!val) return;

    if (gameState === "IDLE" && val.startsWith("MINIGAME2_")) {
        const id = val.split("_")[1];
        conn = peer.connect(id);
        setupPeer();
        const code = "ROOT_ACCESS_KEY_" + Math.floor(Math.random()*999);
        originalCode = code;
        setTimeout(() => {
            conn.send({type: 'G2_INIT', code: code});
            log("MEMORIZE YOUR CODE: " + originalCode);
            setTimeout(() => {
                for(let i=0; i<15; i++) log(""); 
                gameState = "G2_ATTACK";
                log("PHASE: ATTACK! REMOVE 3 SYMBOLS", "sys");
                log("TARGET: " + code);
            }, 5000);
        }, 1000);
    }

    if (gameState === "G2_ATTACK") {
        if (val.length === 1 && originalCode.includes(val)) {
            attackCount++;
            originalCode = originalCode.replace(val, "_");
            log(`DELETED: ${val} (${attackCount}/3)`);
            if (attackCount === 3) {
                attackCount = 0;
                if (gameState === "G2_ATTACK") {
                    conn.send({type: 'YOUR_TURN_ATTACK', code: originalCode});
                    log("ATTACK SENT. WAITING FOR ENEMY TO FINISH...", "sys");
                    gameState = "WAIT_FOR_FINAL";
                }
            }
        }
    }

    if (gameState === "G2_REPAIR") {
        // Проверка: ввел ли пользователь оригинал
        // (Для теста оригинал нужно хранить в отдельной переменной, добавим её)
        if (val === "НУЖНЫЙ_КОД") { // Здесь должна быть логика сравнения
             log("SUCCESS! SYSTEM RESTORED.", "sys");
             conn.send({type: 'WIN'});
             clearInterval(gameTimer);
             gameState = "IDLE";
        }
    }
}

// --- КЛАВИАТУРА (Сетка) ---
const vKey = document.getElementById('v-keyboard');
vKey.style.display = "grid";
vKey.style.gridTemplateColumns = "repeat(10, 1fr)";
vKey.style.gap = "4px";

const keys = "1234567890QWERTYUIOPASDFGHJKLZXCVBNM@._".split("");
keys.forEach(char => {
    const k = document.createElement('div');
    k.className = 'key'; k.innerText = char;
    k.onclick = () => { input.value += char; beep(300, 0.02); };
    vKey.appendChild(k);
});

const nav = document.createElement('div');
nav.style = "grid-column: span 10; display: flex; gap: 5px; margin-top: 5px;";
const btnS = "flex: 1; border: 1px solid #fff; color: #fff; text-align: center; padding: 18px; cursor: pointer; font-weight: bold;";

const back = document.createElement('div'); back.innerText = "BACK"; back.style = btnS;
const spc = document.createElement('div'); spc.innerText = "SPACE"; spc.style = btnS + "flex: 2;";
const ent = document.createElement('div'); ent.innerText = "ENTER"; ent.style = btnS;

back.onclick = () => { input.value = input.value.slice(0, -1); beep(200); };
spc.onclick = () => { input.value += " "; beep(200); };
ent.onclick = () => { handleCommand(input.value); input.value = ""; beep(600); };

nav.append(back, spc, ent);
vKey.appendChild(nav);
