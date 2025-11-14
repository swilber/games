// Custom Entity-Based Donkey Kong with Enhanced ASCII Maps

// Theme System
const DKThemes = {
    girders: {
        name: 'Girders',
        platforms: '#FF1493', // Hot pink
        ladders: '#00BFFF',   // Deep sky blue
        background: '#000000'  // Black
    },
    elevators: {
        name: 'Elevators', 
        platforms: '#FF1493', // Hot pink (same as girders for now)
        ladders: '#00BFFF',   // Deep sky blue (same as girders for now)
        background: '#000000'  // Black
    },
    factory: {
        name: 'Factory',
        platforms: '#8B4513', // Saddle brown
        ladders: '#FFD700',   // Gold
        background: '#1a1a1a'  // Dark gray
    },
    rivets: {
        name: 'Rivets',
        platforms: '#DC143C', // Crimson
        ladders: '#32CD32',   // Lime green
        background: '#000080'  // Navy blue
    }
};

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
    constructor(x, y, width, height, angle = 0, theme = 'girders') {
        super(x, y, width, height, 'platform');
        this.angle = angle; // Keep for reference but don't use in rendering
        this.theme = theme;
    }
    
    render(ctx) {
        // Get theme colors
        const themeColors = DKThemes[this.theme] || DKThemes.girders;
        const platformColor = themeColors.platforms;
        
        // Neon platform with rivets (always drawn straight)
        ctx.strokeStyle = platformColor;
        ctx.lineWidth = 4; // Thick lines
        
        // Top and bottom bars (straight)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.stroke();
        
        // Zigzag pattern through middle (straight)
        const bottomY = this.y + this.height - 2;
        const topY = this.y + 2;
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
        
        // Rivets (straight positioning)
        ctx.fillStyle = platformColor;
        for (let x = this.x + 10; x < this.x + this.width - 5; x += 20) {
            ctx.fillRect(x, this.y + 2, 2, 2);
            ctx.fillRect(x, this.y + this.height - 4, 2, 2);
        }
    }
}

class DKLadder extends DKEntity {
    constructor(x, y, width, height, theme = 'girders') {
        super(x, y, width, height, 'ladder');
        this.theme = theme;
    }
    
    render(ctx) {
        // Get theme colors
        const themeColors = DKThemes[this.theme] || DKThemes.girders;
        const ladderColor = themeColors.ladders;
        
        // Neon ladder
        ctx.strokeStyle = ladderColor;
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

class DKBarrel extends DKEntity {
    constructor(x, y, isBlue = false) {
        super(x, y, 16, 16, 'barrel'); // Small enough for Mario to jump over
        this.vx = 2; // Rolling speed
        this.vy = 0;
        this.isBlue = isBlue;
        this.onGround = false;
    }
    
    render(ctx) {
        // Barrel color
        const barrelColor = this.isBlue ? '#4169E1' : '#8B4513'; // Royal blue or saddle brown
        const shadowColor = this.isBlue ? '#191970' : '#654321'; // Darker shades
        
        // Main barrel body (circle)
        ctx.fillStyle = barrelColor;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Barrel bands (horizontal lines for shading)
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 2, this.y + 4);
        ctx.lineTo(this.x + this.width - 2, this.y + 4);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x + 2, this.y + this.height - 4);
        ctx.lineTo(this.x + this.width - 2, this.y + this.height - 4);
        ctx.stroke();
        
        // Highlight (top-left curve for 3D effect)
        ctx.strokeStyle = this.isBlue ? '#6495ED' : '#CD853F';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2 - 2, Math.PI, Math.PI * 1.5);
        ctx.stroke();
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
    static async loadMap(mapPath, theme = 'girders') {
        const cacheBuster = Date.now();
        const response = await fetch(`${mapPath}?t=${cacheBuster}`);
        const mapText = await response.text();
        return this.parseMap(mapText, theme);
    }
    
