// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    TILE_SIZE: 32,
    CHUNK_SIZE: 16,
    WORLD_WIDTH: 100,
    WORLD_HEIGHT: 50,
    GRAVITY: 0.5,
    PLAYER_JUMP_FORCE: -12,
    PLAYER_SPEED: 5,
    MAX_HEALTH: 100,
    MAX_HUNGER: 100,
    DAY_LENGTH: 60000, // 60 секунд на полный день
    NIGHT_MONSTER_SPAWN_RATE: 0.02,
    DAY_MONSTER_SPAWN_RATE: 0.005
};

// Типы блоков
const BLOCK_TYPES = {
    0: { name: 'air', color: 'transparent', solid: false },
    1: { name: 'grass', color: '#7cfc00', solid: true, health: 30, drop: 'dirt' },
    2: { name: 'dirt', color: '#8b4513', solid: true, health: 20, drop: 'dirt' },
    3: { name: 'stone', color: '#808080', solid: true, health: 50, drop: 'stone' },
    4: { name: 'wood', color: '#deb887', solid: true, health: 40, drop: 'wood' },
    5: { name: 'leaves', color: '#228b22', solid: false, health: 10, drop: 'wood' },
    6: { name: 'sand', color: '#f4e542', solid: true, health: 15, drop: 'sand' },
    7: { name: 'water', color: '#1e90ff', solid: false, health: 0 },
    8: { name: 'iron', color: '#b0c4de', solid: true, health: 80, drop: 'iron' },
    9: { name: 'coal', color: '#2f4f4f', solid: true, health: 60, drop: 'coal' },
    10: { name: 'torch', color: '#ff4500', solid: false, light: true }
};

// Типы существ
const ENTITY_TYPES = {
    player: { width: 24, height: 48, color: '#e94560', speed: 5, jumpForce: -12 },
    zombie: { width: 28, height: 52, color: '#228b22', speed: 1.5, health: 50, damage: 10 },
    skeleton: { width: 26, height: 50, color: '#f5f5f5', speed: 2, health: 40, damage: 15 },
    slime: { width: 32, height: 32, color: '#32cd32', speed: 1, health: 30, damage: 5 },
    bat: { width: 20, height: 20, color: '#4b0082', speed: 3, health: 20, damage: 3 },
    spider: { width: 30, height: 24, color: '#8b0000', speed: 2.5, health: 35, damage: 8 }
};

// Предметы
const ITEMS = {
    dirt: { name: 'Земля', icon: '🟫', color: '#8b4513', type: 'block', placeable: 2 },
    stone: { name: 'Камень', icon: '🪨', color: '#808080', type: 'block', placeable: 3 },
    wood: { name: 'Дерево', icon: '🪵', color: '#deb887', type: 'block', placeable: 4 },
    iron: { name: 'Железо', icon: '⛓️', color: '#b0c4de', type: 'material' },
    coal: { name: 'Уголь', icon: '⚫', color: '#2f4f4f', type: 'material' },
    apple: { name: 'Яблоко', icon: '🍎', color: '#ff0000', type: 'food', hunger: 20 },
    meat: { name: 'Мясо', icon: '🥩', color: '#8b0000', type: 'food', hunger: 40 },
    sword: { name: 'Меч', icon: '⚔️', color: '#c0c0c0', type: 'weapon', damage: 25 },
    pickaxe: { name: 'Кирка', icon: '⛏️', color: '#d2691e', type: 'tool', efficiency: 2 },
    axe: { name: 'Топор', icon: '🪓', color: '#8b4513', type: 'tool', efficiency: 3 },
    torch: { name: 'Факел', icon: '🔦', color: '#ff4500', type: 'light', placeable: 10 },
    health_potion: { name: 'Зелье здоровья', icon: '🧪', color: '#ff0000', type: 'potion', health: 50 }
};

// Рецепты крафта
const CRAFT_RECIPES = [
    { output: 'torch', inputs: { wood: 1, coal: 1 }, amount: 4 },
    { output: 'sword', inputs: { wood: 2, iron: 5 }, amount: 1 },
    { output: 'pickaxe', inputs: { wood: 3, iron: 3 }, amount: 1 },
    { output: 'axe', inputs: { wood: 3, iron: 2 }, amount: 1 },
    { output: 'health_potion', inputs: { apple: 3, coal: 1 }, amount: 1 }
];

// Биомы
const BIOMES = {
    forest: { surface: 1, underground: 2, treeChance: 0.1, grassColor: '#7cfc00' },
    desert: { surface: 6, underground: 6, treeChance: 0.01, grassColor: '#f4e542' },
    mountains: { surface: 3, underground: 3, treeChance: 0.05, grassColor: '#808080' },
    swamp: { surface: 2, underground: 2, waterLevel: 0.3, grassColor: '#228b22' }
};

