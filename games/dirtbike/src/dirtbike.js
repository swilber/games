async function createDirtbikeGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load config
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
    let raceStarted = false;
    let raceFinished = false;
    let coastingToStop = false;
    let countdown = 3;
    let countdownTimer = 0;
    let trackPosition = 0;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    const trackLength = 2000;
    const lanes = [
        { y: 213 },
        { y: 241 },
        { y: 269 },
        { y: 297 }
    ];
    
    // Pre-rendered track elements
    let trackCanvas = null;
    let trackCtx = null;
    
    function generateTrack() {
        // Create off-screen canvas for track
        trackCanvas = document.createElement('canvas');
        trackCanvas.width = trackLength + 2000; // Much more extra space for coasting
        trackCanvas.height = 400;
        trackCtx = trackCanvas.getContext('2d');
        
        // Draw sky
        trackCtx.fillStyle = '#87CEEB';
        trackCtx.fillRect(0, 0, trackCanvas.width, 120);
        
        // Draw fluffy clouds
        trackCtx.fillStyle = '#FFFFFF';
        for (let x = 0; x < trackCanvas.width; x += 200) {
            const cloudX = x + Math.random() * 100;
            const cloudY = 20 + Math.random() * 40;
            
            // Draw cloud as overlapping circles
            trackCtx.beginPath();
            trackCtx.arc(cloudX, cloudY, 15, 0, Math.PI * 2);
            trackCtx.arc(cloudX + 20, cloudY, 18, 0, Math.PI * 2);
            trackCtx.arc(cloudX + 40, cloudY, 15, 0, Math.PI * 2);
            trackCtx.arc(cloudX + 10, cloudY - 10, 12, 0, Math.PI * 2);
            trackCtx.arc(cloudX + 30, cloudY - 8, 14, 0, Math.PI * 2);
            trackCtx.fill();
        }
        
        // Draw audience stands
        trackCtx.fillStyle = '#8B4513';
        trackCtx.fillRect(0, 120, trackCanvas.width, 40);
        
        // Draw audience (simple dots)
        trackCtx.fillStyle = '#FFE4B5';
        for (let x = 0; x < trackCanvas.width; x += 15) {
            for (let y = 130; y < 150; y += 10) {
                trackCtx.beginPath();
                trackCtx.arc(x + Math.random() * 10, y, 2, 0, Math.PI * 2);
                trackCtx.fill();
            }
        }
        
        // Draw top grass
        trackCtx.fillStyle = '#228B22';
        trackCtx.fillRect(0, 160, trackCanvas.width, 44);
        
        // Draw dirt track (starts at first lane)
        trackCtx.fillStyle = '#8B4513';
        trackCtx.fillRect(0, 204, trackCanvas.width, 112);
        
        // Draw bottom grass
        trackCtx.fillStyle = '#228B22';
        trackCtx.fillRect(0, 316, trackCanvas.width, 84);
        
        // Draw lane dividers (moved up 5px)
        trackCtx.strokeStyle = '#FFFFFF';
        trackCtx.lineWidth = 2;
        trackCtx.setLineDash([10, 10]);
        for (let i = 1; i < 4; i++) {
            const y = 213 + (i * 28); // 241, 269, 297
            trackCtx.beginPath();
            trackCtx.moveTo(0, y);
            trackCtx.lineTo(trackCanvas.width, y);
            trackCtx.stroke();
        }
        trackCtx.setLineDash([]);
        
        // Draw starting line at position 400 (where bikes actually start on screen)
        trackCtx.strokeStyle = '#FFFFFF';
        trackCtx.lineWidth = 3;
        trackCtx.beginPath();
        trackCtx.moveTo(400, 204);
        trackCtx.lineTo(400, 316);
        trackCtx.stroke();
        
        // Draw finish line at actual finish position
        trackCtx.strokeStyle = '#000000';
        trackCtx.lineWidth = 3;
        trackCtx.beginPath();
        trackCtx.moveTo(trackLength + 400, 204);
        trackCtx.lineTo(trackLength + 400, 316);
        trackCtx.stroke();
        
        // Checkered pattern for finish line
        trackCtx.fillStyle = '#FFFFFF';
        for (let y = 204; y < 316; y += 10) {
            for (let x = 0; x < 10; x += 5) {
                if ((Math.floor(y/5) + Math.floor(x/5)) % 2 === 0) {
                    trackCtx.fillRect(trackLength + 400 + x - 5, y, 5, 5);
                }
            }
        }
    }
    
    // Player bike
    const player = {
        lane: 2,
        targetLane: 2,
        laneTransition: 0,
        position: 0,
        speed: 0,
        maxSpeed: 12,
        heat: 0,
        maxHeat: 100,
        throttle: false,
        jumping: false,
        jumpHeight: 0,
        jumpVelocity: 0,
        rotation: 0,
        rotateForward: false
    };
    
    // AI opponents
    const opponents = [];
    for (let i = 0; i < 3; i++) {
        opponents.push({
            lane: i === 0 ? 0 : i === 1 ? 1 : 3, // Lanes 0, 1, 3 (player in lane 2)
            position: 0,
            speed: 3 + Math.random() * 2,
            color: `hsl(${i * 120}, 70%, 50%)`
        });
    }
    
    function update() {
        if (!gameRunning) return;
        
        if (!raceStarted) {
            // Countdown phase
            countdownTimer += 1/60;
            if (countdownTimer >= 1) {
                countdownTimer = 0;
                countdown--;
                if (countdown <= 0) {
                    raceStarted = true;
                }
            }
            return;
        }
        
        // Race phase
        updatePlayer();
        updateOpponents();
        
        // Check finish line crossing
        if (!raceFinished && player.position >= trackLength) {
            raceFinished = true;
            coastingToStop = true;
            player.throttle = false; // Stop acceleration
        }
        
        // Check if coasting is complete (bike has stopped)
        if (coastingToStop && player.speed < 0.1) {
            gameWon = true;
            gameRunning = false;
            if (callbacks?.onGameComplete) {
                callbacks.onGameComplete('dirtbike', { 
                    completed: true,
                    position: getPlayerPosition()
                });
            }
        }
    }
    
    function updatePlayer() {
        // Lane switching
        if (player.lane !== player.targetLane) {
            player.laneTransition += 0.12;
            if (player.laneTransition >= 1) {
                player.lane = player.targetLane;
                player.laneTransition = 0;
            }
        }
        
        // Heat and speed
        if (player.throttle) {
            player.heat += 0.3;
            if (player.heat >= player.maxHeat) {
                player.heat = player.maxHeat;
                player.speed *= 0.98; // Overheating
            } else {
                player.speed += 0.15;
            }
        } else {
            player.heat = Math.max(0, player.heat - 1.5);
        }
        
        player.speed *= 0.98; // Natural deceleration
        player.speed = Math.max(0, Math.min(player.maxSpeed, player.speed));
        player.position += player.speed;
        
        // Jumping physics
        if (player.jumping) {
            player.jumpVelocity -= 0.8; // Gravity
            player.jumpHeight += player.jumpVelocity;
            
            // Rotation while jumping
            if (player.rotateForward) {
                player.rotation += 0.05; // Slower forward rotation
            } else {
                player.rotation -= 0.05; // Slower backward rotation
            }
            
            if (player.jumpHeight <= 0) {
                player.jumpHeight = 0;
                player.jumping = false;
                player.jumpVelocity = 0;
                
                // Check landing angle for crash
                const normalizedRotation = Math.abs(player.rotation % (Math.PI * 2));
                if (normalizedRotation > 0.5 && normalizedRotation < Math.PI * 2 - 0.5) {
                    // Bad landing - reset to start
                    player.position = Math.max(0, player.position - 100);
                    player.speed = 0;
                }
                
                // Reset rotation on landing
                player.rotation = 0;
            }
        }
        
        // Update camera
        trackPosition = player.position;
    }
    
    function updateOpponents() {
        for (let opponent of opponents) {
            // Simple AI
            opponent.speed += (Math.random() - 0.5) * 0.1;
            opponent.speed = Math.max(2, Math.min(8, opponent.speed));
            opponent.position += opponent.speed;
            
            // Occasional lane changes
            if (Math.random() < 0.002) {
                opponent.lane = Math.max(0, Math.min(3, opponent.lane + (Math.random() < 0.5 ? -1 : 1)));
            }
        }
    }
    
    function getPlayerPosition() {
        let position = 1;
        for (let opponent of opponents) {
            if (opponent.position > player.position) {
                position++;
            }
        }
        return position;
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw pre-rendered track
        if (trackCanvas) {
            const sourceX = trackPosition; // Direct position mapping
            ctx.drawImage(trackCanvas, sourceX, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        }
        
        // Render bikes
        renderOpponents();
        renderPlayer();
        
        // UI
        renderUI();
    }
    
    function renderPlayer() {
        const currentY = lanes[player.lane].y + 
                        (player.laneTransition * (lanes[player.targetLane].y - lanes[player.lane].y)) - player.jumpHeight;
        const bikeX = 400; // Player always in center of screen
        
        // Save context for rotation
        ctx.save();
        ctx.translate(bikeX, currentY);
        ctx.rotate(player.rotation);
        
        // Player bike
        ctx.fillStyle = '#0066FF';
        ctx.fillRect(-8, -6, 16, 12);
        
        // Wheels
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-5, 8, 3, 0, Math.PI * 2);
        ctx.arc(5, 8, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Rider
        ctx.fillStyle = '#FFE4B5';
        ctx.fillRect(-3, -12, 6, 8);
        
        ctx.restore();
    }
    
    function renderOpponents() {
        for (let opponent of opponents) {
            const screenX = opponent.position - trackPosition + 400;
            
            if (screenX > -50 && screenX < canvas.width + 50) {
                const laneY = lanes[opponent.lane].y;
                
                // Opponent bike
                ctx.fillStyle = opponent.color;
                ctx.fillRect(screenX - 8, laneY - 6, 16, 12);
                
                // Wheels
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(screenX - 5, laneY + 8, 3, 0, Math.PI * 2);
                ctx.arc(screenX + 5, laneY + 8, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Rider
                ctx.fillStyle = '#FFE4B5';
                ctx.fillRect(screenX - 3, laneY - 12, 6, 8);
            }
        }
    }
    
    function renderUI() {
        // Speed and heat
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
        
        // Position and distance
        ctx.fillText(`Position: ${getPlayerPosition()}/4`, 10, 85);
        ctx.fillText(`Distance: ${Math.floor(player.position)}m`, 10, 105);
        
        // Countdown
        if (!raceStarted) {
            ctx.fillStyle = '#FF0000';
            ctx.font = '48px Arial';
            const text = countdown > 0 ? countdown.toString() : 'GO!';
            const textWidth = ctx.measureText(text).width;
            ctx.fillText(text, (canvas.width - textWidth) / 2, canvas.height / 2);
        }
        
        // Instructions at bottom
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.fillText('↑/↓: Change Lanes    SPACE: Throttle    SHIFT: Jump    →: Rotate Forward', 10, 390);
        
        // Race finished message
        if (raceFinished && coastingToStop) {
            ctx.fillStyle = '#00FF00';
            ctx.font = '32px Arial';
            const text = 'You Won!';
            const textWidth = ctx.measureText(text).width;
            ctx.fillText(text, (canvas.width - textWidth) / 2, 100);
        }
        
        // Final win message
        if (gameWon) {
            ctx.fillStyle = '#00FF00';
            ctx.font = '32px Arial';
            const position = getPlayerPosition();
            const text = position === 1 ? 'YOU WIN!' : `${position}${position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} Place`;
            const textWidth = ctx.measureText(text).width;
            ctx.fillText(text, (canvas.width - textWidth) / 2, canvas.height / 2);
        }
    }
    
    function handleKeyDown(e) {
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
        if (!gameKeys.includes(e.code)) return;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks?.onGameStart) {
                callbacks.onGameStart('dirtbike');
            }
        }
        
        if (!gameRunning || !raceStarted || coastingToStop) return;
        
        switch(e.code) {
            case 'ArrowUp':
                if (player.targetLane > 0) {
                    player.targetLane--;
                    player.laneTransition = 0;
                }
                break;
            case 'ArrowDown':
                if (player.targetLane < 3) {
                    player.targetLane++;
                    player.laneTransition = 0;
                }
                break;
            case 'ArrowLeft':
                if (player.jumping) {
                    player.rotateForward = false; // Default backward rotation
                }
                break;
            case 'ArrowRight':
                if (player.jumping) {
                    player.rotateForward = true; // Forward rotation
                }
                break;
            case 'Space':
                player.throttle = true; // Throttle only
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                if (!player.jumping) {
                    // Jump
                    player.jumping = true;
                    player.jumpVelocity = 12;
                }
                break;
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        switch(e.code) {
            case 'Space':
                player.throttle = false; // Only throttle control
                break;
            case 'ArrowRight':
                if (player.jumping) {
                    player.rotateForward = false; // Stop forward rotation
                }
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
