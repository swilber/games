async function createPunchOutGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load configuration
    let punchOutConfig = {};
    if (typeof configManager !== 'undefined') {
        try {
            punchOutConfig = await configManager.loadConfig('punchout');
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    } else {
        punchOutConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings,
            fighters: [
                { name: "Glass Joe", health: 60, speed: 0.8, patterns: ["jab"], tells: ["blink"] }
            ]
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameWon = false;
    let gameTKO = false;
    let gameOver = false;
    let levelComplete = false;
    let showingTraining = false;
    let trainingStartTime = 0;
    let victoryType = null; // 'KO', 'TKO', or null
    let gameStarted = false;
    let currentRound = 1;
    let roundTime = punchOutConfig.gameplay?.roundTime || 180;
    let currentFighter = 0;
    let fightStartTime = Date.now(); // Track fight duration for TKO logic
    let cameraFlashTimer = 0; // Timer for camera flashes
    
    // TKO configuration
    const tkoConfig = {
        fastKnockoutTime: 30, // If knocked down within 30 seconds, instant TKO
        baseGetUpTime: 180, // Base time to get up (3 seconds)
        getUpTimeIncrease: 60 // Additional time penalty per knockdown (1 second)
    };
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = punchOutConfig.physics?.canvasWidth || 800;
    canvas.height = punchOutConfig.physics?.canvasHeight || 600;
    const ctx = canvas.getContext('2d');
    
    // Generate static audience positions once (after canvas is created)
    const audience = [];
    const ringTop = canvas.height * 0.3; // Ring starts at 30% from top
    const maxAudienceY = ringTop - 60; // Stay behind the top rope
    
    // Generate faces with more density in back rows
    for (let depth = 0; depth < 1; depth += 0.1) { // 10 depth layers
        const y = 20 + (depth * (maxAudienceY - 20));
        const size = 3 + depth * 15;
        
        // More faces in back rows (smaller faces need more density)
        const facesInRow = Math.floor(60 + (1 - depth) * 40); // 60-100 faces per row
        
        for (let i = 0; i < facesInRow; i++) {
            const expressions = ['happy', 'surprised', 'angry', 'open', 'excited'];
            audience.push({
                x: Math.random() * canvas.width,
                y: y + (Math.random() - 0.5) * 15, // Add some vertical variation
                size: size + (Math.random() - 0.5) * 3, // Add size variation
                skinTone: `hsl(${25 + Math.random() * 35}, ${50 + Math.random() * 30}%, ${35 + Math.random() * 35}%)`,
                expression: expressions[Math.floor(Math.random() * expressions.length)]
            });
        }
    }
    
    // Game objects
    const player = {
        x: punchOutConfig.physics?.playerX || 400,
        y: punchOutConfig.physics?.playerY || 450,
        width: 60,
        height: 100,
        health: punchOutConfig.gameplay?.playerHealth || 100,
        maxHealth: punchOutConfig.gameplay?.playerHealth || 100,
        stamina: punchOutConfig.gameplay?.stamina || 100,
        maxStamina: punchOutConfig.gameplay?.stamina || 100,
        stars: 0,
        maxStars: punchOutConfig.gameplay?.maxStars || 3,
        blocking: false,
        dodging: null, // 'left', 'right', or null
        punching: false,
        punchType: null, // 'low', 'high', 'power', 'star'
        punchHeight: 'body', // 'body' or 'head'
        punchCooldown: 0, // Cooldown timer for punches
        jumping: false,
        jumpHeight: 0,
        animationFrame: 0,
        knockedDown: false,
        knockdownTimer: 0,
        knockdownCount: 0,
        gettingUp: false,
        getUpTimer: 0,
        getUpProgress: 0, // Progress of getting up (0 to 1)
        buttonMashCount: 0, // Count of button presses for getting up
        flashTimer: 0 // Timer for pink flash when hit
    };
    
    const baseFighters = [
        { 
            name: "Glass Joe", 
            health: 60, 
            speed: 0.5, // Slower movement
            patterns: ["jab", "jab", "jab", "jab", "jab", "uppercut"], // Only 1 in 6 attacks is uppercut
            tells: ["blink"],
            bodyShape: "thin"
        },
        { 
            name: "Von Kaiser", 
            health: 80, 
            speed: 0.4, // Slower due to weight
            patterns: ["jab", "jab", "uppercut", "jab"], 
            tells: ["step_back"],
            bodyShape: "fat"
        },
        { 
            name: "Piston Honda", 
            health: 100, 
            speed: 0.7, // Fast and strong
            patterns: ["jab", "uppercut", "jab", "uppercut"], 
            tells: ["crouch"],
            bodyShape: "tough"
        }
    ];
    
    // Merge config fighters with base fighters, ensuring bodyShape is preserved
    const fighters = (punchOutConfig.fighters || baseFighters).map((fighter, index) => ({
        ...baseFighters[index],
        ...fighter,
        bodyShape: fighter.bodyShape || baseFighters[index]?.bodyShape || "tough"
    }));
    
    console.log('Current fighter:', currentFighter, 'Fighter data:', fighters[currentFighter]);
    console.log('Fighter bodyShape:', fighters[currentFighter].bodyShape);
    
    const opponent = {
        x: punchOutConfig.physics?.opponentX || 400,
        y: punchOutConfig.physics?.opponentY || 200,
        targetX: 400, // Target position to walk to
        walkingToPosition: true, // Whether opponent is walking to fighting position
        fightingDistance: 150, // Distance from player to maintain
        width: 80,
        height: 120,
        health: fighters[currentFighter].health,
        maxHealth: fighters[currentFighter].health,
        name: fighters[currentFighter].name,
        bodyShape: fighters[currentFighter].bodyShape || "tough",
        speed: fighters[currentFighter].speed,
        patterns: fighters[currentFighter].patterns,
        tells: fighters[currentFighter].tells,
        currentPattern: 0,
        patternTimer: 0,
        tellTimer: 0,
        attacking: false,
        attackType: null,
        attackHand: null,
        blocking: false,
        blockType: null, // 'high' or 'low'
        blockChance: fighters[currentFighter].blockChance || Math.min(0.2 + currentFighter * 0.15, 0.8), // Use config or progressive blocking skill
        blockPatterns: fighters[currentFighter].blockPatterns || ["none"],
        currentBlockPattern: 0,
        blockPatternTimer: 0,
        danceTimer: 0,
        danceDirection: 1, // 1 for right, -1 for left
        stunned: false,
        stunnedTimer: 0,
        knockedDown: false,
        knockdownTimer: 0,
        knockdownCount: 0,
        gettingUp: false,
        getUpTimer: 0,
        animationFrame: 0
    };
    
    console.log('Opponent initialized with bodyShape:', opponent.bodyShape);
    
    // Input handling
    const keys = {};
    
    function handleKeyDown(e) {
        keys[e.code] = true;
        
        // Debug logging
        console.log('Key pressed:', e.code, 'levelComplete:', levelComplete, 'gameOver:', gameOver);
        
        // Handle restart on game over
        if (gameOver && e.code === 'KeyR') {
            console.log('Restarting game...');
            restartGame();
            return;
        }
        
        // Handle level completion
        if (levelComplete && e.code === 'Space') {
            console.log('Starting training animation...');
            startTrainingAnimation();
            return;
        }
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('punchout');
            }
        }
        
        if (!gameRunning) return;
        
        // Handle button mashing to get up when knocked down
        if (player.knockedDown && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) {
            player.buttonMashCount++;
            // Increase difficulty with each knockdown: 50, 75, 100 button presses
            const requiredPresses = 50 + (player.knockdownCount - 1) * 25;
            player.getUpProgress = Math.min(1, player.buttonMashCount / requiredPresses);
            
            // Move Mac up from bottom of screen based on progress
            const originalY = 450; // Original player Y position
            const knockdownY = 650; // Below screen
            player.y = knockdownY - (knockdownY - originalY) * player.getUpProgress;
            
            // If enough button presses, start getting up
            if (player.getUpProgress >= 1) {
                player.gettingUp = true;
                player.getUpTimer = 60; // 1 second to complete getting up
                player.knockedDown = false;
            }
            return;
        }
        
        // Player controls
        switch(e.code) {
            case 'ArrowLeft':
                if (!player.punching && !player.blocking) {
                    player.dodging = 'left';
                }
                break;
            case 'ArrowRight':
                if (!player.punching && !player.blocking) {
                    player.dodging = 'right';
                }
                break;
            case 'ArrowDown':
                player.blocking = true;
                break;
            case 'ShiftLeft': // Left punch
                if (!player.blocking && !player.dodging && player.stamina > 10 && player.punchCooldown <= 0) {
                    player.punching = true;
                    player.punchCooldown = 45; // 45 frame cooldown (3/4 second)
                    if (keys['ArrowUp']) {
                        // High left punch
                        player.punchType = 'high-left';
                        player.punchHeight = 'head';
                        player.jumping = true;
                        player.jumpHeight = 20;
                        player.stamina -= 15;
                    } else {
                        // Low left punch
                        player.punchType = 'low-left';
                        player.punchHeight = 'body';
                        player.stamina -= 10;
                    }
                }
                break;
            case 'ShiftRight': // Right punch
                if (!player.blocking && !player.dodging && player.stamina > 15 && player.punchCooldown <= 0) {
                    player.punching = true;
                    player.punchCooldown = 45; // 45 frame cooldown (3/4 second)
                    if (keys['ArrowUp']) {
                        // High right punch
                        player.punchType = 'high-right';
                        player.punchHeight = 'head';
                        player.jumping = true;
                        player.jumpHeight = 25;
                        player.stamina -= 20;
                    } else {
                        // Low right punch
                        player.punchType = 'low-right';
                        player.punchHeight = 'body';
                        player.stamina -= 15;
                    }
                }
                break;
        }
    }
    
    function handleKeyUp(e) {
        keys[e.code] = false;
        
        switch(e.code) {
            case 'ArrowLeft':
            case 'ArrowRight':
                player.dodging = null;
                break;
            case 'ArrowDown':
                player.blocking = false;
                break;
        }
    }
    
    function update() {
        if (!gameRunning) return;
        
        // Update camera flash timer
        cameraFlashTimer++;
        
        // Update round timer
        roundTime -= 1/60;
        if (roundTime <= 0) {
            endRound();
            return;
        }
        
        // Update player
        updatePlayer();
        
        // Update opponent
        updateOpponent();
        
        // Update hit effects
        updateHitEffects();
        
        // Check collisions
        checkCollisions();
        
        // Check win/lose conditions
        if (opponent.knockdownCount >= 3 && opponent.knockedDown && opponent.knockdownTimer <= 0) {
            // TKO - opponent couldn't get up after 3 knockdowns
            winFight();
        }
        // Removed player health check - Mac can always get back up when knocked down
    }
    
    // Animation keyframe system
    function getUppercutKeyframe(attackFrame) {
        const totalFrames = 40; // Much faster animation
        const progress = Math.min(attackFrame / totalFrames, 1);
        
        console.log('Uppercut frame:', attackFrame, 'progress:', progress);
        
        // Define keyframes for uppercut animation - VERY dramatic
        const keyframes = [
            { time: 0.0, bodyDuck: 0, gloveY: -15, gloveX: 35 },        // Standing straight
            { time: 0.25, bodyDuck: 80, gloveY: 120, gloveX: 0 },       // DEEP duck, glove WAY down
            { time: 0.5, bodyDuck: 60, gloveY: 40, gloveX: -10 },       // Start rising, glove moving up fast
            { time: 0.75, bodyDuck: 20, gloveY: -80, gloveX: -30 },     // Body rising, glove at face level
            { time: 1.0, bodyDuck: 0, gloveY: -150, gloveX: -60 }       // Full extension, punch WAY up
        ];
        
        // Find the two keyframes to interpolate between
        let startFrame = keyframes[0];
        let endFrame = keyframes[keyframes.length - 1];
        
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
                startFrame = keyframes[i];
                endFrame = keyframes[i + 1];
                break;
            }
        }
        
        // Calculate interpolation factor
        const segmentProgress = (progress - startFrame.time) / (endFrame.time - startFrame.time);
        const t = Math.max(0, Math.min(1, segmentProgress || 0));
        
        // Interpolate between keyframes
        const result = {
            bodyDuck: startFrame.bodyDuck + (endFrame.bodyDuck - startFrame.bodyDuck) * t,
            gloveY: startFrame.gloveY + (endFrame.gloveY - startFrame.gloveY) * t,
            gloveX: startFrame.gloveX + (endFrame.gloveX - startFrame.gloveX) * t
        };
        
        console.log('Keyframe result:', result);
        return result;
    }
    function calculateArmIK(shoulderX, shoulderY, targetX, targetY, upperArmLength = 25, lowerArmLength = 20) {
        const dx = targetX - shoulderX;
        const dy = targetY - shoulderY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clamp distance to prevent overextension - arms maintain fixed lengths
        const maxReach = upperArmLength + lowerArmLength;
        const clampedDistance = Math.min(distance, maxReach);
        
        // If target is too far, move it closer to maintain arm lengths
        let adjustedTargetX = targetX;
        let adjustedTargetY = targetY;
        if (distance > maxReach) {
            const ratio = maxReach / distance;
            adjustedTargetX = shoulderX + dx * ratio;
            adjustedTargetY = shoulderY + dy * ratio;
        }
        
        // Calculate elbow position using law of cosines
        const adjustedDx = adjustedTargetX - shoulderX;
        const adjustedDy = adjustedTargetY - shoulderY;
        const adjustedDistance = Math.sqrt(adjustedDx * adjustedDx + adjustedDy * adjustedDy);
        
        const cosAngle = (upperArmLength * upperArmLength + adjustedDistance * adjustedDistance - lowerArmLength * lowerArmLength) / (2 * upperArmLength * adjustedDistance);
        const angle1 = Math.atan2(adjustedDy, adjustedDx);
        const angle2 = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        
        // Elbow position (bend outward for natural look)
        const elbowAngle = angle1 + angle2;
        const elbowX = shoulderX + Math.cos(elbowAngle) * upperArmLength;
        const elbowY = shoulderY + Math.sin(elbowAngle) * upperArmLength;
        
        return { elbowX, elbowY, targetX: adjustedTargetX, targetY: adjustedTargetY };
    }
    
    function updatePlayer() {
        // Update flash timer
        if (player.flashTimer > 0) {
            player.flashTimer--;
        }
        
        // Handle player knockdown state
        if (player.knockedDown && !player.gettingUp) {
            player.knockdownTimer--;
            
            if (player.knockdownTimer <= 0) {
                // Player couldn't get up in time - game over
                loseFight();
                return;
            }
            return; // Don't process other player actions while knocked down
        }
        
        // Handle getting up animation
        if (player.gettingUp) {
            player.getUpTimer--;
            
            if (player.getUpTimer <= 0) {
                // Successfully got back up
                player.gettingUp = false;
                player.health = Math.min(player.maxHealth, player.health + 30); // Recover some health
                player.buttonMashCount = 0; // Reset button mash count
                player.getUpProgress = 0; // Reset progress
            }
            return; // Don't process other actions while getting up
        }
        
        // Only process normal actions if not knocked down
        if (!player.knockedDown && !player.gettingUp) {
            // Regenerate stamina
            if (player.stamina < player.maxStamina) {
                player.stamina += 0.5;
            }
            
            // Handle jump animation
            if (player.jumping) {
                if (player.jumpHeight > 0) {
                    player.jumpHeight -= 2; // Fall down
                } else {
                    player.jumping = false;
                    player.jumpHeight = 0;
                }
            }
            
            // Handle punch animation
            if (player.punching) {
                player.animationFrame++;
                if (player.animationFrame > 25) { // Increased from 15 to 25 for slower animation
                    player.punching = false;
                    player.punchType = null;
                    player.animationFrame = 0;
                }
            }
            
            // Handle punch cooldown
            if (player.punchCooldown > 0) {
                player.punchCooldown--;
            }
            
            // Handle dodge animation
            if (player.dodging) {
                player.animationFrame++;
                if (player.animationFrame > 20) {
                    player.dodging = null;
                    player.animationFrame = 0;
                }
            }
        }
    }
    
    function updateOpponent() {
        // Handle knockdown state
        if (opponent.knockedDown && !opponent.gettingUp) {
            opponent.knockdownTimer--;
            
            if (opponent.knockdownTimer <= 0) {
                if (opponent.knockdownCount >= 3) {
                    // TKO - opponent can't get up
                    winFight();
                    return;
                } else {
                    // Start getting up
                    opponent.gettingUp = true;
                    opponent.getUpTimer = 180; // 3 seconds to get up
                }
            }
            return;
        }
        
        // Handle getting up animation
        if (opponent.gettingUp) {
            opponent.getUpTimer--;
            console.log('Getting up timer:', opponent.getUpTimer);
            
            if (opponent.getUpTimer <= 0) {
                // Successfully got back up
                console.log('Opponent getting back up - resetting states');
                opponent.gettingUp = false;
                opponent.knockedDown = false;
                opponent.stunned = false;
                opponent.attacking = false;
                opponent.patternTimer = 0;
                opponent.tellTimer = 0;
                opponent.walkingToPosition = true; // Walk back to fighting position
                opponent.health = Math.min(opponent.maxHealth, opponent.health + 20);
                console.log('States after getting up:', {
                    gettingUp: opponent.gettingUp,
                    knockedDown: opponent.knockedDown,
                    health: opponent.health
                });
            }
            // Don't return here - let the function continue to normal AI behavior
        }
        
        // Only do AI behavior if not in special states AND player is not knocked down
        if (!opponent.stunned && !opponent.knockedDown && !opponent.gettingUp && !player.knockedDown) {
            // Handle opponent movement - walk toward fighting position
            if (opponent.walkingToPosition) {
                const targetY = player.y - 160; // Stop 160 pixels above Mac (50 pixels further back)
                const distanceToTarget = Math.abs(opponent.y - targetY);
                
                if (distanceToTarget > 5) {
                    // Walk toward target position (downward toward Mac)
                    const walkSpeed = 2;
                    if (opponent.y > targetY) {
                        opponent.y -= walkSpeed;
                    } else {
                        opponent.y += walkSpeed;
                    }
                } else {
                    // Reached fighting position
                    opponent.walkingToPosition = false;
                }
            }
            
            // Dancing movement when not walking to position
            if (!opponent.walkingToPosition && !opponent.attacking) {
                opponent.danceTimer++;
                
                // Dance left and right
                if (opponent.danceTimer % 120 === 0) { // Change direction every 2 seconds
                    opponent.danceDirection *= -1;
                }
                
                // Move side to side slightly
                const danceAmount = Math.sin(opponent.danceTimer * 0.05) * opponent.danceDirection * 15;
                opponent.x = 400 + danceAmount; // Center position + dance offset
            }
            
            // Block pattern cycling
            opponent.blockPatternTimer++;
            if (opponent.blockPatternTimer > 180) { // Change block pattern every 3 seconds
                opponent.currentBlockPattern = (opponent.currentBlockPattern + 1) % opponent.blockPatterns.length;
                opponent.blockPatternTimer = 0;
                
                // Set current blocking state based on pattern
                const currentPattern = opponent.blockPatterns[opponent.currentBlockPattern];
                if (currentPattern === 'none') {
                    opponent.blocking = false;
                    opponent.blockType = null;
                } else {
                    opponent.blocking = true;
                    opponent.blockType = currentPattern === 'head' ? 'high' : 'low';
                }
            }
            
            // Check if player is punching and decide whether to block (only if not already in pattern block)
            if (player.punching && !opponent.attacking) {
                const currentPattern = opponent.blockPatterns[opponent.currentBlockPattern];
                
                // Only do reactive blocking if current pattern is 'none' and random chance
                if (currentPattern === 'none' && Math.random() < opponent.blockChance) {
                    opponent.blocking = true;
                    // Block high or low based on player's punch type
                    if (player.punchType && player.punchType.includes('high')) {
                        opponent.blockType = 'high';
                    } else {
                        opponent.blockType = 'low';
                    }
                }
            }
            
            // End reactive blocking after punch animation (but keep pattern blocking)
            if (!player.punching) {
                const currentPattern = opponent.blockPatterns[opponent.currentBlockPattern];
                if (currentPattern === 'none') {
                    opponent.blocking = false;
                    opponent.blockType = null;
                }
            }
            
            // AI pattern behavior
            opponent.patternTimer++;
            
            // Show tell before attacking
            if (opponent.patternTimer > 120 && opponent.patternTimer < 150) {
                opponent.tellTimer++;
            }
            
            // Execute attack (delayed for easier difficulty)
            if (opponent.patternTimer > 200) {
                if (!opponent.attacking) {
                    const pattern = opponent.patterns[opponent.currentPattern];
                    executeOpponentAttack(pattern);
                    opponent.attacking = true;
                }
            }
            
            // Reset pattern - longer duration for uppercuts and overall slower
            const pattern = opponent.patterns[opponent.currentPattern];
            const resetTime = pattern === 'uppercut' ? 360 : 300; // Much longer for easier difficulty
            if (opponent.patternTimer > resetTime) {
                opponent.patternTimer = 0;
                opponent.attacking = false;
                opponent.tellTimer = 0;
                opponent.currentPattern = (opponent.currentPattern + 1) % opponent.patterns.length;
            }
        }
    }
    
    function executeOpponentAttack(pattern) {
        console.log('Original pattern:', pattern);
        console.log('Current pattern index:', opponent.currentPattern);
        console.log('Available patterns:', opponent.patterns);
        
        console.log('Final pattern:', pattern);
        
        // Set which hand to use for this attack
        switch(pattern) {
            case 'jab':
                // Quick straight punch - left hand
                opponent.attackHand = 'left';
                if (!player.blocking && !player.dodging) {
                    player.health -= 15;
                }
                break;
            case 'uppercut':
                // Powerful uppercut - always use dominant hand (right)
                opponent.attackHand = 'right';
                console.log('Uppercut with dominant hand:', opponent.attackHand);
                // Damage is handled in collision detection for uppercuts
                break;
            case 'hook':
                // Side punch - right hand
                opponent.attackHand = 'right';
                if (!player.blocking && player.dodging !== 'left') {
                    player.health -= 20;
                }
                break;
            case 'uppercut':
                // Powerful upward punch - right hand
                opponent.attackHand = 'right';
                if (!player.blocking) {
                    player.health -= 25;
                }
                break;
            case 'rush':
                // Multiple quick punches - alternating hands
                opponent.attackHand = 'both';
                if (!player.blocking && !player.dodging) {
                    player.health -= 10;
                }
                break;
        }
    }
    
    function checkCollisions() {
        // Player hitting opponent - simple state check
        if (player.punching && player.animationFrame > 10 && player.animationFrame < 20) { // Adjusted timing for slower animation
            // Check if opponent is vulnerable (not blocking or dodging)
            if (!opponent.stunned && !opponent.knockedDown && !opponent.gettingUp) {
                let damage = 0;
                let hitSuccess = true;
                
                // Check if opponent blocks the punch
                if (opponent.blocking) {
                    const punchHeight = player.punchType && player.punchType.includes('high') ? 'high' : 'low';
                    if (opponent.blockType === punchHeight) {
                        // Successful block
                        hitSuccess = false;
                        // showHitEffect(opponent.x, opponent.y - 40, "BLOCKED!", '#FFFF00');
                        // End the punch early
                        player.punching = false;
                        player.punchType = null;
                        player.animationFrame = 0;
                    }
                }
                
                if (hitSuccess) {
                    switch(player.punchType) {
                        case 'low-left':
                            damage = 8; // Lower damage for body shots
                            if (opponent.tellTimer > 0) {
                                player.stars = Math.min(player.stars + 1, player.maxStars);
                                damage = 12;
                                // showHitEffect(opponent.x, opponent.y - 80, "COUNTER!", '#FFD700');
                            } else {
                                // showHitEffect(opponent.x, opponent.y - 80, "LEFT BODY!", '#FFFFFF');
                            }
                            break;
                        case 'high-left':
                            damage = 12; // Medium damage for head shots
                            if (opponent.tellTimer > 0) {
                                player.stars = Math.min(player.stars + 1, player.maxStars);
                                damage = 18;
                                // showHitEffect(opponent.x, opponent.y - 80, "HEAD COUNTER!", '#FFD700');
                            } else {
                                // showHitEffect(opponent.x, opponent.y - 80, "LEFT HEAD!", '#FFFFFF');
                            }
                            break;
                        case 'low-right':
                            damage = 10; // Right hand hits harder
                            if (opponent.tellTimer > 0) {
                                player.stars = Math.min(player.stars + 1, player.maxStars);
                                damage = 15;
                                // showHitEffect(opponent.x, opponent.y - 80, "RIGHT COUNTER!", '#FFD700');
                            } else {
                                // showHitEffect(opponent.x, opponent.y - 80, "RIGHT BODY!", '#FFFFFF');
                            }
                            break;
                        case 'high-right':
                            damage = 15; // High damage for right head shots
                            if (opponent.tellTimer > 0) {
                                player.stars = Math.min(player.stars + 1, player.maxStars);
                                damage = 22;
                                // showHitEffect(opponent.x, opponent.y - 80, "POWER COUNTER!", '#FFD700');
                            } else {
                                // showHitEffect(opponent.x, opponent.y - 80, "RIGHT HEAD!", '#FF8800');
                            }
                            break;
                    }
                    
                    opponent.health -= damage;
                    opponent.health = Math.max(0, opponent.health);
                    
                    // Check for knockdown
                    if (opponent.health <= 0 || (damage >= 25 && opponent.health <= 30)) {
                        opponent.knockedDown = true;
                        opponent.knockdownCount++;
                        opponent.health = Math.max(1, opponent.health);
                        
                        // Check for fast knockout (instant TKO) - only if player hasn't been knocked down
                        const fightDuration = (Date.now() - fightStartTime) / 1000;
                        if (fightDuration <= tkoConfig.fastKnockoutTime && player.knockdownCount === 0) {
                            // Fast knockout - instant TKO
                            gameRunning = false;
                            gameWon = true;
                            victoryType = 'TKO';
                            
                            // Check if there are more fighters
                            if (currentFighter < fighters.length - 1) {
                                levelComplete = true;
                            } else {
                                // Won all fights - complete game
                                if (callbacks && callbacks.onGameComplete) {
                                    callbacks.onGameComplete('punchout', { completed: true });
                                }
                            }
                            
                            // showHitEffect(opponent.x, opponent.y - 100, "FAST TKO!", '#FFD700');
                        } else {
                            // Normal knockdown - progressive recovery difficulty
                            const baseTime = tkoConfig.baseGetUpTime;
                            const penalty = (opponent.knockdownCount - 1) * tkoConfig.getUpTimeIncrease;
                            opponent.knockdownTimer = baseTime + penalty;
                            
                            // Move opponent to back of ring when knocked down
                            opponent.y = 150; // Back of the ring
                            // showHitEffect(opponent.x, opponent.y - 100, "KNOCKDOWN!", '#FF0000');
                        }
                    }
                    
                    // Prevent multiple hits per punch
                    player.punching = false;
                    player.punchType = null;
                    player.animationFrame = 0;
                }
            }
        }
        
        // Opponent hitting player - simple state check
        if (opponent.attacking && opponent.patternTimer > 220) {
            // Check if player is vulnerable (not blocking or dodging)
            let playerHit = true;
            const pattern = opponent.patterns[opponent.currentPattern];
            
            if (pattern === 'uppercut') {
                // Uppercuts cannot be blocked, only dodged
                if (player.dodging) {
                    playerHit = false; // Dodged the uppercut
                    showHitEffect(player.x, player.y - 50, "DODGED UPPERCUT!", '#00FFFF');
                } else {
                    // Uppercut hits - massive damage
                    player.health -= 25; // Heavy damage
                    showHitEffect(player.x, player.y - 50, "UPPERCUT!", '#FF0000');
                    // Screen shake for dramatic effect
                    ctx.save();
                    ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
                }
            } else if (player.blocking) {
                playerHit = false; // Blocked the attack
                showHitEffect(player.x, player.y - 50, "BLOCKED!", '#00FF00');
            } else if (player.dodging) {
                playerHit = false; // Dodged the attack
                showHitEffect(player.x, player.y - 50, "DODGED!", '#00FFFF');
            }
            
            if (playerHit) {
                let damage = 15;
                player.health -= damage;
                player.health = Math.max(0, player.health);
                
                // Check for player knockdown
                if (player.health <= 0) {
                    player.knockedDown = true;
                    player.knockdownTimer = 600; // 10 seconds to get up
                    player.knockdownCount++;
                    
                    // Player can always get back up - no TKO for Little Mac
                    player.health = 1; // Keep at 1 so player doesn't die immediately
                    player.y = 650; // Move Mac below the screen
                    player.getUpProgress = 0; // Start at bottom
                    showHitEffect(player.x, player.y - 50, "KNOCKDOWN!", '#FF0000');
                } else {
                    // showHitEffect(player.x, player.y - 50, "OUCH!", '#FF0000');
                    player.flashTimer = 20; // Flash pink for 20 frames
                }
            }
            
            // Reset opponent attack
            opponent.attacking = false;
            opponent.patternTimer = 0;
        }
    }
    
    // Hit effect system
    let hitEffects = [];
    let screenShake = 0;
    
    function showHitEffect(x, y, text, color) {
        hitEffects.push({
            x: x,
            y: y,
            text: text,
            color: color,
            timer: 60,
            scale: 1
        });
    }
    
    function updateHitEffects() {
        hitEffects = hitEffects.filter(effect => {
            effect.timer--;
            effect.y -= 2;
            effect.scale += 0.02;
            return effect.timer > 0;
        });
        
        if (screenShake > 0) {
            screenShake--;
        }
    }
    
    function drawHitEffects() {
        hitEffects.forEach(effect => {
            ctx.save();
            ctx.fillStyle = effect.color;
            ctx.font = `bold ${16 * effect.scale}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 5;
            ctx.fillText(effect.text, effect.x, effect.y);
            ctx.restore();
        });
    }
    
    function render() {
        console.log('render called - showingTraining:', showingTraining, 'gameRunning:', gameRunning);
        
        ctx.save();
        
        // Apply screen shake
        if (screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * screenShake;
            const shakeY = (Math.random() - 0.5) * screenShake;
            ctx.translate(shakeX, shakeY);
        }
        
        // Clear canvas with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#000080');
        gradient.addColorStop(0.7, '#000040');
        gradient.addColorStop(1, '#000020');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw arena lights
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for (let i = 0; i < 4; i++) {
            const x = (canvas.width / 5) * (i + 1);
            ctx.beginPath();
            ctx.ellipse(x, 50, 30, 60, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw ring with original Punch-Out perspective (light blue, 70% of screen)
        const ringTop = canvas.height * 0.3; // Ring starts at 30% from top
        const ringBottom = canvas.height; // Ring goes to bottom
        
        // Create perspective trapezoid for the ring floor
        ctx.fillStyle = '#87CEEB'; // Light blue like original
        ctx.beginPath();
        
        // Front edge (bottom) - wider than screen
        const frontWidth = canvas.width * 1.2;
        const frontLeft = (canvas.width - frontWidth) / 2;
        const frontRight = frontLeft + frontWidth;
        
        // Back edge (top) - narrower for perspective
        const backWidth = canvas.width * 0.6;
        const backLeft = (canvas.width - backWidth) / 2;
        const backRight = backLeft + backWidth;
        
        // Draw trapezoid ring floor
        ctx.moveTo(frontLeft, ringBottom);
        ctx.lineTo(frontRight, ringBottom);
        ctx.lineTo(backRight, ringTop);
        ctx.lineTo(backLeft, ringTop);
        ctx.closePath();
        ctx.fill();
        
        // Draw detailed audience with static positioning (before ropes)
        for (let i = 0; i < audience.length; i++) {
            const face = audience[i];
            
            // Face background with stored skin tone
            ctx.fillStyle = face.skinTone;
            ctx.beginPath();
            ctx.arc(face.x, face.y, face.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Only draw facial features on larger faces (closer ones)
            if (face.size > 8) {
                ctx.fillStyle = '#000000';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                
                // Eyes based on expression
                ctx.beginPath();
                if (face.expression === 'surprised') {
                    // Wide open eyes
                    ctx.arc(face.x - face.size/3, face.y - face.size/4, face.size/4, 0, Math.PI * 2);
                    ctx.arc(face.x + face.size/3, face.y - face.size/4, face.size/4, 0, Math.PI * 2);
                } else if (face.expression === 'angry') {
                    // Angled angry eyes
                    ctx.moveTo(face.x - face.size/2, face.y - face.size/3);
                    ctx.lineTo(face.x - face.size/6, face.y - face.size/6);
                    ctx.moveTo(face.x + face.size/6, face.y - face.size/6);
                    ctx.lineTo(face.x + face.size/2, face.y - face.size/3);
                } else {
                    // Normal eyes
                    ctx.arc(face.x - face.size/3, face.y - face.size/4, Math.max(1, face.size/6), 0, Math.PI * 2);
                    ctx.arc(face.x + face.size/3, face.y - face.size/4, Math.max(1, face.size/6), 0, Math.PI * 2);
                }
                ctx.fill();
                ctx.stroke();
                
                // Mouth based on expression
                ctx.beginPath();
                switch(face.expression) {
                    case 'happy':
                    case 'excited':
                        // Smile
                        ctx.arc(face.x, face.y + face.size/3, face.size/4, 0, Math.PI);
                        break;
                    case 'surprised':
                    case 'open':
                        // Open mouth (circle)
                        ctx.arc(face.x, face.y + face.size/3, face.size/6, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case 'angry':
                        // Frown
                        ctx.arc(face.x, face.y + face.size/2, face.size/4, Math.PI, Math.PI * 2);
                        break;
                    default:
                        // Neutral
                        ctx.moveTo(face.x - face.size/6, face.y + face.size/3);
                        ctx.lineTo(face.x + face.size/6, face.y + face.size/3);
                }
                ctx.stroke();
            }
        }
        
        // Draw ring ropes
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        
        // Back ropes (3 horizontal lines above the ring)
        for (let i = 0; i < 3; i++) {
            const ropeY = ringTop - 60 + (i * 20); // Above the ring mat
            ctx.beginPath();
            ctx.moveTo(backLeft, ropeY);
            ctx.lineTo(backRight, ropeY);
            ctx.stroke();
        }
        
        // Left side ropes (3 lines with perspective, matching back rope heights)
        for (let i = 0; i < 3; i++) {
            const ropeTopY = ringTop - 60 + (i * 20); // Same height as back ropes
            const ropeBotY = ringBottom - 100 + (i * 20); // Front height with perspective
            ctx.beginPath();
            ctx.moveTo(backLeft, ropeTopY);
            ctx.lineTo(frontLeft, ropeBotY);
            ctx.stroke();
        }
        
        // Right side ropes (3 lines with perspective, matching back rope heights)
        for (let i = 0; i < 3; i++) {
            const ropeTopY = ringTop - 60 + (i * 20); // Same height as back ropes
            const ropeBotY = ringBottom - 100 + (i * 20); // Front height with perspective
            ctx.beginPath();
            ctx.moveTo(backRight, ropeTopY);
            ctx.lineTo(frontRight, ropeBotY);
            ctx.stroke();
        }
        
        // Draw corner posts (thick bars where ropes connect)
        ctx.fillStyle = '#666666';
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        
        // Back left corner post
        const postWidth = 8;
        const postHeight = 80;
        ctx.fillRect(backLeft - postWidth/2, ringTop - 70, postWidth, postHeight);
        ctx.strokeRect(backLeft - postWidth/2, ringTop - 70, postWidth, postHeight);
        
        // Back right corner post
        ctx.fillRect(backRight - postWidth/2, ringTop - 70, postWidth, postHeight);
        ctx.strokeRect(backRight - postWidth/2, ringTop - 70, postWidth, postHeight);
        
        // Front left corner post (with perspective - taller)
        const frontPostHeight = 120;
        ctx.fillRect(frontLeft - postWidth/2, ringBottom - 110, postWidth, frontPostHeight);
        ctx.strokeRect(frontLeft - postWidth/2, ringBottom - 110, postWidth, frontPostHeight);
        
        // Front right corner post (with perspective - taller)
        ctx.fillRect(frontRight - postWidth/2, ringBottom - 110, postWidth, frontPostHeight);
        ctx.strokeRect(frontRight - postWidth/2, ringBottom - 110, postWidth, frontPostHeight);
        
        
        // Draw random camera flashes
        const numFlashes = 8;
        for (let i = 0; i < numFlashes; i++) {
            // Random flash timing for each camera
            const flashOffset = i * 37; // Different timing for each flash
            const flashCycle = (cameraFlashTimer + flashOffset) % 120; // 2 second cycle
            
            if (flashCycle < 5) { // Flash for 5 frames
                const x = Math.random() * canvas.width;
                const y = 40 + Math.random() * 80;
                const intensity = 1 - (flashCycle / 5); // Fade out
                
                // Bright white flash
                ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
                ctx.beginPath();
                ctx.arc(x, y, 8 + intensity * 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Yellow glow around flash
                ctx.fillStyle = `rgba(255, 255, 0, ${intensity * 0.5})`;
                ctx.beginPath();
                ctx.arc(x, y, 12 + intensity * 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw opponent first (behind player)
        drawOpponent();
        
        // Draw player
        drawPlayer();
        
        // Draw hit effects
        drawHitEffects();
        
        // Draw UI (skip if victory)
        if (!gameWon) {
            drawUI();
        }
        
        // Draw victory overlay
        if (gameWon && victoryType) {
            // Darken the screen slightly
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw victory text
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 72px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(victoryType, canvas.width/2, canvas.height/2 - 40);
            
            // Draw "You Win!" text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 36px "Courier New", monospace';
            ctx.fillText('You Win!', canvas.width/2, canvas.height/2 + 40);
            
            // Show level completion message if applicable
            if (levelComplete) {
                ctx.fillStyle = '#FFFF00';
                ctx.font = 'bold 24px "Courier New", monospace';
                ctx.fillText('Press Spacebar to Face the Next Fighter', canvas.width/2, canvas.height/2 + 100);
            }
        }
        
        // Draw game over overlay
        if (gameOver) {
            // Darken the screen
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw "GAME OVER" text
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 72px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 40);
            
            // Draw restart instruction
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px "Courier New", monospace';
            ctx.fillText('Press R to Restart Game', canvas.width/2, canvas.height/2 + 40);
        }
        
        // Draw training animation
        if (showingTraining) {
            console.log('About to call drawTrainingAnimation');
            drawTrainingAnimation();
        }
        
        ctx.restore();
    }
    
    function drawPlayer() {
        ctx.save();
        
        // Handle knockdown rendering - Mac rises from bottom of screen
        if (player.knockedDown && !player.gettingUp) {
            // Only draw Mac if he's visible (rising from bottom)
            if (player.y < 600) { // Only draw if partially visible
                const playerColor = punchOutConfig.visual?.playerColor || '#FFE4B5';
                
                // Calculate how much of Mac is visible
                const visibleHeight = Math.max(0, 600 - player.y);
                const maxHeight = 100; // Mac's full height
                const heightRatio = Math.min(1, visibleHeight / maxHeight);
                
                // Draw Mac rising from bottom
                ctx.fillStyle = playerColor;
                
                // Body (only visible portion)
                const bodyHeight = 80 * heightRatio;
                ctx.fillRect(player.x - 25, 600 - bodyHeight, 50, bodyHeight);
                
                // Head (only if enough progress)
                if (heightRatio > 0.8) {
                    const headHeight = 40 * Math.max(0, (heightRatio - 0.8) / 0.2);
                    ctx.fillRect(player.x - 20, 600 - bodyHeight - headHeight, 40, headHeight);
                }
                
                // Blue shorts (only if visible)
                if (heightRatio > 0.2) {
                    ctx.fillStyle = '#0000FF';
                    const shortsHeight = Math.min(30, (heightRatio - 0.2) * 150);
                    ctx.fillRect(player.x - 25, 600 - shortsHeight, 50, shortsHeight);
                }
            }
            
            // Button mashing instruction
            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 24px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('MASH LEFT & RIGHT SHIFT!', 400, 300);
            
            // Progress bar
            const barWidth = 200;
            const barHeight = 20;
            const barX = 300;
            const barY = 320;
            
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(barX, barY, barWidth * player.getUpProgress, barHeight);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            // Countdown timer - count 1-10
            const countdown = Math.ceil((600 - player.knockdownTimer) / 60) + 1;
            if (countdown <= 10) {
                ctx.fillStyle = '#FF0000';
                ctx.font = 'bold 48px "Courier New", monospace';
                ctx.fillText(countdown.toString(), 400, 250);
            }
            
            ctx.restore();
            return;
        }
        
        // Handle getting up animation
        if (player.gettingUp) {
            const getUpProgress = 1 - (player.getUpTimer / 60);
            
            ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
            
            // Body getting up gradually
            const standHeight = getUpProgress * player.height;
            ctx.fillRect(player.x - 25, player.y + 40 - standHeight, 50, standHeight);
            
            // Head
            if (getUpProgress > 0.5) {
                ctx.fillRect(player.x - 20, player.y - 40 - (standHeight - 40), 40, 40);
            }
            
            // Getting up text
            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 24px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GETTING UP...', player.x, player.y - 60);
            
            ctx.restore();
            return;
        }
        
        // Normal standing player (only if not knocked down)
        // Apply dodge offset
        let offsetX = 0;
        if (player.dodging === 'left') offsetX = -40;
        if (player.dodging === 'right') offsetX = 40;
        
        const playerCenterX = player.x + offsetX;
        const playerCenterY = player.y - player.height/2 - player.jumpHeight; // Apply jump offset
        
        // Draw player shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(playerCenterX, player.y + 10, 35, 15, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw player body (Little Mac style)
        const basePlayerColor = punchOutConfig.visual?.playerColor || '#FFE4B5';
        const playerColor = player.flashTimer > 0 ? '#FFB6C1' : basePlayerColor; // Pink when flashing
        ctx.fillStyle = playerColor;
        
        // Body
        ctx.fillRect(playerCenterX - 25, playerCenterY - 40, 50, 80);
        
        // Head
        ctx.fillRect(playerCenterX - 20, playerCenterY - 80, 40, 40);
        
        // Shorts
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(playerCenterX - 25, playerCenterY + 20, 50, 30);
        
        // Gloves - show different states
        ctx.fillStyle = '#FF0000';
        const gloveSize = 18;
        
        if (gameWon && victoryType) {
            // Victory celebration - arms raised high above head
            ctx.fillStyle = playerColor;
            // Left arm raised
            ctx.fillRect(playerCenterX - 35, playerCenterY - 85, 8, 30);
            // Right arm raised  
            ctx.fillRect(playerCenterX + 27, playerCenterY - 85, 8, 30);
            
            // Gloves above head
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(playerCenterX - 40, playerCenterY - 90, gloveSize, gloveSize);
            ctx.fillRect(playerCenterX + 22, playerCenterY - 90, gloveSize, gloveSize);
        } else if (player.punching) {
            // Animated punch with proper arms - punches go FORWARD toward opponent from very top of torso
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 5;
            
            const punchExtend = Math.sin(player.animationFrame * 0.4) * 60; // Slower animation (0.4 vs 0.8)
            
            if (player.punchType === 'low-left') {
                // Low left punch - left hand forward, right hand back and lower
                ctx.fillStyle = playerColor;
                ctx.fillRect(playerCenterX - 30, playerCenterY - 55 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillRect(playerCenterX + 27, playerCenterY - 35, 8, 15); // Right arm below glove
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 35, playerCenterY - 60 - punchExtend, gloveSize, gloveSize);
                ctx.fillRect(playerCenterX + 22, playerCenterY - 40, gloveSize, gloveSize); // Right glove lower
            } else if (player.punchType === 'high-left') {
                // High left punch - left hand forward, right hand back and lower
                ctx.fillStyle = playerColor;
                ctx.fillRect(playerCenterX - 30, playerCenterY - 65 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillRect(playerCenterX + 27, playerCenterY - 35, 8, 15); // Right arm below glove
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 35, playerCenterY - 70 - punchExtend, gloveSize, gloveSize);
                ctx.fillRect(playerCenterX + 22, playerCenterY - 40, gloveSize, gloveSize); // Right glove lower
            } else if (player.punchType === 'low-right') {
                // Low right punch - right hand forward, left hand back and lower
                ctx.fillStyle = playerColor;
                ctx.fillRect(playerCenterX - 35, playerCenterY - 35, 8, 15); // Left arm below glove
                ctx.fillRect(playerCenterX + 22, playerCenterY - 55 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 40, playerCenterY - 40, gloveSize, gloveSize); // Left glove lower
                ctx.fillRect(playerCenterX + 17, playerCenterY - 60 - punchExtend, gloveSize, gloveSize);
            } else if (player.punchType === 'high-right') {
                // High right punch - right hand forward, left hand back and lower
                ctx.fillStyle = playerColor;
                ctx.fillRect(playerCenterX - 35, playerCenterY - 35, 8, 15); // Left arm below glove
                ctx.fillRect(playerCenterX + 22, playerCenterY - 65 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 40, playerCenterY - 40, gloveSize, gloveSize); // Left glove lower
                ctx.fillRect(playerCenterX + 17, playerCenterY - 70 - punchExtend, gloveSize, gloveSize);
            }
            
            ctx.shadowBlur = 0;
        } else {
            // Normal stance - arms at shoulder level
            ctx.fillStyle = playerColor;
            ctx.fillRect(playerCenterX - 35, playerCenterY - 45, 25, 6); // Left arm at shoulder
            ctx.fillRect(playerCenterX + 10, playerCenterY - 45, 25, 6); // Right arm at shoulder
            // Bent arm segments below gloves
            ctx.fillRect(playerCenterX - 35, playerCenterY - 35, 8, 15); // Left forearm
            ctx.fillRect(playerCenterX + 27, playerCenterY - 35, 8, 15); // Right forearm
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(playerCenterX - 40, playerCenterY - 50, gloveSize, gloveSize); // Left glove
            ctx.fillRect(playerCenterX + 22, playerCenterY - 50, gloveSize, gloveSize); // Right glove
        }
        
        // Draw blocking stance with shield effect
        if (player.blocking) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#FFFF00';
            ctx.shadowBlur = 15;
            
            // Shield effect
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY - 20, 60, 0, Math.PI * 2);
            ctx.stroke();
            
            // Gloves up in blocking position
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(playerCenterX - 35, playerCenterY - 50, gloveSize, gloveSize);
            ctx.fillRect(playerCenterX + 17, playerCenterY - 50, gloveSize, gloveSize);
            
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
    
    function drawOpponentBody(centerX, centerY, bodyShape) {
        console.log('Drawing body shape:', bodyShape);
        
        switch(bodyShape) {
            case "thin":
                console.log('Drawing thin body');
                // Thin body - narrow trapezoid
                ctx.beginPath();
                ctx.moveTo(centerX - 25, centerY - 60); // Narrow shoulders
                ctx.lineTo(centerX + 25, centerY - 60);
                ctx.lineTo(centerX + 20, centerY + 20); // Very narrow waist
                ctx.lineTo(centerX - 20, centerY + 20);
                ctx.closePath();
                ctx.fill();
                
                // Thin chest line
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - 50);
                ctx.lineTo(centerX, centerY - 10);
                ctx.stroke();
                break;
                
            case "fat":
                console.log('Drawing fat body');
                // Fat body - draw basic torso first, belly will be drawn after shorts
                ctx.beginPath();
                ctx.moveTo(centerX - 35, centerY - 60); // Shoulders
                ctx.lineTo(centerX + 35, centerY - 60);
                ctx.lineTo(centerX + 25, centerY + 20); // Waist
                ctx.lineTo(centerX - 25, centerY + 20);
                ctx.closePath();
                ctx.fill();
                
                // No chest definition for fat body
                break;
                
            case "tough":
            default:
                console.log('Drawing tough body');
                // Tough body - much larger wide trapezoid
                ctx.beginPath();
                ctx.moveTo(centerX - 65, centerY - 80); // Much wider shoulders
                ctx.lineTo(centerX + 65, centerY - 80);
                ctx.lineTo(centerX + 40, centerY + 40); // Much longer torso
                ctx.lineTo(centerX - 40, centerY + 40);
                ctx.closePath();
                ctx.fill();
                
                // Chest definition - bigger
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - 70);
                ctx.lineTo(centerX, centerY - 10);
                ctx.stroke();
                break;
        }
    }
    
    function drawOpponent() {
        ctx.save();
        
        // Calculate stepping during attacks
        let stepOffset = 0;
        let duckOffset = 0;
        if (opponent.attacking) {
            const attackFrame = opponent.patternTimer - 200;
            const attackProgress = Math.sin(attackFrame * 0.3);
            stepOffset = Math.abs(attackProgress) * 20; // Step forward during punch
            
            // Add keyframe-based ducking for uppercuts
            const pattern = opponent.patterns[opponent.currentPattern];
            if (pattern === 'uppercut') {
                const keyframe = getUppercutKeyframe(attackFrame);
                duckOffset = keyframe.bodyDuck; // Use keyframe ducking value
            }
        }
        
        const opponentCenterX = opponent.x;
        const opponentCenterY = opponent.y + stepOffset + duckOffset; // Step forward AND duck based on keyframes
        
        // Debug logging
        if (opponent.knockedDown || opponent.gettingUp) {
            console.log('Opponent states:', {
                knockedDown: opponent.knockedDown,
                gettingUp: opponent.gettingUp,
                getUpTimer: opponent.getUpTimer
            });
        }
        
        // Draw opponent shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(opponentCenterX, opponentCenterY + 80, 45, 20, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Handle knockdown animation
        if (opponent.knockedDown && !opponent.gettingUp) {
            // Draw opponent lying down - simple and clean
            const opponentColor = punchOutConfig.visual?.opponentColor || '#D2691E';
            
            // Main body lying horizontally
            ctx.fillStyle = opponentColor;
            ctx.fillRect(opponentCenterX - 50, opponentCenterY + 45, 100, 30);
            
            // Head
            ctx.fillRect(opponentCenterX + 45, opponentCenterY + 35, 30, 30);
            
            // Purple shorts
            ctx.fillStyle = '#800080';
            ctx.fillRect(opponentCenterX - 30, opponentCenterY + 60, 40, 15);
            
            // Simple splayed arms
            ctx.fillStyle = opponentColor;
            ctx.fillRect(opponentCenterX - 70, opponentCenterY + 30, 30, 10); // Left arm
            ctx.fillRect(opponentCenterX + 50, opponentCenterY + 20, 30, 10); // Right arm
            
            // Black gloves
            ctx.fillStyle = '#000000';
            ctx.fillRect(opponentCenterX - 75, opponentCenterY + 25, 12, 12); // Left glove
            ctx.fillRect(opponentCenterX + 75, opponentCenterY + 15, 12, 12); // Right glove
            
            // X eyes (knocked out)
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Left eye X
            ctx.moveTo(opponentCenterX + 50, opponentCenterY + 42);
            ctx.lineTo(opponentCenterX + 56, opponentCenterY + 48);
            ctx.moveTo(opponentCenterX + 56, opponentCenterY + 42);
            ctx.lineTo(opponentCenterX + 50, opponentCenterY + 48);
            // Right eye X
            ctx.moveTo(opponentCenterX + 62, opponentCenterY + 42);
            ctx.lineTo(opponentCenterX + 68, opponentCenterY + 48);
            ctx.moveTo(opponentCenterX + 68, opponentCenterY + 42);
            ctx.lineTo(opponentCenterX + 62, opponentCenterY + 48);
            ctx.stroke();
            
            // Knocked out stars
            for (let i = 0; i < 3; i++) {
                const angle = (Date.now() * 0.005 + i * 2) % (Math.PI * 2);
                const starX = opponentCenterX + Math.cos(angle) * 60;
                const starY = opponentCenterY + 10 + Math.sin(angle) * 20;
                ctx.fillStyle = '#FFFF00';
                drawStar(starX, starY, 6);
            }
            
            // Countdown timer - only show if not TKO'd and count 1-10
            if (!gameWon) {
                const maxTime = tkoConfig.baseGetUpTime + (opponent.knockdownCount - 1) * tkoConfig.getUpTimeIncrease;
                const countdown = Math.ceil((maxTime - opponent.knockdownTimer) / 60) + 1;
                if (countdown <= 10) {
                    ctx.fillStyle = '#FF0000';
                    ctx.font = 'bold 48px "Courier New", monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(countdown.toString(), opponentCenterX, opponentCenterY - 30);
                }
            }
            
            ctx.restore();
            return;
        }
        
        // Handle getting up animation
        if (opponent.gettingUp) {
            const getUpProgress = 1 - (opponent.getUpTimer / 180);
            const standHeight = getUpProgress * opponent.height;
            
            ctx.fillStyle = punchOutConfig.visual?.opponentColor || '#D2691E';
            
            // Body getting up gradually
            ctx.fillRect(opponentCenterX - 40, opponentCenterY + 60 - standHeight, 80, standHeight);
            
            // Head
            if (getUpProgress > 0.5) {
                ctx.fillRect(opponentCenterX - 35, opponentCenterY - 60 - (standHeight - 60), 70, 60);
            }
            
            // Getting up text
            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 24px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GETTING UP...', opponentCenterX, opponentCenterY - 100);
        }
        // Normal standing opponent (draw when not knocked down and not getting up)
        else if (!opponent.knockedDown) {
        let opponentColor = punchOutConfig.visual?.opponentColor || '#D2691E';
        
        // Set skin tone based on body shape
        if (opponent.bodyShape === "thin") {
            opponentColor = '#F5DEB3'; // White/pale skin tone for Glass Joe
        } else if (opponent.bodyShape === "tough") {
            opponentColor = '#8B4513'; // Darker skin tone for Piston Honda
        }
        
        if (opponent.stunned) {
            opponentColor = '#FFFF00'; // Yellow when stunned
            // Add dizzy stars
            for (let i = 0; i < 3; i++) {
                const angle = (Date.now() * 0.01 + i * 2) % (Math.PI * 2);
                const starX = opponentCenterX + Math.cos(angle) * 50;
                const starY = opponentCenterY - 80 + Math.sin(angle) * 20;
                ctx.fillStyle = '#FFFF00';
                drawStar(starX, starY, 6);
            }
        }
        
        // Draw opponent body based on body shape
        ctx.fillStyle = opponentColor;
        drawOpponentBody(opponentCenterX, opponentCenterY, opponent.bodyShape);
        
        // Head and facial features based on body shape
        ctx.fillStyle = opponentColor;
        
        if (opponent.bodyShape === "thin") {
            // Thinner head for Glass Joe
            ctx.fillRect(opponentCenterX - 15, opponentCenterY - 100, 30, 40);
        } else if (opponent.bodyShape === "tough") {
            // Much bigger head for Piston Honda
            ctx.fillRect(opponentCenterX - 30, opponentCenterY - 120, 60, 60);
        } else {
            // Normal head for other fighters
            ctx.fillRect(opponentCenterX - 20, opponentCenterY - 100, 40, 40);
        }
        
        // Facial features - more fearsome
        ctx.fillStyle = '#000000';
        // Angry eyes (angled downward)
        ctx.beginPath();
        ctx.moveTo(opponentCenterX - 15, opponentCenterY - 92);
        ctx.lineTo(opponentCenterX - 8, opponentCenterY - 88);
        ctx.lineTo(opponentCenterX - 8, opponentCenterY - 85);
        ctx.lineTo(opponentCenterX - 15, opponentCenterY - 89);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(opponentCenterX + 8, opponentCenterY - 88);
        ctx.lineTo(opponentCenterX + 15, opponentCenterY - 92);
        ctx.lineTo(opponentCenterX + 15, opponentCenterY - 89);
        ctx.lineTo(opponentCenterX + 8, opponentCenterY - 85);
        ctx.closePath();
        ctx.fill();
        // Angry eyebrows
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(opponentCenterX - 18, opponentCenterY - 95);
        ctx.lineTo(opponentCenterX - 5, opponentCenterY - 90);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(opponentCenterX + 5, opponentCenterY - 90);
        ctx.lineTo(opponentCenterX + 18, opponentCenterY - 95);
        ctx.stroke();
        // Larger, more aggressive nose
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(opponentCenterX, opponentCenterY - 82);
        ctx.lineTo(opponentCenterX - 3, opponentCenterY - 74);
        ctx.lineTo(opponentCenterX + 3, opponentCenterY - 74);
        ctx.closePath();
        ctx.fill();
        // Scowling mouth
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(opponentCenterX, opponentCenterY - 68, 8, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
        
        // Shorts - size based on body shape
        ctx.fillStyle = '#800080';
        switch(opponent.bodyShape) {
            case "thin":
                ctx.fillRect(opponentCenterX - 20, opponentCenterY + 30, 40, 40); // Extra narrow shorts
                break;
            case "fat":
                ctx.fillRect(opponentCenterX - 50, opponentCenterY + 20, 100, 50); // Wide shorts
                break;
            case "tough":
            default:
                ctx.fillRect(opponentCenterX - 50, opponentCenterY + 50, 100, 50); // Much bigger shorts
                break;
        }
        
        // Draw fat belly details after shorts (so belly appears in front)
        if (opponent.bodyShape === "fat") {
            ctx.fillStyle = opponentColor;
            
            // Large belly that overlaps shorts
            ctx.beginPath();
            ctx.ellipse(opponentCenterX, opponentCenterY - 5, 65, 55, 0, 0, 2 * Math.PI);
            ctx.fill();
            
            // Man boob crease arcs - bottom corners
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            // Left man boob arc - bottom left corner
            ctx.beginPath();
            ctx.arc(opponentCenterX - 25, opponentCenterY - 35, 12, Math.PI * 0.3, Math.PI * 0.7);
            ctx.stroke();
            // Right man boob arc - bottom right corner
            ctx.beginPath();
            ctx.arc(opponentCenterX + 25, opponentCenterY - 35, 12, Math.PI * 0.3, Math.PI * 0.7);
            ctx.stroke();
            
            // Belly button - lower on the belly
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(opponentCenterX, opponentCenterY + 10, 3, 2, 0, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Opponent arms and gloves
        const armColor = opponentColor; // Same color as body
        const opponentGloveSize = opponent.bodyShape === "tough" ? 35 : 25; // Bigger gloves for tough fighters
        
        if (opponent.attacking) {
            // Animated attack with inverse kinematics and stepping
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 15;
            ctx.lineCap = 'round';
            
            const attackFrame = opponent.patternTimer - 200;
            const attackProgress = Math.sin(attackFrame * 0.3);
            const attackExtend = attackProgress * 60; // Reduced extension
            
            // Step forward during punch, step back after
            const stepDistance = Math.abs(attackProgress) * 15;
            const currentOpponentY = opponentCenterY; // Already adjusted in drawOpponent function
            
            // Shoulder positions (adjusted for stepping)
            const leftShoulderX = opponentCenterX - 35;
            const leftShoulderY = currentOpponentY - 50;
            const rightShoulderX = opponentCenterX + 35;
            const rightShoulderY = currentOpponentY - 50;
            
            // Different animations based on attack pattern
            const pattern = opponent.patterns[opponent.currentPattern];
            console.log('Drawing attack pattern:', pattern, 'with hand:', opponent.attackHand);
            
            if (pattern === 'jab') {
                if (opponent.attackHand === 'left') {
                    // Left jab - punch downward toward Little Mac
                    const targetX = opponentCenterX - 10;
                    const targetY = currentOpponentY + 40 + attackExtend; // Downward toward Mac
                    const leftIK = calculateArmIK(leftShoulderX, leftShoulderY, targetX, targetY);
                    
                    // Draw punching arm with IK
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 12;
                    ctx.beginPath();
                    ctx.moveTo(leftShoulderX, leftShoulderY);
                    ctx.lineTo(leftIK.elbowX, leftIK.elbowY);
                    ctx.stroke();
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(leftIK.elbowX, leftIK.elbowY);
                    ctx.lineTo(leftIK.targetX, leftIK.targetY);
                    ctx.stroke();
                    
                    ctx.strokeStyle = armColor;
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    ctx.moveTo(leftShoulderX, leftShoulderY);
                    ctx.lineTo(leftIK.elbowX, leftIK.elbowY);
                    ctx.stroke();
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(leftIK.elbowX, leftIK.elbowY);
                    ctx.lineTo(leftIK.targetX, leftIK.targetY);
                    ctx.stroke();
                    
                    // Right arm in guard position
                    const rightElbowX = opponentCenterX + 50;
                    const rightElbowY = currentOpponentY - 30;
                    const rightGloveX = opponentCenterX + 35;
                    const rightGloveY = currentOpponentY - 15;
                    
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 12;
                    ctx.beginPath();
                    ctx.moveTo(rightShoulderX, rightShoulderY);
                    ctx.lineTo(rightElbowX, rightElbowY);
                    ctx.stroke();
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(rightElbowX, rightElbowY);
                    ctx.lineTo(rightGloveX, rightGloveY);
                    ctx.stroke();
                    
                    ctx.strokeStyle = armColor;
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    ctx.moveTo(rightShoulderX, rightShoulderY);
                    ctx.lineTo(rightElbowX, rightElbowY);
                    ctx.stroke();
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(rightElbowX, rightElbowY);
                    ctx.lineTo(rightGloveX, rightGloveY);
                    ctx.stroke();
                    
                    // Gloves
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(leftIK.targetX - opponentGloveSize/2, leftIK.targetY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
                    ctx.fillRect(rightGloveX - opponentGloveSize/2, rightGloveY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
                } else {
                    // Right jab - punch downward toward Little Mac
                    const targetX = opponentCenterX + 10;
                    const targetY = currentOpponentY + 40 + attackExtend; // Downward toward Mac
                    const rightIK = calculateArmIK(rightShoulderX, rightShoulderY, targetX, targetY);
                    
                    // Left arm in guard position
                    const leftElbowX = opponentCenterX - 50;
                    const leftElbowY = currentOpponentY - 30;
                    const leftGloveX = opponentCenterX - 35;
                    const leftGloveY = currentOpponentY - 15;
                    
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 12;
                    ctx.beginPath();
                    ctx.moveTo(leftShoulderX, leftShoulderY);
                    ctx.lineTo(leftElbowX, leftElbowY);
                    ctx.stroke();
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(leftElbowX, leftElbowY);
                    ctx.lineTo(leftGloveX, leftGloveY);
                    ctx.stroke();
                    
                    ctx.strokeStyle = armColor;
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    ctx.moveTo(leftShoulderX, leftShoulderY);
                    ctx.lineTo(leftElbowX, leftElbowY);
                    ctx.stroke();
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(leftElbowX, leftElbowY);
                    ctx.lineTo(leftGloveX, leftGloveY);
                    ctx.stroke();
                    
                    // Draw punching arm with IK
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 12;
                    ctx.beginPath();
                    ctx.moveTo(rightShoulderX, rightShoulderY);
                    ctx.lineTo(rightIK.elbowX, rightIK.elbowY);
                    ctx.stroke();
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(rightIK.elbowX, rightIK.elbowY);
                    ctx.lineTo(rightIK.targetX, rightIK.targetY);
                    ctx.stroke();
                    
                    ctx.strokeStyle = armColor;
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    ctx.moveTo(rightShoulderX, rightShoulderY);
                    ctx.lineTo(rightIK.elbowX, rightIK.elbowY);
                    ctx.stroke();
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(rightIK.elbowX, rightIK.elbowY);
                    ctx.lineTo(rightIK.targetX, rightIK.targetY);
                    ctx.stroke();
                    
                    // Gloves
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(leftGloveX - opponentGloveSize/2, leftGloveY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
                    ctx.fillRect(rightIK.targetX - opponentGloveSize/2, rightIK.targetY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
                }
            } else if (pattern === 'uppercut') {
                // Uppercut with proper keyframe animation
                const keyframe = getUppercutKeyframe(attackFrame);
                console.log('Using keyframe for uppercut:', keyframe);
                
                // Apply keyframe values - glove position is RELATIVE to the ducked body position
                const uppercutTargetX = opponentCenterX + keyframe.gloveX;
                const uppercutTargetY = opponentCenterY - 50 + keyframe.gloveY; // Relative to shoulder, not screen
                
                console.log('Uppercut target:', uppercutTargetX, uppercutTargetY);
                
                // Right uppercut only (dominant hand) with keyframe-based IK
                const rightIK = calculateArmIK(rightShoulderX, rightShoulderY, uppercutTargetX, uppercutTargetY);
                
                // Left arm stays in guard
                const leftElbowX = opponentCenterX - 50;
                const leftElbowY = currentOpponentY - 30;
                const leftGloveX = opponentCenterX - 35;
                const leftGloveY = currentOpponentY - 15;
                
                // Draw left guard arm
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.moveTo(leftShoulderX, leftShoulderY);
                ctx.lineTo(leftElbowX, leftElbowY);
                ctx.stroke();
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(leftElbowX, leftElbowY);
                ctx.lineTo(leftGloveX, leftGloveY);
                ctx.stroke();
                
                ctx.strokeStyle = armColor;
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(leftShoulderX, leftShoulderY);
                ctx.lineTo(leftElbowX, leftElbowY);
                ctx.stroke();
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(leftElbowX, leftElbowY);
                ctx.lineTo(leftGloveX, leftGloveY);
                ctx.stroke();
                
                // Draw uppercut arm (right hand) with keyframe animation
                const intensity = Math.min(1, attackFrame / 30); // Build intensity over time
                ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + intensity * 0.5})`;
                ctx.lineWidth = 14 + intensity * 4; // Arm gets thicker as punch builds
                ctx.beginPath();
                ctx.moveTo(rightShoulderX, rightShoulderY);
                ctx.lineTo(rightIK.elbowX, rightIK.elbowY);
                ctx.stroke();
                ctx.lineWidth = 10 + intensity * 4;
                ctx.beginPath();
                ctx.moveTo(rightIK.elbowX, rightIK.elbowY);
                ctx.lineTo(rightIK.targetX, rightIK.targetY);
                ctx.stroke();
                
                ctx.strokeStyle = armColor;
                ctx.lineWidth = 12 + intensity * 2;
                ctx.beginPath();
                ctx.moveTo(rightShoulderX, rightShoulderY);
                ctx.lineTo(rightIK.elbowX, rightIK.elbowY);
                ctx.stroke();
                ctx.lineWidth = 8 + intensity * 2;
                ctx.beginPath();
                ctx.moveTo(rightIK.elbowX, rightIK.elbowY);
                ctx.lineTo(rightIK.targetX, rightIK.targetY);
                ctx.stroke();
                
                // Gloves with intensity-based effects
                ctx.fillStyle = '#000000';
                ctx.fillRect(leftGloveX - opponentGloveSize/2, leftGloveY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
                
                // Uppercut glove with progressive effects
                const glowIntensity = intensity * 15;
                ctx.fillStyle = `rgba(255, 0, 0, ${0.7 + intensity * 0.3})`;
                ctx.shadowColor = '#FF0000';
                ctx.shadowBlur = glowIntensity;
                const gloveSize = opponentGloveSize + intensity * 8;
                ctx.fillRect(rightIK.targetX - gloveSize/2, rightIK.targetY - gloveSize/2, gloveSize, gloveSize);
                ctx.shadowBlur = 0;
            } else {
                // Default punch animation - punch downward toward Mac
                const defaultTargetX = opponentCenterX;
                const defaultTargetY = currentOpponentY + 50 + attackExtend; // Downward toward Mac
                const leftIK = calculateArmIK(leftShoulderX, leftShoulderY, defaultTargetX - 15, defaultTargetY);
                const rightIK = calculateArmIK(rightShoulderX, rightShoulderY, defaultTargetX + 15, defaultTargetY);
                
                // Draw both arms with IK
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.moveTo(leftShoulderX, leftShoulderY);
                ctx.lineTo(leftIK.elbowX, leftIK.elbowY);
                ctx.moveTo(rightShoulderX, rightShoulderY);
                ctx.lineTo(rightIK.elbowX, rightIK.elbowY);
                ctx.stroke();
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(leftIK.elbowX, leftIK.elbowY);
                ctx.lineTo(leftIK.targetX, leftIK.targetY);
                ctx.moveTo(rightIK.elbowX, rightIK.elbowY);
                ctx.lineTo(rightIK.targetX, rightIK.targetY);
                ctx.stroke();
                
                ctx.strokeStyle = armColor;
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(leftShoulderX, leftShoulderY);
                ctx.lineTo(leftIK.elbowX, leftIK.elbowY);
                ctx.moveTo(rightShoulderX, rightShoulderY);
                ctx.lineTo(rightIK.elbowX, rightIK.elbowY);
                ctx.stroke();
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(leftIK.elbowX, leftIK.elbowY);
                ctx.lineTo(leftIK.targetX, leftIK.targetY);
                ctx.moveTo(rightIK.elbowX, rightIK.elbowY);
                ctx.lineTo(rightIK.targetX, rightIK.targetY);
                ctx.stroke();
                
                // Gloves
                ctx.fillStyle = '#000000';
                ctx.fillRect(leftIK.targetX - opponentGloveSize/2, leftIK.targetY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
                ctx.fillRect(rightIK.targetX - opponentGloveSize/2, rightIK.targetY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
            }
            
            ctx.shadowBlur = 0;
        } else {
            // Normal stance or blocking - arms like Little Mac
            if (opponent.blocking) {
                // Blocking stance - gloves positioned defensively
                ctx.fillStyle = armColor;
                if (opponent.blockType === 'high') {
                    // High block - arms up near head
                    ctx.fillRect(opponentCenterX - 35, opponentCenterY - 90, 25, 6); // Left arm
                    ctx.fillRect(opponentCenterX + 10, opponentCenterY - 90, 25, 6); // Right arm
                    ctx.fillRect(opponentCenterX - 30, opponentCenterY - 80, 8, 15); // Left forearm
                    ctx.fillRect(opponentCenterX + 22, opponentCenterY - 80, 8, 15); // Right forearm
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX - 35, opponentCenterY - 95, opponentGloveSize, opponentGloveSize);
                    ctx.fillRect(opponentCenterX + 10, opponentCenterY - 95, opponentGloveSize, opponentGloveSize);
                } else {
                    // Low block - arms down near body
                    ctx.fillRect(opponentCenterX - 35, opponentCenterY - 30, 25, 6); // Left arm
                    ctx.fillRect(opponentCenterX + 10, opponentCenterY - 30, 25, 6); // Right arm
                    ctx.fillRect(opponentCenterX - 30, opponentCenterY - 20, 8, 15); // Left forearm
                    ctx.fillRect(opponentCenterX + 22, opponentCenterY - 20, 8, 15); // Right forearm
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX - 35, opponentCenterY - 25, opponentGloveSize, opponentGloveSize);
                    ctx.fillRect(opponentCenterX + 10, opponentCenterY - 25, opponentGloveSize, opponentGloveSize);
                }
            } else {
                // Normal stance - anatomically correct angled arms
                ctx.lineCap = 'round';
                
                // Left arm system (shoulder -> elbow -> glove)
                const leftShoulderX = opponentCenterX - 35;
                const leftShoulderY = opponentCenterY - 50;
                const leftElbowX = opponentCenterX - 50; // Angled out from body
                const leftElbowY = opponentCenterY - 30;
                const leftGloveX = opponentCenterX - 35; // Angled back in toward body
                const leftGloveY = opponentCenterY - 15;
                
                // Right arm system (shoulder -> elbow -> glove)
                const rightShoulderX = opponentCenterX + 35;
                const rightShoulderY = opponentCenterY - 50;
                const rightElbowX = opponentCenterX + 50; // Angled out from body
                const rightElbowY = opponentCenterY - 30;
                const rightGloveX = opponentCenterX + 35; // Angled back in toward body
                const rightGloveY = opponentCenterY - 15;
                
                // Draw arms with muscle definition (no thick black outlines)
                ctx.strokeStyle = armColor;
                // Left arm - thicker upper arm
                ctx.lineWidth = 10; // Muscular upper arm
                ctx.beginPath();
                ctx.moveTo(leftShoulderX, leftShoulderY);
                ctx.lineTo(leftElbowX, leftElbowY);
                ctx.stroke();
                ctx.lineWidth = 6; // Thinner lower arm
                ctx.beginPath();
                ctx.moveTo(leftElbowX, leftElbowY);
                ctx.lineTo(leftGloveX, leftGloveY);
                ctx.stroke();
                
                // Right arm - thicker upper arm
                ctx.lineWidth = 10; // Muscular upper arm
                ctx.beginPath();
                ctx.moveTo(rightShoulderX, rightShoulderY);
                ctx.lineTo(rightElbowX, rightElbowY);
                ctx.stroke();
                ctx.lineWidth = 6; // Thinner lower arm
                ctx.beginPath();
                ctx.moveTo(rightElbowX, rightElbowY);
                ctx.lineTo(rightGloveX, rightGloveY);
                ctx.stroke();
                
                // Gloves
                ctx.fillStyle = '#000000';
                ctx.fillRect(leftGloveX - opponentGloveSize/2, leftGloveY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
                ctx.fillRect(rightGloveX - opponentGloveSize/2, rightGloveY - opponentGloveSize/2, opponentGloveSize, opponentGloveSize);
            }
        }
        
        // Tell indicator system removed - will be fixed later
        
        } // Close the else if (!opponent.knockedDown) block
        
        ctx.restore();
    }
    
    function drawStar(x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
            const x1 = Math.cos(angle) * size;
            const y1 = Math.sin(angle) * size;
            const x2 = Math.cos(angle + Math.PI / 5) * size * 0.5;
            const y2 = Math.sin(angle + Math.PI / 5) * size * 0.5;
            
            if (i === 0) ctx.moveTo(x1, y1);
            else ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    function drawUI() {
        // Fighter game style UI layout
        
        // Left side - Little Mac
        drawFighterUI(20, 20, player, 'LITTLE MAC', true);
        
        // Right side - Opponent
        drawFighterUI(canvas.width - 320, 20, opponent, opponent.name.toUpperCase(), false);
        
        // Center - Round and time info
        drawCenterUI();
        
        // Bottom - Controls
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('L-Shift: Left Punch  R-Shift: Right Punch  +↑: High Punch  ↓: Block  ←→: Dodge', canvas.width/2, canvas.height - 20);
        ctx.textAlign = 'left';
    }
    
    function drawFighterUI(x, y, fighter, name, isPlayer) {
        // Background panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 300, 120);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 300, 120);
        
        // Fighter name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = isPlayer ? 'left' : 'right';
        const nameX = isPlayer ? x + 10 : x + 290;
        ctx.fillText(name, nameX, y + 30);
        
        // Health bar
        const healthY = y + 50;
        drawFighterHealthBar(x + 10, healthY, fighter.health, fighter.maxHealth, isPlayer);
        
        if (isPlayer) {
            // Stamina bar for player only
            const staminaY = y + 90;
            drawFighterStaminaBar(x + 10, staminaY, fighter.stamina, fighter.maxStamina);
        } else {
            // Opponent knockdown count
            if (fighter.knockdownCount > 0) {
                ctx.fillStyle = fighter.knockdownCount >= 2 ? '#FF8800' : '#FFFFFF';
                ctx.font = '16px "Courier New", monospace';
                ctx.textAlign = 'right';
                ctx.fillText(`KNOCKDOWNS: ${fighter.knockdownCount}`, x + 290, y + 80);
            }
        }
    }
    
    function drawCenterUI() {
        // Center background
        const centerX = canvas.width/2 - 100;
        const centerY = 20;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(centerX, centerY, 200, 80);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX, centerY, 200, 80);
        
        // Round info
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ROUND ${currentRound}`, canvas.width/2, centerY + 30);
        
        // Time
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText(`TIME: ${Math.ceil(roundTime)}`, canvas.width/2, centerY + 50);
        
        // Fight duration
        const gameTime = Math.floor((Date.now() - fightStartTime) / 1000);
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, canvas.width/2, centerY + 70);
    }
    
    function drawFighterHealthBar(x, y, health, maxHealth, isPlayer) {
        const width = 280;
        const height = 20;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, width, height);
        
        // Health
        const healthPercent = health / maxHealth;
        ctx.fillStyle = healthPercent > 0.6 ? '#00FF00' : healthPercent > 0.3 ? '#FFFF00' : '#FF0000';
        ctx.fillRect(x, y, healthPercent * width, height);
        
        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        
        // Health text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = isPlayer ? 'left' : 'right';
        const textX = isPlayer ? x : x + width;
        ctx.fillText('HEALTH', textX, y - 5);
    }
    
    function drawFighterStaminaBar(x, y, stamina, maxStamina) {
        const width = 280;
        const height = 15;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, width, height);
        
        // Stamina
        const staminaPercent = stamina / maxStamina;
        ctx.fillStyle = staminaPercent > 0.6 ? '#00FFFF' : staminaPercent > 0.3 ? '#FFFF00' : '#FF8800';
        ctx.fillRect(x, y, staminaPercent * width, height);
        
        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        
        // Stamina text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('STAMINA', x, y - 5);
    }
    
    function startGame() {
        gameRunning = true;
        gameLoop();
    }
    
    function gameLoop() {
        if (gameRunning || showingTraining) {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
    }
    
    function winFight() {
        gameRunning = false;
        gameWon = true;
        victoryType = 'KO'; // Regular knockout
        
        console.log('winFight called - currentFighter:', currentFighter, 'fighters.length:', fighters.length);
        
        // Check if there are more fighters
        if (currentFighter < fighters.length - 1) {
            levelComplete = true;
            console.log('Level complete set to true');
        } else {
            // Won all fights - complete game
            console.log('All fights won - completing game');
            if (callbacks && callbacks.onGameComplete) {
                callbacks.onGameComplete('punchout', { completed: true });
            }
        }
    }
    
    function loseFight() {
        gameRunning = false;
        gameOver = true;
    }
    
    function endRound() {
        currentRound++;
        if (currentRound > 3) {
            // Decision - opponent wins on points
            loseFight();
        } else {
            // Next round
            roundTime = punchOutConfig.gameplay?.roundTime || 180;
            player.health = Math.min(player.maxHealth, player.health + 20);
            opponent.health = Math.min(opponent.maxHealth, opponent.health + 10);
        }
    }
    
    function resetForNextFighter() {
        currentFighter = Math.min(currentFighter, fighters.length - 1);
        const fighter = fighters[currentFighter];
        
        opponent.health = fighter.health;
        opponent.maxHealth = fighter.health;
        opponent.name = fighter.name;
        opponent.bodyShape = fighter.bodyShape || "tough";
        opponent.speed = fighter.speed;
        opponent.patterns = fighter.patterns;
        opponent.tells = fighter.tells;
        
        resetFight();
    }
    
    function startTrainingAnimation() {
        console.log('startTrainingAnimation called');
        levelComplete = false;
        showingTraining = true;
        trainingStartTime = Date.now();
        gameRunning = true; // Keep game loop running during training
        
        console.log('Training state set - showingTraining:', showingTraining, 'trainingStartTime:', trainingStartTime);
        
        // Restart the game loop since it may have stopped
        gameLoop();
        
        // Auto-advance after 10 seconds
        const timeoutId = setTimeout(() => {
            console.log('Training timeout reached after 10 seconds, ending animation');
            endTrainingAnimation();
        }, 10000);
        
        console.log('Training timeout set with ID:', timeoutId);
    }
    
    function endTrainingAnimation() {
        console.log('endTrainingAnimation called');
        showingTraining = false;
        currentFighter++;
        console.log('Moving to next fighter:', currentFighter);
        resetForNextFighter();
    }
    
    function drawTrainingAnimation() {
        console.log('drawTrainingAnimation called');
        
        // Fill entire screen with sky blue background
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate animation progress (0 to 1 over 10 seconds)
        const elapsed = (Date.now() - trainingStartTime) / 1000;
        const progress = elapsed / 10;
        
        // Draw moving clouds (slowest)
        drawClouds(progress);
        
        // Draw distant city skyline (barely moving)
        drawCitySkyline(progress);
        
        // Draw water below skyline (slow movement)
        drawWater(progress);
        
        // Draw grass foreground (medium movement)
        drawGrass(progress);
        
        // Draw moving road (fastest movement)
        drawMovingRoad(progress);
        
        // Draw trainer on bike
        drawTrainerOnBike(progress);
        
        // Draw Little Mac running behind
        drawRunningMac(progress);
        
        // Draw "TRAINING MONTAGE" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText('TRAINING MONTAGE', canvas.width/2, 100);
        ctx.fillText('TRAINING MONTAGE', canvas.width/2, 100);
    }
    
    function drawClouds(progress) {
        ctx.fillStyle = '#FFFFFF';
        const cloudSpeed = 10; // Very slow
        
        // Draw several clouds that move slowly
        for (let i = 0; i < 5; i++) {
            const x = (i * 200 - progress * cloudSpeed) % (canvas.width + 100);
            const y = 50 + i * 15;
            
            // Simple cloud shape
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.arc(x + 20, y, 30, 0, Math.PI * 2);
            ctx.arc(x + 40, y, 25, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    function drawCitySkyline(progress) {
        const skylineSpeed = 50; // Increased from 5 to make movement visible
        const baseY = canvas.height - 250;
        
        // Draw multiple layers of skyscrapers with different shades
        const layers = [
            { buildings: 25, maxHeight: 120, color: '#CCCCCC', offset: 0 }, // Back layer - lightest
            { buildings: 20, maxHeight: 140, color: '#AAAAAA', offset: 50 }, // Middle layer
            { buildings: 15, maxHeight: 160, color: '#888888', offset: 100 }, // Front layer - darkest
        ];
        
        layers.forEach((layer, layerIndex) => {
            for (let i = 0; i < layer.buildings; i++) {
                // Use building index to create consistent but more random values
                const seed = (i * 17 + layerIndex * 31) % 97; // Better pseudo-random
                const x = (i * 60 + layer.offset - progress * skylineSpeed) % (canvas.width + 300) - 150;
                const height = 80 + (seed * 7 + (seed * seed) % 23) % layer.maxHeight; // More random height
                const width = 40 + (seed % 23) * 1.3; // Consistent width based on seed
                
                // Vary the shade within the layer consistently
                const shade = ((seed % 40) - 20);
                const r = parseInt(layer.color.substr(1, 2), 16) + shade;
                const g = parseInt(layer.color.substr(3, 2), 16) + shade;
                const b = parseInt(layer.color.substr(5, 2), 16) + shade;
                
                ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
                ctx.fillRect(x, baseY - height, width, height);
                
                // Add simple windows consistently - fix alignment
                ctx.fillStyle = '#FFFF88';
                const windowRows = Math.floor(height / 15);
                const windowCols = Math.floor(width / 8);
                
                for (let row = 0; row < windowRows; row++) {
                    for (let col = 0; col < windowCols; col++) {
                        if ((seed + row * 7 + col * 3) % 10 > 6) { // Consistent lit windows
                            ctx.fillRect(x + col * 8 + 2, baseY - height + row * 15 + 2, 4, 8);
                        }
                    }
                }
            }
        });
    }
    
    function drawWater(progress) {
        const waterSpeed = 30; // Slow movement
        const waterY = canvas.height - 250;
        const waterHeight = 50;
        
        // Draw water base
        ctx.fillStyle = '#4682B4';
        ctx.fillRect(0, waterY, canvas.width, waterHeight);
        
        // Draw water waves
        ctx.strokeStyle = '#87CEEB';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 10; i++) {
            const x = (i * 80 - progress * waterSpeed) % (canvas.width + 80);
            ctx.beginPath();
            ctx.moveTo(x, waterY + 10);
            ctx.quadraticCurveTo(x + 20, waterY + 5, x + 40, waterY + 10);
            ctx.quadraticCurveTo(x + 60, waterY + 15, x + 80, waterY + 10);
            ctx.stroke();
        }
    }
    
    function drawGrass(progress) {
        const grassSpeed = 4000; // Adjusted to 4000
        const grassY = canvas.height - 200;
        const grassHeight = 100;
        
        // Draw grass base
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, grassY, canvas.width, grassHeight);
        
        // Add grass texture with different shades
        ctx.fillStyle = '#32CD32';
        for (let i = 0; i < 300; i++) { // Increased from 100 to 300
            const x = (i * 8 - progress * grassSpeed) % (canvas.width + 8);
            const y = grassY + (i % 7) * 14;
            ctx.fillRect(x, y, 4, 8);
        }
        
        // Draw grass blades
        ctx.strokeStyle = '#90EE90';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 200; i++) { // Increased from 50 to 200
            const x = (i * 16 - progress * grassSpeed) % (canvas.width + 16);
            const height = 10 + (i % 15);
            ctx.beginPath();
            ctx.moveTo(x, grassY + grassHeight);
            ctx.lineTo(x + (i % 4) - 2, grassY + grassHeight - height);
            ctx.stroke();
        }
    }
    
    function drawMovingRoad(progress) {
        const roadSpeed = 4000; // Adjusted to 4000
        const roadY = canvas.height - 100;
        
        // Draw road base
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, roadY, canvas.width, 100);
        
        // Draw road center lines
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        
        for (let i = 0; i < 15; i++) {
            const x = (i * 60 - (progress * roadSpeed) % 60) % canvas.width;
            ctx.beginPath();
            ctx.moveTo(x, roadY + 50);
            ctx.lineTo(x + 30, roadY + 50);
            ctx.stroke();
        }
    }
    
    function drawTrainerOnBike(progress) {
        const x = 200;
        const y = canvas.height - 120; // Moved to road level
        
        // Bike wheels (animated)
        const wheelRotation = progress * 20;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        
        // Back wheel
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        // Front wheel
        ctx.beginPath();
        ctx.arc(x + 60, y, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        // Bike frame
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 30, y - 30);
        ctx.lineTo(x + 60, y);
        ctx.lineTo(x + 30, y - 10);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // Trainer (simple figure)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + 25, y - 50, 10, 30); // Body
        ctx.fillStyle = '#FFDBAC';
        ctx.beginPath();
        ctx.arc(x + 30, y - 60, 8, 0, Math.PI * 2); // Head
        ctx.fill();
    }
    
    function drawRunningMac(progress) {
        const x = 100;
        const y = canvas.height - 100; // Moved to road level
        
        // Running animation (simple bob)
        const bobOffset = Math.sin(progress * 30) * 5;
        const legAnimation = Math.sin(progress * 40) * 8; // Leg animation
        
        // Little Mac in pink jumpsuit - bigger size
        ctx.fillStyle = '#FF69B4'; // Pink jumpsuit
        ctx.fillRect(x, y - 50 + bobOffset, 12, 35); // Bigger body
        ctx.fillRect(x - 2, y - 55 + bobOffset, 16, 10); // Pink shorts/pants
        
        // Legs with running animation - pink hoodie sleeves
        ctx.fillStyle = '#FF69B4'; // Pink hoodie color for legs
        // Left leg
        ctx.fillRect(x + 2, y - 15 + bobOffset, 4, 15 + Math.abs(legAnimation));
        // Right leg  
        ctx.fillRect(x + 8, y - 15 + bobOffset, 4, 15 + Math.abs(-legAnimation));
        
        // Pink hoodie that encircles entire head (like Kenny)
        ctx.fillStyle = '#FF69B4'; // Pink hoodie
        ctx.beginPath();
        ctx.arc(x + 6, y - 65 + bobOffset, 10, 0, Math.PI * 2); // Full circle hood
        ctx.fill();
        
        // Face opening in the hood
        ctx.fillStyle = '#FFDBAC';
        ctx.beginPath();
        ctx.arc(x + 6, y - 65 + bobOffset, 6, 0, Math.PI * 2); // Face visible through hood opening
        ctx.fill();
        
        // Arms (animated) - pink hoodie sleeves
        ctx.strokeStyle = '#FF69B4'; // Pink hoodie color for arms
        ctx.lineWidth = 4;
        const armSwing = Math.sin(progress * 30) * 12;
        ctx.beginPath();
        ctx.moveTo(x + 6, y - 45 + bobOffset);
        ctx.lineTo(x + 6 + armSwing, y - 30 + bobOffset);
        ctx.stroke();
    }
    
    function restartGame() {
        // Reset to very beginning
        currentFighter = 0;
        currentRound = 1;
        roundTime = punchOutConfig.gameplay?.roundTime || 180;
        fightStartTime = Date.now();
        
        // Reset game states
        gameRunning = true;
        gameWon = false;
        gameTKO = false;
        gameOver = false;
        levelComplete = false;
        showingTraining = false;
        victoryType = null;
        gameStarted = true;
        
        // Reset player
        player.x = 400;
        player.y = 450;
        player.health = player.maxHealth;
        player.stamina = player.maxStamina;
        player.stars = 0;
        player.knockedDown = false;
        player.knockdownTimer = 0;
        player.knockdownCount = 0;
        player.gettingUp = false;
        player.getUpTimer = 0;
        player.buttonMashCount = 0;
        player.getUpProgress = 0;
        player.blocking = false;
        player.dodging = false;
        player.dodgeDirection = 0;
        player.dodgeTimer = 0;
        player.punchCooldown = 0;
        player.stunnedTimer = 0;
        
        // Reset opponent to first fighter
        const fighterData = fighters[currentFighter];
        opponent.name = fighterData.name;
        opponent.bodyShape = fighterData.bodyShape || "tough";
        opponent.x = 400;
        opponent.y = 200;
        opponent.width = fighterData.width || 80;
        opponent.height = fighterData.height || 120;
        opponent.health = fighterData.health || 100;
        opponent.maxHealth = opponent.health;
        opponent.speed = fighterData.speed || 2;
        opponent.punchDamage = fighterData.punchDamage || 15;
        opponent.punchCooldown = 0;
        opponent.moveTimer = 0;
        opponent.moveDirection = 1;
        opponent.attackTimer = Math.random() * 120 + 60;
        opponent.stunnedTimer = 0;
        opponent.knockedDown = false;
        opponent.knockdownTimer = 0;
        opponent.knockdownCount = 0;
        opponent.gettingUp = false;
        opponent.getUpTimer = 0;
        opponent.animationFrame = 0;
        
        // Start game loop
        gameLoop();
    }
    
    function resetFight() {
        currentRound = 1;
        roundTime = punchOutConfig.gameplay?.roundTime || 180;
        fightStartTime = Date.now(); // Reset fight timer for TKO logic
        
        // Reset game states
        gameWon = false;
        gameTKO = false;
        gameOver = false;
        levelComplete = false;
        showingTraining = false;
        victoryType = null;
        
        player.health = player.maxHealth;
        player.stamina = player.maxStamina;
        player.stars = 0;
        player.blocking = false;
        player.dodging = null;
        player.punching = false;
        
        opponent.currentPattern = 0;
        opponent.patternTimer = 0;
        opponent.tellTimer = 0;
        opponent.attacking = false;
        opponent.stunned = false;
        
        gameWon = false;
        gameRunning = true;
    }
    
    // Initialize game
    gameArea.innerHTML = '';
    gameArea.appendChild(canvas);
    
    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Start the game
    startGame();
    
    // Return game instance
    return {
        destroy: () => {
            gameRunning = false;
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            gameArea.innerHTML = '';
        }
    };
}
