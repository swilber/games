// Custom Entity-Based Donkey Kong with Enhanced ASCII Maps

class DKEntity {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
    }
    
    render(ctx) {
        // Override in subclasses
    }
}

class DKPlatform extends DKEntity {
    constructor(x, y, width, height, angle = 0) {
        super(x, y, width, height, 'platform');
        this.angle = angle;
    }
    
    render(ctx) {
        ctx.fillStyle = '#FF6B35';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#D2691E';
        for (let i = 0; i < this.width; i += 20) {
            ctx.fillRect(this.x + i, this.y + 2, 2, this.height - 4);
        }
    }
}

class DKLadder extends DKEntity {
    constructor(x, y, width, height) {
        super(x, y, width, height, 'ladder');
    }
    
    render(ctx) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        for (let i = 0; i < this.height; i += 10) {
            ctx.fillStyle = '#654321';
            ctx.fillRect(this.x, this.y + i, this.width, 2);
        }
    }
}

class DKOilDrum extends DKEntity {
    constructor(x, y) {
        super(x, y, 20, 25, 'oildrum');
    }
    
    render(ctx) {
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
        
        // Oil drum bands
        ctx.fillStyle = '#444';
        ctx.fillRect(this.x, this.y + 8, this.width, 2);
        ctx.fillRect(this.x, this.y + 15, this.width, 2);
    }
}

class DKHammer extends DKEntity {
    constructor(x, y) {
        super(x, y, 15, 20, 'hammer');
    }
    
    render(ctx) {
        // Hammer handle
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x + 6, this.y + 5, 3, 15);
        
        // Hammer head
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x, this.y, 15, 8);
        
        ctx.fillStyle = '#888';
        ctx.fillRect(this.x + 1, this.y + 1, 13, 6);
    }
}

// Enhanced Map Parser
class DKMapParser {
    static async loadMap(mapPath) {
        const response = await fetch(mapPath);
        const mapText = await response.text();
        return this.parseMap(mapText);
    }
    
    static parseMap(mapText) {
        const lines = mapText.split('\n');
        const entities = [];
        
        const canvasWidth = 600;
        const canvasHeight = 500;
        const mapWidth = Math.max(...lines.map(line => line.length));
        const mapHeight = lines.length;
        
        const tileWidth = canvasWidth / mapWidth;
        const tileHeight = canvasHeight / mapHeight;
        
        lines.forEach((line, row) => {
            for (let col = 0; col < line.length; col++) {
                const char = line[col];
                const x = col * tileWidth;
                const y = row * tileHeight;
                
                switch (char) {
                    case '-':
                        entities.push(new DKPlatform(x, y, tileWidth, 8, 0));
                        break;
                    case '/':
                        entities.push(new DKPlatform(x, y, tileWidth, 8, 0.1));
                        break;
                    case '\\':
                        entities.push(new DKPlatform(x, y, tileWidth, 8, -0.1));
                        break;
                    case 'H':
                        entities.push(new DKLadder(x, y, 8, tileHeight));
                        break;
                    case 'o':
                        entities.push(new DKOilDrum(x, y - 5));
                        break;
                    case 'p':
                        entities.push(new DKHammer(x, y - 5));
                        break;
                    case 'M':
                        entities.push({ type: 'mario', x, y: y - 20 });
                        break;
                    case 'K':
                        entities.push({ type: 'donkeykong', x, y: y - 25 });
                        break;
                    case 'P':
                        entities.push({ type: 'princess', x, y: y - 25 });
                        break;
                }
            }
        });
        
        return entities;
    }
}