// ==================== СОСТОЯНИЕ ИГРЫ ====================
let gameState = {
    // Игрок
    player: {
        x: 500,
        y: 300,
        vx: 0,
        vy: 0,
        width: ENTITY_TYPES.player.width,
        height: ENTITY_TYPES.player.height,
        health: CONFIG.MAX_HEALTH,
        hunger: CONFIG.MAX_HUNGER,
        maxHealth: CONFIG.MAX_HEALTH,
        maxHunger: CONFIG.MAX_HUNGER,
        damage: 10,
        armor: 0,
        speed: CONFIG.PLAYER_SPEED,
        jumping: false,
        facing: 1, // 1 = вправо, -1 = влево
        onGround: false,
        inventory: {
            dirt: 10,
            stone: 5,
            wood: 8,
            iron: 0,
            coal: 0,
            apple: 3,
            meat: 0,
            sword: 0,
            pickaxe: 1,
            axe: 0,
            torch: 2,
            health_potion: 0
        },
        hotbar: ['pickaxe', 'dirt', 'wood', 'torch', 'apple', 'sword'],
        selectedSlot: 0
    },
    
    // Мир
    world: [],
    chunks: {},
    
    // Существа
    entities: [],
    
    // Время
    time: {
        isDay: true,
        timeOfDay: 0, // 0-1, где 0 = полночь, 0.5 = полдень
        day: 1
    },
    
    // Статистика
    stats: {
        blocksBroken: 0,
        monstersKilled: 0,
        distanceTraveled: 0
    },
    
    // Мультиплеер
    multiplayer: {
        connected: false,
        peer: null,
        conn: null,
        roomId: null,
        players: []
    },
    
    // Система
    paused: false,
    deviceType: 'desktop',
    canvas: null,
    ctx: null,
    camera: { x: 0, y: 0, width: 0, height: 0 },
    lastTime: 0,
    keys: {},
    mouse: { x: 0, y: 0, down: false, rightDown: false },
    touch: { joystick: { active: false, x: 0, y: 0, startX: 0, startY: 0 } },
    animations: []
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
function init() {
    detectDevice();
    setupCanvas();
    generateWorld();
    setupEventListeners();
    setupUI();
    gameLoop();
    logEvent('Игра запущена! Соберите ресурсы и постройте укрытие.');
}

function detectDevice() {
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    gameState.deviceType = isMobile ? 'mobile' : 'desktop';
    document.getElementById('deviceType').textContent = 
        `Устройство: ${isMobile ? 'Мобильное' : 'ПК'}`;
    document.getElementById('screenSize').textContent = 
        `Экран: ${window.innerWidth}×${window.innerHeight}`;
    
    // Показываем/скрываем мобильное управление
    const mobileControls = document.getElementById('mobileControls');
    mobileControls.style.display = isMobile ? 'block' : 'none';
}

function setupCanvas() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // Устанавливаем размер canvas
    function resizeCanvas() {
        const container = gameState.canvas.parentElement;
        gameState.canvas.width = container.clientWidth;
        gameState.canvas.height = container.clientHeight;
        gameState.camera.width = gameState.canvas.width;
        gameState.camera.height = gameState.canvas.height;
        
        // Центрируем камеру на игроке
        gameState.camera.x = gameState.player.x - gameState.camera.width / 2;
        gameState.camera.y = gameState.player.y - gameState.camera.height / 2;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function generateWorld() {
    // Создаём пустой мир
    for (let y = 0; y < CONFIG.WORLD_HEIGHT; y++) {
        gameState.world[y] = [];
        for (let x = 0; x < CONFIG.WORLD_WIDTH; x++) {
            gameState.world[y][x] = 0; // Воздух
        }
    }
    
    // Генерируем ландшафт
    const surfaceHeight = 20;
    const amplitude = 5;
    const frequency = 0.1;
    
    for (let x = 0; x < CONFIG.WORLD_WIDTH; x++) {
        // Синусоидальная поверхность
        let height = surfaceHeight + Math.sin(x * frequency) * amplitude;
        height = Math.floor(height);
        
        // Добавляем случайные вариации
        height += Math.floor(Math.random() * 3) - 1;
        
        // Заполняем колонку
        for (let y = 0; y < CONFIG.WORLD_HEIGHT; y++) {
            if (y > height + 5) {
                // Камень глубоко под землёй
                gameState.world[y][x] = 3;
            } else if (y > height) {
                // Земля
                gameState.world[y][x] = 2;
            } else if (y === height) {
                // Трава на поверхности
                gameState.world[y][x] = 1;
                
                // Иногда генерируем деревья
                if (Math.random() < 0.1 && x > 5 && x < CONFIG.WORLD_WIDTH - 5) {
                    generateTree(x, y - 1);
                }
            }
            
            // Добавляем пещеры
            if (y > height + 3 && Math.random() < 0.05) {
                generateCave(x, y);
            }
            
            // Добавляем руды
            if (y > height + 10 && Math.random() < 0.02) {
                gameState.world[y][x] = 8; // Железо
            }
            if (y > height + 15 && Math.random() < 0.015) {
                gameState.world[y][x] = 9; // Уголь
            }
        }
    }
    
    // Добавляем воду
    for (let x = 0; x < CONFIG.WORLD_WIDTH; x++) {
        for (let y = surfaceHeight + 1; y < surfaceHeight + 4; y++) {
            if (Math.random() < 0.3) {
                gameState.world[y][x] = 7; // Вода
            }
        }
    }
    
    // Добавляем начальных монстров
    for (let i = 0; i < 5; i++) {
        spawnMonster();
    }
}

function generateTree(x, y) {
    const height = 4 + Math.floor(Math.random() * 3);
    
    // Ствол
    for (let i = 0; i < height; i++) {
        if (y - i >= 0) {
            gameState.world[y - i][x] = 4; // Дерево
        }
    }
    
    // Листва
    const leavesY = y - height;
    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 0; dy++) {
            if (Math.abs(dx) + Math.abs(dy) <= 3) {
                const tx = x + dx;
                const ty = leavesY + dy;
                if (tx >= 0 && tx < CONFIG.WORLD_WIDTH && ty >= 0) {
                    gameState.world[ty][tx] = 5; // Листья
                }
            }
        }
    }
}

function generateCave(x, y) {
    const radius = 2 + Math.floor(Math.random() * 3);
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            if (dx*dx + dy*dy <= radius*radius) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < CONFIG.WORLD_WIDTH && ty >= 0 && ty < CONFIG.WORLD_HEIGHT) {
                    gameState.world[ty][tx] = 0; // Воздух
                }
            }
        }
    }
}

