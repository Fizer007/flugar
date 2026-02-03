/**
 * HACKER_CONSOLE_v1 - Duel Edition (Fixed)
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
let myOriginalCode = "";     // Мой код (который я чиню)
let enemyOriginalCode = "";   // Код врага (который я ломаю)
let myViewCode = "";          // То, что я вижу на экране
let attackCount = 0;

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
    output.innerHTML = "<div>[СИСТЕМА ОЧИЩЕНА ДЛЯ БЕЗОПАСНОСТИ]</div>";
}

// Генерирует длинный сложный код
function generateComplexCode() {
    const parts = ["ROOT", "ADMIN", "KERNEL", "SYSTEM", "DATA", "CRYPT", "VOID"];
    const hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase();
    return parts[Math.floor(Math.random() * parts.length)] + "_" + hex + "_PROT";
}

peer.on('open', id => {
    log(`КОНСОЛЬ ЗАПУЩЕНА. ВАШ ID: ${id}`);
    log(`КОМАНДА: MINIGAME2_[ID_ДРУГА]`);
});

peer.on('connection', c => {
    conn = c;
    setupPeerListeners();
});

function setupPeerListeners() {
    conn.on('data', data => {
        if (data.type === 'G2_START') {
            myOriginalCode = data.code; // Получаем код, который нам нужно будет чинить
            log("ИГРА НАЧАТА! ЗАПОМНИТЕ ВАШ КОД:", "sys");
            log(myOriginalCode);
            setTimeout(() => {
                clearConsole();
                log("ОЖИДАНИЕ ХОДА ПРОТИВНИКА...", "sys");
                gameState = "WAIT_FOR_ATTACK";
            }, 8000); // 8 секунд на запоминание
        }
        
        if (data.type === 'YOUR_TURN_ATTACK') {
            enemyOriginalCode = data.code;
            gameState = "G2_ATTACK";
            log("ВАША ОЧЕРЕДЬ АТАКОВАТЬ!", "sys");
            log("УДАЛИТЕ 3 СИМВОЛА ИЗ КОДА ВРАГА:");
            log("КОД ВРАГА: " + enemyOriginalCode);
            log("Правило: если буквы повтор., пиши БУКВА+НОМЕР (напр. O2)");
        }

        if (data.type === 'FINAL_REPAIR') {
            myViewCode = data.corrupted;
            gameState = "G2_REPAIR";
            log("ФИНАЛ: ВОССТАНОВИТЕ СВОЙ КОД!", "sys");
            log("ИСКАЖЕННЫЙ КОД: " + myViewCode);
            log("ВВЕДИТЕ ПОЛНЫЙ ОРИГИНАЛЬНЫЙ КОД:");
        }

        if (data.type === 'WIN') {
            log("ВЫ ПРОИГРАЛИ! ВРАГ ВОССТАНОВИЛ СИСТЕМУ ПЕРВЫМ.", "err");
            gameState = "IDLE";
        }
    });
}

function handleCommand(val) {
    val = val.toUpperCase().trim();
    if (!val) return;

    if (gameState === "IDLE" && val.startsWith("MINIGAME2_")) {
        const targetId = val.split("_")[1];
        conn = peer.connect(targetId);
        setupPeerListeners();
        conn.on('open', () => {
            // Генерируем два РАЗНЫХ кода
            const codeForMe = generateComplexCode();
            const codeForEnemy = generateComplexCode();
            
            myOriginalCode = codeForMe;
            log("СВЯЗЬ УСТАНОВЛЕНА. ЗАПОМНИТЕ ВАШ КОД:", "sys");
            log(myOriginalCode);
            
            // Отправляем врагу его код
            conn.send({type: 'G2_START', code: codeForEnemy});
            
            setTimeout(() => {
                clearConsole();
                gameState = "G2_ATTACK";
                enemyOriginalCode = codeForEnemy;
                log("ВАША ОЧЕРЕДЬ АТАКОВАТЬ!", "sys");
                log("КОД ВРАГА: " + enemyOriginalCode);
                log("УДАЛИТЕ 3 СИМВОЛА (напр. A или O2)");
            }, 8000);
        });
        return;
    }

    if (gameState === "G2_ATTACK") {
        let charToDel = val[0];
        let index = val.length > 1 ? parseInt(val.slice(1)) : 1;
        
        // Логика удаления символа по индексу
        let count = 0;
        let newCode = "";
        let found = false;

        for (let i = 0; i < enemyOriginalCode.length; i++) {
            if (enemyOriginalCode[i] === charToDel) {
                count++;
                if (count === index && !found) {
                    newCode += "_";
                    found = true;
                    continue;
                }
            }
            newCode += enemyOriginalCode[i];
        }

        if (found) {
            enemyOriginalCode = newCode;
            attackCount++;
            log(`СИМВОЛ ${val} УДАЛЕН. (${attackCount}/3)`);
            log("ТЕКУЩИЙ ВИД: " + enemyOriginalCode);
            
            if (attackCount === 3) {
                attackCount = 0;
                log("АТАКА ЗАВЕРШЕНА. ПЕРЕДАЧА ДАННЫХ...", "sys");
                conn.send({type: 'YOUR_TURN_ATTACK', code: enemyOriginalCode});
                gameState = "WAIT_FOR_REPAIR";
                clearConsole();
                log("ЖДЕМ, ПОКА ВРАГ ЗАКОНЧИТ АТАКУ...");
                
                // Если мы получили код от врага, переходим в финал
                // Это сработает, когда придет пакет FINAL_REPAIR
            }
        } else {
            log("СИМВОЛ НЕ НАЙДЕН", "err");
        }
    }

    if (gameState === "G2_REPAIR") {
        if (val === myOriginalCode) {
            log("ДОСТУП ВОССТАНОВЛЕН! ВЫ ПОБЕДИЛИ!", "sys");
            conn.send({type: 'WIN'});
            gameState = "IDLE";
        } else {
            log("ОШИБКА ЦЕЛОСТНОСТИ КОДА", "err");
        }
    }
}

// --- КЛАВИАТУРА (Остается прежней) ---
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
const btnS = "flex: 1; border: 1px solid #fff; color: #fff; text-align: center; padding: 18px; cursor: pointer; font-family: inherit;";

const back = document.createElement('div'); back.innerText = "BACK"; back.style = btnS;
const spc = document.createElement('div'); spc.innerText = "SPACE"; spc.style = btnS + "flex: 2;";
const ent = document.createElement('div'); ent.innerText = "ENTER"; ent.style = btnS;

back.onclick = () => { input.value = input.value.slice(0, -1); beep(200); };
spc.onclick = () => { input.value += " "; beep(200); };
ent.onclick = () => { handleCommand(input.value); input.value = ""; beep(600); };

nav.append(back, spc, ent);
vKey.appendChild(nav);
