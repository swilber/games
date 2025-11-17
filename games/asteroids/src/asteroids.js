async function createAsteroidsGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Asteroids configuration using ConfigManager
    let asteroidsConfig = {};
    if (typeof configManager !== 'undefined') {
        asteroidsConfig = await configManager.loadConfig('asteroids');
        console.log('Asteroids config loaded via ConfigManager:', asteroidsConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        asteroidsConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings,
            scoring: settings,
            powerUps: settings
        };
    }
    
    // Merge ConfigManager values with settings
    const mergedSettings = {
        ...settings,
        ...asteroidsConfig.gameplay,
        ...asteroidsConfig.physics,
        ...asteroidsConfig.scoring,
        canvasWidth: asteroidsConfig.physics?.canvasWidth || 800,
        canvasHeight: asteroidsConfig.physics?.canvasHeight || 600
    };
    
    console.log('Asteroids merged settings:', mergedSettings);
    
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
    let hyperspaceCooldown = 0;
    let extraLifeAwarded = false;
    
    // Create canvas with retro vector graphics feel
    const canvas = document.createElement('canvas');
    canvas.width = mergedSettings.canvasWidth;
    canvas.height = mergedSettings.canvasHeight;
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.style.backgroundColor = asteroidsConfig.visual?.backgroundColor || '#000000';
    canvas.style.border = '2px solid #00FFFF';
    const ctx = canvas.getContext('2d');
    
    // Game objects
    const ship = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        angle: 0,
        vx: 0,
        vy: 0,
        size: mergedSettings.shipSize || 8,
        thrust: false,
        shooting: false,
        hyperspace: false
    };
    
    let asteroids = [];
    let bullets = [];
    let ufos = [];
    let powerUps = [];
    let particles = [];
    
    // Power-up states
    let rapidFire = { active: false, timer: 0 };
    let shield = { active: false, timer: 0 };
    let multiShot = { active: false, timer: 0 };
    
    function initializeLevel(level) {
        asteroids = [];
        bullets = [];
        ufos = [];
        powerUps = [];
        particles = [];
        
        // Reset ship position
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.angle = 0;
        
        // Create asteroids for this level - much easier progression
        let asteroidCount;
        if (level === 1) {
            asteroidCount = 2; // Start with just 2 asteroids
        } else if (level === 2) {
            asteroidCount = 3;
        } else if (level === 3) {
            asteroidCount = 4;
        } else {
            asteroidCount = Math.min(8, 3 + level);
        }
        
        for (let i = 0; i < asteroidCount; i++) {
            createAsteroid(0, null, null, level); // Pass level for speed adjustment
        }
        
        gameState = 'levelStart';
    }
    
    function createAsteroid(size, x = null, y = null, level = 1) {
        const sizes = asteroidsConfig.physics?.asteroidSizes || [40, 20, 10];
        
        // Much slower speeds for early levels
        let speedMultiplier;
        if (level === 1) {
            speedMultiplier = 0.3; // Very slow for level 1
        } else if (level === 2) {
            speedMultiplier = 0.5;
        } else if (level === 3) {
            speedMultiplier = 0.7;
        } else {
            speedMultiplier = Math.min(1.5, 0.5 + (level - 1) * 0.2);
        }
        
        const baseSpeed = (mergedSettings.asteroidSpeed || 1) * speedMultiplier;
        
        const asteroid = {
            x: x !== null ? x : Math.random() * canvas.width,
            y: y !== null ? y : Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * baseSpeed * 2,
            vy: (Math.random() - 0.5) * baseSpeed * 2,
            size: sizes[size] || 40,
            sizeIndex: size,
            angle: Math.random() * Math.PI * 2,
            rotation: (Math.random() - 0.5) * 0.05 // Slower rotation too
        };
        
        // Ensure asteroid doesn't spawn too close to ship
        if (x === null && y === null) {
            const dx = asteroid.x - ship.x;
            const dy = asteroid.y - ship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 150) { // Increased safe distance
                asteroid.x = ship.x + (dx / distance) * 200;
                asteroid.y = ship.y + (dy / distance) * 200;
            }
        }
        
        asteroids.push(asteroid);
    }
    
    function createUfo() {
        const ufo = {
            x: Math.random() < 0.5 ? -50 : canvas.width + 50,
            y: Math.random() * canvas.height,
            vx: (Math.random() < 0.5 ? 1 : -1) * (asteroidsConfig.physics?.ufoSpeed || 2),
            vy: (Math.random() - 0.5) * 1,
            size: asteroidsConfig.physics?.ufoSize || 20,
            shootTimer: 0,
            type: Math.random() < 0.7 ? 'large' : 'small'
        };
        ufos.push(ufo);
    }
    
    function createBullet(x, y, angle, speed = null) {
        if (bullets.filter(b => b.fromShip).length >= (mergedSettings.maxBullets || 6) && !rapidFire.active) return;
        
        const bulletSpeed = speed || (rapidFire.active ? 
            asteroidsConfig.powerUps?.rapidFire?.bulletSpeed || 15 : 
            mergedSettings.bulletSpeed || 10);
        
        if (multiShot.active) {
            // Create 3 bullets in a spread
            for (let i = -1; i <= 1; i++) {
                const spreadAngle = angle + (i * 0.3);
                bullets.push({
                    x: x,
                    y: y,
                    vx: Math.cos(spreadAngle) * bulletSpeed,
                    vy: Math.sin(spreadAngle) * bulletSpeed,
                    lifetime: mergedSettings.bulletLifetime || 60,
                    fromShip: true,
                    size: 4
                });
            }
        } else {
            bullets.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                lifetime: mergedSettings.bulletLifetime || 60,
                fromShip: true,
                size: 4
            });
        }
    }
    
    function createPowerUp(x, y) {
        const types = ['rapidFire', 'shield', 'multiShot'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        powerUps.push({
            x: x,
            y: y,
            type: type,
            lifetime: 600,
            pulse: 0
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
    
    function wrapPosition(obj) {
        if (obj.x < 0) obj.x = canvas.width;
        if (obj.x > canvas.width) obj.x = 0;
        if (obj.y < 0) obj.y = canvas.height;
        if (obj.y > canvas.height) obj.y = 0;
    }
    
    function checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.size + obj2.size) / 2;
    }
    
    function update() {
        if (gameState !== 'playing') return;
        
        // Update timers
        if (invulnerable > 0) invulnerable--;
        if (hyperspaceCooldown > 0) hyperspaceCooldown--;
        
        // Update power-ups
        if (rapidFire.active && --rapidFire.timer <= 0) rapidFire.active = false;
        if (shield.active && --shield.timer <= 0) shield.active = false;
        if (multiShot.active && --multiShot.timer <= 0) multiShot.active = false;
        
        // Update ship
        if (ship.thrust) {
            ship.vx += Math.cos(ship.angle) * (mergedSettings.shipThrust || 0.3);
            ship.vy += Math.sin(ship.angle) * (mergedSettings.shipThrust || 0.3);
        }
        
        // Apply drag and speed limit
        ship.vx *= 0.99;
        ship.vy *= 0.99;
        const maxSpeed = mergedSettings.shipMaxSpeed || 8;
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (speed > maxSpeed) {
            ship.vx = (ship.vx / speed) * maxSpeed;
            ship.vy = (ship.vy / speed) * maxSpeed;
        }
        
        ship.x += ship.vx;
        ship.y += ship.vy;
        wrapPosition(ship);
        
        // Update asteroids
        asteroids.forEach(asteroid => {
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            asteroid.angle += asteroid.rotation;
            wrapPosition(asteroid);
        });
        
        // Update UFOs
        ufos.forEach((ufo, ufoIndex) => {
            ufo.x += ufo.vx;
            ufo.y += ufo.vy;
            
            // UFO shooting
            if (++ufo.shootTimer > 60) {
                ufo.shootTimer = 0;
                const angle = Math.atan2(ship.y - ufo.y, ship.x - ufo.x);
                bullets.push({
                    x: ufo.x,
                    y: ufo.y,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    lifetime: 120,
                    fromShip: false,
                    size: 4
                });
            }
            
            // Remove UFOs that go off screen
            if (ufo.x < -100 || ufo.x > canvas.width + 100) {
                ufos.splice(ufoIndex, 1);
            }
        });
        
        // Update bullets
        bullets = bullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.lifetime--;
            
            wrapPosition(bullet);
            return bullet.lifetime > 0;
        });
        
        // Update power-ups
        powerUps = powerUps.filter(powerUp => {
            powerUp.lifetime--;
            powerUp.pulse += 0.2;
            return powerUp.lifetime > 0;
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
        
        // Spawn UFOs (not on level 1)
        if (currentLevel > 1 && Math.random() < (mergedSettings.ufoSpawnRate || 0.005)) {
            createUfo();
        }
        
        // Check level complete
        if (asteroids.length === 0) {
            if (currentLevel >= (mergedSettings.levels || 5)) {
                gameWon = true;
                gameState = 'gameComplete';
                setTimeout(() => {
                    if (callbacks && callbacks.onGameComplete) {
                        callbacks.onGameComplete('asteroids', { completed: true, score: score });
                    }
                }, 3000);
            } else {
                currentLevel++;
                gameState = 'levelComplete';
                setTimeout(() => {
                    initializeLevel(currentLevel);
                }, 2000);
            }
        }
        
        // Extra life
        if (!extraLifeAwarded && score >= (mergedSettings.extraLifeScore || 10000)) {
            lives++;
            extraLifeAwarded = true;
        }
    }
    
    function checkCollisions() {
        // Ship vs asteroids
        if (invulnerable === 0 && !shield.active) {
            asteroids.forEach(asteroid => {
                if (checkCollision(ship, asteroid)) {
                    lives--;
                    invulnerable = mergedSettings.invulnerabilityTime || 180;
                    createParticles(ship.x, ship.y, 12, '#00FFFF');
                    
                    if (lives <= 0) {
                        gameState = 'gameOver';
                        gameRunning = false;
                    }
                }
            });
        }
        
        // Ship vs UFOs
        if (invulnerable === 0 && !shield.active) {
            ufos.forEach(ufo => {
                if (checkCollision(ship, ufo)) {
                    lives--;
                    invulnerable = mergedSettings.invulnerabilityTime || 180;
                    createParticles(ship.x, ship.y, 12, '#00FFFF');
                    
                    if (lives <= 0) {
                        gameState = 'gameOver';
                        gameRunning = false;
                    }
                }
            });
        }
        
        // Bullets vs asteroids
        bullets.forEach((bullet, bulletIndex) => {
            if (!bullet.fromShip) return;
            
            asteroids.forEach((asteroid, asteroidIndex) => {
                if (checkCollision(bullet, asteroid)) {
                    // Award points
                    const points = [
                        mergedSettings.largeAsteroid || 20,
                        mergedSettings.mediumAsteroid || 50,
                        mergedSettings.smallAsteroid || 100
                    ];
                    score += points[asteroid.sizeIndex] || 20;
                    
                    // Create particles
                    createParticles(asteroid.x, asteroid.y, 8, '#FFFF00');
                    
                    // Split asteroid
                    if (asteroid.sizeIndex < 2) {
                        for (let i = 0; i < 2; i++) {
                            createAsteroid(asteroid.sizeIndex + 1, asteroid.x, asteroid.y, currentLevel);
                        }
                    }
                    
                    // Chance for power-up
                    if (Math.random() < (mergedSettings.powerUpChance || 0.1)) {
                        createPowerUp(asteroid.x, asteroid.y);
                    }
                    
                    asteroids.splice(asteroidIndex, 1);
                    bullets.splice(bulletIndex, 1);
                }
            });
        });
        
        // Bullets vs UFOs
        bullets.forEach((bullet, bulletIndex) => {
            if (!bullet.fromShip) return;
            
            ufos.forEach((ufo, ufoIndex) => {
                if (checkCollision(bullet, ufo)) {
                    score += ufo.type === 'large' ? 
                        (mergedSettings.largeUfo || 200) : 
                        (mergedSettings.smallUfo || 1000);
                    
                    createParticles(ufo.x, ufo.y, 10, '#FF00FF');
                    createPowerUp(ufo.x, ufo.y);
                    
                    ufos.splice(ufoIndex, 1);
                    bullets.splice(bulletIndex, 1);
                }
            });
        });
        
        // Ship vs power-ups
        powerUps.forEach((powerUp, index) => {
            if (checkCollision(ship, powerUp)) {
                applyPowerUp(powerUp.type);
                powerUps.splice(index, 1);
            }
        });
        
        // UFO bullets vs ship
        bullets.forEach((bullet, index) => {
            if (bullet.fromShip || invulnerable > 0 || shield.active) return;
            
            if (checkCollision(ship, bullet)) {
                lives--;
                invulnerable = mergedSettings.invulnerabilityTime || 180;
                createParticles(ship.x, ship.y, 12, '#00FFFF');
                bullets.splice(index, 1);
                
                if (lives <= 0) {
                    gameState = 'gameOver';
                    gameRunning = false;
                }
            }
        });
    }
    
    function applyPowerUp(type) {
        const config = asteroidsConfig.powerUps || {};
        
        switch(type) {
            case 'rapidFire':
                rapidFire.active = true;
                rapidFire.timer = config.rapidFire?.duration || 600;
                break;
            case 'shield':
                shield.active = true;
                shield.timer = config.shield?.duration || 300;
                break;
            case 'multiShot':
                multiShot.active = true;
                multiShot.timer = config.multiShot?.duration || 450;
                break;
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Retro vector graphics style
        ctx.strokeStyle = '#00FFFF';
        ctx.fillStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw ship
        if (gameState === 'playing' && (invulnerable === 0 || Math.floor(invulnerable / 5) % 2)) {
            ctx.save();
            ctx.translate(ship.x, ship.y);
            ctx.rotate(ship.angle);
            
            // Ship body
            ctx.strokeStyle = shield.active ? '#00FF00' : (asteroidsConfig.visual?.shipColor || '#00FFFF');
            ctx.beginPath();
            ctx.moveTo(ship.size, 0);
            ctx.lineTo(-ship.size, -ship.size/2);
            ctx.lineTo(-ship.size/2, 0);
            ctx.lineTo(-ship.size, ship.size/2);
            ctx.closePath();
            ctx.stroke();
            
            // Thrust flame
            if (ship.thrust) {
                ctx.strokeStyle = '#FF8000';
                ctx.beginPath();
                ctx.moveTo(-ship.size/2, 0);
                ctx.lineTo(-ship.size * 1.5, 0);
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        // Draw asteroids
        ctx.strokeStyle = asteroidsConfig.visual?.asteroidColor || '#FFFF00';
        asteroids.forEach(asteroid => {
            ctx.save();
            ctx.translate(asteroid.x, asteroid.y);
            ctx.rotate(asteroid.angle);
            
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const radius = asteroid.size / 2 + Math.sin(angle * 3) * 3;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            
            ctx.restore();
        });
        
        // Draw UFOs
        ctx.strokeStyle = asteroidsConfig.visual?.ufoColor || '#FF00FF';
        ufos.forEach(ufo => {
            ctx.save();
            ctx.translate(ufo.x, ufo.y);
            
            // UFO body
            ctx.beginPath();
            ctx.ellipse(0, 0, ufo.size, ufo.size/2, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // UFO dome
            ctx.beginPath();
            ctx.ellipse(0, -ufo.size/4, ufo.size/2, ufo.size/4, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
        });
        
        // Draw bullets
        ctx.fillStyle = asteroidsConfig.visual?.bulletColor || '#FFFFFF';
        bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw power-ups
        powerUps.forEach(powerUp => {
            const alpha = 0.5 + Math.sin(powerUp.pulse) * 0.5;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = asteroidsConfig.visual?.powerUpColor || '#00FF00';
            
            ctx.save();
            ctx.translate(powerUp.x, powerUp.y);
            
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.stroke();
            
            // Power-up symbol
            ctx.font = '12px "Courier New"';
            ctx.fillStyle = asteroidsConfig.visual?.powerUpColor || '#00FF00';
            ctx.textAlign = 'center';
            ctx.fillText(powerUp.type[0].toUpperCase(), 0, 4);
            
            ctx.restore();
            ctx.globalAlpha = 1;
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
        
        ctx.fillStyle = asteroidsConfig.visual?.textColor || '#00FFFF';
        ctx.font = retroFont;
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score.toString().padStart(8, '0')}`, 20, 30);
        ctx.fillText(`LIVES: ${lives}`, 20, 60);
        ctx.fillText(`LEVEL: ${currentLevel}`, 20, canvas.height - 20);
        
        // Power-up indicators
        let powerUpY = 90;
        if (rapidFire.active) {
            ctx.fillText(`RAPID FIRE: ${Math.ceil(rapidFire.timer / 60)}`, 20, powerUpY);
            powerUpY += 25;
        }
        if (shield.active) {
            ctx.fillText(`SHIELD: ${Math.ceil(shield.timer / 60)}`, 20, powerUpY);
            powerUpY += 25;
        }
        if (multiShot.active) {
            ctx.fillText(`MULTI SHOT: ${Math.ceil(multiShot.timer / 60)}`, 20, powerUpY);
        }
        
        // Game state overlays
        if (gameState === 'levelStart') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#FFFF00';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText(`LEVEL ${currentLevel}`, canvas.width/2, canvas.height/2 - 40);
            
            ctx.fillStyle = '#00FFFF';
            ctx.font = retroFont;
            ctx.fillText('PRESS SPACE TO START', canvas.width/2, canvas.height/2 + 20);
            ctx.fillText('ARROW KEYS: MOVE  SPACE: SHOOT  H: HYPERSPACE', canvas.width/2, canvas.height/2 + 60);
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
            
            ctx.fillStyle = '#FF00FF';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText('MISSION COMPLETE!', canvas.width/2, canvas.height/2 - 40);
            
            ctx.fillStyle = '#00FF00';
            ctx.font = retroFontMedium;
            ctx.fillText('SPACE CLEARED!', canvas.width/2, canvas.height/2 + 10);
            
            ctx.fillStyle = '#FFFF00';
            ctx.font = retroFont;
            ctx.fillText(`FINAL SCORE: ${score.toString().padStart(8, '0')}`, canvas.width/2, canvas.height/2 + 60);
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
            ctx.fillText(`FINAL SCORE: ${score.toString().padStart(8, '0')}`, canvas.width/2, canvas.height/2 + 30);
            ctx.fillText('PRESS R TO RESTART', canvas.width/2, canvas.height/2 + 70);
        }
    }
    
    // Input handling
    const keys = {};
    let shootCooldown = 0;
    
    function handleKeyDown(e) {
        keys[e.code] = true;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('asteroids');
            }
        }
        
        if (e.code === 'Space') {
            if (gameState === 'levelStart') {
                gameState = 'playing';
                gameRunning = true;
            } else if (gameState === 'playing' && shootCooldown === 0) {
                createBullet(ship.x, ship.y, ship.angle);
                shootCooldown = rapidFire.active ? 
                    (asteroidsConfig.powerUps?.rapidFire?.fireRate || 2) : 6; // Reduced from 10 to 6
            }
            e.preventDefault();
        }
        
        if (e.code === 'KeyH' && gameState === 'playing' && hyperspaceCooldown === 0) {
            // Hyperspace jump
            ship.x = Math.random() * canvas.width;
            ship.y = Math.random() * canvas.height;
            ship.vx = 0;
            ship.vy = 0;
            invulnerable = 60;
            hyperspaceCooldown = mergedSettings.hyperspaceCooldown || 300;
            createParticles(ship.x, ship.y, 15, '#00FFFF');
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
        
        if (shootCooldown > 0) shootCooldown--;
        
        // Ship controls
        if (keys['ArrowLeft']) {
            ship.angle -= mergedSettings.shipRotationSpeed || 0.15;
        }
        if (keys['ArrowRight']) {
            ship.angle += mergedSettings.shipRotationSpeed || 0.15;
        }
        if (keys['ArrowUp']) {
            ship.thrust = true;
        } else {
            ship.thrust = false;
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
