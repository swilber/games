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
        // Neon pink platform with rivets
        ctx.strokeStyle = '#FF1493'; // Hot pink
        ctx.lineWidth = 4; // Thicker lines
        
        // Top and bottom bars
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.stroke();
        
        // Zigzag pattern through middle (single ^ per cell)
        const bottomY = this.y + this.height - 2; // Touch bottom rivet
        const topY = this.y + 2; // Touch top rivet
        const peakX = this.x + this.width / 2;
        
        // Draw two separate lines to avoid filling
        ctx.beginPath();
        ctx.moveTo(this.x, bottomY);
        ctx.lineTo(peakX, topY); // Left side of ^
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(peakX, topY);
        ctx.lineTo(this.x + this.width, bottomY); // Right side of ^
        ctx.stroke();
        
        // Rivets
        ctx.fillStyle = '#FF1493';
        for (let x = this.x + 10; x < this.x + this.width - 5; x += 20) {
            ctx.fillRect(x, this.y + 2, 2, 2);
            ctx.fillRect(x, this.y + this.height - 4, 2, 2);
        }
    }
}

class DKLadder extends DKEntity {
    constructor(x, y, width, height) {
        super(x, y, width, height, 'ladder');
    }
    
    render(ctx) {
        // Neon blue ladder
        ctx.strokeStyle = '#00BFFF'; // Deep sky blue
        ctx.lineWidth = 4; // Thicker lines
        
        // Side rails
        ctx.beginPath();
        ctx.moveTo(this.x + 2, this.y);
        ctx.lineTo(this.x + 2, this.y + this.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x + this.width - 2, this.y);
        ctx.lineTo(this.x + this.width - 2, this.y + this.height);
        ctx.stroke();
        
        // Rungs
        for (let y = this.y + 8; y < this.y + this.height; y += 12) {
            ctx.beginPath();
            ctx.moveTo(this.x + 2, y);
            ctx.lineTo(this.x + this.width - 2, y);
            ctx.stroke();
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
                        entities.push(new DKPlatform(x, y, tileWidth, tileHeight, 0));
                        break;
                    case '/':
                        entities.push(new DKPlatform(x, y, tileWidth, tileHeight, 0.1));
                        break;
                    case '\\':
                        entities.push(new DKPlatform(x, y, tileWidth, tileHeight, -0.1));
                        break;
                    case 'H':
                        entities.push(new DKLadder(x, y, tileWidth, tileHeight));
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
        const entities = await DKMapParser.loadMap('/games/donkeykong/maps/level1.map');
        
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
        
        // Check if Mario is on a ladder (center must be touching ladder center)
        const marioCenter = game.player.x + game.player.width / 2;
        const onLadder = game.ladders.some(ladder => {
            const ladderCenter = ladder.x + ladder.width / 2;
            const ladderCenterZone = ladder.width * 0.6; // 60% of ladder width for center zone
            
            return Math.abs(marioCenter - ladderCenter) < ladderCenterZone / 2 &&
                   game.player.y < ladder.y + ladder.height &&
                   game.player.y + game.player.height > ladder.y;
        });
        
        // Handle movement
        if (game.keys['ArrowLeft']) {
            game.player.vx = -3;
        } else if (game.keys['ArrowRight']) {
            game.player.vx = 3;
        } else {
            game.player.vx = 0;
        }
        
        // Handle ladder climbing (disable gravity when on ladder)
        if (onLadder) {
            if (game.keys['ArrowUp']) {
                game.player.vy = -3;
            } else if (game.keys['ArrowDown']) {
                game.player.vy = 3;
            } else {
                game.player.vy = 0; // Stop vertical movement when not pressing up/down
            }
        } else {
            // Only apply gravity when not on ladder
            game.player.vy += 0.5;
        }
        
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;
        
        // Bounds
        if (game.player.x < 0) game.player.x = 0;
        if (game.player.x > canvas.width - game.player.width) game.player.x = canvas.width - game.player.width;
        
        // Platform collision (only when not on ladder)
        if (!onLadder) {
            game.player.onGround = false;
            game.platforms.forEach(platform => {
                if (game.player.x < platform.x + platform.width &&
                    game.player.x + game.player.width > platform.x &&
                    game.player.y + game.player.height >= platform.y &&
                    game.player.y + game.player.height <= platform.y + platform.height + 5) {
                    
                    // Only land on platform if Mario is falling (vy > 0) and his feet hit the top
                    if (game.player.vy > 0 && game.player.y + game.player.height >= platform.y) {
                        game.player.y = platform.y - game.player.height;
                        game.player.vy = 0;
                        game.player.onGround = true;
                    }
                }
            });
        }
        
        render();
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Black background (original arcade style)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render entities
        game.entities.forEach(entity => {
            entity.render(ctx);
        });
        
        // Mario (original red/blue sprite style)
        const marioX = game.player.x;
        const marioY = game.player.y;
        const marioW = game.player.width;
        const marioH = game.player.height;
        
        // Mario's hat (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(marioX + 2, marioY, marioW - 4, 8);
        
        // Mario's face (peach)
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(marioX + 4, marioY + 6, marioW - 8, 6);
        
        // Mario's shirt (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(marioX + 2, marioY + 12, marioW - 4, 8);
        
        // Mario's overalls (blue)
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(marioX + 3, marioY + 20, marioW - 6, 6);
        
        // Mario's legs (blue)
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(marioX + 2, marioY + 26, 6, 4);
        ctx.fillRect(marioX + marioW - 8, marioY + 26, 6, 4);
        
        // Donkey Kong (brown gorilla with tie)
        const dkX = game.donkeyKong.x;
        const dkY = game.donkeyKong.y;
        const dkW = game.donkeyKong.width;
        const dkH = game.donkeyKong.height;
        
        // DK's body (brown)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(dkX, dkY + 8, dkW, dkH - 8);
        
        // DK's head (brown)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(dkX + 8, dkY, dkW - 16, 16);
        
        // DK's face (lighter brown)
        ctx.fillStyle = '#D2691E';
        ctx.fillRect(dkX + 12, dkY + 4, dkW - 24, 8);
        
        // DK's tie (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(dkX + dkW/2 - 3, dkY + 16, 6, 16);
        
        // DK's arms
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(dkX - 4, dkY + 12, 8, 12);
        ctx.fillRect(dkX + dkW - 4, dkY + 12, 8, 12);
        
        // Princess Peach (pink dress, blonde hair)
        const pX = game.princess.x;
        const pY = game.princess.y;
        const pW = game.princess.width;
        const pH = game.princess.height;
        
        // Princess's hair (blonde)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(pX + 2, pY, pW - 4, 8);
        
        // Princess's face (peach)
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(pX + 4, pY + 6, pW - 8, 6);
        
        // Princess's dress (pink)
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(pX, pY + 12, pW, pH - 12);
        
        // Princess's dress details (hot pink)
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(pX + 2, pY + 16, pW - 4, 2);
        ctx.fillRect(pX + 2, pY + 22, pW - 4, 2);
    }
    
    // Controls
    document.addEventListener('keydown', (e) => {
        if (!game.gameRunning) return;
        
        game.keys[e.key] = true;
        
        if (e.key === ' ' && game.player.onGround) {
            game.player.vy = -6; // Reduced to jump ~3 grid cells high
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
    
    // Auto-start game
    game.gameRunning = true;
    game.gameInterval = setInterval(gameLoop, 16);
    
    return {
        cleanup: () => {
            if (game.gameInterval) {
                clearInterval(game.gameInterval);
            }
            game.gameRunning = false;
        }
    };
}
