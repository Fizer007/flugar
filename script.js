const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Настройки
const TILE_SIZE = 32;
const GRAVITY = 0.5;
const FRICTION = 0.8;
const PLAYER_SPEED = 3;
const JUMP_FORCE = 12;

// Игровые объекты
let players = {};
let currentPlayerId = null;
let platforms = [];
let hidingSpots = [];
let decorations = [];
let worldSeed = 0;

// Состояние игры
let gameStarted = false;
let keys = {};
let lastTime = 0;
let cameraX = 0;
let cameraY = 0;

// Настройка canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Обработчики событий
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === 'Escape') {
        gameStarted = !gameStarted;
        document.getElementById('gameMenu').style.display = gameStarted ? 'none' : 'block';
    }
    
    if (e.key === 'e' && gameStarted) {
        const player = players[currentPlayerId];
        if (!player.isHiding) {
            // Проверяем, рядом ли укрытие
            for (const spot of hidingSpots) {
                const dx = player.x - spot.x;
                const dy = player.y - spot.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 50) {
                    socket.emit('hide', spot.id);
                    break;
                }
            }
        } else {
            socket.emit('hide', null);
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Игровая логика
function updatePlayer(player, deltaTime) {
    // Движение
    let velocityX = 0;
    
    if (keys['a'] || keys['ф']) velocityX = -PLAYER_SPEED;
    if (keys['d'] || keys['в']) velocityX = PLAYER_SPEED;
    
    player.facingRight = velocityX > 0 ? true : velocityX < 0 ? false : player.facingRight;
    
    // Прыжок
    const jumpKeys = ['w', 'ц', ' '];
    const wantsJump = jumpKeys.some(key => keys[key]);
    
    // Применение гравитации
    player.velocityY += GRAVITY;
    
    // Обновление позиции
    if (!player.isHiding) {
        player.x += velocityX;
        player.y += player.velocityY;
    }
    
    // Коллизия с платформами
    for (const platform of platforms) {
        if (player.x < platform.x + platform.width &&
            player.x + 20 > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + 40 > platform.y) {
            
            // Сверху
            if (player.velocityY > 0 && player.y < platform.y) {
                player.y = platform.y - 40;
                player.velocityY = 0;
                player.isJumping = false;
            }
            // Снизу
            else if (player.velocityY < 0) {
                player.y = platform.y + platform.height;
                player.velocityY = 0;
            }
            // Сбоку
            else {
                player.x = velocityX > 0 ? platform.x - 20 : platform.x + platform.width;
            }
        }
    }
    
    // Ограничение мира
    player.x = Math.max(0, player.x);
    
    // Отправка движения на сервер
    if (!player.isHiding) {
        socket.emit('move', {
            velocityX,
            facingRight: player.facingRight,
            jump: wantsJump && !player.isJumping
        });
    }
}

function updateCamera() {
    const player = players[currentPlayerId];
    if (!player) return;
    
    cameraX = player.x - canvas.width / 2;
    cameraY = player.y - canvas.height / 2;
}

function draw() {
    // Очистка
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Звезды на фоне
    drawStars();
    
    // Смещение камеры
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    
    // Рисование декораций
    for (const deco of decorations) {
        ctx.fillStyle = deco.type === 'bush' ? '#2a5c2a' : '#8B4513';
        ctx.fillRect(deco.x, deco.y, deco.width, deco.height);
    }
    
    // Рисование платформ
    for (const platform of platforms) {
        ctx.fillStyle = platform.type === 'ground' ? '#4a3c2a' : '#3a2c1a';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Текстура
        ctx.fillStyle = platform.type === 'ground' ? '#5a4c3a' : '#4a3c2a';
        for (let i = 0; i < platform.width; i += 4) {
            for (let j = 0; j < platform.height; j += 4) {
                if ((i + j) % 8 === 0) {
                    ctx.fillRect(platform.x + i, platform.y + j, 2, 2);
                }
            }
        }
    }
    
    // Рисование укрытий
    for (const spot of hidingSpots) {
        if (spot.type === 'manhole') {
            // Люк
            ctx.fillStyle = '#333';
            ctx.fillRect(spot.x, spot.y, spot.width, spot.height);
            ctx.fillStyle = '#555';
            ctx.fillRect(spot.x + 4, spot.y + 4, spot.width - 8, spot.height - 8);
            
            // Ручка
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(spot.x + spot.width/2, spot.y + spot.height/2, 8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Шкаф
            ctx.fillStyle = '#654321';
            ctx.fillRect(spot.x, spot.y, spot.width, spot.height);
            ctx.fillStyle = '#432101';
            ctx.fillRect(spot.x + 4, spot.y + 4, spot.width - 8, spot.height - 8);
            
            // Ручки
            ctx.fillStyle = '#888';
            ctx.fillRect(spot.x + 15, spot.y + spot.height/2 - 10, 4, 20);
            ctx.fillRect(spot.x + spot.width - 19, spot.y + spot.height/2 - 10, 4, 20);
        }
        
        // Название укрытия
        if (Math.abs(cameraX + canvas.width/2 - spot.x) < 200) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(spot.name, spot.x + spot.width/2, spot.y - 10);
        }
    }
    
    // Рисование игроков
    for (const id in players) {
        const player = players[id];
        
        if (player.isHiding) continue;
        
        // Тело
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x - 10, player.y - 40, 20, 40);
        
        // Голова
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y - 50, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Глаза
        ctx.fillStyle = '#fff';
        const eyeX = player.facingRight ? 3 : -3;
        ctx.beginPath();
        ctx.arc(player.x + eyeX, player.y - 52, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Имя
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y - 70);
        
        // Индикатор скрытия
        if (player.isHiding) {
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(player.x, player.y - 80, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText('Скрыт', player.x, player.y - 85);
        }
    }
    
    ctx.restore();
    
    // Эффект мигания при событии
    const eventWarning = document.getElementById('eventWarning');
    if (eventWarning.style.display === 'block') {
        const alpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.01);
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
        const x = (i * 97) % canvas.width;
        const y = (i * 137) % canvas.height;
        const size = (i % 3) + 1;
        const brightness = 0.5 + 0.5 * Math.sin(Date.now() * 0.001 + i);
        ctx.globalAlpha = brightness;
        ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
}

// Игровой цикл
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime || 0;
    lastTime = timestamp;
    
    if (gameStarted) {
        const player = players[currentPlayerId];
        if (player) {
            updatePlayer(player, deltaTime);
            updateCamera();
        }
        draw();
    }
    
    requestAnimationFrame(gameLoop);
}

