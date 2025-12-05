async function createDirtbikeGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Dirtbike configuration
    let dirtbikeConfig = {};
    if (typeof configManager !== 'undefined') {
        dirtbikeConfig = await configManager.loadConfig('dirtbike');
    } else {
        dirtbikeConfig = { gameplay: settings, physics: settings, visual: settings };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameWon = false;
    let gameStarted = false;
    let gameTime = 0;
    let trackPosition = 0;
    let raceMode = 'qualify'; // 'qualify' or 'race'
    let qualifyTime = 60; // seconds to qualify
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // Player bike
    const player = {
        lane: 2,
        targetLane: 2,
        laneTransition: 0,
        speed: 0,
        maxSpeed: 12,
        heat: 0,
        maxHeat: 100,
        throttle: false,
        jumping: false,
        jumpHeight: 0,
        jumpVelocity: 0,
        crashed: false,
        crashTimer: 0,
        wheelie: false,
        wheelieTimer: 0
    };
    
    // AI riders
    const aiRiders = [];
    for (let i = 0; i < 6; i++) {
        aiRiders.push({
            lane: Math.floor(Math.random() * 4),
            position: Math.random() * 200 - 100,
            speed: 3 + Math.random() * 4,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
    }
    
    const trackLength = 2000;
    const lanes = [
        { y: 140, obstacles: [] },
        { y: 200, obstacles: [] },
        { y: 260, obstacles: [] },
        { y: 320, obstacles: [] }
    ];
    
    // Generate track
    function generateTrack() {
        for (let laneIndex = 0; laneIndex < 4; laneIndex++) {
            const lane = lanes[laneIndex];
            
            for (let pos = 300; pos < trackLength; pos += 100 + Math.random() * 150) {
                const obstacleType = Math.random();
                
                if (obstacleType < 0.5) {
                    // Ramp
                    const size = Math.random();
                    lane.obstacles.push({
                        x: pos,
                        type: 'ramp',
                        width: size < 0.3 ? 40 : size < 0.7 ? 60 : 80,
                        height: size < 0.3 ? 15 : size < 0.7 ? 25 : 35
                    });
                } else if (obstacleType < 0.8) {
                    // Mud puddle
                    lane.obstacles.push({
                        x: pos,
                        type: 'mud',
                        width: 30 + Math.random() * 20,
                        height: 8
                    });
                }
            }
        }
    }
    
    function update() {
        if (!gameRunning) return;
        
        gameTime += 1/60;
        
        // Update player
        updatePlayer();
        
        // Update AI riders
        updateAI();
        
        // Check win/lose conditions
        if (raceMode === 'qualify') {
            if (trackPosition >= trackLength) {
                gameWon = true;
                gameRunning = false;
                if (callbacks?.onGameComplete) {
                    setTimeout(() => callbacks.onGameComplete('dirtbike', { 
                        completed: true, 
                        time: gameTime.toFixed(1),
                        mode: 'qualify'
                    }), 1000);
                }
            } else if (gameTime > qualifyTime) {
                gameRunning = false;
                if (callbacks?.onGameComplete) {
                    setTimeout(() => callbacks.onGameComplete('dirtbike', { 
                        completed: false, 
                        timeout: true 
                    }), 1000);
                }
            }
        }
    }
    
    function updatePlayer() {
        // Lane switching
        if (player.lane !== player.targetLane && !player.crashed) {
            player.laneTransition += 0.12;
            if (player.laneTransition >= 1) {
                player.lane = player.targetLane;
                player.laneTransition = 0;
            }
        }
        
        // Crash recovery
        if (player.crashed) {
            player.crashTimer -= 1/60;
            if (player.crashTimer <= 0) {
                player.crashed = false;
                player.speed = 0;
                player.heat = 0;
            }
            return;
        }
        
        // Heat management
        if (player.throttle && !player.jumping) {
            player.heat += 0.3; // Much slower heat buildup
            if (player.heat >= player.maxHeat) {
                player.heat = player.maxHeat;
                player.speed *= 0.98; // Less severe overheating penalty
            } else {
                player.speed += 0.15;
            }
        } else {
            player.heat = Math.max(0, player.heat - 1.5); // Faster cooling
        }
        
        // Natural deceleration
        player.speed *= 0.98;
        player.speed = Math.max(0, Math.min(player.maxSpeed, player.speed));
        
        // Movement
        if (!player.crashed) {
            trackPosition += player.speed;
        }
        
        // Jumping physics
        if (player.jumping) {
            player.jumpVelocity -= 1.2;
            player.jumpHeight += player.jumpVelocity;
            
            if (player.jumpHeight <= 0) {
                player.jumpHeight = 0;
                player.jumping = false;
                player.jumpVelocity = 0;
                
                // Landing check - crash if going too fast with bad angle
                if (player.speed > 8 && Math.random() < 0.3) {
                    crash();
                }
            }
        }
        
        // Wheelie
        if (player.wheelie && !player.jumping) {
            player.wheelieTimer += 1/60;
        } else {
            player.wheelie = false;
            player.wheelieTimer = 0;
        }
        
        // Obstacle collision
        checkObstacleCollision();
        
        // AI rider collision
        checkAICollision();
    }
    
    function updateAI() {
        for (let ai of aiRiders) {
            // Simple AI movement
            ai.position += ai.speed;
            
            // Occasional lane changes
            if (Math.random() < 0.002) {
                ai.lane = Math.max(0, Math.min(3, ai.lane + (Math.random() < 0.5 ? -1 : 1)));
            }
            
            // Speed variation
            ai.speed += (Math.random() - 0.5) * 0.1;
            ai.speed = Math.max(2, Math.min(8, ai.speed));
        }
    }
    
    function checkObstacleCollision() {
        const currentLane = lanes[player.lane];
        for (let obstacle of currentLane.obstacles) {
            const obstacleScreenX = obstacle.x - trackPosition;
            
            if (obstacleScreenX > -20 && obstacleScreenX < 20 && !player.jumping) {
                if (obstacle.type === 'ramp') {
                    // Launch off ramp
                    player.jumping = true;
                    player.jumpVelocity = 8 + (player.speed * 0.5);
                    player.speed += 1; // Speed boost
                } else if (obstacle.type === 'mud') {
                    // Slow down in mud
                    player.speed *= 0.8; // Less severe slowdown
                    player.heat += 3; // Less heat penalty
                }
            }
        }
    }
    
    function checkAICollision() {
        if (player.jumping || player.crashed) return;
        
        for (let ai of aiRiders) {
            const aiScreenX = ai.position - trackPosition;
            if (Math.abs(aiScreenX) < 25 && ai.lane === player.lane) {
                crash();
                break;
            }
        }
    }
    
    function crash() {
        player.crashed = true;
        player.crashTimer = 2; // 2 seconds to recover
        player.speed = 0;
        player.jumping = false;
        player.jumpHeight = 0;
        
        // Move AI riders ahead
        for (let ai of aiRiders) {
            if (ai.position < trackPosition + 100) {
                ai.position = trackPosition + 100 + Math.random() * 50;
            }
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Sky
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, 120);
        
        // Ground
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 120, canvas.width, 280);
        
        // Lane dividers
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 15]);
        for (let i = 1; i < 4; i++) {
            const y = 140 + (i * 60);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // Track obstacles
        renderObstacles();
        
        // AI riders
        renderAI();
        
        // Player bike
        renderPlayer();
        
        // UI
        renderUI();
    }
    
    function renderObstacles() {
        for (let laneIndex = 0; laneIndex < 4; laneIndex++) {
            const lane = lanes[laneIndex];
            
            for (let obstacle of lane.obstacles) {
                const screenX = obstacle.x - trackPosition + 400;
                
                if (screenX > -100 && screenX < canvas.width + 100) {
                    const laneY = lane.y;
                    
                    if (obstacle.type === 'ramp') {
                        // 3D ramp with proper perspective
                        const rampBase = screenX;
                        const rampTop = screenX + obstacle.width;
                        const rampHeight = obstacle.height;
                        
                        // Main ramp face (light brown)
                        ctx.fillStyle = '#A0522D';
                        ctx.beginPath();
                        ctx.moveTo(rampBase, laneY + 20); // Bottom left
                        ctx.lineTo(rampTop, laneY + 20); // Bottom right  
                        ctx.lineTo(rampTop - 10, laneY - rampHeight + 15); // Top right (perspective)
                        ctx.lineTo(rampBase + 5, laneY - rampHeight + 20); // Top left (perspective)
                        ctx.closePath();
                        ctx.fill();
                        
                        // Right side (darker for 3D effect)
                        ctx.fillStyle = '#654321';
                        ctx.beginPath();
                        ctx.moveTo(rampTop, laneY + 20); // Bottom right
                        ctx.lineTo(rampTop + 8, laneY + 15); // Bottom right depth
                        ctx.lineTo(rampTop - 2, laneY - rampHeight + 10); // Top right depth
                        ctx.lineTo(rampTop - 10, laneY - rampHeight + 15); // Top right
                        ctx.closePath();
                        ctx.fill();
                        
                        // Top surface (lightest)
                        ctx.fillStyle = '#D2B48C';
                        ctx.beginPath();
                        ctx.moveTo(rampBase + 5, laneY - rampHeight + 20); // Top left
                        ctx.lineTo(rampTop - 10, laneY - rampHeight + 15); // Top right
                        ctx.lineTo(rampTop - 2, laneY - rampHeight + 10); // Top right depth
                        ctx.lineTo(rampBase + 13, laneY - rampHeight + 15); // Top left depth
                        ctx.closePath();
                        ctx.fill();
                        
                        // Ramp outline for definition
                        ctx.strokeStyle = '#8B4513';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(rampBase, laneY + 20);
                        ctx.lineTo(rampTop, laneY + 20);
                        ctx.lineTo(rampTop - 10, laneY - rampHeight + 15);
                        ctx.lineTo(rampBase + 5, laneY - rampHeight + 20);
                        ctx.closePath();
                        ctx.stroke();
                        
                    } else if (obstacle.type === 'mud') {
                        ctx.fillStyle = '#4A4A4A';
                        ctx.fillRect(screenX, laneY + 15, obstacle.width, obstacle.height);
                        
                        // Mud texture
                        ctx.fillStyle = '#3A3A3A';
                        for (let i = 0; i < 3; i++) {
                            ctx.fillRect(screenX + i * 8, laneY + 17, 4, 4);
                        }
                    }
                }
            }
        }
    }
    
    function renderAI() {
        for (let ai of aiRiders) {
            const screenX = ai.position - trackPosition + 400;
            
            if (screenX > -50 && screenX < canvas.width + 50) {
                const laneY = lanes[ai.lane].y;
                
                // AI bike body
                ctx.fillStyle = ai.color;
                ctx.fillRect(screenX - 8, laneY - 5, 16, 12);
                
                // AI wheels
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(screenX - 5, laneY + 8, 3, 0, Math.PI * 2);
                ctx.arc(screenX + 5, laneY + 8, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // AI rider
                ctx.fillStyle = '#FFE4B5';
                ctx.fillRect(screenX - 3, laneY - 8, 6, 6);
            }
        }
    }
    
    function renderPlayer() {
        const currentY = lanes[player.lane].y + 
                        (player.laneTransition * (lanes[player.targetLane].y - lanes[player.lane].y));
        const bikeY = currentY - player.jumpHeight;
        
        if (player.crashed) {
            // Crashed bike
            ctx.fillStyle = '#666666';
            ctx.save();
            ctx.translate(400, bikeY);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-8, -6, 16, 12);
            ctx.restore();
        } else {
            // Normal bike
            ctx.fillStyle = '#0066FF';
            if (player.wheelie) {
                ctx.save();
                ctx.translate(400, bikeY);
                ctx.rotate(-0.3);
                ctx.fillRect(-8, -6, 16, 12);
                ctx.restore();
            } else {
                ctx.fillRect(392, bikeY - 6, 16, 12);
            }
            
            // Wheels
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            if (player.wheelie) {
                ctx.arc(395, bikeY + 8, 3, 0, Math.PI * 2);
                ctx.arc(405, bikeY + 5, 3, 0, Math.PI * 2);
            } else {
                ctx.arc(395, bikeY + 8, 3, 0, Math.PI * 2);
                ctx.arc(405, bikeY + 8, 3, 0, Math.PI * 2);
            }
            ctx.fill();
            
            // Player rider
            ctx.fillStyle = '#FFE4B5';
            ctx.fillRect(397, bikeY - 12, 6, 8);
        }
    }
    
    function renderUI() {
        // Speed gauge
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText(`Speed: ${Math.floor(player.speed * 10)}`, 10, 25);
        
        // Heat gauge
        const heatPercent = player.heat / player.maxHeat;
        ctx.fillStyle = '#333333';
        ctx.fillRect(10, 35, 100, 15);
        ctx.fillStyle = heatPercent > 0.8 ? '#FF0000' : heatPercent > 0.6 ? '#FFAA00' : '#00FF00';
        ctx.fillRect(10, 35, 100 * heatPercent, 15);
        ctx.fillStyle = '#000000';
        ctx.fillText('Heat', 10, 65);
        
        // Time and distance
        ctx.fillText(`Time: ${gameTime.toFixed(1)}s`, 10, 85);
        ctx.fillText(`Distance: ${Math.floor(trackPosition)}m`, 10, 105);
        
        if (raceMode === 'qualify') {
            const timeLeft = Math.max(0, qualifyTime - gameTime);
            ctx.fillStyle = timeLeft < 10 ? '#FF0000' : '#000000';
            ctx.fillText(`Qualify Time: ${timeLeft.toFixed(1)}s`, 200, 25);
        }
        
        // Lane indicator
        ctx.fillText(`Lane: ${player.lane + 1}`, 200, 45);
        
        // Instructions
        if (!gameStarted) {
            ctx.fillStyle = '#000000';
            ctx.font = '18px Arial';
            ctx.fillText('Up/Down: Change lanes, Space: Throttle, Shift: Wheelie', 150, 380);
        }
        
        // Status messages
        if (player.crashed) {
            ctx.fillStyle = '#FF0000';
            ctx.font = '24px Arial';
            ctx.fillText('CRASHED!', 350, 200);
        }
        
        if (gameWon) {
            ctx.fillStyle = '#00FF00';
            ctx.font = '32px Arial';
            ctx.fillText('QUALIFIED!', 300, 200);
        }
        
        if (player.wheelieTimer > 1) {
            ctx.fillStyle = '#FFAA00';
            ctx.font = '20px Arial';
            ctx.fillText(`Wheelie! +${Math.floor(player.wheelieTimer)}pts`, 250, 100);
        }
    }
    
    function handleKeyDown(e) {
        const gameKeys = ['ArrowUp', 'ArrowDown', 'Space', 'ShiftLeft', 'ShiftRight'];
        if (!gameKeys.includes(e.code)) return;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks?.onGameStart) {
                callbacks.onGameStart('dirtbike');
            }
        }
        
        if (!gameRunning) return;
        
        switch(e.code) {
            case 'ArrowUp':
                if (player.targetLane > 0 && !player.crashed) {
                    player.targetLane--;
                    player.laneTransition = 0;
                }
                break;
            case 'ArrowDown':
                if (player.targetLane < 3 && !player.crashed) {
                    player.targetLane++;
                    player.laneTransition = 0;
                }
                break;
            case 'Space':
                player.throttle = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                if (!player.jumping && !player.crashed) {
                    player.wheelie = true;
                }
                break;
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        switch(e.code) {
            case 'Space':
                player.throttle = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                player.wheelie = false;
                break;
        }
    }
    
    // Event handlers
    const keyDownHandler = handleKeyDown;
    const keyUpHandler = handleKeyUp;
    
    // Initialize
    generateTrack();
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    gameArea.appendChild(canvas);
    
    // Start game loop
    gameRunning = true;
    gameInterval = setInterval(() => {
        update();
        render();
    }, 16);
    
    render();
    
    // Cleanup function
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
