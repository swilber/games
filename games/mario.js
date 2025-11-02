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
            const baseY = isSmall ? player.y + 8 : player.y; // Adjust for size difference
            
            // Mario's hat - red with proper shading
            ctx.fillStyle = '#FF0000';
            if (isSmall) {
                ctx.fillRect(player.x + 2, baseY, 12, 4);
            } else {
                ctx.fillRect(player.x + 2, baseY, 16, 6);
            }
            
            ctx.fillStyle = '#CC0000';
            if (isSmall) {
                ctx.fillRect(player.x + 3, baseY + 1, 10, 1); // Hat shadow
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
            
            // Eyes - black dots
            ctx.fillStyle = '#000';
            if (isSmall) {
                ctx.fillRect(player.x + 5, baseY + 4, 1, 1);
                ctx.fillRect(player.x + 9, baseY + 4, 1, 1);
            } else {
                ctx.fillRect(player.x + 6, baseY + 7, 1, 1);
                ctx.fillRect(player.x + 12, baseY + 7, 1, 1);
            }
            
            // Mustache - brown
            ctx.fillStyle = '#8B4513';
            if (isSmall) {
                ctx.fillRect(player.x + 6, baseY + 6, 4, 1);
            } else {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(player.x + 7, baseY + 9, 6, 1);
            }
            
            if (!isSmall) {
                // Big Mario - overalls and shirt
                ctx.fillStyle = '#0066CC'; // Blue overalls
                ctx.fillRect(player.x + 2, baseY + 11, 16, 12);
                
                // Red shirt showing through
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(player.x + 7, baseY + 14, 6, 8);
                
                // Overall straps
                ctx.fillStyle = '#0066CC';
                ctx.fillRect(player.x + 4, baseY + 9, 3, 4);
                ctx.fillRect(player.x + 13, baseY + 9, 3, 4);
                
                // Buttons - yellow
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(player.x + 8, baseY + 15, 1, 1);
                ctx.fillRect(player.x + 8, baseY + 18, 1, 1);
                
                // Gloves - white (bigger)
                ctx.fillStyle = '#FFF';
                ctx.fillRect(player.x, baseY + 16, 3, 4);
                ctx.fillRect(player.x + 17, baseY + 16, 3, 4);
                
                // Shoes - brown (bigger)
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(player.x, baseY + 27, 6, 4);
                ctx.fillRect(player.x + 14, baseY + 27, 6, 4);
            } else {
                // Small Mario - just overalls (much smaller)
                ctx.fillStyle = '#0066CC';
                ctx.fillRect(player.x + 2, baseY + 7, 12, 6);
                
                // Small gloves
                ctx.fillStyle = '#FFF';
                ctx.fillRect(player.x + 1, baseY + 9, 2, 2);
                ctx.fillRect(player.x + 13, baseY + 9, 2, 2);
                
                // Small shoes
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(player.x + 2, baseY + 13, 4, 2);
                ctx.fillRect(player.x + 10, baseY + 13, 4, 2);
            }
        }
    }
};

