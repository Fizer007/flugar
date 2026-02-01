const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let peer = new Peer();
let conn;

// Настройки игры
const WORLD_W = 600; 
const WORLD_H = 1200; // Длинная карта
let camY = 0;

// Состояния
let myHero = { x: 300, y: 1000, type: 'sven', hp: 100, maxHp: 100, dmg: 20, range: 80, gold: 500 };
let friend = { x: -100, y: -100, type: 'sven', hp: 100 }; // Игрок 2
let throne = { x: 300, y: 1100, hp: 1000, maxHp: 1000, radius: 60 };
let creeps = [];
let wave = 1;
let shopTimer = 10;
let gameState = 'SHOP'; // 'SHOP' или 'WAVE'

// Сеть
peer.on('open', id => document.getElementById('my-id').innerText = id);
peer.on('connection', c => { conn = c; setupConn(); });
document.getElementById('connect-btn').onclick = () => {
    conn = peer.connect(document.getElementById('join-id').value);
    setupConn();
};

function setupConn() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    resize();
    gameLoop();
    startShopPhase(); // Игра начинается с закупа

    conn.on('data', data => {
        if(data.type === 'move') {
            friend = data.p; // Обновляем позицию друга
        }
        if(data.type === 'creep_die') {
            // Друг убил крипа, убираем его у себя
            creeps = creeps.filter(c => c.id !== data.id);
        }
        if(data.type === 'damage_throne') {
            throne.hp = data.hp;
            updateThroneUI();
        }
    });
}

function selHero(t) {
    myHero.type = t;
    myHero.range = (t === 'drow') ? 300 : 80;
    myHero.dmg = (t === 'drow') ? 15 : 25;
    document.querySelectorAll('.hero-opt').forEach(e => e.classList.remove('active'));
    event.target.classList.add('active');
}

// Фазы игры
function startShopPhase() {
    gameState = 'SHOP';
    shopTimer = 10;
    document.getElementById('shop').classList.remove('hidden');
    
    let int = setInterval(() => {
        shopTimer--;
        document.getElementById('timer').innerText = shopTimer + 's (SHOP)';
        if(shopTimer <= 0) {
            clearInterval(int);
            startWave();
        }
    }, 1000);
}

function startWave() {
    gameState = 'WAVE';
    document.getElementById('shop').classList.add('hidden');
    document.getElementById('wave-val').innerText = wave;
    document.getElementById('timer').innerText = "DEFEND!";
    
    // Спавн крипов (только если я "Хост" или просто оба спавним одинаково)
    // Для простоты спавним оба одинаково
    let count = 5 + (wave * 2);
    for(let i=0; i<count; i++) {
        setTimeout(() => {
            creeps.push({
                id: Math.random(), // Уникальный ID
                x: 100 + Math.random() * 400,
                y: -50, // Сверху
                hp: 30 + (wave * 10),
                speed: 1 + (wave * 0.1)
            });
        }, i * 1500);
    }
    wave++;
}

// Управление
let joy = { x: 0, y: 0 };
const stick = document.getElementById('joy-stick');
document.getElementById('joy-base').ontouchmove = e => {
    let r = e.target.getBoundingClientRect();
    let dx = e.touches[0].clientX - (r.left + 60);
    let dy = e.touches[0].clientY - (r.top + 60);
    let ang = Math.atan2(dy, dx);
    joy.x = Math.cos(ang) * 5;
    joy.y = Math.sin(ang) * 5;
    stick.style.transform = `translate(${joy.x*5}px, ${joy.y*5}px)`;
};
document.getElementById('joy-base').ontouchend = () => { joy.x=0; joy.y=0; stick.style.transform='none'; };

