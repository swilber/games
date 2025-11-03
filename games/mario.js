// Sprite rendering system for Mario game
const SpriteRenderer = {
    enemies: {
        goomba: (ctx, enemy) => {
            // Goomba body - brown mushroom with proper shape
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(enemy.x + 2, enemy.y + 6, 16, 10); // Main body
            ctx.fillRect(enemy.x + 4, enemy.y + 4, 12, 2);  // Top cap
            ctx.fillRect(enemy.x + 6, enemy.y + 2, 8, 2);   // Very top
            
            // Darker brown for shading
            ctx.fillStyle = '#654321';
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
            ctx.fillStyle = '#8B4513';
            if (enemy.animFrame === 0) {
                ctx.fillRect(enemy.x + 2, enemy.y + 16, 3, 2);
                ctx.fillRect(enemy.x + 15, enemy.y + 17, 3, 1);
            } else {
                ctx.fillRect(enemy.x + 15, enemy.y + 16, 3, 2);
                ctx.fillRect(enemy.x + 2, enemy.y + 17, 3, 1);
            }
        },
        
        koopa: (ctx, enemy) => {
            if (enemy.state === 'shell' || enemy.state === 'shellMoving') {
                // Shell only - green with yellow trim
                ctx.fillStyle = '#228B22';
                ctx.fillRect(enemy.x + 2, enemy.y + 4, 16, 12); // Shell body
                
                // Yellow shell trim
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(enemy.x + 2, enemy.y + 4, 16, 1);  // Top edge
                ctx.fillRect(enemy.x + 2, enemy.y + 15, 16, 1); // Bottom edge
                ctx.fillRect(enemy.x + 2, enemy.y + 5, 1, 10);  // Left edge
                ctx.fillRect(enemy.x + 17, enemy.y + 5, 1, 10); // Right edge
                
                // Shell pattern
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(enemy.x + 6, enemy.y + 8, 2, 2);
                ctx.fillRect(enemy.x + 12, enemy.y + 8, 2, 2);
                ctx.fillRect(enemy.x + 9, enemy.y + 11, 2, 2);
                
                // Add motion lines if moving
                if (enemy.state === 'shellMoving') {
                    ctx.fillStyle = '#FFF';
                    ctx.fillRect(enemy.x - 2, enemy.y + 6, 1, 1);
                    ctx.fillRect(enemy.x - 4, enemy.y + 10, 1, 1);
                    ctx.fillRect(enemy.x + 22, enemy.y + 8, 1, 1);
                    ctx.fillRect(enemy.x + 24, enemy.y + 12, 1, 1);
                }
            } else {
                // Walking Koopa - shell with head and feet
                ctx.fillStyle = '#228B22';
                ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 10); // Main shell
                
                // Yellow shell trim
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 1);  // Top edge
                ctx.fillRect(enemy.x + 2, enemy.y + 19, 16, 1);  // Bottom edge
                ctx.fillRect(enemy.x + 2, enemy.y + 11, 1, 8);   // Left edge
                ctx.fillRect(enemy.x + 17, enemy.y + 11, 1, 8);  // Right edge
                
                // Shell pattern
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(enemy.x + 6, enemy.y + 13, 2, 2);
                ctx.fillRect(enemy.x + 12, enemy.y + 13, 2, 2);
                ctx.fillRect(enemy.x + 9, enemy.y + 16, 2, 2);
                
                // Head
                ctx.fillStyle = '#FFFF99';
                ctx.fillRect(enemy.x + 6, enemy.y + 4, 8, 6); // Head
                
                // Eyes
                ctx.fillStyle = '#000';
                ctx.fillRect(enemy.x + 7, enemy.y + 5, 1, 1);
                ctx.fillRect(enemy.x + 12, enemy.y + 5, 1, 1);
                
                // Beak
                ctx.fillStyle = '#FFA500';
                ctx.fillRect(enemy.x + 9, enemy.y + 7, 2, 1);
                
                // Feet
                ctx.fillStyle = '#FFFF99';
                ctx.fillRect(enemy.x + 5, enemy.y + 20, 2, 1);
                ctx.fillRect(enemy.x + 13, enemy.y + 20, 2, 1);
            }
        }
    },
    player: {
        mario: (ctx, player) => {
            const isSmall = player.powerState === 'small';
            const isFire = player.powerState === 'fire';
            const baseY = player.y;
            const isMoving = Math.abs(player.vx) > 0.1;
            const isJumping = player.vy < -1 || !player.onGround; // Mario is jumping if not on ground
            const animFrame = Math.floor(Date.now() / 150) % 2; // Walking animation
            
            // NO CANVAS FLIPPING - handle direction manually
            
            // Mario's hat - red for normal, white for fire Mario
            ctx.fillStyle = isFire ? '#FFFFFF' : '#FF0000';
            if (isSmall) {
                ctx.fillRect(player.x + 2, baseY, 12, 4); // Back to original size
            } else {
                ctx.fillRect(player.x + 2, baseY, 16, 6);
            }
            
            ctx.fillStyle = isFire ? '#CCCCCC' : '#CC0000';
            if (isSmall) {
                ctx.fillRect(player.x + 3, baseY + 1, 10, 1); // Hat shadow back to original
            } else {
                ctx.fillRect(player.x + 3, baseY + 1, 14, 1);
            }
            
            // Face - peach color
            ctx.fillStyle = '#FFDBAC';
            if (isSmall) {
                ctx.fillRect(player.x + 3, baseY + 3, 10, 4); // Back to original size
                
                // Profile logic: front when stopped, side when moving/jumping
                if (Math.abs(player.vx) < 0.1 && !isJumping) {
                    // Front facing - both eyes
                    ctx.fillStyle = '#000';
                    ctx.fillRect(player.x + 5, baseY + 4, 1, 1); // Back to original
                    ctx.fillRect(player.x + 9, baseY + 4, 1, 1); // Back to original
                    // Front mustache
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(player.x + 6, baseY + 6, 4, 1); // Back to original
                } else if (player.facingRight) {
                    // Moving/jumping right - side profile
                    ctx.fillStyle = '#000';
                    ctx.fillRect(player.x + 6, baseY + 4, 2, 2); // Back to original
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(player.x + 6, baseY + 6, 4, 2); // Back to original
                } else {
                    // Moving/jumping left - side profile
                    ctx.fillStyle = '#000';
                    ctx.fillRect(player.x + 8, baseY + 4, 2, 2); // Back to original
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(player.x + 6, baseY + 6, 4, 2); // Back to original
                }
            } else {
                ctx.fillRect(player.x + 3, baseY + 5, 14, 6);
                
                // Profile logic: front when stopped, side when moving
                if (Math.abs(player.vx) < 0.1) {
                    // Front facing - both eyes
                    ctx.fillStyle = '#000';
                    ctx.fillRect(player.x + 6, baseY + 7, 1, 1);
                    ctx.fillRect(player.x + 12, baseY + 7, 1, 1);
                    // Front mustache
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(player.x + 7, baseY + 9, 6, 1);
                } else if (player.facingRight) {
                    // Moving right - side profile
                    ctx.fillStyle = '#FF0000'; // Red nose
                    ctx.fillRect(player.x + 16, baseY + 8, 2, 1);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(player.x + 10, baseY + 7, 1, 1); // Single eye
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(player.x + 8, baseY + 9, 4, 1); // Side mustache
                } else {
                    // Moving left - side profile
                    ctx.fillStyle = '#FF0000'; // Red nose
                    ctx.fillRect(player.x + 2, baseY + 8, 2, 1);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(player.x + 9, baseY + 7, 1, 1); // Single eye
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(player.x + 6, baseY + 9, 4, 1); // Side mustache
                }
            }
            
            if (!isSmall) {
                // Big Mario - overalls and shirt
                ctx.fillStyle = isFire ? '#FFFFFF' : '#0066CC'; // White overalls for fire Mario
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
                
                // Gloves - white (bigger) - jumping pose
                ctx.fillStyle = '#FFF';
                if (isJumping) {
                    if (player.facingRight) {
                        // Jumping right - arms extended
                        ctx.fillRect(player.x - 2, baseY + 14, 4, 4); // Left arm forward
                        ctx.fillRect(player.x + 18, baseY + 18, 4, 4); // Right arm back
                    } else {
                        // Jumping left - arms extended opposite
                        ctx.fillRect(player.x - 2, baseY + 18, 4, 4); // Left arm back
                        ctx.fillRect(player.x + 18, baseY + 14, 4, 4); // Right arm forward
                    }
                } else {
                    // Normal standing/walking pose
                    ctx.fillRect(player.x, baseY + 16, 3, 4);
                    ctx.fillRect(player.x + 17, baseY + 16, 3, 4);
                }
                
                // Shoes - brown (bigger) with walking animation
                ctx.fillStyle = '#8B4513';
                if (isMoving) {
                    // Walking animation - alternate foot positions
                    if (animFrame === 0) {
                        ctx.fillRect(player.x, baseY + 27, 6, 4);
                        ctx.fillRect(player.x + 14, baseY + 26, 6, 4);
                    } else {
                        ctx.fillRect(player.x, baseY + 26, 6, 4);
                        ctx.fillRect(player.x + 14, baseY + 27, 6, 4);
                    }
                } else {
                    // Standing still - both feet level
                    ctx.fillRect(player.x, baseY + 27, 6, 4);
                    ctx.fillRect(player.x + 14, baseY + 27, 6, 4);
                }
            } else {
                // Small Mario - just overalls (fit within 16px height) - back to original
                ctx.fillStyle = isFire ? '#FFFFFF' : '#0066CC';
                ctx.fillRect(player.x + 2, baseY + 4, 12, 6); // Back to original
                
                // Small gloves - back to original with jumping poses
                ctx.fillStyle = '#FFF';
                if (isJumping) {
                    if (player.facingRight) {
                        // Jumping right - right arm above head, left arm at body
                        ctx.fillRect(player.x + 10, baseY - 1, 2, 2); // Right arm above head (scaled down)
                        ctx.fillRect(player.x + 3, baseY + 6, 2, 2); // Left arm at body (scaled down)
                    } else {
                        // Jumping left - left arm above head, right arm at body
                        ctx.fillRect(player.x + 4, baseY - 1, 2, 2); // Left arm above head (scaled down)
                        ctx.fillRect(player.x + 11, baseY + 6, 2, 2); // Right arm at body (scaled down)
                    }
                } else {
                    // Normal standing/walking pose
                    ctx.fillRect(player.x + 1, baseY + 6, 2, 2); // Back to original
                    ctx.fillRect(player.x + 13, baseY + 6, 2, 2); // Back to original
                }
                
                // Small shoes - jumping poses with leg positions (scaled down)
                ctx.fillStyle = '#8B4513';
                if (isJumping) {
                    if (player.facingRight) {
                        // Jumping right - front leg forward, back leg down and back
                        ctx.fillRect(player.x + 13, baseY + 10, 4, 2); // Front leg forward (scaled down)
                        ctx.fillRect(player.x + 1, baseY + 14, 4, 2); // Back leg down and back (scaled down)
                    } else {
                        // Jumping left - front leg forward, back leg down and back
                        ctx.fillRect(player.x + 1, baseY + 10, 4, 2); // Front leg forward (scaled down)
                        ctx.fillRect(player.x + 13, baseY + 14, 4, 2); // Back leg down and back (scaled down)
                    }
                } else if (isMoving) {
                    // Walking animation - alternate foot positions (more visible)
                    if (animFrame === 0) {
                        ctx.fillRect(player.x + 2, baseY + 13, 4, 2); // Back to original size
                        ctx.fillRect(player.x + 10, baseY + 11, 4, 2); // Back to original size
                    } else {
                        ctx.fillRect(player.x + 2, baseY + 11, 4, 2); // Back to original size
                        ctx.fillRect(player.x + 10, baseY + 13, 4, 2); // Back to original size
                    }
                } else {
                    // Standing still - both feet level
                    ctx.fillRect(player.x + 2, baseY + 12, 4, 2); // Back to original size
                    ctx.fillRect(player.x + 10, baseY + 12, 4, 2); // Back to original size
                }
            }
            
            // FINAL PROFILE DRAWING - draw over everything else
            if (Math.abs(player.vx) >= 0.1 || isJumping) {
                if (player.facingRight) {
                    // Bigger nose for right facing
                    ctx.fillStyle = '#FFDBAC';
                    if (isSmall) {
                        ctx.fillRect(player.x + 12, baseY + 3, 3, 2); // Back to original scale, adjusted position
                    } else {
                        ctx.fillRect(player.x + 16, baseY + 7, 4, 3);
                    }
                } else {
                    // Bigger nose for left facing
                    ctx.fillStyle = '#FFDBAC';
                    if (isSmall) {
                        ctx.fillRect(player.x + 1, baseY + 3, 3, 2); // Back to original scale, adjusted position
                    } else {
                        ctx.fillRect(player.x, baseY + 7, 4, 3);
                    }
                }
            }
        }
    }
};

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
    
    const level = { tiles: [], enemies: [], blocks: [], width: 0 };
    
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
            if (enemyLine[x] === 'P') {
                level.tiles[x] = 'p'; // Pipe
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
        const level = { platforms: [], blocks: [], pits: [], enemies: [], coins: [] };
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
    
    // Use only level 1-1 for now
    
    // Use only level 1-1 - no level maps array needed
    
    console.log('Mario game starting with single level 1-1');
    
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
        currentLevel: 3, // Start with level 1-3 for testing
        levelsCompleted: 0,
        levelsToWin: 3, // Three levels now
        levelWidth: 4000,
        gameOver: false,
        won: false,
        gameStarted: false,
        keys: {},
        currentTheme: 'overworld',
        frameCount: 0
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
            }
            
            const response = await fetch(`./games/mario/${mapFile}`);
            const mapText = await response.text();
            const layout = parseASCIIMap(mapText);
            
            // Set theme based on level
            game.currentTheme = theme;
            
            game.platforms = layout.platforms;
            game.blocks = layout.blocks;
            game.enemies = layout.enemies;
            game.flag = layout.flag;
            game.player.x = layout.startX;
            game.player.y = layout.startY;
        } catch (error) {
            console.error('Failed to load map:', error);
            console.log('Using fallback level');
            // Fallback to basic level
            game.platforms = [{x: 0, y: 350, width: 2000, height: 50}];
            game.blocks = [];
            game.enemies = [];
            game.flag = {x: 1800, y: 200, width: 35, height: 150};
        }
    }
    
    function parseASCIIMap(mapText) {
        const rawLines = mapText.split('\n');
        const lines = rawLines.filter(line => !line.startsWith('# ') && line.length > 0);
        const platforms = [];
        const blocks = [];
        const enemies = [];
        let flag = null;
        let startX = 50, startY = 300;
        
        const tileSize = 20;
        
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                const char = line[x];
                const worldX = x * tileSize;
                const worldY = y * tileSize; // Direct mapping: row 0 = y:0, row 19 = y:380
                
                switch (char) {
                    case '#':
                        platforms.push({x: worldX, y: worldY, width: tileSize, height: tileSize});
                        break;
                    case '?':
                        blocks.push({x: worldX, y: worldY, width: tileSize, height: tileSize, type: 'question', hit: false, content: 'coin'});
                        break;
                    case 'B':
                        blocks.push({x: worldX, y: worldY, width: tileSize, height: tileSize, type: 'brick', hit: false});
                        break;
                    case 'P':
                        // Skip individual P processing - will be handled in group processing below
                        break;
                    case 'C':
                        blocks.push({x: worldX, y: worldY, width: tileSize, height: tileSize, type: 'question', hit: false, content: 'coin'});
                        break;
                    case 'M':
                        blocks.push({x: worldX, y: worldY, width: tileSize, height: tileSize, type: 'question', hit: false, content: 'mushroom'});
                        break;
                    case 'F':
                        blocks.push({x: worldX, y: worldY, width: tileSize, height: tileSize, type: 'question', hit: false, content: 'fireflower'});
                        break;
                    case 'S':
                        blocks.push({x: worldX, y: worldY, width: tileSize, height: tileSize, type: 'question', hit: false, content: 'star'});
                        break;
                    case 'T':
                        platforms.push({x: worldX, y: worldY, width: tileSize, height: tileSize, type: 'tree'});
                        break;
                    case 'G':
                        // Position Goomba exactly on ground level
                        let goombaGroundY = worldY;
                        for (let checkY = y; checkY < lines.length; checkY++) {
                            if (lines[checkY] && lines[checkY][x] === '#') {
                                goombaGroundY = checkY * tileSize - 18; // 18 is goomba height
                                break;
                            }
                        }
                        enemies.push({x: worldX, y: goombaGroundY, width: 20, height: 18, vx: -1, vy: 0, type: 'goomba', alive: true, onGround: true});
                        break;
                    case 'K':
                        // Position Koopa exactly on ground level  
                        let koopaGroundY = worldY;
                        for (let checkY = y; checkY < lines.length; checkY++) {
                            if (lines[checkY] && lines[checkY][x] === '#') {
                                koopaGroundY = checkY * tileSize - 20; // 20 is koopa height
                                break;
                            }
                        }
                        enemies.push({x: worldX, y: koopaGroundY, width: 20, height: 20, vx: -1, vy: 0, type: 'koopa', alive: true, state: 'walking', onGround: true});
                        break;
                    case '@':
                        startX = worldX;
                        startY = worldY;
                        break;
                    case '&':
                        // Find the ground level below this position
                        let groundY = worldY;
                        for (let checkY = y; checkY < lines.length; checkY++) {
                            if (lines[checkY] && lines[checkY][x] === '#') {
                                groundY = checkY * tileSize;
                                break;
                            }
                        }
                        flag = {x: worldX, y: groundY - (10 * tileSize), width: 35, height: 10 * tileSize};
                        break;
                }
            }
        }
        
        // Process connected P groups into single pipes
        const processedPs = new Set();
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                if (line[x] === 'P' && !processedPs.has(`${x},${y}`)) {
                    // Find the bounds of this connected P group
                    let minX = x, maxX = x, minY = y, maxY = y;
                    const toCheck = [{x, y}];
                    const groupPs = new Set();
                    
                    while (toCheck.length > 0) {
                        const {x: cx, y: cy} = toCheck.pop();
                        const key = `${cx},${cy}`;
                        if (groupPs.has(key) || cy >= lines.length || cx >= lines[cy].length || lines[cy][cx] !== 'P') continue;
                        
                        groupPs.add(key);
                        processedPs.add(key);
                        minX = Math.min(minX, cx);
                        maxX = Math.max(maxX, cx);
                        minY = Math.min(minY, cy);
                        maxY = Math.max(maxY, cy);
                        
                        // Check adjacent cells
                        toCheck.push({x: cx+1, y: cy}, {x: cx-1, y: cy}, {x: cx, y: cy+1}, {x: cx, y: cy-1});
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
        
        return {platforms, blocks, enemies, flag, startX, startY};
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
                    game.player.width = 20;
                    game.player.height = 32;
                } else if (powerUp.type === 'fireflower') {
                    game.player.powerState = 'fire';
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
    
    function checkPitCollision() {
        game.pits.forEach(pit => {
            if (game.player.x + game.player.width > pit.x && 
                game.player.x < pit.x + pit.width && 
                game.player.y + game.player.height > 400) {
                game.player.lives--;
                if (game.player.lives <= 0) {
                    game.gameOver = true;
                } else {
                    game.player.x = 50;
                    game.player.y = 300;
                    game.camera.x = 0;
                }
            }
        });
    }
    
    function handlePlatformCollision(entity) {
        entity.onGround = false;
        
        // Store previous position
        const prevX = entity.x - entity.vx;
        const prevY = entity.y - entity.vy;
        
        game.platforms.forEach(platform => {
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
        
        // Check if Mario fell into a pit (below screen)
        if (game.player.y > 450) {
            game.player.lives--;
            if (game.player.lives <= 0) {
                game.gameOver = true;
            } else {
                // Respawn Mario
                game.player.x = 50;
                game.player.y = 300;
                game.player.vx = 0;
                game.player.vy = 0;
                game.camera.x = 0;
            }
        }
        
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
    
    function updateEnemies() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.enemies.forEach((enemy, index) => {
            if (!enemy.alive) return;
            
            // Add gravity to enemies
            if (!enemy.vy) enemy.vy = 0;
            enemy.vy += 0.3; // Gravity
            enemy.y += enemy.vy;
            
            // Use shared collision detection for ground
            handlePlatformCollision(enemy);
            
            // Remove enemies that fall too far (into pits)
            if (enemy.y > 500) {
                enemy.alive = false;
                return;
            }
            
            // Handle Koopa states
            if (enemy.type === 'koopa') {
                if (enemy.state === 'walking') {
                    enemy.x += enemy.vx;
                } else if (enemy.state === 'shell') {
                    // Shell is stationary
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
            } else {
                // Regular enemy movement
                enemy.x += enemy.vx;
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
                        if (game.frameCount % 60 === 0 && index > 5) {
                            console.log(`Enemy ${index} on top of platform, not reversing`);
                        }
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
            
            if (game.frameCount % 60 === 0 && enemy.x > 2000) {
                console.log(`Enemy ${index} at x:${enemy.x} has ${platformCount} nearby platforms`);
            }
            
            if (hitWall) {
                if (game.frameCount % 60 === 0) {
                    console.log(`Enemy ${index} hit wall, reversing direction from vx:${enemy.vx} to vx:${-enemy.vx}`);
                }
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
                
                if (game.player.vy > 0 && game.player.y < enemy.y) {
                    // Jumping on enemy
                    if (enemy.type === 'koopa') {
                        if (enemy.state === 'walking') {
                            // Koopa goes into shell
                            enemy.state = 'shell';
                            enemy.vx = 0;
                            enemy.height = 16;
                            enemy.y += 4; // Adjust position for smaller shell
                            game.player.vy = -8;
                            game.player.score += 100;
                        } else if (enemy.state === 'shell') {
                            // Kick the shell
                            enemy.state = 'shellMoving';
                            enemy.vx = game.player.x < enemy.x ? 3 : -3; // Kick away from Mario (slower speed)
                            game.player.vy = -8;
                            game.player.score += 400;
                        } else if (enemy.state === 'shellMoving') {
                            // Stop the moving shell
                            enemy.state = 'shell';
                            enemy.vx = 0;
                            game.player.vy = -8;
                            game.player.score += 100;
                        }
                    } else {
                        // Goomba dies normally
                        enemy.alive = false;
                        game.player.vy = -8;
                        game.player.score += 100;
                    }
                } else {
                    // Hit by enemy - handle power-up states
                    if (game.player.powerState === 'big' || game.player.powerState === 'fire') {
                        // Downgrade to small Mario
                        game.player.powerState = 'small';
                        game.player.width = 16;
                        game.player.height = 16;
                        game.player.y += 16; // Adjust position for smaller size
                        
                        // Add invincibility frames
                        game.player.invincible = true;
                        game.player.invincibleTimer = 120; // 2 seconds at 60fps
                        
                        // Push Mario away from enemy
                        if (game.player.x < enemy.x) {
                            game.player.x -= 20;
                        } else {
                            game.player.x += 20;
                        }
                    } else {
                        // Small Mario loses a life
                        game.player.lives--;
                        if (game.player.lives <= 0) {
                            game.gameOver = true;
                        } else {
                            // Reset position
                            game.player.x = Math.max(50, game.player.x - 100);
                            game.player.vx = 0;
                        }
                    }
                }
            }
        });
    }
    
    function checkWin() {
        if (game.player.x + game.player.width > game.flag.x) {
            nextLevel();
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Theme-based backgrounds
        if (game.currentTheme === 'underground') {
            ctx.fillStyle = '#000000'; // Solid black for underground like SMB 1-2
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (game.currentTheme === 'trees') {
            ctx.fillStyle = '#4169E1'; // Lighter blue sky for SMB 1-3
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add sparse clouds
            ctx.fillStyle = '#FFFFFF';
            const cloudPositions = [150, 400, 650, 900, 1200, 1500, 1800];
            cloudPositions.forEach(x => {
                // Simple cloud shape
                ctx.fillRect(x - game.camera.x, 80, 60, 20);
                ctx.fillRect(x - game.camera.x + 10, 70, 40, 20);
                ctx.fillRect(x - game.camera.x + 20, 60, 20, 20);
            });
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            if (game.currentTheme === 'castle') {
                gradient.addColorStop(0, '#2F2F2F');
                gradient.addColorStop(1, '#000000');
            } else {
                // Overworld
                gradient.addColorStop(0, '#87CEEB');
                gradient.addColorStop(1, '#98FB98');
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
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
            
            // Draw single trunk for this tree group (middle n-2 cells)
            const treeWidth = maxX - minX;
            const trunkWidth = Math.max(8, treeWidth - 40); // n-2 cells (2 cells = 40px)
            const trunkX = minX + (treeWidth - trunkWidth) / 2;
            
            // Tree trunk
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(trunkX, treeY + platform.height, trunkWidth, 400 - (treeY + platform.height));
            
            // Tree trunk shading
            ctx.fillStyle = '#654321';
            ctx.fillRect(trunkX, treeY + platform.height, 2, 400 - (treeY + platform.height));
            ctx.fillRect(trunkX + trunkWidth - 2, treeY + platform.height, 2, 400 - (treeY + platform.height));
        });
        
        // Platforms
        game.platforms.forEach(platform => {
            if (platform.type === 'pipe') {
                // Pipe body - green
                ctx.fillStyle = '#228B22';
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                
                // Pipe rim (top edge) - lighter green
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(platform.x - 2, platform.y - 8, platform.width + 4, 12);
                
                // Pipe highlights
                ctx.fillStyle = '#90EE90';
                ctx.fillRect(platform.x + 2, platform.y, 2, platform.height);
                
                // Pipe shadows
                ctx.fillStyle = '#006400';
                ctx.fillRect(platform.x + platform.width - 2, platform.y, 2, platform.height);
            } else if (platform.type === 'tree') {
                // Tree leaves (platform) - light green for jumping platforms
                ctx.fillStyle = '#90EE90';
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                
                // Leaf texture - lighter green highlights
                ctx.fillStyle = '#98FB98';
                ctx.fillRect(platform.x + 2, platform.y + 2, 4, 4);
                ctx.fillRect(platform.x + 8, platform.y + 4, 3, 3);
                ctx.fillRect(platform.x + 14, platform.y + 2, 4, 4);
                ctx.fillRect(platform.x + 4, platform.y + 8, 3, 3);
                ctx.fillRect(platform.x + 12, platform.y + 10, 4, 4);
                
                // Medium green shadows for depth
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(platform.x + 1, platform.y + 6, 2, 2);
                ctx.fillRect(platform.x + 10, platform.y + 1, 2, 2);
                ctx.fillRect(platform.x + 16, platform.y + 8, 2, 2);
            } else {
                // Ground colors - theme-based
                let groundColor, veinColor;
                if (game.currentTheme === 'underground') {
                    groundColor = '#4A4A4A';
                    veinColor = '#2F2F2F';
                } else if (game.currentTheme === 'trees') {
                    groundColor = '#8B4513'; // Darker brown for nighttime
                    veinColor = '#654321';
                } else {
                    groundColor = '#A0522D'; // Normal overworld
                    veinColor = '#8B4513';
                }
                
                ctx.fillStyle = groundColor;
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                
                // Granite-like continuous veining lines
                ctx.fillStyle = veinColor;
                
                // Horizontal veins
                for (let y = platform.y + 2; y < platform.y + platform.height; y += 6) {
                    for (let x = platform.x; x < platform.x + platform.width; x += 3) {
                        ctx.fillRect(x, y, 2, 1);
                    }
                }
                
                // Diagonal veins
                for (let x = platform.x; x < platform.x + platform.width; x += 8) {
                    for (let y = platform.y; y < platform.y + platform.height; y++) {
                        if ((x + y) % 4 === 0) {
                            ctx.fillRect(x + (y % 3), y, 1, 1);
                        }
                    }
                }
            }
        });
        
        // Blocks
        game.blocks.forEach(block => {
            if (block.type === 'brick') {
                // Brick colors - theme-based
                let brickColor, mortarColor, highlightColor;
                if (game.currentTheme === 'underground') {
                    brickColor = '#4682B4'; // Blueish-greenish
                    mortarColor = '#2F4F4F';
                    highlightColor = '#87CEEB';
                } else if (game.currentTheme === 'trees') {
                    brickColor = '#B8860B'; // Darker gold for nighttime
                    mortarColor = '#8B4513';
                    highlightColor = '#DAA520';
                } else {
                    brickColor = '#CD853F'; // Normal overworld
                    mortarColor = '#8B4513';
                    highlightColor = '#DEB887';
                }
                
                // Brick base color
                ctx.fillStyle = brickColor;
                ctx.fillRect(block.x, block.y, block.width, block.height);
                
                // Brick pattern - mortar lines
                ctx.fillStyle = mortarColor;
                // Horizontal mortar lines
                ctx.fillRect(block.x, block.y + 6, block.width, 1);
                ctx.fillRect(block.x, block.y + 13, block.width, 1);
                // Vertical mortar lines (offset pattern)
                ctx.fillRect(block.x + 10, block.y, 1, 6);
                ctx.fillRect(block.x + 5, block.y + 7, 1, 6);
                ctx.fillRect(block.x + 15, block.y + 7, 1, 6);
                ctx.fillRect(block.x + 10, block.y + 14, 1, 6);
                
                // Brick highlights
                ctx.fillStyle = highlightColor;
                ctx.fillRect(block.x, block.y, block.width, 1);
                ctx.fillRect(block.x, block.y, 1, block.height);
            } else if (block.type === 'question') {
                // Question block colors - theme-based
                let questionColor;
                if (game.currentTheme === 'underground') {
                    questionColor = block.content ? '#8B4513' : '#654321';
                } else if (game.currentTheme === 'trees') {
                    questionColor = block.content ? '#DAA520' : '#8B4513'; // Darker gold for nighttime
                } else {
                    questionColor = block.content ? '#FFD700' : '#8B4513'; // Normal overworld
                }
                
                ctx.fillStyle = questionColor;
                ctx.fillRect(block.x, block.y, block.width, block.height);
                if (block.content) {
                    ctx.fillStyle = '#000';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('?', block.x + block.width/2, block.y + block.height/2 + 5);
                    ctx.textAlign = 'left';
                }
            }
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
        
        // Enemies
        game.enemies.forEach(enemy => {
            if (enemy.alive) {
                SpriteRenderer.enemies[enemy.type](ctx, enemy);
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
        const flagPoleColor = game.currentTheme === 'underground' ? '#FFFFFF' : '#000000';
        ctx.fillStyle = flagPoleColor;
        ctx.fillRect(game.flag.x, game.flag.y, 5, game.flag.height);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.flag.x + 5, game.flag.y, 30, 20);
        
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
        game.frameCount++;
        updatePlayer();
        updateEnemies();
        updatePowerUps();
        updateFireballs();
        updateParticles();
        checkPitCollision();
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
            game.player = { 
                x: 50, y: 300, width: 16, height: 16, 
                vx: 0, vy: 0, onGround: false, 
                lives: 3, score: 0, powerState: 'small'
            };
            game.camera.x = 0;
            game.enemies.forEach(enemy => enemy.alive = true);
            game.gameOver = false;
            game.won = false;
            gameLoop();
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
}