function spawnMonster() {
    const types = ['zombie', 'skeleton', 'slime', 'bat', 'spider'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Находим случайную позицию на поверхности
    let x, y;
    let attempts = 0;
    
    do {
        x = Math.floor(Math.random() * CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE);
        y = 100; // Стартовая высота
        attempts++;
    } while (attempts < 100 && !isValidSpawnPosition(x, y));
    
    if (attempts < 100) {
        gameState.entities.push({
            type: type,
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            width: ENTITY_TYPES[type].width,
            height: ENTITY_TYPES[type].height,
            health: ENTITY_TYPES[type].health,
            damage: ENTITY_TYPES[type].damage,
            speed: ENTITY_TYPES[type].speed,
            facing: Math.random() > 0.5 ? 1 : -1,
            aiState: 'idle',
            aiTimer: 0
        });
    }
}

function isValidSpawnPosition(x, y) {
    // Проверяем, есть ли твёрдая поверхность под монстром
    const tileX = Math.floor(x / CONFIG.TILE_SIZE);
    const tileY = Math.floor((y + 10) / CONFIG.TILE_SIZE);
    
    if (tileX < 0 || tileX >= CONFIG.WORLD_WIDTH || tileY < 0 || tileY >= CONFIG.WORLD_HEIGHT) {
        return false;
    }
    
    const tileBelow = gameState.world[tileY][tileX];
    const tileAtPos = gameState.world[tileY - 1][tileX];
    
    return BLOCK_TYPES[tileBelow].solid && !BLOCK_TYPES[tileAtPos].solid;
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Клавиатура
    document.addEventListener('keydown', (e) => {
        gameState.keys[e.key.toLowerCase()] = true;
        
        // Горячие клавиши инвентаря
        if (e.key >= '1' && e.key <= '9') {
            const slot = parseInt(e.key) - 1;
            if (slot < gameState.player.hotbar.length) {
                gameState.player.selectedSlot = slot;
                updateHotbar();
            }
        }
        
        // Открытие инвентаря
        if (e.key === 'e') {
            toggleInventory();
        }
        
        // Выбрасывание предмета
        if (e.key === 'q') {
            dropItem();
        }
        
        // Пауза
        if (e.key === 'Escape') {
            togglePause();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        gameState.keys[e.key.toLowerCase()] = false;
    });
    
    // Мышь
    gameState.canvas.addEventListener('mousemove', (e) => {
        const rect = gameState.canvas.getBoundingClientRect();
        gameState.mouse.x = (e.clientX - rect.left) * (gameState.canvas.width / rect.width);
        gameState.mouse.y = (e.clientY - rect.top) * (gameState.canvas.height / rect.height);
    });
    
    gameState.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            gameState.mouse.down = true;
            handleMouseClick();
        } else if (e.button === 2) {
            gameState.mouse.rightDown = true;
            handleRightClick();
        }
    });
    
    gameState.canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            gameState.mouse.down = false;
        } else if (e.button === 2) {
            gameState.mouse.rightDown = false;
        }
    });
    
    // Контекстное меню (отключаем)
    gameState.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Сенсорное управление
    gameState.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = gameState.canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (gameState.canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (gameState.canvas.height / rect.height);
        
        // Проверяем, находится ли касание в области джойстика
        const joystickArea = document.getElementById('joystickArea');
        const joystickRect = joystickArea.getBoundingClientRect();
        
        if (x < joystickRect.right && y > joystickRect.top) {
            gameState.touch.joystick.active = true;
            gameState.touch.joystick.startX = joystickRect.left + joystickRect.width / 2;
            gameState.touch.joystick.startY = joystickRect.top + joystickRect.height / 2;
            gameState.touch.joystick.x = 0;
            gameState.touch.joystick.y = 0;
        }
    });
    
    gameState.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!gameState.touch.joystick.active) return;
        
        const touch = e.touches[0];
        const rect = gameState.canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (gameState.canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (gameState.canvas.height / rect.height);
        
        // Вычисляем смещение относительно центра джойстика
        const dx = x - gameState.touch.joystick.startX;
        const dy = y - gameState.touch.joystick.startY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const maxDistance = 40;
        
        if (distance > maxDistance) {
            gameState.touch.joystick.x = (dx / distance) * maxDistance;
            gameState.touch.joystick.y = (dy / distance) * maxDistance;
        } else {
            gameState.touch.joystick.x = dx;
            gameState.touch.joystick.y = dy;
        }
        
        // Обновляем позицию джойстика на экране
        const joystick = document.getElementById('joystick');
        joystick.style.transform = `translate(${gameState.touch.joystick.x}px, ${gameState.touch.joystick.y}px)`;
    });
    
    gameState.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        gameState.touch.joystick.active = false;
        gameState.touch.joystick.x = 0;
        gameState.touch.joystick.y = 0;
        
        // Сбрасываем джойстик в центр
        const joystick = document.getElementById('joystick');
        joystick.style.transform = 'translate(-50%, -50%)';
    });
    
    // Кнопки мобильного управления
    document.getElementById('jumpBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        gameState.keys[' '] = true;
    });
    
    document.getElementById('jumpBtn').addEventListener('touchend', (e) => {
        e.preventDefault();
        gameState.keys[' '] = false;
    });
    
    document.getElementById('attackBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleMouseClick();
    });
    
    document.getElementById('useBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleRightClick();
    });
    
    document.getElementById('buildBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleBuildMode();
    });
    
    document.getElementById('inventoryBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleInventory();
    });
    
    // Кнопки интерфейса
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('helpBtn').addEventListener('click', showHelp);
    document.getElementById('multiplayerBtn').addEventListener('click', showMultiplayer);
    
    // Модальные окна
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function handleMouseClick() {
    // Атака/копание
    const worldX = gameState.mouse.x + gameState.camera.x;
    const worldY = gameState.mouse.y + gameState.camera.y;
    
    // Проверяем, попали ли по монстру
    for (let i = 0; i < gameState.entities.length; i++) {
        const entity = gameState.entities[i];
        if (entity.type === 'player') continue;
        
        if (worldX > entity.x - entity.width/2 && worldX < entity.x + entity.width/2 &&
            worldY > entity.y - entity.height && worldY < entity.y) {
            
            // Наносим урон
            entity.health -= gameState.player.damage;
            logEvent(`Атаковали ${entity.type}! Урон: ${gameState.player.damage}`);
            
            if (entity.health <= 0) {
                // Монстр убит
                gameState.entities.splice(i, 1);
                gameState.stats.monstersKilled++;
                logEvent(`Убили ${entity.type}!`);
                
                // Дроп предметов
                const drops = ['meat', 'coal', 'iron'];
                const drop = drops[Math.floor(Math.random() * drops.length)];
                gameState.player.inventory[drop] = (gameState.player.inventory[drop] || 0) + 1;
                updateInventory();
                
                // Спавним нового монстра
                setTimeout(spawnMonster, 5000);
            }
            
            // Создаём эффект попадания
            createHitEffect(worldX, worldY);
            return;
        }
    }
    
    // Копание блока
    const tileX = Math.floor(worldX / CONFIG.TILE_SIZE);
    const tileY = Math.floor(worldY / CONFIG.TILE_SIZE);
    
    if (tileX >= 0 && tileX < CONFIG.WORLD_WIDTH && tileY >= 0 && tileY < CONFIG.WORLD_HEIGHT) {
        const blockType = gameState.world[tileY][tileX];
        const blockInfo = BLOCK_TYPES[blockType];
        
        if (blockInfo.solid && blockInfo.health > 0) {
            // Уменьшаем прочность блока
            // В реальной игре здесь была бы система прочности
            
            // Удаляем блок
            gameState.world[tileY][tileX] = 0;
            gameState.stats.blocksBroken++;
            
            // Добавляем предмет в инвентарь
            if (blockInfo.drop) {
                gameState.player.inventory[blockInfo.drop] = 
                    (gameState.player.inventory[blockInfo.drop] || 0) + 1;
                updateInventory();
                logEvent(`Добыли ${blockInfo.drop}!`);
            }
            
            // Создаём эффект разрушения
            createBlockBreakEffect(tileX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2, 
                                 tileY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2);
        }
    }
}

function handleRightClick() {
    // Использование/установка блока
    const worldX = gameState.mouse.x + gameState.camera.x;
    const worldY = gameState.mouse.y + gameState.camera.y;
    
    const tileX = Math.floor(worldX / CONFIG.TILE_SIZE);
    const tileY = Math.floor(worldY / CONFIG.TILE_SIZE);
    
    if (tileX >= 0 && tileX < CONFIG.WORLD_WIDTH && tileY >= 0 && tileY < CONFIG.WORLD_HEIGHT) {
        const selectedItem = gameState.player.hotbar[gameState.player.selectedSlot];
        
        if (selectedItem && ITEMS[selectedItem] && ITEMS[selectedItem].placeable) {
            // Проверяем, можно ли установить блок здесь
            if (gameState.world[tileY][tileX] === 0) {
                // Устанавливаем блок
                gameState.world[tileY][tileX] = ITEMS[selectedItem].placeable;
                
                // Убираем предмет из инвентаря
                gameState.player.inventory[selectedItem]--;
                if (gameState.player.inventory[selectedItem] <= 0) {
                    delete gameState.player.inventory[selectedItem];
                }
                
                updateInventory();
                logEvent(`Установили блок ${ITEMS[selectedItem].name}`);
                
                // Создаём эффект установки
                createPlaceEffect(tileX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2, 
                                tileY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2);
            }
        } else if (selectedItem === 'apple' || selectedItem === 'meat') {
            // Использование еды
            useFood(selectedItem);
        } else if (selectedItem === 'health_potion') {
            // Использование зелья
            usePotion();
        }
    }
}