async function createDonkeyKongGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 500;
    canvas.style.border = '2px solid #000';
    const ctx = canvas.getContext('2d');
    
    // Game State
    const game = {
        entities: [],
        platforms: [],
        ladders: [],
        oildrums: [],
        hammers: [],
        player: { x: 50, y: 450, vx: 0, vy: 0, onGround: false, width: 20, height: 30 },
        donkeyKong: { x: 50, y: 50, width: 40, height: 40 },
        princess: { x: 550, y: 50, width: 20, height: 30 },
        gameRunning: false,
        gameInterval: null,
        keys: {}
    };
    
    async function loadLevel() {
        const entities = await DKMapParser.loadMap('/games/donkeykong/maps/level-1-enhanced.map');
        
        entities.forEach(entity => {
            if (entity.type === 'platform') {
                game.platforms.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'ladder') {
                game.ladders.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'oildrum') {
                game.oildrums.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'hammer') {
                game.hammers.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'mario') {
                game.player.x = entity.x;
                game.player.y = entity.y;
            } else if (entity.type === 'donkeykong') {
                game.donkeyKong.x = entity.x;
                game.donkeyKong.y = entity.y;
            } else if (entity.type === 'princess') {
                game.princess.x = entity.x;
                game.princess.y = entity.y;
            }
        });
        
        render();
    }
    
    function gameLoop() {
        if (!game.gameRunning) return;
        
        // Handle movement
        if (game.keys['ArrowLeft']) {
            game.player.vx = -3;
        } else if (game.keys['ArrowRight']) {
            game.player.vx = 3;
        } else {
            game.player.vx = 0;
        }
        
        // Physics
        game.player.vy += 0.5;
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;
        
        // Bounds
        if (game.player.x < 0) game.player.x = 0;
        if (game.player.x > canvas.width - game.player.width) game.player.x = canvas.width - game.player.width;
        
        // Platform collision
        game.player.onGround = false;
        game.platforms.forEach(platform => {
            if (game.player.x < platform.x + platform.width &&
                game.player.x + game.player.width > platform.x &&
                game.player.y < platform.y + platform.height &&
                game.player.y + game.player.height > platform.y) {
                
                if (game.player.vy > 0) {
                    game.player.y = platform.y - game.player.height;
                    game.player.vy = 0;
                    game.player.onGround = true;
                }
            }
        });
        
        render();
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background
        ctx.fillStyle = '#000080';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render entities
        game.entities.forEach(entity => {
            entity.render(ctx);
        });
        
        // Player (Mario)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(game.player.x + 2, game.player.y, game.player.width - 4, 8);
        
        // Donkey Kong
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(game.donkeyKong.x, game.donkeyKong.y, game.donkeyKong.width, game.donkeyKong.height);
        ctx.fillStyle = '#D2691E';
        ctx.fillRect(game.donkeyKong.x + 8, game.donkeyKong.y + 8, 24, 16);
        
        // Princess
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(game.princess.x, game.princess.y, game.princess.width, game.princess.height);
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(game.princess.x, game.princess.y + 15, game.princess.width, 15);
    }
    
    // Controls
    document.addEventListener('keydown', (e) => {
        if (!game.gameRunning) return;
        
        game.keys[e.key] = true;
        
        if (e.key === 'ArrowUp' && game.player.onGround) {
            game.player.vy = -12;
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        game.keys[e.key] = false;
        e.preventDefault();
    });
    
    // Initialize
    await loadLevel();
    
    gameArea.innerHTML = '';
    gameArea.appendChild(canvas);
    
    const startButton = document.createElement('button');
    startButton.textContent = 'Start Game';
    startButton.onclick = () => {
        if (!game.gameRunning) {
            game.gameRunning = true;
            game.gameInterval = setInterval(gameLoop, 16);
            startButton.textContent = 'Stop Game';
        } else {
            game.gameRunning = false;
            clearInterval(game.gameInterval);
            startButton.textContent = 'Start Game';
        }
    };
    
    gameArea.appendChild(startButton);
    
    return {
        cleanup: () => {
            if (game.gameInterval) {
                clearInterval(game.gameInterval);
            }
            game.gameRunning = false;
        }
    };
}
