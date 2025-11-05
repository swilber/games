// Mario Game - Theme system and sprite rendering

// Entity System - Phase 1: Run alongside existing code
class Entity {
    constructor(id = null) {
        this.id = id || Math.random().toString(36).substr(2, 9);
        this.components = new Map();
        this.active = true;
    }
    
    add(name, component) {
        this.components.set(name, component);
        return this;
    }
    
    get(name) {
        return this.components.get(name);
    }
    
    has(name) {
        return this.components.has(name);
    }
}

class Transform {
    constructor(x = 0, y = 0, width = 16, height = 16) {
        this.x = x; this.y = y; this.width = width; this.height = height;
    }
}

class Physics {
    constructor(vx = 0, vy = 0) {
        this.vx = vx; this.vy = vy; this.gravity = 0.5; this.onGround = false;
    }
}

class Sprite {
    constructor(color = '#FF0000') {
        this.color = color; this.facingRight = true;
    }
}

class AI {
    constructor(type = 'patrol') {
        this.type = type; this.direction = -1; this.state = 'active';
    }
}

class EntityManager {
    constructor() {
        this.entities = new Map();
        this.systems = [];
    }
    
    create(id = null) {
        const entity = new Entity(id);
        this.entities.set(entity.id, entity);
        return entity;
    }
    
    query(...componentNames) {
        return Array.from(this.entities.values()).filter(entity =>
            componentNames.every(name => entity.has(name))
        );
    }
    
    addSystem(system) {
        this.systems.push(system);
    }
    
    update() {
        this.systems.forEach(system => system.update(this));
    }
}

class PhysicsSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const entities = entityManager.query('transform', 'physics');
        entities.forEach(entity => {
            const transform = entity.get('transform');
            const physics = entity.get('physics');
            
            // Apply gravity
            physics.vy += physics.gravity;
            
            // Update position
            transform.x += physics.vx;
            transform.y += physics.vy;
            
            // Platform collision - check all platforms and blocks
            physics.onGround = false;
            const allSolids = [...this.game.platforms, ...this.game.blocks];
            
            allSolids.forEach(solid => {
                if (transform.x < solid.x + solid.width &&
                    transform.x + transform.width > solid.x &&
                    transform.y < solid.y + solid.height &&
                    transform.y + transform.height > solid.y) {
                    
                    // Landing on top
                    if (physics.vy > 0 && transform.y < solid.y) {
                        transform.y = solid.y - transform.height;
                        physics.vy = 0;
                        physics.onGround = true;
                    }
                    // Hitting from below
                    else if (physics.vy < 0 && transform.y > solid.y) {
                        transform.y = solid.y + solid.height;
                        physics.vy = 0;
                    }
                    // Side collision
                    else if (physics.vx > 0 && transform.x < solid.x) {
                        transform.x = solid.x - transform.width;
                        physics.vx *= -1; // Reverse direction for enemies
                    }
                    else if (physics.vx < 0 && transform.x > solid.x) {
                        transform.x = solid.x + solid.width;
                        physics.vx *= -1; // Reverse direction for enemies
                    }
                }
            });
            
            // Screen boundaries
            if (transform.x <= 0) {
                transform.x = 0;
                physics.vx *= -1;
            }
            if (transform.x >= this.game.levelWidth - transform.width) {
                transform.x = this.game.levelWidth - transform.width;
                physics.vx *= -1;
            }
        });
    }
}

class AISystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const entities = entityManager.query('transform', 'physics', 'ai');
        entities.forEach(entity => {
            const transform = entity.get('transform');
            const physics = entity.get('physics');
            const ai = entity.get('ai');
            
            if (ai.type === 'patrol') {
                physics.vx = ai.direction;
                
                // Reverse at level boundaries
                if (transform.x <= 0 || transform.x >= this.game.levelWidth - transform.width) {
                    ai.direction *= -1;
                }
                
                // Reverse at platform edges (simplified)
                let foundGround = false;
                this.game.platforms.forEach(platform => {
                    const checkX = transform.x + (ai.direction > 0 ? transform.width + 10 : -10);
                    if (checkX >= platform.x && checkX <= platform.x + platform.width &&
                        transform.y + transform.height >= platform.y - 20 &&
                        transform.y + transform.height <= platform.y + 20) {
                        foundGround = true;
                    }
                });
                
                if (!foundGround && physics.onGround) {
                    ai.direction *= -1;
                }
            }
        });
    }
}

class CollisionSystem {
    constructor(game, resetLevel) {
        this.game = game;
        this.resetLevel = resetLevel;
    }
    
    update(entityManager) {
        const goombaEntities = entityManager.query('transform', 'ai');
        
        goombaEntities.forEach(entity => {
            const transform = entity.get('transform');
            
            // Check collision with player (both in world coordinates)
            if (!this.game.player.invincible &&
                this.game.player.x < transform.x + transform.width &&
                this.game.player.x + this.game.player.width > transform.x &&
                this.game.player.y < transform.y + transform.height &&
                this.game.player.y + this.game.player.height > transform.y) {
                
                if (this.game.player.vy > 0 && this.game.player.y < transform.y) {
                    // Stomp goomba
                    entityManager.entities.delete(entity.id);
                    this.game.player.vy = -8;
                    this.game.player.score += 100;
                    console.log('Stomped goomba entity!');
                } else {
                    // Take damage
                    if (this.game.player.powerState === 'big' || this.game.player.powerState === 'fire') {
                        this.game.player.powerState = 'small';
                        this.game.player.width = 16;
                        this.game.player.height = 16;
                        this.game.player.y += 16;
                    } else {
                        this.game.player.lives--;
                        if (this.game.player.lives <= 0) {
                            this.game.gameOver = true;
                        } else {
                            this.resetLevel();
                        }
                    }
                    this.game.player.invincible = true;
                    this.game.player.invincibleTimer = 120;
                }
            }
        });
    }
}

class RenderSystem {
    constructor(spriteRenderer) {
        this.spriteRenderer = spriteRenderer;
    }
    
    render(ctx, entityManager) {
        const entities = entityManager.query('transform', 'sprite', 'ai');
        entities.forEach(entity => {
            const transform = entity.get('transform');
            
            // Create a fake enemy object for the sprite renderer
            const fakeEnemy = {
                x: transform.x,
                y: transform.y,
                width: transform.width,
                height: transform.height,
                type: 'goomba',
                alive: true
            };
            
            // Use the existing goomba sprite renderer
            this.spriteRenderer.enemies.goomba(ctx, fakeEnemy);
        });
    }
}