// ==================== ИГРОВАЯ ЛОГИКА ====================
function updatePlayer(deltaTime) {
    const player = gameState.player;
    
    // Управление
    let moveX = 0;
    
    if (gameState.deviceType === 'desktop') {
        if (gameState.keys['a'] || gameState.keys['arrowleft']) moveX -= 1;
        if (gameState.keys['d'] || gameState.keys['arrowright']) moveX += 1;
        
        if ((gameState.keys[' '] || gameState.keys['w'] || gameState.keys['arrowup']) && player.onGround) {
            player.vy = CONFIG.PLAYER_JUMP_FORCE;
            player.onGround = false;
            player.jumping = true;
        }
    } else {
        // Мобильное управление через джойстик
        if (gameState.touch.joystick.active) {
            moveX = gameState.touch.joystick.x / 40; // Нормализуем
        }
    }
    
    // Применяем движение
    player.vx = moveX * player.speed;
    player.x += player.vx;
    
    // Гравитация
    player.vy += CONFIG.GRAVITY;
    player.y += player.vy;
    
    // Ограничение максимальной скорости падения
    if (player.vy > 20) player.vy = 20;
    
    // Коллизии с миром
    handleWorldCollisions(player);
    
    // Обновление направления взгляда
    if (moveX !== 0) {
        player.facing = moveX > 0 ? 1 : -1;
    }
    
    // Обновление статистики
    gameState.stats.distanceTraveled += Math.abs(player.vx) * deltaTime;
    
    // Обновление голода
    player.hunger -= 0.1 * deltaTime;
    if (player.hunger < 0) player.hunger = 0;
    
    // Голод наносит урон
    if (player.hunger <= 0) {
        player.health -= 0.5 * deltaTime;
        if (player.health < 0) player.health = 0;
    }
    
    // Авто-регенерация здоровья
    if (player.hunger > 50 && player.health < player.maxHealth) {
        player.health += 0.1 * deltaTime;
        if (player.health > player.maxHealth) player.health = player.maxHealth;
    }
    
    // Проверка смерти
    if (player.health <= 0) {
        logEvent('Вы погибли! Возрождение...');
        player.health = player.maxHealth;
        player.hunger = player.maxHunger;
        player.x = 500;
        player.y = 300;
    }
    
    // Обновление камеры
    updateCamera();
}

function handleWorldCollisions(entity) {
    // Определяем границы сущности в тайлах
    const leftTile = Math.floor((entity.x - entity.width/2) / CONFIG.TILE_SIZE);
    const rightTile = Math.floor((entity.x + entity.width/2 - 1) / CONFIG.TILE_SIZE);
    const topTile = Math.floor((entity.y - entity.height) / CONFIG.TILE_SIZE);
    const bottomTile = Math.floor((entity.y - 1) / CONFIG.TILE_SIZE);
    
    // Сбрасываем состояние "на земле"
    entity.onGround = false;
    
    // Проверяем коллизии с каждым тайлом в области
    for (let y = topTile; y <= bottomTile; y++) {
        for (let x = leftTile; x <= rightTile; x++) {
            if (x < 0 || x >= CONFIG.WORLD_WIDTH || y < 0 || y >= CONFIG.WORLD_HEIGHT) {
                continue;
            }
            
            const blockType = gameState.world[y][x];
            const blockInfo = BLOCK_TYPES[blockType];
            
            if (blockInfo.solid) {
                // Вычисляем пересечение
                const tileLeft = x * CONFIG.TILE_SIZE;
                const tileRight = tileLeft + CONFIG.TILE_SIZE;
                const tileTop = y * CONFIG.TILE_SIZE;
                const tileBottom = tileTop + CONFIG.TILE_SIZE;
                
                const entityLeft = entity.x - entity.width/2;
                const entityRight = entity.x + entity.width/2;
                const entityTop = entity.y - entity.height;
                const entityBottom = entity.y;
                
                // Определяем глубину пересечения по каждой оси
                const overlapX = Math.min(entityRight - tileLeft, tileRight - entityLeft);
                const overlapY = Math.min(entityBottom - tileTop, tileBottom - entityTop);
                
                // Решаем коллизию по наименьшему пересечению
                if (overlapX < overlapY) {
                    // Коллизия по X
                    if (entityLeft < tileLeft) {
                        entity.x = tileLeft - entity.width/2;
                    } else {
                        entity.x = tileRight + entity.width/2;
                    }
                    entity.vx = 0;
                } else {
                    // Коллизия по Y
                    if (entityTop < tileTop) {
                        entity.y = tileTop - 0.1;
                        entity.vy = 0;
                    } else {
                        entity.y = tileBottom + entity.height;
                        entity.vy = 0;
                        entity.onGround = true;
                        entity.jumping = false;
                    }
                }
            }
        }
    }
}

