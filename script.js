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

// --- ПЕРЕМЕННЫЕ СОСТОЯНИЯ ---
let myOriginalCode = "";      // Мой родной код (для запоминания и финала)
let codeToAttack = "";        // Код врага (который я ломаю)
let myCorruptedFromEnemy = ""; // Мой код, который вернул враг (битый)

let iFinishedAttack = false;
let enemyFinishedAttack = false;
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
    if(type === 'err') beep(200, 0.2);
}

function clearConsole() {
    output.innerHTML = "<div>[СИСТЕМА ОЧИЩЕНА]</div>";
}

function generateCode(tag) {
    const hex = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase();
    return tag + "_" + hex + "_SYS";
}

// --- СЕТЬ ---
peer.on('open', id => {
    log(`ТЕРМИНАЛ ГОТОВ. ID: ${id}`);
    log(`ВВЕДИ: MINIGAME2_[ID_ДРУГА]`);
});

peer.on('connection', c => {
    conn = c;
    setupPeerListeners();
    log("ВХОДЯЩЕЕ СОЕДИНЕНИЕ...", "sys");
});

function setupPeerListeners() {
    conn.on('data', data => {
        // 1. НАЧАЛО: Гость получает коды
        if (data.type === 'SETUP_GAME') {
            myOriginalCode = data.guestOwn;   // Мой код
            codeToAttack = data.hostOwn;      // Код хоста (врага)
            
            startGameSequence();
        }
        
        // 2. СИНХРОНИЗАЦИЯ: Враг закончил атаку
        if (data.type === 'ENEMY_ATTACK_DONE') {
            myCorruptedFromEnemy = data.corruptedVersion;
            enemyFinishedAttack = true;
            log("ВРАГ ЗАКОНЧИЛ АТАКУ И ЖДЕТ ВАС.", "sys");
            checkFinal(); // Проверяем, не пора ли в финал
        }

        // 3. ФИНАЛ: Победа/Поражение
        if (data.type === 'WIN') {
            log("КРИТИЧЕСКАЯ ОШИБКА: ВРАГ ПОБЕДИЛ!", "err");
            gameState = "IDLE";
        }
    });

    conn.on('close', () => log("СВЯЗЬ ПОТЕРЯНА", "err"));
}

// --- ЛОГИКА ИГРЫ ---

function startGameSequence() {
    log("СЕССИЯ НАЧАТА. ЗАПОМНИ СВОЙ КОД (8 сек):", "sys");
    log(myOriginalCode);
    
    // Таймер на запоминание
    setTimeout(() => {
        clearConsole();
        gameState = "G2_ATTACK";
        log("ФАЗА АТАКИ! УДАЛИ 3 СИМВОЛА У ВРАГА.", "sys");
        log("ЦЕЛЬ: " + codeToAttack);
        // Разблокируем ввод другу, если он завис
        iFinishedAttack = false; 
        attackCount = 0;
    }, 8000);
}

function checkFinal() {
    // Финал начинается ТОЛЬКО если оба закончили
    if (iFinishedAttack && enemyFinishedAttack) {
        clearConsole();
        gameState = "G2_REPAIR";
        log("--- ФИНАЛ: ВОССТАНОВЛЕНИЕ ---", "sys");
        log("ТВОЙ ПОВРЕЖДЕННЫЙ КОД: " + myCorruptedFromEnemy);
        log("ВВЕДИ ОРИГИНАЛ БЫСТРЕЕ ВРАГА!");
    } else if (iFinishedAttack && !enemyFinishedAttack) {
        log("ОЖИДАНИЕ ВРАГА...", "sys");
    }
}

