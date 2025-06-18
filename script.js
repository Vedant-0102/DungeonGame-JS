class DungeonGame {
    constructor() {
        this.width = 60;
        this.height = 30;
        this.player = { x: 0, y: 0 };
        this.map = [];
        this.rooms = [];
        this.entities = [];
        this.messages = [];
        this.playerStats = {
            level: 1,
            health: 100,
            maxHealth: 100,
            mana: 50,
            maxMana: 50,
            gold: 0,
            kills: 0,
            score: 0
        };

        this.keys = {};
        this.lastMoveTime = 0;
        this.moveDelay = 100;
        this.needsRender = true;
        this.lastFrameTime = 0;
        this.frameRate = 30;
        this.frameInterval = 1000 / this.frameRate;

        this.init();
        this.bindEvents();
        this.startGameLoop();
    }

    init() {
        this.generateDungeon();
        this.render();
        this.updateUI();
        this.addMessage("Welcome to the dungeon!", "");
        this.addMessage("Collect items and defeat monsters!", "");
    }

    generateDungeon() {
        this.map = Array(this.height).fill(null).map(() => Array(this.width).fill('█'));
        this.rooms = [];
        this.entities = [];

        const numRooms = 8 + Math.floor(Math.random() * 6);
        const attempts = 50;

        for (let i = 0; i < attempts && this.rooms.length < numRooms; i++) {
            const room = this.generateRoom();
            if (this.isValidRoom(room)) {
                this.carveRoom(room);
                this.rooms.push(room);
            }
        }

        this.connectRooms();
        this.placeDoors();

        if (this.rooms.length > 0) {
            const firstRoom = this.rooms[0];
            this.player.x = firstRoom.x + Math.floor(firstRoom.width / 2);
            this.player.y = firstRoom.y + Math.floor(firstRoom.height / 2);
        }

        this.placeEntities();
        this.needsRender = true;
    }

    generateRoom() {
        const width = 4 + Math.floor(Math.random() * 8);
        const height = 3 + Math.floor(Math.random() * 6);
        const x = 2 + Math.floor(Math.random() * (this.width - width - 4));
        const y = 2 + Math.floor(Math.random() * (this.height - height - 4));
        return { x, y, width, height };
    }

    isValidRoom(room) {
        for (const existingRoom of this.rooms) {
            if (
                room.x < existingRoom.x + existingRoom.width + 2 &&
                room.x + room.width + 2 > existingRoom.x &&
                room.y < existingRoom.y + existingRoom.height + 2 &&
                room.y + room.height + 2 > existingRoom.y
            ) {
                return false;
            }
        }
        return true;
    }

    carveRoom(room) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                this.map[y][x] = '·';
            }
        }
    }

    connectRooms() {
        for (let i = 1; i < this.rooms.length; i++) {
            const roomA = this.rooms[i - 1];
            const roomB = this.rooms[i];
            const centerA = {
                x: roomA.x + Math.floor(roomA.width / 2),
                y: roomA.y + Math.floor(roomA.height / 2)
            };
            const centerB = {
                x: roomB.x + Math.floor(roomB.width / 2),
                y: roomB.y + Math.floor(roomB.height / 2)
            };
            if (Math.random() < 0.5) {
                this.carveCorridor(centerA.x, centerA.y, centerB.x, centerA.y);
                this.carveCorridor(centerB.x, centerA.y, centerB.x, centerB.y);
            } else {
                this.carveCorridor(centerA.x, centerA.y, centerA.x, centerB.y);
                this.carveCorridor(centerA.x, centerB.y, centerB.x, centerB.y);
            }
        }
    }

    carveCorridor(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        for (let x = minX; x <= maxX; x++) {
            if (this.isInBounds(x, y1)) this.map[y1][x] = '·';
        }

        for (let y = minY; y <= maxY; y++) {
            if (this.isInBounds(x2, y)) this.map[y][x2] = '·';
        }
    }

    placeDoors() {
        for (const room of this.rooms) {
            const doors = [];

            for (let x = room.x; x < room.x + room.width; x++) {
                if (room.y > 0 && this.map[room.y - 1][x] === '·') doors.push({ x, y: room.y });
                if (room.y + room.height < this.height - 1 && this.map[room.y + room.height][x] === '·') doors.push({ x, y: room.y + room.height - 1 });
            }

            for (let y = room.y; y < room.y + room.height; y++) {
                if (room.x > 0 && this.map[y][room.x - 1] === '·') doors.push({ x: room.x, y });
                if (room.x + room.width < this.width - 1 && this.map[y][room.x + room.width] === '·') doors.push({ x: room.x + room.width - 1, y });
            }

            doors.forEach(door => {
                if (Math.random() < 0.25) {
                    this.map[door.y][door.x] = '+';
                }
            });
        }
    }

    placeEntities() {
        const entityTypes = [
            { char: '$', count: 5 + Math.floor(Math.random() * 6) },
            { char: '♥', count: 2 + Math.floor(Math.random() * 3) },
            { char: '♦', count: 1 + Math.floor(Math.random() * 2) },
            { char: 'M', count: 3 + Math.floor(Math.random() * 5) },
            { char: '<', count: 1 },
            { char: '>', count: 1 }
        ];

        entityTypes.forEach(type => {
            for (let i = 0; i < type.count; i++) {
                let placed = false;
                let attempts = 0;

                while (!placed && attempts < 50) {
                    const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
                    const x = room.x + Math.floor(Math.random() * room.width);
                    const y = room.y + Math.floor(Math.random() * room.height);

                    if (this.map[y][x] === '·' &&
                        (x !== this.player.x || y !== this.player.y) &&
                        !this.entities.some(e => e.x === x && e.y === y)) {
                        this.entities.push({ x, y, char: type.char });
                        placed = true;
                    }
                    attempts++;
                }
            }
        });
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    canMoveTo(x, y) {
        if (!this.isInBounds(x, y)) return false;
        const cell = this.map[y][x];
        return cell === '·' || cell === '+';
    }

    movePlayer(dx, dy) {
        const now = Date.now();
        if (now - this.lastMoveTime < this.moveDelay) return;

        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        if (this.canMoveTo(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            this.lastMoveTime = now;
            this.needsRender = true;

            const entityIndex = this.entities.findIndex(e => e.x === newX && e.y === newY);
            if (entityIndex !== -1) {
                const entity = this.entities[entityIndex];
                this.handleEntityInteraction(entity, entityIndex);
            }

            this.updateUI();
        }
    }

    handleEntityInteraction(entity, index) {
        switch (entity.char) {
            case '$':
                const goldAmount = 10 + Math.floor(Math.random() * 20);
                this.playerStats.gold += goldAmount;
                this.playerStats.score += goldAmount * 2;
                this.addMessage(`Found ${goldAmount} gold!`, "treasure");
                break;
            case '♥':
                const healAmount = 15 + Math.floor(Math.random() * 10);
                this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + healAmount);
                this.playerStats.score += 40;
                this.addMessage(`Restored ${healAmount} health!`, "healing");
                break;
            case '♦':
                const manaAmount = 10 + Math.floor(Math.random() * 15);
                this.playerStats.mana = Math.min(this.playerStats.maxMana, this.playerStats.mana + manaAmount);
                this.playerStats.score += 25;
                this.addMessage(`Restored ${manaAmount} mana!`, "healing");
                break;
            case 'M':
                const damage = 5 + Math.floor(Math.random() * 10);
                this.playerStats.health = Math.max(0, this.playerStats.health - damage);
                this.playerStats.kills++;
                this.playerStats.score += 80;
                this.addMessage(`Defeated monster! (-${damage} HP)`, "combat");
                break;
            case '<':
                this.playerStats.level = Math.max(1, this.playerStats.level - 1);
                this.addMessage(`Ascended to level ${this.playerStats.level}!`, "level");
                this.newLevel();
                break;
            case '>':
                this.playerStats.level++;
                this.playerStats.maxHealth += 8;
                this.playerStats.maxMana += 4;
                this.playerStats.health = this.playerStats.maxHealth;
                this.playerStats.mana = this.playerStats.maxMana;
                this.addMessage(`Descended to level ${this.playerStats.level}!`, "level");
                this.newLevel();
                break;
        }

        this.entities.splice(index, 1);

        if (this.playerStats.health === 0) {
            setTimeout(() => {
                this.addMessage("You have been defeated!", "combat");
                setTimeout(() => this.newGame(), 2000);
            }, 500);
        }
    }

    newLevel() {
        this.generateDungeon();
        this.updateUI();
    }

    addMessage(text, type = "") {
        this.messages.push({ text, type, time: Date.now() });
        if (this.messages.length > 15) this.messages.shift();
        this.updateMessageLog();
    }

    updateMessageLog() {
        const log = document.getElementById('messageLog');
        log.innerHTML = this.messages.map(msg => `<div class="message ${msg.type}">${msg.text}</div>`).join('');
        log.scrollTop = log.scrollHeight;
    }

    render() {
        if (!this.needsRender) return;
        let output = '';
        const cellClasses = {
            '█': 'wall',
            '·': 'floor',
            '+': 'door',
            '$': 'treasure',
            '♥': 'health-potion',
            '♦': 'mana-potion',
            'M': 'enemy',
            '<': 'stairs',
            '>': 'stairs'
        };

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === this.player.x && y === this.player.y) {
                    output += '<span class="player">@</span>';
                } else {
                    const entity = this.entities.find(e => e.x === x && e.y === y);
                    if (entity) {
                        output += `<span class="${cellClasses[entity.char]}">${entity.char}</span>`;
                    } else {
                        const cell = this.map[y][x];
                        output += `<span class="${cellClasses[cell] || ''}">${cell}</span>`;
                    }
                }
            }
            output += '\n';
        }

        document.getElementById('dungeon').innerHTML = output;
        this.needsRender = false;
    }

    updateUI() {
        document.getElementById('level').textContent = this.playerStats.level;
        document.getElementById('health').textContent = this.playerStats.health;
        document.getElementById('maxHealth').textContent = this.playerStats.maxHealth;
        document.getElementById('mana').textContent = this.playerStats.mana;
        document.getElementById('maxMana').textContent = this.playerStats.maxMana;
        document.getElementById('gold').textContent = this.playerStats.gold;
        document.getElementById('kills').textContent = this.playerStats.kills;
        document.getElementById('score').textContent = this.playerStats.score;

        const healthPercent = (this.playerStats.health / this.playerStats.maxHealth) * 100;
        const manaPercent = (this.playerStats.mana / this.playerStats.maxMana) * 100;
        document.getElementById('healthFill').style.width = healthPercent + '%';
        document.getElementById('manaFill').style.width = manaPercent + '%';
    }

    newGame() {
        this.playerStats = {
            level: 1,
            health: 100,
            maxHealth: 100,
            mana: 50,
            maxMana: 50,
            gold: 0,
            kills: 0,
            score: 0
        };
        this.messages = [];
        this.generateDungeon();
        this.updateUI();
        this.addMessage("New adventure begins!", "");
    }

    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (timestamp - this.lastFrameTime >= this.frameInterval) {
                this.handleInput();
                if (this.needsRender) this.render();
                this.lastFrameTime = timestamp;
            }
            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }

    handleInput() {
        if (this.keys['ArrowUp'] || this.keys['w']) this.movePlayer(0, -1);
        if (this.keys['ArrowDown'] || this.keys['s']) this.movePlayer(0, 1);
        if (this.keys['ArrowLeft'] || this.keys['a']) this.movePlayer(-1, 0);
        if (this.keys['ArrowRight'] || this.keys['d']) this.movePlayer(1, 0);
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();

            this.keys[e.key] = true;
            this.keys[e.key.toLowerCase()] = true;

            switch (e.key.toLowerCase()) {
                case 'r':
                    this.generateDungeon();
                    this.addMessage("New dungeon generated!", "");
                    break;
                case 'escape':
                    this.newGame();
                    break;
                case ' ':
                    if (this.playerStats.health < this.playerStats.maxHealth) {
                        this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + 1);
                    }
                    if (this.playerStats.mana < this.playerStats.maxMana) {
                        this.playerStats.mana = Math.min(this.playerStats.maxMana, this.playerStats.mana + 2);
                    }
                    this.addMessage("You rest and recover...", "healing");
                    this.updateUI();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            this.keys[e.key.toLowerCase()] = false;
        });
    }
}

const game = new DungeonGame();
