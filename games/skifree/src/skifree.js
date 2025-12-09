async function createSkiFreeGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load SkiFree configuration
    let skiFreeConfig = {};
    if (typeof configManager !== 'undefined') {
        skiFreeConfig = await configManager.loadConfig('skifree');
    } else {
        skiFreeConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameWon = false;
    let gameStarted = false;
    let score = 0;
    let distance = 0;
    let yetiChasing = false;
    let yetiDistance = 1000;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = skiFreeConfig.physics?.canvasWidth || 800;
    canvas.height = skiFreeConfig.physics?.canvasHeight || 600;
    const ctx = canvas.getContext('2d');
    
    // Player object
    const player = {
        x: canvas.width / 2,
        y: 50, // Start at top of screen
        vx: 0,
        vy: 0,
        speed: 0,
        angle: 0,
        jumping: false,
        jumpHeight: 0,
        jumpVelocity: 0,
        crashed: false,
        crashTimer: 0,
        onLift: false,
        liftProgress: 0
    };
    
    // Game objects arrays
    const obstacles = [];
    const otherSkiers = [];
    const jumps = [];
    const slalomFlags = [];
    const skiLifts = [];
    const yeti = { x: canvas.width / 2, y: canvas.height + 200, active: false };
    
    // Terrain scroll offset
    let scrollY = 0;
    
    function generateTerrain() {
        // Generate trees
        if (Math.random() < (skiFreeConfig.gameplay?.obstacleFrequency || 0.02)) {
            obstacles.push({
                type: 'tree',
                x: Math.random() * canvas.width,
                y: canvas.height + 50, // Start below screen
                width: 20,
                height: 40
            });
        }
        
        // Generate rocks
        if (Math.random() < 0.015) {
            obstacles.push({
                type: 'rock',
                x: Math.random() * canvas.width,
                y: canvas.height + 50, // Start below screen
                width: 15,
                height: 15
            });
        }
        
        // Generate other skiers
        if (Math.random() < 0.008) {
            otherSkiers.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 50, // Start below screen
                vx: (Math.random() - 0.5) * 2,
                vy: -2 - Math.random() * 2, // Move upward (toward top of screen)
                color: ['#0000ff', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 3)]
            });
        }
        
        // Generate jumps
        if (Math.random() < 0.005) {
            jumps.push({
                x: Math.random() * (canvas.width - 60),
                y: canvas.height + 50, // Start below screen
                width: 60,
                height: 20
            });
        }
        
        // Generate slalom flags
        if (Math.random() < 0.01) {
            slalomFlags.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 50, // Start below screen
                collected: false,
                color: Math.random() > 0.5 ? '#ff0000' : '#0000ff'
            });
        }
        
        // Generate ski lifts occasionally
        if (Math.random() < 0.002) {
            skiLifts.push({
                x: Math.random() * (canvas.width - 100),
                y: canvas.height + 50, // Start below screen
                width: 100,
                height: 30,
                active: true
            });
        }
    }
    
    function updatePlayer() {
        if (player.crashed) {
            player.crashTimer += 1/60;
            if (player.crashTimer > 2) {
                player.crashed = false;
                player.crashTimer = 0;
                player.speed = 0;
            }
            return;
        }
        
        if (player.onLift) {
            // Riding ski lift - move up slowly
            player.liftProgress += 0.5;
            scrollY += 1; // Move uphill
            if (player.liftProgress > 200) {
                player.onLift = false;
                player.liftProgress = 0;
            }
            return;
        }
        
        // Apply gravity and movement - skiing downhill (toward bottom of screen)
        const maxSpeed = skiFreeConfig.physics?.maxSpeed || 12;
        const baseSpeed = skiFreeConfig.gameplay?.speed || 3;
        
        // Increase speed going downhill
        player.speed = Math.min(maxSpeed, baseSpeed + distance * 0.001);
        
        // Move player downhill (positive Y direction)
        player.y += player.speed;
        
        // Keep player on screen vertically
        if (player.y > canvas.height - 50) {
            player.y = canvas.height - 50;
        }
        if (player.y < 50) {
            player.y = 50;
        }
        
        // Handle jumping
        if (player.jumping) {
            player.jumpVelocity -= skiFreeConfig.physics?.gravity || 0.8;
            player.jumpHeight += player.jumpVelocity;
            
            if (player.jumpHeight <= 0) {
                player.jumpHeight = 0;
                player.jumping = false;
                player.jumpVelocity = 0;
            }
        }
        
        // Apply horizontal movement with physics
        player.vx *= skiFreeConfig.physics?.friction || 0.95;
        player.x += player.vx;
        
        // Keep player on screen
        player.x = Math.max(10, Math.min(canvas.width - 10, player.x));
        
        // Update distance and scroll
        distance += player.speed;
        scrollY -= player.speed; // Terrain moves upward as player skis down
        
        // Start yeti chase after certain distance
        if (distance > 2000 && !yetiChasing) {
            yetiChasing = true;
            yeti.active = true;
        }
    }
    
    function updateYeti() {
        if (!yeti.active) return;
        
        const yetiSpeed = skiFreeConfig.gameplay?.yetiSpeed || 6;
        
        // Yeti chases player
        const dx = player.x - yeti.x;
        yeti.x += Math.sign(dx) * Math.min(Math.abs(dx) * 0.1, 3);
        yeti.y -= yetiSpeed; // Yeti moves upward (chasing from below)
        
        // Check if yeti caught player
        if (Math.abs(yeti.x - player.x) < 30 && Math.abs(yeti.y - player.y) < 30) {
            // Game over - yeti caught player
            gameRunning = false;
            if (callbacks?.onGameComplete) {
                callbacks.onGameComplete('skifree', { 
                    completed: false, 
                    score: score,
                    distance: Math.floor(distance),
                    caughtByYeti: true
                });
            }
        }
        
        // Reset yeti position if it goes off screen
        if (yeti.y < -100) {
            yeti.y = canvas.height + 100; // Reset to bottom of screen
        }
    }
    
    function updateObstacles() {
        // Update and remove off-screen obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].y += scrollY * 0.1; // Move with terrain scroll
            
            if (obstacles[i].y < -50) { // Remove when off top of screen
                obstacles.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (!player.jumping && !player.crashed &&
                Math.abs(player.x - obstacles[i].x) < obstacles[i].width &&
                Math.abs(player.y - obstacles[i].y) < obstacles[i].height) {
                player.crashed = true;
                player.speed = 0;
            }
        }
        
        // Update other skiers
        for (let i = otherSkiers.length - 1; i >= 0; i--) {
            const skier = otherSkiers[i];
            skier.x += skier.vx;
            skier.y += skier.vy + scrollY * 0.1; // Move with terrain scroll
            
            if (skier.y < -50) { // Remove when off top of screen
                otherSkiers.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (!player.jumping && !player.crashed &&
                Math.abs(player.x - skier.x) < 20 &&
                Math.abs(player.y - skier.y) < 20) {
                player.crashed = true;
                player.speed = 0;
            }
        }
        
        // Update jumps
        for (let i = jumps.length - 1; i >= 0; i--) {
            jumps[i].y += scrollY * 0.1; // Move with terrain scroll
            
            if (jumps[i].y < -50) { // Remove when off top of screen
                jumps.splice(i, 1);
                continue;
            }
            
            // Check if player hits jump
            if (!player.jumping &&
                player.x > jumps[i].x && player.x < jumps[i].x + jumps[i].width &&
                player.y > jumps[i].y && player.y < jumps[i].y + jumps[i].height) {
                player.jumping = true;
                player.jumpVelocity = skiFreeConfig.gameplay?.jumpPower || 15;
                score += 50; // Bonus for jumping
            }
        }
        
        // Update slalom flags
        for (let flag of slalomFlags) {
            flag.y += scrollY * 0.1;
            
            if (!flag.collected &&
                Math.abs(player.x - flag.x) < 20 &&
                Math.abs(player.y - flag.y) < 30) {
                flag.collected = true;
                score += 100;
            }
        }
        
        // Update ski lifts
        for (let lift of skiLifts) {
            lift.y += scrollY * 0.1;
            
            if (lift.active &&
                player.x > lift.x && player.x < lift.x + lift.width &&
                player.y > lift.y && player.y < lift.y + lift.height) {
                player.onLift = true;
                lift.active = false;
            }
        }
        
        // Remove off-screen objects
        slalomFlags.splice(0, slalomFlags.length, ...slalomFlags.filter(f => f.y > -50));
        jumps.splice(0, jumps.length, ...jumps.filter(j => j.y > -50));
        skiLifts.splice(0, skiLifts.length, ...skiLifts.filter(l => l.y > -50));
    }
    
    function render() {
        // Clear canvas with snow background
        ctx.fillStyle = skiFreeConfig.visual?.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw snow pattern
        ctx.fillStyle = skiFreeConfig.visual?.snowColor || '#f0f8ff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37 + scrollY * 0.5) % canvas.width;
            const y = (i * 23 + scrollY * 0.3) % canvas.height;
            ctx.fillRect(x, y, 2, 2);
        }
        
        // Draw obstacles
        obstacles.forEach(obstacle => {
            if (obstacle.type === 'tree') {
                ctx.fillStyle = skiFreeConfig.visual?.treeColor || '#228b22';
                // Draw simple tree
                ctx.fillRect(obstacle.x - 5, obstacle.y, 10, 30);
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y - 5, 15, 0, Math.PI * 2);
                ctx.fill();
            } else if (obstacle.type === 'rock') {
                ctx.fillStyle = skiFreeConfig.visual?.rockColor || '#696969';
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Draw other skiers
        otherSkiers.forEach(skier => {
            ctx.fillStyle = skier.color;
            ctx.fillRect(skier.x - 5, skier.y - 10, 10, 20);
            // Skis
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(skier.x - 8, skier.y + 5, 16, 3);
        });
        
        // Draw jumps
        jumps.forEach(jump => {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(jump.x, jump.y, jump.width, jump.height);
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(jump.x, jump.y, jump.width, jump.height);
        });
        
        // Draw slalom flags
        slalomFlags.forEach(flag => {
            if (!flag.collected) {
                ctx.fillStyle = flag.color;
                ctx.fillRect(flag.x - 2, flag.y - 30, 4, 30);
                ctx.fillRect(flag.x, flag.y - 25, 20, 15);
            }
        });
        
        // Draw ski lifts
        skiLifts.forEach(lift => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(lift.x, lift.y, lift.width, lift.height);
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText('SKI LIFT', lift.x + 20, lift.y + 20);
        });
        
        // Draw player
        ctx.save();
        ctx.translate(player.x, player.y - player.jumpHeight);
        
        if (player.crashed) {
            // Draw crashed player
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(-8, -5, 16, 10);
        } else {
            // Draw normal player
            ctx.fillStyle = skiFreeConfig.visual?.playerColor || '#ff0000';
            ctx.fillRect(-5, -10, 10, 20);
            
            // Draw skis
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-10, 5, 20, 3);
            
            // Draw poles
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-8, -5);
            ctx.lineTo(-12, 8);
            ctx.moveTo(8, -5);
            ctx.lineTo(12, 8);
            ctx.stroke();
        }
        ctx.restore();
        
        // Draw yeti
        if (yeti.active) {
            ctx.fillStyle = skiFreeConfig.visual?.yetiColor || '#8b4513';
            ctx.fillRect(yeti.x - 15, yeti.y - 20, 30, 40);
            // Yeti face
            ctx.fillStyle = '#000000';
            ctx.fillRect(yeti.x - 8, yeti.y - 15, 3, 3);
            ctx.fillRect(yeti.x + 5, yeti.y - 15, 3, 3);
            ctx.fillRect(yeti.x - 3, yeti.y - 8, 6, 3);
        }
        
        // Draw UI
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText(`Score: ${score}`, 10, 30);
        ctx.fillText(`Distance: ${Math.floor(distance)}m`, 10, 50);
        ctx.fillText(`Speed: ${Math.floor(player.speed)}`, 10, 70);
        
        if (player.onLift) {
            ctx.fillText('Riding Ski Lift...', canvas.width / 2 - 60, 100);
        }
        
        if (yetiChasing) {
            ctx.fillStyle = '#FF0000';
            ctx.fillText('YETI IS CHASING YOU!', canvas.width / 2 - 80, 120);
        }
        
        // Instructions
        if (!gameStarted) {
            ctx.fillStyle = '#000000';
            ctx.font = '18px Arial';
            ctx.fillText('Use LEFT/RIGHT arrows to steer', canvas.width / 2 - 120, canvas.height / 2);
            ctx.fillText('Avoid trees, rocks, and other skiers', canvas.width / 2 - 140, canvas.height / 2 + 25);
            ctx.fillText('Hit jumps for bonus points', canvas.width / 2 - 100, canvas.height / 2 + 50);
            ctx.fillText('Collect slalom flags for points', canvas.width / 2 - 110, canvas.height / 2 + 75);
            ctx.fillText('Press any arrow key to start', canvas.width / 2 - 100, canvas.height / 2 + 100);
        }
        
        if (gameWon) {
            ctx.fillStyle = '#00FF00';
            ctx.font = '32px Arial';
            ctx.fillText('YOU SURVIVED!', canvas.width / 2 - 100, canvas.height / 2);
        }
    }
    
    function update() {
        if (!gameRunning) return;
        
        generateTerrain();
        updatePlayer();
        updateObstacles();
        updateYeti();
        
        // Update score based on distance
        score += Math.floor(player.speed);
        
        // Check win condition (survive long enough)
        const targetScore = skiFreeConfig.gameplay?.scoreTarget || 2000;
        if (score >= targetScore && !yetiChasing) {
            gameWon = true;
            gameRunning = false;
            if (callbacks?.onGameComplete) {
                callbacks.onGameComplete('skifree', { 
                    completed: true, 
                    score: score,
                    distance: Math.floor(distance)
                });
            }
        }
    }
    
    function handleKeyDown(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        if (!gameKeys.includes(e.code)) return;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks?.onGameStart) {
                callbacks.onGameStart('skifree');
            }
        }
        
        if (!gameRunning || player.crashed || player.onLift) return;
        
        const turnSpeed = 3;
        switch(e.code) {
            case 'ArrowLeft':
                player.vx -= turnSpeed;
                break;
            case 'ArrowRight':
                player.vx += turnSpeed;
                break;
        }
        
        e.preventDefault();
    }
    
    // Store handler reference for cleanup
    const keyDownHandler = handleKeyDown;
    
    // Set up game
    document.addEventListener('keydown', keyDownHandler);
    gameArea.appendChild(canvas);
    
    // Start game loop
    gameRunning = true;
    gameInterval = setInterval(() => {
        update();
        render();
    }, 16); // ~60fps
    
    render(); // Initial render
    
    // Return cleanup function
    return {
        cleanup: () => {
            gameRunning = false;
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            document.removeEventListener('keydown', keyDownHandler);
        }
    };
}