// Socket.io обработчики
socket.on('init', (data) => {
    currentPlayerId = data.playerId;
    players = {};
    data.players.forEach(player => {
        players[player.id] = player;
    });
    
    document.getElementById('playerId').textContent = data.playerId;
    document.getElementById('playerName').textContent = players[currentPlayerId].name;
    document.getElementById('playerColor').style.backgroundColor = players[currentPlayerId].color;
    
    updatePlayersList();
    
    worldSeed = data.worldSeed;
});

socket.on('player-joined', (player) => {
    players[player.id] = player;
    updatePlayersList();
});

socket.on('player-moved', (data) => {
    const player = players[data.id];
    if (player) {
        player.x = data.x;
        player.y = data.y;
        player.velocityX = data.velocityX;
        player.velocityY = data.velocityY;
        player.facingRight = data.facingRight;
    }
});

socket.on('player-hiding', (data) => {
    const player = players[data.id];
    if (player) {
        player.isHiding = data.isHiding;
        player.hidingSpotId = data.hidingSpotId;
        
        if (data.id === currentPlayerId) {
            const status = document.getElementById('playerStatus');
            status.textContent = data.isHiding ? 'Скрыт' : 'Виден';
            status.className = `status ${data.isHiding ? 'hidden' : 'visible'}`;
        }
    }
});

socket.on('player-left', (id) => {
    delete players[id];
    updatePlayersList();
});

socket.on('chunk-data', (chunk) => {
    platforms = platforms.filter(p => 
        Math.floor(p.x / (20 * TILE_SIZE)) !== chunk.chunkX
    );
    platforms.push(...chunk.platforms);
    
    hidingSpots = hidingSpots.filter(h => 
        !h.id.startsWith(`hiding_${chunk.chunkX}_`)
    );
    hidingSpots.push(...chunk.hidingSpots);
    
    decorations = decorations.filter(d => 
        Math.floor(d.x / (20 * TILE_SIZE)) !== chunk.chunkX
    );
    decorations.push(...chunk.decorations);
});

socket.on('hiding-event-start', (data) => {
    const eventWarning = document.getElementById('eventWarning');
    const eventTimer = document.getElementById('eventTimer');
    
    eventWarning.style.display = 'block';
    
    function updateTimer() {
        const timeLeft = data.duration - (Date.now() - data.startTime);
        if (timeLeft > 0) {
            const seconds = Math.ceil(timeLeft / 1000);
            eventTimer.textContent = `${seconds} сек`;
            setTimeout(updateTimer, 100);
        }
    }
    
    updateTimer();
    
    // Звуковой сигнал (имитация)
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            // В реальной игре здесь был бы звук
            console.log('БИП!');
        }, i * 500);
    }
});

socket.on('hiding-event-end', () => {
    document.getElementById('eventWarning').style.display = 'none';
});

// Вспомогательные функции
function updatePlayersList() {
    const playersList = document.getElementById('playersList');
    const onlineCount = document.getElementById('onlineCount');
    
    playersList.innerHTML = '';
    let count = 0;
    
    for (const id in players) {
        count++;
        const player = players[id];
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <div class="player-marker" style="background-color: ${player.color}"></div>
            <span>${player.name}</span>
            <span style="margin-left: auto; color: ${player.isHiding ? '#4CAF50' : '#f44336'}">
                ${player.isHiding ? 'Скрыт' : 'Виден'}
            </span>
        `;
        playersList.appendChild(playerItem);
    }
    
    onlineCount.textContent = count;
}

function copyPlayerId() {
    navigator.clipboard.writeText(currentPlayerId)
        .then(() => alert('ID скопирован! Отправьте его другу.'));
}

function connectToGame() {
    const friendId = document.getElementById('friendId').value;
    if (friendId) {
        alert(`Подключение к ${friendId}...`);
        // В реальной игре здесь была бы логика подключения к конкретной комнате
    }
}

function startGame() {
    gameStarted = true;
    document.getElementById('gameMenu').style.display = 'none';
    gameLoop(0);
}

// Запуск
console.log('Игра запускается...');
console.log('Управление: A/D - движение, W/Пробел - прыжок, E - спрятаться, ESC - меню');