function updateEntities(deltaTime) {
    // Обновляем монстров
    for (let i = gameState.entities.length - 1; i >= 0; i--) {
        const entity = gameState.entities[i];
        if (entity.type === 'player') continue;
        
        // Простой AI
        entity.aiTimer += deltaTime;
        
        switch (entity.aiState) {
            case 'idle':
                if (entity.aiTimer > 2000) {
                    entity.aiState = 'wander';
                    entity.aiTimer = 0;
                    entity.facing = Math.random() > 0.5 ? 1 : -1;
                }
                break;
                
            case 'wander':
                entity.vx = entity.facing * entity.speed;
                
                // Проверяем, не упал ли монстр с обрыва
                const nextTileX = Math.floor((entity.x + entity.facing * 20) / CONFIG.TILE_SIZE);
                const tileY = Math.floor((entity.y + 10) / CONFIG.TILE_SIZE);
                
                if (nextTileX < 0 || nextTileX >= CONFIG.WORLD_WIDTH || 
                    !BLOCK_TYPES[gameState.world[tileY][nextTileX]].solid) {
                    entity.facing *= -1;
                }
                
                if (entity.aiTimer > 3000) {
                    entity.aiState = 'idle';
                    entity.aiTimer = 0;
                    entity.vx = 0;
                }
                break;
        }
        
        // Гравитация для монстров
        entity.vy += CONFIG.GRAVITY;
        entity.x += entity.vx;
        entity.y += entity.vy;
        
        // Коллизии с миром
        handleWorldCollisions(entity);
        
        // Проверяем столкновение с игроком
        const dx = entity.x - gameState.player.x;
        const dy = entity.y - gameState.player.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < 50 && entity.aiTimer > 1000) {
            // Атака игрока
            gameState.player.health -= entity.damage;
            logEvent(`${entity.type} атаковал вас! -${entity.damage} HP`);
            entity.aiTimer = 0;
            
            // Отбрасывание игрока
            gameState.player.vx = Math.sign(dx) * 10;
            gameState.player.vy = -5;
        }
        
        // Проверяем здоровье монстра
        if (entity.health <= 0) {
            gameState.entities.splice(i, 1);
            gameState.stats.monstersKilled++;
            spawnMonster(); // Спавним нового монстра
        }
    }
    
    // Спавн новых монстров в зависимости от времени суток
    const spawnRate = gameState.time.isDay ? CONFIG.DAY_MONSTER_SPAWN_RATE : CONFIG.NIGHT_MONSTER_SPAWN_RATE;
    if (Math.random() < spawnRate * deltaTime) {
        spawnMonster();
    }
}

function updateCamera() {
    const player = gameState.player;
    const camera = gameState.camera;
    
    // Плавное слежение за игроком
    camera.x += (player.x - camera.x - camera.width/2) * 0.1;
    camera.y += (player.y - camera.y - camera.height/2) * 0.1;
    
    // Ограничиваем камеру границами мира
    const worldWidthPx = CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE;
    const worldHeightPx = CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE;
    
    camera.x = Math.max(0, Math.min(camera.x, worldWidthPx - camera.width));
    camera.y = Math.max(0, Math.min(camera.y, worldHeightPx - camera.height));
}

function updateTime(deltaTime) {
    gameState.time.timeOfDay += deltaTime / CONFIG.DAY_LENGTH;
    
    if (gameState.time.timeOfDay >= 1) {
        gameState.time.timeOfDay = 0;
        gameState.time.day++;
        logEvent(`Наступил день ${gameState.time.day}!`);
    }
    
    gameState.time.isDay = gameState.time.timeOfDay < 0.5;
    
    // Обновляем отображение времени
    const timeElement = document.getElementById('time');
    timeElement.textContent = gameState.time.isDay ? 'День' : 'Ночь';
    
    const dayElement = document.getElementById('day');
    dayElement.textContent = gameState.time.day;
}

// ==================== ОТРИСОВКА ====================
function render() {
    const ctx = gameState.ctx;
    const camera = gameState.camera;
    
    // Очищаем canvas
    ctx.fillStyle = gameState.time.isDay ? '#87CEEB' : '#191970';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Рисуем фон (параллакс)
    drawBackground();
    
    // Начинаем рисовать мир с учётом камеры
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Рисуем мир
    drawWorld();
    
    // Рисуем сущностей
    drawEntities();
    
    // Рисуем эффекты
    drawEffects();
    
    ctx.restore();
    
    // Рисуем интерфейс поверх всего
    drawUI();
}

function drawBackground() {
    const ctx = gameState.ctx;
    const camera = gameState.camera;
    
    // Рисуем небо
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    if (gameState.time.isDay) {
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F7FF');
    } else {
        gradient.addColorStop(0, '#191970');
        gradient.addColorStop(1, '#000033');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Рисуем облака (параллакс)
    ctx.fillStyle = gameState.time.isDay ? 'rgba(255, 255, 255, 0.8)' : 'rgba(200, 200, 255, 0.3)';
    for (let i = 0; i < 5; i++) {
        const x = (camera.x * 0.1 + i * 200) % (ctx.canvas.width + 400) - 200;
        const y = 50 + i * 40;
        const width = 100 + i * 20;
        const height = 40 + i * 10;
        
        ctx.beginPath();
        ctx.ellipse(x, y, width/2, height/2, 0, 0, Math.PI * 2);
        ctx.ellipse(x + width/3, y - height/3, width/3, height/3, 0, 0, Math.PI * 2);
        ctx.ellipse(x - width/3, y - height/3, width/3, height/3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Рисуем солнце/луну
    const time = gameState.time.timeOfDay;
    const sunX = time * ctx.canvas.width;
    const sunY = Math.sin(time * Math.PI) * 100 + 50;
    
    ctx.beginPath();
    if (gameState.time.isDay) {
        ctx.fillStyle = '#FFD700';
        ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    } else {
        ctx.fillStyle = '#F0F0F0';
        ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
        // Рисуем кратеры на луне
        ctx.fillStyle = '#888888';
        ctx.arc(sunX - 10, sunY - 5, 5, 0, Math.PI * 2);
        ctx.arc(sunX + 8, sunY + 10, 7, 0, Math.PI * 2);
        ctx.arc(sunX + 15, sunY - 8, 4, 0, Math.PI * 2);
    }
    ctx.fill();
}

function drawWorld() {
    const ctx = gameState.ctx;
    const camera = gameState.camera;
    
    // Определяем видимую область в тайлах
    const startX = Math.max(0, Math.floor(camera.x / CONFIG.TILE_SIZE) - 1);
    const endX = Math.min(CONFIG.WORLD_WIDTH, Math.ceil((camera.x + camera.width) / CONFIG.TILE_SIZE) + 1);
    const startY = Math.max(0, Math.floor(camera.y / CONFIG.TILE_SIZE) - 1);
    const endY = Math.min(CONFIG.WORLD_HEIGHT, Math.ceil((camera.y + camera.height) / CONFIG.TILE_SIZE) + 1);
    
    // Рисуем видимые тайлы
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const blockType = gameState.world[y][x];
            const blockInfo = BLOCK_TYPES[blockType];
            
            if (blockType !== 0) { // Не рисуем воздух
                const tileX = x * CONFIG.TILE_SIZE;
                const tileY = y * CONFIG.TILE_SIZE;
                
                // Основной цвет блока
                ctx.fillStyle = blockInfo.color;
                ctx.fillRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                
                // Текстура/детали
                if (blockInfo.solid) {
                    // Тень справа и снизу
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.fillRect(tileX + CONFIG.TILE_SIZE - 2, tileY, 2, CONFIG.TILE_SIZE);
                    ctx.fillRect(tileX, tileY + CONFIG.TILE_SIZE - 2, CONFIG.TILE_SIZE, 2);
                    
                    // Свет сверху и слева
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fillRect(tileX, tileY, CONFIG.TILE_SIZE, 2);
                    ctx.fillRect(tileX, tileY, 2, CONFIG.TILE_SIZE);
                }
                
                // Особые эффекты для воды
                if (blockType === 7) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    const waveOffset = Math.sin(Date.now() * 0.001 + x * 0.5) * 2;
                    ctx.fillRect(tileX, tileY + waveOffset, CONFIG.TILE_SIZE, 3);
                }
                
                // Подсветка факелов
                if (blockType === 10) {
                    const lightRadius = 100;
                    const gradient = ctx.createRadialGradient(
                        tileX + CONFIG.TILE_SIZE/2, tileY + CONFIG.TILE_SIZE/2, 5,
                        tileX + CONFIG.TILE_SIZE/2, tileY + CONFIG.TILE_SIZE/2, lightRadius
                    );
                    gradient.addColorStop(0, 'rgba(255, 69, 0, 0.5)');
                    gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(tileX - lightRadius + CONFIG.TILE_SIZE/2, 
                                tileY - lightRadius + CONFIG.TILE_SIZE/2, 
                                lightRadius * 2, lightRadius * 2);
                }
            }
        }
    }
}

