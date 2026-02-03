/**
 * HACKER_CONSOLE_v1.Final_Fixed
 * Исправлено: Синхронизация финала, Удаление по индексам, Статус готовности
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
const peer = new Peer(myId);

let conn = null;
let gameState = "IDLE"; 

let myOriginalCode = "";      
let enemyViewCode = "";       
let myCorruptedFromEnemy = ""; 
let attackCount = 0;
let iFinishedAttack = false;
let enemyFinishedAttack = false;

const output = document.getElementById('output');
const input = document.getElementById('command-input');
input.setAttribute('readonly', 'true');

function log(msg, type = "info") {
    const div = document.createElement('div');
    div.textContent = (type === "err" ? "[ОШИБКА] " : (type === "sys" ? ">> " : "")) + msg;
    div.style.color = type === "err" ? "#ff4444" : (type === "sys" ? "#888" : "#fff");
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    beep(type === "err" ? 150 : 400);
}

function clearConsole() {
    output.innerHTML = "<div>[SCREEN_CLEARED_FOR_SECURITY]</div>";
}

function generateCode() {
    const words = ["ROOT", "VOID", "DATA", "CRYPT", "NODE", "BASE", "CORE"];
    const hex = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase();
    return words[Math.floor(Math.random() * words.length)] + "_" + hex + "_SYS";
}

// --- СЕТЕВАЯ ЧАСТЬ ---
peer.on('open', id => {
    log(`КОНСОЛЬ ОНЛАЙН. ВАШ ID: ${id}`);
    log(`КОМАНДА: MINIGAME2_[ID_ДРУГА]`);
});

peer.on('connection', c => {
    conn = c;
    setupPeerListeners();
});

function setupPeerListeners() {
    conn.on('data', data => {
        if (data.type === 'G2_START') {
            myOriginalCode = data.code;
            log("ИГРА НАЧАТА! ЗАПОМНИТЕ СВОЙ КОД:", "sys");
            log(myOriginalCode);
            setTimeout(() => {
                clearConsole();
                log("ЖДЕМ АТАКИ ВРАГА...", "sys");
                gameState = "WAIT_FOR_ENEMY_CODE";
            }, 8000);
        }
        
        if (data.type === 'YOUR_CORRUPTED_CODE') {
            myCorruptedFromEnemy = data.corrupted;
            enemyFinishedAttack = true; // Враг прислал наш побитый код
            log("ВРАГ ЗАВЕРШИЛ АТАКУ", "sys");
            checkStartFinal();
        }

        if (data.type === 'WIN') {
            log("ВЫ ПРОИГРАЛИ! ВРАГ ВОССТАНОВИЛ СИСТЕМУ.", "err");
            gameState = "IDLE";
        }
    });

    conn.on('error', (err) => log("ОШИБКА СВЯЗИ: " + err, "err"));
}

function checkStartFinal() {
    if (iFinishedAttack && enemyFinishedAttack) {
        clearConsole();
        gameState = "G2_REPAIR";
        log("--- ФИНАЛ: РЕМОНТ! ---", "sys");
        log("ВАШ ПОВРЕЖДЕННЫЙ КОД: " + myCorruptedFromEnemy);
        log("ВВЕДИТЕ ОРИГИНАЛ ЦЕЛИКОМ!");
    } else if (iFinishedAttack) {
        log("ВЫ ГОТОВЫ. ОЖИДАНИЕ ДЕЙСТВИЙ ВРАГА...", "sys");
    }
}

// --- ОБРАБОТКА ВВОДА ---
function handleCommand(val) {
    val = val.toUpperCase().trim();
    if (!val) return;

    if (gameState === "IDLE" && val.startsWith("MINIGAME2_")) {
        const targetId = val.split("_")[1];
        conn = peer.connect(targetId);
        setupPeerListeners();
        conn.on('open', () => {
            log("СВЯЗЬ УСТАНОВЛЕНА!", "sys");
            const codeForMe = generateCode();
            const codeForEnemy = generateCode();
            myOriginalCode = codeForMe;
            log("ЗАПОМНИТЕ ВАШ КОД: " + myOriginalCode);
            conn.send({type: 'G2_START', code: codeForEnemy});
            
            setTimeout(() => {
                clearConsole();
                enemyViewCode = codeForEnemy;
                gameState = "G2_ATTACK";
                log("АТАКУЙТЕ! КОД ВРАГА: " + enemyViewCode);
            }, 8000);
        });
        return;
    }

    if (gameState === "G2_ATTACK") {
        let char = val[0];
        let idx = val.length > 1 ? parseInt(val.slice(1)) : 1;
        let count = 0, newCode = "", found = false;

        for (let i = 0; i < enemyViewCode.length; i++) {
            if (enemyViewCode[i] === char) {
                count++;
                if (count === idx && !found) {
                    newCode += "_"; found = true; continue;
                }
            }
            newCode += enemyViewCode[i];
        }

        if (found) {
            enemyViewCode = newCode;
            attackCount++;
            log(`УДАЛЕНО: ${val} (${attackCount}/3)`);
            log("КОД ВРАГА: " + enemyViewCode);
            if (attackCount === 3) {
                attackCount = 0;
                iFinishedAttack = true;
                conn.send({type: 'YOUR_CORRUPTED_CODE', corrupted: enemyViewCode});
                checkStartFinal(); 
            }
        } else { log("СИМВОЛ НЕ НАЙДЕН", "err"); }
    }

    if (gameState === "G2_REPAIR") {
        if (val === myOriginalCode) {
            log("ПОБЕДА! СИСТЕМА ВОССТАНОВЛЕНА.", "sys");
            conn.send({type: 'WIN'});
            gameState = "IDLE";
        } else { log("НЕВЕРНЫЙ КОД!", "err"); }
    }
}

// --- КЛАВИАТУРА ---
const vKey = document.getElementById('v-keyboard');
vKey.innerHTML = "";
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
const btnS = "flex: 1; border: 1px solid #fff; color: #fff; text-align: center; padding: 18px; cursor: pointer;";

const back = document.createElement('div'); back.innerText = "BACK"; back.style = btnS;
const spc = document.createElement('div'); spc.innerText = "SPACE"; spc.style = btnS + "flex: 2;";
const ent = document.createElement('div'); ent.innerText = "ENTER"; ent.style = btnS;

back.onclick = () => { input.value = input.value.slice(0, -1); beep(200); };
spc.onclick = () => { input.value += " "; beep(200); };
ent.onclick = () => { handleCommand(input.value); input.value = ""; beep(600); };

nav.append(back, spc, ent);
vKey.appendChild(nav);
