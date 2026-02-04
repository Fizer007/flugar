const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Хранилище игроков и комнат
const rooms = new Map();
const players = new Map();

// Глобальное состояние игры
const gameState = {
  isHidingTime: false,
  hideStartTime: 0,
  hideDuration: 10000, // 10 секунд на поиск укрытия
  worldSeed: Math.random(),
  worldChunks: new Map()
};

// Генерация чанка мира
function generateChunk(chunkX) {
  const seed = gameState.worldSeed;
  const chunkKey = `${chunkX}`;
  
  if (gameState.worldChunks.has(chunkKey)) {
    return gameState.worldChunks.get(chunkKey);
  }

  const platforms = [];
  const hidingSpots = [];
  const decorations = [];
  
  // Базовый пол
  for (let x = 0; x < 20; x++) {
    platforms.push({
      x: chunkX * 20 * 32 + x * 32,
      y: 400,
      width: 32,
      height: 32,
      type: 'ground'
    });
  }
  
  // Случайные платформы
  const random = (x) => {
    const sin = Math.sin(x * 0.1 + seed) * 100;
    const cos = Math.cos(x * 0.05 + seed) * 50;
    return sin + cos;
  };
  
  for (let x = 0; x < 20; x++) {
    const height = 300 + random(chunkX * 20 + x);
    if (height < 380 && height > 200) {
      platforms.push({
        x: chunkX * 20 * 32 + x * 32,
        y: height,
        width: 96,
        height: 32,
        type: 'platform'
      });
    }
  }
  
  // Укрытия (люки и шкафы)
  if (Math.random() > 0.3) {
    hidingSpots.push({
      id: `hiding_${chunkX}_${Date.now()}`,
      x: chunkX * 20 * 32 + 150,
      y: 368,
      width: 64,
      height: 32,
      type: 'manhole',
      name: 'Люк'
    });
  }
  
  if (Math.random() > 0.5) {
    hidingSpots.push({
      id: `hiding_${chunkX}_${Date.now()}_2`,
      x: chunkX * 20 * 32 + 400,
      y: 300,
      width: 48,
      height: 96,
      type: 'closet',
      name: 'Шкаф'
    });
  }
  
  // Декорации
  for (let i = 0; i < 5; i++) {
    decorations.push({
      x: chunkX * 20 * 32 + Math.random() * 600,
      y: 370,
      width: 16,
      height: 16,
      type: Math.random() > 0.5 ? 'bush' : 'box'
    });
  }
  
  const chunk = { platforms, hidingSpots, decorations, chunkX };
  gameState.worldChunks.set(chunkKey, chunk);
  return chunk;
}

// Событие пряток
function startHidingEvent() {
  gameState.isHidingTime = true;
  gameState.hideStartTime = Date.now();
  
  // Звуковой сигнал и мигание
  io.emit('hiding-event-start', {
    duration: gameState.hideDuration,
    startTime: gameState.hideStartTime
  });
  
  // Завершение события через заданное время
  setTimeout(() => {
    gameState.isHidingTime = false;
    io.emit('hiding-event-end');
    
    // Следующее событие через случайное время (30-60 секунд)
    setTimeout(startHidingEvent, 30000 + Math.random() * 30000);
  }, gameState.hideDuration);
}

io.on('connection', (socket) => {
  console.log('Новый игрок подключился:', socket.id);
  
  // Создание игрока
  const player = {
    id: socket.id,
    x: 100 + Math.random() * 200,
    y: 300,
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
    isHiding: false,
    hidingSpotId: null,
    facingRight: true,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    name: `Игрок_${Math.floor(Math.random() * 1000)}`,
    lastChunk: 0
  };
  
  players.set(socket.id, player);
  
  // Отправляем текущее состояние новому игроку
  socket.emit('init', {
    playerId: socket.id,
    players: Array.from(players.values()),
    gameState: {
      isHidingTime: gameState.isHidingTime,
      hideStartTime: gameState.hideStartTime,
      hideDuration: gameState.hideDuration
    },
    worldSeed: gameState.worldSeed
  });
  
  // Отправляем начальные чанки
  for (let chunkX = -2; chunkX <= 2; chunkX++) {
    const chunk = generateChunk(chunkX);
    socket.emit('chunk-data', chunk);
  }
  
  // Уведомляем других игроков
  socket.broadcast.emit('player-joined', player);
  
  // Обработка движения игрока
  socket.on('move', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    if (!player.isHiding) {
      player.velocityX = data.velocityX;
      player.facingRight = data.facingRight;
      
      if (data.jump && !player.isJumping) {
        player.velocityY = -12;
        player.isJumping = true;
      }
      
      // Обновление чанков при движении
      const currentChunk = Math.floor(player.x / (20 * 32));
      if (currentChunk !== player.lastChunk) {
        player.lastChunk = currentChunk;
        
        // Отправляем новые чанки
        for (let chunkX = currentChunk - 2; chunkX <= currentChunk + 2; chunkX++) {
          const chunk = generateChunk(chunkX);
          socket.emit('chunk-data', chunk);
        }
      }
      
      io.emit('player-moved', {
        id: socket.id,
        x: player.x,
        y: player.y,
        velocityX: player.velocityX,
        velocityY: player.velocityY,
        facingRight: player.facingRight
      });
    }
  });
  
  // Обработка взаимодействия с укрытиями
  socket.on('hide', (hidingSpotId) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    player.isHiding = !player.isHiding;
    player.hidingSpotId = player.isHiding ? hidingSpotId : null;
    
    io.emit('player-hiding', {
      id: socket.id,
      isHiding: player.isHiding,
      hidingSpotId: player.hidingSpotId
    });
  });
  
  // Обработка отключения игрока
  socket.on('disconnect', () => {
    console.log('Игрок отключился:', socket.id);
    players.delete(socket.id);
    io.emit('player-left', socket.id);
  });
  
  // Запрос чанка
  socket.on('request-chunk', (chunkX) => {
    const chunk = generateChunk(chunkX);
    socket.emit('chunk-data', chunk);
  });
});

// Запуск периодических событий пряток
setTimeout(startHidingEvent, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});