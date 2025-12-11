async function createSpaceInvadersGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Space Invaders configuration using ConfigManager
    let invadersConfig = {};
    if (typeof configManager !== 'undefined') {
        invadersConfig = await configManager.loadConfig('spaceinvaders');
        console.log('Space Invaders config loaded via ConfigManager:', invadersConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        invadersConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings,
            scoring: settings,
            formation: settings
        };
    }
    
    // Merge ConfigManager values with settings
    const mergedSettings = {
        ...settings,
        ...invadersConfig.gameplay,
        ...invadersConfig.physics,
        ...invadersConfig.scoring,
        canvasWidth: invadersConfig.physics?.canvasWidth || 800,
        canvasHeight: invadersConfig.physics?.canvasHeight || 600
    };
    
    console.log('Space Invaders merged settings:', mergedSettings);
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameWon = false;
    let gameStarted = false;
    let currentLevel = 1;
    let lives = mergedSettings.lives || 3;
    let score = 0;
    let gameState = 'levelStart'; // 'levelStart', 'playing', 'levelComplete', 'gameComplete', 'gameOver'
    let invulnerable = 0;
    let extraLifeAwarded = false;
    let invaderDirection = 1; // 1 = right, -1 = left
    let invaderDropTimer = 0;
    let frameCount = 0;
    let currentSpeedMultiplier = 1; // Track current speed for display
    
    // Create canvas with classic arcade feel
    const canvas = document.createElement('canvas');
    canvas.width = mergedSettings.canvasWidth;
    canvas.height = mergedSettings.canvasHeight;
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.style.backgroundColor = invadersConfig.visual?.backgroundColor || '#000000';
    canvas.style.border = '2px solid #00FF00';
    const ctx = canvas.getContext('2d');
    
    // Game objects
    const player = {
        x: canvas.width / 2 - (mergedSettings.playerSize || 24) / 2,
        y: canvas.height - 60,
        width: mergedSettings.playerSize || 24,
        height: 16,
        speed: mergedSettings.playerSpeed || 4,
        shooting: false
    };
    
    let invaders = [];
    let playerBullets = [];
    let invaderBullets = [];
    let barriers = [];
    let ufos = [];
    let particles = [];
    
    // Invader types (classic formation with authentic sprites)
    const invaderTypes = [
        { 
            points: 30, 
            sprites: ['◢◤', '◥◣'], // Top row - squid-like alien
            width: 16
        },
        { 
            points: 20, 
            sprites: ['▄█▄', '▀█▀'], // Middle rows - crab-like alien
            width: 16
        },
        { 
            points: 20, 
            sprites: ['▄█▄', '▀█▀'], // Middle rows - crab-like alien
            width: 16
        },
        { 
            points: 10, 
            sprites: ['╫╫╫', '┼┼┼'], // Bottom rows - octopus-like alien
            width: 16
        },
        { 
            points: 10, 
            sprites: ['╫╫╫', '┼┼┼'], // Bottom rows - octopus-like alien
            width: 16
        }
    ];
    
    function initializeLevel(level) {
        invaders = [];
        playerBullets = [];
        invaderBullets = [];
        barriers = [];
        ufos = [];
        particles = [];
        
        // Reset player position
        player.x = canvas.width / 2 - player.width / 2;
        invaderDirection = 1;
        invaderDropTimer = 0;
        
        // Create invader formation
        createInvaderFormation();
        
        // Create barriers
        createBarriers();
        
        gameState = 'levelStart';
    }
    
    function createInvaderFormation() {
        const formation = invadersConfig.formation || {};
        const rows = formation.rows || 5;
        const cols = formation.cols || 11;
        const spacing = formation.spacing || 32;
        const startY = formation.startY || 80;
        const leftMargin = formation.leftMargin || 100;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const invader = {
                    x: leftMargin + col * spacing,
                    y: startY + row * 36, // Increased from 24 to 36 (1.5x vertical spacing)
                    width: mergedSettings.invaderWidth || 22,
                    height: mergedSettings.invaderHeight || 16,
                    type: invaderTypes[row],
                    alive: true,
                    animFrame: 0,
                    shootTimer: Math.random() * 300 + 60
                };
                invaders.push(invader);
            }
        }
    }
    
    function createBarriers() {
        const barrierCount = mergedSettings.barrierCount || 4;
        const barrierWidth = mergedSettings.barrierWidth || 60;
        const barrierHeight = mergedSettings.barrierHeight || 40;
        
        // Original game spacing: barrier width between barriers
        const totalBarrierSpace = barrierCount * barrierWidth + (barrierCount - 1) * barrierWidth; // barriers + gaps
        const startX = (canvas.width - totalBarrierSpace) / 2; // Center the barrier group
        
        for (let i = 0; i < barrierCount; i++) {
            const barrier = {
                x: startX + i * (barrierWidth + barrierWidth), // barrier width + gap width
                y: canvas.height - 200,
                width: barrierWidth,
                height: barrierHeight,
                hits: mergedSettings.barrierHits || 5,
                maxHits: mergedSettings.barrierHits || 5,
                blocks: []
            };
            
            // Create barrier blocks for detailed destruction
            for (let by = 0; by < 8; by++) {
                for (let bx = 0; bx < 12; bx++) {
                    // Skip corners and create arch shape
                    if ((by < 2 && (bx < 2 || bx > 9)) || 
                        (by > 5 && bx > 3 && bx < 8)) continue;
                    
                    barrier.blocks.push({
                        x: bx * 5,
                        y: by * 5,
                        alive: true
                    });
                }
            }
            
            barriers.push(barrier);
        }
    }
    
    function createUfo() {
        const ufo = {
            x: Math.random() < 0.5 ? -50 : canvas.width + 50,
            y: 40,
            width: mergedSettings.ufoWidth || 40,
            height: mergedSettings.ufoHeight || 16,
            vx: Math.random() < 0.5 ? 2 : -2,
            points: Math.random() < 0.3 ? (mergedSettings.mysteryUfo || 300) : (mergedSettings.ufo || 100),
            mystery: Math.random() < 0.3
        };
        ufos.push(ufo);
    }
    
    function createPlayerBullet() {
        if (playerBullets.length >= (mergedSettings.maxPlayerBullets || 1)) return;
        
        playerBullets.push({
            x: player.x + player.width / 2,
            y: player.y,
            width: mergedSettings.bulletWidth || 2,
            height: mergedSettings.bulletHeight || 8,
            speed: mergedSettings.bulletSpeed || 6
        });
    }
    
    function createInvaderBullet(invader) {
        if (invaderBullets.length >= (mergedSettings.maxInvaderBullets || 3)) return;
        
        invaderBullets.push({
            x: invader.x + invader.width / 2,
            y: invader.y + invader.height,
            width: mergedSettings.bulletWidth || 2,
            height: mergedSettings.bulletHeight || 8,
            speed: 3,
            type: Math.random() < 0.5 ? 'straight' : 'zigzag',
            zigzagOffset: 0
        });
    }
    
    function createParticles(x, y, count = 8, color = '#FFFF00') {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                maxLife: 30,
                color: color
            });
        }
    }
    
    function checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    function update() {
        if (gameState !== 'playing') return;
        
        frameCount++;
        
        // Update timers
        if (invulnerable > 0) invulnerable--;
        
        // Update invaders
        const aliveInvaders = invaders.filter(inv => inv.alive);
        if (aliveInvaders.length === 0) {
            // Level complete
            if (currentLevel >= (mergedSettings.levels || 5)) {
                gameWon = true;
                gameState = 'gameComplete';
                setTimeout(() => {
                    if (callbacks && callbacks.onGameComplete) {
                        callbacks.onGameComplete('spaceinvaders', { completed: true, score: score });
                    }
                }, 3000);
            } else {
                currentLevel++;
                gameState = 'levelComplete';
                setTimeout(() => {
                    initializeLevel(currentLevel);
                }, 2000);
            }
            return;
        }
        
        // Move invaders
        let shouldDrop = false;
        const baseSpeed = (mergedSettings.invaderSpeed || 1.0) * Math.pow(mergedSettings.invaderAcceleration || 1.1, currentLevel - 1);
        
        // Speed increases as invaders get lower on screen
        const lowestInvaderY = Math.max(...aliveInvaders.map(inv => inv.y));
        const positionMultiplier = 1 + Math.max(0, (lowestInvaderY - 200) / 200);
        
        // Speed increases as fewer invaders remain (classic mechanic)
        const totalInvaders = 55; // 5 rows × 11 cols = 55 total invaders
        const remainingInvaders = aliveInvaders.length;
        let invaderCountMultiplier = 1;
        if (remainingInvaders >= 20) invaderCountMultiplier = 1;
        else if (remainingInvaders >= 10) invaderCountMultiplier = 2;
        else if (remainingInvaders >= 5) invaderCountMultiplier = 4;
        else if (remainingInvaders === 4) invaderCountMultiplier = 5;
        else if (remainingInvaders === 3) invaderCountMultiplier = 6;
        else if (remainingInvaders === 2) invaderCountMultiplier = 8;
        else if (remainingInvaders === 1) invaderCountMultiplier = 10;
        
        currentSpeedMultiplier = invaderCountMultiplier; // Store for display
        
        const finalSpeed = baseSpeed * positionMultiplier * invaderCountMultiplier;
        
        if (frameCount % Math.max(1, Math.floor(60 / finalSpeed)) === 0) {
            // Check if invaders hit edge
            const leftmost = Math.min(...aliveInvaders.map(inv => inv.x));
            const rightmost = Math.max(...aliveInvaders.map(inv => inv.x + inv.width));
            
            if ((invaderDirection === 1 && rightmost >= canvas.width - 20) ||
                (invaderDirection === -1 && leftmost <= 20)) {
                shouldDrop = true;
                invaderDirection *= -1;
            }
            
            aliveInvaders.forEach(invader => {
                if (shouldDrop) {
                    invader.y += mergedSettings.invaderDropSpeed || 12;
                } else {
                    invader.x += invaderDirection * 8;
                }
                invader.animFrame = (invader.animFrame + 1) % 2;
            });
        }
        
        // Invader shooting
        aliveInvaders.forEach(invader => {
            invader.shootTimer--;
            if (invader.shootTimer <= 0) {
                // Only bottom-most invaders in each column can shoot
                const sameColumnInvaders = aliveInvaders.filter(inv => 
                    Math.abs(inv.x - invader.x) < 16);
                const isBottomMost = invader.y === Math.max(...sameColumnInvaders.map(inv => inv.y));
                
                if (isBottomMost && Math.random() < 0.08) { // Increased from 0.02 to 0.08 (4x more shooting)
                    createInvaderBullet(invader);
                }
                invader.shootTimer = Math.random() * 120 + 30; // Reduced from 300+60 to 120+30 (faster reload)
            }
        });
        
        // Check if invaders reached player
        const lowestInvader = Math.max(...aliveInvaders.map(inv => inv.y));
        if (lowestInvader >= player.y - 20) {
            lives = 0;
            gameState = 'gameOver';
            gameRunning = false;
            return;
        }
        
        // Update player bullets
        playerBullets = playerBullets.filter(bullet => {
            bullet.y -= bullet.speed;
            return bullet.y > -bullet.height;
        });
        
        // Update invader bullets
        invaderBullets = invaderBullets.filter(bullet => {
            bullet.y += bullet.speed;
            
            if (bullet.type === 'zigzag') {
                bullet.zigzagOffset += 0.2;
                bullet.x += Math.sin(bullet.zigzagOffset) * 2;
            }
            
            return bullet.y < canvas.height + bullet.height;
        });
        
        // Update UFOs
        ufos = ufos.filter(ufo => {
            ufo.x += ufo.vx;
            return ufo.x > -100 && ufo.x < canvas.width + 100;
        });
        
        // Update particles
        particles = particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            return particle.life > 0;
        });
        
        // Collision detection
        checkCollisions();
        
        // Spawn UFOs
        if (Math.random() < (mergedSettings.ufoSpawnRate || 0.002)) {
            createUfo();
        }
        
        // Extra life
        if (!extraLifeAwarded && score >= (mergedSettings.extraLifeScore || 1500)) {
            lives++;
            extraLifeAwarded = true;
        }
    }
    
    function checkCollisions() {
        // Player bullets vs invaders
        playerBullets.forEach((bullet, bulletIndex) => {
            invaders.forEach((invader, invaderIndex) => {
                if (invader.alive && checkCollision(bullet, invader)) {
                    score += invader.type.points;
                    invader.alive = false;
                    createParticles(invader.x + invader.width/2, invader.y + invader.height/2, 6, '#FFFF00');
                    playerBullets.splice(bulletIndex, 1);
                }
            });
        });
        
        // Player bullets vs UFOs
        playerBullets.forEach((bullet, bulletIndex) => {
            ufos.forEach((ufo, ufoIndex) => {
                if (checkCollision(bullet, ufo)) {
                    score += ufo.points;
                    createParticles(ufo.x + ufo.width/2, ufo.y + ufo.height/2, 8, '#FF00FF');
                    ufos.splice(ufoIndex, 1);
                    playerBullets.splice(bulletIndex, 1);
                }
            });
        });
        
        // Player bullets vs barriers
        playerBullets.forEach((bullet, bulletIndex) => {
            barriers.forEach(barrier => {
                // Check collision with individual barrier blocks
                let hit = false;
                barrier.blocks.forEach(block => {
                    const blockX = barrier.x + block.x;
                    const blockY = barrier.y + block.y;
                    
                    if (bullet.x >= blockX && bullet.x <= blockX + 5 &&
                        bullet.y >= blockY && bullet.y <= blockY + 5) {
                        hit = true;
                    }
                });
                
                if (hit && barrier.blocks.length > 0) {
                    // Destroy barrier blocks in a small area around bullet impact
                    const impactX = bullet.x - barrier.x;
                    const impactY = bullet.y - barrier.y;
                    
                    barrier.blocks = barrier.blocks.filter(block => {
                        const distance = Math.sqrt(
                            Math.pow(block.x + 2.5 - impactX, 2) + 
                            Math.pow(block.y + 2.5 - impactY, 2)
                        );
                        return distance > 8; // Remove blocks within 8 pixels of impact
                    });
                    playerBullets.splice(bulletIndex, 1);
                }
            });
        });
        
        // Invader bullets vs barriers
        invaderBullets.forEach((bullet, bulletIndex) => {
            barriers.forEach(barrier => {
                // Check collision with individual barrier blocks
                let hit = false;
                barrier.blocks.forEach(block => {
                    const blockX = barrier.x + block.x;
                    const blockY = barrier.y + block.y;
                    
                    if (bullet.x >= blockX && bullet.x <= blockX + 5 &&
                        bullet.y >= blockY && bullet.y <= blockY + 5) {
                        hit = true;
                    }
                });
                
                if (hit && barrier.blocks.length > 0) {
                    // Destroy barrier blocks in a small area around bullet impact
                    const impactX = bullet.x - barrier.x;
                    const impactY = bullet.y - barrier.y;
                    
                    barrier.blocks = barrier.blocks.filter(block => {
                        const distance = Math.sqrt(
                            Math.pow(block.x + 2.5 - impactX, 2) + 
                            Math.pow(block.y + 2.5 - impactY, 2)
                        );
                        return distance > 8; // Remove blocks within 8 pixels of impact
                    });
                    invaderBullets.splice(bulletIndex, 1);
                }
            });
        });
        
        // Invader bullets vs player
        if (invulnerable === 0) {
            invaderBullets.forEach((bullet, bulletIndex) => {
                if (checkCollision(bullet, player)) {
                    lives--;
                    invulnerable = 120;
                    createParticles(player.x + player.width/2, player.y + player.height/2, 10, '#00FF00');
                    invaderBullets.splice(bulletIndex, 1);
                    
                    if (lives <= 0) {
                        gameState = 'gameOver';
                        gameRunning = false;
                    }
                }
            });
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Classic arcade style
        ctx.strokeStyle = '#00FF00';
        ctx.fillStyle = '#00FF00';
        ctx.lineWidth = 1;
        
        // Draw player
        if (gameState === 'playing' && (invulnerable === 0 || Math.floor(invulnerable / 5) % 2)) {
            ctx.fillStyle = invadersConfig.visual?.playerColor || '#00FF00';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            // Player cannon detail
            ctx.fillRect(player.x + player.width/2 - 1, player.y - 4, 2, 4);
        }
        
        // Draw invaders
        ctx.fillStyle = invadersConfig.visual?.invaderColor || '#FFFF00';
        ctx.font = '18px monospace'; // Increased from 12px to 18px (1.5x larger)
        ctx.textAlign = 'center';
        
        invaders.forEach(invader => {
            if (invader.alive) {
                // Use authentic animated sprites
                const sprite = invader.type.sprites[invader.animFrame];
                ctx.fillText(sprite, invader.x + invader.width/2, invader.y + invader.height);
            }
        });
        
        // Draw UFOs
        ctx.fillStyle = invadersConfig.visual?.ufoColor || '#FF00FF';
        ctx.font = '18px monospace'; // Increased from 12px to 18px to match invaders
        ufos.forEach(ufo => {
            // Classic UFO sprite
            ctx.fillText('▄▀▀▀▄', ufo.x + ufo.width/2, ufo.y + ufo.height);
        });
        
        // Draw barriers
        ctx.fillStyle = invadersConfig.visual?.barrierColor || '#00FF00';
        barriers.forEach(barrier => {
            barrier.blocks.forEach(block => {
                ctx.fillRect(barrier.x + block.x, barrier.y + block.y, 5, 5);
            });
        });
        
        // Draw bullets
        ctx.fillStyle = invadersConfig.visual?.bulletColor || '#FFFFFF';
        playerBullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        ctx.fillStyle = '#FF0000';
        invaderBullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw particles
        particles.forEach(particle => {
            ctx.globalAlpha = particle.life / particle.maxLife;
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, 2, 2);
        });
        ctx.globalAlpha = 1;
        
        // Draw UI
        const retroFont = 'bold 20px "Courier New", monospace';
        const retroFontLarge = 'bold 48px "Courier New", monospace';
        const retroFontMedium = 'bold 32px "Courier New", monospace';
        
        ctx.fillStyle = invadersConfig.visual?.scoreColor || '#FFFFFF';
        ctx.font = retroFont;
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score.toString().padStart(6, '0')}`, 20, 30);
        ctx.fillText(`LIVES: ${lives}`, 20, canvas.height - 20);
        ctx.fillText(`LEVEL: ${currentLevel}/${mergedSettings.levels || 5}`, canvas.width - 150, 30);
        ctx.fillText(`SPEED: ${currentSpeedMultiplier.toFixed(1)}x`, canvas.width - 150, 55);
        
        // Game state overlays
        if (gameState === 'levelStart') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00FF00';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText(`LEVEL ${currentLevel}/${mergedSettings.levels || 5}`, canvas.width/2, canvas.height/2 - 40);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = retroFont;
            ctx.fillText('PRESS SPACE TO START', canvas.width/2, canvas.height/2 + 20);
            ctx.fillText('ARROW KEYS: MOVE  SPACE: SHOOT', canvas.width/2, canvas.height/2 + 60);
        }
        
        if (gameState === 'levelComplete') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00FF00';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL COMPLETE!', canvas.width/2, canvas.height/2);
        }
        
        if (gameState === 'gameComplete') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00FF00';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText('EARTH SAVED!', canvas.width/2, canvas.height/2 - 40);
            
            ctx.fillStyle = '#FFFF00';
            ctx.font = retroFontMedium;
            ctx.fillText('MISSION COMPLETE!', canvas.width/2, canvas.height/2 + 10);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = retroFont;
            ctx.fillText(`FINAL SCORE: ${score.toString().padStart(6, '0')}`, canvas.width/2, canvas.height/2 + 60);
        }
        
        if (gameState === 'gameOver') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#FF0000';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = retroFont;
            ctx.fillText(`FINAL SCORE: ${score.toString().padStart(6, '0')}`, canvas.width/2, canvas.height/2 + 30);
            ctx.fillText('PRESS R TO RESTART', canvas.width/2, canvas.height/2 + 70);
        }
    }
    
    // Input handling
    const keys = {};
    
    function handleKeyDown(e) {
        keys[e.code] = true;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('spaceinvaders');
            }
        }
        
        if (e.code === 'Space') {
            if (gameState === 'levelStart') {
                gameState = 'playing';
                gameRunning = true;
            } else if (gameState === 'playing') {
                createPlayerBullet();
            }
            e.preventDefault();
        }
        
        if (e.code === 'KeyR' && gameState === 'gameOver') {
            // Restart game
            currentLevel = 1;
            lives = mergedSettings.lives || 3;
            score = 0;
            extraLifeAwarded = false;
            initializeLevel(currentLevel);
        }
    }
    
    function handleKeyUp(e) {
        keys[e.code] = false;
    }
    
    function updateInput() {
        if (gameState !== 'playing') return;
        
        // Player movement
        if (keys['ArrowLeft'] && player.x > 0) {
            player.x -= player.speed;
        }
        if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
            player.x += player.speed;
        }
    }
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    gameArea.appendChild(canvas);
    
    // Initialize first level
    initializeLevel(currentLevel);
    
    // Start game loop
    gameInterval = setInterval(() => {
        updateInput();
        update();
        render();
    }, 16); // ~60fps
    
    render(); // Initial render
    
    return {
        cleanup: () => {
            gameRunning = false;
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        }
    };
}
