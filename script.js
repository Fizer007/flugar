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

function generateCode(prefix) {
    const hex = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase();
    return prefix + "_" + hex + "_SYS";
}

peer.on('open', id => log(`КОНСОЛЬ ОНЛАЙН. ID: ${id}`));

peer.on('connection', c => {
    conn = c;
    setupPeerListeners();
});

function setupPeerListeners() {
    conn.on('data', data => {
        // Гость получает оба кода от Хоста
        if (data.type === 'GAME_SETUP') {
            myOriginalCode = data.guestCode;
            enemyViewCode = data.hostCode; 
            log("ИГРА НАЧАТА! ВАШ КОД ДЛЯ ЗАПОМИНАНИЯ:");
            log(myOriginalCode);
            
            setTimeout(() => {
                clearConsole();
                gameState = "G2_ATTACK";
                log("АТАКУЙТЕ! КОД ВРАГА: " + enemyViewCode);
            }, 8000);
        }
        
        if (data.type === 'ATTACK_DONE') {
            myCorruptedFromEnemy = data.corrupted;
            enemyFinishedAttack = true;
            log("ВРАГ ЗАВЕРШИЛ АТАКУ", "sys");
            checkStartFinal();
        }

        if (data.type === 'WIN') {
            log("ПРОИГРЫШ! СИСТЕМА ВЗЛОМАНА.", "err");
            gameState = "IDLE";
        }
    });
}

function checkStartFinal() {
    if (iFinishedAttack && enemyFinishedAttack) {
        setTimeout(() => {
            clearConsole();
            gameState = "G2_REPAIR";
            log("--- ФИНАЛ: РЕМОНТ ---", "sys");
            log("ВАШ ПОВРЕЖДЕННЫЙ КОД: " + myCorruptedFromEnemy);
        }, 500);
    } else if (iFinishedAttack) {
        log("ОЖИДАНИЕ ВРАГА...", "sys");
    }
}

function handleCommand(val) {
    val = val.toUpperCase().trim();
    if (!val) return;

    if (gameState === "IDLE" && val.startsWith("MINIGAME2_")) {
        const tid = val.split("_")[1];
        conn = peer.connect(tid);
        setupPeerListeners();
        conn.on('open', () => {
            const hCode = generateCode("HOST");
            const gCode = generateCode("GUEST");
            
            myOriginalCode = hCode;
            enemyViewCode = gCode;
            
            // Отправляем гостю настройки
            conn.send({type: 'GAME_SETUP', hostCode: hCode, guestCode: gCode});
            
            log("ЗАПОМНИТЕ ВАШ КОД: " + myOriginalCode);
            setTimeout(() => {
                clearConsole();
                gameState = "G2_ATTACK";
                log("АТАКУЙТЕ! КОД ВРАГА: " + enemyViewCode);
            }, 8000);
        });
        return;
    }

    if (gameState === "G2_ATTACK") {
        let char = val[0], idx = val.length > 1 ? parseInt(val.slice(1)) : 1;
        let count = 0, newCode = "", found = false;
        for (let i = 0; i < enemyViewCode.length; i++) {
            if (enemyViewCode[i] === char) {
                count++;
                if (count === idx && !found) { newCode += "_"; found = true; continue; }
            }
            newCode += enemyViewCode[i];
        }
        if (found) {
            enemyViewCode = newCode;
            attackCount++;
            log(`УДАЛЕНО: ${val} (${attackCount}/3)`);
            if (attackCount === 3) {
                attackCount = 0; iFinishedAttack = true;
                conn.send({type: 'ATTACK_DONE', corrupted: enemyViewCode});
                checkStartFinal();
            }
        } else log("НЕТ СИМВОЛА", "err");
    }

    if (gameState === "G2_REPAIR") {
        if (val === myOriginalCode) {
            log("ПОБЕДА!", "sys");
            conn.send({type: 'WIN'});
            gameState = "IDLE";
        } else log("ОШИБКА!", "err");
    }
}

// Рендер клавиатуры (сокращенно)
const vKey = document.getElementById('v-keyboard');
vKey.innerHTML = "";
"1234567890QWERTYUIOPASDFGHJKLZXCVBNM@._".split("").forEach(char => {
    const k = document.createElement('div');
    k.className = 'key'; k.innerText = char;
    k.onclick = () => { input.value += char; beep(300, 0.02); };
    vKey.appendChild(k);
});

// Кнопки управления
const nav = document.createElement('div');
nav.style = "grid-column: span 10; display: flex; gap: 5px; margin-top: 5px;";
const btnS = "flex: 1; border: 1px solid #fff; color: #fff; text-align: center; padding: 15px; cursor: pointer;";
const b = document.createElement('div'); b.innerText = "BACK"; b.style = btnS;
const s = document.createElement('div'); s.innerText = "SPACE"; s.style = btnS + "flex: 2;";
const e = document.createElement('div'); e.innerText = "ENTER"; e.style = btnS;

b.onclick = () => { input.value = input.value.slice(0, -1); beep(200); };
s.onclick = () => { input.value += " "; beep(200); };
e.onclick = () => { handleCommand(input.value); input.value = ""; beep(600); };
nav.append(b, s, e); vKey.appendChild(nav);
