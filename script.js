        class SoundEngine {
            constructor() {
                this.ctx = null;
                this.muted = false;
            }

            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            }

            playStep() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const freq = 120 + Math.random() * 40;
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);
                    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.08);
                } catch(e) {}
            }

            playShoot(type = 'tear') {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    if (type === 'bullet') {
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);
                        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                    } else if (type === 'fire') {
                        osc.type = 'square';
                        osc.frequency.setValueAtTime(250, this.ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.15);
                        gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
                    } else {
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.1);
                        gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
                    }
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.12);
                } catch(e) {}
            }

            playDoor() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);
                    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.2);
                } catch(e) {}
            }

            playJoin() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
                    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.25);
                } catch(e) {}
            }

            playBomb() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(42, this.ctx.currentTime + 0.45);
                    gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);
                    osc.connect(gain); gain.connect(this.ctx.destination);
                    osc.start(); osc.stop(this.ctx.currentTime + 0.45);
                } catch(e) {}
            }

            playChat() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
                    osc.frequency.setValueAtTime(660, this.ctx.currentTime + 0.06);
                    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.15);
                } catch(e) {}
            }
        }

        const audio = new SoundEngine();

        // Multiplayer: PeerJS/WebRTC (без Firebase)
        let myPlayerId = 'p_' + Math.random().toString(36).slice(2, 10);
        let currentRoomId = null;
        let peer = null;
        let hostConnection = null;
        let peerConnections = new Map();
        let playerHeartbeat = null;
        let roomJoinBusy = false;
        let isRoomHost = false;
        let peerReady = false;
        const networkProjectileIds = new Set();
        const takenItems = new Set();
        let floatingHits = [];
        let dummyHits = [];
        let itemHudHidden = new Set();
        let allItemsHudHidden = false;
        let dummyDamageTotal = 0;
        let dummyDamageEvents = [];
        let activeBombs = [];
        const explodedBombIds = new Set();


        function loadPeerJS() {
            return new Promise((resolve, reject) => {
                if (window.Peer) return resolve();
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Не удалось загрузить PeerJS'));
                document.head.appendChild(script);
            });
        }

        function sendToConnection(conn, packet) {
            try { if (conn && conn.open) conn.send(packet); } catch (e) {}
        }

        function broadcast(packet, exceptId = null) {
            peerConnections.forEach((conn, id) => {
                if (id !== exceptId) sendToConnection(conn, packet);
            });
        }

        function localPlayerPacket() {
            return {
                type: 'player',
                id: myPlayerId,
                name: String(localPlayer.name || 'Isaac_Hero').slice(0, 12),
                character: localPlayer.character,
                rx: localPlayer.rx, ry: localPlayer.ry,
                x: localPlayer.x, y: localPlayer.y,
                walkTimer: localPlayer.walkTimer,
                isMoving: !!localPlayer.isMoving
            };
        }

        function handlePacket(packet, senderId) {
            if (!packet || typeof packet !== 'object') return;
            if (packet.type === 'player') {
                if (!packet.id || packet.id === myPlayerId) return;
                remotePlayers[packet.id] = packet;
                updatePlayerCount();
                // Host relays the state to the other peers.
                if (isRoomHost) broadcast(packet, senderId);
            } else if (packet.type === 'player_list') {
                (packet.players || []).forEach(p => {
                    if (p && p.id && p.id !== myPlayerId) remotePlayers[p.id] = p;
                });
                updatePlayerCount();
            } else if (packet.type === 'd6_reroll') {
                if(packet.roomKey && packet.items) goldenRoomOverrides.set(packet.roomKey,packet.items);
                if(isRoomHost) broadcast(packet,senderId);
            } else if (packet.type === 'tear') {
                if (packet.projectile && packet.projectile.ownerId !== myPlayerId && packet.projectile.rx === localPlayer.rx && packet.projectile.ry === localPlayer.ry) {
                    const id = packet.projectile.id;
                    if (!networkProjectileIds.has(id)) {
                        networkProjectileIds.add(id);
                        projectiles.push({...packet.projectile, remote: true});
                    }
                }
                if (isRoomHost) broadcast(packet, senderId);
            } else if (packet.type === 'item_taken') {
                if (packet.roomKey && packet.itemId) {
                    takenItems.add(`${packet.roomKey}:${packet.itemId}`);
                    renderItemHud();
                    if (isRoomHost) broadcast(packet, senderId);
                }
            } else if (packet.type === 'item_state') {
                (packet.taken || []).forEach(k => takenItems.add(k));
                renderItemHud();
            } else if (packet.type === 'dummy_hit') {
                const sameRoom = packet.rx === localPlayer.rx && packet.ry === localPlayer.ry;
                if (sameRoom) registerDummyHit(packet.damage || 0, packet.x, packet.y, packet.ownerName || 'Player');
                // Never relay dummy damage into other rooms.
                if (isRoomHost && sameRoom) {
                    peerConnections.forEach((conn, id) => {
                        if (id === senderId) return;
                        const rp = remotePlayers[id];
                        if (rp && rp.rx === packet.rx && rp.ry === packet.ry) sendToConnection(conn, packet);
                    });
                }
            } else if (packet.type === 'bomb') {
                if (packet.bomb && packet.bomb.rx === localPlayer.rx && packet.bomb.ry === localPlayer.ry) {
                    if (!activeBombs.some(b => b.id === packet.bomb.id)) activeBombs.push({...packet.bomb, remote:true});
                }
                if (isRoomHost) broadcast(packet, senderId);
            } else if (packet.type === 'bomb_explode') {
                const b = packet.bomb || packet;
                if (explodedBombIds.has(b.id)) return;
                explodedBombIds.add(b.id);
                if (b.rx === localPlayer.rx && b.ry === localPlayer.ry) {
                    activeBombs = activeBombs.filter(x => x.id !== b.id);
                    audio.playBomb();
                }
                if (isRoomHost) broadcast(packet, senderId);
            } else if (packet.type === 'chat') {
                if (packet.message) {
                    chatLogs.push(packet.message);
                    if (chatLogs.length > 30) chatLogs.shift();
                    renderChatMessages();
                    if (packet.message.senderId !== myPlayerId) audio.playChat();
                    if (isRoomHost) broadcast(packet, senderId);
                }
            } else if (packet.type === 'hello') {
                if (isRoomHost) {
                    sendToConnection(packet.conn || null, {type:'item_state', taken:[...takenItems]});
                }
            }
        }

        function attachConnection(conn) {
            if (!conn) return;
            peerConnections.set(conn.peer, conn);
            conn.on('data', packet => handlePacket(packet, conn.peer));
            conn.on('open', () => {
                sendToConnection(conn, {
                    type: 'player_list',
                    players: Object.values(remotePlayers)
                });
                sendToConnection(conn, { type: 'item_state', taken: [...takenItems] });
                sendToConnection(conn, localPlayerPacket());
                if (isRoomHost) broadcast(localPlayerPacket(), conn.peer);
            });
            conn.on('close', () => {
                peerConnections.delete(conn.peer);
                delete remotePlayers[conn.peer];
                updatePlayerCount();
            });
            conn.on('error', err => console.warn('Peer connection:', err));
        }

        function updatePlayerCount() {
            document.getElementById('uiPlayerCount').innerText = String(Object.keys(remotePlayers).length + 1);
        }

        async function createNetworkRoom(roomId, auto = false) {
            await loadPeerJS();
            const clean = normalizeRoomId(roomId);
            if (!clean) return;
            leaveCurrentRoom();
            roomJoinBusy = true;
            currentRoomId = clean;
            isRoomHost = true;
            saveRoom(clean);
            if (!auto) startScreenGame(clean);

            peer = new Peer(clean, { debug: 0 });
            peer.on('open', id => {
                myPlayerId = id;
                peerReady = true;
                roomJoinBusy = false;
                if (auto) {
                    const btn = document.getElementById('btnCreateRoom');
                    if (btn) btn.innerHTML = '<span>🎮</span> Начать Онлайн Игру';
                }
                showToast(`Комната ${clean} создана`);
                playerHeartbeat = setInterval(() => broadcast(localPlayerPacket()), 80);
            });
            peer.on('connection', conn => attachConnection(conn));
            peer.on('error', err => {
                console.error('Peer host error:', err);
                roomJoinBusy = false;
                showToast('Не удалось создать комнату: ' + (err.type || 'ошибка'));
            });
        }

        async function joinNetworkRoom(roomId, auto = false) {
            await loadPeerJS();
            const clean = normalizeRoomId(roomId);
            if (!clean || roomJoinBusy) return;
            roomJoinBusy = true;
            leaveCurrentRoom();
            currentRoomId = clean;
            isRoomHost = false;
            saveRoom(clean);
            if (!auto) startScreenGame(clean);

            peer = new Peer(undefined, { debug: 0 });
            peer.on('open', id => {
                myPlayerId = id;
                hostConnection = peer.connect(clean, { reliable: true });
                attachConnection(hostConnection);
                hostConnection.on('open', () => {
                    peerReady = true;
                    roomJoinBusy = false;
                    if (auto) {
                        const btn = document.getElementById('btnJoinRoom');
                        if (btn) btn.textContent = 'Начать игру';
                    }
                    showToast(auto ? `Комната ${clean} загружена` : `Подключено к ${clean}`);
                    playerHeartbeat = setInterval(() => sendToConnection(hostConnection, localPlayerPacket()), 80);
                });
                hostConnection.on('close', () => showToast('Хост отключился'));
            });
            peer.on('error', err => {
                console.error('Peer join error:', err);
                roomJoinBusy = false;
                showToast(err.type === 'peer-unavailable' ? 'Комната не найдена' : 'Ошибка подключения');
            });
        }

        function normalizeRoomId(value) {
            return String(value || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 8);
        }

        function generateRoomCode() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            const bytes = new Uint32Array(6);
            if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
            let out = '';
            for (let i = 0; i < 6; i++) out += chars[(bytes[i] || Math.random() * 1e9) % chars.length | 0];
            return out;
        }

        function getRoomFromUrl() {
            return normalizeRoomId(new URLSearchParams(location.search).get('room'));
        }

        function getSavedRoom() {
            try { return normalizeRoomId(localStorage.getItem('isaac_room_code')); }
            catch (e) { return ''; }
        }

        function saveRoom(roomId) {
            const clean = normalizeRoomId(roomId);
            if (!clean) return;
            try { localStorage.setItem('isaac_room_code', clean); } catch (e) {}
            try {
                const url = new URL(location.href);
                url.searchParams.set('room', clean);
                history.replaceState({}, '', url);
            } catch (e) {}
        }

        function getRoomShareLink(roomId) {
            const url = new URL(location.href);
            url.searchParams.set('room', normalizeRoomId(roomId));
            return url.toString();
        }

        async function autoJoinRoom() {
            const fromUrl = getRoomFromUrl();
            const saved = getSavedRoom();
            const roomId = fromUrl || saved;
            document.getElementById('inputRoomId').value = roomId || '';
            localPlayer.name = document.getElementById('inputName').value.trim() || 'Isaac_Hero';
            if (fromUrl) await joinNetworkRoom(fromUrl, true);
            else await createNetworkRoom(generateRoomCode(), true);
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toastMsg');
            toastMsg.innerText = msg;
            toast.classList.remove('opacity-0', 'pointer-events-none');
            toast.classList.add('opacity-100');
            setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0', 'pointer-events-none');
            }, 2500);
        }

        const CHARACTERS = {
            isaac: { id: 'isaac', name: 'Isaac', skin: '#fbcfe8', speed: 215, attackType: 'tear', tearColor: '#60a5fa', desc: 'Розовый • Слёзы под глазами', avatar: '💧' },
            azazel: { id: 'azazel', name: 'Azazel', skin: '#475569', speed: 220, attackType: 'fire', tearColor: '#ef4444', desc: 'Рожки • Крылья • Полёт', avatar: '😈' },
            lost: { id: 'lost', name: 'The Lost', skin: '#f8fafc', speed: 245, attackType: 'tear', tearColor: '#e2e8f0', desc: 'Парящий призрак • Дым вместо ног', avatar: '👻' },
            lilith: { id: 'lilith', name: 'Lilith', skin: '#7f1d1d', speed: 210, attackType: 'tear', tearColor: '#a855f7', desc: 'Инкубус следует за ней', avatar: '🩸' }
        };

        const ROOM_WIDTH = 800;
        const ROOM_HEIGHT = 500;
        const WALL_THICKNESS = 40;
        const DOOR_SIZE = 100;

        const ROOM_THEMES = {
            basement: { name: 'Basement', floor: '#221b19', grid: '#181211', wall: '#3a302c', border: '#171210', obstacleRock: '#524640', label: '🏚️ Подвал' },
            cellar: { name: 'Cellar', floor: '#1a2228', grid: '#12181d', wall: '#2a3842', border: '#0d1318', obstacleRock: '#435866', label: '🪨 Погреб' },
            burningBasement: { name: 'Burning Basement', floor: '#2d140e', grid: '#1e0c08', wall: '#4a1f16', border: '#1a0805', obstacleRock: '#733123', label: '🔥 Горящий Подвал' },
            cathedral: { name: 'Cathedral', floor: '#2a333d', grid: '#1f2730', wall: '#4b5b6d', border: '#e2e8f0', obstacleRock: '#94a3b8', label: '🏛️ Собор' },
            sheol: { name: 'Sheol', floor: '#140c10', grid: '#0a0508', wall: '#2e121e', border: '#991b1b', obstacleRock: '#581c27', label: '🌋 Преисподняя (Sheol)' },
            greed: { name: 'Greed Room', floor: '#282310', grid: '#1a170a', wall: '#4a3f18', border: '#facc15', obstacleRock: '#857022', label: '💰 Сокровищница (Greed)' },
            chest: { name: 'The Chest', floor: '#302612', grid: '#1d170b', wall: '#54421d', border: '#fbbf24', obstacleRock: '#927230', label: '📦 Сундук (Chest)' },
            devil: { name: 'Devil Room', floor: '#1a0505', grid: '#100202', wall: '#3d0a0a', border: '#dc2626', obstacleRock: '#6b1111', label: '😈 Комната Дьявола' }
        };

        // Infinite deterministic room graph: a guaranteed branching tree + occasional side links.
        function roomHash(rx, ry) {
            const n = Math.sin(rx * 127.1 + ry * 311.7) * 43758.5453;
            return Math.abs(n - Math.floor(n));
        }
        function roomParent(rx, ry) {
            if (rx === 0 && ry === 0) return null;
            if (rx === 0) return { rx: 0, ry: ry - Math.sign(ry) };
            if (ry === 0) return { rx: rx - Math.sign(rx), ry: 0 };
            const h = roomHash(rx, ry);
            return h < 0.5
                ? { rx: rx - Math.sign(rx), ry }
                : { rx, ry: ry - Math.sign(ry) };
        }
        function edgeHash(rx1, ry1, rx2, ry2) {
            const a = `${rx1},${ry1}`, b = `${rx2},${ry2}`;
            const first = a < b ? a : b, second = a < b ? b : a;
            let h = 2166136261;
            for (const ch of first + '|' + second) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
            return (h >>> 0) / 4294967296;
        }
        function hasRoomDoor(rx, ry, dir) {
            const nx = rx + dir.x, ny = ry + dir.y;
            const np = roomParent(nx, ny);
            if (np && np.rx === rx && np.ry === ry) return true;
            const p = roomParent(rx, ry);
            if (p && p.rx === nx && p.ry === ny) return true;
            // Extra side links create real forks/loops without a finite map.
            if (edgeHash(rx, ry, nx, ny) < 0.14) return true;
            return false;
        }
        const ROOM_DIRS = {
            up:{x:0,y:1}, down:{x:0,y:-1}, left:{x:-1,y:0}, right:{x:1,y:0}
        };

        function getRoomTheme(rx, ry) {
            if (rx === 0 && ry === 0) return ROOM_THEMES.basement;
            const h = Math.abs(rx * 31 + ry * 17);
            const mod = h % 8;
            switch (mod) {
                case 0: return ROOM_THEMES.basement;
                case 1: return ROOM_THEMES.cellar;
                case 2: return ROOM_THEMES.burningBasement;
                case 3: return ROOM_THEMES.cathedral;
                case 4: return ROOM_THEMES.sheol;
                case 5: return ROOM_THEMES.greed;
                case 6: return ROOM_THEMES.chest;
                case 7: return ROOM_THEMES.devil;
                default: return ROOM_THEMES.basement;
            }
        }

        const TEMPLATES = [
            [],
            [
                { x: 200, y: 150, w: 50, h: 50, type: 'rock' },
                { x: 600, y: 150, w: 50, h: 50, type: 'rock' },
                { x: 200, y: 350, w: 50, h: 50, type: 'rock' },
                { x: 600, y: 350, w: 50, h: 50, type: 'rock' }
            ],
            [
                { x: 400, y: 250, w: 60, h: 60, type: 'rock' },
                { x: 400, y: 170, w: 50, h: 50, type: 'rock' },
                { x: 400, y: 330, w: 50, h: 50, type: 'rock' },
                { x: 320, y: 250, w: 50, h: 50, type: 'rock' },
                { x: 480, y: 250, w: 50, h: 50, type: 'rock' }
            ],
            [
                { x: 300, y: 180, w: 45, h: 45, type: 'rock' },
                { x: 500, y: 180, w: 45, h: 45, type: 'rock' },
                { x: 300, y: 320, w: 45, h: 45, type: 'rock' },
                { x: 500, y: 320, w: 45, h: 45, type: 'rock' },
                { x: 400, y: 250, w: 40, h: 40, type: 'pillar' }
            ],
            [
                { x: 180, y: 120, w: 40, h: 40, type: 'spike' },
                { x: 620, y: 120, w: 40, h: 40, type: 'spike' },
                { x: 180, y: 380, w: 40, h: 40, type: 'spike' },
                { x: 620, y: 380, w: 40, h: 40, type: 'spike' },
                { x: 400, y: 250, w: 50, h: 50, type: 'rock' }
            ],
            [
                { x: 280, y: 200, w: 55, h: 100, type: 'rock' },
                { x: 520, y: 200, w: 55, h: 100, type: 'rock' },
                { x: 400, y: 150, w: 40, h: 40, type: 'chest' }
            ]
        ];

        let localPlayer = {
            name: 'Isaac_Hero',
            character: 'isaac',
            speed: 215,
            rx: 0,
            ry: 0,
            x: ROOM_WIDTH / 2,
            y: ROOM_HEIGHT / 2,
            radius: 18,
            walkTimer: 0,
            isMoving: false,
            lastShootTime: 0,
            stats: { damage: 3.5, tears: 2.5, speed: 1, range: 1, shotSpeed: 1, luck: 0 }
        };

        let activeCheats = new Set();
        let keys = { w: false, a: false, s: false, d: false };
        let mobileDir = { x: 0, y: 0 };
        let mobileShoot = { x: 0, y: 0 };
        let lastHeldShot = 0;
        let projectiles = [];
        let remotePlayers = {};
        let visitedRooms = new Set(["0,0"]);
        let chatLogs = [];
        let d6Charges = 6;
        const goldenRoomOverrides = new Map();

        let isChatVisible = true;
        const chatBox = document.getElementById('chatBoxContainer');
        const btnToggleChat = document.getElementById('btnToggleChat');
        const btnCloseChat = document.getElementById('btnCloseChat');

        function setChatVisibility(visible) {
            isChatVisible = visible;
            if (visible) {
                chatBox.classList.remove('hidden');
                document.getElementById('btnToggleChatText').innerText = 'Скрыть чат';
            } else {
                chatBox.classList.add('hidden');
                document.getElementById('btnToggleChatText').innerText = 'Чат';
            }
        }

        btnToggleChat.addEventListener('click', () => setChatVisibility(!isChatVisible));
        btnCloseChat.addEventListener('click', () => setChatVisibility(false));

        if (window.innerWidth < 640) {
            setChatVisibility(false);
        }

        function buildCharacterSelector() {
            const grid = document.getElementById('charSelectorGrid');
            grid.innerHTML = '';

            Object.values(CHARACTERS).forEach(char => {
                const card = document.createElement('div');
                card.className = `char-card p-2.5 flex flex-col items-center justify-center gap-1 text-center ${localPlayer.character === char.id ? 'selected' : ''}`;
                card.dataset.char = char.id;

                card.innerHTML = `
                    <div class="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center shadow text-lg" style="background-color: ${char.skin}">
                        <span>${char.avatar}</span>
                    </div>
                    <span class="text-xs font-bold text-neutral-200 leading-tight">${char.name}</span>
                    <span class="text-[9px] text-amber-400 font-mono">${char.desc}</span>
                `;

                card.addEventListener('click', () => {
                    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    localPlayer.character = char.id;
                    localPlayer.speed = char.speed;
                    document.getElementById('selectedCharTitle').innerText = char.name;
                    renderActiveButton();
                });

                grid.appendChild(card);
            });
        }

        buildCharacterSelector();

        function renderActiveButton(){
            const visible = localPlayer.character === 'isaac';
            ['btnActive','mobileActive'].forEach(id=>{
                const b=document.getElementById(id); if(!b) return;
                b.classList.toggle('hidden', !visible);
                if(visible) b.innerHTML = `🎲 D6 <span>${d6Charges}/6</span>`;
            });
        }

        function useD6(){
            if(localPlayer.character !== 'isaac') return;
            if(d6Charges < 6){ showToast(`D6: ${d6Charges}/6`); return; }
            if(!isGoldenRoom(localPlayer.rx, localPlayer.ry)){ showToast('D6 работает в золотой комнате'); return; }
            const key = `${localPlayer.rx},${localPlayer.ry}`;
            const items = getGoldenItems(localPlayer.rx,localPlayer.ry).map((it,i)=>{
                if(it.type !== 'item' || itemTaken(key,it.itemId)) return it;
                const pool=ITEM_POOL.filter(x=>x.id!==it.id);
                return {...pool[(i*3+Math.floor(coordHash(localPlayer.rx+i+17,localPlayer.ry-i-11)*pool.length))%pool.length],itemId:it.itemId,type:'item',x:it.x,y:it.y};
            });
            goldenRoomOverrides.set(key,items);
            d6Charges=0; renderActiveButton();
            const packet={type:'d6_reroll',roomKey:key,items};
            if(isRoomHost) broadcast(packet); else sendToConnection(hostConnection,packet);
            showToast('🎲 D6: предметы перероллены');
        }
        document.getElementById('btnActive')?.addEventListener('click',()=>{audio.init();useD6();});
        document.getElementById('mobileActive')?.addEventListener('click',()=>{audio.init();useD6();});

        const patchModal = document.getElementById('patchNotesModal');
        const patchOpen = document.getElementById('btnPatchNotes');
        const patchClose = document.getElementById('btnClosePatchNotes');
        if (patchOpen && patchModal) patchOpen.addEventListener('click', () => {
            patchModal.classList.remove('hidden');
            patchModal.classList.add('flex');
        });
        if (patchClose && patchModal) patchClose.addEventListener('click', () => {
            patchModal.classList.add('hidden');
            patchModal.classList.remove('flex');
        });
        if (patchModal) patchModal.addEventListener('click', (e) => {
            if (e.target === patchModal) {
                patchModal.classList.add('hidden');
                patchModal.classList.remove('flex');
            }
        });

        document.getElementById('btnMute').addEventListener('click', () => {
            audio.muted = !audio.muted;
            document.getElementById('btnMute').innerText = audio.muted ? '🔇 Звук: Выкл' : '🔊 Звук: Вкл';
        });

        document.getElementById('btnLeaveGame').addEventListener('click', () => {
            leaveCurrentRoom();
            document.getElementById('screenGame').classList.add('hidden');
            document.getElementById('screenGame').classList.remove('flex');
            document.getElementById('screenLobby').classList.remove('hidden');
        });

        document.getElementById('btnCopyRoom').addEventListener('click', () => {
            if (!currentRoomId) return;
            const temp = document.createElement('textarea');
            temp.value = getRoomShareLink(currentRoomId);
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showToast('Ссылка на комнату скопирована!');
        });

        function leaveCurrentRoom() {
            if (playerHeartbeat) {
                clearInterval(playerHeartbeat);
                playerHeartbeat = null;
            }
            peerConnections.forEach(conn => { try { conn.close(); } catch (e) {} });
            peerConnections.clear();
            if (hostConnection) { try { hostConnection.close(); } catch (e) {} }
            hostConnection = null;
            if (peer) { try { peer.destroy(); } catch (e) {} }
            peer = null;
            peerReady = false;
            isRoomHost = false;
            currentRoomId = null;
            remotePlayers = {};
            chatLogs = [];
            projectiles = [];
            networkProjectileIds.clear();
            takenItems.clear();
            goldenRoomOverrides.clear();
            d6Charges = 6;
            inventory = {coins:0,keys:0,bombs:0};
            localPlayer.stats = { damage:3.5, tears:2.5, speed:1, range:1, shotSpeed:1, luck:0 };
            renderItemHud();
            renderChatMessages();
            updatePlayerCount();
        }

        document.getElementById('btnPlaySolo').addEventListener('click', () => {
            audio.init();
            localPlayer.name = document.getElementById('inputName').value.trim() || "Isaac_Hero";
            leaveCurrentRoom();
            startScreenGame(null);
            showToast('Одиночный режим запущен');
        });

        document.getElementById('btnCreateRoom').addEventListener('click', async () => {
            audio.init();
            localPlayer.name = document.getElementById('inputName').value.trim() || 'Isaac_Hero';
            const roomId = normalizeRoomId(document.getElementById('inputRoomId').value);
            if (isRoomHost && currentRoomId && roomId === currentRoomId && peerReady) {
                startScreenGame(currentRoomId);
                return;
            }
            await createNetworkRoom(roomId || generateRoomCode());
        });

        document.getElementById('btnJoinRoom').addEventListener('click', async () => {
            audio.init();
            localPlayer.name = document.getElementById('inputName').value.trim() || 'Isaac_Hero';
            const roomId = normalizeRoomId(document.getElementById('inputRoomId').value);
            if (!roomId) return showToast('Введите код комнаты!');
            if (currentRoomId === roomId && peerReady && !isRoomHost) {
                startScreenGame(currentRoomId);
                return;
            }
            await joinNetworkRoom(roomId);
        });

        async function addChatMessage(sender, text, type = 'user') {
            const cleanText = String(text || '').trim().slice(0, 60);
            if (!cleanText) return;
            const message = {
                id: Math.random().toString(36).slice(2),
                senderId: type === 'user' ? myPlayerId : 'sys',
                senderName: String(sender || 'Player').slice(0, 12),
                text: cleanText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type
            };
            chatLogs.push(message);
            if (chatLogs.length > 30) chatLogs.shift();
            renderChatMessages();
            if (type === 'user') broadcast({ type: 'chat', message });
        }

        function renderChatMessages() {
            const container = document.getElementById('chatMessages');
            container.innerHTML = '';
            if (chatLogs.length === 0) {
                container.innerHTML = '<div class="text-[10px] text-neutral-400 italic">Добро пожаловать в онлайн чат!</div>';
                return;
            }
            chatLogs.forEach(msg => {
                const div = document.createElement('div');
                div.className = "flex flex-col text-[11px] leading-tight";
                if (msg.type === 'system') {
                    div.innerHTML = `<span class="text-amber-400/80 font-mono text-[9px]">[${msg.time}] ⚙️ ${msg.text}</span>`;
                } else {
                    const isMe = msg.senderId === myPlayerId;
                    const nameColor = isMe ? 'text-amber-300' : 'text-sky-300';
                    const nameSpan = document.createElement('span');
                    nameSpan.className = `${nameColor} font-bold`;
                    nameSpan.textContent = `${msg.senderName || 'Player'}:`;

                    const textSpan = document.createElement('span');
                    textSpan.className = 'text-neutral-200 break-words';
                    textSpan.textContent = msg.text || '';

                    const row = document.createElement('div');
                    row.className = 'flex items-center gap-1';
                    row.append(nameSpan, textSpan);
                    div.appendChild(row);
                }
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        }

        document.getElementById('chatForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            const val = input.value.trim();
            if (val) {
                addChatMessage(localPlayer.name, val, 'user');
                input.value = '';
                audio.playChat();
            }
        });

        document.querySelectorAll('.quick-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const txt = btn.innerText.includes('Я здесь') ? `Я здесь! 📍 ${isGoldenRoom(localPlayer.rx,localPlayer.ry)?'Золотая комната':getRoomTheme(localPlayer.rx,localPlayer.ry).label} (${localPlayer.rx}, ${localPlayer.ry})` : btn.innerText;
                addChatMessage(localPlayer.name, txt, 'user');
                audio.playChat();
            });
        });

        function startScreenGame(roomId) {
            localPlayer.rx = 0;
            localPlayer.ry = 0;
            localPlayer.x = ROOM_WIDTH / 2;
            localPlayer.y = ROOM_HEIGHT / 2;
            visitedRooms = new Set(["0,0"]);
            d6Charges = localPlayer.character === 'isaac' ? 6 : 0;
            goldenRoomOverrides.clear();
            inventory = {coins:localPlayer.character==='lost'?1:0,keys:0,bombs:localPlayer.character==='isaac'?1:0};
            lilithCompanion.ready=false; lilithFollowDir={x:-1,y:0};
            projectiles = [];
            activeBombs = [];
            renderItemHud();

            document.getElementById('screenLobby').classList.add('hidden');
            document.getElementById('screenGame').classList.remove('hidden');
            document.getElementById('screenGame').classList.add('flex');

            const roomBadge = document.getElementById('uiRoomCode');
            const copyBtn = document.getElementById('btnCopyRoom');

            if (roomId) {
                roomBadge.innerText = roomId;
                copyBtn.classList.remove('hidden');
            } else {
                roomBadge.innerText = "SOLO";
                copyBtn.classList.add('hidden');
                document.getElementById('uiPlayerCount').innerText = "1";
            }

            const charInfo = CHARACTERS[localPlayer.character] || CHARACTERS.isaac;
            document.getElementById('uiCharTitle').innerText = charInfo.name;
            document.getElementById('uiCoord').innerText = '(0, 0)';

            initCanvas();
        }

        window.addEventListener('keydown', (e) => {
            if (document.activeElement === document.getElementById('chatInput')) return;
            const k = e.key;
            if (k === 'w' || k === 'W') keys.w = true;
            if (k === 'a' || k === 'A') keys.a = true;
            if (k === 's' || k === 'S') keys.s = true;
            if (k === 'd' || k === 'D') keys.d = true;
            if (k === 'ArrowUp') { keys.arrowUp = true; e.preventDefault(); }
            if (k === 'ArrowDown') { keys.arrowDown = true; e.preventDefault(); }
            if (k === 'ArrowLeft') { keys.arrowLeft = true; e.preventDefault(); }
            if (k === 'ArrowRight') { keys.arrowRight = true; e.preventDefault(); }
            if (k === ' '){ e.preventDefault(); useD6(); }
            if (k === 'e' || k === 'E') { e.preventDefault(); placeBomb(); }
        });

        window.addEventListener('keyup', (e) => {
            const k = e.key;
            if (k === 'w' || k === 'W') keys.w = false;
            if (k === 'a' || k === 'A') keys.a = false;
            if (k === 's' || k === 'S') keys.s = false;
            if (k === 'd' || k === 'D') keys.d = false;
            if (k === 'ArrowUp') keys.arrowUp = false;
            if (k === 'ArrowDown') keys.arrowDown = false;
            if (k === 'ArrowLeft') keys.arrowLeft = false;
            if (k === 'ArrowRight') keys.arrowRight = false;
        });

        const bindDpad = (id, dx, dy) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const start = e => {
                e.preventDefault();
                audio.init();
                mobileDir.x = dx;
                mobileDir.y = dy;
                try { btn.setPointerCapture(e.pointerId); } catch (err) {}
            };
            const end = e => {
                e.preventDefault();
                mobileDir.x = 0;
                mobileDir.y = 0;
            };

            btn.addEventListener('pointerdown', start, { passive: false });
            btn.addEventListener('pointerup', end, { passive: false });
            btn.addEventListener('pointercancel', end, { passive: false });
            btn.addEventListener('pointerleave', end, { passive: false });
            btn.addEventListener('contextmenu', e => e.preventDefault());
        };

        bindDpad('btnUp', 0, -1);
        bindDpad('btnDown', 0, 1);
        bindDpad('btnLeft', -1, 0);
        bindDpad('btnRight', 1, 0);

        const bindShooter = (id, sx, sy) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const start = e => {
                e.preventDefault();
                audio.init();
                mobileShoot.x = sx;
                mobileShoot.y = sy;
                try { btn.setPointerCapture(e.pointerId); } catch (err) {}
                shootProjectile(sx, sy);
            };
            const end = e => {
                e.preventDefault();
                mobileShoot.x = 0;
                mobileShoot.y = 0;
            };
            btn.addEventListener('pointerdown', start, { passive:false });
            btn.addEventListener('pointerup', end, { passive:false });
            btn.addEventListener('pointercancel', end, { passive:false });
            btn.addEventListener('contextmenu', e => e.preventDefault());
        };

        bindShooter('btnShootUp', 0, -1);
        bindShooter('btnShootDown', 0, 1);
        bindShooter('btnShootLeft', -1, 0);
        bindShooter('btnShootRight', 1, 0);

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const mapCanvas = document.getElementById('minimapCanvas');
        const mapCtx = mapCanvas.getContext('2d');

        let lastTime = performance.now();
        let gameStarted = false;

        function initCanvas() {
            resizeCanvas();
            if (gameStarted) return;
            gameStarted = true;
            window.addEventListener('resize', resizeCanvas);
            requestAnimationFrame(gameLoop);
        }

        function resizeCanvas() {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }
        }

        const ITEM_POOL = [
            { id:'sad_onion', name:'Sad Onion', icon:'🧅', desc:'Слёзы становятся заметно быстрее.', stats:{tears:+0.55} },
            { id:'magic_mushroom', name:'Magic Mushroom', icon:'🍄', desc:'Большой универсальный буст.', stats:{damage:+0.9,speed:+12,range:+35,shotSpeed:+0.05} },
            { id:'pentagram', name:'Pentagram', icon:'✦', desc:'Сильнее слёзы, без лишней скорости.', stats:{damage:+1.15} },
            { id:'lucky_foot', name:'Lucky Foot', icon:'🍀', desc:'Немного удачи.', stats:{luck:+2} },
            { id:'growth_hormones', name:'Growth Hormones', icon:'🧪', desc:'Быстрее двигаешься и стреляешь.', stats:{speed:+18,shotSpeed:+0.08} },
            { id:'cricket_head', name:"Cricket's Head", icon:'🐛', desc:'Очень сильный урон, но чуть медленнее выстрел.', stats:{damage:+1.35,shotSpeed:-0.08} },
            { id:'inner_eye', name:'The Inner Eye', icon:'👁️', desc:'Больше слёз за раз, но слабее каждая.', stats:{tears:+0.8,damage:-0.35} },
            { id:'rotten_baby', name:'Rotten Baby', icon:'🪰', desc:'Маленький бонус к урону и дальности.', stats:{damage:+0.45,range:+20} }
        ];

        const PICKUP_POOL = [
            { id:'coin', name:'Монетка', icon:'🪙', desc:'+1 монета', kind:'coin' },
            { id:'key', name:'Ключ', icon:'🔑', desc:'+1 ключ', kind:'key' },
            { id:'bomb', name:'Бомба', icon:'💣', desc:'+1 бомба', kind:'bomb' }
        ];

        let inventory = { coins:0, keys:0, bombs:0 };

        function coordHash(rx, ry) {
            const n = Math.sin((rx + 41) * 127.1 + (ry + 17) * 311.7) * 43758.5453123;
            return Math.abs(n - Math.floor(n));
        }

        function isGoldenRoom(rx, ry) {
            if (rx === 0 && ry === 0) return false;
            return coordHash(rx, ry) > 0.925;
        }

        function isKeeperRoom(rx, ry) {
            if (isGoldenRoom(rx, ry) || (rx === 0 && ry === 0)) return false;
            return coordHash(rx + 9, ry - 4) > 0.91;
        }

        function getGoldenItems(rx, ry) {
            const h = Math.floor(coordHash(rx, ry) * 1000000);
            const count = 2 + (h % 2);
            const items = [];
            const slots = [
                {x:280,y:205},{x:400,y:170},{x:520,y:205}
            ];
            for (let i=0;i<count;i++) {
                const isPickup = ((h >> (i+2)) % 100) < 28;
                if (isPickup) {
                    const pick = PICKUP_POOL[(h + i * 7) % PICKUP_POOL.length];
                    items.push({ itemId:`p${i}`, type:'pickup', ...pick, x:slots[i].x, y:slots[i].y });
                } else {
                    const item = ITEM_POOL[(h + i * 11) % ITEM_POOL.length];
                    items.push({ itemId:`i${i}`, type:'item', ...item, x:slots[i].x, y:slots[i].y });
                }
            }
            return items;
        }

        function goldenRoomItems() {
            if(!isGoldenRoom(localPlayer.rx,localPlayer.ry)) return [];
            return goldenRoomOverrides.get(`${localPlayer.rx},${localPlayer.ry}`) || getGoldenItems(localPlayer.rx,localPlayer.ry);
        }

        function itemTaken(roomKey, itemId) {
            return takenItems.has(`${roomKey}:${itemId}`);
        }

        function roomKey() { return `${localPlayer.rx},${localPlayer.ry}`; }

        function applyItem(item) {
            if (item.type === 'pickup') {
                if (item.kind === 'coin') inventory.coins++;
                if (item.kind === 'key') inventory.keys++;
                if (item.kind === 'bomb') inventory.bombs++;
                showToast(`${item.icon} ${item.name}`);
                return;
            }
            const before = {...localPlayer.stats};
            Object.entries(item.stats || {}).forEach(([k,v]) => {
                if (typeof localPlayer.stats[k] === 'number') localPlayer.stats[k] += v;
            });
            localPlayer.stats.damage = Math.max(1.5, Math.min(8, localPlayer.stats.damage));
            localPlayer.stats.tears = Math.max(1.5, Math.min(4.8, localPlayer.stats.tears));
            localPlayer.stats.speed = Math.max(0.8, Math.min(1.35, localPlayer.stats.speed));
            localPlayer.stats.range = Math.max(0.7, Math.min(1.8, localPlayer.stats.range));
            localPlayer.stats.shotSpeed = Math.max(0.7, Math.min(1.35, localPlayer.stats.shotSpeed));
            showToast(`${item.icon} ${item.name}: ${item.desc}`);
            renderItemHud();
        }

        function collectNearbyItem() {
            const items = goldenRoomItems();
            if (!items.length) return;
            const key = roomKey();
            for (const item of items) {
                if (itemTaken(key,item.itemId)) continue;
                const d = Math.hypot(localPlayer.x-item.x, localPlayer.y-item.y);
                if (d < 42) {
                    takenItems.add(`${key}:${item.itemId}`);
                    applyItem(item);
                    const packet = {type:'item_taken', roomKey:key, itemId:item.itemId};
                    if (isRoomHost) broadcast(packet); else sendToConnection(hostConnection, packet);
                    renderItemHud();
                    break;
                }
            }
        }

        function renderItemHud() {
            const hud = document.getElementById('itemHud');
            const list = document.getElementById('itemHudList');
            if (!hud || !list) return;
            hud.classList.toggle('hidden', allItemsHudHidden);
            list.innerHTML = '';
            const entries = [
                ['damage','⚔️ Урон',localPlayer.stats.damage.toFixed(1)],
                ['tears','💧 Слёзы',localPlayer.stats.tears.toFixed(1)],
                ['speed','👟 Скорость',localPlayer.stats.speed.toFixed(2)],
                ['range','📏 Дальность',localPlayer.stats.range.toFixed(2)],
                ['shotSpeed','⚡ Скорость слезы',localPlayer.stats.shotSpeed.toFixed(2)],
                ['luck','🍀 Удача',localPlayer.stats.luck]
            ];
            entries.forEach(([id,label,val]) => {
                if (itemHudHidden.has(id)) return;
                const row=document.createElement('div'); row.className='item-stat';
                row.innerHTML=`<span>${label}</span><b>${val}</b>`; list.appendChild(row);
            });
            const inv=document.createElement('div'); inv.className='item-inventory';
            inv.textContent=`🪙 ${inventory.coins}  🔑 ${inventory.keys}  💣 ${inventory.bombs}`;
            list.appendChild(inv);
            const bombCount = document.getElementById('uiBombCount');
            if (bombCount) bombCount.textContent = inventory.bombs;
        }

        function setupItemMenu() {
            const toggle = document.getElementById('btnToggleItems');
            const menu = document.getElementById('itemMenu');
            const all = document.getElementById('btnHideAllItems');
            if (toggle) toggle.addEventListener('click', () => menu.classList.toggle('hidden'));
            if (all) all.addEventListener('click', () => {
                allItemsHudHidden = !allItemsHudHidden;
                all.textContent = allItemsHudHidden ? 'Показать HUD' : 'Скрыть HUD';
                renderItemHud();
            });
            document.querySelectorAll('[data-stat]').forEach(btn => btn.addEventListener('click', () => {
                const id = btn.dataset.stat;
                if (itemHudHidden.has(id)) itemHudHidden.delete(id);
                else itemHudHidden.add(id);
                renderItemHud();
            }));
            renderItemHud();
        }

        document.getElementById('btnBomb')?.addEventListener('click', () => { audio.init(); placeBomb(); });

        // PeerJS запускаем только после инициализации localPlayer и HUD.
        autoJoinRoom().catch(err => {
            console.error(err);
            showToast(err.message || 'Ошибка запуска онлайн');
        });

        function renderItemDescription() {
            const box=document.getElementById('itemDescription');
            if(!box) return;
            const item=goldenRoomItems().find(it=>!itemTaken(roomKey(),it.itemId) && Math.hypot(localPlayer.x-it.x,localPlayer.y-it.y)<90);
            if(!item){ box.classList.add('hidden'); return; }
            box.classList.remove('hidden');
            box.innerHTML=`<b>${item.icon} ${item.name}</b><br><span>${item.desc}</span><br><small>Подойди ближе, чтобы взять</small>`;
        }

        function registerDummyHit(damage,x,y,ownerName='Player') {
            if (!isKeeperRoom(localPlayer.rx,localPlayer.ry)) return;
            const n=Math.max(0,Number(damage)||0);
            dummyDamageTotal += n;
            dummyDamageEvents.push({t:performance.now(),damage:n});
            floatingHits.push({x:x||400,y:y||290,text:`-${n.toFixed(1)}`,life:0.8});
        }

        function dummyDps() {
            const now=performance.now();
            dummyDamageEvents=dummyDamageEvents.filter(e=>now-e.t<2000);
            return dummyDamageEvents.reduce((a,e)=>a+e.damage,0)/2;
        }

        function drawGoldenRoom(items) {
            ctx.save();
            const gold='#f7c948', cream='#fff3b0';
            ctx.fillStyle='rgba(90,58,7,.72)'; ctx.fillRect(WALL_THICKNESS,WALL_THICKNESS,ROOM_WIDTH-WALL_THICKNESS*2,ROOM_HEIGHT-WALL_THICKNESS*2);
            ctx.fillStyle='rgba(255,220,90,.10)'; ctx.fillRect(40,40,ROOM_WIDTH-80,ROOM_HEIGHT-80);
            ctx.strokeStyle='rgba(255,235,150,.16)'; ctx.lineWidth=2;
            for(let x=40;x<ROOM_WIDTH-40;x+=50) for(let y=40;y<ROOM_HEIGHT-40;y+=50) ctx.strokeRect(x,y,50,50);
            ctx.strokeStyle='#f7c948';ctx.lineWidth=7;ctx.strokeRect(48,48,ROOM_WIDTH-96,ROOM_HEIGHT-96);ctx.strokeStyle='rgba(255,245,190,.75)';ctx.lineWidth=2;ctx.strokeRect(60,60,ROOM_WIDTH-120,ROOM_HEIGHT-120);const doors={up:hasRoomDoor(localPlayer.rx,localPlayer.ry,ROOM_DIRS.up),down:hasRoomDoor(localPlayer.rx,localPlayer.ry,ROOM_DIRS.down),left:hasRoomDoor(localPlayer.rx,localPlayer.ry,ROOM_DIRS.left),right:hasRoomDoor(localPlayer.rx,localPlayer.ry,ROOM_DIRS.right)};ctx.fillStyle='#f7c948';if(doors.up)ctx.fillRect(ROOM_WIDTH/2-DOOR_SIZE/2,40,DOOR_SIZE,8);if(doors.down)ctx.fillRect(ROOM_WIDTH/2-DOOR_SIZE/2,ROOM_HEIGHT-48,DOOR_SIZE,8);if(doors.left)ctx.fillRect(40,ROOM_HEIGHT/2-DOOR_SIZE/2,8,DOOR_SIZE);if(doors.right)ctx.fillRect(ROOM_WIDTH-48,ROOM_HEIGHT/2-DOOR_SIZE/2,8,DOOR_SIZE);
            items.forEach(item=>{
                ctx.save();
                const glow=ctx.createRadialGradient(item.x,item.y,2,item.x,item.y,55); glow.addColorStop(0,'rgba(255,220,80,.3)'); glow.addColorStop(1,'rgba(255,220,80,0)');
                ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(item.x,item.y,55,0,Math.PI*2); ctx.fill();
                if(item.type==='item'){
                    ctx.fillStyle='#21170a'; ctx.strokeStyle='#050403'; ctx.lineWidth=5; ctx.fillRect(item.x-30,item.y+12,60,14); ctx.strokeRect(item.x-30,item.y+12,60,14);
                    ctx.fillStyle='#8c6a25'; ctx.fillRect(item.x-5,item.y-20,10,34);
                    ctx.fillStyle=gold; ctx.strokeStyle='#fff1a8'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(item.x,item.y-22,18,0,Math.PI*2); ctx.fill(); ctx.stroke();
                    ctx.font='27px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(item.icon,item.x,item.y-22);
                    ctx.fillStyle=cream; ctx.font='bold 9px monospace'; ctx.fillText(item.name.toUpperCase(),item.x,item.y+35);
                } else {
                    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(item.x,item.y+18,20,8,0,0,Math.PI*2); ctx.fill();
                    ctx.font='30px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(item.icon,item.x,item.y);
                    ctx.fillStyle=cream; ctx.font='bold 9px monospace'; ctx.fillText(item.name.toUpperCase(),item.x,item.y+30);
                }
                ctx.restore();
            });
            ctx.restore();
        }
        function drawKeeperRoom() {
            const x=400,y=320;
            ctx.save();
            ctx.fillStyle='#211d1b'; ctx.strokeStyle='#000'; ctx.lineWidth=4;
            ctx.beginPath(); ctx.ellipse(x,y,42,28,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle='#d6d3d1'; ctx.beginPath(); ctx.arc(x,y-18,24,0,Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(x-8,y-20,3,0,Math.PI*2); ctx.arc(x+8,y-20,3,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#f59e0b'; ctx.fillRect(x-50,y+30,100,8); ctx.fillStyle='#111'; ctx.fillRect(x-46,y+32,92,4);
            ctx.font='bold 13px monospace'; ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.fillText('DAMAGE DUMMY',x,y-58);
            ctx.font='bold 12px monospace'; ctx.fillStyle='#facc15'; ctx.fillText(`DMG ${dummyDamageTotal.toFixed(1)}  •  DPS ${dummyDps().toFixed(1)}`,x,y+60);
            floatingHits=floatingHits.filter(h=>h.life>0);
            floatingHits.forEach(h=>{h.y-=18/60;h.life-=1/60;ctx.globalAlpha=Math.max(0,h.life);ctx.font='bold 18px monospace';ctx.fillStyle='#ef4444';ctx.fillText(h.text,h.x,h.y);});
            ctx.restore();
        }

        function getRoomObstacles(rx, ry) {
            if (isGoldenRoom(rx, ry) || isKeeperRoom(rx, ry)) return [];
            if (rx === 0 && ry === 0) return TEMPLATES[0];
            const seed = Math.abs(Math.sin(rx * 12.9898 + ry * 78.233) * 43758.5453) % 1;
            const templateIdx = Math.floor(seed * TEMPLATES.length);
            return TEMPLATES[templateIdx];
        }

        function makeProjectile(dirX, dirY, charInfo, isGreed=false) {
            // Safety cap: prevents a held attack/network burst from exhausting the browser.
            if (projectiles.length >= 120) return null;
            const id = myPlayerId + '_' + Math.random().toString(36).slice(2,9);
            const attackType = isGreed ? 'fire' : charInfo.attackType;
            const p = {
                id, ownerId:myPlayerId, ownerName:localPlayer.name,
                rx:localPlayer.rx, ry:localPlayer.ry,
                x:localPlayer.x, y:localPlayer.y-8,
                vx:dirX * (isGreed ? 650 : 450) * localPlayer.stats.shotSpeed,
                vy:dirY * (isGreed ? 650 : 450) * localPlayer.stats.shotSpeed,
                color:isGreed ? '#facc15' : charInfo.tearColor,
                type:attackType, life:0.9 * localPlayer.stats.range,
                damage:localPlayer.stats.damage, remote:false
            };
            projectiles.push(p);
            networkProjectileIds.add(id);
            const packet={type:'tear', projectile:{...p, remote:true}};
            if (isRoomHost) broadcast(packet); else sendToConnection(hostConnection,packet);
        }

        function placeBomb() {
            if (inventory.bombs <= 0) { showToast('Нет бомб'); return; }
            inventory.bombs--;
            renderItemHud();
            audio.init();
            const id = myPlayerId + '_b_' + Math.random().toString(36).slice(2,9);
            const bomb = { id, ownerId: myPlayerId, ownerName: localPlayer.name, rx: localPlayer.rx, ry: localPlayer.ry, x: localPlayer.x, y: localPlayer.y, explodeAt: Date.now() + 2200, damage: Math.max(3, localPlayer.stats.damage * 2.2) };
            activeBombs.push(bomb);
            const packet = { type:'bomb', bomb };
            if (isRoomHost) broadcast(packet); else sendToConnection(hostConnection, packet);
        }

        function explodeBomb(bomb) {
            if (explodedBombIds.has(bomb.id)) return;
            explodedBombIds.add(bomb.id);
            activeBombs = activeBombs.filter(b => b.id !== bomb.id);
            audio.playBomb();
            const packet = { type:'bomb_explode', bomb:{id:bomb.id, rx:bomb.rx, ry:bomb.ry, x:bomb.x, y:bomb.y} };
            if (isRoomHost) broadcast(packet); else sendToConnection(hostConnection, packet);
            if (bomb.rx === localPlayer.rx && bomb.ry === localPlayer.ry && isKeeperRoom(localPlayer.rx, localPlayer.ry)) {
                const d = Math.hypot(400 - bomb.x, 320 - bomb.y);
                if (d < 135) {
                    const hit = {type:'dummy_hit', damage:bomb.damage, x:400, y:290, ownerName:bomb.ownerName, rx:bomb.rx, ry:bomb.ry};
                    if (isRoomHost) {
                        registerDummyHit(bomb.damage, 400, 290, bomb.ownerName);
                        peerConnections.forEach((conn,id)=>{ const rp=remotePlayers[id]; if(rp && rp.rx===bomb.rx && rp.ry===bomb.ry) sendToConnection(conn,hit); });
                    } else sendToConnection(hostConnection, hit);
                }
            }
        }

        let lilithCompanion = {x:0,y:0,ready:false};
        function lilithFollowerPos(){
            const t=performance.now()/1000;
            const target={x:localPlayer.x-58+Math.cos(t*1.8)*7, y:localPlayer.y-20+Math.sin(t*2.1)*7};
            if(!lilithCompanion.ready){ lilithCompanion.x=target.x; lilithCompanion.y=target.y; lilithCompanion.ready=true; }
            const follow = localPlayer.isMoving ? 0.025 : 0.035;
            lilithCompanion.x += (target.x-lilithCompanion.x)*follow;
            lilithCompanion.y += (target.y-lilithCompanion.y)*follow;
            return lilithCompanion;
        }
        function drawLilithFollower(){
            if(localPlayer.character!=='lilith') return; const p=lilithFollowerPos(),t=performance.now()/1000;ctx.save();
            const aura=28+Math.sin(t*4)*3,glow=ctx.createRadialGradient(p.x,p.y,3,p.x,p.y,aura);glow.addColorStop(0,'rgba(216,180,254,.34)');glow.addColorStop(1,'rgba(168,85,247,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,aura,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='rgba(216,180,254,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,18+Math.sin(t*3)*2,t*.7,t*.7+4.4);ctx.stroke();ctx.fillStyle='#4c1d95';ctx.strokeStyle='#09010f';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y,15,11,Math.sin(t)*.12,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.fillStyle='#a855f7';ctx.beginPath();ctx.moveTo(p.x-12,p.y-7);ctx.lineTo(p.x-23,p.y-17);ctx.lineTo(p.x-10,p.y-11);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(p.x+12,p.y-7);ctx.lineTo(p.x+23,p.y-17);ctx.lineTo(p.x+10,p.y-11);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f5d0fe';ctx.beginPath();ctx.arc(p.x-5,p.y-2,2.5,0,Math.PI*2);ctx.arc(p.x+5,p.y-2,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9d5ff';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('INCUBUS',p.x,p.y-27);ctx.restore();
        }

        function shootProjectile(dirX, dirY) {
            const now = performance.now();
            const fireDelay = Math.max(180, (activeCheats.has('MADNESS') ? 300 : 420) / Math.max(1, localPlayer.stats.tears));
            if (now - localPlayer.lastShootTime < fireDelay) return;
            localPlayer.lastShootTime = now;
            const charInfo = CHARACTERS[localPlayer.character] || CHARACTERS.isaac;
            audio.playShoot(charInfo.attackType);
            const isGreed = activeCheats.has('GREED');
            const origin = localPlayer.character==='lilith' ? lilithFollowerPos() : {x:localPlayer.x,y:localPlayer.y-8};
            if (activeCheats.has('MADNESS')) {
                const dirs=[{x:dirX,y:dirY},{x:-dirX,y:-dirY},{x:dirY,y:dirX},{x:-dirY,y:-dirX}];
                dirs.forEach(d=>{ const p=makeProjectile(d.x,d.y,charInfo,isGreed); if(p){ p.x=origin.x; p.y=origin.y; } });
            } else { const p=makeProjectile(dirX,dirY,charInfo,isGreed); if(p){ p.x=origin.x; p.y=origin.y; } }
        }

        let lastLoopError = 0;
        function gameLoop(now) {
            const dt = Math.min((now - lastTime) / 1000, 0.1);
            lastTime = now;
            try {
                updatePlayer(dt);
                updateProjectiles(dt);
                updateBombs();
                renderGame();
                renderMinimap();
            } catch (err) {
                // Never let one bad projectile/render object kill the animation loop.
                console.error('Game loop error:', err);
                if (now - lastLoopError > 2000) {
                    lastLoopError = now;
                    try { showToast('Внутренняя ошибка кадра — игра продолжает работу'); } catch (_) {}
                }
            }
            requestAnimationFrame(gameLoop);
        }

        function updateBombs() {
            const now = Date.now();
            const due = activeBombs.filter(b => !b.remote && now >= b.explodeAt);
            due.forEach(explodeBomb);
        }

        function updateProjectiles(dt) {
            // Remove malformed projectiles defensively before updating them.
            for (let i=projectiles.length-1;i>=0;i--) {
                const p=projectiles[i];
                if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
                    projectiles.splice(i,1);
                    continue;
                }
                p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
                if (isKeeperRoom(localPlayer.rx,localPlayer.ry) && p.x>345 && p.x<455 && p.y>255 && p.y<355) {
                    const damage = Number(p.damage || localPlayer.stats.damage);
                    registerDummyHit(damage,p.x,p.y,p.ownerName);
                    const packet={type:'dummy_hit',damage,x:p.x,y:p.y,ownerName:p.ownerName,rx:p.rx,ry:p.ry};
                    if(!p.remote){ if(isRoomHost) broadcast(packet); else sendToConnection(hostConnection,packet); }
                    projectiles.splice(i,1); continue;
                }
                if (p.x<WALL_THICKNESS || p.x>ROOM_WIDTH-WALL_THICKNESS || p.y<WALL_THICKNESS || p.y>ROOM_HEIGHT-WALL_THICKNESS || p.life<=0) projectiles.splice(i,1);
            }
        }

        function updatePlayer(dt) {
            let dx = 0;
            let dy = 0;

            if (keys.w) dy -= 1;
            if (keys.s) dy += 1;
            if (keys.a) dx -= 1;
            if (keys.d) dx += 1;

            if (mobileDir.x !== 0 || mobileDir.y !== 0) {
                dx = mobileDir.x;
                dy = mobileDir.y;
            }

            if (dx !== 0 && dy !== 0) {
                dx *= 0.7071;
                dy *= 0.7071;
            }

            localPlayer.isMoving = dx !== 0 || dy !== 0;

            if (localPlayer.isMoving) {
                const prevTimer = localPlayer.walkTimer;
                localPlayer.walkTimer += dt * 10;

                if (Math.floor(prevTimer / Math.PI) !== Math.floor(localPlayer.walkTimer / Math.PI)) {
                    audio.playStep();
                }

                let moveSpeed = localPlayer.speed * localPlayer.stats.speed + (activeCheats.has('MADNESS') ? 70 : 0);
                let newX = localPlayer.x + dx * moveSpeed * dt;
                let newY = localPlayer.y + dy * moveSpeed * dt;

                if (!activeCheats.has('IDDQD') && localPlayer.character !== 'azazel' && localPlayer.character !== 'lost') {
                    const obstacles = getRoomObstacles(localPlayer.rx, localPlayer.ry);
                    obstacles.forEach(obs => {
                        if (obs.type === 'rock') {
                            const closestX = Math.max(obs.x - obs.w/2, Math.min(newX, obs.x + obs.w/2));
                            const closestY = Math.max(obs.y - obs.h/2, Math.min(newY, obs.y + obs.h/2));
                            const distX = newX - closestX;
                            const distY = newY - closestY;
                            const distance = Math.hypot(distX, distY);

                            if (distance < localPlayer.radius) {
                                if (distance > 0) {
                                    newX = closestX + (distX / distance) * localPlayer.radius;
                                    newY = closestY + (distY / distance) * localPlayer.radius;
                                }
                            }
                        }
                    });
                }

                localPlayer.x = newX;
                localPlayer.y = newY;
            }

            const midX = ROOM_WIDTH / 2;
            const midY = ROOM_HEIGHT / 2;
            const doorHalf = DOOR_SIZE / 2 - 10;

            const inXDoorZone = Math.abs(localPlayer.x - midX) < doorHalf;
            const inYDoorZone = Math.abs(localPlayer.y - midY) < doorHalf;

            if (inXDoorZone && localPlayer.y <= WALL_THICKNESS && hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.up)) {
                localPlayer.ry += 1;
                localPlayer.y = ROOM_HEIGHT - WALL_THICKNESS - localPlayer.radius - 10;
                onRoomChange();
            } else if (inXDoorZone && localPlayer.y >= ROOM_HEIGHT - WALL_THICKNESS && hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.down)) {
                localPlayer.ry -= 1;
                localPlayer.y = WALL_THICKNESS + localPlayer.radius + 10;
                onRoomChange();
            } else if (inYDoorZone && localPlayer.x <= WALL_THICKNESS && hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.left)) {
                localPlayer.rx -= 1;
                localPlayer.x = ROOM_WIDTH - WALL_THICKNESS - localPlayer.radius - 10;
                onRoomChange();
            } else if (inYDoorZone && localPlayer.x >= ROOM_WIDTH - WALL_THICKNESS && hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.right)) {
                localPlayer.rx += 1;
                localPlayer.x = WALL_THICKNESS + localPlayer.radius + 10;
                onRoomChange();
            }

            const openUp = hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.up);
            const openDown = hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.down);
            const openLeft = hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.left);
            const openRight = hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.right);
            localPlayer.y = Math.max(openUp && inXDoorZone ? localPlayer.radius : WALL_THICKNESS + localPlayer.radius,
                Math.min(openDown && inXDoorZone ? ROOM_HEIGHT - localPlayer.radius : ROOM_HEIGHT - WALL_THICKNESS - localPlayer.radius, localPlayer.y));
            localPlayer.x = Math.max(openLeft && inYDoorZone ? localPlayer.radius : WALL_THICKNESS + localPlayer.radius,
                Math.min(openRight && inYDoorZone ? ROOM_WIDTH - localPlayer.radius : ROOM_WIDTH - WALL_THICKNESS - localPlayer.radius, localPlayer.x));
            const nowShot = performance.now();
            let sx = 0, sy = 0;
            if (keys.arrowUp) sy = -1;
            else if (keys.arrowDown) sy = 1;
            else if (keys.arrowLeft) sx = -1;
            else if (keys.arrowRight) sx = 1;
            else if (mobileShoot.x || mobileShoot.y) { sx = mobileShoot.x; sy = mobileShoot.y; }
            if ((sx || sy) && nowShot - lastHeldShot >= 35) {
                lastHeldShot = nowShot;
                shootProjectile(sx, sy);
            }
            collectNearbyItem();
        }

        function onRoomChange() {
            audio.playDoor();
            projectiles = [];
            activeBombs = [];
            const coordKey = `${localPlayer.rx},${localPlayer.ry}`;
            const wasNew = !visitedRooms.has(coordKey);
            visitedRooms.add(coordKey);
            if(wasNew && localPlayer.character==='isaac'){ d6Charges=Math.min(6,d6Charges+1); renderActiveButton(); }
            document.getElementById('uiCoord').innerText = `(${localPlayer.rx}, ${localPlayer.ry})`;
            const sameRoomCount = Object.values(remotePlayers)
                .filter(p => p.rx === localPlayer.rx && p.ry === localPlayer.ry).length;
            document.getElementById('uiPlayerCount').innerText = String(sameRoomCount + 1);
            
            const currentTheme = getRoomTheme(localPlayer.rx, localPlayer.ry);
            document.getElementById('uiRoomThemeTitle').innerText = isGoldenRoom(localPlayer.rx, localPlayer.ry) ? '💛 Золотая комната' : (isKeeperRoom(localPlayer.rx, localPlayer.ry) ? '🎯 Комната Дамми' : currentTheme.label);
            dummyDamageTotal = 0; dummyDamageEvents = []; floatingHits = [];
            renderItemHud();
        }

        function renderGame() {
            ctx.save();
            ctx.fillStyle = '#0a0808';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const scale = Math.min(canvas.width / ROOM_WIDTH, canvas.height / ROOM_HEIGHT) * 0.92;
            const offsetX = (canvas.width - ROOM_WIDTH * scale) / 2;
            const offsetY = (canvas.height - ROOM_HEIGHT * scale) / 2;

            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);

            const theme = getRoomTheme(localPlayer.rx, localPlayer.ry);

            ctx.fillStyle = theme.floor;
            ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

            ctx.strokeStyle = theme.grid;
            ctx.lineWidth = 2;
            const tileSize = 50;
            for (let x = WALL_THICKNESS; x < ROOM_WIDTH - WALL_THICKNESS; x += tileSize) {
                for (let y = WALL_THICKNESS; y < ROOM_HEIGHT - WALL_THICKNESS; y += tileSize) {
                    ctx.strokeRect(x, y, tileSize, tileSize);
                }
            }

            ctx.fillStyle = theme.wall;
            ctx.strokeStyle = theme.border;
            ctx.lineWidth = 5;

            const doors = {
                up: hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.up),
                down: hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.down),
                left: hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.left),
                right: hasRoomDoor(localPlayer.rx, localPlayer.ry, ROOM_DIRS.right)
            };
            if (doors.up) {
                drawWallSegment(0,0,ROOM_WIDTH/2-DOOR_SIZE/2,WALL_THICKNESS);
                drawWallSegment(ROOM_WIDTH/2+DOOR_SIZE/2,0,ROOM_WIDTH/2-DOOR_SIZE/2,WALL_THICKNESS);
            } else drawWallSegment(0,0,ROOM_WIDTH,WALL_THICKNESS);
            if (doors.down) {
                drawWallSegment(0,ROOM_HEIGHT-WALL_THICKNESS,ROOM_WIDTH/2-DOOR_SIZE/2,WALL_THICKNESS);
                drawWallSegment(ROOM_WIDTH/2+DOOR_SIZE/2,ROOM_HEIGHT-WALL_THICKNESS,ROOM_WIDTH/2-DOOR_SIZE/2,WALL_THICKNESS);
            } else drawWallSegment(0,ROOM_HEIGHT-WALL_THICKNESS,ROOM_WIDTH,WALL_THICKNESS);
            if (doors.left) {
                drawWallSegment(0,0,WALL_THICKNESS,ROOM_HEIGHT/2-DOOR_SIZE/2);
                drawWallSegment(0,ROOM_HEIGHT/2+DOOR_SIZE/2,WALL_THICKNESS,ROOM_HEIGHT/2-DOOR_SIZE/2);
            } else drawWallSegment(0,0,WALL_THICKNESS,ROOM_HEIGHT);
            if (doors.right) {
                drawWallSegment(ROOM_WIDTH-WALL_THICKNESS,0,WALL_THICKNESS,ROOM_HEIGHT/2-DOOR_SIZE/2);
                drawWallSegment(ROOM_WIDTH-WALL_THICKNESS,ROOM_HEIGHT/2+DOOR_SIZE/2,WALL_THICKNESS,ROOM_HEIGHT/2-DOOR_SIZE/2);
            } else drawWallSegment(ROOM_WIDTH-WALL_THICKNESS,0,WALL_THICKNESS,ROOM_HEIGHT);
            ctx.fillStyle='#090707';
            if (doors.up) ctx.fillRect(ROOM_WIDTH/2-DOOR_SIZE/2,0,DOOR_SIZE,WALL_THICKNESS);
            if (doors.down) ctx.fillRect(ROOM_WIDTH/2-DOOR_SIZE/2,ROOM_HEIGHT-WALL_THICKNESS,DOOR_SIZE,WALL_THICKNESS);
            if (doors.left) ctx.fillRect(0,ROOM_HEIGHT/2-DOOR_SIZE/2,WALL_THICKNESS,DOOR_SIZE);
            if (doors.right) ctx.fillRect(ROOM_WIDTH-WALL_THICKNESS,ROOM_HEIGHT/2-DOOR_SIZE/2,WALL_THICKNESS,DOOR_SIZE);

            if (isGoldenRoom(localPlayer.rx, localPlayer.ry)) {
                drawGoldenRoom(goldenRoomItems());
            }

            const obstacles = getRoomObstacles(localPlayer.rx, localPlayer.ry);
            obstacles.forEach(obs => {
                if (obs.type === 'rock') {
                    ctx.save();
                    ctx.fillStyle = theme.obstacleRock;
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.roundRect(obs.x - obs.w/2, obs.y - obs.h/2, obs.w, obs.h, 8);
                    ctx.fill();
                    ctx.stroke();

                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(obs.x - obs.w/4, obs.y - obs.h/4);
                    ctx.lineTo(obs.x + obs.w/4, obs.y + obs.h/4);
                    ctx.stroke();
                    ctx.restore();
                } else if (obs.type === 'pillar') {
                    ctx.save();
                    ctx.fillStyle = '#64748b';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.w/2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                } else if (obs.type === 'chest') {
                    ctx.save();
                    ctx.fillStyle = '#facc15';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 3;
                    ctx.fillRect(obs.x - obs.w/2, obs.y - obs.h/2, obs.w, obs.h);
                    ctx.strokeRect(obs.x - obs.w/2, obs.y - obs.h/2, obs.w, obs.h);
                    ctx.restore();
                } else if (obs.type === 'spike') {
                    ctx.fillStyle = '#78716c';
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 3;
                    ctx.fillRect(obs.x - obs.w/2, obs.y - obs.h/2, obs.w, obs.h);
                    ctx.strokeRect(obs.x - obs.w/2, obs.y - obs.h/2, obs.w, obs.h);

                    ctx.fillStyle = '#dc2626';
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            if (isKeeperRoom(localPlayer.rx, localPlayer.ry)) drawKeeperRoom();

            activeBombs.forEach(b => {
                if (b.rx !== localPlayer.rx || b.ry !== localPlayer.ry) return;
                const pulse = 1 + Math.sin(performance.now()/90) * 0.08;
                ctx.save();
                ctx.translate(b.x, b.y); ctx.scale(pulse,pulse);
                ctx.fillStyle='#111'; ctx.strokeStyle='#000'; ctx.lineWidth=3;
                ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill(); ctx.stroke();
                ctx.fillStyle='#d6d3d1'; ctx.fillRect(-3,-20,6,7);
                ctx.fillStyle='#facc15'; ctx.beginPath(); ctx.arc(0,-22,4,0,Math.PI*2); ctx.fill();
                ctx.restore();
            });

            projectiles.forEach(p => {
                ctx.save();
                ctx.fillStyle = p.color;
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                if (p.type === 'bullet') {
                    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                } else if (p.type === 'fire') {
                    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
                } else {
                    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                }
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });

            Object.values(remotePlayers).forEach(rp => {
                if (rp.rx === localPlayer.rx && rp.ry === localPlayer.ry) {
                    drawFlashCharacter(rp.x, rp.y, rp.character, rp.name, rp.walkTimer, rp.isMoving);
                }
            });

            drawLilithFollower();
            drawFlashCharacter(localPlayer.x, localPlayer.y, localPlayer.character, localPlayer.name, localPlayer.walkTimer, localPlayer.isMoving);

            ctx.restore();
            renderItemDescription();
        }

        function drawWallSegment(x, y, w, h) {
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.fill();
            ctx.stroke();
        }

        function drawFlashCharacter(x, y, charKey, name, walkTimer, isMoving) {
            ctx.save();

            const legOffset = isMoving ? Math.sin(walkTimer) * 8 : 0;
            const bodyBob = isMoving ? Math.abs(Math.sin(walkTimer * 2)) * 3 : 0;
            const charInfo = CHARACTERS[charKey] || CHARACTERS.isaac;
            const headY = y - 8 - bodyBob;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(x, y + 22, 18, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            if (charKey === 'lost') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.beginPath();
                ctx.arc(x, headY, 24, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = '#1c1917';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;

            if (charKey !== 'lost' && charKey !== 'azazel') {ctx.beginPath();ctx.ellipse(x-10,y+18+legOffset,7,5,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(x+10,y+18-legOffset,7,5,0,0,Math.PI*2);ctx.fill();ctx.stroke();} else if (charKey === 'lost') {const smokeT=performance.now()/180;for(let i=0;i<9;i++){const a=smokeT+i*1.7,sx=x+Math.sin(a)*11,sy=y+18+(i%4)*6+Math.cos(a*1.3)*3;ctx.fillStyle=`rgba(226,232,240,${0.12+(i%4)*0.05})`;ctx.beginPath();ctx.arc(sx,sy,5+(i%4)*2,0,Math.PI*2);ctx.fill();}}

            ctx.fillStyle = charKey === 'lost' ? 'rgba(241,245,249,0.78)' : charInfo.skin;
            ctx.beginPath();
            ctx.ellipse(x, y + 6 - bodyBob, 12, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, headY, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (activeCheats.has('IDDQD')) {
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(x, headY - 22, 12, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (activeCheats.has('MADNESS')) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(x - 5, headY - 2, 4, 0, Math.PI * 2);
                ctx.arc(x + 5, headY - 2, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;

            if (charKey === 'hank') {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x - 12, headY - 4, 10, 8);
                ctx.fillRect(x + 2, headY - 4, 10, 8);
                ctx.strokeRect(x - 12, headY - 4, 10, 8);
                ctx.strokeRect(x + 2, headY - 4, 10, 8);

                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x - 12, headY + 5);
                ctx.lineTo(x + 12, headY + 5);
                ctx.stroke();

            } else if (charKey === 'judas') {
                ctx.fillStyle = '#b91c1c';
                ctx.fillRect(x - 8, headY - 26, 16, 12);
                ctx.strokeRect(x - 8, headY - 26, 16, 12);

                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, headY - 26);
                ctx.lineTo(x + 10, headY - 18);
                ctx.stroke();

                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x, headY - 10); ctx.lineTo(x, headY + 4);
                ctx.moveTo(x - 6, headY - 3); ctx.lineTo(x + 6, headY - 3);
                ctx.stroke();

            } else if (charKey === 'azazel') {
                const flap = isMoving ? Math.sin(walkTimer * 1.7) * 0.28 : Math.sin(performance.now()/380) * 0.06; ctx.save(); ctx.translate(x,y-12); ctx.fillStyle='#273449'; ctx.strokeStyle='#05070a'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-7,4); ctx.quadraticCurveTo(-28,-12,-31,-1); ctx.quadraticCurveTo(-24,7,-9,9); ctx.closePath(); ctx.save(); ctx.rotate(-flap); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.beginPath(); ctx.moveTo(7,4); ctx.quadraticCurveTo(28,-12,31,-1); ctx.quadraticCurveTo(24,7,9,9); ctx.closePath(); ctx.save(); ctx.rotate(flap); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.strokeStyle='rgba(148,163,184,.55)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-10,6); ctx.lineTo(-25,-2); ctx.moveTo(10,6); ctx.lineTo(25,-2); ctx.stroke(); ctx.restore(); ctx.fillStyle='#0f172a';
                ctx.beginPath();
                ctx.moveTo(x - 10, headY - 12);
                ctx.quadraticCurveTo(x - 18, headY - 24, x - 8, headY - 22);
                ctx.fill(); ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x + 10, headY - 12);
                ctx.quadraticCurveTo(x + 18, headY - 24, x + 8, headY - 22);
                ctx.fill(); ctx.stroke();

                ctx.strokeStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(x - 5, headY - 2, 3, 0, Math.PI * 2);
                ctx.arc(x + 5, headY - 2, 3, 0, Math.PI * 2);
                ctx.fill();

            } else if (charKey === 'cain') {
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(x - 4, headY - 14, 8, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#000000';
                ctx.fillRect(x - 10, headY - 5, 8, 8);
                ctx.beginPath();
                ctx.moveTo(x - 16, headY - 10); ctx.lineTo(x + 16, headY + 4);
                ctx.stroke();

            } else if (charKey === 'tricky') {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(x - 16, headY - 8, 8, 0, Math.PI * 2);
                ctx.arc(x + 16, headY - 8, 8, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#64748b';
                ctx.fillRect(x - 10, headY, 20, 10);
                ctx.strokeRect(x - 10, headY, 20, 10);

                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(x - 5, headY - 4, 3, 0, Math.PI * 2);
                ctx.arc(x + 5, headY - 4, 3, 0, Math.PI * 2);
                ctx.fill();

            } else if (charKey === 'sanford') {
                ctx.fillStyle = '#ea580c';
                ctx.beginPath();
                ctx.arc(x, headY - 6, 16.5, Math.PI, Math.PI * 2);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#000000';
                ctx.fillRect(x - 10, headY - 2, 20, 6);

            } else if (charKey === 'lost') {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(x - 5, headY - 2, 4, 0, Math.PI * 2);
                ctx.arc(x + 5, headY - 2, 4, 0, Math.PI * 2);
                ctx.fill();

            } else {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(x, headY - 10); ctx.lineTo(x, headY + 6);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x - 7, headY - 2); ctx.lineTo(x + 7, headY - 2);
                ctx.stroke();

                ctx.fillStyle = '#60a5fa';
                ctx.beginPath();
                ctx.arc(x + 8, headY + 4, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(name, x, headY - 22);

            ctx.restore();
        }

        function renderMinimap() {
            const mw = mapCanvas.width;
            const mh = mapCanvas.height;
            mapCtx.fillStyle = '#120f0e';
            mapCtx.fillRect(0, 0, mw, mh);

            const gridCenter = 55;
            const roomBoxSize = 12;
            const roomSpacing = 16;

            visitedRooms.forEach(key => {
                const [rx, ry] = key.split(',').map(Number);
                const relX = rx - localPlayer.rx;
                const relY = ry - localPlayer.ry;

                const drawX = gridCenter + relX * roomSpacing - roomBoxSize / 2;
                const drawY = gridCenter - relY * roomSpacing - roomBoxSize / 2;

                if (drawX >= 5 && drawX <= mw - 20 && drawY >= 5 && drawY <= mh - 20) {
                    const isCurrent = rx === localPlayer.rx && ry === localPlayer.ry;
                    mapCtx.fillStyle = isCurrent ? '#facc15' : '#524640';
                    mapCtx.strokeStyle = '#000000';
                    mapCtx.lineWidth = 2;
                    mapCtx.fillRect(drawX, drawY, roomBoxSize, roomBoxSize);
                    mapCtx.strokeRect(drawX, drawY, roomBoxSize, roomBoxSize);

                    Object.values(remotePlayers).forEach(rp => {
                        if (rp.rx === rx && rp.ry === ry) {
                            mapCtx.fillStyle = '#ef4444';
                            mapCtx.beginPath();
                            mapCtx.arc(drawX + roomBoxSize / 2, drawY + roomBoxSize / 2, 3, 0, Math.PI * 2);
                            mapCtx.fill();
                        }
                    });
                }
            });

            mapCtx.strokeStyle = '#29201d';
            mapCtx.lineWidth = 3;
            mapCtx.strokeRect(0, 0, mw, mh);
        }