// ASCII Map Converter
const convertASCIIToLevel = (asciiLines) => {
    console.log('Converting ASCII lines:', asciiLines.length, 'lines');
    console.log('All lines:');
    asciiLines.forEach((line, i) => {
        console.log(`Line ${i}: "${line.substring(0, 50)}..." (length: ${line.length})`);
        // Show unique characters in this line
        const uniqueChars = [...new Set(line.split(''))].sort();
        console.log(`  Unique chars: [${uniqueChars.join(', ')}]`);
        
        // Count specific characters we're looking for
        const counts = {
            'G': (line.match(/G/g) || []).length,
            'K': (line.match(/K/g) || []).length,
            'B': (line.match(/B/g) || []).length,
            '?': (line.match(/\?/g) || []).length,
            'X': (line.match(/X/g) || []).length,
            'P': (line.match(/P/g) || []).length,
            '#': (line.match(/#/g) || []).length
        };
        if (Object.values(counts).some(c => c > 0)) {
            console.log(`  Character counts:`, counts);
        }
    });
    
    const level = { tiles: [], enemies: [], blocks: [], width: 0, castle: null };
    
    // Find ground line (line with # symbols)
    const groundLineIndex = asciiLines.findIndex(line => line.includes('#'));
    console.log('Ground line found at index:', groundLineIndex);
    
    if (groundLineIndex === -1) {
        console.warn('No ground line found!');
        return level;
    }
    
    const groundLine = asciiLines[groundLineIndex];
    console.log('Ground line content:', `"${groundLine.substring(0, 100)}..."`);
    
    const width = groundLine.length;
    level.width = width;
    console.log('Level width:', width);
    
    // Initialize tiles array
    level.tiles = new Array(width).fill('G');
    
    // Check enemy line (line above ground)
    const enemyLineIndex = groundLineIndex - 1;
    if (enemyLineIndex >= 0) {
        const enemyLine = asciiLines[enemyLineIndex];
        console.log('Enemy line content:', `"${enemyLine.substring(0, 100)}..."`);
        
        // Look for enemies and other elements
        for (let x = 0; x < width && x < enemyLine.length; x++) {
            if (enemyLine[x] === 'G') {
                level.enemies.push({x: x * 16, type: 'goomba'});
                console.log('Found Goomba at position', x);
            }
            if (enemyLine[x] === 'K') {
                level.enemies.push({x: x * 16, type: 'koopa'});
                console.log('Found Koopa at position', x);
            }
            if (enemyLine[x] === 'k') {
                level.enemies.push({x: x * 16, type: 'parakoopa'});
                console.log('Found Parakoopa at position', x);
            }
            if (enemyLine[x] === 'p') {
                level.enemies.push({x: x * 16, y: 320, type: 'piranha'});
                level.tiles[x] = 'p'; // Pipe with piranha
                console.log('Found Piranha Plant at position', x, 'y=320');
            }
            if (enemyLine[x] === 'P') {
                level.tiles[x] = 'p'; // Regular pipe
                console.log('Found Pipe at position', x);
            }
            if (enemyLine[x] === 'F') {
                // Flag position - we'll handle this in the level initialization
                console.log('Found Flag at position', x);
            }
        }
    }
    
    // Process ground line for pits
    for (let x = 0; x < width; x++) {
        if (groundLine[x] === 'X') {
            level.tiles[x] = 'P'; // Pit
            console.log('Found Pit at position', x);
        }
    }
    
    // Check for blocks in upper lines
    console.log(`Checking for blocks in lines 0 to ${groundLineIndex - 2} (ground is at ${groundLineIndex})`);
    for (let y = 0; y < groundLineIndex - 1; y++) {
        const blockLine = asciiLines[y];
        console.log(`Block line ${y} content:`, `"${blockLine.substring(0, 100)}..."`);
        
        // Count blocks in this line
        const bCount = (blockLine.match(/B/g) || []).length;
        const qCount = (blockLine.match(/\?/g) || []).length;
        if (bCount > 0 || qCount > 0) {
            console.log(`  Line ${y} has ${bCount} B's and ${qCount} ?'s`);
        }
        
        for (let x = 0; x < width && x < blockLine.length; x++) {
            if (blockLine[x] === '?') {
                const content = Math.random() > 0.6 ? 'mushroom' : Math.random() > 0.3 ? 'coin' : 'fireflower';
                level.blocks.push({
                    x: x * 16, 
                    y: 272,
                    type: 'question', 
                    content
                });
                console.log('Found Question block at position', x, y);
            }
            if (blockLine[x] === 'B') {
                level.blocks.push({
                    x: x * 16, 
                    y: 272,
                    type: 'brick'
                });
                console.log('Found Brick at position', x, y);
            }
        }
    }
    
    console.log('Final converted level:', {
        width: level.width,
        enemies: level.enemies.length,
        blocks: level.blocks.length
    });
    
    return level;
};

// Load ASCII maps from files


// Fallback map creator
const createFallbackMap = (level) => {
    const themes = { '1-1': 'overworld', '1-2': 'underground', '1-3': 'trees', '1-4': 'castle' };
    return {
        width: 100,
        theme: themes[level],
        tiles: Array(100).fill('G'),
        enemies: [
            {x: 300, type: 'goomba'}, {x: 600, type: 'koopa'}, {x: 900, type: 'goomba'}
        ],
        blocks: [
            {x: 400, y: 208, type: 'question', content: 'coin'},
            {x: 500, y: 208, type: 'brick'},
            {x: 700, y: 208, type: 'question', content: 'mushroom'}
        ]
    };
};

const LevelMapper = {
    GROUND_Y: 370,
    GROUND_HEIGHT: 30,
    TILE_SIZE: 16,
    levels: null, // Will be loaded asynchronously
    
    async init() {
        this.levels = await loadASCIIMaps();
        console.log('LevelMapper.levels loaded:', Object.keys(this.levels));
        console.log('Level 1-1 details:', this.levels['1-1']);
    },
    
    createFromMap: (mapData) => {
        const level = { platforms: [], blocks: [], pits: [], enemies: [], coins: [], castle: null };
        let currentGroundStart = null;
        let currentGroundWidth = 0;
        
        for (let x = 0; x < mapData.width; x++) {
            const tileX = x * LevelMapper.TILE_SIZE;
            const tile = mapData.tiles[x];
            
            if (tile === 'G') {
                if (currentGroundStart === null) {
                    currentGroundStart = tileX;
                    currentGroundWidth = LevelMapper.TILE_SIZE;
                } else {
                    currentGroundWidth += LevelMapper.TILE_SIZE;
                }
            } else {
                if (currentGroundStart !== null) {
                    level.platforms.push({
                        x: currentGroundStart, y: LevelMapper.GROUND_Y,
                        width: currentGroundWidth, height: LevelMapper.GROUND_HEIGHT, type: 'ground'
                    });
                    currentGroundStart = null;
                }
                if (tile === 'P') {
                    level.pits.push({ x: tileX, width: LevelMapper.TILE_SIZE }); // Single tile width pits
                } else if (tile === 'p') {
                    level.platforms.push({
                        x: tileX, y: LevelMapper.GROUND_Y - 50,
                        width: LevelMapper.TILE_SIZE * 2, height: 50 + LevelMapper.GROUND_HEIGHT, type: 'pipe'
                    });
                }
            }
        }
        
        if (currentGroundStart !== null) {
            level.platforms.push({
                x: currentGroundStart, y: LevelMapper.GROUND_Y,
                width: currentGroundWidth, height: LevelMapper.GROUND_HEIGHT, type: 'ground'
            });
        }
        return level;
    }
};

async function createMarioGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    // Debug mode - show level selection menu
    if (settings && settings.debug) {
        const levelSelector = document.createElement('div');
        levelSelector.style.cssText = 'text-align: center; padding: 20px; background: #000; color: #fff;';
        
        const title = document.createElement('h3');
        title.textContent = 'Debug: Select Level';
        title.style.color = '#fff';
        levelSelector.appendChild(title);
        
        const levels = [
            { id: 1, name: 'Level 1-1 (Overworld)', theme: 'overworld' },
            { id: 2, name: 'Level 1-2 (Underground)', theme: 'underground' },
            { id: 3, name: 'Level 1-3 (Trees)', theme: 'trees' },
            { id: 4, name: 'Level 1-4 (Castle)', theme: 'castle' }
        ];
        
        levels.forEach(level => {
            const button = document.createElement('button');
            button.textContent = level.name;
            button.style.cssText = 'margin: 10px; padding: 10px 20px; font-size: 16px; background: #333; color: #fff; border: 2px solid #666; cursor: pointer;';
            button.onmouseover = () => button.style.background = '#555';
            button.onmouseout = () => button.style.background = '#333';
            button.onclick = () => {
                gameArea.removeChild(levelSelector);
                startMarioGame(level.id);
            };
            levelSelector.appendChild(button);
        });
        
        gameArea.appendChild(levelSelector);
        return;
    }
    
    // Normal mode - start with level 3 (current default)
    startMarioGame(3);
    
    function startMarioGame(levelId) {
        // Use only level 1-1 for now
        
        // Use only level 1-1 - no level maps array needed
    
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    
    let game = {
        player: { 
            x: 50, y: 300, width: 16, height: 16, 
            vx: 0, vy: 0, onGround: false, 
            lives: 3, score: 0, powerState: 'small',
            facingRight: true, shootCooldown: 0
        },
        camera: { x: 0 },
        platforms: [],
        blocks: [],
        powerUps: [],
        enemies: [],
        coins: [],
        particles: [],
        fireballs: [],
        pits: [],
        currentLevel: levelId, // Use selected level
        levelsCompleted: 0,
        levelsToWin: 3, // Three levels now
        levelWidth: 4000,
        gameOver: false,
        won: false,
        gameStarted: false,
        keys: {},
        currentTheme: 'overworld',
        frameCount: 0,
        
        // Entity System - Phase 1
        entityManager: new EntityManager(),
        renderSystem: null // Will be initialized after SpriteRenderer is defined
    };
    
    // Theme System - centralized theme configuration
    const Themes = {
        overworld: {
            name: 'Overworld',
            colors: {
                sky: '#5C94FC', // Baby blue
                ground: '#8B4513',
                groundShadow: '#654321',
                pipe: '#00FF00',
                pipeShadow: '#00AA00',
                brick: '#CC6600',
                brickShadow: '#994400',
                question: '#FFD700',
                questionShadow: '#CC9900',
                cloud: '#FFFFFF',
                bush: '#90EE90', // Light green
                hill: '#228B22'  // Darker green
            },
            sprites: {
                platform: 'grass',
                background: 'hills'
            }
        },
        
        underground: {
            name: 'Underground',
            colors: {
                sky: '#000000',
                ground: '#4682B4', // Blue-green tinted ground
                groundShadow: '#2F4F4F', // Darker blue-green shadow
                pipe: '#00AA00',
                pipeShadow: '#007700',
                brick: '#5F9EA0', // Blue-green tinted brick (CadetBlue)
                brickShadow: '#2F4F4F', // Dark blue-green shadow
                question: '#FFD700', // Keep same golden color as overworld
                questionShadow: '#CC9900' // Keep same golden shadow as overworld
            },
            sprites: {
                platform: 'brick',
                background: 'cave'
            }
        },
        
        trees: {
            name: 'Tree Tops',
            colors: {
                sky: '#5C94FC', // Baby blue like overworld
                ground: '#228B22', // Green tree platforms (original)
                groundShadow: '#006400', // Dark green tree platforms (original)
                pipe: '#00FF00',
                pipeShadow: '#00AA00',
                brick: '#CC6600', // Orange like overworld
                brickShadow: '#994400', // Dark orange like overworld
                question: '#FFD700',
                questionShadow: '#CC9900',
                cloud: '#FFFFFF',
                cloudShadow: '#CCCCCC', // Gray for cloud shading
                bush: '#90EE90', // Light green
                hill: '#228B22'  // Darker green
            },
            sprites: {
                platform: 'tree',
                background: 'sky'
            }
        },
        
        castle: {
            name: 'Castle',
            colors: {
                sky: '#000000', // Black background
                ground: '#808080', // Gray brick
                groundShadow: '#404040', // Dark gray
                pipe: '#00FF00',
                pipeShadow: '#00AA00',
                brick: '#808080', // Gray brick
                brickShadow: '#404040', // Dark gray
                question: '#FFD700',
                questionShadow: '#CC9900',
                lava: '#FF4500', // Orange-red lava
                lavaBubble: '#FFFF00' // Yellow bubbles
            },
            sprites: {
                platform: 'brick',
                background: 'castle'
            }
        }
    };
    
    // Theme utilities
    const ThemeSystem = {
        current: null,
        
        setTheme: (themeName) => {
            ThemeSystem.current = Themes[themeName] || Themes.overworld;
        },
        
        getColor: (colorName) => {
            return ThemeSystem.current?.colors[colorName] || '#FF00FF'; // Magenta for missing colors
        },
        
        renderBackground: (ctx, canvas) => {
            // Sky background
            ctx.fillStyle = ThemeSystem.getColor('sky');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add theme-specific background elements
            if (ThemeSystem.current?.name === 'Overworld') {
                // Clouds high in the sky
                ctx.fillStyle = ThemeSystem.getColor('cloud');
                const cloudPositions = [120, 380, 620, 880, 1140, 1400, 1660, 1920];
                cloudPositions.forEach((x, i) => {
                    const cloudX = x - (game.camera?.x || 0) * 0.5; // Parallax effect
                    const cloudY = 60 + (i % 3) * 20; // Varying heights
                    
                    // Cloud shape
                    ctx.fillRect(cloudX, cloudY, 60, 20);
                    ctx.fillRect(cloudX + 10, cloudY - 10, 40, 20);
                    ctx.fillRect(cloudX + 20, cloudY - 20, 20, 20);
                });
                
                // Hills coming out of ground
                ctx.fillStyle = ThemeSystem.getColor('hill');
                const hillPositions = [200, 450, 750, 1100, 1450, 1800];
                hillPositions.forEach((x, i) => {
                    const hillX = x - (game.camera?.x || 0);
                    const hillWidth = 40 + (i % 2) * 20; // Smaller hills
                    const hillHeight = 30 + (i % 3) * 10; // Smaller heights
                    const groundY = canvas.height - 35; // 10 pixels lower (was -45)
                    
                    // Half oval with flat bottom - invert the width calculation
                    for (let y = 0; y < hillHeight; y++) {
                        // Invert: y=0 (top) should be narrow, y=hillHeight (bottom) should be wide
                        const normalizedY = (hillHeight - y) / hillHeight; // 1 at top, 0 at bottom
                        const width = hillWidth * Math.sqrt(1 - normalizedY * normalizedY);
                        ctx.fillRect(hillX - width/2, groundY - hillHeight + y, width, 1);
                    }
                });
                
                // Small bushes coming out of ground
                ctx.fillStyle = ThemeSystem.getColor('bush');
                const bushPositions = [150, 320, 480, 680, 920, 1200, 1380, 1620];
                bushPositions.forEach((x, i) => {
                    const bushX = x - (game.camera?.x || 0);
                    const bushWidth = 30 + (i % 2) * 15; // Varying sizes
                    const bushHeight = 20 + (i % 3) * 10;
                    const groundY = canvas.height - 35; // 10 pixels lower (was -45)
                    
                    // Bush shape - three circles
                    const circleRadius = bushHeight / 3;
                    for (let circle = 0; circle < 3; circle++) {
                        const circleX = bushX + (circle * bushWidth / 3);
                        for (let y = 0; y < circleRadius * 2; y++) {
                            const width = Math.sqrt(circleRadius * circleRadius - (y - circleRadius) * (y - circleRadius)) * 2;
                            ctx.fillRect(circleX - width/2, groundY - y, width, 1);
                        }
                    }
                });
            } else if (ThemeSystem.current?.name === 'Tree Tops') {
                // More clouds at different levels for sky theme
                
                // High clouds
                const highClouds = [100, 320, 540, 760, 980, 1200, 1420, 1640, 1860];
                highClouds.forEach((x, i) => {
                    const cloudX = x - (game.camera?.x || 0) * 0.3; // Slower parallax for distance
                    const cloudY = 40 + (i % 2) * 15;
                    
                    // White cloud body
                    ctx.fillStyle = ThemeSystem.getColor('cloud');
                    ctx.fillRect(cloudX, cloudY, 40, 12);
                    ctx.fillRect(cloudX + 6, cloudY - 6, 28, 12);
                    ctx.fillRect(cloudX + 12, cloudY - 12, 16, 12);
                    
                    // Gray cloud shadow (bottom)
                    ctx.fillStyle = ThemeSystem.getColor('cloudShadow');
                    ctx.fillRect(cloudX, cloudY + 8, 40, 4);
                    ctx.fillRect(cloudX + 6, cloudY + 2, 28, 4);
                    ctx.fillRect(cloudX + 12, cloudY - 4, 16, 4);
                });
                
                // Mid-level clouds
                const midClouds = [200, 450, 700, 950, 1250, 1500, 1750];
                midClouds.forEach((x, i) => {
                    const cloudX = x - (game.camera?.x || 0) * 0.4;
                    const cloudY = 120 + (i % 3) * 20;
                    
                    // White cloud body
                    ctx.fillStyle = ThemeSystem.getColor('cloud');
                    ctx.fillRect(cloudX, cloudY, 48, 14);
                    ctx.fillRect(cloudX + 8, cloudY - 8, 32, 14);
                    ctx.fillRect(cloudX + 16, cloudY - 14, 16, 14);
                    
                    // Gray cloud shadow (bottom)
                    ctx.fillStyle = ThemeSystem.getColor('cloudShadow');
                    ctx.fillRect(cloudX, cloudY + 10, 48, 4);
                    ctx.fillRect(cloudX + 8, cloudY + 2, 32, 4);
                    ctx.fillRect(cloudX + 16, cloudY - 6, 16, 4);
                });
                
                // Lower clouds
                const lowClouds = [80, 380, 620, 880, 1140, 1400, 1660];
                lowClouds.forEach((x, i) => {
                    const cloudX = x - (game.camera?.x || 0) * 0.5;
                    const cloudY = 200 + (i % 2) * 25;
                    
                    // White cloud body
                    ctx.fillStyle = ThemeSystem.getColor('cloud');
                    ctx.fillRect(cloudX, cloudY, 56, 16);
                    ctx.fillRect(cloudX + 10, cloudY - 10, 36, 16);
                    ctx.fillRect(cloudX + 18, cloudY - 16, 20, 16);
                    
                    // Gray cloud shadow (bottom)
                    ctx.fillStyle = ThemeSystem.getColor('cloudShadow');
                    ctx.fillRect(cloudX, cloudY + 12, 56, 4);
                    ctx.fillRect(cloudX + 10, cloudY + 2, 36, 4);
                    ctx.fillRect(cloudX + 18, cloudY - 8, 20, 4);
                });
            }
        },
        
        renderPlatform: (ctx, platform) => {
            if (platform.type === 'moving_up' || platform.type === 'moving_down' || 
                platform.type === 'vertical_moving' || platform.type === 'horizontal_moving') {
                // Pink girder with holes
                ctx.fillStyle = '#FF69B4'; // Hot pink
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                
                // Lighter pink highlight on top and left
                ctx.fillStyle = '#FFB6C1'; // Light pink
                ctx.fillRect(platform.x, platform.y, platform.width, 1); // Top highlight
                ctx.fillRect(platform.x, platform.y, 1, platform.height); // Left highlight
                
                // Darker pink shadow on bottom and right
                ctx.fillStyle = '#C71585'; // Medium violet red
                ctx.fillRect(platform.x, platform.y + platform.height - 1, platform.width, 1); // Bottom shadow
                ctx.fillRect(platform.x + platform.width - 1, platform.y, 1, platform.height); // Right shadow
                
                // Black holes - 2 holes per cell (every 20 pixels)
                ctx.fillStyle = '#000000';
                const holeSize = 2;
                const cellSize = 20; // One cell = 20 pixels
                
                for (let cellX = 0; cellX < platform.width; cellX += cellSize) {
                    const hole1X = platform.x + cellX + 4;
                    const hole2X = platform.x + cellX + 14;
                    const holeY = platform.y + platform.height/2 - holeSize/2;
                    
                    // Only draw holes if they're within the platform bounds
                    if (hole1X + holeSize <= platform.x + platform.width) {
                        ctx.fillRect(hole1X, holeY, holeSize, holeSize);
                    }
                    if (hole2X + holeSize <= platform.x + platform.width) {
                        ctx.fillRect(hole2X, holeY, holeSize, holeSize);
                    }
                }
            } else if (platform.type === 'tree') {
                // Tree platforms are rendered in the main render function as grouped objects
                // Skip individual rendering here
            } else if (platform.type === 'block') {
                // 3D block platform - use overworld colors in Tree Tops theme
                if (ThemeSystem.current?.name === 'Tree Tops') {
                    // Use overworld brown colors
                    ctx.fillStyle = '#8B4513'; // Brown like overworld
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Light brown highlights on top and left
                    ctx.fillStyle = '#DEB887'; // Light brown highlight
                    ctx.fillRect(platform.x, platform.y, platform.width, 2); // Top highlight
                    ctx.fillRect(platform.x, platform.y, 2, platform.height); // Left highlight
                    
                    // Dark brown shadows on bottom and right
                    ctx.fillStyle = '#654321'; // Dark brown shadow
                    ctx.fillRect(platform.x, platform.y + platform.height - 2, platform.width, 2); // Bottom shadow
                    ctx.fillRect(platform.x + platform.width - 2, platform.y, 2, platform.height); // Right shadow
                } else {
                    // Regular theme colors
                    ctx.fillStyle = ThemeSystem.getColor('ground');
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Light highlights on top and left (2px wide)
                    ctx.fillStyle = '#DEB887'; // Light brown highlight
                    ctx.fillRect(platform.x, platform.y, platform.width, 2); // Top highlight
                    ctx.fillRect(platform.x, platform.y, 2, platform.height); // Left highlight
                    
                    // Dark shadows on bottom and right (2px wide)
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    ctx.fillRect(platform.x, platform.y + platform.height - 2, platform.width, 2); // Bottom shadow
                    ctx.fillRect(platform.x + platform.width - 2, platform.y, 2, platform.height); // Right shadow
                }
            } else {
                // Regular ground platform - use brown overworld colors in trees theme
                if (platform.type === 'ground' && ThemeSystem.current?.name === 'Tree Tops') {
                    ctx.fillStyle = '#8B4513'; // Brown like overworld
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Brown shadow
                    ctx.fillStyle = '#654321'; // Dark brown like overworld
                    ctx.fillRect(platform.x, platform.y + platform.height - 3, platform.width, 3);
                } else if (platform.type === 'ground' && ThemeSystem.current?.name === 'Castle') {
                    // Castle ground - gray brick pattern
                    ctx.fillStyle = ThemeSystem.getColor('ground');
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Add brick pattern
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    const brickHeight = 8;
                    const brickWidth = 16;
                    
                    // Horizontal lines
                    for (let row = 0; row < platform.height; row += brickHeight) {
                        ctx.fillRect(platform.x, platform.y + row, platform.width, 1);
                    }
                    
                    // Vertical lines (offset every other row)
                    for (let row = 0; row < platform.height; row += brickHeight) {
                        const offset = (Math.floor(row / brickHeight) % 2) * (brickWidth / 2);
                        for (let col = offset; col < platform.width; col += brickWidth) {
                            ctx.fillRect(platform.x + col, platform.y + row, 1, brickHeight);
                        }
                    }
                    
                    // Ground shadow
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    ctx.fillRect(platform.x, platform.y + platform.height - 3, platform.width, 3);
                } else {
                    // Regular ground platform
                    ctx.fillStyle = ThemeSystem.getColor('ground');
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Ground shadow
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    ctx.fillRect(platform.x, platform.y + platform.height - 3, platform.width, 3);
                }
            }
        },
        
        renderBlock: (ctx, block) => {
            if (block.type === 'question') {
                if (!block.hit) {
                    // Question block
                    ctx.fillStyle = ThemeSystem.getColor('question');
                    ctx.fillRect(block.x, block.y, block.width, block.height);
                    
                    // Question block shadow
                    ctx.fillStyle = ThemeSystem.getColor('questionShadow');
                    ctx.fillRect(block.x, block.y + block.height - 3, block.width, 3);
                    
                    // Question mark
                    ctx.fillStyle = '#000';
                    ctx.fillRect(block.x + 6, block.y + 4, 8, 2);  // Top horizontal line
                    ctx.fillRect(block.x + 12, block.y + 6, 2, 4); // Right vertical line
                    ctx.fillRect(block.x + 8, block.y + 10, 6, 2); // Middle horizontal line
                    ctx.fillRect(block.x + 9, block.y + 12, 2, 2); // Vertical down
                    ctx.fillRect(block.x + 9, block.y + 16, 2, 2); // Dot
                } else {
                    // Used block (darker)
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    ctx.fillRect(block.x, block.y, block.width, block.height);
                }
            } else if (block.type === 'brick') {
                // Brick block
                ctx.fillStyle = ThemeSystem.getColor('brick');
                ctx.fillRect(block.x, block.y, block.width, block.height);
                
                // Brick shadow
                ctx.fillStyle = ThemeSystem.getColor('brickShadow');
                ctx.fillRect(block.x, block.y + block.height - 3, block.width, 3);
                
                // Brick pattern
                ctx.fillStyle = ThemeSystem.getColor('brickShadow');
                ctx.fillRect(block.x + 2, block.y + 2, 16, 1);
                ctx.fillRect(block.x + 2, block.y + 10, 16, 1);
                ctx.fillRect(block.x + 10, block.y + 6, 1, 4);
            }
        }
    };
    
    // Sprite rendering system - defined after ThemeSystem to access theme colors
    const SpriteRenderer = {
        enemies: {
            goomba: (ctx, enemy) => {
                // Theme-aware Goomba colors
                let bodyColor, shadowColor;
                if (ThemeSystem.current?.name === 'Underground') {
                    bodyColor = '#5F9EA0'; // Blue-green tinted
                    shadowColor = '#2F4F4F'; // Dark blue-green
                } else {
                    bodyColor = '#8B4513'; // Normal brown
                    shadowColor = '#654321'; // Normal dark brown
                }
                
                // Goomba body - brown mushroom with proper shape
                ctx.fillStyle = bodyColor;
                ctx.fillRect(enemy.x + 2, enemy.y + 6, 16, 10); // Main body
                ctx.fillRect(enemy.x + 4, enemy.y + 4, 12, 2);  // Top cap
                ctx.fillRect(enemy.x + 6, enemy.y + 2, 8, 2);   // Very top
                
                // Darker brown for shading
                ctx.fillStyle = shadowColor;
                ctx.fillRect(enemy.x + 3, enemy.y + 7, 14, 1);  // Body shadow
                
                // Eyes - white background with black pupils
                ctx.fillStyle = '#FFF';
                ctx.fillRect(enemy.x + 5, enemy.y + 8, 2, 2);
                ctx.fillRect(enemy.x + 13, enemy.y + 8, 2, 2);
                
                // Animated eye pupils
                ctx.fillStyle = '#000';
                const eyeOffset = enemy.animFrame === 0 ? 0 : 1;
                ctx.fillRect(enemy.x + 5 + eyeOffset, enemy.y + 8, 1, 1);
                ctx.fillRect(enemy.x + 14 - eyeOffset, enemy.y + 8, 1, 1);
                
                // Angry eyebrows
                ctx.fillStyle = '#000';
                ctx.fillRect(enemy.x + 5, enemy.y + 7, 3, 1);
                ctx.fillRect(enemy.x + 12, enemy.y + 7, 3, 1);
                
                // Feet - animated for walking
                ctx.fillStyle = bodyColor;
                if (enemy.animFrame === 0) {
                    ctx.fillRect(enemy.x + 2, enemy.y + 16, 3, 2);
                    ctx.fillRect(enemy.x + 15, enemy.y + 17, 3, 1);
                } else {
                    ctx.fillRect(enemy.x + 15, enemy.y + 16, 3, 2);
                    ctx.fillRect(enemy.x + 2, enemy.y + 17, 3, 1);
                }
            },
            
            koopa: (ctx, enemy) => {
                // Theme-aware Koopa colors
                let shellColor, bodyColor, shadowColor;
                if (ThemeSystem.current?.name === 'Underground') {
                    shellColor = '#4682B4'; // Blue-green shell
                    bodyColor = '#5F9EA0'; // Blue-green body
                    shadowColor = '#2F4F4F'; // Dark blue-green
                } else {
                    shellColor = '#228B22'; // Normal green shell
                    bodyColor = '#FFDBAC'; // Normal peach body
                    shadowColor = '#006400'; // Normal dark green
                }
                
                if (enemy.state === 'shell' || enemy.state === 'shellMoving') {
                    // Shell only - theme colored with yellow trim
                    ctx.fillStyle = shellColor;
                    ctx.fillRect(enemy.x + 2, enemy.y + 4, 16, 12); // Shell body
                    
                    // Yellow shell trim
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(enemy.x + 2, enemy.y + 4, 16, 1);  // Top edge
                    ctx.fillRect(enemy.x + 2, enemy.y + 15, 16, 1); // Bottom edge
                    ctx.fillRect(enemy.x + 2, enemy.y + 5, 1, 10);  // Left edge
                    ctx.fillRect(enemy.x + 17, enemy.y + 5, 1, 10); // Right edge
                } else {
                    // Walking Koopa - shell with head and feet
                    ctx.fillStyle = shellColor;
                    ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 10); // Main shell
                    
                    // Yellow shell trim
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 1);  // Top edge
                    ctx.fillRect(enemy.x + 2, enemy.y + 19, 16, 1);  // Bottom edge
                    ctx.fillRect(enemy.x + 2, enemy.y + 11, 1, 8);   // Left edge
                    ctx.fillRect(enemy.x + 17, enemy.y + 11, 1, 8);  // Right edge
                    
                    // Shell pattern
                    ctx.fillStyle = shadowColor;
                    ctx.fillRect(enemy.x + 6, enemy.y + 13, 2, 2);
                    ctx.fillRect(enemy.x + 12, enemy.y + 13, 2, 2);
                    ctx.fillRect(enemy.x + 9, enemy.y + 16, 2, 2);
                    
                    // Head
                    ctx.fillStyle = bodyColor;
                    ctx.fillRect(enemy.x + 6, enemy.y + 4, 8, 6); // Head
                    
                    // Eyes
                    ctx.fillStyle = '#000';
                    ctx.fillRect(enemy.x + 7, enemy.y + 5, 1, 1);
                    ctx.fillRect(enemy.x + 10, enemy.y + 5, 1, 1);
                }
            },
            
            parakoopa: (ctx, enemy) => {
                // Theme-aware Parakoopa colors (same as koopa)
                let shellColor, bodyColor, shadowColor;
                if (ThemeSystem.current?.name === 'Underground') {
                    shellColor = '#4682B4'; // Blue-green shell
                    bodyColor = '#5F9EA0'; // Blue-green body
                    shadowColor = '#2F4F4F'; // Dark blue-green
                } else {
                    shellColor = '#228B22'; // Normal green shell
                    bodyColor = '#FFDBAC'; // Normal peach body
                    shadowColor = '#006400'; // Normal dark green
                }
                
                // Shell with head and feet (always walking state for parakoopa)
                ctx.fillStyle = shellColor;
                ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 10); // Main shell
                
                // Yellow shell trim
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 1);  // Top edge
                ctx.fillRect(enemy.x + 2, enemy.y + 19, 16, 1);  // Bottom edge
                ctx.fillRect(enemy.x + 2, enemy.y + 11, 1, 8);   // Left edge
                ctx.fillRect(enemy.x + 17, enemy.y + 11, 1, 8);  // Right edge
                
                // Shell pattern
                ctx.fillStyle = shadowColor;
                ctx.fillRect(enemy.x + 6, enemy.y + 13, 2, 2);
                ctx.fillRect(enemy.x + 12, enemy.y + 13, 2, 2);
                ctx.fillRect(enemy.x + 9, enemy.y + 16, 2, 2);
                
                // Head
                ctx.fillStyle = bodyColor;
                ctx.fillRect(enemy.x + 6, enemy.y + 4, 8, 6); // Head
                
                // Eyes
                ctx.fillStyle = '#000';
                ctx.fillRect(enemy.x + 7, enemy.y + 5, 1, 1);
                ctx.fillRect(enemy.x + 10, enemy.y + 5, 1, 1);
                
                // Wings - animated
                const wingFlap = Math.floor(Date.now() / 150) % 2;
                ctx.fillStyle = '#FFFFFF'; // White wings
                if (wingFlap === 0) {
                    // Wings up
                    ctx.fillRect(enemy.x + 1, enemy.y + 2, 3, 6); // Left wing
                    ctx.fillRect(enemy.x + 16, enemy.y + 2, 3, 6); // Right wing
                } else {
                    // Wings down
                    ctx.fillRect(enemy.x + 1, enemy.y + 6, 3, 6); // Left wing
                    ctx.fillRect(enemy.x + 16, enemy.y + 6, 3, 6); // Right wing
                }
                
                // Wing outlines
                ctx.fillStyle = '#000000';
                if (wingFlap === 0) {
                    ctx.fillRect(enemy.x + 1, enemy.y + 2, 3, 1); // Left wing top
                    ctx.fillRect(enemy.x + 16, enemy.y + 2, 3, 1); // Right wing top
                } else {
                    ctx.fillRect(enemy.x + 1, enemy.y + 11, 3, 1); // Left wing bottom
                    ctx.fillRect(enemy.x + 16, enemy.y + 11, 3, 1); // Right wing bottom
                }
            },
            
            piranha: (ctx, enemy) => {
                // Piranha Plant - green stem with red head, upward-facing mouth
                
                // Stem (always visible part)
                ctx.fillStyle = '#228B22'; // Green stem
                ctx.fillRect(enemy.x + 7, enemy.y + 16, 6, 16); // Vertical stem
                
                // Only draw head if not fully hidden
                if (enemy.state !== 'hidden' || enemy.y < enemy.hiddenY) {
                    const mouthOpen = Math.floor(Date.now() / 300) % 2 === 0; // Animate mouth
                    
                    // Head - red with darker outline
                    ctx.fillStyle = '#DC143C'; // Dark red head
                    ctx.fillRect(enemy.x + 2, enemy.y + 2, 16, 14); // Main head (wider, shorter)
                    
                    // Head outline - darker red
                    ctx.fillStyle = '#8B0000';
                    ctx.fillRect(enemy.x + 2, enemy.y + 2, 16, 1); // Top
                    ctx.fillRect(enemy.x + 2, enemy.y + 15, 16, 1); // Bottom
                    ctx.fillRect(enemy.x + 2, enemy.y + 3, 1, 12); // Left
                    ctx.fillRect(enemy.x + 17, enemy.y + 3, 1, 12); // Right
                    
                    // Two leaves on sides
                    ctx.fillStyle = '#228B22'; // Green leaves
                    ctx.fillRect(enemy.x, enemy.y + 6, 3, 6); // Left leaf
                    ctx.fillRect(enemy.x + 17, enemy.y + 6, 3, 6); // Right leaf
                    
                    // Leaf details
                    ctx.fillStyle = '#006400'; // Dark green
                    ctx.fillRect(enemy.x, enemy.y + 7, 1, 4); // Left leaf vein
                    ctx.fillRect(enemy.x + 19, enemy.y + 7, 1, 4); // Right leaf vein
                    
                    // Mouth - upward facing, animated
                    if (mouthOpen) {
                        // Open mouth - black opening
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(enemy.x + 4, enemy.y + 4, 12, 8); // Mouth opening
                        
                        // White teeth around mouth edge
                        ctx.fillStyle = '#FFFFFF';
                        // Top teeth
                        ctx.fillRect(enemy.x + 5, enemy.y + 4, 2, 2);
                        ctx.fillRect(enemy.x + 8, enemy.y + 4, 2, 2);
                        ctx.fillRect(enemy.x + 11, enemy.y + 4, 2, 2);
                        ctx.fillRect(enemy.x + 14, enemy.y + 4, 2, 2);
                        // Bottom teeth
                        ctx.fillRect(enemy.x + 5, enemy.y + 10, 2, 2);
                        ctx.fillRect(enemy.x + 8, enemy.y + 10, 2, 2);
                        ctx.fillRect(enemy.x + 11, enemy.y + 10, 2, 2);
                        ctx.fillRect(enemy.x + 14, enemy.y + 10, 2, 2);
                    } else {
                        // Closed mouth - just a line
                        ctx.fillStyle = '#8B0000';
                        ctx.fillRect(enemy.x + 4, enemy.y + 8, 12, 1); // Mouth line
                    }
                    
                    // White spots on head
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(enemy.x + 4, enemy.y + 3, 2, 1);
                    ctx.fillRect(enemy.x + 14, enemy.y + 3, 2, 1);
                    ctx.fillRect(enemy.x + 6, enemy.y + 13, 2, 1);
                    ctx.fillRect(enemy.x + 12, enemy.y + 13, 2, 1);
                }
            }
        },
        
        player: {
            mario: (ctx, player) => {
                const isSmall = player.powerState === 'small';
                const isFire = player.powerState === 'fire';
                const baseY = player.y;
                const isMoving = Math.abs(player.vx) > 0.1;
                const isJumping = player.vy < -1 || !player.onGround;
                const animFrame = Math.floor(Date.now() / 150) % 2;
                
                // Mario's hat - red for normal, white for fire Mario
                ctx.fillStyle = isFire ? '#FFFFFF' : '#FF0000';
                if (isSmall) {
                    ctx.fillRect(player.x + 2, baseY, 12, 4);
                } else {
                    ctx.fillRect(player.x + 2, baseY, 16, 6);
                }
                
                ctx.fillStyle = isFire ? '#CCCCCC' : '#CC0000';
                if (isSmall) {
                    ctx.fillRect(player.x + 3, baseY + 1, 10, 1);
                } else {
                    ctx.fillRect(player.x + 3, baseY + 1, 14, 1);
                }
                
                // Face - peach color
                ctx.fillStyle = '#FFDBAC';
                if (isSmall) {
                    ctx.fillRect(player.x + 3, baseY + 3, 10, 4);
                } else {
                    ctx.fillRect(player.x + 3, baseY + 5, 14, 6);
                }
                
                if (!isSmall) {
                    // Big Mario - overalls and shirt
                    ctx.fillStyle = isFire ? '#FFFFFF' : '#0066CC';
                    ctx.fillRect(player.x + 2, baseY + 11, 16, 12);
                    
                    // Red shirt showing through
                    ctx.fillStyle = '#FF0000';
                    ctx.fillRect(player.x + 7, baseY + 14, 6, 8);
                    
                    // Overall straps
                    ctx.fillStyle = isFire ? '#FFFFFF' : '#0066CC';
                    ctx.fillRect(player.x + 4, baseY + 9, 3, 4);
                    ctx.fillRect(player.x + 13, baseY + 9, 3, 4);
                    
                    // Buttons - yellow
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(player.x + 8, baseY + 15, 1, 1);
                    ctx.fillRect(player.x + 8, baseY + 18, 1, 1);
                    
                    // Gloves - white (bigger)
                    ctx.fillStyle = '#FFF';
                    if (isJumping) {
                        if (player.facingRight) {
                            ctx.fillRect(player.x + 18, baseY + 12, 4, 4);
                            ctx.fillRect(player.x - 2, baseY + 18, 4, 4);
                        } else {
                            ctx.fillRect(player.x - 2, baseY + 12, 4, 4);
                            ctx.fillRect(player.x + 18, baseY + 18, 4, 4);
                        }
                    } else {
                        ctx.fillRect(player.x, baseY + 16, 3, 4);
                        ctx.fillRect(player.x + 17, baseY + 16, 3, 4);
                    }
                    
                    // Shoes - brown (bigger)
                    ctx.fillStyle = '#8B4513';
                    if (isJumping) {
                        if (player.facingRight) {
                            ctx.fillRect(player.x + 14, baseY + 24, 6, 4);
                            ctx.fillRect(player.x, baseY + 29, 6, 4);
                        } else {
                            ctx.fillRect(player.x, baseY + 24, 6, 4);
                            ctx.fillRect(player.x + 14, baseY + 29, 6, 4);
                        }
                    } else if (isMoving) {
                        if (animFrame === 0) {
                            ctx.fillRect(player.x, baseY + 27, 6, 4);
                            ctx.fillRect(player.x + 14, baseY + 26, 6, 4);
                        } else {
                            ctx.fillRect(player.x, baseY + 26, 6, 4);
                            ctx.fillRect(player.x + 14, baseY + 27, 6, 4);
                        }
                    } else {
                        ctx.fillRect(player.x, baseY + 27, 6, 4);
                        ctx.fillRect(player.x + 14, baseY + 27, 6, 4);
                    }
                } else {
                    // Small Mario - overalls
                    ctx.fillStyle = isFire ? '#FFFFFF' : '#0066CC';
                    ctx.fillRect(player.x + 2, baseY + 4, 12, 6);
                    
                    // Small gloves
                    ctx.fillStyle = '#FFF';
                    if (isJumping) {
                        if (player.facingRight) {
                            ctx.fillRect(player.x + 10, baseY - 1, 2, 2);
                            ctx.fillRect(player.x + 3, baseY + 6, 2, 2);
                        } else {
                            ctx.fillRect(player.x + 4, baseY - 1, 2, 2);
                            ctx.fillRect(player.x + 11, baseY + 6, 2, 2);
                        }
                    } else {
                        ctx.fillRect(player.x + 1, baseY + 6, 2, 2);
                        ctx.fillRect(player.x + 13, baseY + 6, 2, 2);
                    }
                    
                    // Small shoes
                    ctx.fillStyle = '#8B4513';
                    if (isJumping) {
                        if (player.facingRight) {
                            ctx.fillRect(player.x + 13, baseY + 10, 4, 2);
                            ctx.fillRect(player.x + 1, baseY + 14, 4, 2);
                        } else {
                            ctx.fillRect(player.x + 1, baseY + 10, 4, 2);
                            ctx.fillRect(player.x + 13, baseY + 14, 4, 2);
                        }
                    } else if (isMoving) {
                        if (animFrame === 0) {
                            ctx.fillRect(player.x + 2, baseY + 13, 4, 2);
                            ctx.fillRect(player.x + 10, baseY + 11, 4, 2);
                        } else {
                            ctx.fillRect(player.x + 2, baseY + 11, 4, 2);
                            ctx.fillRect(player.x + 10, baseY + 13, 4, 2);
                        }
                    } else {
                        ctx.fillRect(player.x + 2, baseY + 12, 4, 2);
                        ctx.fillRect(player.x + 10, baseY + 12, 4, 2);
                    }
                }
                
                // Profile nose when moving
                if (Math.abs(player.vx) >= 0.1 || isJumping) {
                    ctx.fillStyle = '#FFDBAC';
                    if (player.facingRight) {
                        if (isSmall) {
                            ctx.fillRect(player.x + 12, baseY + 3, 3, 2);
                        } else {
                            ctx.fillRect(player.x + 16, baseY + 7, 4, 3);
                        }
                    } else {
                        if (isSmall) {
                            ctx.fillRect(player.x + 1, baseY + 3, 3, 2);
                        } else {
                            ctx.fillRect(player.x, baseY + 7, 4, 3);
                        }
                    }
                }
            }
        }
    };
    
    // Initialize RenderSystem now that SpriteRenderer is defined
    game.renderSystem = new RenderSystem(SpriteRenderer);
    
    // Map Character Definitions - defines what each ASCII character creates
    const MapCharacters = {
        '#': { type: 'platform', variant: 'ground' },
        '%': { type: 'platform', variant: 'block' },
        'T': { type: 'platform', variant: 'tree' },
        '?': { type: 'block', variant: 'question', content: 'coin' },
        'C': { type: 'block', variant: 'question', content: 'coin' },
        'M': { type: 'block', variant: 'question', content: 'mushroom' },
        'F': { type: 'block', variant: 'question', content: 'fireflower' },
        'S': { type: 'block', variant: 'question', content: 'star' },
        'B': { type: 'block', variant: 'brick' },
        'G': { type: 'enemy', variant: 'goomba' },
        'K': { type: 'enemy', variant: 'koopa' },
        'k': { type: 'enemy', variant: 'parakoopa' },
        'c': { type: 'coin', variant: 'stationary' },
        'P': { type: 'pipe', variant: 'standard' },
        '^': { type: 'platform', variant: 'moving_up' },
        'v': { type: 'platform', variant: 'moving_down' },
        'W': { type: 'platform', variant: 'vertical_moving' },
        'Z': { type: 'platform', variant: 'horizontal_moving' },
        '@': { type: 'spawn', variant: 'player' },
        '&': { type: 'flag', variant: 'standard' },
        'X': { type: 'pit', variant: 'standard' },
        '-': { type: 'empty', variant: 'sky' }
    };
    
    // Map Object Factories - creates game objects from character definitions
    const MapObjectFactories = {
        platform: (def, x, y, tileSize) => {
            let platform;
            
            // Add movement properties for moving platforms
            if (def.variant === 'moving_up') {
                platform = { x, y, width: tileSize, height: 8, type: def.variant }; // Thinner
                platform.vy = -1; // Move up
                platform.moving = true;
            } else if (def.variant === 'moving_down') {
                platform = { x, y, width: tileSize, height: 8, type: def.variant }; // Thinner
                platform.vy = 1; // Move down
                platform.moving = true;
            } else {
                platform = { x, y, width: tileSize, height: tileSize, type: def.variant };
            }
            
            return platform;
        },
        
        block: (def, x, y, tileSize) => ({
            x, y, width: tileSize, height: tileSize, 
            type: def.variant, hit: false, content: def.content
        }),
        
        enemy: (def, x, y, tileSize, lines) => {
            const enemy = {
                x, width: 20, vx: -1, vy: 0, 
                type: def.variant, state: 'walking', alive: true, onGround: true
            };
            
            // Position enemy on ground level
            let groundY = y;
            for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                if (lines[checkY] && lines[checkY][Math.floor(x / tileSize)] === '#') {
                    groundY = checkY * tileSize - (def.variant === 'goomba' ? 18 : 20);
                    break;
                }
            }
            
            enemy.y = groundY;
            enemy.height = def.variant === 'goomba' ? 18 : 20;
            return enemy;
        },
        
        coin: (def, x, y, tileSize) => ({
            x, y, width: tileSize, height: tileSize, collected: false
        }),
        
        pipe: (def, x, y, tileSize) => {
            // Will be processed in groups later
            return null;
        },
        
        flag: (def, x, y, tileSize, lines) => {
            // Find ground level for flag placement
            let groundY = y;
            for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                if (lines[checkY] && lines[checkY][Math.floor(x / tileSize)] === '#') {
                    groundY = checkY * tileSize;
                    break;
                }
            }
            return { x, y: groundY - (10 * tileSize), width: 35, height: 10 * tileSize };
        },
        
        spawn: (def, x, y, tileSize, lines) => {
            console.log('Spawn factory called with x:', x, 'y:', y, 'tileSize:', tileSize);
            console.log('Total lines in map:', lines.length);
            
            // Find a safe ground position (not over a pit)
            let safeX = x;
            let groundY = y;
            const spawnTileX = Math.floor(x / tileSize);
            
            // First, try to find ground directly below the spawn point
            for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                const line = lines[checkY];
                if (line && line[spawnTileX] === '#') {
                    groundY = checkY * tileSize - 16;
                    console.log('Found ground directly below at checkY:', checkY, 'groundY:', groundY);
                    break;
                }
            }
            
            // If spawn is over a pit (no ground found), find the nearest safe ground
            if (groundY === y) {
                console.log('Spawn is over a pit, finding safe ground...');
                // Look for the first solid ground to the left or right
                for (let offset = 1; offset < 50; offset++) {
                    // Try left
                    const leftTileX = spawnTileX - offset;
                    if (leftTileX >= 0) {
                        for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                            const line = lines[checkY];
                            if (line && line[leftTileX] === '#') {
                                safeX = leftTileX * tileSize;
                                groundY = checkY * tileSize - 16;
                                console.log('Found safe ground to the left at x:', safeX, 'y:', groundY);
                                break;
                            }
                        }
                        if (groundY !== y) break;
                    }
                    
                    // Try right
                    const rightTileX = spawnTileX + offset;
                    for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                        const line = lines[checkY];
                        if (line && line[rightTileX] && line[rightTileX] === '#') {
                            safeX = rightTileX * tileSize;
                            groundY = checkY * tileSize - 16;
                            console.log('Found safe ground to the right at x:', safeX, 'y:', groundY);
                            break;
                        }
                    }
                    if (groundY !== y) break;
                }
            }
            
            // Final fallback
            if (groundY === y) {
                console.log('No safe ground found, using fallback position');
                safeX = 50;
                groundY = 334;
            }
            
            console.log('Spawn factory returning x:', safeX, 'y:', groundY);
            return { x: safeX, y: groundY };
        },
        
        pit: (def, x, y, tileSize) => ({ x, width: tileSize }), // Create pit object
        
        empty: () => null // Sky/empty space
    };
    
    // Enemy Behavior System - defined after game object
    const EnemyBehaviors = {
        goomba: {
            states: ['walking', 'dead'],
            defaultState: 'walking',
            
            movement: (enemy) => {
                if (enemy.state !== 'walking') return;
                
                // Check for pit ahead before moving
                const checkX = enemy.x + (enemy.vx > 0 ? enemy.width + 10 : -10);
                const checkY = enemy.y + enemy.height + 20;
                
                let foundGround = false;
                game.platforms.forEach(platform => {
                    if (checkX >= platform.x && checkX <= platform.x + platform.width &&
                        checkY >= platform.y && checkY <= platform.y + platform.height) {
                        foundGround = true;
                    }
                });
                
                if (!foundGround) {
                    enemy.vx = -enemy.vx;
                }
                
                enemy.x += enemy.vx;
            },
            
            onStomp: (enemy, player) => {
                enemy.alive = false;
                player.vy = -8;
                player.score += 100;
            },
            
            onSideHit: (enemy, player) => {
                // Normal enemy collision - handle power-up states
                if (player.powerState === 'big' || player.powerState === 'fire') {
                    player.powerState = 'small';
                    player.width = 16;
                    player.height = 16;
                    player.y += 16;
                    player.invincible = true;
                    player.invincibleTimer = 120;
                    
                    if (player.x < enemy.x) {
                        player.x -= 20;
                    } else {
                        player.x += 20;
                    }
                } else {
                    player.lives--;
                    if (player.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        resetLevel();
                    }
                }
            }
        },
        
        koopa: {
            states: ['walking', 'shell', 'shellMoving'],
            defaultState: 'walking',
            
            movement: (enemy) => {
                if (enemy.state === 'walking') {
                    // Check for pit ahead before moving
                    const checkX = enemy.x + (enemy.vx > 0 ? enemy.width + 10 : -10);
                    const checkY = enemy.y + enemy.height + 20;
                    
                    let foundGround = false;
                    game.platforms.forEach(platform => {
                        if (checkX >= platform.x && checkX <= platform.x + platform.width &&
                            checkY >= platform.y && checkY <= platform.y + platform.height) {
                            foundGround = true;
                        }
                    });
                    
                    if (!foundGround) {
                        enemy.vx = -enemy.vx;
                    }
                    
                    enemy.x += enemy.vx;
                } else if (enemy.state === 'shell') {
                    enemy.vx = 0;
                } else if (enemy.state === 'shellMoving') {
                    enemy.x += enemy.vx;
                    // Moving shell can kill other enemies
                    game.enemies.forEach(otherEnemy => {
                        if (otherEnemy !== enemy && otherEnemy.alive &&
                            enemy.x < otherEnemy.x + otherEnemy.width &&
                            enemy.x + enemy.width > otherEnemy.x &&
                            enemy.y < otherEnemy.y + otherEnemy.height &&
                            enemy.y + enemy.height > otherEnemy.y) {
                            otherEnemy.alive = false;
                        }
                    });
                }
            },
            
            onStomp: (enemy, player) => {
                if (enemy.state === 'walking') {
                    enemy.state = 'shell';
                    enemy.vx = 0;
                    enemy.height = 16;
                    enemy.y += 4;
                    player.vy = -8;
                    player.score += 100;
                } else if (enemy.state === 'shell') {
                    enemy.state = 'shellMoving';
                    enemy.vx = player.x < enemy.x ? 3 : -3;
                    player.vy = -8;
                    player.score += 400;
                } else if (enemy.state === 'shellMoving') {
                    enemy.state = 'shell';
                    enemy.vx = 0;
                    player.vy = -8;
                    player.score += 100;
                }
            },
            
            onSideHit: (enemy, player) => {
                if (enemy.state === 'shell') {
                    enemy.state = 'shellMoving';
                    enemy.vx = player.x < enemy.x ? 3 : -3;
                    player.score += 400;
                } else if (enemy.state === 'shellMoving') {
                    enemy.state = 'shell';
                    enemy.vx = 0;
                    player.score += 100;
                } else {
                    // Walking koopa - normal collision
                    if (player.powerState === 'big' || player.powerState === 'fire') {
                        player.powerState = 'small';
                        player.width = 16;
                        player.height = 16;
                        player.y += 16;
                        player.invincible = true;
                        player.invincibleTimer = 120;
                        
                        if (player.x < enemy.x) {
                            player.x -= 20;
                        } else {
                            player.x += 20;
                        }
                    } else {
                        player.lives--;
                        if (player.lives <= 0) {
                            game.gameOver = true;
                        } else {
                            resetLevel();
                        }
                    }
                }
            }
        },
        
        parakoopa: {
            states: ['flying'],
            defaultState: 'flying',
            
            movement: (enemy) => {
                if (!enemy.topY) enemy.topY = enemy.y; // 'k' position is top of flight
                if (!enemy.flyDirection) enemy.flyDirection = 1; // Start flying down
                if (!enemy.flySpeed) enemy.flySpeed = 1;
                
                // Move vertically
                enemy.y += enemy.flyDirection * enemy.flySpeed;
                
                // Check flight limits (6 cells = 120 pixels total range)
                const distanceFromTop = enemy.y - enemy.topY;
                
                if (enemy.flyDirection === 1 && distanceFromTop >= 120) {
                    // Flying down and reached bottom limit (6 cells), start flying up
                    enemy.flyDirection = -1;
                } else if (enemy.flyDirection === -1 && distanceFromTop <= 0) {
                    // Flying up and reached top limit, start flying down
                    enemy.flyDirection = 1;
                }
            },
            
            onStomp: (enemy, player) => {
                // Convert to regular koopa when stomped
                enemy.type = 'koopa';
                enemy.state = 'walking';
                enemy.vx = -1;
                enemy.flyDirection = 0;
                player.vy = -8;
                player.score += 100;
            },
            
            onSideHit: (enemy, player) => {
                // Same as regular koopa side hit
                if (player.powerState === 'big' || player.powerState === 'fire') {
                    player.powerState = 'small';
                    player.width = 16;
                    player.height = 16;
                    player.y += 16;
                    player.invincible = true;
                    player.invincibleTimer = 120;
                    
                    if (player.x < enemy.x) {
                        player.x -= 20;
                    } else {
                        player.x += 20;
                    }
                } else {
                    player.lives--;
                    if (player.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        resetLevel();
                    }
                }
            }
        },
        
        piranha: {
            states: ['hidden', 'emerging', 'visible', 'retreating'],
            defaultState: 'hidden',
            
            movement: (enemy) => {
                if (!enemy.timer) enemy.timer = 0;
                if (!enemy.baseY) enemy.baseY = enemy.y;
                if (!enemy.hiddenY) enemy.hiddenY = enemy.baseY + 20;
                
                const distanceToPlayer = Math.abs(game.player.x - enemy.x);
                const tooClose = distanceToPlayer < 48;
                
                enemy.timer++;
                
                if (enemy.state === 'hidden') {
                    enemy.y = enemy.hiddenY;
                    if (!tooClose && enemy.timer > 60) {
                        enemy.state = 'emerging';
                        enemy.timer = 0;
                    }
                } else if (enemy.state === 'emerging') {
                    enemy.y = enemy.hiddenY - (enemy.timer * 1); // Slower movement
                    if (enemy.y <= enemy.baseY) {
                        enemy.y = enemy.baseY;
                        enemy.state = 'visible';
                        enemy.timer = 0;
                    }
                    // Don't check tooClose during emerging - let it complete
                } else if (enemy.state === 'visible') {
                    enemy.y = enemy.baseY;
                    if (enemy.timer > 120) { // Only check timer, not distance
                        enemy.state = 'retreating';
                        enemy.timer = 0;
                    }
                } else if (enemy.state === 'retreating') {
                    enemy.y = enemy.baseY + (enemy.timer * 1); // Slower movement
                    if (enemy.y >= enemy.hiddenY) {
                        enemy.y = enemy.hiddenY;
                        enemy.state = 'hidden';
                        enemy.timer = 0;
                    }
                    // Don't check tooClose during retreating - let it complete
                }
            },
            
            onStomp: (enemy, player) => {
                // Piranha plants can't be stomped - damage player instead
                if (player.powerState === 'big' || player.powerState === 'fire') {
                    player.powerState = 'small';
                    player.width = 16;
                    player.height = 16;
                    player.y += 16;
                    player.invincible = true;
                    player.invincibleTimer = 120;
                } else {
                    player.lives--;
                    if (player.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        resetLevel();
                    }
                }
            },
            
            onSideHit: (enemy, player) => {
                // Same as stomp - piranha plants always damage
                if (player.powerState === 'big' || player.powerState === 'fire') {
                    player.powerState = 'small';
                    player.width = 16;
                    player.height = 16;
                    player.y += 16;
                    player.invincible = true;
                    player.invincibleTimer = 120;
                } else {
                    player.lives--;
                    if (player.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        resetLevel();
                    }
                }
            }
        }
    };
    
    async function initializeLevel() {
        try {
            let mapFile, theme;
            if (game.currentLevel === 1) {
                mapFile = 'mario-1-1-map.txt';
                theme = 'overworld';
            } else if (game.currentLevel === 2) {
                mapFile = 'mario-1-2-map.txt';
                theme = 'underground';
            } else if (game.currentLevel === 3) {
                mapFile = 'mario-1-3-map.txt';
                theme = 'trees';
            } else if (game.currentLevel === 4) {
                mapFile = 'mario-1-4-map.txt';
                theme = 'castle';
            }
            
            const response = await fetch(`./games/mario/${mapFile}?v=${Date.now()}`);
            const mapText = await response.text();
            const layout = parseASCIIMap(mapText);
            
            console.log(`Level ${game.currentLevel} loaded:`, {
                platforms: layout.platforms.length,
                blocks: layout.blocks.length, 
                enemies: layout.enemies.length,
                coins: layout.coins.length
            });
            
            // Set theme based on level
            game.currentTheme = theme;
            ThemeSystem.setTheme(theme);
            
            // Store layout for reset purposes
            game.currentLayout = layout;
            
            game.platforms = layout.platforms;
            game.blocks = layout.blocks;
            
            // Convert goombas to entities, keep others as regular enemies
            game.enemies = [];
            layout.enemies.forEach(enemy => {
                if (enemy.type === 'goomba') {
                    // Create entity for goomba
                    const goombaEntity = game.entityManager.create()
                        .add('transform', new Transform(enemy.x, enemy.y || 334, 20, 18))
                        .add('physics', new Physics(-1, 0))
                        .add('sprite', new Sprite('#8B4513'))
                        .add('ai', new AI('patrol'));
                    console.log('Converted goomba to entity at', enemy.x);
                } else {
                    // Keep other enemies as regular objects
                    game.enemies.push(enemy);
                }
            });
            
            game.coins = layout.coins || [];
            game.pits = layout.pits || [];
            game.flag = layout.flag;
            game.castles = layout.castles || [];
            
            // Use the same function for initial load
            resetMarioPosition();
            
            console.log('Level loaded: Mario starting position:', layout.startX, layout.startY);
        } catch (error) {
            console.error('Failed to load map:', error);
            // Fallback to basic level
            game.platforms = [{x: 0, y: 350, width: 2000, height: 50}];
            game.blocks = [];
            game.enemies = [];
            game.flag = {x: 1800, y: 200, width: 35, height: 150};
        }
    }
    
    function parseASCIIMap(mapText) {
        console.log('parseASCIIMap called - parsing map...');
        const rawLines = mapText.split('\n');
        const lines = rawLines.filter(line => !line.startsWith('# ') && line.length > 0);
        const platforms = [];
        const blocks = [];
        const enemies = [];
        const coins = [];
        const pits = [];
        let flag = null;
        let startX = 50, startY = 300;
        
        const tileSize = 20;
        
        // Parse each character using the mapping system
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                const char = line[x];
                const worldX = x * tileSize;
                const worldY = y * tileSize;
                
                // Skip W and Z characters - they're handled by grouping logic later
                if (char === 'W' || char === 'Z') continue;
                
                const charDef = MapCharacters[char];
                if (!charDef) continue; // Skip unknown characters
                
                const factory = MapObjectFactories[charDef.type];
                if (!factory) continue; // Skip if no factory
                
                const obj = factory(charDef, worldX, worldY, tileSize, lines);
                if (!obj) continue; // Skip if factory returns null
                
                // Add to appropriate collection based on type
                switch (charDef.type) {
                    case 'platform':
                        platforms.push(obj);
                        break;
                    case 'block':
                        blocks.push(obj);
                        break;
                    case 'enemy':
                        enemies.push(obj);
                        break;
                    case 'coin':
                        coins.push(obj);
                        break;
                    case 'pit':
                        pits.push(obj);
                        break;
                    case 'flag':
                        flag = obj;
                        break;
                    case 'spawn':
                        console.log('Processing spawn case: setting startX to', obj.x, 'startY to', obj.y);
                        startX = obj.x;
                        startY = obj.y;
                        break;
                }
            }
        }
        
        // Process connected P groups into single pipes
        const processedPs = new Set();
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                if ((line[x] === 'P' || line[x] === 'p') && !processedPs.has(`${x},${y}`)) {
                    // Find the bounds of this connected P group
                    let minX = x, maxX = x, minY = y, maxY = y;
                    const toCheck = [{x, y}];
                    const groupPs = new Set();
                    let hasPiranha = false;
                    
                    while (toCheck.length > 0) {
                        const {x: cx, y: cy} = toCheck.pop();
                        const key = `${cx},${cy}`;
                        if (groupPs.has(key) || cy >= lines.length || cx >= lines[cy].length || (lines[cy][cx] !== 'P' && lines[cy][cx] !== 'p')) continue;
                        
                        // Check if this pipe has a piranha
                        if (lines[cy][cx] === 'p') {
                            hasPiranha = true;
                        }
                        
                        groupPs.add(key);
                        processedPs.add(key);
                        minX = Math.min(minX, cx);
                        maxX = Math.max(maxX, cx);
                        minY = Math.min(minY, cy);
                        maxY = Math.max(maxY, cy);
                        
                        // Check adjacent cells
                        toCheck.push({x: cx+1, y: cy}, {x: cx-1, y: cy}, {x: cx, y: cy+1}, {x: cx, y: cy-1});
                    }
                    
                    // Create single piranha for this pipe group if it has 'p' characters
                    if (hasPiranha) {
                        const centerX = (minX + maxX) / 2;
                        const piranhaY = minY * tileSize - 36; // Stick out more from pipe
                        enemies.push({
                            x: centerX * tileSize, 
                            y: piranhaY,
                            type: 'piranha',
                            alive: true
                        });
                    }
                    
                    // Create single pipe for this group
                    platforms.push({
                        x: minX * tileSize,
                        y: minY * tileSize,
                        width: (maxX - minX + 1) * tileSize,
                        height: (maxY - minY + 1) * tileSize,
                        type: 'pipe'
                    });
                }
            }
        }
        
        // Process connected W and Z groups into single moving platforms
        const processedWs = new Set();
        const processedZs = new Set();
        
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                // Process W groups (vertical moving platforms)
                if (line[x] === 'W' && !processedWs.has(`${x},${y}`)) {
                    let minX = x, maxX = x, minY = y, maxY = y;
                    const toCheck = [{x, y}];
                    const groupWs = new Set();
                    
                    while (toCheck.length > 0) {
                        const {x: cx, y: cy} = toCheck.pop();
                        const key = `${cx},${cy}`;
                        if (groupWs.has(key) || cy >= lines.length || cx >= lines[cy].length || lines[cy][cx] !== 'W') continue;
                        
                        groupWs.add(key);
                        processedWs.add(key);
                        minX = Math.min(minX, cx);
                        maxX = Math.max(maxX, cx);
                        minY = Math.min(minY, cy);
                        maxY = Math.max(maxY, cy);
                        
                        toCheck.push({x: cx+1, y: cy}, {x: cx-1, y: cy}, {x: cx, y: cy+1}, {x: cx, y: cy-1});
                    }
                    
                    // Create single vertical moving platform
                    const randomOffset = Math.random() * (8 * tileSize);
                    platforms.push({
                        x: minX * tileSize,
                        y: minY * tileSize + randomOffset,
                        width: (maxX - minX + 1) * tileSize,
                        height: 8,
                        type: 'vertical_moving',
                        topY: minY * tileSize,
                        bottomY: minY * tileSize + (8 * tileSize),
                        vy: 1,
                        moving: true
                    });
                }
                
                // Process Z groups (horizontal moving platforms)
                if (line[x] === 'Z' && !processedZs.has(`${x},${y}`)) {
                    let minX = x, maxX = x, minY = y, maxY = y;
                    const toCheck = [{x, y}];
                    const groupZs = new Set();
                    
                    while (toCheck.length > 0) {
                        const {x: cx, y: cy} = toCheck.pop();
                        const key = `${cx},${cy}`;
                        if (groupZs.has(key) || cy >= lines.length || cx >= lines[cy].length || lines[cy][cx] !== 'Z') continue;
                        
                        groupZs.add(key);
                        processedZs.add(key);
                        minX = Math.min(minX, cx);
                        maxX = Math.max(maxX, cx);
                        minY = Math.min(minY, cy);
                        maxY = Math.max(maxY, cy);
                        
                        toCheck.push({x: cx+1, y: cy}, {x: cx-1, y: cy}, {x: cx, y: cy+1}, {x: cx, y: cy-1});
                    }
                    
                    // Create single horizontal moving platform
                    const randomOffset = Math.random() * (8 * tileSize);
                    platforms.push({
                        x: minX * tileSize + randomOffset,
                        y: minY * tileSize,
                        width: (maxX - minX + 1) * tileSize,
                        height: 8,
                        type: 'horizontal_moving',
                        leftX: minX * tileSize,
                        rightX: minX * tileSize + (8 * tileSize),
                        vx: 1,
                        moving: true
                    });
                }
            }
        }
        
        // Handle castle characters 'q' (2-level) and 'Q' (3-level) - find all castles
        let castles = [];
        
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                if (line[x] === 'q' || line[x] === 'Q') {
                    // Find ground level
                    let groundY = y * tileSize;
                    for (let checkY = y; checkY < lines.length; checkY++) {
                        if (lines[checkY] && lines[checkY][x] === '#') {
                            groundY = checkY * tileSize;
                            break;
                        }
                    }
                    const isLarge = line[x] === 'Q';
                    const castleHeight = isLarge ? 180 : 140; // Taller castles
                    const castle = { x: x * tileSize, y: groundY - castleHeight, large: isLarge };
                    castles.push(castle);
                    console.log('Found Castle at position', x, y, 'world coords:', castle.x, castle.y, 'type:', isLarge ? '3-level' : '2-level');
                }
            }
        }

        return {platforms, blocks, enemies, coins, pits, flag, castles, startX, startY};
    }
    
    
    function updatePowerUps() {
        game.powerUps.forEach((powerUp, index) => {
            // Only move non-fire flower power-ups
            if (powerUp.type !== 'fireflower') {
                // Horizontal movement
                powerUp.x += powerUp.vx;
            
            // Add gravity
            if (!powerUp.vy) powerUp.vy = 0;
            powerUp.vy += 0.3; // Gravity
            powerUp.y += powerUp.vy;
            
            // Check collision with platforms and blocks (power-ups land on them)
            let onGround = false;
            [...game.platforms, ...game.blocks].forEach(solid => {
                if (powerUp.x < solid.x + solid.width &&
                    powerUp.x + powerUp.width > solid.x &&
                    powerUp.y < solid.y + solid.height &&
                    powerUp.y + powerUp.height > solid.y) {
                    
                    // Landing on top
                    if (powerUp.vy > 0 && powerUp.y < solid.y) {
                        powerUp.y = solid.y - powerUp.height;
                        powerUp.vy = 0;
                        onGround = true;
                    }
                    // Side collision - bounce off walls
                    else if (powerUp.vx > 0 && powerUp.x < solid.x) {
                        powerUp.x = solid.x - powerUp.width;
                        powerUp.vx *= -1;
                    } else if (powerUp.vx < 0 && powerUp.x > solid.x) {
                        powerUp.x = solid.x + solid.width;
                        powerUp.vx *= -1;
                    }
                }
            });
            
            // Turn around at level edges
            if (powerUp.x <= 0 || powerUp.x >= game.levelWidth - powerUp.width) {
                powerUp.vx *= -1;
            }
            }
            
            // Player collision
            if (game.player.x < powerUp.x + powerUp.width &&
                game.player.x + game.player.width > powerUp.x &&
                game.player.y < powerUp.y + powerUp.height &&
                game.player.y + game.player.height > powerUp.y) {
                
                if (powerUp.type === 'mushroom') {
                    game.player.powerState = 'big';
                    game.player.y -= 16; // Move Mario up to prevent falling through platform
                    game.player.width = 20;
                    game.player.height = 32;
                } else if (powerUp.type === 'fireflower') {
                    game.player.powerState = 'fire';
                    if (game.player.height === 16) { // Only adjust if currently small
                        game.player.y -= 16; // Move Mario up to prevent falling through platform
                    }
                    game.player.width = 20;
                    game.player.height = 32;
                }
                game.player.score += 1000;
                game.powerUps.splice(index, 1);
            }
        });
    }
    
    function updateParticles() {
        game.particles = game.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.type === 'coin') {
                // Coin floats up and fades
                particle.vy += 0.1; // Slight gravity
            }
            
            return particle.life > 0;
        });
    }
    
    function resetMarioPosition() {
        // Reset Mario to starting position and state
        game.player.x = game.currentLayout?.startX || 50;
        game.player.y = game.currentLayout?.startY || 300;
        game.player.vx = 0;
        game.player.vy = 0;
        game.player.onGround = false; // Let gravity handle landing
        game.player.powerState = 'small';
        game.player.width = 16;
        game.player.height = 16;
        game.player.facingRight = true;
        game.player.shootCooldown = 0;
        game.player.invincibleTimer = 0;
        console.log('Mario position set to:', game.player.x, game.player.y);
    }
    
    async function initializeGameState(preserveLives = false) {
        console.log('initializeGameState called with preserveLives:', preserveLives);
        const currentLives = preserveLives ? game.livesToRestore : 3;
        console.log('Using lives:', currentLives);
        
        try {
            let mapFile, theme;
            if (game.currentLevel === 1) {
                mapFile = 'mario-1-1-map.txt';
                theme = 'overworld';
            } else if (game.currentLevel === 2) {
                mapFile = 'mario-1-2-map.txt';
                theme = 'underground';
            } else if (game.currentLevel === 3) {
                mapFile = 'mario-1-3-map.txt';
                theme = 'trees';
            } else if (game.currentLevel === 4) {
                mapFile = 'mario-1-4-map.txt';
                theme = 'castle';
            }
            
            const response = await fetch(`./games/mario/${mapFile}?v=${Date.now()}`);
            const mapText = await response.text();
            const layout = parseASCIIMap(mapText);
            
            // Set theme
            game.currentTheme = theme;
            ThemeSystem.setTheme(theme);
            
            // Store layout for reset purposes
            game.currentLayout = layout;
            
            // Reset all game state
            game.platforms = layout.platforms;
            game.blocks = layout.blocks;
            
            // Convert goombas to entities, keep others as regular enemies
            game.enemies = [];
            layout.enemies.forEach(enemy => {
                if (enemy.type === 'goomba') {
                    // Create entity for goomba
                    const goombaEntity = game.entityManager.create()
                        .add('transform', new Transform(enemy.x, enemy.y || 334, 20, 18))
                        .add('physics', new Physics(-1, 0))
                        .add('sprite', new Sprite('#8B4513'))
                        .add('ai', new AI('patrol'));
                    console.log('Converted goomba to entity at', enemy.x);
                } else {
                    // Keep other enemies as regular objects
                    game.enemies.push(enemy);
                }
            });
            
            game.coins = layout.coins || [];
            game.pits = layout.pits || [];
            game.flag = layout.flag;
            game.castles = layout.castles || [];
            
            // Reset Mario completely
            console.log('Setting Mario position to startX:', layout.startX, 'startY:', layout.startY);
            game.player.x = layout.startX;
            game.player.y = layout.startY;
            game.player.vx = 0;
            game.player.vy = 0;
            game.player.onGround = false;
            game.player.powerState = 'small';
            game.player.width = 16;
            game.player.height = 16;
            game.player.facingRight = true;
            game.player.shootCooldown = 0;
            game.player.invincibleTimer = 0;
            game.player.lives = currentLives;
            
            // Reset camera
            game.camera.x = 0;
            
            // Reset other game state
            game.powerUps = [];
            game.particles = [];
            game.fireballs = [];
            game.gameOver = false;
            game.won = false;
            
            // Initialize Entity System - Phase 2
            game.entityManager.addSystem(new PhysicsSystem(game));
            game.entityManager.addSystem(new AISystem(game));
            game.entityManager.addSystem(new CollisionSystem(game, resetLevel));
            
            console.log('Game state initialized: Mario at', game.player.x, game.player.y, 'Lives:', game.player.lives);
            console.log('Entity system initialized with', game.entityManager.entities.size, 'entities');
            
        } catch (error) {
            console.error('Failed to load map:', error);
            // Fallback to basic level
            game.platforms = [{x: 0, y: 350, width: 2000, height: 50}];
            game.blocks = [];
            game.enemies = [];
            game.pits = [];
            game.flag = {x: 1800, y: 200, width: 35, height: 150};
            game.castles = [];
        }
    }
    
    async function initializeLevel() {
        return initializeGameState(false); // Fresh start with 3 lives
    }
    
    function resetLevel() {
        // Store current lives count
        const currentLives = game.player.lives;
        
        console.log('resetLevel() called - setting needsLevelReset flag, lives:', currentLives);
        
        // Set flag to reload level on next frame
        game.needsLevelReset = true;
        game.livesToRestore = currentLives;
    }
    
    function checkScreenBoundary() {
        // Check if Mario fell below the screen
        if (game.player.y > 500) {
            console.log('Mario fell below screen! Lives before:', game.player.lives);
            game.player.lives--;
            console.log('Lives after decrement:', game.player.lives);
            if (game.player.lives <= 0) {
                console.log('Game over triggered');
                game.gameOver = true;
            } else {
                console.log('Calling resetLevel()');
                resetLevel();
            }
        }
    }
    
    function handlePlatformCollision(entity) {
        entity.onGround = false;
        
        // Store previous position
        const prevX = entity.x - entity.vx;
        const prevY = entity.y - entity.vy;
        
        game.platforms.forEach(platform => {
            // Skip moving platforms - they're handled separately
            if (platform.moving) return;
            
            // Check if entity is currently overlapping platform
            if (entity.x < platform.x + platform.width &&
                entity.x + entity.width > platform.x &&
                entity.y < platform.y + platform.height &&
                entity.y + entity.height > platform.y) {
                
                // Check if entity was NOT overlapping in previous frame
                const wasOverlapping = prevX < platform.x + platform.width &&
                                     prevX + entity.width > platform.x &&
                                     prevY < platform.y + platform.height &&
                                     prevY + entity.height > platform.y;
                
                if (!wasOverlapping) {
                    // Calculate intersection point for each axis
                    let collisionTime = 1.0;
                    let collisionAxis = null;
                    
                    // Vertical collision (top/bottom)
                    if (entity.vy !== 0) {
                        let timeY;
                        if (entity.vy > 0) {
                            // Moving down - check when bottom edge hits top of platform
                            timeY = (platform.y - (prevY + entity.height)) / entity.vy;
                        } else {
                            // Moving up - check when top edge hits bottom of platform
                            timeY = (platform.y + platform.height - prevY) / entity.vy;
                        }
                        
                        if (timeY >= 0 && timeY <= 1 && timeY < collisionTime) {
                            collisionTime = timeY;
                            collisionAxis = 'y';
                        }
                    }
                    
                    // Horizontal collision (left/right)
                    if (entity.vx !== 0) {
                        let timeX;
                        if (entity.vx > 0) {
                            // Moving right - check collision with left of platform
                            timeX = (platform.x - (prevX + entity.width)) / entity.vx;
                        } else {
                            // Moving left - check collision with right of platform
                            timeX = (platform.x + platform.width - prevX) / entity.vx;
                        }
                        
                        if (timeX >= 0 && timeX <= 1 && timeX < collisionTime) {
                            collisionTime = timeX;
                            collisionAxis = 'x';
                        }
                    }
                    
                    // Apply collision response
                    if (collisionAxis === 'y') {
                        if (entity.vy > 0) {
                            // Landing on top - position feet on platform surface
                            entity.y = platform.y - entity.height;
                            entity.vy = 0;
                            entity.onGround = true;
                            
                            // Move entity with moving platform
                            if (platform.moving && entity === game.player) {
                                entity.y += platform.vy;
                            }
                        } else {
                            // Hitting from below - position head against platform bottom
                            entity.y = platform.y + platform.height;
                            entity.vy = 0;
                        }
                    } else if (collisionAxis === 'x') {
                        if (entity.vx > 0) {
                            // Hit from left
                            entity.x = platform.x - entity.width;
                            if (entity.vx !== undefined) entity.vx = 0;
                        } else {
                            // Hit from right
                            entity.x = platform.x + platform.width;
                            if (entity.vx !== undefined) entity.vx = 0;
                        }
                    }
                }
            }
        });
    }
    
    function updateFireballs() {
        game.fireballs.forEach((fireball, index) => {
            // Move fireball
            fireball.x += fireball.vx;
            fireball.y += fireball.vy;
            
            // Add gravity
            fireball.vy += 0.2;
            
            // Bounce off ground and walls
            [...game.platforms, ...game.blocks].forEach(solid => {
                if (fireball.x < solid.x + solid.width &&
                    fireball.x + fireball.width > solid.x &&
                    fireball.y < solid.y + solid.height &&
                    fireball.y + fireball.height > solid.y) {
                    
                    const overlapLeft = (fireball.x + fireball.width) - solid.x;
                    const overlapRight = (solid.x + solid.width) - fireball.x;
                    const overlapTop = (fireball.y + fireball.height) - solid.y;
                    const overlapBottom = (solid.y + solid.height) - fireball.y;
                    
                    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                    
                    // Ground bounce (hitting from above)
                    if (minOverlap === overlapTop && fireball.vy > 0) {
                        fireball.y = solid.y - fireball.height;
                        fireball.vy = -3; // Bounce
                        fireball.bounces++;
                    }
                    // Wall collision from right
                    else if (minOverlap === overlapLeft && fireball.vx > 0) {
                        fireball.x = solid.x - fireball.width;
                        fireball.vx *= -1; // Reverse direction
                    }
                    // Wall collision from left
                    else if (minOverlap === overlapRight && fireball.vx < 0) {
                        fireball.x = solid.x + solid.width;
                        fireball.vx *= -1; // Reverse direction
                    }
                }
            });
            
            // Hit enemies
            game.enemies.forEach(enemy => {
                if (enemy.alive &&
                    fireball.x < enemy.x + enemy.width &&
                    fireball.x + fireball.width > enemy.x &&
                    fireball.y < enemy.y + enemy.height &&
                    fireball.y + fireball.height > enemy.y) {
                    
                    enemy.alive = false;
                    game.player.score += 100;
                    game.fireballs.splice(index, 1);
                }
            });
            
            // Remove fireball if it bounced too many times or went off screen
            if (fireball.bounces > fireball.maxBounces || fireball.x < -50 || fireball.x > 5000 || fireball.y > 500) {
                game.fireballs.splice(index, 1);
            }
        });
    }
    
    function nextLevel() {
        game.levelsCompleted++;
        if (game.levelsCompleted >= game.levelsToWin) {
            game.won = true;
        } else {
            // Progress to next level
            game.currentLevel = game.levelsCompleted + 1;
            initializeLevel();
        }
    }
    
    function updatePlayer() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Update invincibility timer
        if (game.player.invincible) {
            game.player.invincibleTimer--;
            if (game.player.invincibleTimer <= 0) {
                game.player.invincible = false;
            }
        }
        
        if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
            game.player.vx = Math.max(game.player.vx - 0.5, -5);
            game.player.facingRight = false;
        } else if (game.keys['ArrowRight'] || game.keys['KeyD']) {
            game.player.vx = Math.min(game.player.vx + 0.5, 5);
            game.player.facingRight = true;
        } else {
            game.player.vx *= 0.8;
        }
        
        if ((game.keys['ArrowUp'] || game.keys['KeyW'] || game.keys['Space']) && game.player.onGround) {
            game.player.vy = -12;
            game.player.onGround = false;
        }
        
        // Shooting fireballs (fire Mario only)
        if ((game.keys['KeyX'] || game.keys['KeyZ']) && game.player.powerState === 'fire') {
            // Prevent rapid fire - only shoot if key was just pressed
            if (!game.player.shootCooldown) {
                game.fireballs.push({
                    x: game.player.x + (game.player.facingRight ? game.player.width : -10),
                    y: game.player.y + 10,
                    vx: game.player.facingRight ? 3 : -3,
                    vy: -1,
                    width: 8,
                    height: 8,
                    bounces: 0,
                    maxBounces: 3
                });
                game.player.shootCooldown = 15; // Cooldown frames
            }
        }
        
        // Update shoot cooldown
        if (game.player.shootCooldown > 0) {
            game.player.shootCooldown--;
        }
        
        game.player.vy += 0.5;
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;
        
        game.player.onGround = false;
        
        // Use shared collision detection
        handlePlatformCollision(game.player);
        
        // Check collision with blocks separately
        game.blocks.forEach(block => {
            if (game.player.x < block.x + block.width &&
                game.player.x + game.player.width > block.x &&
                game.player.y < block.y + block.height &&
                game.player.y + game.player.height > block.y) {
                
                // Landing on top
                if (game.player.vy > 0 && game.player.y < block.y) {
                    game.player.y = block.y - game.player.height;
                    game.player.vy = 0;
                    game.player.onGround = true;
                }
                // Hitting from below
                else if (game.player.vy < 0 && game.player.y > block.y) {
                    game.player.y = block.y + block.height;
                    game.player.vy = 0;
                    checkBlockHit(block);
                }
                // Side collision
                else if (game.player.vx > 0) {
                    game.player.x = block.x - game.player.width;
                } else if (game.player.vx < 0) {
                    game.player.x = block.x + block.width;
                }
            }
        });
        
        game.camera.x = Math.max(0, game.player.x - 300);
    }
    
    function checkBlockHit(block) {
        if (block.hit) return;
        
        if (block.type === 'brick') {
            // Only big Mario can break bricks
            if (game.player.powerState === 'big' || game.player.powerState === 'fire') {
                // Brick explodes - create particle animation
                for (let i = 0; i < 4; i++) {
                    game.particles.push({
                        x: block.x + (i % 2) * 10,
                        y: block.y + Math.floor(i / 2) * 10,
                        vx: (i % 2 === 0 ? -1 : 1) * (1 + Math.random()),
                        vy: -2 - Math.random() * 2,
                        width: 6,
                        height: 6,
                        life: 60,
                        type: 'brick'
                    });
                }
                
                // Remove the brick
                const blockIndex = game.blocks.indexOf(block);
                if (blockIndex > -1) {
                    game.blocks.splice(blockIndex, 1);
                }
                
                game.player.score += 50;
            }
            // Small Mario just bounces off bricks (no explosion)
            return;
        }
        
        block.hit = true;
        
        if (block.type === 'question' && block.content) {
            if (block.content === 'coin') {
                game.player.score += 200;
                
                // Add coin animation above the block
                game.particles.push({
                    x: block.x + block.width/2 - 8,
                    y: block.y - 16,
                    vx: 0,
                    vy: -2,
                    life: 30,
                    maxLife: 30,
                    type: 'coin',
                    width: 16,
                    height: 16
                });
            } else {
                // Determine power-up type based on Mario's current state
                let powerUpType = block.content;
                if (block.content === 'fireflower' && game.player.powerState === 'small') {
                    powerUpType = 'mushroom'; // Small Mario gets mushroom instead of fire flower
                }
                
                game.powerUps.push({
                    x: block.x, y: block.y - 32,
                    width: 32, height: 32,
                    type: powerUpType, 
                    vx: powerUpType === 'fireflower' ? 0 : 1, // Fire flowers don't move
                    vy: 0
                });
            }
            block.content = null;
        }
    }
    
    function updateMovingPlatforms() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.platforms.forEach(platform => {
            if (platform.moving) {
                // Check if Mario is on this moving platform
                const marioOnPlatform = 
                    game.player.x + game.player.width > platform.x &&
                    game.player.x < platform.x + platform.width &&
                    game.player.y + game.player.height >= platform.y - 2 &&
                    game.player.y + game.player.height <= platform.y + 8;
                
                if (marioOnPlatform) {
                    // Mario is on this platform - override gravity
                    game.player.onGround = true;
                    game.player.y = platform.y - game.player.height;
                    
                    // Move Mario with platform
                    if (platform.vy) {
                        if (platform.vy < 0) {
                            // Moving up
                            game.player.y += platform.vy;
                            game.player.vy = 0;
                        } else {
                            // Moving down
                            game.player.vy = platform.vy;
                        }
                    } else {
                        game.player.vy = 0;
                    }
                    
                    if (platform.vx) {
                        game.player.x += platform.vx;
                    }
                }
                
                // Move platform based on type
                if (platform.type === 'moving_up' || platform.type === 'moving_down') {
                    // Original girder platforms - wrap around screen
                    platform.y += platform.vy;
                    
                    if (platform.vy < 0 && platform.y < -platform.height) {
                        platform.y = 400;
                    } else if (platform.vy > 0 && platform.y > 400) {
                        platform.y = -platform.height;
                    }
                } else if (platform.type === 'vertical_moving') {
                    // W platforms - bounce between top and bottom
                    platform.y += platform.vy;
                    
                    if (platform.vy > 0 && platform.y >= platform.bottomY) {
                        platform.y = platform.bottomY;
                        platform.vy = -1; // Start moving up
                    } else if (platform.vy < 0 && platform.y <= platform.topY) {
                        platform.y = platform.topY;
                        platform.vy = 1; // Start moving down
                    }
                } else if (platform.type === 'horizontal_moving') {
                    // Z platforms - bounce between left and right
                    platform.x += platform.vx;
                    
                    if (platform.vx > 0 && platform.x >= platform.rightX) {
                        platform.x = platform.rightX;
                        platform.vx = -1; // Start moving left
                    } else if (platform.vx < 0 && platform.x <= platform.leftX) {
                        platform.x = platform.leftX;
                        platform.vx = 1; // Start moving right
                    }
                }
            }
        });
    }
    
    function updateEnemies() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.enemies.forEach((enemy, index) => {
            if (!enemy.alive) return;
            
            // Initialize enemy properties if not set
            if (!enemy.width) {
                if (enemy.type === 'koopa') {
                    enemy.width = 20;
                    enemy.height = 20;
                    enemy.vx = -1;
                } else if (enemy.type === 'parakoopa') {
                    enemy.width = 20;
                    enemy.height = 20;
                    enemy.vx = 0; // No horizontal movement
                } else if (enemy.type === 'piranha') {
                    enemy.width = 20;
                    enemy.height = 32;
                    enemy.vx = 0; // Piranha plants don't move horizontally
                    // Keep original Y position from map parsing
                }
                enemy.vy = 0;
                enemy.state = EnemyBehaviors[enemy.type]?.defaultState || 'walking';
                enemy.alive = true;
                enemy.onGround = true;
                enemy.animFrame = 0;
                enemy.animTimer = 0;
            }
            
            // Add gravity to enemies (except piranha plants and parakoopas)
            if (enemy.type !== 'piranha' && enemy.type !== 'parakoopa') {
                if (!enemy.vy) enemy.vy = 0;
                enemy.vy += 0.3; // Gravity
                enemy.y += enemy.vy;
            }
            
            // Use shared collision detection for ground (except piranha plants and parakoopas)
            if (enemy.type !== 'piranha' && enemy.type !== 'parakoopa') {
                handlePlatformCollision(enemy);
            }
            
            // Remove enemies that fall too far (into pits)
            if (enemy.y > 500) {
                enemy.alive = false;
                return;
            }
            
            // Use behavior system for movement
            const behavior = EnemyBehaviors[enemy.type];
            if (behavior && behavior.movement) {
                behavior.movement(enemy);
            }
            
            // Enemy collision with platforms and blocks (side collisions only) - AFTER movement
            let hitWall = false;
            let platformCount = 0;
            game.platforms.forEach(platform => {
                // Count platforms near this enemy for debug
                if (Math.abs(platform.x - enemy.x) < 100) {
                    platformCount++;
                }
                
                if (enemy.x < platform.x + platform.width &&
                    enemy.x + enemy.width > platform.x &&
                    enemy.y < platform.y + platform.height &&
                    enemy.y + enemy.height > platform.y) {
                    
                    // Only reverse direction for side collisions, not when standing on top
                    const enemyBottom = enemy.y + enemy.height;
                    const platformTop = platform.y;
                    
                    if (enemyBottom <= platformTop + 5) {
                        // Enemy is on top of platform, don't reverse direction
                        return;
                    }
                    
                    if (game.frameCount % 60 === 0) {
                        console.log(`Enemy ${index} colliding with platform at x:${platform.x} y:${platform.y} w:${platform.width} h:${platform.height}`);
                    }
                    
                    if (enemy.vx > 0) {
                        if (game.frameCount % 60 === 0 && index > 5) {
                            console.log(`Enemy ${index} pushed left by platform at x:${platform.x}, enemy moved from ${enemy.x} to ${platform.x - enemy.width}`);
                        }
                        enemy.x = platform.x - enemy.width;
                        hitWall = true;
                    } else if (enemy.vx < 0) {
                        if (game.frameCount % 60 === 0 && index > 5) {
                            console.log(`Enemy ${index} pushed right by platform at x:${platform.x}, enemy moved from ${enemy.x} to ${platform.x + platform.width}`);
                        }
                        enemy.x = platform.x + platform.width;
                        hitWall = true;
                    }
                }
            });
            
            if (hitWall) {
                enemy.vx *= -1;
            }
            
            enemy.animTimer++;
            if (enemy.animTimer > 20) {
                enemy.animFrame = (enemy.animFrame + 1) % 2;
                enemy.animTimer = 0;
            }
            
            if (enemy.x <= 100 || enemy.x >= game.levelWidth - 150) {
                enemy.vx *= -1;
            }
            
            // Player collision
            if (!game.player.invincible && 
                game.player.x < enemy.x + enemy.width &&
                game.player.x + game.player.width > enemy.x &&
                game.player.y < enemy.y + enemy.height &&
                game.player.y + game.player.height > enemy.y) {
                
                // Skip collision for hidden piranha plants
                if (enemy.type === 'piranha' && (enemy.state === 'hidden' || enemy.state === 'retreating')) {
                    return;
                }
                
                if (game.player.vy > 0 && game.player.y < enemy.y) {
                    // Jumping on enemy - use behavior system
                    const behavior = EnemyBehaviors[enemy.type];
                    if (behavior && behavior.onStomp) {
                        behavior.onStomp(enemy, game.player);
                    }
                } else {
                    // Hit by enemy - use behavior system
                    const behavior = EnemyBehaviors[enemy.type];
                    if (behavior && behavior.onSideHit) {
                        behavior.onSideHit(enemy, game.player);
                    }
                }
            }
        });
    }
    
    function checkCoinCollection() {
        game.coins.forEach(coin => {
            if (!coin.collected &&
                game.player.x < coin.x + coin.width &&
                game.player.x + game.player.width > coin.x &&
                game.player.y < coin.y + coin.height &&
                game.player.y + game.player.height > coin.y) {
                
                coin.collected = true;
                game.player.score += 200;
            }
        });
    }
    
    function checkWin() {
        if (game.flag && game.player.x + game.player.width > game.flag.x) {
            nextLevel();
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Use theme system for background
        ThemeSystem.renderBackground(ctx, canvas);
        
        ctx.save();
        ctx.translate(-game.camera.x, 0);
        
        // Draw tree trunks first (background)
        const treePlatforms = game.platforms.filter(p => p.type === 'tree');
        const processedTrees = new Set();
        
        treePlatforms.forEach(platform => {
            const key = `${platform.x},${platform.y}`;
            if (processedTrees.has(key)) return;
            
            // Find connected tree platforms (horizontal group)
            let minX = platform.x;
            let maxX = platform.x + platform.width;
            let treeY = platform.y;
            
            // Check for connected platforms to the right
            let checkX = platform.x + platform.width;
            while (treePlatforms.some(p => p.x === checkX && p.y === treeY)) {
                maxX = checkX + platform.width;
                processedTrees.add(`${checkX},${treeY}`);
                checkX += platform.width;
            }
            
            // Check for connected platforms to the left
            checkX = platform.x - platform.width;
            while (treePlatforms.some(p => p.x === checkX && p.y === treeY)) {
                minX = checkX;
                processedTrees.add(`${checkX},${treeY}`);
                checkX -= platform.width;
            }
            
            processedTrees.add(key);
            
            // Draw tree top as solid lime green rectangle with rounded corners
            const treeWidth = maxX - minX;
            const cornerRadius = 4;
            
            // Main tree top rectangle
            ctx.fillStyle = '#32CD32'; // Lime green
            ctx.fillRect(minX, treeY, treeWidth, platform.height);
            
            // Round off the top corners by removing sharp corner pixels
            ctx.fillStyle = ThemeSystem.getColor('sky'); // Sky color to "erase" corners
            
            // Top-left corner rounding
            ctx.fillRect(minX, treeY, 2, 1); // Remove corner pixels
            ctx.fillRect(minX, treeY + 1, 1, 1);
            
            // Top-right corner rounding  
            ctx.fillRect(maxX - 2, treeY, 2, 1); // Remove corner pixels
            ctx.fillRect(maxX - 1, treeY + 1, 1, 1);
            
            // Darker green shadow at bottom
            ctx.fillStyle = '#228B22'; // Darker green shadow
            ctx.fillRect(minX, treeY + platform.height - 3, treeWidth, 3);
            
            // Create shaded half-circle bumps hanging down from the bottom
            const bumpRadius = 6;
            const bumpSpacing = 12;
            for (let x = minX + bumpRadius; x < maxX - bumpRadius; x += bumpSpacing) {
                const centerX = x;
                const centerY = treeY + platform.height;
                
                // Draw half-circle bump hanging down with shading
                for (let i = -bumpRadius; i <= bumpRadius; i++) {
                    const height = Math.sqrt(bumpRadius * bumpRadius - i * i);
                    
                    // Light green on top/left side of bump
                    if (i <= 0) {
                        ctx.fillStyle = '#32CD32'; // Light green highlight
                    } else {
                        ctx.fillStyle = '#006400'; // Dark green shadow
                    }
                    
                    ctx.fillRect(centerX + i, centerY, 1, height);
                }
            }
            
            // Draw single trunk for this tree group (middle section)
            const trunkWidth = Math.max(8, treeWidth - 40); // Narrower trunk
            const trunkX = minX + (treeWidth - trunkWidth) / 2;
            
            // Tree trunk
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(trunkX, treeY + platform.height, trunkWidth, 400 - (treeY + platform.height));
            
            // Tree trunk shading
            ctx.fillStyle = '#654321';
            ctx.fillRect(trunkX, treeY + platform.height, 2, 400 - (treeY + platform.height));
            ctx.fillRect(trunkX + trunkWidth - 2, treeY + platform.height, 2, 400 - (treeY + platform.height));
        });
        
        // Castles (background elements - render before everything else)
        if (game.castles && game.castles.length > 0) {
            game.castles.forEach(castle => {
            const isLarge = castle.large;
            
            // Helper function to draw brick pattern
            function drawBrickPattern(x, y, width, height, baseColor, shadowColor) {
                ctx.fillStyle = baseColor;
                ctx.fillRect(x, y, width, height);
                
                // Draw brick lines
                ctx.fillStyle = shadowColor;
                const brickHeight = 8;
                const brickWidth = 16;
                
                // Horizontal lines
                for (let row = 0; row < height; row += brickHeight) {
                    ctx.fillRect(x, y + row, width, 1);
                }
                
                // Vertical lines (offset every other row)
                for (let row = 0; row < height; row += brickHeight) {
                    const offset = (Math.floor(row / brickHeight) % 2) * (brickWidth / 2);
                    for (let col = offset; col < width; col += brickWidth) {
                        ctx.fillRect(x + col, y + row, 1, brickHeight);
                    }
                }
            }
            
            // Castle dimensions based on size
            const castleWidth = isLarge ? 160 : 120;
            const towerWidth = isLarge ? 40 : 30;
            const towerHeight = isLarge ? 180 : 140;
            
            // Draw tiered castle structure with proper shading boundaries
            if (isLarge) {
                // 3-tier castle - draw from bottom to top (largest to smallest)
                const tier1Width = castleWidth;
                const tier2Width = castleWidth * 0.75;
                const tier3Width = castleWidth * 0.5;
                const tierHeight = 60;
                
                // Tier 1 (bottom/largest) - draw first
                drawBrickPattern(castle.x, castle.y + tierHeight * 2, tier1Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(castle.x, castle.y + tierHeight * 2, 2, tierHeight);
                ctx.fillRect(castle.x, castle.y + tierHeight * 2, tier1Width, 2);
                ctx.fillStyle = '#696969';
                ctx.fillRect(castle.x + tier1Width - 2, castle.y + tierHeight * 2, 2, tierHeight);
                ctx.fillRect(castle.x, castle.y + tierHeight * 3 - 2, tier1Width, 2);
                
                // Tier 2 (middle) - draw second
                const tier2X = castle.x + (tier1Width - tier2Width) / 2;
                drawBrickPattern(tier2X, castle.y + tierHeight, tier2Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(tier2X, castle.y + tierHeight, 2, tierHeight);
                ctx.fillRect(tier2X, castle.y + tierHeight, tier2Width, 2);
                ctx.fillStyle = '#696969';
                ctx.fillRect(tier2X + tier2Width - 2, castle.y + tierHeight, 2, tierHeight);
                ctx.fillRect(tier2X, castle.y + tierHeight * 2 - 2, tier2Width, 2);
                
                // Tier 3 (top/smallest) - draw last with limited shading
                const tier3X = castle.x + (tier1Width - tier3Width) / 2;
                drawBrickPattern(tier3X, castle.y, tier3Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(tier3X, castle.y, 2, tierHeight);
                ctx.fillRect(tier3X, castle.y, tier3Width, 2);
                ctx.fillStyle = '#696969';
                // Only shade the right edge within the tier bounds
                ctx.fillRect(tier3X + tier3Width - 2, castle.y, 2, tierHeight);
                // Only shade the bottom edge within the tier bounds  
                ctx.fillRect(tier3X, castle.y + tierHeight - 2, tier3Width, 2);
            } else {
                // 2-tier castle - draw from bottom to top
                const tier1Width = castleWidth;
                const tier2Width = castleWidth * 0.7;
                const tierHeight = 70;
                
                // Tier 1 (bottom/larger) - draw first
                drawBrickPattern(castle.x, castle.y + tierHeight, tier1Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(castle.x, castle.y + tierHeight, 2, tierHeight);
                ctx.fillRect(castle.x, castle.y + tierHeight, tier1Width, 2);
                ctx.fillStyle = '#696969';
                ctx.fillRect(castle.x + tier1Width - 2, castle.y + tierHeight, 2, tierHeight);
                ctx.fillRect(castle.x, castle.y + tierHeight * 2 - 2, tier1Width, 2);
                
                // Tier 2 (top/smaller) - draw second with limited shading
                const tier2X = castle.x + (tier1Width - tier2Width) / 2;
                drawBrickPattern(tier2X, castle.y, tier2Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(tier2X, castle.y, 2, tierHeight);
                ctx.fillRect(tier2X, castle.y, tier2Width, 2);
                ctx.fillStyle = '#696969';
                // Only shade within tier bounds
                ctx.fillRect(tier2X + tier2Width - 2, castle.y, 2, tierHeight);
                ctx.fillRect(tier2X, castle.y + tierHeight - 2, tier2Width, 2);
            }
            
            // Left tower (positioned to reach ground) with shading - draw first
            const totalCastleHeight = isLarge ? 180 : 140;
            drawBrickPattern(castle.x - 30, castle.y + totalCastleHeight - towerHeight, towerWidth, towerHeight, '#A0A0A0', '#808080');
            // Tower shading
            ctx.fillStyle = '#696969';
            ctx.fillRect(castle.x - 30 + towerWidth - 2, castle.y + totalCastleHeight - towerHeight, 2, towerHeight);
            ctx.fillRect(castle.x - 30, castle.y + totalCastleHeight - 2, towerWidth, 2);
            
            // Right tower (positioned to reach ground) with shading - draw second
            drawBrickPattern(castle.x + castleWidth - 10, castle.y + totalCastleHeight - towerHeight, towerWidth, towerHeight, '#A0A0A0', '#808080');
            // Tower shading
            ctx.fillStyle = '#696969';
            ctx.fillRect(castle.x + castleWidth - 10 + towerWidth - 2, castle.y + totalCastleHeight - towerHeight, 2, towerHeight);
            ctx.fillRect(castle.x + castleWidth - 10, castle.y + totalCastleHeight - 2, towerWidth, 2);
            
            // Center tower (only for large castle) - draw BEHIND the tiers, not in front
            if (isLarge) {
                // Position center tower to only extend above the top tier, not from ground
                const centerTowerHeight = 60; // Only above the castle
                drawBrickPattern(castle.x + castleWidth/2 - 20, castle.y - centerTowerHeight, towerWidth, centerTowerHeight, '#A0A0A0', '#808080');
                // Center tower shading
                ctx.fillStyle = '#696969';
                ctx.fillRect(castle.x + castleWidth/2 - 20 + towerWidth - 2, castle.y - centerTowerHeight, 2, centerTowerHeight);
                ctx.fillRect(castle.x + castleWidth/2 - 20, castle.y - 2, towerWidth, 2);
            }
            
            // Tower crenellations (battlements)
            ctx.fillStyle = '#A0A0A0';
            
            // Left tower crenellations
            const leftTowerX = castle.x - 30;
            const leftTowerTop = castle.y + totalCastleHeight - towerHeight - 10;
            for (let i = 0; i < Math.floor(towerWidth/8); i++) {
                if (i % 2 === 0) {
                    ctx.fillRect(leftTowerX + i * 8, leftTowerTop, 6, 10);
                }
            }
            
            // Right tower crenellations
            const rightTowerX = castle.x + castleWidth - 10;
            const rightTowerTop = castle.y + totalCastleHeight - towerHeight - 10;
            for (let i = 0; i < Math.floor(towerWidth/8); i++) {
                if (i % 2 === 0) {
                    ctx.fillRect(rightTowerX + i * 8, rightTowerTop, 6, 10);
                }
            }
            
            // Castle tier crenellations
            if (isLarge) {
                // 3-tier castle crenellations
                const tierHeight = 60;
                
                // Top tier (tier 3) crenellations
                const tier3Width = castleWidth * 0.5;
                const tier3X = castle.x + (castleWidth - tier3Width) / 2;
                for (let i = 0; i < Math.floor(tier3Width/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(tier3X + i * 8, castle.y - 10, 6, 10);
                    }
                }
                
                // Middle tier (tier 2) crenellations
                const tier2Width = castleWidth * 0.75;
                const tier2X = castle.x + (castleWidth - tier2Width) / 2;
                for (let i = 0; i < Math.floor(tier2Width/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(tier2X + i * 8, castle.y + tierHeight - 10, 6, 10);
                    }
                }
                
                // Bottom tier (tier 1) crenellations
                for (let i = 0; i < Math.floor(castleWidth/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(castle.x + i * 8, castle.y + tierHeight * 2 - 10, 6, 10);
                    }
                }
                
                // Center tower crenellations
                const centerTowerX = castle.x + castleWidth/2 - 20;
                const centerTowerTop = castle.y - 60 - 10; // Top of the shortened center tower
                for (let i = 0; i < Math.floor(towerWidth/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(centerTowerX + i * 8, centerTowerTop, 6, 10);
                    }
                }
            } else {
                // 2-tier castle crenellations
                const tierHeight = 70;
                
                // Top tier (tier 2) crenellations
                const tier2Width = castleWidth * 0.7;
                const tier2X = castle.x + (castleWidth - tier2Width) / 2;
                for (let i = 0; i < Math.floor(tier2Width/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(tier2X + i * 8, castle.y - 10, 6, 10);
                    }
                }
                
                // Bottom tier (tier 1) crenellations
                for (let i = 0; i < Math.floor(castleWidth/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(castle.x + i * 8, castle.y + tierHeight - 10, 6, 10);
                    }
                }
            }
            
            // Windows on tiers
            ctx.fillStyle = '#000000';
            
            if (isLarge) {
                // 3-tier castle windows
                const tierHeight = 60;
                // Tier 1 windows (bottom)
                ctx.fillRect(castle.x + 20, castle.y + tierHeight * 2 + 25, 12, 16);
                ctx.fillRect(castle.x + castleWidth - 32, castle.y + tierHeight * 2 + 25, 12, 16);
                // Tier 2 windows (middle)
                ctx.fillRect(castle.x + castleWidth * 0.3, castle.y + tierHeight + 25, 12, 16);
                ctx.fillRect(castle.x + castleWidth * 0.7 - 12, castle.y + tierHeight + 25, 12, 16);
                // Tier 3 windows (top)
                ctx.fillRect(castle.x + castleWidth * 0.4, castle.y + 25, 12, 16);
                ctx.fillRect(castle.x + castleWidth * 0.6 - 12, castle.y + 25, 12, 16);
            } else {
                // 2-tier castle windows
                const tierHeight = 70;
                // Tier 1 windows (bottom)
                ctx.fillRect(castle.x + 20, castle.y + tierHeight + 30, 12, 16);
                ctx.fillRect(castle.x + castleWidth - 32, castle.y + tierHeight + 30, 12, 16);
                // Tier 2 windows (top)
                ctx.fillRect(castle.x + castleWidth * 0.35, castle.y + 30, 12, 16);
                ctx.fillRect(castle.x + castleWidth * 0.65 - 12, castle.y + 30, 12, 16);
            }
            
            // Tower windows
            ctx.fillRect(castle.x - 20, castle.y + 40, 8, 12);
            ctx.fillRect(castle.x + castleWidth - 2, castle.y + 40, 8, 12);
            
            // Center tower window (large castle only)
            if (isLarge) {
                ctx.fillRect(castle.x + castleWidth/2 - 6, castle.y - 30, 12, 16);
            }
            
            // Main entrance - arched door (on bottom tier)
            ctx.fillStyle = '#000000';
            const doorWidth = isLarge ? 40 : 30;
            const doorHeight = isLarge ? 40 : 35;
            const doorX = castle.x + castleWidth/2 - doorWidth/2;
            const doorY = castle.y + (isLarge ? 180 - doorHeight : 140 - doorHeight);
            
            // Door rectangle
            ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
            
            // Door arch (semicircle top)
            ctx.beginPath();
            ctx.arc(doorX + doorWidth/2, doorY, doorWidth/2, Math.PI, 0, false);
            ctx.fill();
            
            // Castle flag
            const flagPoleX = castle.x + castleWidth/2 - 2;
            let flagPoleY;
            if (isLarge) {
                // Large castle: flag at top of center tower
                flagPoleY = castle.y - 60 - 30; // Raised by 10 pixels
            } else {
                // Small castle: flag at top of top tier
                flagPoleY = castle.y - 35; // Lowered by 5 pixels
            }
            const flagPoleHeight = 30;
            
            // Flag pole
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(flagPoleX, flagPoleY, 3, flagPoleHeight);
            
            // Flag (triangular, right-side up)
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(flagPoleX + 3, flagPoleY);
            ctx.lineTo(flagPoleX + 25, flagPoleY + 8);
            ctx.lineTo(flagPoleX + 3, flagPoleY + 16);
            ctx.closePath();
            ctx.fill();
            
            // Flag details (Mushroom Kingdom emblem)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(flagPoleX + 12, flagPoleY + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            });
        }
        
        // Piranha plants (render behind pipes)
        game.enemies.forEach(enemy => {
            if (enemy.alive && enemy.type === 'piranha') {
                SpriteRenderer.enemies[enemy.type](ctx, enemy);
            }
        });
        
        // Platforms
        game.platforms.forEach(platform => {
            if (platform.type === 'pipe') {
                // Pipe body - green
                ctx.fillStyle = ThemeSystem.getColor('pipe');
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                
                // Pipe rim (top edge) - lighter green
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(platform.x - 2, platform.y - 8, platform.width + 4, 12);
                
                // Pipe highlights
                ctx.fillStyle = '#90EE90';
                ctx.fillRect(platform.x + 2, platform.y, 2, platform.height);
                
                // Pipe shadows
                ctx.fillStyle = ThemeSystem.getColor('pipeShadow');
                ctx.fillRect(platform.x + platform.width - 2, platform.y, 2, platform.height);
                
                // Pipe highlights
                ctx.fillStyle = '#90EE90';
                ctx.fillRect(platform.x + 2, platform.y, 2, platform.height);
                
                // Pipe shadows
                ctx.fillStyle = ThemeSystem.getColor('pipeShadow');
                ctx.fillRect(platform.x + platform.width - 2, platform.y, 2, platform.height);
            } else {
                // Use theme system for platform rendering
                ThemeSystem.renderPlatform(ctx, platform);
            }
        });
        
        // Pits (render lava for castle theme)
        if (game.pits && game.pits.length > 0) {
            game.pits.forEach(pit => {
                if (ThemeSystem.current?.name === 'Castle') {
                    // Bubbling lava pit
                    const lavaY = 380; // Ground level
                    const lavaHeight = 100;
                    
                    // Base lava
                    ctx.fillStyle = ThemeSystem.getColor('lava');
                    ctx.fillRect(pit.x, lavaY, pit.width, lavaHeight);
                    
                    // Animated bubbles
                    const time = game.frameCount * 0.1;
                    const bubbleCount = Math.floor(pit.width / 8);
                    
                    for (let i = 0; i < bubbleCount; i++) {
                        const bubbleX = pit.x + (i * 8) + Math.sin(time + i) * 2;
                        const bubbleY = lavaY + 10 + Math.sin(time * 2 + i * 0.5) * 5;
                        const bubbleSize = 2 + Math.sin(time * 3 + i) * 1;
                        
                        ctx.fillStyle = ThemeSystem.getColor('lavaBubble');
                        ctx.fillRect(bubbleX, bubbleY, bubbleSize, bubbleSize);
                    }
                    
                    // Lava glow effect
                    ctx.fillStyle = '#FF6500';
                    ctx.fillRect(pit.x, lavaY, pit.width, 3);
                }
            });
        }
        
        // Blocks
        game.blocks.forEach(block => {
            ThemeSystem.renderBlock(ctx, block);
        });
        
        // Power-ups
        game.powerUps.forEach(powerUp => {
            if (powerUp.type === 'mushroom') {
                // Super Mushroom - red with white spots (1.5x size)
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(powerUp.x + 3, powerUp.y + 12, 18, 12); // Mushroom cap
                ctx.fillRect(powerUp.x + 6, powerUp.y + 9, 12, 3);   // Cap top
                
                // White spots on cap
                ctx.fillStyle = '#FFF';
                ctx.fillRect(powerUp.x + 7, powerUp.y + 14, 3, 3);
                ctx.fillRect(powerUp.x + 14, powerUp.y + 14, 3, 3);
                ctx.fillRect(powerUp.x + 10, powerUp.y + 18, 3, 3);
                
                // Mushroom stem - beige/tan (smaller)
                ctx.fillStyle = '#FFDBAC';
                ctx.fillRect(powerUp.x + 10, powerUp.y + 24, 4, 8);
                
                // Stem shading
                ctx.fillStyle = '#DEB887';
                ctx.fillRect(powerUp.x + 11, powerUp.y + 25, 2, 6);
                
            } else if (powerUp.type === 'fireflower') {
                // Fire Flower - orange petals with yellow center
                ctx.fillStyle = '#FF4500';
                
                // Flower petals (4 petals in cross pattern)
                ctx.fillRect(powerUp.x + 7, powerUp.y + 4, 2, 6);  // Top petal
                ctx.fillRect(powerUp.x + 7, powerUp.y + 14, 2, 6); // Bottom petal
                ctx.fillRect(powerUp.x + 3, powerUp.y + 10, 6, 2); // Left petal
                ctx.fillRect(powerUp.x + 11, powerUp.y + 10, 6, 2); // Right petal
                
                // Yellow center
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(powerUp.x + 6, powerUp.y + 9, 4, 4);
                
                // Green stem
                ctx.fillStyle = '#228B22';
                ctx.fillRect(powerUp.x + 7, powerUp.y + 20, 2, 8);
                
                // Small leaves on stem
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(powerUp.x + 5, powerUp.y + 22, 2, 1);
                ctx.fillRect(powerUp.x + 9, powerUp.y + 24, 2, 1);
                
            } else if (powerUp.type === 'star') {
                // Super Star - yellow with animated sparkle
                ctx.fillStyle = '#FFD700';
                
                // Star shape (simplified as diamond with points)
                ctx.fillRect(powerUp.x + 7, powerUp.y + 2, 2, 4);   // Top point
                ctx.fillRect(powerUp.x + 5, powerUp.y + 6, 6, 4);   // Middle section
                ctx.fillRect(powerUp.x + 3, powerUp.y + 8, 2, 2);   // Left point
                ctx.fillRect(powerUp.x + 11, powerUp.y + 8, 2, 2);  // Right point
                ctx.fillRect(powerUp.x + 7, powerUp.y + 10, 2, 4);  // Bottom point
                
                // Sparkle effect (animated)
                ctx.fillStyle = '#FFF';
                const sparkleOffset = Math.floor(Date.now() / 100) % 4;
                ctx.fillRect(powerUp.x + 1 + sparkleOffset, powerUp.y + 4, 1, 1);
                ctx.fillRect(powerUp.x + 14 - sparkleOffset, powerUp.y + 12, 1, 1);
            }
        });
        
        // Enemies (except piranha plants which are rendered behind pipes)
        game.enemies.forEach(enemy => {
            if (enemy.alive && enemy.type !== 'piranha') {
                SpriteRenderer.enemies[enemy.type](ctx, enemy);
            }
        });
        
        // Entity System Rendering - Phase 2 (in world coordinates)
        ctx.save();
        ctx.translate(-game.camera.x, 0);
        game.renderSystem.render(ctx, game.entityManager);
        ctx.restore();
        
        // Coins
        game.coins.forEach(coin => {
            if (!coin.collected) {
                // Draw oval-shaped yellow coin
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(coin.x + 6, coin.y + 4, 8, 12); // Taller oval shape
                ctx.fillStyle = '#FFA500';
                ctx.fillRect(coin.x + 8, coin.y + 6, 4, 8); // Taller inner oval
            }
        });
        
        // Fireballs
        game.fireballs.forEach(fireball => {
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(fireball.x, fireball.y, fireball.width, fireball.height);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(fireball.x + 1, fireball.y + 1, fireball.width - 2, fireball.height - 2);
        });
        
        // Player (with invincibility flashing)
        if (!game.player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
            SpriteRenderer.player.mario(ctx, game.player);
        }
        
        // Particles (coins, effects)
        game.particles.forEach(particle => {
            if (particle.type === 'coin') {
                // Render animated coin
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(particle.x, particle.y, particle.width, particle.height);
                ctx.fillStyle = '#FFA500';
                ctx.fillRect(particle.x + 2, particle.y + 2, particle.width - 4, particle.height - 4);
                
                // Add score text
                ctx.fillStyle = '#FFF';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('200', particle.x + particle.width/2, particle.y - 5);
                ctx.textAlign = 'left';
            } else if (particle.type === 'brick') {
                // Render brick fragments
                ctx.fillStyle = '#CD853F';
                ctx.fillRect(particle.x, particle.y, particle.width, particle.height);
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(particle.x + 1, particle.y + 1, particle.width - 2, particle.height - 2);
            }
        });
        
        // Flag
        if (game.flag) {
            const flagPoleColor = game.currentTheme === 'underground' ? '#FFFFFF' : '#000000';
            ctx.fillStyle = flagPoleColor;
            ctx.fillRect(game.flag.x, game.flag.y, 5, game.flag.height);
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(game.flag.x + 5, game.flag.y, 30, 20);
        }
        
        ctx.restore();
        
        // UI
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(`Lives: ${game.player.lives}`, 10, 30);
        ctx.fillText(`Score: ${game.player.score}`, 10, 60);
        ctx.fillText(`Level: ${game.levelsCompleted + 1}/${game.levelsToWin}`, 10, 90);
        
        if (!game.gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Use Arrow Keys or WASD to move', canvas.width/2, canvas.height/2 - 20);
            ctx.fillText('SPACE or UP to jump. Reach the flag!', canvas.width/2, canvas.height/2 + 20);
        }
        
        if (game.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.font = '18px Arial';
            ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 40);
        }
    }
    
    function gameLoop() {
        // Handle level reset if needed
        if (game.needsLevelReset) {
            console.log('gameLoop: Processing needsLevelReset flag');
            game.needsLevelReset = false;
            console.log('gameLoop: Calling initializeGameState(true)');
            initializeGameState(true).then(() => {
                console.log('gameLoop: initializeGameState completed, continuing game loop');
                // Continue game loop after reset
                if (!game.gameOver && !game.won) {
                    requestAnimationFrame(gameLoop);
                }
            });
            return; // Skip this frame while resetting
        }
        
        game.frameCount++;
        updatePlayer();
        updateMovingPlatforms();
        updateEnemies();
        updatePowerUps();
        updateFireballs();
        updateParticles();
        
        // Update Entity System - Phase 1
        game.entityManager.update();
        
        checkScreenBoundary();
        checkCoinCollection();
        checkWin();
        render();
        
        if (!game.gameOver && !game.won) {
            requestAnimationFrame(gameLoop);
        }
    }
    
    function handleKeyDown(e) {
        game.keys[e.code] = true;
        
        if (!game.gameStarted) {
            game.gameStarted = true;
        }
        
        if (game.gameOver && e.code === 'KeyR') {
            console.log('R key pressed - restarting game');
            initializeGameState(false).then(() => {
                console.log('Game restarted successfully');
                gameLoop();
            });
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        game.keys[e.code] = false;
        e.preventDefault();
    }
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Classic Mario Bros platformer - jump on enemies, collect coins, reach the flag!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    initializeLevel().then(() => gameLoop());
    } // End startMarioGame function
} // End createMarioGame function
