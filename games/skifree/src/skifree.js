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
        y: canvas.height / 3, // Fixed at 1/3 down from top
        vx: 0,
        vy: 0,
        mass: 70, // kg (skier + equipment)
        skiDirection: 3, // 0=-90°, 1=-60°, 2=-30°, 3=0°, 4=30°, 5=60°, 6=90°
        jumping: false,
        jumpHeight: 0,
        jumpVelocity: 0,
        crashed: false,
        crashTimer: 0,
        crashFallDistance: 0, // How far player has fallen during crash
        precrashVx: 0, // Store velocity before crash
        precrashVy: 0,
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
    const activeSkiers = []; // Persistent skiers with AI
    const yeti = { 
        x: canvas.width / 2, 
        y: -100, // Start above screen
        active: false,
        chaseTimer: 0,
        maxChaseTime: 10, // 10 seconds of chasing
        cooldownTimer: 0,
        maxCooldown: 30 // 30 seconds before can appear again
    };
    
    // Terrain scroll offset
    let scrollY = 0;
    
    // Pregenerated map data
    const mapHeight = 10000; // Total map height in pixels
    const pregeneratedObstacles = [];
    const pregeneratedSkiers = [];
    const pregeneratedJumps = [];
    const pregeneratedFlags = [];
    const pregeneratedLifts = [];
    
    // Finish line at bottom of mountain
    const finishLine = {
        x: 0,
        y: mapHeight - 200, // 200 pixels from bottom
        width: canvas.width,
        height: 100
    };
    
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
                    vx: (Math.random() - 0.5) * 2, // Small horizontal movement
                    vy: 10, // Skiing downhill at speed 10
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
        
        // Ski lifts removed
    }
    
    // Player's absolute position on the map
    let playerMapY = 0; // Start at very top of map to ski the full distance down
    
    function generateTerrain() {
        // No longer needed - map is pregenerated
    }
    
    function updatePlayer() {
        if (player.crashed) {
            player.crashTimer += 1/60;
            
            // Fall forward during first part of crash
            if (player.crashFallDistance < 30) {
                const fallSpeed = 15; // pixels per second
                const fallAmount = fallSpeed * (1/60);
                player.crashFallDistance += fallAmount;
                playerMapY += fallAmount; // Move down the map as player falls
            }
            
            if (player.crashTimer >= 2) {
                // Reset velocity to 0 after crash
                player.vx = 0;
                player.vy = 0;
                player.crashed = false;
                player.crashTimer = 0;
                player.crashFallDistance = 0;
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
            { angle: -Math.PI/2, turnForce: 0.8 },      // 0: -90° (hard left)
            { angle: -Math.PI/3, turnForce: 0.6 },      // 1: -60° (left)
            { angle: -Math.PI/6, turnForce: 0.4 },      // 2: -30° (slight left)
            { angle: 0, turnForce: 0 },                 // 3: 0° (straight down)
            { angle: Math.PI/6, turnForce: 0.4 },       // 4: 30° (slight right)
            { angle: Math.PI/3, turnForce: 0.6 },       // 5: 60° (right)
            { angle: Math.PI/2, turnForce: 0.8 }        // 6: 90° (hard right)
        ];
        
        const currentDirection = skiDirections[player.skiDirection];
        
        // Apply directional force based on ski angle
        const directionForce = 8.0;
        player.vx += Math.sin(currentDirection.angle) * directionForce * TIME_STEP;
        player.vy += Math.cos(currentDirection.angle) * directionForce * TIME_STEP;
        
        // Simple velocity damping instead of complex friction
        const dampingFactors = [
            0.98,  // -90° (hard left - high damping)
            0.985, // -60° (left - medium-high damping)
            0.995, // -30° (slight left - low damping)
            0.999, // 0° (straight down - minimal damping)
            0.995, // 30° (slight right - low damping)
            0.985, // 60° (right - medium-high damping)
            0.98   // 90° (hard right - high damping)
        ];
        
        const damping = dampingFactors[player.skiDirection];
        player.vx *= damping;
        player.vy *= damping;
        
        // Apply max speed limit
        const maxSpeed = 30;
        const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        
        if (currentSpeed > maxSpeed) {
            player.vx = (player.vx / currentSpeed) * maxSpeed;
            player.vy = (player.vy / currentSpeed) * maxSpeed;
        }
        
        // Apply movement with velocity scaling (only horizontal movement)
        player.x += player.vx * 0.3;
        // Player Y stays fixed at canvas.height / 3
        
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
        
        // Update distance based on map position
        distance = playerMapY; // Distance is how far down the mountain we've gone
        
        // Yeti activation is now handled in updateYeti function
    }
    
    function updateYeti() {
        // Check if yeti is enabled in config
        if (!(skiFreeConfig.gameplay?.yetiEnabled ?? true)) {
            return; // Yeti disabled
        }
        
        // Handle yeti cooldown (when not active)
        if (!yeti.active) {
            yeti.cooldownTimer += 1/60;
            
            // Start yeti chase after certain distance and cooldown
            if (distance > 2000 && yeti.cooldownTimer >= yeti.maxCooldown) {
                yeti.active = true;
                yeti.chaseTimer = 0;
                yeti.x = player.x; // Start above player
                yeti.y = -100; // Start above screen
                yetiChasing = true;
            }
            return;
        }
        
        // Yeti is active - chase the player
        yeti.chaseTimer += 1/60;
        
        const yetiSpeed = skiFreeConfig.gameplay?.yetiSpeed || 25;
        
        // Yeti chases player horizontally
        const dx = player.x - yeti.x;
        yeti.x += Math.sign(dx) * Math.min(Math.abs(dx) * 0.1, 3);
        
        // Yeti moves down the screen (chasing from above)
        yeti.y += yetiSpeed * 0.3; // Apply same scaling as player movement
        
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
            return;
        }
        
        // Yeti gives up after chase time or goes off bottom of screen
        if (yeti.chaseTimer >= yeti.maxChaseTime || yeti.y > canvas.height + 100) {
            yeti.active = false;
            yeti.cooldownTimer = 0;
            yetiChasing = false;
        }
    }
    
    function updateObstacles() {
        // Clear and repopulate visible objects (but smoothly)
        obstacles.length = 0;
        otherSkiers.length = 0;
        jumps.length = 0;
        slalomFlags.length = 0;
        skiLifts.length = 0;
        
        // Calculate visible range with buffer for smooth entry
        const screenTop = playerMapY - canvas.height;
        const screenBottom = playerMapY + canvas.height;
        
        // Add visible obstacles
        pregeneratedObstacles.forEach(obstacle => {
            if (obstacle.y >= screenTop && obstacle.y <= screenBottom) {
                obstacles.push({
                    ...obstacle,
                    y: obstacle.y - playerMapY + player.y
                });
            }
        });
        
        // Handle persistent skiers
        spawnSkiersFromMap();
        updateActiveSkiers();
        
        // Copy active skiers to otherSkiers for collision detection
        activeSkiers.forEach(skier => {
            otherSkiers.push(skier);
        });
        
    function spawnSkiersFromMap() {
        const screenTop = playerMapY - canvas.height;
        const screenBottom = playerMapY + canvas.height;
        
        // Check for new skiers entering the area
        pregeneratedSkiers.forEach(skier => {
            if (skier.y >= screenTop && skier.y <= screenBottom) {
                // Check if this exact skier is already active (use unique ID based on position)
                const skierId = `${skier.x}_${skier.y}`;
                const exists = activeSkiers.some(active => active.id === skierId);
                
                if (!exists) {
                    // Generate random colors once when skier is created
                    const seed = skier.x + skier.y * 1000;
                    const random = (offset) => {
                        const x = Math.sin(seed + offset) * 10000;
                        return (x - Math.floor(x));
                    };
                    
                    const generateColor = (r, g, b) => {
                        const red = Math.floor(random(r) * 180 + 20);
                        const green = Math.floor(random(g) * 180 + 20);
                        const blue = Math.floor(random(b) * 180 + 20);
                        return `rgb(${red}, ${green}, ${blue})`;
                    };
                    
                    const skinColors = ['#FFB6C1', '#FDBCB4', '#D2B48C', '#DEB887', '#F5DEB3', '#FFDBAC'];
                    
                    activeSkiers.push({
                        id: skierId,
                        x: skier.x,
                        y: skier.y - playerMapY + player.y,
                        mapY: skier.y,
                        vx: skier.vx,
                        vy: skier.vy,
                        color: skier.color,
                        // Permanent color properties
                        isGirl: random(100) > 0.5,
                        shirtColor: generateColor(1, 2, 3),
                        pantsColor: generateColor(4, 5, 6),
                        hatColor: generateColor(7, 8, 9),
                        skinColor: skinColors[Math.floor(random(10) * skinColors.length)]
                    });
                }
            }
        });
    }
    
    function updateActiveSkiers() {
        for (let i = activeSkiers.length - 1; i >= 0; i--) {
            const skier = activeSkiers[i];
            
            // Move skiers
            skier.x += skier.vx * 0.3;
            skier.mapY += skier.vy * 0.3; // Move down the map
            
            // Update screen position
            skier.y = skier.mapY - playerMapY + player.y;
            
            // Keep skiers on screen horizontally
            if (skier.x < 0 || skier.x > canvas.width) {
                skier.vx = -skier.vx;
            }
            
            // Simple AI: occasionally change direction
            if (Math.random() < 0.01) {
                skier.vx += (Math.random() - 0.5) * 1;
                skier.vx = Math.max(-2, Math.min(2, skier.vx));
            }
            
            // Remove skiers that are too far away
            if (skier.y < -200 || skier.y > canvas.height + 200) {
                activeSkiers.splice(i, 1);
            }
        }
    }
        
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
        
        // Ski lifts removed from game
        
        // Check collisions with obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (!player.jumping && !player.crashed &&
                Math.abs(player.x - obstacles[i].x) < obstacles[i].width &&
                Math.abs(player.y - obstacles[i].y) < obstacles[i].height) {
                // Store velocity before crash
                player.precrashVx = player.vx;
                player.precrashVy = player.vy;
                player.crashed = true;
                // Immediately stop after storing velocity
                player.vx = 0;
                player.vy = 0;
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
                // Store velocity before crash
                player.precrashVx = player.vx;
                player.precrashVy = player.vy;
                player.crashed = true;
                // Immediately stop after storing velocity
                player.vx = 0;
                player.vy = 0;
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
                // Jump velocity proportional to current speed (much lower than before)
                const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
                player.jumpVelocity = Math.min(currentSpeed * 0.15, 2.5); // Reduced from 0.3 and 5 to jump half as high
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
                // Draw Christmas tree trunk
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(obstacle.x - 3, obstacle.y + 25, 6, 15);
                
                // Draw tree layers (3 triangular sections)
                ctx.fillStyle = '#228B22';
                
                // Bottom layer
                ctx.beginPath();
                ctx.moveTo(obstacle.x, obstacle.y - 10);
                ctx.lineTo(obstacle.x - 15, obstacle.y + 25);
                ctx.lineTo(obstacle.x + 15, obstacle.y + 25);
                ctx.closePath();
                ctx.fill();
                
                // Middle layer
                ctx.beginPath();
                ctx.moveTo(obstacle.x, obstacle.y - 5);
                ctx.lineTo(obstacle.x - 12, obstacle.y + 15);
                ctx.lineTo(obstacle.x + 12, obstacle.y + 15);
                ctx.closePath();
                ctx.fill();
                
                // Top layer
                ctx.beginPath();
                ctx.moveTo(obstacle.x, obstacle.y);
                ctx.lineTo(obstacle.x - 8, obstacle.y + 10);
                ctx.lineTo(obstacle.x + 8, obstacle.y + 10);
                ctx.closePath();
                ctx.fill();
                
                // Draw decorations (ornaments)
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(obstacle.x - 5, obstacle.y + 8, 2, 0, Math.PI * 2);
                ctx.arc(obstacle.x + 3, obstacle.y + 12, 2, 0, Math.PI * 2);
                ctx.arc(obstacle.x - 2, obstacle.y + 18, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw star on top
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y - 8, 3, 0, Math.PI * 2);
                ctx.fill();
                
            } else if (obstacle.type === 'rock') {
                // Draw rock sticking out of snow
                ctx.fillStyle = '#696969';
                ctx.beginPath();
                ctx.ellipse(obstacle.x, obstacle.y + 5, 8, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Add snow on top
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.ellipse(obstacle.x, obstacle.y + 2, 6, 3, 0, 0, Math.PI);
                ctx.fill();
                
                // Add rock texture
                ctx.fillStyle = '#555555';
                ctx.fillRect(obstacle.x - 3, obstacle.y + 3, 2, 2);
                ctx.fillRect(obstacle.x + 1, obstacle.y + 6, 3, 2);
            }
        });
        
        // Draw other skiers
        otherSkiers.forEach(skier => {
            ctx.save();
            ctx.translate(skier.x, skier.y);
            
            // Use permanent color properties (set when skier was created)
            const isGirl = skier.isGirl;
            const shirtColor = skier.shirtColor;
            const pantsColor = skier.pantsColor;
            const hatColor = skier.hatColor;
            const skinColor = skier.skinColor;
            
            // Draw skis with curved tips
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-4, 8, 2, 12);
            ctx.fillRect(2, 8, 2, 12);
            // Curved tips
            ctx.beginPath();
            ctx.arc(-3, 8, 1, Math.PI, 0);
            ctx.arc(3, 8, 1, Math.PI, 0);
            ctx.fill();
            
            // Draw ski boots (green)
            ctx.fillStyle = '#228B22';
            ctx.fillRect(-4, 6, 3, 3);
            ctx.fillRect(1, 6, 3, 3);
            
            // Draw legs (colored pants)
            ctx.fillStyle = pantsColor;
            ctx.fillRect(-3, 2, 2, 6);
            ctx.fillRect(1, 2, 2, 6);
            
            // Draw body (colored shirt)
            ctx.fillStyle = shirtColor;
            ctx.fillRect(-4, -8, 8, 10);
            
            // Draw arms (skin color)
            ctx.fillStyle = skinColor;
            ctx.fillRect(-7, -6, 3, 2);
            ctx.fillRect(4, -6, 3, 2);
            
            // Draw head (skin color)
            ctx.fillStyle = skinColor;
            ctx.beginPath();
            ctx.arc(0, -12, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw hat (different for boys/girls)
            ctx.fillStyle = hatColor;
            if (isGirl) {
                // Girl: Colored hat with pom-pom
                ctx.beginPath();
                ctx.arc(0, -16, 3, 0, Math.PI * 2);
                ctx.fill();
                // Pom-pom
                ctx.beginPath();
                ctx.arc(0, -19, 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Boy: Colored hat with tail
                ctx.beginPath();
                ctx.arc(0, -16, 3, 0, Math.PI * 2);
                ctx.fill();
                // Hat tail
                ctx.fillRect(-5, -18, 5, 2);
                ctx.beginPath();
                ctx.arc(-5, -17, 1, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw goggles
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-2, -12, 1.5, 0, Math.PI * 2);
            ctx.arc(2, -12, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw ski poles
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-5, -4);
            ctx.lineTo(-8, 4);
            ctx.moveTo(5, -4);
            ctx.lineTo(8, 4);
            ctx.stroke();
            
            ctx.restore();
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
        
        // Draw finish line banner if visible
        const finishLineScreenY = finishLine.y - playerMapY + player.y;
        if (finishLineScreenY > -100 && finishLineScreenY < canvas.height + 100) {
            // Draw banner poles
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(50, finishLineScreenY - 50, 10, 150);
            ctx.fillRect(canvas.width - 60, finishLineScreenY - 50, 10, 150);
            
            // Draw banner
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(60, finishLineScreenY, canvas.width - 120, 40);
            
            // Draw banner text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('FINISH LINE', canvas.width / 2, finishLineScreenY + 28);
            ctx.textAlign = 'left';
            
            // Draw checkered pattern on banner
            ctx.fillStyle = '#000000';
            for (let x = 60; x < canvas.width - 60; x += 20) {
                for (let y = 0; y < 40; y += 20) {
                    if ((Math.floor(x / 20) + Math.floor(y / 20)) % 2 === 0) {
                        ctx.fillRect(x, finishLineScreenY + y, 10, 10);
                    }
                }
            }
        }
        
        // Draw player
        ctx.save();
        ctx.translate(player.x, player.y - player.jumpHeight);
        
        // Draw shadow on ground (gets bigger when jumping higher)
        ctx.save();
        ctx.translate(0, player.jumpHeight); // Move shadow back to ground level
        ctx.fillStyle = 'rgba(128, 128, 128, 0.4)'; // Light gray shadow
        const shadowSize = 8 + (player.jumpHeight * 0.1); // Much smaller change - only grows significantly on big jumps
        ctx.beginPath();
        ctx.ellipse(0, 0, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        if (player.crashed) {
            // Draw crashed player (fallen over)
            ctx.fillStyle = '#4169E1'; // Royal blue shirt
            ctx.fillRect(-8, -5, 16, 10); // Body lying down
            ctx.fillStyle = '#FFB6C1';
            ctx.fillRect(-6, -8, 12, 6); // Head
        } else {
            const skiAngles = [-90, -60, -30, 0, 30, 60, 90];
            const angle = skiAngles[player.skiDirection] * Math.PI / 180;
            const direction = player.skiDirection;
            
            // Draw skis first (under player) - centered on feet with curved tips
            ctx.fillStyle = '#8B4513';
            ctx.save();
            ctx.translate(0, 10); // Move to feet position
            ctx.rotate(-angle); // Negate angle to fix direction
            
            // Left ski with curved tip
            ctx.fillRect(-4, -8, 2, 16);
            ctx.beginPath();
            ctx.arc(-3, -8, 1, Math.PI, 0);
            ctx.fill();
            
            // Right ski with curved tip
            ctx.fillRect(2, -8, 2, 16);
            ctx.beginPath();
            ctx.arc(3, -8, 1, Math.PI, 0);
            ctx.fill();
            ctx.restore();
            
            // Draw ski boots (green)
            ctx.fillStyle = '#228B22';
            ctx.fillRect(-4, 8, 3, 4);  // Left boot
            ctx.fillRect(1, 8, 3, 4);   // Right boot
            
            // Draw legs (royal blue pants)
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(-3, 4, 2, 8);  // Left leg
            ctx.fillRect(1, 4, 2, 8);   // Right leg
            
            // Draw player facing the direction of movement
            if (direction <= 1) { // Facing left (-90° to -60°)
                // Draw body (royal blue shirt)
                ctx.fillStyle = '#4169E1';
                ctx.fillRect(-6, -8, 8, 12);
                
                // Draw pink arms
                ctx.fillStyle = '#FFB6C1';
                ctx.fillRect(-10, -6, 4, 2); // Left arm extended
                ctx.fillRect(-2, -5, 3, 2);  // Right arm
                
                // Draw head (profile left)
                ctx.fillStyle = '#FFB6C1';
                ctx.beginPath();
                ctx.arc(-2, -12, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw ski hat (santa style)
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(-2, -16, 3, 0, Math.PI * 2);
                ctx.fill();
                // Hat tail
                ctx.fillRect(-8, -18, 6, 2);
                ctx.beginPath();
                ctx.arc(-8, -17, 1, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw goggles (side view)
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(-4, -12, 1.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw ski poles in hands
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-8, -4);
                ctx.lineTo(-12, 6);
                ctx.moveTo(2, -3);
                ctx.lineTo(6, 6);
                ctx.stroke();
                
            } else if (direction >= 5) { // Facing right (60° to 90°)
                // Draw body (royal blue shirt)
                ctx.fillStyle = '#4169E1';
                ctx.fillRect(-2, -8, 8, 12);
                
                // Draw pink arms
                ctx.fillStyle = '#FFB6C1';
                ctx.fillRect(6, -6, 4, 2);  // Right arm extended
                ctx.fillRect(-1, -5, 3, 2); // Left arm
                
                // Draw head (profile right)
                ctx.fillStyle = '#FFB6C1';
                ctx.beginPath();
                ctx.arc(2, -12, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw ski hat (santa style)
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(2, -16, 3, 0, Math.PI * 2);
                ctx.fill();
                // Hat tail
                ctx.fillRect(2, -18, 6, 2);
                ctx.beginPath();
                ctx.arc(8, -17, 1, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw goggles (side view)
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(4, -12, 1.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw ski poles in hands
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-2, -3);
                ctx.lineTo(-6, 6);
                ctx.moveTo(8, -4);
                ctx.lineTo(12, 6);
                ctx.stroke();
                
            } else { // Facing forward/down (center directions)
                // Draw body (royal blue shirt)
                ctx.fillStyle = '#4169E1';
                ctx.fillRect(-4, -8, 8, 12);
                
                // Draw pink arms
                ctx.fillStyle = '#FFB6C1';
                ctx.fillRect(-8, -6, 4, 2); // Left arm
                ctx.fillRect(4, -6, 4, 2);  // Right arm
                
                // Draw head (front view)
                ctx.fillStyle = '#FFB6C1';
                ctx.beginPath();
                ctx.arc(0, -12, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw ski hat (santa style)
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(0, -16, 3, 0, Math.PI * 2);
                ctx.fill();
                // Hat tail (hanging to side)
                ctx.fillRect(-6, -18, 6, 2);
                ctx.beginPath();
                ctx.arc(-6, -17, 1, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw goggles (front view)
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(-2, -12, 1.5, 0, Math.PI * 2);
                ctx.arc(2, -12, 1.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw goggle strap
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, -12, 4, Math.PI * 0.8, Math.PI * 0.2);
                ctx.stroke();
                
                // Draw ski poles in hands
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-6, -4);
                ctx.lineTo(-10, 6);
                ctx.moveTo(6, -4);
                ctx.lineTo(10, 6);
                ctx.stroke();
            }
        }
        ctx.restore();
        
        // Draw yeti
        if (yeti.active) {
            // Draw yeti body (gray)
            ctx.fillStyle = '#808080';
            ctx.fillRect(yeti.x - 15, yeti.y - 20, 30, 40);
            
            // Draw yeti head
            ctx.fillStyle = '#808080';
            ctx.beginPath();
            ctx.arc(yeti.x, yeti.y - 25, 12, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw eyes (red and menacing)
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(yeti.x - 5, yeti.y - 28, 2, 0, Math.PI * 2);
            ctx.arc(yeti.x + 5, yeti.y - 28, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw sharp teeth
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            // Upper teeth
            ctx.moveTo(yeti.x - 4, yeti.y - 20);
            ctx.lineTo(yeti.x - 2, yeti.y - 16);
            ctx.lineTo(yeti.x, yeti.y - 20);
            ctx.lineTo(yeti.x + 2, yeti.y - 16);
            ctx.lineTo(yeti.x + 4, yeti.y - 20);
            ctx.fill();
            
            // Draw stick arms (bent)
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 4;
            ctx.beginPath();
            // Left arm
            ctx.moveTo(yeti.x - 15, yeti.y - 10);
            ctx.lineTo(yeti.x - 25, yeti.y - 5);
            ctx.lineTo(yeti.x - 30, yeti.y + 5);
            // Right arm
            ctx.moveTo(yeti.x + 15, yeti.y - 10);
            ctx.lineTo(yeti.x + 25, yeti.y - 5);
            ctx.lineTo(yeti.x + 30, yeti.y + 5);
            ctx.stroke();
            
            // Draw stick legs (bent)
            ctx.beginPath();
            // Left leg
            ctx.moveTo(yeti.x - 8, yeti.y + 20);
            ctx.lineTo(yeti.x - 15, yeti.y + 35);
            ctx.lineTo(yeti.x - 20, yeti.y + 45);
            // Right leg
            ctx.moveTo(yeti.x + 8, yeti.y + 20);
            ctx.lineTo(yeti.x + 15, yeti.y + 35);
            ctx.lineTo(yeti.x + 20, yeti.y + 45);
            ctx.stroke();
            
            // Draw claws on hands
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Left claws
            ctx.moveTo(yeti.x - 30, yeti.y + 5);
            ctx.lineTo(yeti.x - 33, yeti.y + 2);
            ctx.moveTo(yeti.x - 30, yeti.y + 5);
            ctx.lineTo(yeti.x - 33, yeti.y + 8);
            // Right claws
            ctx.moveTo(yeti.x + 30, yeti.y + 5);
            ctx.lineTo(yeti.x + 33, yeti.y + 2);
            ctx.moveTo(yeti.x + 30, yeti.y + 5);
            ctx.lineTo(yeti.x + 33, yeti.y + 8);
            ctx.stroke();
        }
        
        // Draw UI
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText(`Score: ${score}`, 10, 30);
        ctx.fillText(`Distance: ${Math.floor(distance)}m`, 10, 50);
        ctx.fillText(`Speed: ${Math.floor(player.speed)}`, 10, 70);
        ctx.fillText(`VX: ${player.vx.toFixed(2)}`, 10, 90);
        ctx.fillText(`VY: ${player.vy.toFixed(2)}`, 10, 110);
        ctx.fillText(`Map Y: ${Math.floor(playerMapY)}`, 10, 130);
        ctx.fillText(`Objects: ${obstacles.length + otherSkiers.length + jumps.length}`, 10, 150);
        ctx.fillText(`Crashed: ${player.crashed} Timer: ${player.crashTimer.toFixed(1)} VX: ${player.vx.toFixed(1)} VY: ${player.vy.toFixed(1)}`, 10, 170);
        
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
        
        updatePlayer();
        updateObstacles();
        updateYeti();
        
        // Update score based on distance
        score += Math.floor(player.speed);
        
        // Check win condition (reach bottom of mountain)
        if (playerMapY >= mapHeight - 100) {
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
                player.skiDirection = Math.min(6, player.skiDirection + 1);
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
