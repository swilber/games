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
                if (!player.blocking && !player.dodging && player.stamina > 10) {
                    player.punching = true;
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
                if (!player.blocking && !player.dodging && player.stamina > 15) {
                    player.punching = true;
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
                
                // TODO: Add opponent blocking/dodging logic here when implemented
                
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
                // Low left punch - left hand forward to body from shoulder
                ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
                ctx.fillRect(playerCenterX - 30, playerCenterY - 55 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 35, playerCenterY - 60 - punchExtend, gloveSize, gloveSize);
            } else if (player.punchType === 'high-left') {
                // High left punch - left hand forward to head from shoulder
                ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
                ctx.fillRect(playerCenterX - 30, playerCenterY - 65 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX - 35, playerCenterY - 70 - punchExtend, gloveSize, gloveSize);
            } else if (player.punchType === 'low-right') {
                // Low right punch - right hand forward to body from shoulder
                ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
                ctx.fillRect(playerCenterX + 22, playerCenterY - 55 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX + 17, playerCenterY - 60 - punchExtend, gloveSize, gloveSize);
            } else if (player.punchType === 'high-right') {
                // High right punch - right hand forward to head from shoulder
                ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
                ctx.fillRect(playerCenterX + 22, playerCenterY - 65 - punchExtend * 0.5, 8, 25 + punchExtend * 0.5);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(playerCenterX + 17, playerCenterY - 70 - punchExtend, gloveSize, gloveSize);
            }
            
            ctx.shadowBlur = 0;
        } else {
            // Normal stance - arms at shoulder level
            ctx.fillStyle = punchOutConfig.visual?.playerColor || '#FFE4B5';
            ctx.fillRect(playerCenterX - 35, playerCenterY - 45, 25, 6); // Left arm at shoulder
            ctx.fillRect(playerCenterX + 10, playerCenterY - 45, 25, 6); // Right arm at shoulder
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
        
        // Draw hit detection area (debug visualization)
        if (player.punching) {
            ctx.strokeStyle = 'rgba(255,255,0,0.5)';
            ctx.lineWidth = 2;
            const hitboxX = playerCenterX + (player.punchType === 'left' ? -80 : 60);
            const hitboxY = playerCenterY - 30;
            ctx.strokeRect(hitboxX, hitboxY, 40, 40);
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
        
        // Draw opponent body (larger, more imposing)
        ctx.fillStyle = opponentColor;
        
        // Body
        ctx.fillRect(opponentCenterX - 40, opponentCenterY - 60, 80, 120);
        
        // Head
        ctx.fillRect(opponentCenterX - 35, opponentCenterY - 120, 70, 60);
        
        // Shorts
        ctx.fillStyle = '#800080';
        ctx.fillRect(opponentCenterX - 40, opponentCenterY + 30, 80, 40);
        
        // Opponent gloves - larger and more menacing
        ctx.fillStyle = '#000000';
        const opponentGloveSize = 25;
        
        if (opponent.attacking) {
            // Animated attack with impact effects - attacks go TOWARD player (downward)
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 15;
            
            const attackFrame = opponent.patternTimer - 120;
            const attackExtend = Math.sin(attackFrame * 0.3) * 120; // How far toward player
            
            // Draw attacking hand(s) based on attack type
            if (opponent.attackHand === 'left' || opponent.attackHand === 'both') {
                // Left glove attacking
                ctx.fillRect(opponentCenterX - 25, opponentCenterY + 10 + attackExtend, opponentGloveSize + 15, opponentGloveSize);
            } else {
                // Left glove in normal position
                ctx.fillRect(opponentCenterX - 25, opponentCenterY + 5, opponentGloveSize, opponentGloveSize);
            }
            
            if (opponent.attackHand === 'right' || opponent.attackHand === 'both') {
                // Right glove attacking
                ctx.fillRect(opponentCenterX + 5, opponentCenterY + 10 + attackExtend, opponentGloveSize + 15, opponentGloveSize);
            } else {
                // Right glove in normal position
                ctx.fillRect(opponentCenterX + 5, opponentCenterY + 5, opponentGloveSize, opponentGloveSize);
            }
            
            // Impact lines going toward player (downward) - only where punching
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            for (let i = 0; i < 3; i++) {
                const lineX = opponentCenterX + (Math.random() - 0.5) * 40;
                const lineY = opponentCenterY + 40 + (attackExtend * 0.5) + (i * 15);
                ctx.beginPath();
                ctx.moveTo(lineX - 10, lineY);
                ctx.lineTo(lineX + 10, lineY);
                ctx.stroke();
            }
            
            ctx.shadowBlur = 0;
        } else {
            // Normal glove position - both hands at ready
            ctx.fillRect(opponentCenterX - 25, opponentCenterY + 5, opponentGloveSize, opponentGloveSize);
            ctx.fillRect(opponentCenterX + 5, opponentCenterY + 5, opponentGloveSize, opponentGloveSize);
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
        
        // Draw opponent hitbox
        ctx.strokeStyle = 'rgba(0,255,0,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(opponentCenterX - 40, opponentCenterY - 60, 80, 80);
        }
        
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
