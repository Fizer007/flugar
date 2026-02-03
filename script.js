class MultiplayerTowerDefense {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.peerId = null;
        this.opponentId = null;
        this.isHost = false;
        
        this.gameState = {
            players: {},
            towers: [],
            enemies: [],
            bullets: [],
            wave: 1,
            gameStarted: false,
            money: 200,
            health: 100,
            opponentMoney: 200,
            opponentHealth: 100,
            selectedTower: null,
            path: []
        };
        
        this.cellSize = 60;
        this.gameSpeed = 2;
        this.lastUpdate = Date.now();
        this.enemyIdCounter = 0;
        this.towerIdCounter = 0;
        this.bulletIdCounter = 0;
        
        this.init();
    }
    
    init() {
        this.initElements();
        this.initPeerJS();
        this.initEventListeners();
        this.generateGameBoard();
        this.generatePath();
        this.gameLoop();
    }
    
    initElements() {
        this.elements = {
            playerStatus: document.getElementById('player-status'),
            health: document.getElementById('health'),
            money: document.getElementById('money'),
            wave: document.getElementById('wave'),
            opponentInfo: document.getElementById('opponent-info'),
            gameBoard: document.getElementById('game-board'),
            gameLog: document.getElementById('game-log'),
            peerIdInput: document.getElementById('peer-id-input'),
            connectBtn: document.getElementById('connect-btn'),
            copyIdBtn: document.getElementById('copy-id-btn'),
            startGameBtn: document.getElementById('start-game-btn'),
            nextWaveBtn: document.getElementById('next-wave-btn'),
            upgradeBtn: document.getElementById('upgrade-btn'),
            sellBtn: document.getElementById('sell-btn'),
            selectedTower: document.getElementById('selected-tower'),
            enemyPreview: document.getElementById('enemy-preview'),
            connectionModal: document.getElementById('connection-modal'),
            yourPeerId: document.getElementById('your-peer-id'),
            connectToId: document.getElementById('connect-to-id'),
            modalConnect: document.getElementById('modal-connect'),
            closeModal: document.getElementById('close-modal'),
            copyModalId: document.getElementById('copy-modal-id')
        };
        
        // ÐÐ¾ÐºÐ°Ð·ÑÐ²Ð°ÐµÐ¼ Ð¼Ð¾Ð´Ð°Ð»ÑÐ½Ð¾Ðµ Ð¾ÐºÐ½Ð¾ Ð¿ÑÐ¸ Ð·Ð°Ð³ÑÑÐ·ÐºÐµ
        setTimeout(() => {
            this.elements.connectionModal.style.display = 'flex';
        }, 1000);
    }
    
    initPeerJS() {
        // ÐÐ½Ð¸ÑÐ¸Ð°Ð»Ð¸Ð·Ð¸ÑÑÐµÐ¼ PeerJS Ñ Ð±ÐµÑÐ¿Ð»Ð°ÑÐ½ÑÐ¼ ÑÐµÑÐ²ÐµÑÐ¾Ð¼
        this.peer = new Peer({
            host: '0.peerjs.com',
            port: 443,
            path: '/',
            pingInterval: 5000
        });
        
        this.peer.on('open', (id) => {
            this.peerId = id;
            this.elements.playerStatus.textContent = `ID: ${id.substring(0, 8)}...`;
            this.elements.yourPeerId.textContent = id;
            this.elements.playerStatus.style.color = '#4CAF50';
            this.addLog('ÐÐ¾Ð´ÐºÐ»ÑÑÐµÐ½Ð¾ Ðº ÑÐµÑÐ²ÐµÑÑ PeerJS');
            this.addLog(`ÐÐ°Ñ ID: ${id}`);
        });
        
        this.peer.on('connection', (connection) => {
            this.addLog('ÐÐ¾Ð»ÑÑÐµÐ½ Ð·Ð°Ð¿ÑÐ¾Ñ Ð½Ð° Ð¿Ð¾Ð´ÐºÐ»ÑÑÐµÐ½Ð¸Ðµ...');
            this.conn = connection;
            this.opponentId = connection.peer;
            this.setupConnection();
        });
        
        this.peer.on('error', (err) => {
            console.error('PeerJS Ð¾ÑÐ¸Ð±ÐºÐ°:', err);
            this.addLog(`ÐÑÐ¸Ð±ÐºÐ°: ${err.type}`, 'error');
        });
    }
    
    setupConnection() {
        if (!this.conn) return;
        
        this.conn.on('open', () => {
            this.addLog(`ÐÐ¾Ð´ÐºÐ»ÑÑÐµÐ½ Ðº ${this.opponentId.substring(0, 8)}...`);
            this.elements.opponentInfo.textContent = `ÐÐ¿Ð¿Ð¾Ð½ÐµÐ½Ñ: ${this.opponentId.substring(0, 8)}...`;
            this.elements.startGameBtn.disabled = false;
            
            // ÐÑÐ»Ð¸ Ð¼Ñ ÑÐ¾ÑÑ, Ð¾ÑÐ¿ÑÐ°Ð²Ð»ÑÐµÐ¼ Ð½Ð°ÑÐ°Ð»ÑÐ½Ð¾Ðµ ÑÐ¾ÑÑÐ¾ÑÐ½Ð¸Ðµ
            if (this.isHost) {
                this.sendGameState();
            }
        });
        
        this.conn.on('data', (data) => {
            this.handleNetworkData(data);
        });
        
        this.conn.on('close', () => {
            this.addLog('Ð¡Ð¾ÐµÐ´Ð¸Ð½ÐµÐ½Ð¸Ðµ ÑÐ°Ð·Ð¾ÑÐ²Ð°Ð½Ð¾', 'error');
            this.conn = null;
            this.opponentId = null;
            this.elements.startGameBtn.disabled = true;
            this.elements.opponentInfo.textContent = 'ÐÐ¿Ð¿Ð¾Ð½ÐµÐ½Ñ: ÐÐµ Ð¿Ð¾Ð´ÐºÐ»ÑÑÐµÐ½';
        });
    }
    
    initEventListeners() {
        // ÐÐ¾Ð´ÐºÐ»ÑÑÐµÐ½Ð¸Ðµ
        this.elements.connectBtn.addEventListener('click', () => this.connectToPeer());
        this.elements.copyIdBtn.addEventListener('click', () => this.copyPeerId());
        this.elements.startGameBtn.addEventListener('click', () => this.startGame());
        this.elements.modalConnect.addEventListener('click', () => this.connectFromModal());
        this.elements.closeModal.addEventListener('click', () => {
            this.elements.connectionModal.style.display = 'none';
        });
        this.elements.copyModalId.addEventListener('click', () => {
            navigator.clipboard.writeText(this.peerId);
            this.addLog('ID ÑÐºÐ¾Ð¿Ð¸ÑÐ¾Ð²Ð°Ð½ Ð² Ð±ÑÑÐµÑ Ð¾Ð±Ð¼ÐµÐ½Ð°');
        });
        
        // ÐÐ³ÑÐ¾Ð²ÑÐµ ÐºÐ¾Ð½ÑÑÐ¾Ð»Ñ
        this.elements.nextWaveBtn.addEventListener('click', () => this.startNextWave());
        this.elements.upgradeBtn.addEventListener('click', () => this.upgradeSelectedTower());
        this.elements.sellBtn.addEventListener('click', () => this.sellSelectedTower());
        
        // ÐÑÐ±Ð¾Ñ ÑÐºÐ¾ÑÐ¾ÑÑÐ¸
        document.getElementById('speed-1x').addEventListener('click', () => this.setGameSpeed(1));
        document.getElementById('speed-2x').addEventListener('click', () => this.setGameSpeed(2));
        document.getElementById('speed-3x').addEventListener('click', () => this.setGameSpeed(3));
        
        // ÐÑÐ±Ð¾Ñ Ð±Ð°ÑÐµÐ½
        document.querySelectorAll('.tower-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.tower-option').forEach(o => o.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                const type = e.currentTarget.dataset.type;
                const cost = parseInt(e.currentTarget.dataset.cost);
                this.gameState.selectedTower = { type, cost };
                this.elements.selectedTower.textContent = type;
            });
        });
        
        // ÐÐ¾Ð±Ð¸Ð»ÑÐ½ÑÐµ ÐºÐ¾Ð½ÑÑÐ¾Ð»Ñ
        document.getElementById('mobile-next-wave').addEventListener('click', () => this.startNextWave());
        document.getElementById('mobile-upgrade').addEventListener('click', () => this.upgradeSelectedTower());
        document.getElementById('mobile-sell').addEventListener('click', () => this.sellSelectedTower());
    }
    
    connectToPeer() {
        const opponentId = this.elements.peerIdInput.value.trim();
        if (!opponentId) {
            this.addLog('ÐÐ²ÐµÐ´Ð¸ÑÐµ ID Ð¾Ð¿Ð¿Ð¾Ð½ÐµÐ½ÑÐ°', 'error');
            return;
        }
        
        if (opponentId === this.peerId) {
            this.addLog('ÐÐµÐ»ÑÐ·Ñ Ð¿Ð¾Ð´ÐºÐ»ÑÑÐ¸ÑÑÑÑ Ðº ÑÐµÐ±Ðµ', 'error');
            return;
        }
        
        this.connectToPeerId(opponentId);
    }
    
    connectFromModal() {
        const opponentId = this.elements.connectToId.value.trim();
        if (!opponentId) {
            this.addLog('ÐÐ²ÐµÐ´Ð¸ÑÐµ ID Ð¾Ð¿Ð¿Ð¾Ð½ÐµÐ½ÑÐ°', 'error');
            return;
        }
        
        this.connectToPeerId(opponentId);
        this.elements.connectionModal.style.display = 'none';
    }
    
    connectToPeerId(peerId) {
        this.addLog(`ÐÐ¾Ð´ÐºÐ»ÑÑÐ°ÐµÐ¼ÑÑ Ðº ${peerId.substring(0, 8)}...`);
        this.conn = this.peer.connect(peerId);
        this.opponentId = peerId;
        this.isHost = false;
        this.setupConnection();
    }
    
    copyPeerId() {
        if (!this.peerId) return;
        navigator.clipboard.writeText(this.peerId);
        this.addLog('ID ÑÐºÐ¾Ð¿Ð¸ÑÐ¾Ð²Ð°Ð½ Ð² Ð±ÑÑÐµÑ Ð¾Ð±Ð¼ÐµÐ½Ð°');
    }
    
    startGame() {
        if (!this.conn) return;
        
        this.gameState.gameStarted = true;
        this.addLog('ÐÐ³ÑÐ° Ð½Ð°ÑÐ°Ð»Ð°ÑÑ!', 'success');
        this.elements.startGameBtn.disabled = true;
        
        if (this.isHost) {
            this.sendNetworkMessage({ type: 'game_start' });
            this.startNextWave();
        }
    }
    
    generateGameBoard() {
        this.elements.gameBoard.innerHTML = '';
        const rows = 8;
        const cols = 12;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener('click', () => this.placeTower(row, col));
                
                this.elements.gameBoard.appendChild(cell);
            }
        }
    }
    
    generatePath() {
        // ÐÐµÐ½ÐµÑÐ¸ÑÑÐµÐ¼ ÑÐ»ÑÑÐ°Ð¹Ð½ÑÐ¹ Ð¿ÑÑÑ Ð´Ð»Ñ Ð²ÑÐ°Ð³Ð¾Ð²
        this.gameState.path = [
            { row: 0, col: 5 },
            { row: 2, col: 5 },
            { row: 2, col: 8 },
            { row: 5, col: 8 },
            { row: 5, col: 3 },
            { row: 7, col: 3 }
        ];
        
        // ÐÑÐ¼ÐµÑÐ°ÐµÐ¼ Ð¿ÑÑÑ Ð½Ð° Ð¿Ð¾Ð»Ðµ
        this.gameState.path.forEach((pos, index) => {
            const cell = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);
            if (cell) {
                cell.classList.add('path');
                if (index === 0) cell.classList.add('start');
                if (index === this.gameState.path.length - 1) cell.classList.add('end');
            }
        });
    }
    
    placeTower(row, col) {
        if (!this.gameState.gameStarted || !this.gameState.selectedTower) return;
        
        // ÐÑÐ¾Ð²ÐµÑÑÐµÐ¼, Ð¼Ð¾Ð¶Ð½Ð¾ Ð»Ð¸ Ð¿Ð¾ÑÑÐ°Ð²Ð¸ÑÑ Ð±Ð°ÑÐ½Ñ
        const isPath = this.gameState.path.some(pos => pos.row === row && pos.col === col);
        if (isPath) {
            this.addLog('ÐÐµÐ»ÑÐ·Ñ ÑÑÐ°Ð²Ð¸ÑÑ Ð±Ð°ÑÐ½Ñ Ð½Ð° Ð¿ÑÑÐ¸', 'error');
            return;
        }
        
        const existingTower = this.gameState.towers.find(t => t.row === row && t.col === col);
        if (existingTower) {
            this.addLog('ÐÐ´ÐµÑÑ ÑÐ¶Ðµ ÐµÑÑÑ Ð±Ð°ÑÐ½Ñ', 'error');
            return;
        }
        
        if (this.gameState.money < this.gameState.selectedTower.cost) {
            this.addLog('ÐÐµÐ´Ð¾ÑÑÐ°ÑÐ¾ÑÐ½Ð¾ Ð´ÐµÐ½ÐµÐ³', 'error');
            return;
        }
        
        // Ð¡Ð¾Ð·Ð´Ð°ÐµÐ¼ Ð±Ð°ÑÐ½Ñ
        const tower = {
            id: this.towerIdCounter++,
            type: this.gameState.selectedTower.type,
            row,
            col,
            level: 1,
            damage: this.getTowerDamage(this.gameState.selectedTower.type),
            range: this.getTowerRange(this.gameState.selectedTower.type),
            cooldown: 0,
            lastShot: 0,
            splashRadius: this.gameState.selectedTower.type === 'splash' ? 2 : 0,
            slowAmount: this.gameState.selectedTower.type === 'slow' ? 0.5 : 0
        };
        
        this.gameState.towers.push(tower);
        this.gameState.money -= this.gameState.selectedTower.cost;
        this.updateUI();
        
        // ÐÑÐ¾Ð±ÑÐ°Ð¶Ð°ÐµÐ¼ Ð±Ð°ÑÐ½Ñ
        this.renderTower(tower);
        
        // ÐÑÐ¿ÑÐ°Ð²Ð»ÑÐµÐ¼ Ð¾Ð¿Ð¿Ð¾Ð½ÐµÐ½ÑÑ
        this.sendNetworkMessage({
            type: 'place_tower',
            tower: tower
        });
        
        this.addLog(`ÐÐ¾ÑÑÐ°Ð²Ð»ÐµÐ½Ð° ${tower.type} Ð±Ð°ÑÐ½Ñ Ð½Ð° (${row}, ${col})`);
    }
    
    renderTower(tower) {
        const cell = document.querySelector(`.cell[data-row="${tower.row}"][data-col="${tower.col}"]`);
        if (!cell) return;
        
        const towerDiv = document.createElement('div');
        towerDiv.className = 'tower-placed';
        towerDiv.id = `tower-${tower.id}`;
        towerDiv.style.background = this.getTowerColor(tower.type);
        towerDiv.textContent = tower.type.charAt(0).toUpperCase();
        towerDiv.title = `Ð£ÑÐ¾Ð²ÐµÐ½Ñ ${tower.level}\nÐ£ÑÐ¾Ð½: ${tower.damage}`;
        
        cell.appendChild(towerDiv);
        cell.classList.add('tower');
    }
    
    getTowerColor(type) {
        const colors = {
            basic: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
            sniper: 'linear-gradient(135deg, #2196F3 0%, #0D47A1 100%)',
            splash: 'linear-gradient(135deg, #FF9800 0%, #EF6C00 100%)',
            slow: 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)'
        };
        return colors[type] || colors.basic;
    }
    
    getTowerDamage(type) {
        const damages = { basic: 10, sniper: 25, splash: 15, slow: 5 };
        return damages[type] || 10;
    }
    
    getTowerRange(type) {
        const ranges = { basic: 3, sniper: 6, splash: 3, slow: 3 };
        return ranges[type] || 3;
    }
    
    startNextWave() {
        if (!this.gameState.gameStarted) return;
        
        this.gameState.wave++;
        this.elements.wave.textContent = this.gameState.wave;
        
        // Ð¡Ð¾Ð·Ð´Ð°ÐµÐ¼ Ð²ÑÐ°Ð³Ð¾Ð² Ð´Ð»Ñ Ð²Ð¾Ð»Ð½Ñ
        const enemyCount = 5 + this.gameState.wave * 2;
        const enemyTypes = ['basic', 'fast', 'tank'];
        
        for (let i = 0; i < enemyCount; i++) {
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.spawnEnemy(type);
        }
        
        this.addLog(`ÐÐ°ÑÐ¸Ð½Ð°ÐµÑÑÑ Ð²Ð¾Ð»Ð½Ð° ${this.gameState.wave}!`);
        this.updateEnemyPreview();
        
        // ÐÑÐ¿ÑÐ°Ð²Ð»ÑÐµÐ¼ Ð¾Ð¿Ð¿Ð¾Ð½ÐµÐ½ÑÑ
        if (this.isHost) {
            this.sendNetworkMessage({ type: 'next_wave', wave: this.gameState.wave });
        }
    }
    
    spawnEnemy(type) {
        const enemy = {
            id: this.enemyIdCounter++,
            type,
            position: 0,
            row: this.gameState.path[0].row,
            col: this.gameState.path[0].col,
            health: this.getEnemyHealth(type),
            maxHealth: this.getEnemyHealth(type),
            speed: this.getEnemySpeed(type),
            reward: this.getEnemyReward(type)
        };
        
        this.gameState.enemies.push(enemy);
        this.renderEnemy(enemy);
    }
    
    getEnemyHealth(type) {
        const health = { basic: 50, fast: 30, tank: 150 };
        return health[type] || 50;
    }
    
    getEnemySpeed(type) {
        const speeds = { basic: 1, fast: 2, tank: 0.7 };
        return speeds[type] || 1;
    }
    
    getEnemyReward(type) {
        const rewards = { basic: 10, fast: 15, tank: 25 };
        return rewards[type] || 10;
    }
    
    renderEnemy(enemy) {
        const cell = document.querySelector(`.cell[data-row="${enemy.row}"][data-col="${enemy.col}"]`);
        if (!cell) return;
        
        const enemyDiv = document.createElement('div');
        enemyDiv.className = 'enemy';
        enemyDiv.id = `enemy-${enemy.id}`;
        enemyDiv.style.background = this.getEnemyColor(enemy.type);
        enemyDiv.textContent = enemy.type === 'tank' ? 'T' : enemy.type === 'fast' ? 'F' : 'E';
        
        // Health bar
        const healthBar = document.createElement('div');
        healthBar.style.position = 'absolute';
        healthBar.style.bottom = '-5px';
        healthBar.style.left = '5%';
        healthBar.style.width = '90%';
        healthBar.style.height = '3px';
        healthBar.style.background = '#f44336';
        healthBar.style.borderRadius = '2px';
        healthBar.id = `enemy-health-${enemy.id}`;
        
        enemyDiv.appendChild(healthBar);
        cell.appendChild(enemyDiv);
    }
    
    getEnemyColor(type) {
        const colors = {
            basic: 'linear-gradient(135deg, #f44336 0%, #c62828 100%)',
            fast: 'linear-gradient(135deg, #FF9800 0%, #EF6C00 100%)',
            tank: 'linear-gradient(135deg, #795548 0%, #4E342E 100%)'
        };
        return colors[type] || colors.basic;
    }
    
    updateEnemyPreview() {
        this.elements.enemyPreview.innerHTML = '';
        const enemyTypes = ['basic', 'fast', 'tank'];
        
        enemyTypes.forEach(type => {
            const count = Math.floor((5 + this.gameState.wave) / enemyTypes.length);
            for (let i = 0; i < count; i++) {
                const enemyDiv = document.createElement('div');
                enemyDiv.className = 'enemy-preview-item';
                enemyDiv.style.background = this.getEnemyColor(type);
                enemyDiv.textContent = type === 'tank' ? 'T' : type === 'fast' ? 'F' : 'E';
                this.elements.enemyPreview.appendChild(enemyDiv);
            }
        });
    }
    
    gameLoop() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) * this.gameSpeed / 1000;
        this.lastUpdate = now;
        
        if (this.gameState.gameStarted) {
            this.updateEnemies(deltaTime);
            this.updateTowers(deltaTime);
            this.updateBullets(deltaTime);
            this.checkGameOver();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateEnemies(deltaTime) {
        this.gameState.enemies.forEach(enemy => {
            enemy.position += enemy.speed * deltaTime * 0.1;
            
            const pathIndex = Math.floor(enemy.position);
            if (pathIndex < this.gameState.path.length - 1) {
                const currentPos = this.gameState.path[pathIndex];
                const nextPos = this.gameState.path[pathIndex + 1];
                const progress = enemy.position - pathIndex;
                
                enemy.row = currentPos.row + (nextPos.row - currentPos.row) * progress;
                enemy.col = currentPos.col + (nextPos.col - currentPos.col) * progress;
            } else {
                // ÐÑÐ°Ð³ Ð´Ð¾ÑÐµÐ» Ð´Ð¾ ÐºÐ¾Ð½ÑÐ°
                this.gameState.health -= 10;
                this.removeEnemy(enemy.id);
                this.updateUI();
                this.addLog('ÐÑÐ°Ð³ Ð¿ÑÐ¾ÑÐµÐ»! -10 HP', 'error');
                return;
            }
            
            // ÐÐ±Ð½Ð¾Ð²Ð»ÑÐµÐ¼ Ð¿Ð¾Ð·Ð¸ÑÐ¸Ñ Ð½Ð° ÑÐºÑÐ°Ð½Ðµ
            this.updateEnemyPosition(enemy);
        });
    }
    
    updateEnemyPosition(enemy) {
        const enemyDiv = document.getElementById(`enemy-${enemy.id}`);
        if (!enemyDiv) return;
        
        const cell = document.querySelector(`.cell[data-row="${Math.floor(enemy.row)}"][data-col="${Math.floor(enemy.col)}"]`);
        if (!cell) return;
        
        const rect = cell.getBoundingClientRect();
        const boardRect = this.elements.gameBoard.getBoundingClientRect();
        
        const x = (rect.left - boardRect.left + rect.width / 2) + (enemy.col % 1) * rect.width;
        const y = (rect.top - boardRect.top + rect.height / 2) + (enemy.row % 1) * rect.height;
        
        enemyDiv.style.left = `${x - 20}px`;
        enemyDiv.style.top = `${y - 20}px`;
        
        // ÐÐ±Ð½Ð¾Ð²Ð»ÑÐµÐ¼ health bar
        const healthBar = document.getElementById(`enemy-health-${enemy.id}`);
        if (healthBar) {
            const healthPercent = (enemy.health / enemy.maxHealth) * 90;
            healthBar.style.width = `${healthPercent}%`;
        }
    }
    
    updateTowers(deltaTime) {
        this.gameState.towers.forEach(tower => {
            tower.cooldown -= deltaTime;
            if (tower.cooldown <= 0) {
                this.towerAttack(tower);
                tower.cooldown = this.getTowerCooldown(tower.type);
            }
        });
    }
    
    getTowerCooldown(type) {
        const cooldowns = { basic: 1, sniper: 2, splash: 1.5, slow: 0.8 };
        return cooldowns[type] || 1;
    }
    
    towerAttack(tower) {
        // ÐÐ°ÑÐ¾Ð´Ð¸Ð¼ Ð±Ð»Ð¸Ð¶Ð°Ð¹ÑÐµÐ³Ð¾ Ð²ÑÐ°Ð³Ð° Ð² ÑÐ°Ð´Ð¸ÑÑÐµ
        const enemy = this.findEnemyInRange(tower);
        if (!enemy) return;
        
        // Ð¡Ð¾Ð·Ð´Ð°ÐµÐ¼ Ð¿ÑÐ»Ñ
        const bullet = {
            id: this.bulletIdCounter++,
            from: { row: tower.row + 0.5, col: tower.col + 0.5 },
            to: { row: enemy.row, col: enemy.col },
            progress: 0,
            damage: tower.damage,
            towerId: tower.id,
            enemyId: enemy.id,
            splashRadius: tower.splashRadius,
            slowAmount: tower.slowAmount
        };
        
        this.gameState.bullets.push(bullet);
        this.renderBullet(bullet);
    }
    
    findEnemyInRange(tower) {
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        this.gameState.enemies.forEach(enemy => {
            const distance = Math.sqrt(
                Math.pow(enemy.row - tower.row, 2) + Math.pow(enemy.col - tower.col, 2)
            );
            
            if (distance <= tower.range && distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });
        
        return closestEnemy;
    }
    
    renderBullet(bullet) {
        const bulletDiv = document.createElement('div');
        bulletDiv.className = 'bullet';
        bulletDiv.id = `bullet-${bullet.id}`;
        
        if (bullet.splashRadius > 0) {
            bulletDiv.style.background = '#FF9800';
            bulletDiv.style.width = '15px';
            bulletDiv.style.height = '15px';
        }
        
        this.elements.gameBoard.appendChild(bulletDiv);
        this.updateBulletPosition(bullet);
    }
    
    updateBulletPosition(bullet) {
        const bulletDiv = document.getElementById(`bullet-${bullet.id}`);
        if (!bulletDiv) return;
        
        const x = bullet.from.col + (bullet.to.col - bullet.from.col) * bullet.progress;
        const y = bullet.from.row + (bullet.to.row - bullet.from.row) * bullet.progress;
        
        const cell = document.querySelector(`.cell[data-row="${Math.floor(y)}"][data-col="${Math.floor(x)}"]`);
        if (!cell) return;
        
        const rect = cell.getBoundingClientRect();
        const boardRect = this.elements.gameBoard.getBoundingClientRect();
        
        bulletDiv.style.left = `${rect.left - boardRect.left + (x % 1) * rect.width - 5}px`;
        bulletDiv.style.top = `${rect.top - boardRect.top + (y % 1) * rect.height - 5}px`;
    }
    
    updateBullets(deltaTime) {
        this.gameState.bullets.forEach((bullet, index) => {
            bullet.progress += deltaTime * 3;
            this.updateBulletPosition(bullet);
            
            if (bullet.progress >= 1) {
                // ÐÐ¾Ð¿Ð°Ð´Ð°Ð½Ð¸Ðµ
                const enemy = this.gameState.enemies.find(e => e.id === bullet.enemyId);
                if (enemy) {
                    if (bullet.splashRadius > 0) {
                        // Ð¡Ð¿Ð»ÑÑ ÑÑÐ¾Ð½
                        this.gameState.enemies.forEach(e => {
                            const distance = Math.sqrt(
                                Math.pow(e.row - enemy.row, 2) + Math.pow(e.col - enemy.col, 2)
                            );
                            if (distance <= bullet.splashRadius) {
                                e.health -= bullet.damage * (1 - distance / bullet.splashRadius);
                                if (e.health <= 0) {
                                    this.gameState.money += e.reward;
                                    this.removeEnemy(e.id);
                                }
                            }
                        });
                    } else {
                        // ÐÐ´Ð¸Ð½Ð¾ÑÐ½ÑÐ¹ ÑÑÐ¾Ð½
                        enemy.health -= bullet.damage;
                        
                        if (bullet.slowAmount > 0) {
                            enemy.speed *= (1 - bullet.slowAmount);
                        }
                        
                        if (enemy.health <= 0) {
                            this.gameState.money += enemy.reward;
                            this.removeEnemy(enemy.id);
                        }
                    }
                }
                
                // Ð£Ð´Ð°Ð»ÑÐµÐ¼ Ð¿ÑÐ»Ñ
                const bulletDiv = document.getElementById(`bullet-${bullet.id}`);
                if (bulletDiv) bulletDiv.remove();
                this.gameState.bullets.splice(index, 1);
            }
        });
    }
    
    removeEnemy(enemyId) {
        const enemyDiv = document.getElementById(`enemy-${enemyId}`);
        if (enemyDiv) enemyDiv.remove();
        
        const index = this.gameState.enemies.findIndex(e => e.id === enemyId);
        if (index !== -1) {
            this.gameState.enemies.splice(index, 1);
        }
    }
    
    upgradeSelectedTower() {
        // Ð ÐµÐ°Ð»Ð¸Ð·Ð°ÑÐ¸Ñ ÑÐ»ÑÑÑÐµÐ½Ð¸Ñ Ð±Ð°ÑÐ½Ð¸
        this.addLog('Ð¤ÑÐ½ÐºÑÐ¸Ñ ÑÐ»ÑÑÑÐµÐ½Ð¸Ñ Ð² ÑÐ°Ð·ÑÐ°Ð±Ð¾ÑÐºÐµ');
    }
    
    sellSelectedTower() {
        // Ð ÐµÐ°Ð»Ð¸Ð·Ð°ÑÐ¸Ñ Ð¿ÑÐ¾Ð´Ð°Ð¶Ð¸ Ð±Ð°ÑÐ½Ð¸
        this.addLog('Ð¤ÑÐ½ÐºÑÐ¸Ñ Ð¿ÑÐ¾Ð´Ð°Ð¶Ð¸ Ð² ÑÐ°Ð·ÑÐ°Ð±Ð¾ÑÐºÐµ');
    }
    
    setGameSpeed(speed) {
        this.gameSpeed = speed;
        
        // ÐÐ±Ð½Ð¾Ð²Ð»ÑÐµÐ¼ ÐºÐ½Ð¾Ð¿ÐºÐ¸
        document.querySelectorAll('.game-speed button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`speed-${speed}x`).classList.add('active');
    }
    
    checkGameOver() {
        if (this.gameState.health <= 0) {
            this.addLog('ÐÐ³ÑÐ° Ð¾ÐºÐ¾Ð½ÑÐµÐ½Ð°! ÐÑ Ð¿ÑÐ¾Ð¸Ð³ÑÐ°Ð»Ð¸.', 'error');
            this.gameState.gameStarted = false;
        }
    }
    
    updateUI() {
        this.elements.health.textContent = `â¤ï¸ ${this.gameState.health}`;
        this.elements.money.textContent = `ð° ${this.gameState.money}`;
    }
    
    addLog(message, type = 'info') {
        const logEntry = document.createElement('p');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        if (type === 'error') {
            logEntry.style.color = '#f44336';
        } else if (type === 'success') {
            logEntry.style.color = '#4CAF50';
        }
        
        this.elements.gameLog.appendChild(logEntry);
        this.elements.gameLog.scrollTop = this.elements.gameLog.scrollHeight;
    }
    
    sendNetworkMessage(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }
    
    sendGameState() {
        this.sendNetworkMessage({
            type: 'game_state',
            state: this.gameState
        });
    }
    
    handleNetworkData(data) {
        switch (data.type) {
            case 'game_start':
                this.gameState.gameStarted = true;
                this.addLog('Ð¥Ð¾ÑÑ Ð½Ð°ÑÐ°Ð» Ð¸Ð³ÑÑ!', 'success');
                break;
                
            case 'place_tower':
                this.gameState.towers.push(data.tower);
                this.renderTower(data.tower);
                this.addLog(`ÐÐ¿Ð¿Ð¾Ð½ÐµÐ½Ñ Ð¿Ð¾ÑÑÐ°Ð²Ð¸Ð» ${data.tower.type} Ð±Ð°ÑÐ½Ñ`);
                break;
                
            case 'next_wave':
                this.gameState.wave = data.wave;
                this.elements.wave.textContent = data.wave;
                this.addLog(`ÐÐ¾Ð»Ð½Ð° ${data.wave} Ð½Ð°ÑÐ°Ð»Ð°ÑÑ!`);
                break;
                
            case 'game_state':
                // Ð¡Ð¸Ð½ÑÑÐ¾Ð½Ð¸Ð·Ð°ÑÐ¸Ñ ÑÐ¾ÑÑÐ¾ÑÐ½Ð¸Ñ
                Object.assign(this.gameState, data.state);
                this.updateUI();
                break;
        }
    }
}

// ÐÐ½Ð¸ÑÐ¸Ð°Ð»Ð¸Ð·Ð°ÑÐ¸Ñ Ð¸Ð³ÑÑ
window.addEventListener('load', () => {
    new MultiplayerTowerDefense();
});