    static parseMap(mapText, theme = 'girders') {
        const lines = mapText.split('\n');
        const entities = [];
        
        const canvasWidth = 600;
        const canvasHeight = 500;
        const mapWidth = Math.max(...lines.map(line => line.length));
        const mapHeight = lines.length;
        
        const tileWidth = canvasWidth / mapWidth;
        const tileHeight = canvasHeight / mapHeight;
        
        // First pass: create platforms and collect their positions
        const platforms = [];
        
        lines.forEach((line, row) => {
            for (let col = 0; col < line.length; col++) {
                const char = line[col];
                const x = col * tileWidth;
                let y = row * tileHeight;
                
                // Adjust Y position for slanted platforms every 2 cells
                const cellPair = Math.floor(col / 2);
                let yOffset = 0;
                
                switch (char) {
                    case '-':
                        const flatPlatform = new DKPlatform(x, y, tileWidth, tileHeight, 0, theme);
                        entities.push(flatPlatform);
                        platforms.push({x, y, width: tileWidth, height: tileHeight});
                        break;
                    case '/':
                        yOffset = cellPair * -1;
                        const upPlatform = new DKPlatform(x, y + yOffset, tileWidth, tileHeight, 0.1, theme);
                        entities.push(upPlatform);
                        platforms.push({x, y: y + yOffset, width: tileWidth, height: tileHeight});
                        break;
                    case '\\':
                        yOffset = cellPair * 1;
                        const downPlatform = new DKPlatform(x, y + yOffset, tileWidth, tileHeight, -0.1, theme);
                        entities.push(downPlatform);
                        platforms.push({x, y: y + yOffset, width: tileWidth, height: tileHeight});
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
        
        // Second pass: create ladders with proper heights
        lines.forEach((line, row) => {
            for (let col = 0; col < line.length; col++) {
                const char = line[col];
                if (char === 'H') {
                    const x = col * tileWidth;
                    const y = row * tileHeight;
                    
                    // Find the closest platform above and below this ladder position
                    let platformBelow = null;
                    let platformAbove = null;
                    
                    // Find closest platform below (smallest y > current y)
                    let minDistanceBelow = Infinity;
                    platforms.forEach(p => {
                        if (Math.abs(p.x - x) < tileWidth/2 && p.y > y) {
                            const distance = p.y - y;
                            if (distance < minDistanceBelow) {
                                minDistanceBelow = distance;
                                platformBelow = p;
                            }
                        }
                    });
                    
                    // Find closest platform above (largest y < current y)
                    let minDistanceAbove = Infinity;
                    platforms.forEach(p => {
                        if (Math.abs(p.x - x) < tileWidth/2 && p.y < y) {
                            const distance = y - p.y;
                            if (distance < minDistanceAbove) {
                                minDistanceAbove = distance;
                                platformAbove = p;
                            }
                        }
                    });
                    
                    let ladderY = y;
                    let ladderHeight = tileHeight;
                    
                    if (platformAbove && platformBelow) {
                        // Ladder spans from bottom of upper platform to top of lower platform (original way)
                        ladderY = platformAbove.y + platformAbove.height;
                        ladderHeight = platformBelow.y - ladderY;
                    } else if (platformBelow) {
                        // Ladder goes from current position to top of platform below
                        ladderHeight = platformBelow.y - y;
                    } else if (platformAbove) {
                        // Ladder goes from bottom of platform above to current position
                        ladderY = platformAbove.y + platformAbove.height;
                        ladderHeight = y + tileHeight - ladderY;
                    }
                    
                    // Ensure minimum ladder height
                    if (ladderHeight < 20) ladderHeight = 20;
                    
                    entities.push(new DKLadder(x, ladderY, tileWidth, ladderHeight, theme));
                }
            }
        });
        
        return entities;
    }
}

// Level Configuration
const DKLevels = {
    1: { name: 'Girders', file: 'level1.map', theme: 'girders' },
    2: { name: 'Elevators', file: 'level2.map', theme: 'elevators' }
};

async function createDonkeyKongGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load configuration
    let dkConfig = {};
    if (typeof configManager !== 'undefined') {
        dkConfig = await configManager.loadConfig('donkeykong');
    }
    
    // Check if unlock all levels is enabled
    const unlockAllLevels = dkConfig.unlockAllLevels || settings?.unlockAllLevels || 
                           dkConfig.gameplay?.unlockAllLevels || false;
    
    console.log('Donkey Kong - unlockAllLevels:', unlockAllLevels);
    console.log('dkConfig:', dkConfig);
    console.log('settings:', settings);
    
    // Temporary: Force level selection for testing
    // Remove this line once configuration is working
    // if (true) {
    
    if (unlockAllLevels) {
        // Show level selection dialog
        console.log('About to show level selection');
        
        // Simple inline level selection instead of separate function
        gameArea.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #FFFFFF; font-family: Arial, sans-serif; background: #000; min-height: 400px;">
                <h1 style="color: #FF1493; font-size: 36px; margin-bottom: 30px;">DONKEY KONG</h1>
                <h2 style="color: #00BFFF; font-size: 24px; margin-bottom: 40px;">SELECT LEVEL</h2>
                <button onclick="window.loadDKLevel(1)" 
                        style="background: #FF1493; color: #000; border: 2px solid #00BFFF; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 1: Girders
                </button>
                <button onclick="window.loadDKLevel(2)" 
                        style="background: #FF1493; color: #000; border: 2px solid #00BFFF; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 2: Elevators
                </button>
            </div>
        `;
        
        // Simple global function
        window.loadDKLevel = (levelNum) => {
            console.log('Loading level:', levelNum);
            const levelConfig = DKLevels[levelNum] || DKLevels[1];
            createDonkeyKongLevel(levelNum, gameArea, settings, callbacks);
        };
        
        console.log('Level selection shown successfully');
        return {
            cleanup: () => {
                // Clean up global function when game is closed
                if (window.loadDKLevel) {
                    delete window.loadDKLevel;
                }
            }
        };
    } else {
        // Load default level 1
        return createDonkeyKongLevel(1, gameArea, settings, callbacks);
    }
}

function showLevelSelection(gameArea, settings, callbacks) {
    console.log('showLevelSelection called');
    console.log('gameArea:', gameArea);
    console.log('Available levels:', Object.keys(DKLevels));
    
    const levelSelectionHTML = `
        <div style="text-align: center; padding: 50px; color: #FFFFFF; font-family: 'Courier New', monospace; background: #000; min-height: 400px;">
            <h1 style="color: #FF1493; font-size: 36px; margin-bottom: 30px;">DONKEY KONG</h1>
            <h2 style="color: #00BFFF; font-size: 24px; margin-bottom: 40px;">SELECT LEVEL</h2>
            <div id="level-buttons" style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                ${Object.entries(DKLevels).map(([num, level]) => `
                    <button onclick="loadDonkeyKongLevel(${num})" 
                            style="background: #FF1493; color: #000; border: 2px solid #00BFFF; 
                                   padding: 15px 30px; font-size: 18px; font-family: 'Courier New', monospace;
                                   cursor: pointer; min-width: 200px;">
                        Level ${num}: ${level.name}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    console.log('Setting gameArea innerHTML');
    gameArea.innerHTML = levelSelectionHTML;
    
    console.log('gameArea after setting innerHTML:', gameArea.innerHTML.substring(0, 100));
    
    // Check if content is still there after a delay
    setTimeout(() => {
        console.log('gameArea content after 1 second:', gameArea.innerHTML.substring(0, 100));
    }, 1000);
    
    // Make level loading function globally available
    window.loadDonkeyKongLevel = (levelNum) => {
        console.log('Loading level:', levelNum);
        createDonkeyKongLevel(levelNum, gameArea, settings, callbacks);
    };
    
    console.log('Level selection setup complete');
}

async function createDonkeyKongLevel(levelNum, gameArea, settings, callbacks) {
    console.log('createDonkeyKongLevel called with level:', levelNum);
    
    // Load configuration
    let dkConfig = {};
    if (typeof configManager !== 'undefined') {
        dkConfig = await configManager.loadConfig('donkeykong');
    }
    
    // Get level configuration
    const levelConfig = DKLevels[levelNum] || DKLevels[1];
    console.log('Using level config:', levelConfig);
    
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
        barrels: [],
        oildrums: [],
        hammers: [],
        player: { x: 50, y: 450, vx: 0, vy: 0, onGround: false, width: 20, height: 30, lives: 3 },
        donkeyKong: { x: 50, y: 50, width: 40, height: 40 },
        princess: { x: 550, y: 50, width: 20, height: 30 },
        barrelTimer: 0,
        barrelThrowRate: 120, // Configurable: frames between barrel throws
        gameRunning: false,
        gameInterval: null,
        keys: {}
    };
    
    async function loadLevel() {
        const entities = await DKMapParser.loadMap(`/games/donkeykong/maps/${levelConfig.file}`, levelConfig.theme);
        
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
        
        // Store current theme for background rendering
        game.currentTheme = levelConfig.theme;
        
        render();
    }
    
    function gameLoop() {
        if (!game.gameRunning) return;
        
        // Donkey Kong throws barrels
        game.barrelTimer++;
        if (game.barrelTimer >= game.barrelThrowRate) {
            game.barrelTimer = 0;
            const isBlue = Math.random() < 0.3; // 30% chance for blue barrel
            const barrel = new DKBarrel(game.donkeyKong.x + 20, game.donkeyKong.y + 40, isBlue);
            game.barrels.push(barrel);
        }
        
        // Update barrels
        game.barrels.forEach((barrel, index) => {
            // Barrel physics
            barrel.vy += 0.5; // Gravity
            barrel.x += barrel.vx;
            barrel.y += barrel.vy;
            
            // Screen edge collision (turn around)
            if (barrel.x <= 0 || barrel.x >= canvas.width - barrel.width) {
                barrel.vx = -barrel.vx;
            }
            
            // Platform collision
            barrel.onGround = false;
            game.platforms.forEach(platform => {
                if (barrel.x < platform.x + platform.width &&
                    barrel.x + barrel.width > platform.x &&
                    barrel.y < platform.y + platform.height &&
                    barrel.y + barrel.height > platform.y) {
                    
                    if (barrel.vy > 0) {
                        barrel.y = platform.y - barrel.height;
                        barrel.vy = 0;
                        barrel.onGround = true;
                    }
                }
            });
            
            // Remove barrels that fall off screen
            if (barrel.y > canvas.height + 50) {
                game.barrels.splice(index, 1);
            }
        });
        
        // Check barrel-Mario collision
        game.barrels.forEach(barrel => {
            if (game.player.x < barrel.x + barrel.width &&
                game.player.x + game.player.width > barrel.x &&
                game.player.y < barrel.y + barrel.height &&
                game.player.y + game.player.height > barrel.y) {
                
                // Mario hit by barrel - lose life and restart
                game.player.lives--;
                if (game.player.lives <= 0) {
                    // Game over
                    game.gameRunning = false;
                    clearInterval(game.gameInterval);
                    
                    ctx.fillStyle = '#FF0000';
                    ctx.font = '48px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2);
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '24px Arial';
                    ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 50);
                    return;
                } else {
                    // Restart level - reset Mario position and clear barrels
                    game.player.x = 50;
                    game.player.y = 450;
                    game.player.vx = 0;
                    game.player.vy = 0;
                    game.player.onGround = false;
                    game.barrels = []; // Clear all barrels
                    game.barrelTimer = 0;
                }
            }
        });
        
        // Check if Mario is on a ladder (center must be touching ladder center)
        const marioCenter = game.player.x + game.player.width / 2;
        const onLadder = game.ladders.some(ladder => {
            const ladderCenter = ladder.x + ladder.width / 2;
            const ladderCenterZone = ladder.width * 0.6; // 60% of ladder width for center zone
            
            return Math.abs(marioCenter - ladderCenter) < ladderCenterZone / 2 &&
                   game.player.y < ladder.y + ladder.height &&
                   game.player.y + game.player.height > ladder.y;
        });
        
        // Also check if there's a ladder that starts at Mario's level and goes down
        const ladderBelow = game.ladders.some(ladder => {
            const ladderCenter = ladder.x + ladder.width / 2;
            const ladderCenterZone = ladder.width * 0.6;
            
            const centerMatch = Math.abs(marioCenter - ladderCenter) < ladderCenterZone / 2;
            // Ladder should start at or near Mario's platform level and extend downward
            const startsAtMarioLevel = Math.abs(ladder.y - (game.player.y + game.player.height)) < 20;
            const extendsDown = ladder.y + ladder.height > game.player.y + game.player.height + 30;
            
            return centerMatch && startsAtMarioLevel && extendsDown;
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
        } else if (ladderBelow && game.keys['ArrowDown']) {
            // Allow Mario to start climbing down when there's a ladder below him
            game.player.vy = 3;
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
        
        // Check if Mario reached the Princess (level complete)
        if (game.player.x < game.princess.x + game.princess.width &&
            game.player.x + game.player.width > game.princess.x &&
            game.player.y < game.princess.y + game.princess.height &&
            game.player.y + game.player.height > game.princess.y) {
            
            // Level complete!
            game.gameRunning = false;
            clearInterval(game.gameInterval);
            
            // Show completion message
            ctx.fillStyle = '#FFFF00';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL COMPLETE!', canvas.width / 2, canvas.height / 2);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '24px Arial';
            ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 50);
            
            return; // Stop game loop
        }
        
        render();
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Theme-based background
        const themeColors = DKThemes[game.currentTheme || 'girders'] || DKThemes.girders;
        ctx.fillStyle = themeColors.background;
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
        
        // Render barrels
        game.barrels.forEach(barrel => {
            barrel.render(ctx);
        });
        
        // Display lives and level info
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Lives: ${game.player.lives}`, 10, 25);
        ctx.fillText(`Level ${game.currentLevel}: ${DKLevels[game.currentLevel]?.name || 'Unknown'}`, 10, 45);
    }
    
    // Controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Return to level selection if unlock all levels is enabled
            const unlockAllLevels = dkConfig.unlockAllLevels || settings?.unlockAllLevels || false;
            if (unlockAllLevels) {
                game.gameRunning = false;
                if (game.gameInterval) {
                    clearInterval(game.gameInterval);
                }
                showLevelSelection(gameArea, settings, callbacks);
                return;
            }
        }
        
        if (!game.gameRunning && e.key === 'r') {
            // Restart game
            location.reload();
            return;
        }
        
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