// --- ОБРАБОТКА ВВОДА ---
function handleCommand(val) {
    val = val.toUpperCase().trim();
    if (!val) return;

    // 1. ЗАПУСК ИГРЫ (Только для того, кто вводит команду)
    if (gameState === "IDLE" && val.startsWith("MINIGAME2_")) {
        const targetId = val.split("_")[1];
        conn = peer.connect(targetId);
        setupPeerListeners();
        
        conn.on('open', () => {
            log("СВЯЗЬ ЕСТЬ. ГЕНЕРАЦИЯ КЛЮЧЕЙ...", "sys");
            
            const hostCode = generateCode("HOST");   // Код Хоста
            const guestCode = generateCode("GUEST"); // Код Гостя
            
            // Настраиваем себя (Хоста)
            myOriginalCode = hostCode;
            codeToAttack = guestCode;
            
            // Отправляем настройки Гостю (Другу)
            conn.send({
                type: 'SETUP_GAME',
                hostOwn: hostCode,   // Это Гость будет ломать
                guestOwn: guestCode  // Это Гость будет запоминать
            });
            
            startGameSequence();
        });
        return;
    }

    // 2. АТАКА (Удаление символов)
    if (gameState === "G2_ATTACK") {
        let char = val[0];
        let idx = val.length > 1 ? parseInt(val.slice(1)) : 1; // Поддержка индексов (O2)
        
        let count = 0, newCode = "", found = false;

        // Алгоритм удаления n-го вхождения символа
        for (let i = 0; i < codeToAttack.length; i++) {
            if (codeToAttack[i] === char) {
                count++;
                if (count === idx && !found) {
                    newCode += "_"; found = true; continue;
                }
            }
            newCode += codeToAttack[i];
        }

        if (found) {
            codeToAttack = newCode;
            attackCount++;
            log(`УДАЛЕНО: ${val} (${attackCount}/3)`);
            log("ТЕКУЩАЯ ЦЕЛЬ: " + codeToAttack);
            
            if (attackCount === 3) {
                iFinishedAttack = true;
                log("АТАКА ЗАВЕРШЕНА. ОТПРАВКА ДАННЫХ...", "sys");
                
                // Отправляем другу результат нашей атаки
                conn.send({
                    type: 'ENEMY_ATTACK_DONE',
                    corruptedVersion: codeToAttack
                });
                
                checkFinal(); // Проверяем, готовы ли мы оба
            }
        } else {
            log("НЕТ ТАКОГО СИМВОЛА!", "err");
        }
    }

    // 3. РЕМОНТ (Финал)
    if (gameState === "G2_REPAIR") {
        if (val === myOriginalCode) {
            log("ДОСТУП ВОССТАНОВЛЕН! ТЫ ПОБЕДИЛ!", "sys");
            conn.send({type: 'WIN'});
            gameState = "IDLE";
        } else {
            log("ОШИБКА! НЕВЕРНЫЙ КОД.", "err");
        }
    }
}

// --- ВИРТУАЛЬНАЯ КЛАВИАТУРА ---
const vKey = document.getElementById('v-keyboard');
vKey.innerHTML = "";
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
const btnS = "flex: 1; border: 1px solid #fff; color: #fff; text-align: center; padding: 18px; cursor: pointer;";

const b = document.createElement('div'); b.innerText = "BACK"; b.style = btnS;
const s = document.createElement('div'); s.innerText = "SPACE"; s.style = btnS + "flex: 2;";
const e = document.createElement('div'); e.innerText = "ENTER"; e.style = btnS;

b.onclick = () => { input.value = input.value.slice(0, -1); beep(200); };
s.onclick = () => { input.value += " "; beep(200); };
e.onclick = () => { handleCommand(input.value); input.value = ""; beep(600); };

nav.append(b, s, e);
vKey.appendChild(nav);

/**
 * Секретный саундтрек Amalgam (Undertale)
 */
function playAmalgam() {
    // Частоты нот (приблизительно для "ломаного" звучания)
    const notes = [
        110, 117, 123, 110, 0, 110, 117, 123,
        147, 140, 131, 117, 0, 110, 123, 117
    ];
    
    let time = audioCtx.currentTime + 0.5;
    const tempo = 0.12; // Скорость

    notes.forEach((freq, i) => {
        if (freq > 0) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            // Тип волны 'sawtooth' (пилообразная) дает тот самый ретро-звук
            osc.type = 'sawtooth'; 
            osc.frequency.setValueAtTime(freq, time + i * tempo);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            gain.gain.setValueAtTime(0.05, time + i * tempo);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + i * tempo + 0.1);
            
            osc.start(time + i * tempo);
            osc.stop(time + i * tempo + 0.1);
        }
    });
}

// Запуск музыки при загрузке (с учетом политики браузера)
window.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

// Вызывай playAmalgam() там, где хочешь услышать музыку
