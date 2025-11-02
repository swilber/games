// Sprite rendering system for Mario game
const SpriteRenderer = {
    enemies: {
        goomba: (ctx, enemy) => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(enemy.x + 2, enemy.y + 4, 16, 12);
            ctx.fillStyle = '#FFF';
            ctx.fillRect(enemy.x + 4, enemy.y + 6, 3, 3);
            ctx.fillRect(enemy.x + 13, enemy.y + 6, 3, 3);
            ctx.fillStyle = '#000';
            const eyeOffset = enemy.animFrame === 0 ? 0 : 1;
            ctx.fillRect(enemy.x + 5 + eyeOffset, enemy.y + 7, 1, 1);
            ctx.fillRect(enemy.x + 14 - eyeOffset, enemy.y + 7, 1, 1);
        },
        koopa: (ctx, enemy) => {
            ctx.fillStyle = '#228B22';
            ctx.fillRect(enemy.x + 2, enemy.y + 8, 16, 12);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(enemy.x + 2, enemy.y + 8, 16, 2);
            ctx.fillRect(enemy.x + 2, enemy.y + 18, 16, 2);
        }
    },
    player: {
        mario: (ctx, player) => {
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(player.x + 2, player.y, 16, 8);
            ctx.fillStyle = '#FFDBAC';
            ctx.fillRect(player.x + 4, player.y + 6, 12, 6);
            ctx.fillStyle = '#0066CC';
            ctx.fillRect(player.x + 4, player.y + 12, 12, 12);
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
        // Add more levels here
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
        // Level 1-2: Underground
        {
            platforms: [
                {x: 0, y: 370, width: 2200, height: 30}, // Solid ground (no pits underground)
                {x: 200, y: 320, width: 96, height: 16}, // Steps
                {x: 232, y: 304, width: 64, height: 16},
                {x: 264, y: 288, width: 32, height: 16},
                {x: 400, y: 320, width: 32, height: 50, type: 'pipe'}, // Underground pipe
                {x: 500, y: 304, width: 128, height: 16}, // Platform
                {x: 700, y: 304, width: 32, height: 66, type: 'pipe'}, // Another pipe
                {x: 800, y: 288, width: 64, height: 16},
                {x: 1000, y: 272, width: 96, height: 16},
                {x: 1200, y: 320, width: 32, height: 50, type: 'pipe'},
                {x: 1300, y: 320, width: 160, height: 16},
                {x: 1600, y: 256, width: 128, height: 16},
                {x: 1900, y: 304, width: 96, height: 16}
            ],
            pits: [], // No pits in underground levels
            enemies: [
                {x: 350, type: 'goomba'}, {x: 550, type: 'koopa'},
                {x: 750, type: 'goomba'}, {x: 1050, type: 'koopa'},
                {x: 1350, type: 'goomba'}, {x: 1650, type: 'koopa'}
            ],
            coins: [
                {x: 250, y: 260}, {x: 550, y: 260}, {x: 850, y: 240},
                {x: 1050, y: 230}, {x: 1400, y: 280}, {x: 1700, y: 210}
            ]
        },
        // Level 1-3: Tree tops
        {
            platforms: [
                {x: 0, y: 370, width: 200, height: 30}, // Starting ground
                {x: 300, y: 320, width: 128, height: 16}, // Tree platform
                {x: 500, y: 280, width: 96, height: 16},
                {x: 700, y: 240, width: 128, height: 16},
                {x: 900, y: 200, width: 96, height: 16},
                {x: 1100, y: 240, width: 128, height: 16},
                {x: 1300, y: 280, width: 96, height: 16},
                {x: 1500, y: 320, width: 128, height: 16},
                {x: 1700, y: 280, width: 96, height: 16},
                {x: 1900, y: 370, width: 200, height: 30} // End ground
            ],
            pits: [
                {x: 200, width: 100}, // Gap to first tree
                {x: 428, width: 72},  // Between trees
                {x: 596, width: 104}, // Larger gap
                {x: 828, width: 72},  // Between trees
                {x: 996, width: 104}, // Another gap
                {x: 1228, width: 72}, // Between trees
                {x: 1396, width: 104}, // Gap
                {x: 1628, width: 72}, // Between trees
                {x: 1796, width: 104} // Final gap to end
            ],
            enemies: [
                {x: 350, type: 'koopa'}, {x: 550, type: 'goomba'},
                {x: 750, type: 'koopa'}, {x: 1150, type: 'goomba'},
                {x: 1350, type: 'koopa'}, {x: 1550, type: 'goomba'}
            ],
            coins: [
                {x: 350, y: 280}, {x: 550, y: 240}, {x: 750, y: 200},
                {x: 950, y: 160}, {x: 1150, y: 200}, {x: 1350, y: 240}
            ]
        },
        // Level 1-4: Castle
        {
            platforms: [
                {x: 0, y: 370, width: 2000, height: 30}, // Ground
                {x: 200, y: 320, width: 64, height: 16}, // Castle blocks
                {x: 300, y: 288, width: 32, height: 48},
                {x: 400, y: 256, width: 32, height: 80},
                {x: 500, y: 288, width: 32, height: 48},
                {x: 600, y: 320, width: 64, height: 16},
                {x: 700, y: 304, width: 32, height: 66, type: 'pipe'}, // Castle pipe
                {x: 800, y: 304, width: 128, height: 16},
                {x: 1000, y: 272, width: 96, height: 16},
                {x: 1200, y: 240, width: 128, height: 16},
                {x: 1400, y: 304, width: 96, height: 16},
                {x: 1600, y: 320, width: 200, height: 16}
            ],
            pits: [
                {x: 928, width: 72}, // Castle pit
                {x: 1328, width: 72}  // Another castle pit
            ],
            enemies: [
                {x: 250, type: 'koopa'}, {x: 450, type: 'goomba'},
                {x: 650, type: 'koopa'}, {x: 850, type: 'goomba'},
                {x: 1050, type: 'koopa'}, {x: 1250, type: 'goomba'},
                {x: 1450, type: 'koopa'}
            ],
            coins: [
                {x: 250, y: 280}, {x: 450, y: 210}, {x: 650, y: 280},
                {x: 850, y: 260}, {x: 1050, y: 230}, {x: 1250, y: 200}
            ]
        },
        // Level 2-1: More challenging overworld
        {
            platforms: [
                {x: 0, y: 370, width: 400, height: 30}, // Ground
                {x: 464, y: 370, width: 336, height: 30}, // Ground after pit
                {x: 864, y: 370, width: 400, height: 30}, // Ground
                {x: 1328, y: 370, width: 672, height: 30}, // Ground to end
                {x: 300, y: 320, width: 32, height: 16}, // Scattered blocks
                {x: 364, y: 304, width: 32, height: 16},
                {x: 428, y: 288, width: 32, height: 16},
                {x: 492, y: 272, width: 32, height: 16},
                {x: 556, y: 288, width: 32, height: 16},
                {x: 620, y: 304, width: 32, height: 16},
                {x: 684, y: 320, width: 32, height: 16},
                {x: 750, y: 304, width: 32, height: 66, type: 'pipe'}, // Pipe before pit
                {x: 900, y: 256, width: 128, height: 16}, // High platform
                {x: 1100, y: 320, width: 32, height: 50, type: 'pipe'}, // Medium pipe
                {x: 1200, y: 304, width: 160, height: 16},
                {x: 1500, y: 272, width: 96, height: 16},
                {x: 1800, y: 240, width: 128, height: 16},
                {x: 2100, y: 320, width: 128, height: 16}
            ],
            pits: [
                {x: 400, width: 64}, // First pit
                {x: 800, width: 64}, // Second pit
                {x: 1264, width: 64} // Third pit
            ],
            enemies: [
                {x: 200, type: 'goomba'}, {x: 400, type: 'koopa'},
                {x: 600, type: 'goomba'}, {x: 800, type: 'koopa'},
                {x: 1000, type: 'goomba'}, {x: 1300, type: 'koopa'},
                {x: 1600, type: 'goomba'}, {x: 1900, type: 'koopa'}
            ],
            coins: [
                {x: 350, y: 280}, {x: 450, y: 240}, {x: 550, y: 240},
                {x: 950, y: 210}, {x: 1250, y: 260}, {x: 1550, y: 230},
                {x: 1850, y: 200}, {x: 2150, y: 280}
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
            {x: 700, y: 340, width: 20, height: 20, vx: -1, type: 'koopa', alive: true, animFrame: 0, animTimer: 0},
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
    
    function checkBlockCollision() {
        game.blocks.forEach((block, index) => {
            if (block.hit) return;
            
            // Check if player hits block from below
            if (game.player.x < block.x + block.width &&
                game.player.x + game.player.width > block.x &&
                game.player.y < block.y + block.height &&
                game.player.y + game.player.height > block.y &&
                game.player.vy < 0) {
                
                block.hit = true;
                game.player.vy = 0;
                
                if (block.type === 'brick') {
                    if (game.player.powerState !== 'small') {
                        // Break brick
                        game.blocks.splice(index, 1);
                        game.score += 50;
                        // Add break particles
                        for (let i = 0; i < 4; i++) {
                            game.particles.push({
                                x: block.x + Math.random() * block.width,
                                y: block.y,
                                vx: (Math.random() - 0.5) * 6,
                                vy: -Math.random() * 4 - 2,
                                life: 30,
                                color: '#8B4513'
                            });
                        }
                    }
                } else if (block.type === 'question' && block.content) {
                    // Spawn power-up or coin
                    if (block.content === 'coin') {
                        game.score += 200;
                        game.particles.push({
                            x: block.x + block.width/2,
                            y: block.y - 20,
                            vx: 0, vy: -2,
                            life: 30,
                            color: '#FFD700'
                        });
                    } else {
                        game.powerUps.push({
                            x: block.x,
                            y: block.y - 32,
                            width: 32, height: 32,
                            type: block.content,
                            vx: 1, vy: 0
                        });
                    }
                    block.content = null; // Empty the block
                }
            }
        });
    }
    
    function updatePowerUps() {
        game.powerUps.forEach((powerUp, index) => {
            powerUp.x += powerUp.vx;
            
            // Platform collision for power-ups
            game.platforms.forEach(platform => {
                if (powerUp.x < platform.x + platform.width &&
                    powerUp.x + powerUp.width > platform.x &&
                    powerUp.y < platform.y + platform.height &&
                    powerUp.y + powerUp.height > platform.y) {
                    powerUp.y = platform.y - powerUp.height;
                }
            });
            
            // Player collision
            if (game.player.x < powerUp.x + powerUp.width &&
                game.player.x + game.player.width > powerUp.x &&
                game.player.y < powerUp.y + powerUp.height &&
                game.player.y + game.player.height > powerUp.y) {
                
                if (powerUp.type === 'mushroom') {
                    if (game.player.powerState === 'small') {
                        game.player.powerState = 'big';
                        game.player.height = 40;
                        game.player.y -= 10;
                    }
                    game.score += 1000;
                } else if (powerUp.type === 'fireflower') {
                    game.player.powerState = 'fire';
                    if (game.player.height < 40) {
                        game.player.height = 40;
                        game.player.y -= 10;
                    }
                    game.score += 1000;
                }
                
                game.powerUps.splice(index, 1);
            }
        });
        
        // Remove power-ups that fall off screen
        game.powerUps = game.powerUps.filter(p => p.y < 500);
    }
    
    function checkPitCollision() {
        game.pits.forEach(pit => {
            if (game.player.x + game.player.width > pit.x && 
                game.player.x < pit.x + pit.width && 
                game.player.y + game.player.height > 400) { // Only die if falling below ground level
                // Player fell in pit
                game.player.lives--;
                if (game.player.lives <= 0) {
                    game.gameOver = true;
                } else {
                    // Reset player position
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
            return;
        }
        
        game.currentLevel = Math.min(game.currentLevel + 1, levelLayouts.length - 1);
        initializeLevel();
    }
    
    function updatePlayer() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Horizontal movement
        if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
            game.player.vx = Math.max(game.player.vx - 0.5, -5);
        } else if (game.keys['ArrowRight'] || game.keys['KeyD']) {
            game.player.vx = Math.min(game.player.vx + 0.5, 5);
        } else {
            game.player.vx *= 0.8; // Friction
        }
        
        // Jumping
        if ((game.keys['ArrowUp'] || game.keys['KeyW'] || game.keys['Space']) && game.player.onGround) {
            game.player.vy = -settings.jumpHeight;
            game.player.onGround = false;
        }
        
        // Gravity
        game.player.vy += settings.gravity;
        
        // Update position
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;
        
        // Platform collision
        game.player.onGround = false;
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
        
        // Boundary checks
        if (game.player.x < 0) game.player.x = 0;
        if (game.player.y > canvas.height) {
            game.player.lives--;
            if (game.player.lives <= 0) {
                game.gameOver = true;
            } else {
                game.player.x = 50;
                game.player.y = 300;
                game.player.vx = 0;
                game.player.vy = 0;
            }
        }
        
        // Camera follow
        game.camera.x = Math.max(0, Math.min(game.player.x - canvas.width / 2, game.levelWidth - canvas.width));
    }
    
    function updateEnemies() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            enemy.x += enemy.vx;
            
            // Enemy collision with platforms and blocks
            let hitWall = false;
            game.platforms.forEach(platform => {
                if (enemy.x < platform.x + platform.width &&
                    enemy.x + enemy.width > platform.x &&
                    enemy.y < platform.y + platform.height &&
                    enemy.y + enemy.height > platform.y) {
                    
                    // Side collision - bounce off
                    if (enemy.vx > 0) {
                        enemy.x = platform.x - enemy.width;
                        hitWall = true;
                    } else if (enemy.vx < 0) {
                        enemy.x = platform.x + platform.width;
                        hitWall = true;
                    }
                }
            });
            
            // Check collision with blocks
            game.blocks.forEach(block => {
                if (enemy.x < block.x + block.width &&
                    enemy.x + enemy.width > block.x &&
                    enemy.y < block.y + block.height &&
                    enemy.y + enemy.height > block.y) {
                    
                    // Side collision - bounce off
                    if (enemy.vx > 0) {
                        enemy.x = block.x - enemy.width;
                        hitWall = true;
                    } else if (enemy.vx < 0) {
                        enemy.x = block.x + block.width;
                        hitWall = true;
                    }
                }
            });
            
            // Reverse direction if hit wall
            if (hitWall) {
                enemy.vx *= -1;
            }
            
            // Update animation
            enemy.animTimer++;
            if (enemy.animTimer > 20) {
                enemy.animFrame = (enemy.animFrame + 1) % 2;
                enemy.animTimer = 0;
            }
            
            // Simple boundary check - turn around at edges
            if (enemy.x <= 100 || enemy.x >= game.levelWidth - 150) {
                enemy.vx *= -1;
            }
            
            // Player collision
            if (game.player.x < enemy.x + enemy.width &&
                game.player.x + game.player.width > enemy.x &&
                game.player.y < enemy.y + enemy.height &&
                game.player.y + game.player.height > enemy.y) {
                
                // Jump on enemy
                if (game.player.vy > 0 && game.player.y < enemy.y) {
                    enemy.alive = false;
                    game.player.vy = -8; // Bounce
                    game.player.score += 100;
                    
                    // Particle effect
                    for (let i = 0; i < 5; i++) {
                        game.particles.push({
                            x: enemy.x + enemy.width/2,
                            y: enemy.y + enemy.height/2,
                            vx: (Math.random() - 0.5) * 4,
                            vy: Math.random() * -3,
                            life: 30,
                            color: '#ff6'
                        });
                    }
                } else {
                    // Hit by enemy
                    game.player.lives--;
                    if (game.player.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        game.player.x = Math.max(50, game.player.x - 100);
                        game.player.vx = 0;
                    }
                }
            }
        });
    }
    
    function updateCoins() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.coins.forEach(coin => {
            if (coin.collected) return;
            
            if (game.player.x < coin.x + coin.width &&
                game.player.x + game.player.width > coin.x &&
                game.player.y < coin.y + coin.height &&
                game.player.y + game.player.height > coin.y) {
                
                coin.collected = true;
                game.player.score += 50;
                
                // Particle effect
                for (let i = 0; i < 3; i++) {
                    game.particles.push({
                        x: coin.x + coin.width/2,
                        y: coin.y + coin.height/2,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * -2,
                        life: 20,
                        color: '#fd0'
                    });
                }
            }
        });
    }
    
    function updateParticles() {
        game.particles = game.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2; // Gravity
            particle.life--;
            return particle.life > 0;
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
        
        // Sky gradient
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
                // Draw pipe with green color and pattern
                ctx.fillStyle = '#228B22';
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                // Pipe highlights
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(platform.x + 2, platform.y, 4, platform.height);
                ctx.fillRect(platform.x + platform.width - 6, platform.y, 4, platform.height);
                // Pipe top
                ctx.fillStyle = '#228B22';
                ctx.fillRect(platform.x - 4, platform.y - 4, platform.width + 8, 8);
            } else {
                // Regular platform or ground
                ctx.fillStyle = platform.type === 'ground' ? '#8B4513' : '#D2691E';
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            }
        });
        
        // Blocks
        game.blocks.forEach(block => {
            if (block.type === 'brick') {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(block.x, block.y, block.width, block.height);
                // Brick pattern
                ctx.fillStyle = '#654321';
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        ctx.fillRect(block.x + i * 8, block.y + j * 8, 6, 6);
                    }
                }
            } else if (block.type === 'question') {
                ctx.fillStyle = block.content ? '#FFD700' : '#8B4513';
                ctx.fillRect(block.x, block.y, block.width, block.height);
                if (block.content) {
                    // Question mark
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
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
                ctx.fillStyle = '#fff';
                ctx.fillRect(powerUp.x + 4, powerUp.y + 4, 8, 8);
                ctx.fillRect(powerUp.x + 20, powerUp.y + 4, 8, 8);
            } else if (powerUp.type === 'fireflower') {
                ctx.fillStyle = '#ff4500';
                ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(powerUp.x + 8, powerUp.y + 8, 16, 16);
            }
        });
        
        // Coins
        game.coins.forEach(coin => {
            if (!coin.collected) {
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(coin.x, coin.y, coin.width, coin.height);
                ctx.fillStyle = '#FFA500';
                ctx.fillRect(coin.x + 3, coin.y + 3, coin.width - 6, coin.height - 6);
            }
        });
        
        // Enemies
        game.enemies.forEach(enemy => {
            if (enemy.alive) {
                SpriteRenderer.enemies[enemy.type](ctx, enemy);
            }
        });
        
        // Player
        SpriteRenderer.player.mario(ctx, game.player);
        
        // Flag
        ctx.fillStyle = '#000';
        ctx.fillRect(game.flag.x, game.flag.y, 5, game.flag.height);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.flag.x + 5, game.flag.y, 30, 20);
        
        // Particles
        game.particles.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, 3, 3);
        });
        
        ctx.restore();
        
        // UI
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(`Lives: ${game.player.lives}`, 10, 30);
        ctx.fillText(`Score: ${game.player.score}`, 10, 60);
        ctx.fillText(`Level: ${game.levelsCompleted + 1}/${game.levelsToWin}`, 10, 90);
        
        if (game.won) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
            ctx.font = '24px Arial';
            ctx.fillText(`Completed ${game.levelsToWin} levels!`, canvas.width/2, canvas.height/2 + 50);
            ctx.textAlign = 'left';
            return;
        }
        
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
        updateCoins();
        updatePowerUps();
        updateParticles();
        checkBlockCollision();
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
            // Restart
            game.player = { 
                x: 50, y: 300, width: 20, height: 30, 
                vx: 0, vy: 0, onGround: false, 
                lives: 3, score: 0, powerState: 'small'
            };
            game.camera.x = 0;
            game.enemies.forEach(enemy => enemy.alive = true);
            game.coins.forEach(coin => coin.collected = false);
            game.particles = [];
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
