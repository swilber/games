async function createPunchOutGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load configuration
    let punchOutConfig = {};
    if (typeof configManager !== 'undefined') {
        punchOutConfig = await configManager.loadConfig('punchout');
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
    let gameStarted = false;
    let currentRound = 1;
    let roundTime = punchOutConfig.gameplay?.roundTime || 180;
    let currentFighter = 0;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = punchOutConfig.physics?.canvasWidth || 800;
    canvas.height = punchOutConfig.physics?.canvasHeight || 600;
    const ctx = canvas.getContext('2d');
    
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
        animationFrame: 0
    };
    
    const fighters = punchOutConfig.fighters || [
        { name: "Glass Joe", health: 60, speed: 0.8, patterns: ["jab"], tells: ["blink"] }
    ];
    
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
        blockChance: Math.min(0.2 + currentFighter * 0.15, 0.8), // Progressive blocking skill
        stunned: false,
        stunnedTimer: 0,
        knockedDown: false,
        knockdownTimer: 0,
        knockdownCount: 0,
        gettingUp: false,
        getUpTimer: 0,
        animationFrame: 0
    };
    
    // Input handling
    const keys = {};
    
    function handleKeyDown(e) {
        keys[e.code] = true;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('punchout');
            }
        }
        
        if (!gameRunning) return;
        
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
        } else if (player.health <= 0) {
            loseFight();
        }
    }
    
    function updatePlayer() {
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
        
        // Only do AI behavior if not in special states
        if (!opponent.stunned && !opponent.knockedDown && !opponent.gettingUp) {
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
            
            // Check if player is punching and decide whether to block
            if (player.punching && !opponent.blocking && !opponent.attacking) {
                if (Math.random() < opponent.blockChance) {
                    opponent.blocking = true;
                    // Block high or low based on player's punch type
                    if (player.punchType && player.punchType.includes('high')) {
                        opponent.blockType = 'high';
                    } else {
                        opponent.blockType = 'low';
                    }
                }
            }
            
            // End blocking after punch animation
            if (opponent.blocking && !player.punching) {
                opponent.blocking = false;
                opponent.blockType = null;
            }
            
            // AI pattern behavior
            opponent.patternTimer++;
            
            // Show tell before attacking
            if (opponent.patternTimer > 60 && opponent.patternTimer < 90) {
                opponent.tellTimer++;
            }
            
            // Execute attack
            if (opponent.patternTimer > 120) {
                if (!opponent.attacking) {
                    const pattern = opponent.patterns[opponent.currentPattern];
                    executeOpponentAttack(pattern);
                    opponent.attacking = true;
                }
            }
            
            // Reset pattern
            if (opponent.patternTimer > 180) {
                opponent.patternTimer = 0;
                opponent.attacking = false;
                opponent.tellTimer = 0;
                opponent.currentPattern = (opponent.currentPattern + 1) % opponent.patterns.length;
            }
        }
    }
    
    function executeOpponentAttack(pattern) {
        // Set which hand to use for this attack
        switch(pattern) {
            case 'jab':
                // Quick straight punch - left hand
                opponent.attackHand = 'left';
                if (!player.blocking && !player.dodging) {
                    player.health -= 15;
                }
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
                        showHitEffect(opponent.x, opponent.y - 40, "BLOCKED!", '#FFFF00');
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
                                showHitEffect(opponent.x, opponent.y - 80, "COUNTER!", '#FFD700');
                            } else {
                                showHitEffect(opponent.x, opponent.y - 80, "LEFT BODY!", '#FFFFFF');
                            }
                            break;
                        case 'high-left':
                            damage = 12; // Medium damage for head shots
                            if (opponent.tellTimer > 0) {
                                player.stars = Math.min(player.stars + 1, player.maxStars);
                                damage = 18;
                                showHitEffect(opponent.x, opponent.y - 80, "HEAD COUNTER!", '#FFD700');
                            } else {
                                showHitEffect(opponent.x, opponent.y - 80, "LEFT HEAD!", '#FFFFFF');
                            }
                            break;
                        case 'low-right':
                            damage = 10; // Right hand hits harder
                            if (opponent.tellTimer > 0) {
                                player.stars = Math.min(player.stars + 1, player.maxStars);
                                damage = 15;
                                showHitEffect(opponent.x, opponent.y - 80, "RIGHT COUNTER!", '#FFD700');
                            } else {
                                showHitEffect(opponent.x, opponent.y - 80, "RIGHT BODY!", '#FFFFFF');
                            }
                            break;
                        case 'high-right':
                            damage = 15; // High damage for right head shots
                            if (opponent.tellTimer > 0) {
                                player.stars = Math.min(player.stars + 1, player.maxStars);
                                damage = 22;
                                showHitEffect(opponent.x, opponent.y - 80, "POWER COUNTER!", '#FFD700');
                            } else {
                                showHitEffect(opponent.x, opponent.y - 80, "RIGHT HEAD!", '#FF8800');
                            }
                            break;
                    }
                    
                    opponent.health -= damage;
                    opponent.health = Math.max(0, opponent.health);
                    
                    // Check for knockdown
                    if (opponent.health <= 0 || (damage >= 25 && opponent.health <= 30)) {
                        opponent.knockedDown = true;
                        opponent.knockdownTimer = 600; // 10 seconds
                        opponent.knockdownCount++;
                        opponent.health = Math.max(1, opponent.health);
                        showHitEffect(opponent.x, opponent.y - 100, "KNOCKDOWN!", '#FF0000');
                    }
                    
                    // Prevent multiple hits per punch
                    player.punching = false;
                    player.punchType = null;
                    player.animationFrame = 0;
                }
            }
        }
        
        // Opponent hitting player - simple state check
        if (opponent.attacking && opponent.patternTimer > 140) {
            // Check if player is vulnerable (not blocking or dodging)
            let playerHit = true;
            
            if (player.blocking) {
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
                showHitEffect(player.x, player.y - 50, "OUCH!", '#FF0000');
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
            ctx.font = `bold ${16 * effect.scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 5;
            ctx.fillText(effect.text, effect.x, effect.y);
            ctx.restore();
        });
    }
    
    function render() {
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
        
        // Draw ring with better perspective
        const ringGradient = ctx.createLinearGradient(0, canvas.height - 100, 0, canvas.height);
        ringGradient.addColorStop(0, '#8B4513');
        ringGradient.addColorStop(1, '#654321');
        ctx.fillStyle = ringGradient;
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        
        // Draw ring canvas pattern
        ctx.fillStyle = '#A0522D';
        for (let x = 0; x < canvas.width; x += 40) {
            for (let y = canvas.height - 50; y < canvas.height; y += 40) {
                if ((x + y) % 80 === 0) {
                    ctx.fillRect(x, y, 20, 20);
                }
            }
        }
        
        // Draw ropes with better 3D effect
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 3;
        
        for (let i = 1; i <= 3; i++) {
            const y = canvas.height - 50 - (i * 100);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
            
            // Rope posts
            ctx.fillStyle = '#666666';
            ctx.fillRect(-5, y - 10, 10, 20);
            ctx.fillRect(canvas.width - 5, y - 10, 10, 20);
        }
        
        ctx.shadowBlur = 0;
        
        // Draw crowd silhouettes
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        for (let i = 0; i < 20; i++) {
            const x = (canvas.width / 20) * i;
            const height = 30 + Math.random() * 20;
            ctx.fillRect(x, 80, canvas.width / 20, height);
        }
        
        // Draw opponent first (behind player)
        drawOpponent();
        
        // Draw player
        drawPlayer();
        
        // Draw hit effects
        drawHitEffects();
        
        // Draw UI
        drawUI();
        
        ctx.restore();
    }
    
    function drawPlayer() {
        ctx.save();
        
        // Apply dodge offset
        let offsetX = 0;
        if (player.dodging === 'left') offsetX = -40;
        if (player.dodging === 'right') offsetX = 40;
        
        const playerCenterX = player.x + offsetX;
        const playerCenterY = player.y - player.height/2 - player.jumpHeight; // Apply jump offset
        
        // Draw player shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.ellipse(playerCenterX, player.y + 10, 35, 15, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw player body (Little Mac style)
        ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
        
        // Body
        ctx.fillRect(playerCenterX - 25, playerCenterY - 40, 50, 80);
        
        // Head
        ctx.fillRect(playerCenterX - 20, playerCenterY - 80, 40, 40);
        
        // Shorts
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(playerCenterX - 25, playerCenterY + 20, 50, 30);
        
        // Gloves - show different punch types
        ctx.fillStyle = '#FF0000';
        const gloveSize = 18;
        
        if (player.punching) {
            // Animated punch with proper arms - punches go FORWARD toward opponent from very top of torso
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 5;
            
            const punchExtend = Math.sin(player.animationFrame * 0.4) * 60; // Slower animation (0.4 vs 0.8)
            
            if (player.punchType === 'low-left') {
                // Low left punch - left hand forward, right hand back and lower
                ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
                ctx.fillRect(playerCenterX - 30, playerCenterY - 55 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillRect(playerCenterX + 27, playerCenterY - 35, 8, 15); // Right arm below glove
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 35, playerCenterY - 60 - punchExtend, gloveSize, gloveSize);
                ctx.fillRect(playerCenterX + 22, playerCenterY - 40, gloveSize, gloveSize); // Right glove lower
            } else if (player.punchType === 'high-left') {
                // High left punch - left hand forward, right hand back and lower
                ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
                ctx.fillRect(playerCenterX - 30, playerCenterY - 65 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillRect(playerCenterX + 27, playerCenterY - 35, 8, 15); // Right arm below glove
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 35, playerCenterY - 70 - punchExtend, gloveSize, gloveSize);
                ctx.fillRect(playerCenterX + 22, playerCenterY - 40, gloveSize, gloveSize); // Right glove lower
            } else if (player.punchType === 'low-right') {
                // Low right punch - right hand forward, left hand back and lower
                ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
                ctx.fillRect(playerCenterX - 35, playerCenterY - 35, 8, 15); // Left arm below glove
                ctx.fillRect(playerCenterX + 22, playerCenterY - 55 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 40, playerCenterY - 40, gloveSize, gloveSize); // Left glove lower
                ctx.fillRect(playerCenterX + 17, playerCenterY - 60 - punchExtend, gloveSize, gloveSize);
            } else if (player.punchType === 'high-right') {
                // High right punch - right hand forward, left hand back and lower
                ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
                ctx.fillRect(playerCenterX - 35, playerCenterY - 35, 8, 15); // Left arm below glove
                ctx.fillRect(playerCenterX + 22, playerCenterY - 65 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 40, playerCenterY - 40, gloveSize, gloveSize); // Left glove lower
                ctx.fillRect(playerCenterX + 17, playerCenterY - 70 - punchExtend, gloveSize, gloveSize);
            }
            
            ctx.shadowBlur = 0;
        } else {
            // Normal stance - arms at shoulder level
            ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
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
    
    function drawOpponent() {
        ctx.save();
        
        const opponentCenterX = opponent.x;
        const opponentCenterY = opponent.y;
        
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
        ctx.ellipse(opponentCenterX, opponentCenterY + 80, 45, 20, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Handle knockdown animation
        if (opponent.knockedDown && !opponent.gettingUp) {
            // Draw opponent lying down
            ctx.fillStyle = punchOutConfig.visual?.opponentColor || '#D2691E';
            
            // Body lying horizontally
            ctx.fillRect(opponentCenterX - 60, opponentCenterY + 40, 120, 40);
            
            // Head
            ctx.fillRect(opponentCenterX + 50, opponentCenterY + 30, 40, 30);
            
            // Knocked out stars
            for (let i = 0; i < 5; i++) {
                const angle = (Date.now() * 0.005 + i * 1.2) % (Math.PI * 2);
                const starX = opponentCenterX + Math.cos(angle) * 80;
                const starY = opponentCenterY + 20 + Math.sin(angle) * 30;
                ctx.fillStyle = '#FFFF00';
                drawStar(starX, starY, 8);
            }
            
            // Countdown timer
            const countdown = Math.ceil(opponent.knockdownTimer / 60);
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(countdown.toString(), opponentCenterX, opponentCenterY - 50);
            
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
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GETTING UP...', opponentCenterX, opponentCenterY - 100);
        }
        // Normal standing opponent (draw when not knocked down and not getting up)
        else if (!opponent.knockedDown) {
        let opponentColor = punchOutConfig.visual?.opponentColor || '#D2691E';
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
        
        // Draw opponent body - more human proportions
        ctx.fillStyle = opponentColor;
        
        // Trapezoidal torso (wider at shoulders, narrower at waist)
        ctx.beginPath();
        ctx.moveTo(opponentCenterX - 45, opponentCenterY - 60); // Top left (wide shoulders)
        ctx.lineTo(opponentCenterX + 45, opponentCenterY - 60); // Top right (wide shoulders)
        ctx.lineTo(opponentCenterX + 30, opponentCenterY + 20); // Bottom right (narrow waist)
        ctx.lineTo(opponentCenterX - 30, opponentCenterY + 20); // Bottom left (narrow waist)
        ctx.closePath();
        ctx.fill();
        
        // Chest definition
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(opponentCenterX, opponentCenterY - 50);
        ctx.lineTo(opponentCenterX, opponentCenterY - 10);
        ctx.stroke();
        
        // Smaller, more realistic head
        ctx.fillStyle = opponentColor;
        ctx.fillRect(opponentCenterX - 20, opponentCenterY - 100, 40, 40);
        
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
        
        // Shorts
        ctx.fillStyle = '#800080';
        ctx.fillRect(opponentCenterX - 40, opponentCenterY + 30, 80, 40);
        
        // Opponent arms and gloves
        const armColor = opponentColor; // Same color as body
        const opponentGloveSize = 25;
        
        if (opponent.attacking) {
            // Animated attack with different punch types
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 15;
            
            const attackFrame = opponent.patternTimer - 120;
            const attackExtend = Math.sin(attackFrame * 0.3) * 120; // How far toward player
            
            // Different animations based on attack pattern
            const pattern = opponent.patterns[opponent.currentPattern];
            
            if (pattern === 'jab') {
                // Quick jab - one hand forward
                if (opponent.attackHand === 'left') {
                    // Left jab - left arm extends forward
                    ctx.fillStyle = armColor;
                    ctx.fillRect(opponentCenterX - 30, opponentCenterY - 20 + attackExtend * 0.5, 8, 30 + attackExtend * 0.5);
                    ctx.fillRect(opponentCenterX + 15, opponentCenterY - 10, 8, 15); // Right arm back
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX - 35, opponentCenterY - 25 + attackExtend, opponentGloveSize, opponentGloveSize);
                    ctx.fillRect(opponentCenterX + 10, opponentCenterY - 5, opponentGloveSize, opponentGloveSize);
                } else {
                    // Right jab - right arm extends forward
                    ctx.fillStyle = armColor;
                    ctx.fillRect(opponentCenterX - 15, opponentCenterY - 10, 8, 15); // Left arm back
                    ctx.fillRect(opponentCenterX + 22, opponentCenterY - 20 + attackExtend * 0.5, 8, 30 + attackExtend * 0.5);
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX - 20, opponentCenterY - 5, opponentGloveSize, opponentGloveSize);
                    ctx.fillRect(opponentCenterX + 17, opponentCenterY - 25 + attackExtend, opponentGloveSize, opponentGloveSize);
                }
            } else if (pattern === 'uppercut') {
                // Uppercut - arm comes up from below
                if (opponent.attackHand === 'left') {
                    // Left uppercut
                    ctx.fillStyle = armColor;
                    ctx.fillRect(opponentCenterX - 30, opponentCenterY + 20 - attackExtend * 0.8, 8, 30);
                    ctx.fillRect(opponentCenterX + 15, opponentCenterY - 10, 8, 15); // Right arm back
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX - 35, opponentCenterY + 15 - attackExtend, opponentGloveSize, opponentGloveSize);
                    ctx.fillRect(opponentCenterX + 10, opponentCenterY - 5, opponentGloveSize, opponentGloveSize);
                } else {
                    // Right uppercut
                    ctx.fillStyle = armColor;
                    ctx.fillRect(opponentCenterX - 15, opponentCenterY - 10, 8, 15); // Left arm back
                    ctx.fillRect(opponentCenterX + 22, opponentCenterY + 20 - attackExtend * 0.8, 8, 30);
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX - 20, opponentCenterY - 5, opponentGloveSize, opponentGloveSize);
                    ctx.fillRect(opponentCenterX + 17, opponentCenterY + 15 - attackExtend, opponentGloveSize, opponentGloveSize);
                }
            } else {
                // Default punch animation
                if (opponent.attackHand === 'left' || opponent.attackHand === 'both') {
                    ctx.fillStyle = armColor;
                    ctx.fillRect(opponentCenterX - 30, opponentCenterY - 20 + attackExtend * 0.5, 8, 30 + attackExtend * 0.5);
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX - 35, opponentCenterY - 25 + attackExtend, opponentGloveSize, opponentGloveSize);
                } else {
                    ctx.fillStyle = armColor;
                    ctx.fillRect(opponentCenterX - 15, opponentCenterY - 10, 8, 15);
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX - 20, opponentCenterY - 5, opponentGloveSize, opponentGloveSize);
                }
                
                if (opponent.attackHand === 'right' || opponent.attackHand === 'both') {
                    ctx.fillStyle = armColor;
                    ctx.fillRect(opponentCenterX + 22, opponentCenterY - 20 + attackExtend * 0.5, 8, 30 + attackExtend * 0.5);
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX + 17, opponentCenterY - 25 + attackExtend, opponentGloveSize, opponentGloveSize);
                } else {
                    ctx.fillStyle = armColor;
                    ctx.fillRect(opponentCenterX + 15, opponentCenterY - 10, 8, 15);
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(opponentCenterX + 10, opponentCenterY - 5, opponentGloveSize, opponentGloveSize);
                }
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
                
                // Black outlines for the arms
                ctx.strokeStyle = '#000000';
                // Left arm outlines - thicker upper arm
                ctx.lineWidth = 12; // Thicker outline for upper arm
                ctx.beginPath();
                ctx.moveTo(leftShoulderX, leftShoulderY);
                ctx.lineTo(leftElbowX, leftElbowY);
                ctx.stroke();
                ctx.lineWidth = 8; // Thinner outline for lower arm
                ctx.beginPath();
                ctx.moveTo(leftElbowX, leftElbowY);
                ctx.lineTo(leftGloveX, leftGloveY);
                ctx.stroke();
                
                // Right arm outlines - thicker upper arm
                ctx.lineWidth = 12; // Thicker outline for upper arm
                ctx.beginPath();
                ctx.moveTo(rightShoulderX, rightShoulderY);
                ctx.lineTo(rightElbowX, rightElbowY);
                ctx.stroke();
                ctx.lineWidth = 8; // Thinner outline for lower arm
                ctx.beginPath();
                ctx.moveTo(rightElbowX, rightElbowY);
                ctx.lineTo(rightGloveX, rightGloveY);
                ctx.stroke();
                
                // Redraw arms on top of outlines with muscle definition
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
        
        // Draw tell indicator - much more visible
        if (opponent.tellTimer > 0) {
            const tellIntensity = Math.sin(opponent.tellTimer * 0.5);
            ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + tellIntensity * 0.5})`;
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 20;
            
            // Large warning indicator
            ctx.fillRect(opponentCenterX - 15, opponentCenterY - 140, 30, 30);
            
            // Warning text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('!', opponentCenterX - 5, opponentCenterY - 115);
            
            // Pulsing circle around opponent
            ctx.strokeStyle = `rgba(255, 0, 0, ${tellIntensity})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(opponentCenterX, opponentCenterY - 30, 80 + tellIntensity * 20, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
        }
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
        ctx.fillStyle = punchOutConfig.visual?.textColor || '#FFFFFF';
        ctx.font = '20px Arial';
        
        // Round info
        ctx.fillText(`Round ${currentRound}`, 20, 30);
        ctx.fillText(`Time: ${Math.ceil(roundTime)}`, 20, 55);
        
        // Fighter name
        ctx.fillText(opponent.name, canvas.width/2 - 60, 30);
        
        // Health bars
        drawHealthBar(20, 80, player.health, player.maxHealth, '#00FF00', 'Little Mac');
        drawHealthBar(20, 120, opponent.health, opponent.maxHealth, '#FF0000', opponent.name);
        
        // Stamina bar
        drawStaminaBar(20, 160, player.stamina, player.maxStamina);
        
        // Stars
        ctx.fillText(`Stars: ${'★'.repeat(player.stars)}`, canvas.width - 150, 30);
        
        // Controls
        ctx.font = '14px Arial';
        ctx.fillText('L-Shift: Left Punch  R-Shift: Right Punch  +↑: High Punch  ↓: Block  ←→: Dodge', 20, canvas.height - 20);
        
        // Win condition
        if (gameWon) {
            ctx.fillStyle = '#00FF00';
            ctx.font = '48px Arial';
            ctx.fillText('KNOCKOUT!', canvas.width/2 - 120, canvas.height/2);
        }
    }
    
    function drawHealthBar(x, y, health, maxHealth, color, label) {
        const width = 200;
        const height = 20;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, width, height);
        
        // Health
        ctx.fillStyle = color;
        ctx.fillRect(x, y, (health / maxHealth) * width, height);
        
        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeRect(x, y, width, height);
        
        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(label, x, y - 5);
    }
    
    function drawStaminaBar(x, y, stamina, maxStamina) {
        const width = 200;
        const height = 15;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, width, height);
        
        // Stamina
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(x, y, (stamina / maxStamina) * width, height);
        
        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeRect(x, y, width, height);
        
        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText('Stamina', x, y - 5);
    }
    
    function startGame() {
        gameRunning = true;
        gameLoop();
    }
    
    function gameLoop() {
        if (gameRunning) {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
    }
    
    function winFight() {
        gameRunning = false;
        gameWon = true;
        
        setTimeout(() => {
            if (currentFighter < fighters.length - 1) {
                // Next fighter
                currentFighter++;
                resetForNextFighter();
            } else {
                // Won all fights
                if (callbacks && callbacks.onGameComplete) {
                    callbacks.onGameComplete('punchout', { completed: true });
                }
            }
        }, 2000);
    }
    
    function loseFight() {
        gameRunning = false;
        
        setTimeout(() => {
            // Restart current fight
            resetFight();
        }, 2000);
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
        opponent.speed = fighter.speed;
        opponent.patterns = fighter.patterns;
        opponent.tells = fighter.tells;
        
        resetFight();
    }
    
    function resetFight() {
        currentRound = 1;
        roundTime = punchOutConfig.gameplay?.roundTime || 180;
        
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