function drawEntities() {
    const ctx = gameState.ctx;
    
    // Рисуем монстров
    gameState.entities.forEach(entity => {
        if (entity.type === 'player') return;
        
        const entityInfo = ENTITY_TYPES[entity.type];
        
        // Тело
        ctx.fillStyle = entityInfo.color;
        ctx.fillRect(entity.x - entity.width/2, entity.y - entity.height, 
                    entity.width, entity.height);
        
        // Детали
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(entity.x - entity.width/2, entity.y - entity.height, 
                    entity.width, 5); // Тень
        
        // Глаза
        ctx.fillStyle = 'white';
        const eyeX = entity.x + (entity.facing > 0 ? 5 : -5);
        ctx.fillRect(eyeX - 2, entity.y - entity.height + 10, 4, 4);
        
        // Полоска здоровья
        if (entity.health < entityInfo.health) {
            const healthPercent = entity.health / entityInfo.health;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(entity.x - entity.width/2, entity.y - entity.height - 5, 
                        entity.width, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(entity.x - entity.width/2, entity.y - entity.height - 5, 
                        entity.width * healthPercent, 3);
        }
    });
    
    // Рисуем игрока
    const player = gameState.player;
    const playerInfo = ENTITY_TYPES.player;
    
    // Тело
    ctx.fillStyle = playerInfo.color;
    ctx.fillRect(player.x - player.width/2, player.y - player.height, 
                player.width, player.height);
    
    // Голова
    ctx.fillStyle = '#ff6b8b';
    ctx.fillRect(player.x - player.width/3, player.y - player.height, 
                player.width * 0.67, player.height * 0.3);
    
    // Глаза
    ctx.fillStyle = 'white';
    const eyeX = player.x + (player.facing > 0 ? 3 : -3);
    ctx.fillRect(eyeX - 2, player.y - player.height + 10, 4, 4);
    
    // Рот
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(player.x - 3, player.y - player.height + 20, 6, 2);
    
    // Полоска здоровья
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(player.x - player.width/2, player.y - player.height - 10, 
                player.width, 5);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x - player.width/2, player.y - player.height - 10, 
                player.width * healthPercent, 5);
    
    // Полоска голода
    const hungerPercent = player.hunger / player.maxHunger;
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(player.x - player.width/2, player.y - player.height - 15, 
                player.width, 3);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(player.x - player.width/2, player.y - player.height - 15, 
                player.width * hungerPercent, 3);
    
    // Инвентарь в руке
    const selectedItem = player.hotbar[player.selectedSlot];
    if (selectedItem && ITEMS[selectedItem]) {
        const handX = player.x + (player.facing > 0 ? player.width/2 : -player.width/2);
        const handY = player.y - player.height/2;
        
        ctx.fillStyle = ITEMS[selectedItem].color;
        ctx.fillRect(handX - 5, handY - 5, 10, 10);
        
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ITEMS[selectedItem].icon, handX, handY);
    }
}

