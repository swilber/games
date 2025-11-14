async function createDonkeyKongGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Donkey Kong configuration using ConfigManager
    let dkConfig = {};
    if (typeof configManager !== 'undefined') {
        dkConfig = await configManager.loadConfig('donkeykong');
        console.log('Donkey Kong config loaded via ConfigManager:', dkConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        dkConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameStarted = false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 500;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    
    let game = {
        player: { 
            x: 50, y: 450, width: 20, height: 25, 
            vx: 0, vy: 0, onGround: false, onLadder: false,
            lives: 3, score: 0, climbing: false, hasHammer: false, hammerTimer: 0
        },
        donkeyKong: { x: 50, y: 50, width: 40, height: 30, animFrame: 0, animTimer: 0, throwing: false, throwTimer: 0 },
        princess: { x: 520, y: 30, width: 20, height: 25 },
        platforms: [],
        ladders: [],
        barrels: [],
        fireballs: [],
        oilDrum: { x: 100, y: 440, width: 30, height: 30, lit: false },
        hammer: { x: 300, y: 380, width: 20, height: 15, collected: false },
        barrelTimer: 0,
        firstBlueBarrel: true,
        currentLevel: 1,
        maxLevels: dkConfig.gameplay?.levelCount || settings?.levelCount || 4,
        levelComplete: false,
        gameOver: false,
        won: false,
        gameStarted: false,
        keys: {}
    };
    
    function generateLevel(levelNumber = 1) {
        // Clear existing level elements
        game.platforms = [];
        game.ladders = [];
        game.barrels = [];
        game.fireballs = [];
        
        // Get level config (cycle through 1-4)
        const levelNum = ((levelNumber - 1) % 4) + 1;
        const levelConfig = dkConfig.levels?.[levelNum] || dkConfig.levels?.['1'];
        const levelType = levelConfig?.type || 'girders';
        
        console.log(`Generating level ${levelNumber}: ${levelType} (using config ${levelNum})`);
        
        // Generate level based on type
        switch(levelType) {
            case 'girders':
                generateGirdersLevel(levelConfig);
                break;
            case 'factory':
                generateFactoryLevel(levelConfig);
                break;
            case 'elevators':
                generateElevatorsLevel(levelConfig);
                break;
            case 'rivets':
                generateRivetsLevel(levelConfig);
                break;
            default:
                generateGirdersLevel(levelConfig);
        }
        
        // Update hammer position
        if (levelConfig?.hammerPosition) {
            game.hammer.x = levelConfig.hammerPosition.x;
            game.hammer.y = levelConfig.hammerPosition.y;
            game.hammer.collected = false;
        }
        
        // Reset player and DK positions
        resetPositions();
    }
    
    function generateGirdersLevel(config) {
        // Classic slanted girder level (Level 1)
        const platformHeight = 15;
        const levelHeight = 80;
        
        // Bottom platform (full width)
        game.platforms.push({ x: 0, y: 470, width: canvas.width, height: 30, angle: 0 });
        
        // Slanted platforms going up
        for (let level = 1; level <= 5; level++) {
            const y = 470 - (level * levelHeight);
            const isEven = level % 2 === 0;
            
            if (level === 5) {
                // Top platform where DK sits
                game.platforms.push({ x: 0, y: y, width: canvas.width, height: platformHeight, angle: 0 });
            } else {
                // Slanted platforms
                const startX = isEven ? 0 : 100;
                const endX = isEven ? canvas.width - 100 : canvas.width;
                const width = Math.abs(endX - startX);
                
                game.platforms.push({ 
                    x: Math.min(startX, endX), 
                    y: y, 
                    width: width, 
                    height: platformHeight, 
                    angle: isEven ? -0.1 : 0.1,
                    startX: startX,
                    endX: endX
                });
            }
        }
        
        // Add ladders with guaranteed path to top
        addLadders([
            { x: 500, y: 390, width: 20, height: 80 },  // Bottom to level 1
            { x: 150, y: 310, width: 20, height: 80 },  // Level 1 to 2
            { x: 450, y: 230, width: 20, height: 80 },  // Level 2 to 3
            { x: 200, y: 150, width: 20, height: 80 },  // Level 3 to 4
            { x: 300, y: 80, width: 20, height: 70 }    // Level 4 to top
        ]);
    }
    
    function generateFactoryLevel(config) {
        // Pie factory level with conveyor belts (Level 2)
        const platformHeight = 15;
        
        // Bottom platform
        game.platforms.push({ x: 0, y: 470, width: canvas.width, height: 30, angle: 0 });
        
        // Straight platforms with gaps
        game.platforms.push({ x: 0, y: 390, width: 200, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 250, y: 390, width: 200, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 500, y: 390, width: 100, height: platformHeight, angle: 0 });
        
        game.platforms.push({ x: 100, y: 310, width: 200, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 350, y: 310, width: 250, height: platformHeight, angle: 0 });
        
        game.platforms.push({ x: 0, y: 230, width: 150, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 200, y: 230, width: 200, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 450, y: 230, width: 150, height: platformHeight, angle: 0 });
        
        game.platforms.push({ x: 50, y: 150, width: 500, height: platformHeight, angle: 0 });
        
        // Top platform
        game.platforms.push({ x: 0, y: 70, width: canvas.width, height: platformHeight, angle: 0 });
        
        // Add ladders with complete path to top
        addLadders([
            { x: 180, y: 390, width: 20, height: 80 },   // Bottom to level 1
            { x: 480, y: 390, width: 20, height: 80 },   // Bottom to level 1 (alt)
            { x: 320, y: 310, width: 20, height: 80 },   // Level 1 to level 2
            { x: 170, y: 230, width: 20, height: 80 },   // Level 2 to level 3
            { x: 420, y: 230, width: 20, height: 80 },   // Level 2 to level 3 (alt)
            { x: 300, y: 150, width: 20, height: 80 },   // Level 3 to level 4
            { x: 500, y: 150, width: 20, height: 80 },   // Level 3 to level 4 (alt)
            { x: 300, y: 70, width: 20, height: 80 },    // Level 4 to princess
            { x: 500, y: 70, width: 20, height: 80 }     // Level 4 to princess (alt)
        ]);
    }
    
    function generateElevatorsLevel(config) {
        // Elevator level (Level 3) - simplified version
        const platformHeight = 15;
        
        // Bottom platform
        game.platforms.push({ x: 0, y: 470, width: canvas.width, height: 30, angle: 0 });
        
        // Multiple small platforms at different heights
        game.platforms.push({ x: 50, y: 400, width: 100, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 200, y: 380, width: 100, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 350, y: 360, width: 100, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 500, y: 340, width: 100, height: platformHeight, angle: 0 });
        
        game.platforms.push({ x: 100, y: 300, width: 100, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 300, y: 280, width: 100, height: platformHeight, angle: 0 });
        game.platforms.push({ x: 450, y: 260, width: 100, height: platformHeight, angle: 0 });
        
        game.platforms.push({ x: 150, y: 200, width: 300, height: platformHeight, angle: 0 });
        
        // Top platform
        game.platforms.push({ x: 0, y: 70, width: canvas.width, height: platformHeight, angle: 0 });
        
        // Add ladders
        addLadders([
            { x: 80, y: 400, width: 20, height: 70 },
            { x: 230, y: 380, width: 20, height: 90 },
            { x: 380, y: 360, width: 20, height: 110 },
            { x: 530, y: 340, width: 20, height: 130 },
            { x: 130, y: 300, width: 20, height: 100 },
            { x: 330, y: 280, width: 20, height: 120 },
            { x: 300, y: 70, width: 20, height: 145 },    // From top platform down to level 3
            { x: 400, y: 70, width: 20, height: 145 }     // Alternative from top down to level 3
        ]);
    }
    
    function generateRivetsLevel(config) {
        // Rivet level (Level 4) - final level with progressively smaller platforms
        const platformHeight = 15;
        
        // Bottom platform - full width
        game.platforms.push({ x: 0, y: 470, width: canvas.width, height: 30, angle: 0 });
        
        // Progressively smaller platforms creating pyramid structure
        const shrinkAmount = 50;
        game.platforms.push({ x: shrinkAmount, y: 350, width: canvas.width - (shrinkAmount * 2), height: platformHeight, angle: 0 });
        game.platforms.push({ x: shrinkAmount * 2, y: 250, width: canvas.width - (shrinkAmount * 4), height: platformHeight, angle: 0 });
        game.platforms.push({ x: shrinkAmount * 3, y: 150, width: canvas.width - (shrinkAmount * 6), height: platformHeight, angle: 0 });
        
        // Top platform - smallest
        game.platforms.push({ x: shrinkAmount * 4, y: 70, width: canvas.width - (shrinkAmount * 8), height: platformHeight, angle: 0 });
        
        // Add ladders on both sides
        addLadders([
            { x: 100, y: 350, width: 20, height: 120 },
            { x: 500, y: 350, width: 20, height: 120 },
            { x: 200, y: 250, width: 20, height: 100 },
            { x: 400, y: 250, width: 20, height: 100 },
            { x: 150, y: 150, width: 20, height: 100 },
            { x: 450, y: 150, width: 20, height: 100 }
        ]);
    }
    
    function addLadders(ladderData) {
        ladderData.forEach(ladder => {
            game.ladders.push(ladder);
        });
    }
    
    function resetPositions() {
        // Reset player to bottom left
        game.player.x = 50;
        game.player.y = 450;
        game.player.vx = 0;
        game.player.vy = 0;
        game.player.onGround = false;
        game.player.hasHammer = false;
        game.player.hammerTimer = 0;
        
        // Reset DK to top
        game.donkeyKong.x = 50;
        game.donkeyKong.y = 50;
        
        // Reset princess to top right
        game.princess.x = 520;
        game.princess.y = 30;
    }
    
    function updatePlayer() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Check if on ladder
        game.onLadder = false;
        game.ladders.forEach(ladder => {
            if (game.player.x + game.player.width > ladder.x &&
                game.player.x < ladder.x + ladder.width &&
                game.player.y + game.player.height > ladder.y &&
                game.player.y < ladder.y + ladder.height) {
                game.onLadder = true;
            }
        });
        
        // Horizontal movement
        if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
            game.player.vx = game.player.hasHammer ? -2 : -3; // Slower with hammer
            game.climbing = false;
        } else if (game.keys['ArrowRight'] || game.keys['KeyD']) {
            game.player.vx = game.player.hasHammer ? 2 : 3; // Slower with hammer
            game.climbing = false;
        } else {
            game.player.vx = 0;
        }
        
        // Hammer mechanics
        if (game.player.hasHammer) {
            game.player.hammerTimer--;
            if (game.player.hammerTimer <= 0) {
                game.player.hasHammer = false;
            }
        }
        
        // Collect hammer
        if (!game.hammer.collected &&
            game.player.x + game.player.width > game.hammer.x &&
            game.player.x < game.hammer.x + game.hammer.width &&
            game.player.y + game.player.height > game.hammer.y &&
            game.player.y < game.hammer.y + game.hammer.height) {
            game.hammer.collected = true;
            game.player.hasHammer = true;
            game.player.hammerTimer = 600; // 10 seconds at 60fps
        }
        
        // Vertical movement (ladders and jumping)
        if (game.onLadder) {
            if (game.keys['ArrowUp'] || game.keys['KeyW']) {
                game.player.vy = -2;
                game.climbing = true;
                game.player.vx = 0;
            } else if (game.keys['ArrowDown'] || game.keys['KeyS']) {
                game.player.vy = 2;
                game.climbing = true;
                game.player.vx = 0;
            } else if (game.climbing) {
                game.player.vy = 0;
            }
        } else {
            game.climbing = false;
            // Jumping
            if ((game.keys['Space']) && game.player.onGround) {
                game.player.vy = -8; // Reduced from -12
                game.player.onGround = false;
            }
            
            // Gravity
            if (!game.climbing) {
                game.player.vy += 0.8;
            }
        }
        
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
            }
        });
        
        // Boundary checks
        if (game.player.x < 0) game.player.x = 0;
        if (game.player.x > canvas.width - game.player.width) {
            game.player.x = canvas.width - game.player.width;
        }
        
        // Fall off screen
        if (game.player.y > canvas.height) {
            game.player.lives--;
            if (game.player.lives <= 0) {
                game.gameOver = true;
            } else {
                game.player.x = 50;
                game.player.y = 450;
                game.player.vx = 0;
                game.player.vy = 0;
            }
        }
    }
    
    function updateDonkeyKong() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Update animation
        game.donkeyKong.animTimer++;
        if (game.donkeyKong.animTimer > 30) {
            game.donkeyKong.animFrame = (game.donkeyKong.animFrame + 1) % 2;
            game.donkeyKong.animTimer = 0;
        }
        
        // Throwing animation
        if (game.donkeyKong.throwing) {
            game.donkeyKong.throwTimer--;
            if (game.donkeyKong.throwTimer <= 0) {
                game.donkeyKong.throwing = false;
            }
        }
    }
    
    function updateFireballs() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.fireballs.forEach((fireball, index) => {
            fireball.x += fireball.vx;
            fireball.y += fireball.vy;
            fireball.vy += 0.3; // Gravity
            
            // Bounce off platforms
            game.platforms.forEach(platform => {
                if (fireball.x < platform.x + platform.width &&
                    fireball.x + fireball.width > platform.x &&
                    fireball.y < platform.y + platform.height &&
                    fireball.y + fireball.height > platform.y) {
                    
                    if (fireball.vy > 0 && fireball.y < platform.y) {
                        fireball.y = platform.y - fireball.height;
                        fireball.vy = -Math.abs(fireball.vy) * 0.7; // Bounce with energy loss
                        fireball.bounces++;
                        
                        if (fireball.bounces > 3) {
                            fireball.vx = Math.random() > 0.5 ? 1.5 : -1.5; // Change direction
                            fireball.bounces = 0;
                        }
                    }
                }
            });
            
            // Randomly climb ladders
            if (Math.random() < 0.02) { // 2% chance per frame to check ladders
                game.ladders.forEach(ladder => {
                    if (fireball.x + fireball.width/2 > ladder.x &&
                        fireball.x + fireball.width/2 < ladder.x + ladder.width &&
                        Math.abs(fireball.y + fireball.height - ladder.y) < 20) {
                        // Fireball climbs ladder (up or down randomly)
                        fireball.x = ladder.x + ladder.width/2 - fireball.width/2;
                        fireball.vx = 0;
                        fireball.vy = Math.random() > 0.5 ? -2 : 2; // Up or down
                        fireball.bounces = 0;
                    }
                });
            }
            
            // Player collision
            if (fireball.x < game.player.x + game.player.width &&
                fireball.x + fireball.width > game.player.x &&
                fireball.y < game.player.y + game.player.height &&
                fireball.y + fireball.height > game.player.y) {
                
                if (game.player.hasHammer) {
                    game.player.score += 500;
                    game.fireballs.splice(index, 1);
                } else {
                    game.player.lives--;
                    if (game.player.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        game.player.x = 50;
                        game.player.y = 450;
                        game.player.vx = 0;
                        game.player.vy = 0;
                    }
                }
            }
            
            // Remove fireballs that fall off screen
            if (fireball.y > canvas.height + 50) {
                game.fireballs.splice(index, 1);
            }
        });
    }
    
    function updateBarrels() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Spawn barrels
        game.barrelTimer++;
        if (game.barrelTimer > settings.barrelFrequency) {
            // Blue barrel spawning rules: stop when 5 fireballs on screen
            const canSpawnBlue = game.fireballs.length < 5;
            const isBlueBarrel = canSpawnBlue && Math.random() < 0.3; // 30% chance when allowed
            
            let vx = settings.barrelSpeed;
            let vy = 0;
            
            // First blue barrel always falls straight down
            if (isBlueBarrel && game.firstBlueBarrel) {
                vx = 0;
                vy = 2;
                game.firstBlueBarrel = false;
            }
            
            game.barrels.push({
                x: game.donkeyKong.x + 20,
                y: game.donkeyKong.y + 30,
                vx: vx,
                vy: vy,
                width: 15,
                height: 15,
                onGround: false,
                type: isBlueBarrel ? 'blue' : 'brown',
                canUseLadder: !isBlueBarrel && Math.random() < 0.4
            });
            
            game.barrelTimer = 0;
            
            // Trigger throwing animation
            game.donkeyKong.throwing = true;
            game.donkeyKong.throwTimer = 20;
        }
        
        // Update barrel physics
        game.barrels.forEach((barrel, index) => {
            if (barrel.type === 'blue') {
                // Blue barrels: first one falls straight, others can roll
                if (game.firstBlueBarrel === false && barrel.vx === 0 && barrel.onGround) {
                    barrel.vx = settings.barrelSpeed; // Start rolling after first blue barrel
                }
                barrel.x += barrel.vx;
                barrel.vy += 0.5;
                barrel.y += barrel.vy;
            } else {
                // Brown barrels roll and can use ladders
                barrel.x += barrel.vx;
                barrel.vy += 0.5;
                barrel.y += barrel.vy;
                
                // Simple random ladder usage - 1% chance per frame when rolling
                if (barrel.canUseLadder && barrel.onGround && Math.abs(barrel.vx) > 0) {
                    if (Math.random() < 0.05) { // Increased to 5% for testing
                        console.log('Barrel trying to use ladder - position:', barrel.x, barrel.y);
                        
                        // Find nearest ladder
                        let nearestLadder = null;
                        let minDistance = Infinity;
                        
                        game.ladders.forEach((ladder, index) => {
                            const horizontalDistance = Math.abs((barrel.x + barrel.width/2) - (ladder.x + ladder.width/2));
                            const verticalDistance = Math.abs(barrel.y - ladder.y);
                            console.log(`Ladder ${index} at x:${ladder.x} y:${ladder.y}, h-dist:${horizontalDistance}, v-dist:${verticalDistance}`);
                            
                            // Only use ladders that are close horizontally AND vertically (same level)
                            if (horizontalDistance < 50 && verticalDistance < 80 && horizontalDistance < minDistance) {
                                console.log(`Ladder ${index} is suitable!`);
                                nearestLadder = ladder;
                                minDistance = horizontalDistance;
                            } else {
                                console.log(`Ladder ${index} rejected - h:${horizontalDistance < 50}, v:${verticalDistance < 80}`);
                            }
                        });
                        
                        if (nearestLadder) {
                            console.log('Using ladder at:', nearestLadder.x, nearestLadder.y);
                            console.log('Barrel before ladder - vx:', barrel.vx, 'vy:', barrel.vy, 'x:', barrel.x);
                            barrel.x = nearestLadder.x + nearestLadder.width/2 - barrel.width/2;
                            barrel.vx = 0;
                            barrel.vy = 3;
                            barrel.canUseLadder = false;
                            barrel.usingLadder = true; // Flag to prevent platform collision override
                            barrel.onGround = false; // No longer on ground
                            console.log('Barrel after ladder - vx:', barrel.vx, 'vy:', barrel.vy, 'x:', barrel.x);
                        } else {
                            console.log('No suitable ladder found');
                        }
                    }
                }
            }
            
            // Platform collision for barrels
            barrel.onGround = false;
            game.platforms.forEach(platform => {
                if (barrel.x < platform.x + platform.width &&
                    barrel.x + barrel.width > platform.x &&
                    barrel.y < platform.y + platform.height &&
                    barrel.y + barrel.height > platform.y) {
                    
                    if (barrel.vy > 0 && barrel.y < platform.y) {
                        barrel.y = platform.y - barrel.height;
                        barrel.vy = 0;
                        barrel.onGround = true;
                        
                        // If barrel was using ladder, stop using it and start rolling
                        if (barrel.usingLadder) {
                            console.log('Barrel hit platform while using ladder - stopping ladder use');
                            barrel.usingLadder = false;
                            barrel.vx = settings.barrelSpeed;
                        }
                        // Only set rolling velocity if barrel isn't using ladder
                        else if (barrel.vx === 0) {
                            console.log('Setting barrel rolling velocity:', settings.barrelSpeed);
                            barrel.vx = settings.barrelSpeed;
                        }
                        
                        console.log('After platform collision - vx:', barrel.vx, 'vy:', barrel.vy, 'usingLadder:', barrel.usingLadder);
                    }
                }
            });
            
            // Screen edges act as walls - bounce off
            if (barrel.x <= 0) {
                barrel.x = 1;
                barrel.vx = Math.abs(barrel.vx || 1);
            }
            if (barrel.x + barrel.width >= canvas.width) {
                barrel.x = canvas.width - barrel.width - 1;
                barrel.vx = -Math.abs(barrel.vx || 1);
            }
            
            // Remove barrels that fall too far below screen
            if (barrel.y > canvas.height + 100) {
                game.barrels.splice(index, 1);
                return;
            }
            
            // Check if barrel hits oil drum
            if (barrel.x < game.oilDrum.x + game.oilDrum.width &&
                barrel.x + barrel.width > game.oilDrum.x &&
                barrel.y < game.oilDrum.y + game.oilDrum.height &&
                barrel.y + barrel.height > game.oilDrum.y) {
                
                if (barrel.type === 'blue') {
                    // Blue barrels create fireballs
                    game.oilDrum.lit = true;
                    game.fireballs.push({
                        x: game.oilDrum.x + 15,
                        y: game.oilDrum.y,
                        vx: Math.random() > 0.5 ? 1.5 : -1.5,
                        vy: -3,
                        width: 12,
                        height: 12,
                        bounces: 0
                    });
                }
                // Both types are destroyed when hitting oil drum
                game.barrels.splice(index, 1);
                return;
            }
            
            // Player collision with barrels
            if (barrel.x < game.player.x + game.player.width &&
                barrel.x + barrel.width > game.player.x &&
                barrel.y < game.player.y + game.player.height &&
                barrel.y + barrel.height > game.player.y) {
                
                // Check if player has hammer
                if (game.player.hasHammer) {
                    if (barrel.type === 'blue') {
                        // Blue barrels: random score of 300, 500, or 800
                        const scores = [300, 500, 800];
                        game.player.score += scores[Math.floor(Math.random() * scores.length)];
                    } else {
                        // Brown barrels: always 300 points
                        game.player.score += 300;
                    }
                    game.barrels.splice(index, 1);
                } else if (game.player.vy < 0 && game.player.y < barrel.y) {
                    // Jumped over barrel
                    game.player.score += 100;
                    game.barrels.splice(index, 1);
                } else {
                    // Hit by barrel
                    game.player.lives--;
                    if (game.player.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        game.player.x = 50;
                        game.player.y = 450;
                        game.player.vx = 0;
                        game.player.vy = 0;
                    }
                }
            }
        });
    }
    
    function checkWin() {
        // Don't check win condition if level is already complete
        if (game.levelComplete) return;
        
        // Win by reaching the princess
        const playerRight = game.player.x + game.player.width;
        const playerBottom = game.player.y + game.player.height;
        const princessRight = game.princess.x + game.princess.width;
        const princessBottom = game.princess.y + game.princess.height;
        
        const collision = game.player.x < princessRight &&
            playerRight > game.princess.x &&
            game.player.y < princessBottom &&
            playerBottom > game.princess.y;
            
        if (collision) {
            console.log('Player reached princess! Level complete.');
            console.log(`Player: (${game.player.x}, ${game.player.y}) Princess: (${game.princess.x}, ${game.princess.y})`);
            
            game.levelComplete = true;
            game.player.score += 1000; // Bonus for completing level
            
            if (game.currentLevel >= game.maxLevels) {
                // All levels complete
                game.won = true;
                gameRunning = false;
                
                if (callbacks && callbacks.onGameComplete) {
                    setTimeout(() => {
                        callbacks.onGameComplete('donkeykong', { 
                            completed: true, 
                            score: game.player.score,
                            levelsCompleted: game.currentLevel
                        });
                    }, 1000);
                }
            } else {
                // Next level
                setTimeout(nextLevel, 2000);
            }
        }
    }
    
    function nextLevel() {
        game.currentLevel++;
        game.levelComplete = false;
        
        // Generate new level layout
        generateLevel(game.currentLevel);
        
        // Clear barrels and fireballs
        game.barrels = [];
        game.fireballs = [];
        game.barrelTimer = 0;
        game.firstBlueBarrel = true;
        
        // Reset hammer and oil drum
        game.hammer.collected = false;
        game.oilDrum.lit = false;
        
        // Update barrel frequency based on level config
        const levelNum = ((game.currentLevel - 1) % 4) + 1;
        const levelConfig = dkConfig.levels?.[levelNum] || dkConfig.levels?.['1'];
        if (levelConfig?.barrelFrequency) {
            settings.barrelFrequency = levelConfig.barrelFrequency;
        }
        
        console.log(`Advanced to level ${game.currentLevel}: ${levelConfig?.name || 'Unknown'}`);
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background
        ctx.fillStyle = '#000080';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Platforms with level-specific colors
        const currentLevelConfig = dkConfig.levels?.[game.currentLevel] || dkConfig.levels?.['1'];
        const levelType = currentLevelConfig?.type || 'girders';
        
        let platformColor = '#FF6B35'; // Default orange
        switch(levelType) {
            case 'girders': platformColor = '#FF6B35'; break;  // Orange
            case 'factory': platformColor = '#8B4513'; break;  // Brown  
            case 'elevators': platformColor = '#4682B4'; break; // Steel blue
            case 'rivets': platformColor = '#DC143C'; break;   // Crimson
        }
        
        game.platforms.forEach(platform => {
            ctx.fillStyle = platformColor;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Platform details
            ctx.fillStyle = '#D2691E';
            for (let i = 0; i < platform.width; i += 20) {
                ctx.fillRect(platform.x + i, platform.y + 2, 2, platform.height - 4);
            }
        });
        
        // Ladders
        game.ladders.forEach(ladder => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(ladder.x, ladder.y, ladder.width, ladder.height);
            
            // Ladder rungs
            ctx.fillStyle = '#654321';
            for (let y = ladder.y; y < ladder.y + ladder.height; y += 15) {
                ctx.fillRect(ladder.x, y, ladder.width, 3);
            }
        });
        
        // Donkey Kong - animated sprite
        // Body (brown)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(game.donkeyKong.x, game.donkeyKong.y + 8, game.donkeyKong.width, game.donkeyKong.height - 8);
        
        // Chest (lighter brown) - bounces when throwing
        ctx.fillStyle = '#CD853F';
        const chestOffset = game.donkeyKong.throwing ? 2 : 0;
        ctx.fillRect(game.donkeyKong.x + 8, game.donkeyKong.y + 12 + chestOffset, 24, 12 - chestOffset);
        
        // Head (brown) - bobs slightly
        ctx.fillStyle = '#8B4513';
        const headBob = game.donkeyKong.animFrame === 0 ? 0 : 1;
        ctx.fillRect(game.donkeyKong.x + 5, game.donkeyKong.y + headBob, 30, 20);
        
        // Face (lighter)
        ctx.fillStyle = '#CD853F';
        ctx.fillRect(game.donkeyKong.x + 8, game.donkeyKong.y + 3 + headBob, 24, 14);
        
        // Eyes (white background) - blink occasionally
        const blinking = game.donkeyKong.animTimer < 3;
        if (!blinking) {
            ctx.fillStyle = '#FFF';
            ctx.fillRect(game.donkeyKong.x + 10, game.donkeyKong.y + 5 + headBob, 6, 6);
            ctx.fillRect(game.donkeyKong.x + 24, game.donkeyKong.y + 5 + headBob, 6, 6);
            
            // Eye pupils
            ctx.fillStyle = '#000';
            ctx.fillRect(game.donkeyKong.x + 12, game.donkeyKong.y + 7 + headBob, 2, 2);
            ctx.fillRect(game.donkeyKong.x + 26, game.donkeyKong.y + 7 + headBob, 2, 2);
        } else {
            // Closed eyes (blinking)
            ctx.fillStyle = '#000';
            ctx.fillRect(game.donkeyKong.x + 10, game.donkeyKong.y + 8 + headBob, 6, 2);
            ctx.fillRect(game.donkeyKong.x + 24, game.donkeyKong.y + 8 + headBob, 6, 2);
        }
        
        // Nostrils
        ctx.fillStyle = '#000';
        ctx.fillRect(game.donkeyKong.x + 17, game.donkeyKong.y + 12 + headBob, 2, 2);
        ctx.fillRect(game.donkeyKong.x + 21, game.donkeyKong.y + 12 + headBob, 2, 2);
        
        // Animated Arms - swing up and down
        ctx.fillStyle = '#8B4513';
        if (game.donkeyKong.throwing) {
            // Throwing pose - arms up
            ctx.fillRect(game.donkeyKong.x - 8, game.donkeyKong.y + 10, 12, 8);
            ctx.fillRect(game.donkeyKong.x + 36, game.donkeyKong.y + 8, 12, 8);
            
            // Show barrel in hand
            ctx.fillStyle = '#654321';
            ctx.fillRect(game.donkeyKong.x + 42, game.donkeyKong.y + 5, 8, 8);
        } else {
            // Normal swinging arms
            const leftArmY = game.donkeyKong.animFrame === 0 ? 15 : 18;
            const rightArmY = game.donkeyKong.animFrame === 0 ? 18 : 15;
            
            ctx.fillRect(game.donkeyKong.x - 8, game.donkeyKong.y + leftArmY, 12, 8);
            ctx.fillRect(game.donkeyKong.x + 36, game.donkeyKong.y + rightArmY, 12, 8);
        }
        
        // Chest beating effect when throwing
        if (game.donkeyKong.throwing && game.donkeyKong.throwTimer > 10) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(game.donkeyKong.x + 15, game.donkeyKong.y + 15, 10, 3);
        }
        
        // Princess - improved sprite
        // Dress (pink)
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(game.princess.x, game.princess.y + 8, game.princess.width, game.princess.height - 8);
        
        // Dress details (darker pink)
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(game.princess.x + 2, game.princess.y + 10, game.princess.width - 4, game.princess.height - 10);
        
        // Head (skin tone)
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(game.princess.x + 2, game.princess.y + 2, game.princess.width - 4, 10);
        
        // Hair (blonde)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(game.princess.x + 1, game.princess.y + 1, game.princess.width - 2, 8);
        ctx.fillRect(game.princess.x, game.princess.y + 3, game.princess.width, 4);
        
        // Crown
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(game.princess.x + 2, game.princess.y - 3, game.princess.width - 4, 4);
        // Crown jewels
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.princess.x + 4, game.princess.y - 2, 2, 2);
        ctx.fillRect(game.princess.x + 9, game.princess.y - 2, 2, 2);
        ctx.fillRect(game.princess.x + 14, game.princess.y - 2, 2, 2);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(game.princess.x + 5, game.princess.y + 5, 2, 2);
        ctx.fillRect(game.princess.x + 13, game.princess.y + 5, 2, 2);
        
        // Arms (reaching out for help)
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(game.princess.x - 3, game.princess.y + 10, 6, 3);
        ctx.fillRect(game.princess.x + 17, game.princess.y + 10, 6, 3);
        
        // Oil drum
        ctx.fillStyle = '#444';
        ctx.fillRect(game.oilDrum.x, game.oilDrum.y, game.oilDrum.width, game.oilDrum.height);
        ctx.fillStyle = '#666';
        ctx.fillRect(game.oilDrum.x + 3, game.oilDrum.y + 3, game.oilDrum.width - 6, game.oilDrum.height - 6);
        
        if (game.oilDrum.lit) {
            // Fire on top of drum
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(game.oilDrum.x + 5, game.oilDrum.y - 10, 20, 10);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(game.oilDrum.x + 8, game.oilDrum.y - 7, 14, 5);
        }
        
        // Fireballs
        game.fireballs.forEach(fireball => {
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(fireball.x, fireball.y, fireball.width, fireball.height);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(fireball.x + 2, fireball.y + 2, fireball.width - 4, fireball.height - 4);
        });
        
        // Barrels
        game.barrels.forEach(barrel => {
            if (barrel.type === 'blue') {
                ctx.fillStyle = '#4169E1';
                ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
                ctx.fillStyle = '#1E90FF';
                ctx.fillRect(barrel.x + 2, barrel.y + 2, barrel.width - 4, barrel.height - 4);
            } else {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
                ctx.fillStyle = '#654321';
                ctx.fillRect(barrel.x + 2, barrel.y + 2, barrel.width - 4, barrel.height - 4);
            }
        });
        
        // Hammer (if not collected)
        if (!game.hammer.collected) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(game.hammer.x, game.hammer.y, game.hammer.width, game.hammer.height);
            ctx.fillStyle = '#654321';
            ctx.fillRect(game.hammer.x + 2, game.hammer.y + 2, 6, game.hammer.height - 4);
            ctx.fillRect(game.hammer.x + 10, game.hammer.y, 8, 6);
        }
        
        // Player (Mario) - improved sprite
        // Overalls (blue)
        ctx.fillStyle = '#0066CC';
        ctx.fillRect(game.player.x + 2, game.player.y + 8, game.player.width - 4, game.player.height - 8);
        
        // Shirt (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.player.x + 4, game.player.y + 10, game.player.width - 8, 8);
        
        // Head (skin tone)
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(game.player.x + 3, game.player.y + 2, game.player.width - 6, 10);
        
        // Hat (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.player.x + 1, game.player.y - 2, game.player.width - 2, 6);
        
        // Hat brim
        ctx.fillStyle = '#CC0000';
        ctx.fillRect(game.player.x, game.player.y + 2, game.player.width, 2);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(game.player.x + 5, game.player.y + 5, 2, 2);
        ctx.fillRect(game.player.x + 13, game.player.y + 5, 2, 2);
        
        // Mustache
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(game.player.x + 6, game.player.y + 8, 8, 2);
        
        // Hammer (if player has it)
        if (game.player.hasHammer) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(game.player.x + game.player.width, game.player.y + 5, 15, 4);
            ctx.fillRect(game.player.x + game.player.width + 5, game.player.y, 4, 12);
        }
        
        // UI
        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.fillText(`Lives: ${game.player.lives}`, 10, 25);
        ctx.fillText(`Score: ${game.player.score}`, 10, 45);
        const levelConfig = dkConfig.levels?.[game.currentLevel] || dkConfig.levels?.['1'];
        const levelName = levelConfig?.name || 'Unknown';
        ctx.fillText(`Level: ${game.currentLevel}/${game.maxLevels} - ${levelName}`, 10, 65);
        
        if (game.player.hasHammer) {
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`Hammer: ${Math.ceil(game.player.hammerTimer / 60)}s`, 10, 85);
        }
        
        if (game.levelComplete && !game.won) {
            ctx.fillStyle = 'rgba(0,255,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Level ${game.currentLevel} Complete!`, canvas.width/2, canvas.height/2 - 20);
            ctx.font = '16px Arial';
            ctx.fillText('Get ready for the next level...', canvas.width/2, canvas.height/2 + 20);
        }
        
        if (!game.gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Climb ladders and avoid barrels!', canvas.width/2, canvas.height/2 - 20);
            ctx.fillText('Arrow keys to move, SPACE to jump', canvas.width/2, canvas.height/2 + 10);
            ctx.fillText('Reach the princess at the top!', canvas.width/2, canvas.height/2 + 40);
        }
        
        if (game.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.font = '16px Arial';
            ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 40);
        } else if (game.won) {
            ctx.fillStyle = 'rgba(0,255,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('All Levels Complete!', canvas.width/2, canvas.height/2 - 20);
            ctx.font = '16px Arial';
            ctx.fillText(`Final Score: ${game.player.score}`, canvas.width/2, canvas.height/2 + 20);
            ctx.fillText(`Completed ${game.maxLevels} levels!`, canvas.width/2, canvas.height/2 + 40);
        }
    }
    
    function gameLoop() {
        if (!gameRunning) return;
        
        updatePlayer();
        updateDonkeyKong();
        updateBarrels();
        updateFireballs();
        checkWin();
        render();
    }
    
    function handleKeyDown(e) {
        // Only handle game-related keys
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        
        game.keys[e.code] = true;
        
        if (!game.gameStarted) {
            game.gameStarted = true;
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('donkeykong');
            }
        }
        
        if (game.gameOver && e.code === 'KeyR') {
            // Restart
            game.player = { 
                x: 50, y: 450, width: 20, height: 25, 
                vx: 0, vy: 0, onGround: false, onLadder: false,
                lives: 3, score: 0, climbing: false, hasHammer: false, hammerTimer: 0
            };
            game.hammer.collected = false;
            game.oilDrum.lit = false;
            game.barrels = [];
            game.fireballs = [];
            game.barrelTimer = 0;
            game.firstBlueBarrel = true;
            game.currentLevel = 1;
            game.levelComplete = false;
            game.gameOver = false;
            game.won = false;
            
            // Reset difficulty
            settings.barrelSpeed = Math.max(0.8, 0.5 + (5 * 0.1)); // Use difficulty 5 as default
            settings.barrelFrequency = 150; // Reset to default value
            
            if (gameRunning) {
                gameLoop();
            }
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        // Only handle game-related keys
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        
        game.keys[e.code] = false;
        e.preventDefault();
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Store handler references for cleanup
    const keyDownHandler = handleKeyDown;
    const keyUpHandler = handleKeyUp;
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Classic Donkey Kong - climb to save the princess while avoiding barrels!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    generateLevel(game.currentLevel);
    
    // Start game loop
    gameRunning = true;
    gameInterval = setInterval(gameLoop, 16); // ~60fps
    
    // Return cleanup function
    return {
        cleanup: () => {
            gameRunning = false;
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            document.removeEventListener('keydown', keyDownHandler);
            document.removeEventListener('keyup', keyUpHandler);
        }
    };
}
