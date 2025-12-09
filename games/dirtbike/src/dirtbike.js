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
    let finalPosition = 1; // Store final position when player finishes
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    const trackLength = 6000; // 3x longer laps
    const lapsRequired = 3;
    const totalTrackLength = trackLength * lapsRequired;
    
    // Level system
    let currentLevel = 1;
    const maxLevels = 3;
    
    // Level configurations
    const levelConfigs = {
        1: { // Day - Blue sky with clouds
            hillCount: 15, // More hills for longer track
            oilSlicksPerLap: 10, // More oil slicks
            opponentCrashChance: 0.4,
            opponentBaseSpeed: 4, // Easy level - slower opponents
            opponentSpeedRange: 2, // 4-6 speed range
            opponentMaxSpeed: 7.5, // Lower max speed
            skyColor: '#87CEEB',
            theme: 'day'
        },
        2: { // Night - Dark sky with stars and moon
            hillCount: 20, // More hills
            oilSlicksPerLap: 15, // More oil slicks
            opponentCrashChance: 0.25,
            opponentBaseSpeed: 4, // Reduced by 0.5
            opponentSpeedRange: 2.25, // 4-6.25 speed range
            opponentMaxSpeed: 7.5, // Reduced by 0.5
            skyColor: '#191970',
            theme: 'night'
        },
        3: { // Dawn - Light over horizon
            hillCount: 25, // More hills
            oilSlicksPerLap: 20, // More oil slicks
            opponentCrashChance: 0.15,
            opponentBaseSpeed: 4.5, // Reduced by 0.5
            opponentSpeedRange: 2.5, // 4.5-7 speed range
            opponentMaxSpeed: 8.0, // Reduced by 0.5
            skyColor: '#FFB347',
            theme: 'dawn'
        }
    };
    
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
        trackCanvas.width = totalTrackLength + 2000; // All 3 laps plus coasting space
        trackCanvas.height = 400;
        trackCtx = trackCanvas.getContext('2d');
        
        // Draw sky based on current level
        const config = levelConfigs[currentLevel];
        trackCtx.fillStyle = config.skyColor;
        trackCtx.fillRect(0, 0, trackCanvas.width, 120);
        
        // Draw theme-specific sky elements
        if (config.theme === 'day') {
            // Draw fluffy clouds
            trackCtx.fillStyle = '#FFFFFF';
            for (let x = 0; x < trackCanvas.width; x += 200) {
                const cloudX = x + Math.random() * 100;
                const cloudY = 20 + Math.random() * 40;
                
                trackCtx.beginPath();
                trackCtx.arc(cloudX, cloudY, 15, 0, Math.PI * 2);
                trackCtx.arc(cloudX + 20, cloudY, 18, 0, Math.PI * 2);
                trackCtx.arc(cloudX + 40, cloudY, 15, 0, Math.PI * 2);
                trackCtx.arc(cloudX + 10, cloudY - 10, 12, 0, Math.PI * 2);
                trackCtx.arc(cloudX + 30, cloudY - 8, 14, 0, Math.PI * 2);
                trackCtx.fill();
            }
        } else if (config.theme === 'night') {
            // Draw stars
            trackCtx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 50; i++) {
                const starX = Math.random() * trackCanvas.width;
                const starY = Math.random() * 100;
                trackCtx.fillRect(starX, starY, 2, 2);
            }
            // Draw moon
            trackCtx.fillStyle = '#FFFACD';
            trackCtx.beginPath();
            trackCtx.arc(100, 40, 20, 0, Math.PI * 2);
            trackCtx.fill();
        } else if (config.theme === 'dawn') {
            // Draw sun on horizon
            trackCtx.fillStyle = '#FFD700';
            trackCtx.beginPath();
            trackCtx.arc(700, 110, 25, 0, Math.PI * 2);
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
                
                // Analyze terrain shape to determine if it's a plateau
                const rampTerrain = terrain.slice(rampStart, rampEnd + 1);
                const maxHeight = Math.max(...rampTerrain);
                const flatTopCount = rampTerrain.filter(h => h >= maxHeight * 0.95).length; // Count near-max height points
                const isPlateauShape = flatTopCount > rampTerrain.length * 0.3; // If >30% is flat top, it's a plateau
                
                // Draw complete ramp
                const startX = rampStart * 2 + 400;
                const endX = rampEnd * 2 + 400;
                const rampWidth = endX - startX;
                
                const jumpTop = 204;
                const jumpBottom = 316;
                
                if (isPlateauShape) {
                    // Draw plateau (trapezoidal) shape
                    const rampUpWidth = rampWidth * 0.25;
                    const flatWidth = rampWidth * 0.5;
                    const rampDownWidth = rampWidth * 0.25;
                    
                    // Left ramp up (darker brown)
                    trackCtx.fillStyle = '#A0522D';
                    trackCtx.beginPath();
                    trackCtx.moveTo(startX, jumpBottom);
                    trackCtx.lineTo(startX + rampUpWidth, jumpBottom - maxHeight);
                    trackCtx.lineTo(startX + rampUpWidth, jumpTop - maxHeight);
                    trackCtx.lineTo(startX, jumpTop);
                    trackCtx.closePath();
                    trackCtx.fill();
                    
                    // Right ramp down (lightest brown)
                    trackCtx.fillStyle = '#D2B48C';
                    trackCtx.beginPath();
                    trackCtx.moveTo(startX + rampUpWidth + flatWidth, jumpBottom - maxHeight);
                    trackCtx.lineTo(endX, jumpBottom);
                    trackCtx.lineTo(endX, jumpTop);
                    trackCtx.lineTo(startX + rampUpWidth + flatWidth, jumpTop - maxHeight);
                    trackCtx.closePath();
                    trackCtx.fill();
                    
                    // Flat top face (medium brown - lighter than ramp up, darker than ramp down)
                    trackCtx.fillStyle = '#C19A6B';
                    trackCtx.beginPath();
                    trackCtx.moveTo(startX + rampUpWidth, jumpBottom - maxHeight);
                    trackCtx.lineTo(startX + rampUpWidth + flatWidth, jumpBottom - maxHeight);
                    trackCtx.lineTo(startX + rampUpWidth + flatWidth, jumpTop - maxHeight);
                    trackCtx.lineTo(startX + rampUpWidth, jumpTop - maxHeight);
                    trackCtx.closePath();
                    trackCtx.fill();
                    
                    // Bottom trapezoidal face (lightest brown)
                    trackCtx.fillStyle = '#F4E4BC';
                    trackCtx.beginPath();
                    trackCtx.moveTo(startX, jumpBottom);
                    trackCtx.lineTo(startX + rampUpWidth, jumpBottom - maxHeight);
                    trackCtx.lineTo(startX + rampUpWidth + flatWidth, jumpBottom - maxHeight);
                    trackCtx.lineTo(endX, jumpBottom);
                    trackCtx.closePath();
                    trackCtx.fill();
                } else {
                    // Draw regular triangular hill
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
                }
                
                // Outline for both types
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
        horizontalVelocity: 0,
        rotation: 0,
        rotateForward: false,
        rotateBackward: false,
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
            speed: levelConfigs[currentLevel].opponentBaseSpeed + Math.random() * levelConfigs[currentLevel].opponentSpeedRange,
            color: opponentColors[i],
            crashed: false,
            crashTimer: 0,
            riderX: 0,
            riderY: 0,
            bikeRotation: 0,
            walkingBack: false,
            // Add physics properties like player
            jumping: false,
            jumpHeight: 0,
            jumpVelocity: 0,
            horizontalVelocity: 0,
            rotation: 0,
            rotateForward: false
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
        const singleLapPoints = Math.floor(trackLength / resolution);
        const totalTrackPoints = Math.floor(totalTrackLength / resolution);
        
        // Generate terrain for first lap only
        const baseTerrain = [];
        for (let i = 0; i < singleLapPoints; i++) {
            baseTerrain.push(0);
        }
        
        // Add hills to first lap
        const hillCount = levelConfigs[currentLevel].hillCount;
        const hills = [];
        
        // Generate non-overlapping hills for first lap
        for (let h = 0; h < hillCount; h++) {
            let attempts = 0;
            let hillPlaced = false;
            
            while (!hillPlaced && attempts < 50) {
                const hillWidth = 30 + Math.random() * 70; // 60-200px wide
                const hillHeight = 15 + Math.random() * 30; // 15-45px high
                const hillStart = Math.floor(Math.random() * (singleLapPoints - hillWidth / resolution));
                const hillEnd = hillStart + Math.floor(hillWidth / resolution);
                
                // Check for overlap with existing hills
                let overlaps = false;
                for (let existingHill of hills) {
                    if (!(hillEnd < existingHill.start || hillStart > existingHill.end)) {
                        overlaps = true;
                        break;
                    }
                }
                
                if (!overlaps && hillEnd < singleLapPoints) {
                    hills.push({ start: hillStart, end: hillEnd, height: hillHeight });
                    hillPlaced = true;
                }
                attempts++;
            }
        }
        
        // Generate a few huge hills per lap
        const hugeHillCount = 2 + currentLevel; // 3-5 huge hills depending on level
        for (let h = 0; h < hugeHillCount; h++) {
            let attempts = 0;
            let hillPlaced = false;
            
            while (!hillPlaced && attempts < 50) {
                const hillWidth = 100 + Math.random() * 150; // 100-250px wide (much wider)
                const hillHeight = 60 + Math.random() * 40; // 60-100px high (much taller)
                const hillStart = Math.floor(Math.random() * (singleLapPoints - hillWidth / resolution));
                const hillEnd = hillStart + Math.floor(hillWidth / resolution);
                
                // Check for overlap with existing hills
                let overlaps = false;
                for (let existingHill of hills) {
                    if (!(hillEnd < existingHill.start || hillStart > existingHill.end)) {
                        overlaps = true;
                        break;
                    }
                }
                
                if (!overlaps && hillEnd < singleLapPoints) {
                    hills.push({ start: hillStart, end: hillEnd, height: hillHeight });
                    hillPlaced = true;
                }
                attempts++;
            }
        }
        
        // Generate plateau hills (trapezoidal)
        const plateauCount = 1 + currentLevel; // 2-4 plateaus depending on level
        for (let p = 0; p < plateauCount; p++) {
            let attempts = 0;
            let hillPlaced = false;
            
            while (!hillPlaced && attempts < 50) {
                const plateauWidth = 80 + Math.random() * 120; // 80-200px total width
                const plateauHeight = 25 + Math.random() * 35; // 25-60px high
                const hillStart = Math.floor(Math.random() * (singleLapPoints - plateauWidth / resolution));
                const hillEnd = hillStart + Math.floor(plateauWidth / resolution);
                
                // Check for overlap with existing hills
                let overlaps = false;
                for (let existingHill of hills) {
                    if (!(hillEnd < existingHill.start || hillStart > existingHill.end)) {
                        overlaps = true;
                        break;
                    }
                }
                
                if (!overlaps && hillEnd < singleLapPoints) {
                    hills.push({ 
                        start: hillStart, 
                        end: hillEnd, 
                        height: plateauHeight,
                        type: 'plateau'
                    });
                    hillPlaced = true;
                }
                attempts++;
            }
        }
        
        // Generate one guaranteed gigantic plateau per lap
        let attempts = 0;
        let plateauPlaced = false;
        
        while (!plateauPlaced && attempts < 100) {
            const plateauWidth = 400 + Math.random() * 400; // 400-800px wide (massive)
            const plateauHeight = 80 + Math.random() * 80; // 80-160px high (extremely tall)
            const hillStart = Math.floor(Math.random() * (singleLapPoints - plateauWidth / resolution));
            const hillEnd = hillStart + Math.floor(plateauWidth / resolution);
            
            // Check for overlap with existing hills
            let overlaps = false;
            for (let existingHill of hills) {
                if (!(hillEnd < existingHill.start || hillStart > existingHill.end)) {
                    overlaps = true;
                    break;
                }
            }
            
            if (!overlaps && hillEnd < singleLapPoints) {
                hills.push({ 
                    start: hillStart, 
                    end: hillEnd, 
                    height: plateauHeight,
                    type: 'plateau'
                });
                plateauPlaced = true;
            }
            attempts++;
        }
        
        // Add hills to base terrain
        for (let hill of hills) {
            const hillWidth = hill.end - hill.start;
            for (let i = 0; i < hillWidth && hill.start + i < singleLapPoints; i++) {
                const progress = i / (hillWidth - 1);
                let height;
                
                if (hill.type === 'plateau') {
                    // Trapezoidal plateau: ramp up, flat top, ramp down
                    if (progress < 0.25) {
                        // Ramp up (first 25%)
                        height = hill.height * (progress * 4);
                    } else if (progress < 0.75) {
                        // Flat top (middle 50%)
                        height = hill.height;
                    } else {
                        // Ramp down (last 25%)
                        height = hill.height * (4 - progress * 4);
                    }
                } else {
                    // Regular triangular hill
                    height = progress <= 0.5 ? 
                        hill.height * (progress * 2) : 
                        hill.height * (2 - progress * 2);
                }
                
                baseTerrain[hill.start + i] = height;
            }
        }
        
        // Repeat base terrain for all 3 laps
        for (let lap = 0; lap < lapsRequired; lap++) {
            for (let i = 0; i < singleLapPoints; i++) {
                terrain.push(baseTerrain[i]);
            }
        }
    }
    
    // Get terrain height at any position
    function getTerrainHeight(position) {
        const index = Math.floor(position / 2); // 2 pixel resolution
        if (index >= 0 && index < terrain.length) {
            return terrain[index];
        }
        return 0;
    }
    
    // Generate oil slicks
    function generateOilSlicks() {
        oilSlicks.length = 0;
        const slicksPerLap = levelConfigs[currentLevel].oilSlicksPerLap;
        
        // Generate base oil slicks for first lap
        const baseSlicks = [];
        for (let i = 0; i < slicksPerLap; i++) {
            baseSlicks.push({
                x: 500 + Math.random() * (trackLength - 1000),
                lane: Math.floor(Math.random() * 4),
                width: 40,
                height: 20
            });
        }
        
        // Repeat base slicks for all laps
        for (let lap = 0; lap < lapsRequired; lap++) {
            for (let baseSlick of baseSlicks) {
                oilSlicks.push({
                    x: lap * trackLength + baseSlick.x,
                    lane: baseSlick.lane,
                    width: baseSlick.width,
                    height: baseSlick.height
                });
            }
        }
    }
    
    function resetForNextLevel() {
        // Reset game state
        gameRunning = false;
        gameWon = false;
        gameStarted = false;
        raceStarted = false;
        raceFinished = false;
        coastingToStop = false;
        countdown = 3;
        countdownTimer = 0;
        trackPosition = 0;
        lapDisplayTimer = 0;
        showLapDisplay = false;
        displayedLap = 1;
        finalPosition = 1;
        
        // Reset player
        player.lane = 2;
        player.targetLane = 2;
        player.laneTransition = 0;
        player.position = 0;
        player.speed = 0;
        player.heat = 0;
        player.throttle = false;
        player.jumping = false;
        player.jumpHeight = 0;
        player.jumpVelocity = 0;
        player.horizontalVelocity = 0;
        player.rotation = 0;
        player.rotateForward = false;
        player.rotateBackward = false;
        player.crashed = false;
        player.crashTimer = 0;
        player.riderX = 0;
        player.riderY = 0;
        player.bikeRotation = 0;
        player.walkingBack = false;
        player.currentLap = 1;
        
        // Reset opponents
        const availableLanes = [0, 1, 2, 3];
        for (let i = 0; i < opponents.length; i++) {
            const opponent = opponents[i];
            // Remove player's lane from available lanes
            const playerLaneIndex = availableLanes.indexOf(2);
            if (playerLaneIndex > -1) {
                availableLanes.splice(playerLaneIndex, 1);
            }
            // Assign random lane from remaining available lanes
            const randomIndex = Math.floor(Math.random() * availableLanes.length);
            opponent.lane = availableLanes.splice(randomIndex, 1)[0];
            opponent.position = 0;
            opponent.speed = levelConfigs[currentLevel].opponentBaseSpeed + Math.random() * levelConfigs[currentLevel].opponentSpeedRange;
            opponent.crashed = false;
            opponent.crashTimer = 0;
            opponent.jumping = false;
            opponent.jumpHeight = 0;
            opponent.jumpVelocity = 0;
            opponent.horizontalVelocity = 0;
            opponent.rotation = 0;
            opponent.currentLap = 1;
        }
        
        // Regenerate track with new level settings
        generateTrack();
        
        // Restart game
        gameRunning = true;
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
        
        // Update camera (always follow player, even during crash)
        trackPosition = player.position;
        
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
            finalPosition = getPlayerPosition(); // Store final position
        }
        
        // Check if coasting is complete (bike has stopped)
        if (coastingToStop && player.speed < 0.1) {
            gameWon = finalPosition === 1; // Only won if finished in 1st place
            gameRunning = false;
            
            if (finalPosition === 1) {
                // Player won - check for level progression
                if (currentLevel < maxLevels) {
                    // Advance to next level
                    currentLevel++;
                    // Reset game state for next level
                    resetForNextLevel();
                } else {
                    // Completed all levels
                    if (callbacks?.onGameComplete) {
                        callbacks.onGameComplete('dirtbike', { 
                            completed: true,
                            position: finalPosition,
                            allLevelsComplete: true
                        });
                    }
                }
            } else {
                // Player lost - restart current level
                resetForNextLevel();
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
        
        // Only apply normal speed when not jumping (horizontal velocity handles airborne movement)
        if (!player.jumping) {
            player.position += player.speed;
        }
        
        // Update jump cooldown
        if (player.jumpCooldown > 0) {
            player.jumpCooldown--;
        }
        
        // Jumping physics
        if (player.jumping) {
            // Use terrain following physics instead of hardcoded gravity
            // (gravity is handled in updateTerrainFollowing)
            
            // Rotation while jumping
            if (player.rotateForward) {
                player.rotation += 0.05; // RIGHT arrow: clockwise
                console.log("Rotating clockwise (RIGHT pressed)");
            } else if (player.rotateBackward) {
                player.rotation -= 0.05; // LEFT arrow: counter-clockwise (faster)
                console.log("Rotating counter-clockwise (LEFT pressed)");
            } else {
                player.rotation -= 0.02; // Natural: counter-clockwise (slower)
                console.log("Natural counter-clockwise rotation");
            }
            
            if (player.jumpHeight <= 0) {
                player.jumpHeight = 0;
                player.jumping = false;
                player.jumpVelocity = 0;
                
                // Check landing angle for crash - allow 45 degrees in either direction
                const normalizedRotation = ((player.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const maxSafeAngle = Math.PI / 4; // 45 degrees
                
                // Check if rotation is within safe landing range (45 degrees forward or backward from upright)
                const isUpsideDown = normalizedRotation > (Math.PI - maxSafeAngle) && normalizedRotation < (Math.PI + maxSafeAngle);
                const isTooSteep = normalizedRotation > maxSafeAngle && normalizedRotation < (Math.PI - maxSafeAngle) ||
                                  normalizedRotation > (Math.PI + maxSafeAngle) && normalizedRotation < (2 * Math.PI - maxSafeAngle);
                
                if (isUpsideDown || isTooSteep) {
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
                        opponent.rotation = 0;
                    }
                }
                continue; // Skip normal movement during crash
            }
            
            // Simple AI behavior
            opponent.speed += (Math.random() - 0.5) * 0.1;
            opponent.speed = Math.max(2, Math.min(levelConfigs[currentLevel].opponentMaxSpeed, opponent.speed));
            
            // Only apply normal speed when not jumping (like player)
            if (!opponent.jumping) {
                opponent.position += opponent.speed;
            }
            
            // Apply same terrain physics as player
            updateOpponentTerrainFollowing(opponent);
            
            // Occasional lane changes
            if (Math.random() < 0.002) {
                opponent.lane = Math.max(0, Math.min(3, opponent.lane + (Math.random() < 0.5 ? -1 : 1)));
            }
        }
        
        // Check opponent-to-opponent collisions
        checkOpponentToOpponentCollisions();
    }
    
    function checkOpponentToOpponentCollisions() {
        for (let i = 0; i < opponents.length; i++) {
            const opponent1 = opponents[i];
            if (opponent1.jumping || opponent1.crashed) continue; // Skip if jumping or already crashed
            
            for (let j = i + 1; j < opponents.length; j++) {
                const opponent2 = opponents[j];
                if (opponent2.jumping || opponent2.crashed) continue; // Skip if jumping or already crashed
                
                // Check if opponents are in same lane and close position
                if (opponent1.lane === opponent2.lane) {
                    const distance = Math.abs(opponent1.position - opponent2.position);
                    if (distance < 30) { // Same collision threshold as player
                        // Determine who crashes based on position (same logic as player collisions)
                        if (opponent1.position > opponent2.position) {
                            // Opponent1 is ahead - opponent2 crashes into opponent1's back
                            crashOpponent(j);
                        } else {
                            // Opponent2 is ahead - opponent1 crashes into opponent2's back
                            crashOpponent(i);
                        }
                        return; // Only handle one collision per frame
                    }
                }
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
            // Determine which lane the player is actually in based on transition progress
            let currentLane = player.lane;
            if (player.laneTransition > 0.5) {
                // More than halfway through transition, use target lane
                currentLane = player.targetLane;
            }
            
            // Only check if player is in the slick's lane
            if (slick.lane === currentLane) {
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
    
    function updateOpponentTerrainFollowing(opponent) {
        const terrainHeight = getTerrainHeight(opponent.position);
        const gravity = 0.15;
        
        if (opponent.jumping) {
            // Apply gravity and physics while airborne
            opponent.jumpVelocity -= gravity;
            opponent.jumpHeight += opponent.jumpVelocity;
            
            // Use horizontal velocity instead of normal speed while jumping
            opponent.position += opponent.horizontalVelocity;
            // No air resistance - maintain horizontal velocity
            
            // AI tries to correct rotation for landing (but sometimes fails)
            if (Math.abs(opponent.rotation) > 0.1) {
                // Sometimes AI fails to correct properly (based on crash chance)
                const aiSkill = Math.random() > levelConfigs[currentLevel].opponentCrashChance ? 1.0 : 0.3; // Reduced correction when failing
                
                if (opponent.rotation > 0) {
                    opponent.rotation -= 0.03 * aiSkill; // Correct clockwise rotation
                } else {
                    opponent.rotation += 0.03 * aiSkill; // Correct counter-clockwise rotation
                }
            }
            
            // Check if landed back on terrain
            if (opponent.jumpHeight <= terrainHeight) {
                opponent.jumpHeight = terrainHeight;
                opponent.jumping = false;
                opponent.jumpVelocity = 0;
                opponent.horizontalVelocity = 0;
                
                // Check landing angle for crash - same as player
                const normalizedRotation = ((opponent.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const maxSafeAngle = Math.PI / 4; // 45 degrees
                
                const isUpsideDown = normalizedRotation > (Math.PI - maxSafeAngle) && normalizedRotation < (Math.PI + maxSafeAngle);
                const isTooSteep = normalizedRotation > maxSafeAngle && normalizedRotation < (Math.PI - maxSafeAngle) ||
                                  normalizedRotation > (Math.PI + maxSafeAngle) && normalizedRotation < (2 * Math.PI - maxSafeAngle);
                
                if (isUpsideDown || isTooSteep) {
                    // Opponent crashes
                    opponent.crashed = true;
                    opponent.crashTimer = 0;
                    opponent.speed = 0;
                    opponent.riderX = 0;
                    opponent.riderY = 0;
                    opponent.bikeRotation = Math.random() * Math.PI * 2;
                    opponent.walkingBack = false;
                } else {
                    opponent.rotation = 0;
                }
            }
        } else {
            // Same launch physics as player
            const lookAhead = 10;
            const lookBehind = 5;
            const futureHeight = getTerrainHeight(opponent.position + lookAhead);
            const pastHeight = getTerrainHeight(opponent.position - lookBehind);
            const currentTerrain = terrainHeight;
            
            const upwardSlope = currentTerrain - pastHeight;
            const wasGoingUp = currentTerrain > pastHeight;
            const willGoDown = futureHeight < currentTerrain;
            const willStayFlat = Math.abs(futureHeight - currentTerrain) < 3; // Within 3 pixels is considered flat
            const isAtPeak = wasGoingUp && willGoDown;
            const isAtPlateauEdge = wasGoingUp && willStayFlat && upwardSlope > 2; // Reduced threshold
            
            // Launch if at hill peak OR plateau edge with sufficient velocity (reduced requirements)
            if ((isAtPeak || isAtPlateauEdge) && opponent.speed > 3 && upwardSlope > 0.5) {
                const slopeAngle = Math.atan2(upwardSlope, lookBehind);
                const launchSpeed = opponent.speed * 0.8;
                
                opponent.jumping = true;
                opponent.jumpVelocity = launchSpeed * Math.sin(slopeAngle);
                opponent.horizontalVelocity = launchSpeed * Math.cos(slopeAngle);
                opponent.jumpHeight = terrainHeight;
            } else {
                // Follow terrain
                opponent.jumpHeight = terrainHeight;
            }
        }
    }
    
    function updateTerrainFollowing() {
        const terrainHeight = getTerrainHeight(player.position);
        const gravity = 0.15;
        
        if (player.jumping) {
            // Apply gravity and physics while airborne
            player.jumpVelocity -= gravity;
            player.jumpHeight += player.jumpVelocity;
            
            // Use horizontal velocity instead of normal speed while jumping
            player.position += player.horizontalVelocity;
            // No air resistance - maintain horizontal velocity
            
            // Check if landed back on terrain
            if (player.jumpHeight <= terrainHeight) {
                player.jumpHeight = terrainHeight;
                player.jumping = false;
                player.jumpVelocity = 0;
                player.horizontalVelocity = 0; // Reset horizontal velocity on landing
                
                // Check landing angle for crash - allow 45 degrees in either direction
                const normalizedRotation = ((player.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const maxSafeAngle = Math.PI / 4; // 45 degrees
                
                // Check if rotation is within safe landing range (45 degrees forward or backward from upright)
                const isUpsideDown = normalizedRotation > (Math.PI - maxSafeAngle) && normalizedRotation < (Math.PI + maxSafeAngle);
                const isTooSteep = normalizedRotation > maxSafeAngle && normalizedRotation < (Math.PI - maxSafeAngle) ||
                                  normalizedRotation > (Math.PI + maxSafeAngle) && normalizedRotation < (2 * Math.PI - maxSafeAngle);
                
                if (isUpsideDown || isTooSteep) {
                    crashPlayer("bad_landing");
                } else {
                    player.rotation = 0;
                }
            }
        } else {
            // Physics-based terrain following
            const currentHeight = player.jumpHeight || 0;
            
            // Look ahead and behind to detect hill shape
            const lookAhead = 10;
            const lookBehind = 5;
            const futureHeight = getTerrainHeight(player.position + lookAhead);
            const pastHeight = getTerrainHeight(player.position - lookBehind);
            const currentTerrain = terrainHeight;
            
            // Calculate slope we just came from
            const upwardSlope = currentTerrain - pastHeight;
            
            // Calculate if we're at a hill peak (going from up to down) or plateau edge (going from up to flat)
            const wasGoingUp = currentTerrain > pastHeight;
            const willGoDown = futureHeight < currentTerrain;
            const willStayFlat = Math.abs(futureHeight - currentTerrain) < 3; // Within 3 pixels is considered flat
            const isAtPeak = wasGoingUp && willGoDown;
            const isAtPlateauEdge = wasGoingUp && willStayFlat && upwardSlope > 2; // Reduced threshold
            
            // Launch if we're at a hill peak OR plateau edge with sufficient velocity (reduced requirements)
            if ((isAtPeak || isAtPlateauEdge) && player.speed > 3 && upwardSlope > 0.5) {
                // Calculate slope angle for launch direction
                const slopeAngle = Math.atan2(upwardSlope, lookBehind);
                const launchSpeed = player.speed * 0.8; // Back to original
                
                // Launch along slope direction
                player.jumping = true;
                player.jumpVelocity = launchSpeed * Math.sin(slopeAngle); // Vertical component
                player.horizontalVelocity = launchSpeed * Math.cos(slopeAngle); // Horizontal component
                
                // Reset rotation states for clean jump start
                player.rotateForward = false;
                player.rotateBackward = false;
                
                if (player.throttle) {
                    // Throttle boost in slope direction
                    player.jumpVelocity += 2 * Math.sin(slopeAngle);
                    player.horizontalVelocity += 2 * Math.cos(slopeAngle);
                }
                player.jumpHeight = terrainHeight;
                console.log(`Launching! Angle: ${slopeAngle.toFixed(2)}, Vertical: ${player.jumpVelocity.toFixed(2)}, Horizontal: ${player.horizontalVelocity.toFixed(2)} - Reset rotation states`);
            } else {
                // Follow terrain
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
            const screenX = opponent.position - trackPosition + 400;
            
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
                    ctx.translate(screenX, laneY - opponent.jumpHeight);
                    ctx.rotate(opponent.rotation); // Add rotation like player
                    
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
        // Set text color based on theme
        const textColor = levelConfigs[currentLevel].theme === 'night' ? '#FFFFFF' : '#000000';
        
        // Top row UI - all in one line
        ctx.fillStyle = textColor;
        ctx.font = '16px monospace';
        
        // Calculate positions for horizontal layout
        const speed = `Speed: ${Math.floor(player.speed * 10)}`;
        const lap = `Lap: ${player.currentLap}/${lapsRequired}`;
        const level = `Level: ${currentLevel}/${maxLevels}`;
        const position = `Position: ${getPlayerPosition()}/4`;
        
        // Display all info in single row across top
        ctx.fillText(speed, 10, 25);
        ctx.fillText(lap, 150, 25);
        ctx.fillText(level, 280, 25);
        ctx.fillText(position, 420, 25);
        
        // Heat gauge (moved to top row)
        const heatPercent = player.heat / player.maxHeat;
        ctx.fillStyle = '#333333';
        ctx.fillRect(10, 35, 100, 10); // Smaller height
        ctx.fillStyle = heatPercent > 0.8 ? '#FF0000' : heatPercent > 0.6 ? '#FFAA00' : '#00FF00';
        ctx.fillRect(10, 35, 100 * heatPercent, 10);
        ctx.fillStyle = textColor;
        ctx.fillText('Heat', 120, 44);
        
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
            // Calculate animation scale (starts big, shrinks to almost nothing)
            const animationProgress = countdownTimer; // 0 to 1 over each second
            const scale = 1.5 - (animationProgress * 1.4); // 1.5 to 0.1
            
            // Race number display (giant white)
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            ctx.font = 'bold 120px monospace';
            const raceText = `Race ${currentLevel}`;
            const raceWidth = ctx.measureText(raceText).width;
            const raceX = (canvas.width - raceWidth) / 2;
            ctx.strokeText(raceText, raceX, 120);
            ctx.fillText(raceText, raceX, 120);
            
            // Countdown display (giant animated white)
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2 + 50);
            ctx.scale(scale, scale);
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8;
            ctx.font = 'bold 200px monospace';
            const text = countdown > 0 ? countdown.toString() : 'GO!';
            const textWidth = ctx.measureText(text).width;
            ctx.strokeText(text, -textWidth / 2, 0);
            ctx.fillText(text, -textWidth / 2, 0);
            ctx.restore();
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
            const position = finalPosition; // Use stored final position
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
            
            // Show restart option for non-first place
            if (position > 1) {
                ctx.fillStyle = '#FFFFFF';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.font = 'bold 24px monospace';
                const restartText = 'Press R to Restart';
                const restartWidth = ctx.measureText(restartText).width;
                const restartX = (canvas.width - restartWidth) / 2;
                ctx.strokeText(restartText, restartX, 150);
                ctx.fillText(restartText, restartX, 150);
            }
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
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        
        // Handle restart
        if (e.code === 'KeyR' && raceFinished && coastingToStop && finalPosition > 1) {
            // Reset to level 1 (restart entire game)
            currentLevel = 1;
            
            // Reset game state
            gameWon = false;
            gameStarted = false;
            raceStarted = false;
            raceFinished = false;
            coastingToStop = false;
            countdown = 3;
            countdownTimer = 0;
            trackPosition = 0;
            lapDisplayTimer = 0;
            showLapDisplay = false;
            displayedLap = 1;
            finalPosition = 1; // Reset final position
            
            // Reset player
            player.lane = 2;
            player.targetLane = 2;
            player.laneTransition = 0;
            player.position = 0;
            player.speed = 0;
            player.heat = 0;
            player.throttle = false;
            player.jumping = false;
            player.jumpHeight = 0;
            player.jumpVelocity = 0;
            player.rotation = 0;
            player.rotateForward = false;
            player.rotateBackward = false;
            player.crashed = false;
            player.crashTimer = 0;
            player.riderX = 0;
            player.riderY = 0;
            player.bikeRotation = 0;
            player.walkingBack = false;
            player.currentLap = 1;
            player.onOilSlick = false;
            player.jumpCooldown = 0;
            
            // Reset opponents with level 1 speeds
            for (let i = 0; i < opponents.length; i++) {
                opponents[i].lane = i === 0 ? 0 : i === 1 ? 1 : 3; // Reset to starting lanes
                opponents[i].position = 0;
                opponents[i].speed = levelConfigs[1].opponentBaseSpeed + Math.random() * levelConfigs[1].opponentSpeedRange;
                opponents[i].crashed = false;
                opponents[i].crashTimer = 0;
                opponents[i].riderX = 0;
                opponents[i].riderY = 0;
                opponents[i].bikeRotation = 0;
                opponents[i].walkingBack = false;
                // Reset physics properties
                opponents[i].jumping = false;
                opponents[i].jumpHeight = 0;
                opponents[i].jumpVelocity = 0;
                opponents[i].horizontalVelocity = 0;
                opponents[i].rotation = 0;
                opponents[i].rotateForward = false;
            }
            
            // Regenerate track for level 1
            generateTrack();
            
            gameRunning = true;
            return;
        }
        
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
                    player.rotateBackward = true; // LEFT arrow: faster counter-clockwise
                }
                break;
            case 'ArrowRight':
                if (player.jumping) {
                    player.rotateForward = true; // Forward rotation
                    console.log("RIGHT key pressed - setting rotateForward = true");
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
            case 'ArrowLeft':
                if (player.jumping) {
                    player.rotateBackward = false; // Stop faster counter-clockwise
                }
                break;
            case 'ArrowRight':
                if (player.jumping) {
                    player.rotateForward = false; // Stop forward rotation
                    console.log("RIGHT key released - setting rotateForward = false");
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
