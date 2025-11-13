async function createBreakoutGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Breakout configuration using ConfigManager
    let breakoutConfig = {};
    if (typeof configManager !== 'undefined') {
        breakoutConfig = await configManager.loadConfig('breakout');
        console.log('Breakout config loaded via ConfigManager:', breakoutConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        breakoutConfig = {
            gameplay: settings,
            physics: settings,
            scoring: settings
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameWon = false;
    let gameStarted = false;
    let currentLevel = 1;
    let lives = breakoutConfig.gameplay?.lives || settings.lives || 3;
    let score = 0;
    let ballSpeed = breakoutConfig.gameplay?.ballSpeed || settings.ballSpeed || 4;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Game objects
    const paddle = {
        x: canvas.width / 2 - (breakoutConfig.physics?.paddleWidth || 120) / 2,
        y: canvas.height - 30,
        width: breakoutConfig.physics?.paddleWidth || 120,
        height: breakoutConfig.physics?.paddleHeight || 15,
        speed: breakoutConfig.gameplay?.paddleSpeed || 8
    };
    
    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: breakoutConfig.physics?.ballRadius || 8,
        dx: (breakoutConfig.gameplay?.ballSpeed || 4) * (Math.random() > 0.5 ? 1 : -1),
        dy: -(breakoutConfig.gameplay?.ballSpeed || 4),
        stuck: true
    };
    
    let bricks = [];
    let powerUps = [];
    let particles = [];
    
    // Brick colors and points
    const brickColors = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff'];
    const brickPoints = [7, 7, 5, 5, 3, 3, 1, 1];
    
    function initializeLevel(level) {
        bricks = [];
        const rows = Math.min(8, 4 + level);
        const cols = 14;
        const brickWidth = breakoutConfig.physics?.brickWidth || (canvas.width - 40) / cols;
        const brickHeight = breakoutConfig.physics?.brickHeight || 20;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Skip some bricks in higher levels for patterns
                if (level > 1 && Math.random() < 0.1) continue;
                
                bricks.push({
                    x: 20 + col * (brickWidth + 2),
                    y: 60 + row * (brickHeight + 5),
                    width: brickWidth,
                    height: brickHeight,
                    color: brickColors[row % brickColors.length],
                    points: breakoutConfig.scoring?.brickPoints || brickPoints[row] || 1,
                    hits: row < 2 && level > 1 ? 2 : 1,
                    maxHits: row < 2 && level > 1 ? 2 : 1
                });
            }
        }
        
        // Reset ball
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = (breakoutConfig.gameplay?.ballSpeed || ballSpeed) * (Math.random() > 0.5 ? 1 : -1);
        ball.dy = -(breakoutConfig.gameplay?.ballSpeed || ballSpeed);
        ball.stuck = true;
        
        // Reset paddle
        paddle.x = canvas.width / 2 - paddle.width / 2;
    }
    
    function createPowerUp(x, y) {
        const types = ['expand', 'shrink', 'multiball', 'laser', 'slow', 'fast', 'life'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        powerUps.push({
            x: x,
            y: y,
            width: 30,
            height: 15,
            dy: 2,
            type: type,
            color: type === 'life' ? '#00ff00' : type === 'expand' ? '#0080ff' : '#ff8000'
        });
    }
    
    function createParticle(x, y, color) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: x,
                y: y,
                dx: (Math.random() - 0.5) * 6,
                dy: (Math.random() - 0.5) * 6,
                life: 30,
                maxLife: 30,
                color: color
            });
        }
    }
    
    function update() {
        if (!gameRunning || gameWon) return;
        
        // Update particles
        particles = particles.filter(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.life--;
            return p.life > 0;
        });
        
        // Update power-ups
        powerUps = powerUps.filter(powerUp => {
            powerUp.y += powerUp.dy;
            
            // Check collision with paddle
            if (powerUp.y + powerUp.height >= paddle.y &&
                powerUp.x + powerUp.width >= paddle.x &&
                powerUp.x <= paddle.x + paddle.width) {
                
                applyPowerUp(powerUp.type);
                return false;
            }
            
            return powerUp.y < canvas.height;
        });
        
        // Ball movement
        if (!ball.stuck) {
            ball.x += ball.dx;
            ball.y += ball.dy;
            
            // Wall collisions
            if (ball.x <= ball.radius || ball.x >= canvas.width - ball.radius) {
                ball.dx = -ball.dx;
            }
            if (ball.y <= ball.radius) {
                ball.dy = -ball.dy;
            }
            
            // Paddle collision
            if (ball.y + ball.radius >= paddle.y &&
                ball.x >= paddle.x && ball.x <= paddle.x + paddle.width &&
                ball.dy > 0) {
                
                ball.dy = -ball.dy;
                // Add spin based on where ball hits paddle
                const hitPos = (ball.x - paddle.x) / paddle.width;
                ball.dx = ballSpeed * (hitPos - 0.5) * 2;
            }
            
            // Brick collisions
            for (let i = bricks.length - 1; i >= 0; i--) {
                const brick = bricks[i];
                
                if (ball.x + ball.radius >= brick.x &&
                    ball.x - ball.radius <= brick.x + brick.width &&
                    ball.y + ball.radius >= brick.y &&
                    ball.y - ball.radius <= brick.y + brick.height) {
                    
                    // Determine collision side
                    const overlapX = Math.min(ball.x + ball.radius - brick.x, brick.x + brick.width - (ball.x - ball.radius));
                    const overlapY = Math.min(ball.y + ball.radius - brick.y, brick.y + brick.height - (ball.y - ball.radius));
                    
                    if (overlapX < overlapY) {
                        ball.dx = -ball.dx;
                    } else {
                        ball.dy = -ball.dy;
                    }
                    
                    brick.hits--;
                    createParticle(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
                    
                    if (brick.hits <= 0) {
                        score += brick.points;
                        
                        // Chance for power-up
                        if (Math.random() < (breakoutConfig.scoring?.powerUpChance || 0.15)) {
                            createPowerUp(brick.x + brick.width/2, brick.y + brick.height/2);
                        }
                        
                        bricks.splice(i, 1);
                    } else {
                        // Darken brick color for damaged bricks
                        brick.color = brick.color.replace(/ff/g, '80');
                    }
                    
                    break;
                }
            }
            
            // Ball out of bounds
            if (ball.y > canvas.height) {
                lives--;
                if (lives <= 0) {
                    gameRunning = false;
                    // Game over - no callback, just restart
                } else {
                    // Reset ball
                    ball.x = canvas.width / 2;
                    ball.y = canvas.height / 2;
                    ball.dx = ballSpeed * (Math.random() > 0.5 ? 1 : -1);
                    ball.dy = -ballSpeed;
                    ball.stuck = true;
                }
            }
        }
        
        // Check level complete
        if (bricks.length === 0) {
            if (currentLevel >= (breakoutConfig.gameplay?.levels || 3)) {
                gameWon = true;
                gameRunning = false;
                if (callbacks && callbacks.onGameComplete) {
                    setTimeout(() => {
                        callbacks.onGameComplete('breakout', { completed: true, score: score });
                    }, 1000);
                }
            } else {
                currentLevel++;
                score += breakoutConfig.scoring?.levelBonus || 100; // Level completion bonus
                initializeLevel(currentLevel);
                ballSpeed = (breakoutConfig.gameplay?.ballSpeed || 4) + (currentLevel - 1) * 0.5; // Increase speed each level
            }
        }
    }
    
    function applyPowerUp(type) {
        switch(type) {
            case 'expand':
                paddle.width = Math.min(200, paddle.width * 1.5);
                break;
            case 'shrink':
                paddle.width = Math.max(60, paddle.width * 0.7);
                break;
            case 'slow':
                ballSpeed *= 0.8;
                ball.dx *= 0.8;
                ball.dy *= 0.8;
                break;
            case 'fast':
                ballSpeed *= 1.2;
                ball.dx *= 1.2;
                ball.dy *= 1.2;
                break;
            case 'life':
                lives++;
                break;
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw bricks
        bricks.forEach(brick => {
            ctx.fillStyle = brick.color;
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        });
        
        // Draw paddle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Draw power-ups
        powerUps.forEach(powerUp => {
            ctx.fillStyle = powerUp.color;
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(powerUp.type[0].toUpperCase(), powerUp.x + powerUp.width/2, powerUp.y + 12);
        });
        
        // Draw particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2, 2);
        });
        ctx.globalAlpha = 1;
        
        // Draw UI
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${score}`, 20, 30);
        ctx.fillText(`Lives: ${lives}`, 20, canvas.height - 10);
        ctx.fillText(`Level: ${currentLevel}`, canvas.width - 120, 30);
        
        if (ball.stuck) {
            ctx.textAlign = 'center';
            ctx.fillText('Press SPACE to launch ball', canvas.width/2, canvas.height/2 + 50);
        }
        
        if (gameWon) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
            ctx.font = '24px Arial';
            ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2 + 60);
        }
        
        if (!gameRunning && !gameWon && lives <= 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.font = '24px Arial';
            ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2 + 60);
            ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 100);
        }
    }
    
    function handleKeyDown(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'Space', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('breakout');
            }
        }
        
        if (e.code === 'Space' && ball.stuck) {
            ball.stuck = false;
            gameRunning = true;
        }
        
        if (e.code === 'KeyR' && !gameRunning && lives <= 0) {
            // Restart game
            currentLevel = 1;
            lives = breakoutConfig.gameplay?.lives || 3;
            score = 0;
            ballSpeed = breakoutConfig.gameplay?.ballSpeed || 4;
            initializeLevel(currentLevel);
            gameRunning = false;
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'Space', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        e.preventDefault();
    }
    
    // Continuous paddle movement
    const keys = {};
    function handleKeyDownContinuous(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'Space', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        keys[e.code] = true;
        handleKeyDown(e);
    }
    
    function handleKeyUpContinuous(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'Space', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        keys[e.code] = false;
        handleKeyUp(e);
    }
    
    function updatePaddle() {
        if (keys['ArrowLeft'] && paddle.x > 0) {
            paddle.x -= paddle.speed;
        }
        if (keys['ArrowRight'] && paddle.x < canvas.width - paddle.width) {
            paddle.x += paddle.speed;
        }
        
        // Move ball with paddle when stuck
        if (ball.stuck) {
            ball.x = paddle.x + paddle.width / 2;
        }
    }
    
    // Store handler references for cleanup
    const keyDownHandler = handleKeyDownContinuous;
    const keyUpHandler = handleKeyUpContinuous;
    
    // Set up game
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    gameArea.appendChild(canvas);
    
    // Initialize first level
    initializeLevel(currentLevel);
    
    // Start game loop
    gameInterval = setInterval(() => {
        updatePaddle();
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
            document.removeEventListener('keyup', keyUpHandler);
        }
    };
}
