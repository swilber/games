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
    
    // Player object with physics properties
    const player = {
        x: canvas.width / 2,
        y: 50, // Start at top of screen
        vx: 0,
        vy: 0,
        mass: 70, // kg (skier + equipment)
        skiDirection: 2, // 0=left, 1=left-down, 2=down, 3=right-down, 4=right
        jumping: false,
        jumpHeight: 0,
        jumpVelocity: 0,
        crashed: false,
        crashTimer: 0,
        onLift: false,
        liftProgress: 0
    };
    
    // Physics constants
    const GRAVITY = 9.81; // m/s² (scaled for game)
    const SLOPE_ANGLE = 30 * Math.PI / 180; // 30 degrees in radians
    const TIME_SCALE = 0.016; // 60fps time step
    const PIXEL_TO_METER = 0.1; // Scale factor
    
    // Game objects arrays
    const obstacles = [];
    const otherSkiers = [];
    const jumps = [];
    const slalomFlags = [];
    const skiLifts = [];
    const yeti = { x: canvas.width / 2, y: canvas.height + 200, active: false };
    
    // Terrain scroll offset
    let scrollY = 0;
    
    // Pregenerated map data
    const mapHeight = 10000; // Total map height in pixels
    const pregeneratedObstacles = [];
    const pregeneratedSkiers = [];
    const pregeneratedJumps = [];
    const pregeneratedFlags = [];
    const pregeneratedLifts = [];
    
    function pregenerateMap() {
        // Generate obstacles across entire map
        for (let y = 0; y < mapHeight; y += 50) {
            // Trees
            if (Math.random() < 0.3) {
                pregeneratedObstacles.push({
                    type: 'tree',
                    x: Math.random() * canvas.width,
                    y: y,
                    width: 20,
                    height: 40
                });
            }
            
            // Rocks
            if (Math.random() < 0.2) {
                pregeneratedObstacles.push({
                    type: 'rock',
                    x: Math.random() * canvas.width,
                    y: y,
                    width: 15,
                    height: 15
                });
            }
        }
        
        // Generate other skiers
        for (let y = 0; y < mapHeight; y += 200) {
            if (Math.random() < 0.4) {
                pregeneratedSkiers.push({
                    x: Math.random() * canvas.width,
                    y: y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 2 + Math.random() * 2,
                    color: ['#0000ff', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 3)]
                });
            }
        }
        
        // Generate jumps
        for (let y = 0; y < mapHeight; y += 300) {
            if (Math.random() < 0.3) {
                pregeneratedJumps.push({
                    x: Math.random() * (canvas.width - 60),
                    y: y,
                    width: 60,
                    height: 20
                });
            }
        }
        
        // Generate slalom flags
        for (let y = 0; y < mapHeight; y += 150) {
            if (Math.random() < 0.4) {
                pregeneratedFlags.push({
                    x: Math.random() * canvas.width,
                    y: y,
                    collected: false,
                    color: Math.random() > 0.5 ? '#ff0000' : '#0000ff'
                });
            }
        }
        
        // Generate ski lifts
        for (let y = 0; y < mapHeight; y += 800) {
            if (Math.random() < 0.5) {
                pregeneratedLifts.push({
                    x: Math.random() * (canvas.width - 100),
                    y: y,
                    width: 100,
                    height: 30,
                    active: true
                });
            }
        }
    }
    
    // Player's absolute position on the map
    let playerMapY = 100; // Start near top of map to ski downwards
    
    function generateTerrain() {
        // No longer needed - map is pregenerated
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
        
        // Physics constants for 30-degree slope
        const GRAVITY = 2.0; // Much reduced gravity for game balance
        const SLOPE_ANGLE = 30 * Math.PI / 180; // 30 degrees in radians
        const TIME_STEP = 1/60; // 60fps
        const FRICTION_COEFFICIENT = 0.3; // Reduced friction so direction changes work
        const AIR_RESISTANCE = 1.0;
        
        // Gravity components on 30-degree slope
        const GRAVITY_DOWN_SLOPE = GRAVITY * Math.sin(SLOPE_ANGLE); // Force down the slope
        const GRAVITY_NORMAL = GRAVITY * Math.cos(SLOPE_ANGLE); // Normal force
        
        // Vertical velocity from gravity (always accelerating down slope)
        player.vy += GRAVITY_DOWN_SLOPE * TIME_STEP;
        
        // Horizontal velocity from ski direction and kinetic energy transfer
        const skiDirections = [
            { angle: -Math.PI/2, turnForce: 0.8 },    // Hard left (90 degrees)
            { angle: -Math.PI/4, turnForce: 0.6 },    // Left-down (45 degrees)
            { angle: 0, turnForce: 0 },               // Straight down
            { angle: Math.PI/4, turnForce: 0.6 },     // Right-down (45 degrees)
            { angle: Math.PI/2, turnForce: 0.8 }      // Hard right (90 degrees)
        ];
        
        const currentDirection = skiDirections[player.skiDirection];
        
        // Apply directional force based on ski angle
        const directionForce = 8.0;
        player.vx += Math.sin(currentDirection.angle) * directionForce * TIME_STEP;
        player.vy += Math.cos(currentDirection.angle) * directionForce * TIME_STEP;
        
        // Simple velocity damping instead of complex friction
        const dampingFactors = [
            0.95, // Hard left (light damping - sideways)
            0.98, // Left-down (very light damping - diagonal)
            0.99, // Straight down (minimal damping - with slope)
            0.98, // Right-down (very light damping - diagonal)
            0.95  // Hard right (light damping - sideways)
        ];
        
        const damping = dampingFactors[player.skiDirection];
        player.vx *= damping;
        player.vy *= damping;
        
        // Apply max speed limit
        const maxSpeed = 15;
        const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        
        if (currentSpeed > maxSpeed) {
            player.vx = (player.vx / currentSpeed) * maxSpeed;
            player.vy = (player.vy / currentSpeed) * maxSpeed;
        }
        
        // Apply movement with velocity scaling
        player.x += player.vx * 0.3;
        player.y += player.vy * 0.3;
        
        // Update absolute map position
        playerMapY += player.vy * 0.3; // Moving down the map when vy is positive
        
        // Calculate speed for scoring
        player.speed = currentSpeed;
        
        // Keep player on screen vertically
        if (player.y > canvas.height - 50) {
            player.y = canvas.height - 50;
        }
        if (player.y < 50) {
            player.y = 50;
        }
        
        // Handle jumping physics with real gravity
        if (player.jumping) {
            player.jumpVelocity -= GRAVITY * TIME_STEP; // Real gravity for jumps
            player.jumpHeight += player.jumpVelocity;
            
            if (player.jumpHeight <= 0) {
                player.jumpHeight = 0;
                player.jumping = false;
                player.jumpVelocity = 0;
            }
        }
        
        // Keep player on screen horizontally
        player.x = Math.max(10, Math.min(canvas.width - 10, player.x));
        
        // Update distance (only count downhill movement)
        distance += Math.max(0, player.vy * 0.3); // Scale distance to match movement
        
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
        // Populate visible objects from pregenerated map
        obstacles.length = 0;
        otherSkiers.length = 0;
        jumps.length = 0;
        slalomFlags.length = 0;
        skiLifts.length = 0;
        
        const screenTop = playerMapY - canvas.height / 2;
        const screenBottom = playerMapY + canvas.height / 2;
        
        // Add visible obstacles
        pregeneratedObstacles.forEach(obstacle => {
            if (obstacle.y >= screenTop && obstacle.y <= screenBottom) {
                obstacles.push({
                    ...obstacle,
                    y: obstacle.y - playerMapY + player.y
                });
            }
        });
        
        // Add visible skiers
        pregeneratedSkiers.forEach(skier => {
            if (skier.y >= screenTop && skier.y <= screenBottom) {
                otherSkiers.push({
                    ...skier,
                    y: skier.y - playerMapY + player.y
                });
            }
        });
        
        // Add visible jumps
        pregeneratedJumps.forEach(jump => {
            if (jump.y >= screenTop && jump.y <= screenBottom) {
                jumps.push({
                    ...jump,
                    y: jump.y - playerMapY + player.y
                });
            }
        });
        
        // Add visible flags
        pregeneratedFlags.forEach(flag => {
            if (flag.y >= screenTop && flag.y <= screenBottom) {
                slalomFlags.push({
                    ...flag,
                    y: flag.y - playerMapY + player.y
                });
            }
        });
        
        // Add visible lifts
        pregeneratedLifts.forEach(lift => {
            if (lift.y >= screenTop && lift.y <= screenBottom) {
                skiLifts.push({
                    ...lift,
                    y: lift.y - playerMapY + player.y
                });
            }
        });
        
        // Check collisions with obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
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
            skier.y += skier.vy - Math.max(0, player.vy * 0.3); // Move based on current player velocity
            
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
            // Draw normal player with ski direction
            ctx.fillStyle = skiFreeConfig.visual?.playerColor || '#ff0000';
            ctx.fillRect(-5, -10, 10, 20);
            
            // Draw skis based on direction
            ctx.fillStyle = '#8B4513';
            const skiAngles = [-45, -22.5, 0, 22.5, 45]; // Angles for each direction
            const angle = skiAngles[player.skiDirection] * Math.PI / 180;
            
            ctx.save();
            ctx.rotate(angle);
            ctx.fillRect(-12, 5, 24, 3); // Skis
            ctx.restore();
            
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
        ctx.fillText(`VX: ${player.vx.toFixed(2)}`, 10, 90);
        ctx.fillText(`VY: ${player.vy.toFixed(2)}`, 10, 110);
        
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
            ctx.fillText('Use LEFT/RIGHT arrows to turn skis', canvas.width / 2 - 130, canvas.height / 2);
            ctx.fillText('Ski positions: Left, Left-Down, Down, Right-Down, Right', canvas.width / 2 - 180, canvas.height / 2 + 25);
            ctx.fillText('Avoid trees, rocks, and other skiers', canvas.width / 2 - 140, canvas.height / 2 + 50);
            ctx.fillText('Hit jumps for bonus points', canvas.width / 2 - 100, canvas.height / 2 + 75);
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
        
        switch(e.code) {
            case 'ArrowLeft':
                // Move ski direction one position to the left
                player.skiDirection = Math.max(0, player.skiDirection - 1);
                break;
            case 'ArrowRight':
                // Move ski direction one position to the right
                player.skiDirection = Math.min(4, player.skiDirection + 1);
                break;
        }
        
        e.preventDefault();
    }
    
    // Store handler reference for cleanup
    const keyDownHandler = handleKeyDown;
    
    // Set up game
    document.addEventListener('keydown', keyDownHandler);
    gameArea.appendChild(canvas);
    
    // Initialize pregenerated map
    pregenerateMap();
    
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