function drawEffects() {
    const ctx = gameState.ctx;
    
    // Рисуем все активные эффекты
    for (let i = gameState.animations.length - 1; i >= 0; i--) {
        const effect = gameState.animations[i];
        
        ctx.save();
        ctx.globalAlpha = effect.alpha;
        
        switch (effect.type) {
            case 'hit':
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'break':
                ctx.fillStyle = '#ffffff';
                for (let j = 0; j < 4; j++) {
                    const angle = (j * Math.PI/2) + effect.rotation;
                    const px = effect.x + Math.cos(angle) * effect.size;
                    const py = effect.y + Math.sin(angle) * effect.size;
                    
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'place':
                ctx.fillStyle = '#00ff00';
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
        
        // Обновляем эффект
        effect.lifetime -= 16;
        effect.size += 0.5;
        effect.alpha -= 0.02;
        effect.rotation += 0.1;
        
        // Удаляем завершившиеся эффекты
        if (effect.lifetime <= 0) {
            gameState.animations.splice(i, 1);
        }
    }
}

function drawUI() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    // Полоска здоровья
    const healthPercent = gameState.player.health / gameState.player.maxHealth;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(20, 20, 200, 20);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(20, 20, 200 * healthPercent, 20);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 200, 20);
    
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText(`Здоровье: ${Math.round(gameState.player.health)}/${gameState.player.maxHealth}`, 30, 35);
    
    // Полоска голода
    const hungerPercent = gameState.player.hunger / gameState.player.maxHunger;
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(20, 50, 200, 15);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(20, 50, 200 * hungerPercent, 15);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 50, 200, 15);
    
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText(`Голод: ${Math.round(gameState.player.hunger)}/${gameState.player.maxHunger}`, 30, 62);
    
    // Миникарта
    drawMinimap();
    
    // Отладочная информация
    if (gameState.deviceType === 'desktop') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width - 250, 20, 230, 80);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Координаты: ${Math.round(gameState.player.x)}, ${Math.round(gameState.player.y)}`, canvas.width - 240, 40);
        ctx.fillText(`Биом: ${getCurrentBiome()}`, canvas.width - 240, 60);
        ctx.fillText(`Монстров: ${gameState.entities.length - 1}`, canvas.width - 240, 80);
        ctx.fillText(`День: ${gameState.time.day} ${gameState.time.isDay ? 'День' : 'Ночь'}`, canvas.width - 240, 100);
    }
}

function drawMinimap() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    const player = gameState.player;
    
    const minimapSize = 150;
    const minimapX = canvas.width - minimapSize - 20;
    const minimapY = 20;
    
    // Фон миникарты
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Масштаб для миникарты
    const scale = minimapSize / (CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE);
    
    // Рисуем видимую область мира
    const visibleStartX = Math.max(0, Math.floor(gameState.camera.x / CONFIG.TILE_SIZE));
    const visibleEndX = Math.min(CONFIG.WORLD_WIDTH, Math.ceil((gameState.camera.x + gameState.camera.width) / CONFIG.TILE_SIZE));
    const visibleStartY = Math.max(0, Math.floor(gameState.camera.y / CONFIG.TILE_SIZE));
    const visibleEndY = Math.min(CONFIG.WORLD_HEIGHT, Math.ceil((gameState.camera.y + gameState.camera.height) / CONFIG.TILE_SIZE));
    
    for (let y = visibleStartY; y < visibleEndY; y++) {
        for (let x = visibleStartX; x < visibleEndX; x++) {
            const blockType = gameState.world[y][x];
            if (blockType !== 0) {
                const blockInfo = BLOCK_TYPES[blockType];
                ctx.fillStyle = blockInfo.color;
                ctx.fillRect(minimapX + x * CONFIG.TILE_SIZE * scale, 
                           minimapY + y * CONFIG.TILE_SIZE * scale, 
                           Math.max(1, CONFIG.TILE_SIZE * scale), 
                           Math.max(1, CONFIG.TILE_SIZE * scale));
            }
        }
    }
    
    // Рисуем игрока на миникарте
    ctx.fillStyle = '#e94560';
    const playerMapX = minimapX + player.x * scale;
    const playerMapY = minimapY + player.y * scale;
    ctx.beginPath();
    ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Рисуем монстров на миникарте
    gameState.entities.forEach(entity => {
        if (entity.type !== 'player') {
            ctx.fillStyle = ENTITY_TYPES[entity.type].color;
            const entityMapX = minimapX + entity.x * scale;
            const entityMapY = minimapY + entity.y * scale;
            ctx.beginPath();
            ctx.arc(entityMapX, entityMapY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Рамка миникарты
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function getCurrentBiome() {
    const playerTileY = Math.floor(gameState.player.y / CONFIG.TILE_SIZE);
    
    if (playerTileY < 15) return 'Лес';
    if (playerTileY < 30) return 'Подземелье';
    if (playerTileY < 40) return 'Пещера';
    return 'Глубины';
}

function createHitEffect(x, y) {
    gameState.animations.push({
        type: 'hit',
        x: x,
        y: y,
        size: 5,
        alpha: 1,
        lifetime: 500,
        rotation: 0
    });
}

function createBlockBreakEffect(x, y) {
    gameState.animations.push({
        type: 'break',
        x: x,
        y: y,
        size: 10,
        alpha: 1,
        lifetime: 300,
        rotation: 0
    });
}

function createPlaceEffect(x, y) {
    gameState.animations.push({
        type: 'place',
        x: x,
        y: y,
        size: 5,
        alpha: 1,
        lifetime: 200,
        rotation: 0
    });
}

function useFood(foodType) {
    const foodInfo = ITEMS[foodType];
    if (!foodInfo || foodInfo.type !== 'food') return;
    
    if (gameState.player.inventory[foodType] > 0) {
        gameState.player.hunger = Math.min(gameState.player.maxHunger, 
                                         gameState.player.hunger + foodInfo.hunger);
        gameState.player.inventory[foodType]--;
        
        if (gameState.player.inventory[foodType] <= 0) {
            delete gameState.player.inventory[foodType];
        }
        
        updateInventory();
        logEvent(`Съели ${foodInfo.name}! +${foodInfo.hunger} к голоду`);
    }
}

function usePotion() {
    if (gameState.player.inventory.health_potion > 0) {
        gameState.player.health = Math.min(gameState.player.maxHealth, 
                                         gameState.player.health + 50);
        gameState.player.inventory.health_potion--;
        
        updateInventory();
        logEvent('Выпили зелье здоровья! +50 HP');
    }
}

function dropItem() {
    const selectedItem = gameState.player.hotbar[gameState.player.selectedSlot];
    if (selectedItem && gameState.player.inventory[selectedItem] > 0) {
        gameState.player.inventory[selectedItem]--;
        
        if (gameState.player.inventory[selectedItem] <= 0) {
            delete gameState.player.inventory[selectedItem];
            // Убираем предмет из горячей панели
            gameState.player.hotbar[gameState.player.selectedSlot] = null;
        }
        
        updateInventory();
        updateHotbar();
        logEvent(`Выбросили ${ITEMS[selectedItem].name}`);
    }
}

function toggleInventory() {
    // В реальной игре здесь было бы открытие/закрытие инвентаря
    logEvent('Инвентарь (реализуйте открытие окна инвентаря)');
}

function toggleBuildMode() {
    logEvent('Режим строительства активирован');
}

function togglePause() {
    gameState.paused = !gameState.paused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.innerHTML = gameState.paused ? 
        '<i class="fas fa-play"></i> Продолжить' : 
        '<i class="fas fa-pause"></i> Пауза';
    logEvent(gameState.paused ? 'Игра на паузе' : 'Игра продолжается');
}

function showHelp() {
    document.getElementById('helpModal').style.display = 'block';
}

function showMultiplayer() {
    document.getElementById('multiplayerModal').style.display = 'block';
}

function logEvent(message) {
    const logContent = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContent.appendChild(entry);
    
    // Ограничиваем количество записей
    while (logContent.children.length > 20) {
        logContent.removeChild(logContent.firstChild);
    }
    
    logContent.scrollTop = logContent.scrollHeight;
}

// ==================== ИНТЕРФЕЙС ====================
function setupUI() {
    updateInventory();
    updateHotbar();
    updateStats();
    setupCrafting();
}

function updateInventory() {
    const inventorySlots = document.getElementById('inventorySlots');
    inventorySlots.innerHTML = '';
    
    Object.entries(gameState.player.inventory).forEach(([itemId, count]) => {
        if (count > 0 && ITEMS[itemId]) {
            const item = ITEMS[itemId];
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.innerHTML = `
                <span class="item-icon">${item.icon}</span>
                <span class="count">${count}</span>
            `;
            slot.title = `${item.name} (${count})`;
            slot.style.borderColor = item.color;
            inventorySlots.appendChild(slot);
        }
    });
    
    // Обновляем статистику в интерфейсе
    document.getElementById('health').textContent = Math.round(gameState.player.health);
    document.getElementById('hunger').textContent = Math.round(gameState.player.hunger);
    document.getElementById('damage').textContent = gameState.player.damage;
    document.getElementById('armor').textContent = gameState.player.armor;
    document.getElementById('speed').textContent = gameState.player.speed;
    
    // Обновляем информацию о мире
    document.getElementById('currentBiome').textContent = getCurrentBiome();
    document.getElementById('depth').textContent = Math.floor(gameState.player.y / CONFIG.TILE_SIZE);
    document.getElementById('coordinates').textContent = 
        `${Math.round(gameState.player.x)}, ${Math.round(gameState.player.y)}`;
    document.getElementById('blocksBroken').textContent = gameState.stats.blocksBroken;
    document.getElementById('monstersKilled').textContent = gameState.stats.monstersKilled;
}

function updateHotbar() {
    const hotbar = document.getElementById('hotbar');
    hotbar.innerHTML = '';
    
    gameState.player.hotbar.forEach((itemId, index) => {
        const slot = document.createElement('div');
        slot.className = 'hotbar-slot';
        if (index === gameState.player.selectedSlot) {
            slot.classList.add('active');
        }
        
        if (itemId && ITEMS[itemId]) {
            const item = ITEMS[itemId];
            slot.innerHTML = item.icon;
            slot.style.color = item.color;
            slot.title = item.name;
        } else {
            slot.innerHTML = index + 1;
        }
        
        slot.addEventListener('click', () => {
            gameState.player.selectedSlot = index;
            updateHotbar();
        });
        
        hotbar.appendChild(slot);
    });
}

function updateStats() {
    // Обновляем полоски здоровья и голода
    const healthBar = document.querySelector('.health-bar');
    const hungerBar = document.querySelector('.hunger-bar');
    
    const healthPercent = (gameState.player.health / gameState.player.maxHealth) * 100;
    const hungerPercent = (gameState.player.hunger / gameState.player.maxHunger) * 100;
    
    healthBar.style.width = `${healthPercent}%`;
    hungerBar.style.width = `${hungerPercent}%`;
}

function setupCrafting() {
    const craftList = document.getElementById('craftList');
    craftList.innerHTML = '';
    
    CRAFT_RECIPES.forEach(recipe => {
        const item = ITEMS[recipe.output];
        if (!item) return;
        
        const craftItem = document.createElement('div');
        craftItem.className = 'craft-item';
        
        // Форматируем список ингредиентов
        const ingredients = Object.entries(recipe.inputs)
            .map(([itemId, amount]) => {
                const ingItem = ITEMS[itemId];
                return `${ingItem.icon} ${amount}`;
            })
            .join(' + ');
        
        craftItem.innerHTML = `
            <div>
                <strong>${item.icon} ${item.name}</strong><br>
                <small>${ingredients}</small>
            </div>
            <button class="craft-btn" data-recipe="${recipe.output}">Создать</button>
        `;
        
        craftList.appendChild(craftItem);
    });
    
    // Добавляем обработчики для кнопок крафта
    document.querySelectorAll('.craft-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const recipeOutput = btn.dataset.recipe;
            craftItem(recipeOutput);
        });
    });
}

function craftItem(itemId) {
    const recipe = CRAFT_RECIPES.find(r => r.output === itemId);
    if (!recipe) return false;
    
    // Проверяем, есть ли все ингредиенты
    for (const [ingredientId, amount] of Object.entries(recipe.inputs)) {
        if (!gameState.player.inventory[ingredientId] || 
            gameState.player.inventory[ingredientId] < amount) {
            logEvent(`Не хватает ${ITEMS[ingredientId].name} для крафта!`);
            return false;
        }
    }
    
    // Тратим ингредиенты
    for (const [ingredientId, amount] of Object.entries(recipe.inputs)) {
        gameState.player.inventory[ingredientId] -= amount;
        if (gameState.player.inventory[ingredientId] <= 0) {
            delete gameState.player.inventory[ingredientId];
        }
    }
    
    // Добавляем результат
    gameState.player.inventory[itemId] = 
        (gameState.player.inventory[itemId] || 0) + recipe.amount;
    
    // Обновляем интерфейс
    updateInventory();
    logEvent(`Скрафтили ${ITEMS[itemId].name}!`);
    return true;
}

// ==================== МУЛЬТИПЛЕЕР ====================
function initMultiplayer() {
    // Инициализация PeerJS
    const peer = new Peer({
        host: 'peerjs-server.herokuapp.com',
        secure: true,
        port: 443
    });
    
    peer.on('open', (id) => {
        gameState.multiplayer.peer = peer;
        gameState.multiplayer.roomId = id;
        document.getElementById('roomId').textContent = id;
        logEvent(`Мультиплеер: комната создана (ID: ${id})`);
    });
    
    peer.on('connection', (conn) => {
        conn.on('open', () => {
            gameState.multiplayer.conn = conn;
            gameState.multiplayer.players.push(conn.peer);
            logEvent(`Игрок ${conn.peer} присоединился`);
            
            // Отправляем текущее состояние игры
            conn.send({
                type: 'gameState',
                state: gameState
            });
        });
        
        conn.on('data', (data) => {
            handleMultiplayerData(data);
        });
        
        conn.on('close', () => {
            const index = gameState.multiplayer.players.indexOf(conn.peer);
            if (index > -1) {
                gameState.multiplayer.players.splice(index, 1);
            }
            logEvent(`Игрок ${conn.peer} отключился`);
        });
    });
}

function handleMultiplayerData(data) {
    switch (data.type) {
        case 'gameState':
            // Синхронизация состояния игры
            Object.assign(gameState, data.state);
            break;
        case 'playerMove':
            // Обновление позиции другого игрока
            const player = gameState.multiplayer.players.find(p => p.id === data.playerId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
            }
            break;
        case 'blockUpdate':
            // Обновление блока
            if (data.y >= 0 && data.y < gameState.world.length &&
                data.x >= 0 && data.x < gameState.world[data.y].length) {
                gameState.world[data.y][data.x] = data.blockType;
            }
            break;
    }
}

// ==================== ИГРОВОЙ ЦИКЛ ====================
function gameLoop(timestamp = 0) {
    const deltaTime = timestamp - gameState.lastTime || 0;
    gameState.lastTime = timestamp;
    
    if (!gameState.paused) {
        // Обновление игровой логики
        updatePlayer(deltaTime);
        updateEntities(deltaTime);
        updateTime(deltaTime);
        
        // Обновление интерфейса
        updateStats();
    }
    
    // Отрисовка
    render();
    
    // Следующий кадр
    requestAnimationFrame(gameLoop);
}

// ==================== ЗАПУСК ИГРЫ ====================
// Инициализация при загрузке страницы
window.addEventListener('load', () => {
    init();
    
    // Запускаем мультиплеер (опционально)
    // initMultiplayer();
    
    // Обработчики для кнопок мультиплеера
    document.getElementById('createRoomBtn')?.addEventListener('click', () => {
        initMultiplayer();
        document.getElementById('createRoomBtn').disabled = true;
    });
    
    document.getElementById('joinRoomBtn')?.addEventListener('click', () => {
        const roomId = document.getElementById('roomIdInput').value.trim();
        if (roomId && gameState.multiplayer.peer) {
            const conn = gameState.multiplayer.peer.connect(roomId);
            conn.on('open', () => {
                gameState.multiplayer.conn = conn;
                gameState.multiplayer.connected = true;
                logEvent(`Присоединились к комнате ${roomId}`);
            });
        }
    });
});
