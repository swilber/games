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
    let lapDisplayTimer = 0;
    let showLapDisplay = false;
    let displayedLap = 1;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    const trackLength = 2000;
    const lapsRequired = 3;
    const totalTrackLength = trackLength * lapsRequired;
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
        
        // Draw finish line at end of 3rd lap
        trackCtx.strokeStyle = '#000000';
        trackCtx.lineWidth = 3;
        trackCtx.beginPath();
        trackCtx.moveTo(totalTrackLength + 400, 204);
        trackCtx.lineTo(totalTrackLength + 400, 316);
        trackCtx.stroke();
        
        // Checkered pattern for finish line
        trackCtx.fillStyle = '#FFFFFF';
        for (let y = 204; y < 316; y += 10) {
            for (let x = 0; x < 10; x += 5) {
                if ((Math.floor(y/5) + Math.floor(x/5)) % 2 === 0) {
                    trackCtx.fillRect(totalTrackLength + 400 + x - 5, y, 5, 5);
                }
            }
        }
        
        // Draw lap markers at end of each lap
        for (let lap = 1; lap < lapsRequired; lap++) {
            const lapPosition = lap * trackLength + 400;
            trackCtx.strokeStyle = '#FFFF00';
            trackCtx.lineWidth = 2;
            trackCtx.beginPath();
            trackCtx.moveTo(lapPosition, 204);
            trackCtx.lineTo(lapPosition, 316);
            trackCtx.stroke();
        }
        
        // Draw oil slicks
        generateOilSlicks();
        trackCtx.fillStyle = '#4A2C17';
        for (let slick of oilSlicks) {
            const slickY = lanes[slick.lane].y;
            const centerX = slick.x + 400 + slick.width / 2;
            const centerY = slickY + slick.height / 2;
            trackCtx.beginPath();
            trackCtx.ellipse(centerX, centerY, slick.width / 2, slick.height / 2, 0, 0, Math.PI * 2);
            trackCtx.fill();
        }
        
        // Draw terrain features
        generateTerrain();
        
        // Find ramp sections and draw as proper 3D shapes
        let rampStart = -1;
        let rampEnd = -1;
        
        for (let i = 0; i < terrain.length; i++) {
            if (terrain[i] > 0 && rampStart === -1) {
                rampStart = i; // Start of ramp
            }
            if (terrain[i] === 0 && rampStart !== -1) {
                rampEnd = i - 1; // End of ramp
                
                // Draw complete ramp
                const startX = rampStart * 2 + 400;
                const endX = rampEnd * 2 + 400;
                const rampWidth = endX - startX;
                const maxHeight = Math.max(...terrain.slice(rampStart, rampEnd + 1));
                
                const jumpTop = 204;
                const jumpBottom = 316;
                
                // Main face (darker brown) - left slope
                trackCtx.fillStyle = '#A0522D';
                trackCtx.beginPath();
                trackCtx.moveTo(startX, jumpBottom);
                trackCtx.lineTo(startX + rampWidth / 2, jumpBottom - maxHeight);
                trackCtx.lineTo(startX + rampWidth / 2, jumpTop - maxHeight);
                trackCtx.lineTo(startX, jumpTop);
                trackCtx.closePath();
                trackCtx.fill();
                
                // Right face (light brown) - right slope
                trackCtx.fillStyle = '#D2B48C';
                trackCtx.beginPath();
                trackCtx.moveTo(startX + rampWidth / 2, jumpBottom - maxHeight);
                trackCtx.lineTo(endX, jumpBottom);
                trackCtx.lineTo(endX, jumpTop);
                trackCtx.lineTo(startX + rampWidth / 2, jumpTop - maxHeight);
                trackCtx.closePath();
                trackCtx.fill();
                
                // Bottom face (lightest brown)
                trackCtx.fillStyle = '#F4E4BC';
                trackCtx.beginPath();
                trackCtx.moveTo(startX, jumpBottom);
                trackCtx.lineTo(startX + rampWidth / 2, jumpBottom - maxHeight);
                trackCtx.lineTo(endX, jumpBottom);
                trackCtx.closePath();
                trackCtx.fill();
                
                // Outline
                trackCtx.strokeStyle = '#8B4513';
                trackCtx.lineWidth = 2;
                trackCtx.stroke();
                
                rampStart = -1; // Reset for next ramp
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
        rotateForward: false,
        crashed: false,
        crashTimer: 0,
        riderX: 0,
        riderY: 0,
        bikeRotation: 0,
        walkingBack: false,
        currentLap: 1,
        onOilSlick: false,
        jumpCooldown: 0
    };
    
    // AI opponents
    const opponents = [];
    const opponentColors = ['#FF0000', '#00FF00', '#FFFF00']; // Red, Green, Yellow
    for (let i = 0; i < 3; i++) {
        opponents.push({
            lane: i === 0 ? 0 : i === 1 ? 1 : 3, // Lanes 0, 1, 3 (player in lane 2)
            position: 0,
            speed: 3 + Math.random() * 2,
            color: opponentColors[i],
            crashed: false,
            crashTimer: 0,
            riderX: 0,
            riderY: 0,
            bikeRotation: 0,
            walkingBack: false
        });
    }
    
    // Oil slicks
    const oilSlicks = [];
    
    // Unified terrain system
    const terrain = [];
    
    // Generate unified terrain with all features
    function generateTerrain() {
        terrain.length = 0;
        const resolution = 2; // pixels per terrain point
        const trackPoints = Math.floor(trackLength / resolution);
        
        // Initialize flat terrain
        for (let i = 0; i < trackPoints; i++) {
            terrain.push(0);
        }
        
        // Add ramps/hills directly to terrain
        const rampCount = 1;
        for (let r = 0; r < rampCount; r++) {
            const rampStart = Math.floor(trackPoints * 0.3 + Math.random() * trackPoints * 0.4);
            const rampWidth = Math.floor(100 / resolution); // 100px wide ramp
            const rampHeight = 35;
            
            for (let i = 0; i < rampWidth && rampStart + i < trackPoints; i++) {
                const progress = i / (rampWidth - 1);
                const height = progress <= 0.5 ? 
                    rampHeight * (progress * 2) : 
                    rampHeight * (2 - progress * 2);
                terrain[rampStart + i] = height;
            }
        }
    }
    
    // Get terrain height at any position
    function getTerrainHeight(position) {
        const lapPosition = position % trackLength;
        const index = Math.floor(lapPosition / 2); // 2 pixel resolution
        if (index >= 0 && index < terrain.length) {
            return terrain[index];
        }
        return 0;
    }
    
    // Generate oil slicks
    function generateOilSlicks() {
        oilSlicks.length = 0;
        const slicksPerLap = 2;
        for (let lap = 0; lap < lapsRequired; lap++) {
            for (let i = 0; i < slicksPerLap; i++) {
                oilSlicks.push({
                    x: lap * trackLength + 500 + Math.random() * (trackLength - 1000),
                    lane: Math.floor(Math.random() * 4),
                    width: 40,
                    height: 20
                });
            }
        }
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
        
        // Update lap display timer
        if (showLapDisplay) {
            lapDisplayTimer -= 1/60;
            if (lapDisplayTimer <= 0) {
                showLapDisplay = false;
            }
        }
        
        // Update current lap and detect crossing
        const newLap = Math.floor(player.position / trackLength) + 1;
        if (newLap > player.currentLap && newLap <= lapsRequired) {
            // Crossed into new lap
            showLapDisplay = true;
            lapDisplayTimer = 3; // 3 seconds
            displayedLap = newLap;
        }
        player.currentLap = newLap;
        
        // Check finish line crossing (only after completing all laps)
        if (!raceFinished && player.position >= totalTrackLength) {
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
        // Handle crash animation
        if (player.crashed) {
            player.crashTimer += 1/60;
            
            if (player.crashTimer < 2) {
                // Falling phase - rider falls, bike spins
                player.riderY += 8; // Gravity on rider
                player.bikeRotation += 0.3; // Bike spinning
                
                if (player.riderY > 0) player.riderY = 0; // Hit ground
            } else if (player.crashTimer < 4) {
                // Walking back phase
                player.walkingBack = true;
                player.riderX -= 15; // Walk back to bike
                
                if (player.riderX <= 0) {
                    // Reached bike - crash recovery complete
                    player.crashed = false;
                    player.walkingBack = false;
                    player.riderX = 0;
                    player.riderY = 0;
                    player.bikeRotation = 0;
                    player.rotation = 0;
                }
            }
            return; // Skip normal movement during crash
        }
        
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
            player.heat += 0.15;
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
        
        // Update jump cooldown
        if (player.jumpCooldown > 0) {
            player.jumpCooldown--;
        }
        
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
                
                // Check landing angle for crash (improved)
                const normalizedRotation = ((player.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const isUpsideDown = normalizedRotation > Math.PI / 3 && normalizedRotation < Math.PI * 5 / 3;
                const isSideways = (normalizedRotation > Math.PI / 6 && normalizedRotation < Math.PI / 3) || 
                                 (normalizedRotation > Math.PI * 5 / 3 && normalizedRotation < Math.PI * 11 / 6);
                
                if (isUpsideDown || (isSideways && player.speed > 5)) {
                    crashPlayer("bad_landing");
                } else {
                    // Safe landing - reset rotation
                    player.rotation = 0;
                }
            }
        }
        
        // Check collisions with opponents
        checkOpponentCollisions();
        
        // Check oil slick collisions
        checkOilSlickCollisions();
        
        // Update terrain following
        updateTerrainFollowing();
        
        // Update camera (repeat track visually)
        trackPosition = player.position % trackLength;
    }
    
    function updateOpponents() {
        for (let opponent of opponents) {
            // Handle crash animation
            if (opponent.crashed) {
                opponent.crashTimer += 1/60;
                
                if (opponent.crashTimer < 2) {
                    // Falling phase - rider falls, bike spins
                    opponent.riderY += 8; // Gravity on rider
                    opponent.bikeRotation += 0.3; // Bike spinning
                    
                    if (opponent.riderY > 0) opponent.riderY = 0; // Hit ground
                } else if (opponent.crashTimer < 4) {
                    // Walking back phase
                    opponent.walkingBack = true;
                    opponent.riderX -= 15; // Walk back to bike
                    
                    if (opponent.riderX <= 0) {
                        // Reached bike - crash recovery complete
                        opponent.crashed = false;
                        opponent.walkingBack = false;
                        opponent.riderX = 0;
                        opponent.riderY = 0;
                        opponent.bikeRotation = 0;
                    }
                }
                continue; // Skip normal movement during crash
            }
            
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
    
    function checkOpponentCollisions() {
        if (player.jumping) return; // No collision while jumping
        
        for (let i = 0; i < opponents.length; i++) {
            const opponent = opponents[i];
            // Check if opponent is in same lane and close position
            if (opponent.lane === player.lane) {
                const distance = Math.abs(opponent.position - player.position);
                if (distance < 30) { // Collision threshold
                    // Determine who crashes based on position
                    if (player.position > opponent.position) {
                        // Player is ahead - opponent crashes into player's back
                        crashOpponent(i);
                    } else {
                        // Player is behind - player crashes into opponent
                        crashPlayer("collision");
                    }
                    return;
                }
            }
        }
    }
    
    function crashOpponent(opponentIndex) {
        const opponent = opponents[opponentIndex];
        opponent.crashed = true;
        opponent.crashTimer = 0;
        opponent.speed = 0;
        opponent.riderX = 0;
        opponent.riderY = 0;
        opponent.bikeRotation = Math.random() * Math.PI * 2;
        opponent.walkingBack = false;
    }
    
    function checkOilSlickCollisions() {
        if (player.jumping) return; // No collision while jumping
        
        for (let slick of oilSlicks) {
            // Only check current lane - don't include transition target
            if (slick.lane === player.lane) {
                const playerTrackPos = player.position % trackLength;
                const slickTrackPos = slick.x % trackLength;
                const distance = Math.abs(slickTrackPos - playerTrackPos);
                // Handle wrap-around at track boundaries
                const wrapDistance = Math.min(distance, trackLength - distance);
                if (wrapDistance < 15) {
                    // On oil slick - set to slow static speed
                    player.speed = Math.min(player.speed, 2);
                    player.onOilSlick = true;
                    return;
                }
            }
        }
        player.onOilSlick = false;
    }
    
    function updateTerrainFollowing() {
        const terrainHeight = getTerrainHeight(player.position);
        
        if (player.jumping) {
            // Check if landed back on terrain
            if (player.jumpHeight <= terrainHeight) {
                player.jumpHeight = terrainHeight;
                player.jumping = false;
                player.jumpVelocity = 0;
                
                // Check landing angle for crash
                const normalizedRotation = ((player.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const isUpsideDown = normalizedRotation > Math.PI / 3 && normalizedRotation < Math.PI * 5 / 3;
                const isSideways = (normalizedRotation > Math.PI / 6 && normalizedRotation < Math.PI / 3) || 
                                 (normalizedRotation > Math.PI * 5 / 3 && normalizedRotation < Math.PI * 11 / 6);
                
                if (isUpsideDown || (isSideways && player.speed > 5)) {
                    crashPlayer("bad_landing");
                } else {
                    player.rotation = 0;
                }
            }
        } else {
            // Follow terrain when not jumping
            const currentHeight = player.jumpHeight || 0;
            const heightDiff = terrainHeight - currentHeight;
            
            // If going up a steep slope fast enough, launch into air
            if (heightDiff > 3 && player.speed > 6) {
                player.jumping = true;
                player.jumpVelocity = Math.min(player.speed * 0.8, 15);
                if (player.throttle) {
                    player.jumpVelocity += 3;
                }
            } else {
                // Follow terrain contour
                player.jumpHeight = terrainHeight;
            }
        }
    }
    
    function crashPlayer(reason) {
        player.crashed = true;
        player.crashTimer = 0;
        player.speed = 0;
        player.jumping = false;
        player.jumpHeight = 0;
        player.heat = 0;
        
        // Set rider fall position (thrown forward)
        player.riderX = 30 + Math.random() * 20; // Fall forward
        player.riderY = -10 - Math.random() * 10; // Fall up then down
        player.bikeRotation = Math.random() * Math.PI * 2; // Random bike spin
        player.walkingBack = false;
        
        // Move opponents ahead to avoid immediate re-collision
        for (let opponent of opponents) {
            if (opponent.position < player.position + 200) {
                opponent.position = player.position + 200 + Math.random() * 100;
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
    
    function getAllPositions() {
        const racers = [
            { name: 'Player', position: player.position, color: '#0066FF' },
            ...opponents.map((opp, i) => ({ 
                name: `Rider ${i + 2}`, 
                position: opp.position, 
                color: opp.color 
            }))
        ];
        
        racers.sort((a, b) => b.position - a.position);
        return racers;
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
        
        if (player.crashed) {
            // Render crashed bike (spinning on ground)
            ctx.save();
            ctx.translate(bikeX, currentY);
            ctx.rotate(player.bikeRotation);
            
            // Crashed bike (darker colors)
            renderBikeOnly('#003366'); // Darker blue
            ctx.restore();
            
            // Render fallen rider
            const riderScreenX = bikeX + player.riderX;
            const riderScreenY = currentY + player.riderY;
            
            ctx.save();
            ctx.translate(riderScreenX, riderScreenY);
            
            if (player.walkingBack) {
                // Walking animation
                renderWalkingRider();
            } else {
                // Fallen rider
                renderFallenRider();
            }
            ctx.restore();
            
        } else {
            // Normal bike rendering
            ctx.save();
            ctx.translate(bikeX, currentY);
            ctx.rotate(player.rotation);
            
            renderBikeWithRider('#0066FF'); // Normal blue
            ctx.restore();
        }
    }
    
    function renderBikeOnly(color) {
        // Wheels first (behind bike)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-10, 8, 6, 0, Math.PI * 2);
        ctx.arc(10, 8, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Bike frame
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, 8);
        ctx.lineTo(-2, -8);
        ctx.lineTo(10, 8);
        ctx.lineTo(6, -2);
        ctx.lineTo(-2, -8);
        ctx.stroke();
        
        // Seat and tank
        ctx.fillStyle = '#000000';
        ctx.fillRect(-6, -10, 8, 3);
        ctx.fillStyle = color;
        ctx.fillRect(-4, -6, 8, 6);
    }
    
    function renderBikeWithRider(color) {
        renderBikeOnly(color);
        
        // Rider body
        ctx.fillStyle = color;
        ctx.fillRect(-3, -18, 6, 12);
        
        // Rider arms
        ctx.strokeStyle = '#FFE4B5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(1, -14);
        ctx.lineTo(2, -10);
        ctx.lineTo(8, -6);
        ctx.stroke();
        
        // Helmet
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(-1, -20, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function renderFallenRider() {
        // Fallen rider (on side)
        ctx.fillStyle = '#0066FF';
        ctx.fillRect(-6, -3, 12, 6); // Body on side
        
        // Helmet
        ctx.fillStyle = '#0066FF';
        ctx.beginPath();
        ctx.arc(-8, -1, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Arms and legs sprawled
        ctx.strokeStyle = '#FFE4B5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, -1);
        ctx.lineTo(4, -6);
        ctx.moveTo(-2, 1);
        ctx.lineTo(4, 6);
        ctx.stroke();
    }
    
    function renderWalkingRider() {
        // Walking rider (upright)
        ctx.fillStyle = '#0066FF';
        ctx.fillRect(-3, -12, 6, 10); // Upright body
        
        // Helmet
        ctx.fillStyle = '#0066FF';
        ctx.beginPath();
        ctx.arc(0, -14, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Walking legs
        ctx.strokeStyle = '#0000FF';
        ctx.lineWidth = 2;
        const walkCycle = Math.sin(player.crashTimer * 10);
        ctx.beginPath();
        ctx.moveTo(-1, -2);
        ctx.lineTo(-3 + walkCycle, 6);
        ctx.moveTo(1, -2);
        ctx.lineTo(3 - walkCycle, 6);
        ctx.stroke();
    }
    
    function renderOpponents() {
        for (let opponent of opponents) {
            const screenX = (opponent.position % trackLength) - trackPosition + 400;
            
            if (screenX > -50 && screenX < canvas.width + 50) {
                const laneY = lanes[opponent.lane].y;
                
                if (opponent.crashed) {
                    // Render crashed opponent
                    ctx.save();
                    ctx.translate(screenX, laneY);
                    
                    // Crashed bike (spinning on ground)
                    ctx.save();
                    ctx.rotate(opponent.bikeRotation);
                    
                    // Wheels
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(-10, 8, 6, 0, Math.PI * 2);
                    ctx.arc(10, 8, 6, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Frame
                    ctx.strokeStyle = opponent.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(-8, 0);
                    ctx.lineTo(8, 0);
                    ctx.lineTo(0, -8);
                    ctx.closePath();
                    ctx.stroke();
                    
                    ctx.restore();
                    
                    // Fallen rider
                    if (!opponent.walkingBack) {
                        ctx.translate(opponent.riderX + 15, opponent.riderY);
                        ctx.fillStyle = opponent.color;
                        ctx.fillRect(-3, -8, 6, 8);
                        ctx.fillStyle = '#FFDDAA';
                        ctx.beginPath();
                        ctx.arc(0, -12, 4, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        // Walking rider
                        ctx.translate(opponent.riderX + 15, 0);
                        ctx.fillStyle = opponent.color;
                        ctx.fillRect(-2, -8, 4, 8);
                        ctx.fillStyle = '#FFDDAA';
                        ctx.beginPath();
                        ctx.arc(0, -14, 4, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Walking legs
                        ctx.strokeStyle = opponent.color;
                        ctx.lineWidth = 2;
                        const walkCycle = Math.sin(opponent.crashTimer * 10);
                        ctx.beginPath();
                        ctx.moveTo(-1, -2);
                        ctx.lineTo(-3 + walkCycle, 6);
                        ctx.moveTo(1, -2);
                        ctx.lineTo(3 - walkCycle, 6);
                        ctx.stroke();
                    }
                    
                    ctx.restore();
                } else {
                    // Normal opponent rendering
                    ctx.save();
                    ctx.translate(screenX, laneY);
                    
                    // Wheels first (behind bike)
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(-10, 8, 6, 0, Math.PI * 2); // Rear wheel
                    ctx.arc(10, 8, 6, 0, Math.PI * 2);  // Front wheel
                    ctx.fill();
                    
                    // Bike frame
                    ctx.strokeStyle = opponent.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(-10, 8);
                    ctx.lineTo(-2, -8);
                    ctx.lineTo(10, 8);
                    ctx.lineTo(6, -2);
                    ctx.lineTo(-2, -8);
                    ctx.stroke();
                    
                    // Rider
                    ctx.fillStyle = opponent.color;
                    ctx.fillRect(-3, -18, 6, 12);
                    ctx.fillStyle = '#FFDDAA';
                    ctx.beginPath();
                    ctx.arc(-1, -20, 5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.restore();
                }
            }
        }
    }
    
    function renderUI() {
        // Speed and heat
        ctx.fillStyle = '#000000';
        ctx.font = '16px monospace';
        ctx.fillText(`Speed: ${Math.floor(player.speed * 10)}`, 10, 25);
        ctx.fillText(`Lap: ${player.currentLap}/${lapsRequired}`, 10, 65);
        
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
        
        // Position leaderboard
        if (raceStarted) {
            const positions = getAllPositions();
            ctx.fillStyle = '#000000';
            ctx.font = '12px monospace';
            ctx.fillText('POSITIONS:', canvas.width - 120, 25);
            positions.forEach((racer, i) => {
                ctx.fillStyle = racer.color;
                const place = i + 1;
                const suffix = place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th';
                ctx.fillText(`${place}${suffix} ${racer.name}`, canvas.width - 120, 45 + i * 15);
            });
        }
        
        // Countdown
        if (!raceStarted) {
            ctx.fillStyle = '#FF0000';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 48px monospace';
            const text = countdown > 0 ? countdown.toString() : 'GO!';
            const textWidth = ctx.measureText(text).width;
            const x = (canvas.width - textWidth) / 2;
            const y = canvas.height / 2;
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
        }
        
        // Instructions at bottom
        ctx.fillStyle = '#000000';
        ctx.font = '14px monospace';
        ctx.fillText('UP/DOWN: Change Lanes    SPACE: Throttle    SHIFT: Jump    RIGHT: Rotate Forward', 10, 390);
        
        // Center lap display
        if (showLapDisplay) {
            ctx.fillStyle = '#FFFF00';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.font = 'bold 48px monospace';
            const lapText = `Lap ${displayedLap}/${lapsRequired}`;
            const textWidth = ctx.measureText(lapText).width;
            const x = (canvas.width - textWidth) / 2;
            const y = canvas.height / 2;
            ctx.strokeText(lapText, x, y);
            ctx.fillText(lapText, x, y);
        }
        
        // Race finished message
        if (raceFinished && coastingToStop) {
            const position = getPlayerPosition();
            ctx.fillStyle = position === 1 ? '#00FF00' : '#FFAA00';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 64px monospace';
            let text;
            if (position === 1) {
                text = 'YOU WON!';
            } else {
                const suffix = position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
                text = `${position}${suffix} PLACE`;
            }
            const textWidth = ctx.measureText(text).width;
            const x = (canvas.width - textWidth) / 2;
            ctx.strokeText(text, x, 100);
            ctx.fillText(text, x, 100);
        }
        
        // Crash message (temporary)
        if (player.crashed && raceStarted) {
            ctx.fillStyle = '#FF0000';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.font = 'bold 24px monospace';
            const text = player.walkingBack ? 'Walking back...' : 'CRASH!';
            const textWidth = ctx.measureText(text).width;
            const x = (canvas.width - textWidth) / 2;
            ctx.strokeText(text, x, 150);
            ctx.fillText(text, x, 150);
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
        
        if (!gameRunning || !raceStarted || coastingToStop || player.crashed) return;
        
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