// Level mapping system
const LevelMapper = {
    GROUND_Y: 370,
    GROUND_HEIGHT: 30,
    createFromMap: (mapData) => {
        const level = { platforms: [], blocks: [], pits: [], enemies: [], coins: [] };
        let currentGroundStart = null;
        let currentGroundWidth = 0;
        
        for (let x = 0; x < mapData.width; x++) {
            const tileX = x * 32;
            const tile = mapData.tiles[x];
            
            if (tile === 'G') {
                if (currentGroundStart === null) {
                    currentGroundStart = tileX;
                    currentGroundWidth = 32;
                } else {
                    currentGroundWidth += 32;
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
                    level.pits.push({ x: tileX, width: 32 });
                } else if (tile === 'p') {
                    level.platforms.push({
                        x: tileX, y: LevelMapper.GROUND_Y - 50,
                        width: 32, height: 50 + LevelMapper.GROUND_HEIGHT, type: 'pipe'
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
    },
    levels: {
        '1-1': {
            width: 64,
            tiles: [
                'G','G','G','G','G','G','G','G','G','G','G','G','G','G','G','G',
                'P','P','p','G','G','G','G','G','G','P','P','p',
                'G','G','G','G','G','G','G','G','G','G','G','G','G','G','G','G',
                'G','G','G','G','G','G','G','G','G','G','G','G','G','G','G','G'
            ]
        }
    }
};

function createMarioGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    
    // Use the new level mapping system
    const levelMaps = [
        LevelMapper.levels['1-1'],
        {
            width: 48,
            tiles: [
                'G','G','G','G','G','G','G','G','G','G','G','G',
                'P','P','p','G','G','G','G','P','P','p','G','G',
                'G','G','G','G','G','G','G','G','G','G','G','G',
                'G','G','G','G','G','G','G','G','G','G','G','G'
            ]
        }
    ];

    let game = {
        player: { 
            x: 50, y: 300, width: 20, height: 30, 
            vx: 0, vy: 0, onGround: false, 
            lives: 3, score: 0, powerState: 'small'
        },
        camera: { x: 0 },
        platforms: [],
        blocks: [],
        powerUps: [],
        enemies: [],
        coins: [],
        particles: [],
        pits: [],
        currentLevel: 0,
        levelsCompleted: 0,
        levelsToWin: settings.levelsToWin || 3,
        levelWidth: 2000,
        gameOver: false,
        won: false,
        gameStarted: false,
        keys: {}
    };
    
    function initializeLevel() {
        const mapData = levelMaps[game.currentLevel];
        const layout = LevelMapper.createFromMap(mapData);
        
        game.platforms = [...layout.platforms];
        game.blocks = [...layout.blocks];
        game.powerUps = [];
        game.pits = [...layout.pits];
        
        // Add some enemies and blocks for gameplay
        game.enemies = [
            {x: 300, y: 340, width: 20, height: 20, vx: -0.5, type: 'goomba', alive: true, animFrame: 0, animTimer: 0},
            {x: 700, y: 340, width: 20, height: 24, vx: -1, type: 'koopa', alive: true, animFrame: 0, animTimer: 0, state: 'walking'},
            {x: 1200, y: 340, width: 20, height: 20, vx: -0.5, type: 'goomba', alive: true, animFrame: 0, animTimer: 0}
        ];
        
        // Add some blocks
        game.blocks = [
            {x: 832, y: 272, width: 32, height: 32, type: 'question', content: 'coin'},
            {x: 864, y: 272, width: 32, height: 32, type: 'brick'},
            {x: 896, y: 272, width: 32, height: 32, type: 'question', content: 'mushroom'}
        ];
        
        game.coins = [];
        game.levelWidth = mapData.width * 32;
        game.flag = { x: game.levelWidth - 100, y: 200, width: 10, height: 150 };
        game.player.x = 50;
        game.player.y = 300;
        game.camera.x = 0;
    }
    
    
    function updatePowerUps() {
        game.powerUps.forEach((powerUp, index) => {
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
            
            // Player collision
            if (game.player.x < powerUp.x + powerUp.width &&
                game.player.x + game.player.width > powerUp.x &&
                game.player.y < powerUp.y + powerUp.height &&
                game.player.y + game.player.height > powerUp.y) {
                
                if (powerUp.type === 'mushroom') {
                    game.player.powerState = 'big';
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
    
    function nextLevel() {
        game.levelsCompleted++;
        if (game.levelsCompleted >= game.levelsToWin) {
            game.won = true;
        } else {
            game.currentLevel = (game.currentLevel + 1) % levelMaps.length;
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
        } else if (game.keys['ArrowRight'] || game.keys['KeyD']) {
            game.player.vx = Math.min(game.player.vx + 0.5, 5);
        } else {
            game.player.vx *= 0.8;
        }
        
        if ((game.keys['ArrowUp'] || game.keys['KeyW'] || game.keys['Space']) && game.player.onGround) {
            game.player.vy = -12;
            game.player.onGround = false;
        }
        
        game.player.vy += 0.5;
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;
        
        game.player.onGround = false;
        
        // Check collision with platforms first
        game.platforms.forEach(platform => {
            if (game.player.x < platform.x + platform.width &&
                game.player.x + game.player.width > platform.x &&
                game.player.y < platform.y + platform.height &&
                game.player.y + game.player.height > platform.y) {
                
                // Landing on top
                if (game.player.vy > 0 && game.player.y < platform.y) {
                    game.player.y = platform.y - game.player.height;
                    game.player.vy = 0;
                    game.player.onGround = true;
                }
                // Hitting from below
                else if (game.player.vy < 0 && game.player.y > platform.y) {
                    game.player.y = platform.y + platform.height;
                    game.player.vy = 0;
                }
                // Side collision
                else if (game.player.vx > 0) {
                    game.player.x = platform.x - game.player.width;
                } else if (game.player.vx < 0) {
                    game.player.x = platform.x + platform.width;
                }
            }
        });
        
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
                game.powerUps.push({
                    x: block.x, y: block.y - 32,
                    width: 32, height: 32,
                    type: block.content, vx: 1, vy: 0
                });
            }
            block.content = null;
        }
    }
    
    function updateEnemies() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
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
            
            // Enemy collision with platforms and blocks
            let hitWall = false;
            game.platforms.forEach(platform => {
                if (enemy.x < platform.x + platform.width &&
                    enemy.x + enemy.width > platform.x &&
                    enemy.y < platform.y + platform.height &&
                    enemy.y + enemy.height > platform.y) {
                    
                    if (enemy.vx > 0) {
                        enemy.x = platform.x - enemy.width;
                        hitWall = true;
                    } else if (enemy.vx < 0) {
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
                        game.player.height = 30;
                        game.player.y += 2; // Adjust position for smaller size
                        
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
            if (game.won) {
                setTimeout(() => showQuestionDialog('mario'), 1000);
            }
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(-game.camera.x, 0);
        
        // Platforms
        game.platforms.forEach(platform => {
            if (platform.type === 'pipe') {
                ctx.fillStyle = '#228B22';
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            } else {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            }
        });
        
        // Blocks
        game.blocks.forEach(block => {
            if (block.type === 'brick') {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(block.x, block.y, block.width, block.height);
            } else if (block.type === 'question') {
                ctx.fillStyle = block.content ? '#FFD700' : '#8B4513';
                ctx.fillRect(block.x, block.y, block.width, block.height);
                if (block.content) {
                    ctx.fillStyle = '#000';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('?', block.x + 16, block.y + 22);
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
            }
        });
        
        // Flag
        ctx.fillStyle = '#000';
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
        updatePlayer();
        updateEnemies();
        updatePowerUps();
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
                x: 50, y: 300, width: 20, height: 30, 
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
    
    initializeLevel();
    gameLoop();
}