// Атака
document.getElementById('atk-btn').onclick = () => {
    // Ищем ближайшего крипа
    let target = null;
    let minD = 9999;
    creeps.forEach(c => {
        let d = Math.hypot(c.x - myHero.x, c.y - myHero.y);
        if(d < myHero.range && d < minD) { minD = d; target = c; }
    });

    if(target) {
        // Эффект удара
        ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(target.x, target.y, 20, 0, Math.PI*2); ctx.fill();
        
        target.hp -= myHero.dmg;
        if(target.hp <= 0) {
            myHero.gold += 15;
            document.getElementById('gold-val').innerText = myHero.gold;
            creeps = creeps.filter(c => c !== target);
            if(conn && conn.open) conn.send({ type: 'creep_die', id: target.id });
            
            // Если убили последнего крипа в волне
            if(creeps.length === 0 && gameState === 'WAVE') {
                setTimeout(startShopPhase, 2000);
            }
        }
    }
};

window.buy = (item) => {
    if(item === 'dmg' && myHero.gold >= 300) { myHero.gold-=300; myHero.dmg+=10; }
    if(item === 'heal' && myHero.gold >= 100) { myHero.gold-=100; myHero.hp = Math.min(myHero.hp+50, myHero.maxHp); }
    if(item === 'speed' && myHero.gold >= 400) { myHero.gold-=400; /* Скорость увеличивается в логике */ }
    document.getElementById('gold-val').innerText = myHero.gold;
};

function gameLoop() {
    if(throne.hp <= 0) {
        document.getElementById('game-over').classList.remove('hidden');
        return;
    }

    // Движение героя
    myHero.x += joy.x; myHero.y += joy.y;
    // Ограничение карты
    myHero.x = Math.max(0, Math.min(WORLD_W, myHero.x));
    myHero.y = Math.max(0, Math.min(WORLD_H, myHero.y));

    // Камера (следит за игроком по Y, но не выходит за пределы)
    camY = myHero.y - canvas.height / 1.5;
    camY = Math.max(0, Math.min(WORLD_H - canvas.height, camY));

    // Логика крипов
    creeps.forEach(c => {
        c.y += c.speed;
        // Если крип дошел до трона
        if(c.y > throne.y - throne.radius) {
            throne.hp -= 1;
            c.hp = 0; // Крип самоуничтожается об трон
            updateThroneUI();
            if(conn && conn.open) conn.send({ type: 'damage_throne', hp: throne.hp });
        }
    });
    creeps = creeps.filter(c => c.hp > 0);

    // Синхронизация
    if(conn && conn.open) conn.send({ type: 'move', p: { x: myHero.x, y: myHero.y, type: myHero.type } });

    render();
    requestAnimationFrame(gameLoop);
}

function updateThroneUI() {
    let pct = (throne.hp / throne.maxHp) * 100;
    document.getElementById('throne-hp-fill').style.width = pct + '%';
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -camY);

    // Земля
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    
    // Трон (Наш)
    ctx.fillStyle = "#2ecc71"; 
    ctx.beginPath(); ctx.arc(throne.x, throne.y, throne.radius, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText("НАШ ТРОН", throne.x, throne.y + 5);

    // Спавн зона (Враги)
    ctx.fillStyle = "#330000"; ctx.fillRect(0, 0, WORLD_W, 100);
    ctx.fillStyle = "#e74c3c"; ctx.fillText("ПОРТАЛ ВРАГОВ", WORLD_W/2, 50);

    // Крипы
    creeps.forEach(c => {
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(c.x - 10, c.y - 10, 20, 20);
        // HP bar крипа
        ctx.fillStyle = "red"; ctx.fillRect(c.x-10, c.y-15, 20, 3);
    });

    // Игроки
    drawHero(myHero, "Я");
    drawHero(friend, "ДРУГ");

    ctx.restore();
}

function drawHero(h, label) {
    let color = (h.type === 'sven') ? '#3498db' : '#9b59b6';
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(h.x, h.y, 20, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "white"; ctx.fillText(label, h.x, h.y - 30);
    
    // Круг атаки
    if(label === "Я") {
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath(); ctx.arc(h.x, h.y, h.range, 0, Math.PI*2); ctx.stroke();
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
