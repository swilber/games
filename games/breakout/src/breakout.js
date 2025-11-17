async function createBreakoutGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Breakout configuration using ConfigManager (same as other games)
    let breakoutConfig = {};
    if (typeof configManager !== 'undefined') {
        breakoutConfig = await configManager.loadConfig('breakout');
        console.log('Breakout config loaded via ConfigManager:', breakoutConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        breakoutConfig = settings || {};
    }
    
    // Merge ConfigManager values with settings (ConfigManager takes priority)
    const mergedSettings = {
        ...settings,
        ...breakoutConfig.gameplay,
        ...breakoutConfig.physics,
        paddleWidth: breakoutConfig.physics?.paddleWidth || settings.paddleWidth,
        paddleHeight: breakoutConfig.physics?.paddleHeight || settings.paddleHeight,
        ballRadius: breakoutConfig.physics?.ballRadius || settings.ballRadius
    };
    
    console.log('Breakout merged settings:', mergedSettings);
    
    // Check if unlock all levels is enabled (same pattern as Donkey Kong)
    const unlockAllLevels = breakoutConfig.unlockAllLevels || mergedSettings?.unlockAllLevels || 
                           breakoutConfig.gameplay?.unlockAllLevels || false;
    
    console.log('Breakout - unlockAllLevels:', unlockAllLevels);
    console.log('Breakout - full config:', breakoutConfig);
    
    if (unlockAllLevels) {
        // Show level selection dialog
        gameArea.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #FFFFFF; font-family: Arial, sans-serif; background: #000; min-height: 400px;">
                <h1 style="color: #00FF00; font-size: 36px; margin-bottom: 30px;">BREAKOUT</h1>
                <h2 style="color: #FFFF00; font-size: 24px; margin-bottom: 40px;">SELECT LEVEL</h2>
                <button onclick="window.loadBreakoutLevel(1)" 
                        style="background: #FF0000; color: #FFF; border: 2px solid #FFFF00; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 1: Basic Pattern
                </button>
                <button onclick="window.loadBreakoutLevel(2)" 
                        style="background: #FF8000; color: #FFF; border: 2px solid #FFFF00; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 2: Random Gaps
                </button>
                <button onclick="window.loadBreakoutLevel(3)" 
                        style="background: #FFFF00; color: #000; border: 2px solid #FF0000; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 3: Multi-Hit Bricks
                </button>
                <button onclick="window.loadBreakoutLevel(4)" 
                        style="background: #00FF00; color: #000; border: 2px solid #FF0000; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 4: Fortress
                </button>
                <button onclick="window.loadBreakoutLevel(5)" 
                        style="background: #0080FF; color: #FFF; border: 2px solid #FFFF00; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 5: Diamond
                </button>
                <button onclick="window.loadBreakoutLevel(6)" 
                        style="background: #8000FF; color: #FFF; border: 2px solid #FFFF00; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 6: Maze
                </button>
                <button onclick="window.loadBreakoutLevel(7)" 
                        style="background: #FF00FF; color: #FFF; border: 2px solid #FFFF00; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 7: Space Invaders
                </button>
            </div>
        `;
        
        // Global function to load specific level
        window.loadBreakoutLevel = (levelNum) => {
            console.log('Loading breakout level:', levelNum);
            const levelSettings = { ...mergedSettings, startLevel: levelNum };
            createBreakoutLevel(levelSettings, gameArea, callbacks);
        };
        
        return {
            cleanup: () => {
                if (window.loadBreakoutLevel) {
                    delete window.loadBreakoutLevel;
                }
            }
        };
    }
    
    // If unlock all levels is disabled, start with default level
    return createBreakoutLevel(mergedSettings, gameArea, callbacks);
}

function createBreakoutLevel(settings, gameArea, callbacks) {
    // Clear game area
    gameArea.innerHTML = '';
    
    // Use ConfigManager values with fallbacks to settings (ConfigManager takes priority)
    const initialLives = settings.lives || 3;
    const initialBallSpeed = settings.ballSpeed || 4;
    const paddleSpeed = settings.paddleSpeed || 8;
    const paddleWidth = settings.paddleWidth || 120;
    const paddleHeight = settings.paddleHeight || 15;
    const ballRadius = settings.ballRadius || 8;
    const powerUpChance = settings.powerUpChance || 0.3;
    const totalLevels = settings.levels || 3; // This should come from ConfigManager
    
    console.log('Breakout createBreakoutLevel - settings:', settings);
    console.log('Breakout createBreakoutLevel - totalLevels:', totalLevels);
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameWon = false;
    let gameStarted = false;
    let levelComplete = false;
    let showLevelStart = true;
    let currentLevel = settings.startLevel || 1;
    let currentLives = initialLives;
    let score = 0;
    let currentBallSpeed = initialBallSpeed;
    let gameState = 'levelStart'; // 'levelStart', 'playing', 'levelComplete', 'gameComplete'
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    const ctx = canvas.getContext('2d');
    
    // Game objects using config values
    const paddle = {
        x: canvas.width / 2 - paddleWidth / 2,
        y: canvas.height - 30,
        width: paddleWidth,
        height: paddleHeight,
        speed: paddleSpeed
    };
    
    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: ballRadius,
        dx: currentBallSpeed * (Math.random() > 0.5 ? 1 : -1),
        dy: -currentBallSpeed,
        stuck: true,
        throughBall: false,
        throughBallTimer: 0
    };
    
    let bricks = [];
    let powerUps = [];
    let particles = [];
    
    // Brick colors and points
    const brickColors = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff'];
    const brickPoints = [7, 7, 5, 5, 3, 3, 1, 1];
    
    // Configurable level progression: Basic -> Fortress -> Maze -> Diamond -> Invaders -> Spiral -> Checkerboard
    const levelMaps = [
        null, // Level 1: Basic pattern (generated)
        {
            name: "FORTRESS",
            pattern: [
                "RRRRRRRRRRRRRR",
                "R............R",
                "R.OOOOOOOOOO.R",
                "R.O........O.R",
                "R.O.YYYYYY.O.R",
                "R.O.Y....Y.O.R",
                "R.O.Y.GG.Y.O.R",
                "R.O.Y....Y.O.R",
                "R.O.YYYYYY.O.R",
                "R.O........O.R",
                "R.OOOOOOOOOO.R",
                "R............R",
                "RRRRRRRRRRRRRR"
            ]
        },
        {
            name: "MAZE",
            pattern: [
                "RRRRRRRRRRRRRR",
                "R....R....R..R",
                "R.RR.R.RR.R.RR",
                "R....R....R..R",
                "RRRR.RRRR.RRRR",
                "O....O....O..O",
                "O.OO.O.OO.O.OO",
                "O....O....O..O",
                "YYYY.YYYY.YYYY",
                "G....G....G..G",
                "G.GG.G.GG.G.GG",
                "G....G....G..G",
                "BBBBBBBBBBBBBB"
            ]
        },
        {
            name: "DIAMOND",
            pattern: [
                "......RR......",
                ".....RRRR.....",
                "....RRRRRR....",
                "...OOOOOOOO...",
                "..OOOOOOOOOO..",
                ".YYYYYYYYYYYY.",
                "GGGGGGGGGGGGGG",
                ".YYYYYYYYYYYY.",
                "..OOOOOOOOOO..",
                "...OOOOOOOO...",
                "....RRRRRR....",
                ".....RRRR.....",
                "......RR......"
            ]
        },
        {
            name: "INVADERS",
            pattern: [
                "..RR....RR....",
                ".RRRR..RRRR...",
                "RRRRRRRRRRRRRR",
                "RRR.RRRR.RRRRR",
                "RRRRRRRRRRRRRR",
                "..R.RRRR.R....",
                ".R.R....R.R...",
                "R..R....R..R.."
            ]
        },
        {
            name: "SPIRAL",
            pattern: [
                "BBBBBBBBBBBBBB",
                "B............B",
                "B.GGGGGGGGGG.B",
                "B.G........G.B",
                "B.G.YYYYYY.G.B",
                "B.G.Y....Y.G.B",
                "B.G.Y.OO.Y.G.B",
                "B.G.Y.OR.Y.G.B",
                "B.G.Y.RR.Y.G.B",
                "B.G.YYYYYY.G.B",
                "B.G........G.B",
                "B.GGGGGGGGGG.B",
                "B............B",
                "BBBBBBBBBBBBBB"
            ]
        },
        {
            name: "CHECKERBOARD",
            pattern: [
                "R.R.R.R.R.R.R.",
                ".O.O.O.O.O.O.O",
                "Y.Y.Y.Y.Y.Y.Y.",
                ".G.G.G.G.G.G.G",
                "B.B.B.B.B.B.B.",
                ".R.R.R.R.R.R.R",
                "O.O.O.O.O.O.O.",
                ".Y.Y.Y.Y.Y.Y.Y"
            ]
        }
    ];

    const brickTypeColors = {
        'R': { color: '#ff0000', hits: 3, points: 10 },
        'O': { color: '#ff8000', hits: 2, points: 7 },
        'Y': { color: '#ffff00', hits: 2, points: 5 },
        'G': { color: '#00ff00', hits: 1, points: 3 },
        'B': { color: '#0080ff', hits: 1, points: 1 },
        '.': null
    };

    function generateBricksFromPattern(pattern) {
        const bricks = [];
        const rows = pattern.length;
        const cols = pattern[0].length;
        const brickWidth = (canvas.width - 40) / cols;
        const brickHeight = 20;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const brickType = pattern[row][col];
                const brickInfo = brickTypeColors[brickType];
                
                if (brickInfo) {
                    bricks.push({
                        x: 20 + col * (brickWidth + 2),
                        y: 60 + row * (brickHeight + 5),
                        width: brickWidth,
                        height: brickHeight,
                        color: brickInfo.color,
                        points: brickInfo.points,
                        hits: brickInfo.hits,
                        maxHits: brickInfo.hits
                    });
                }
            }
        }
        
        return bricks;
    }

    function initializeLevel(level) {
        bricks = [];
        
        if (level === 1) {
            // Level 1: Basic pattern
            const rows = 6;
            const cols = 14;
            const brickWidth = (canvas.width - 40) / cols;
            const brickHeight = 20;
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    bricks.push({
                        x: 20 + col * (brickWidth + 2),
                        y: 60 + row * (brickHeight + 5),
                        width: brickWidth,
                        height: brickHeight,
                        color: brickColors[row % brickColors.length],
                        points: brickPoints[row] || 1,
                        hits: 1,
                        maxHits: 1
                    });
                }
            }
        } else if (level <= totalLevels && levelMaps[level - 1]) {
            // Level 2+: Use pattern maps
            bricks = generateBricksFromPattern(levelMaps[level - 1].pattern);
        } else {
            // Fallback for levels beyond defined patterns - generate basic pattern
            const rows = Math.min(8, 4 + level);
            const cols = 14;
            const brickWidth = (canvas.width - 40) / cols;
            const brickHeight = 20;
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    bricks.push({
                        x: 20 + col * (brickWidth + 2),
                        y: 60 + row * (brickHeight + 5),
                        width: brickWidth,
                        height: brickHeight,
                        color: brickColors[row % brickColors.length],
                        points: brickPoints[row] || 1,
                        hits: Math.min(3, Math.floor(level / 2) + 1),
                        maxHits: Math.min(3, Math.floor(level / 2) + 1)
                    });
                }
            }
        }
        
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = currentBallSpeed * (Math.random() > 0.5 ? 1 : -1);
        ball.dy = -currentBallSpeed;
        ball.stuck = true;
        paddle.x = canvas.width / 2 - paddle.width / 2;
        
        gameState = 'levelStart';
        showLevelStart = true;
    }
    
    function createPowerUp(x, y) {
        const types = ['through', 'expand', 'shrink', 'life'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        powerUps.push({
            x: x,
            y: y,
            width: 30,
            height: 15,
            dy: 2,
            type: type,
            color: type === 'life' ? '#00ff00' : 
                   type === 'expand' ? '#0080ff' : 
                   type === 'through' ? '#ff00ff' : '#ff8000'
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
        
        if (ball.throughBallTimer > 0) {
            ball.throughBallTimer--;
            if (ball.throughBallTimer <= 0) {
                ball.throughBall = false;
            }
        }
        
        particles = particles.filter(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.life--;
            return p.life > 0;
        });
        
        powerUps = powerUps.filter(powerUp => {
            powerUp.y += powerUp.dy;
            
            if (powerUp.y + powerUp.height >= paddle.y &&
                powerUp.x + powerUp.width >= paddle.x &&
                powerUp.x <= paddle.x + paddle.width) {
                
                applyPowerUp(powerUp.type);
                return false;
            }
            
            return powerUp.y < canvas.height;
        });
        
        if (!ball.stuck) {
            ball.x += ball.dx;
            ball.y += ball.dy;
            
            if (ball.x <= ball.radius || ball.x >= canvas.width - ball.radius) {
                ball.dx = -ball.dx;
            }
            if (ball.y <= ball.radius) {
                ball.dy = -ball.dy;
            }
            
            if (ball.y + ball.radius >= paddle.y &&
                ball.x >= paddle.x && ball.x <= paddle.x + paddle.width &&
                ball.dy > 0) {
                
                ball.dy = -ball.dy;
                const hitPos = (ball.x - paddle.x) / paddle.width;
                ball.dx = currentBallSpeed * (hitPos - 0.5) * 2;
            }
            
            for (let i = bricks.length - 1; i >= 0; i--) {
                const brick = bricks[i];
                
                if (ball.x + ball.radius >= brick.x &&
                    ball.x - ball.radius <= brick.x + brick.width &&
                    ball.y + ball.radius >= brick.y &&
                    ball.y - ball.radius <= brick.y + brick.height) {
                    
                    if (!ball.throughBall) {
                        const overlapX = Math.min(ball.x + ball.radius - brick.x, brick.x + brick.width - (ball.x - ball.radius));
                        const overlapY = Math.min(ball.y + ball.radius - brick.y, brick.y + brick.height - (ball.y - ball.radius));
                        
                        if (overlapX < overlapY) {
                            ball.dx = -ball.dx;
                        } else {
                            ball.dy = -ball.dy;
                        }
                    }
                    
                    brick.hits--;
                    createParticle(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
                    
                    if (brick.hits <= 0) {
                        score += brick.points;
                        
                        if (Math.random() < powerUpChance) {
                            createPowerUp(brick.x + brick.width/2, brick.y + brick.height/2);
                        }
                        
                        bricks.splice(i, 1);
                    } else {
                        brick.color = brick.color.replace(/ff/g, '80');
                    }
                    
                    if (!ball.throughBall) break;
                }
            }
            
            if (ball.y > canvas.height) {
                currentLives--;
                if (currentLives <= 0) {
                    gameRunning = false;
                } else {
                    ball.x = canvas.width / 2;
                    ball.y = canvas.height / 2;
                    ball.dx = currentBallSpeed * (Math.random() > 0.5 ? 1 : -1);
                    ball.dy = -currentBallSpeed;
                    ball.stuck = true;
                    ball.throughBall = false;
                    ball.throughBallTimer = 0;
                }
            }
        }
        
        if (bricks.length === 0) {
            if (currentLevel >= totalLevels) {
                gameWon = true;
                gameRunning = false;
                gameState = 'gameComplete';
                // Show question after 3 seconds
                setTimeout(() => {
                    if (callbacks && callbacks.onGameComplete) {
                        callbacks.onGameComplete('breakout', { completed: true, score: score });
                    }
                }, 3000);
            } else {
                currentLevel++;
                score += 500;
                gameState = 'levelComplete';
                gameRunning = false;
                // Auto-advance to next level after 2 seconds
                setTimeout(() => {
                    initializeLevel(currentLevel);
                }, 2000);
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
            case 'life':
                currentLives++;
                break;
            case 'through':
                ball.throughBall = true;
                ball.throughBallTimer = 600;
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
        if (ball.throughBall) {
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
            ctx.lineWidth = 2;
            for (let i = 1; i <= 5; i++) {
                const trailX = ball.x - (ball.dx * i * 0.8);
                const trailY = ball.y - (ball.dy * i * 0.8);
                const alpha = (6 - i) / 6 * 0.6;
                
                ctx.strokeStyle = `rgba(255, 0, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(trailX, trailY, ball.radius * (6 - i) / 6, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
        
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
        
        // Retro 70s arcade font styling
        const retroFont = 'bold 20px "Courier New", monospace';
        const retroFontLarge = 'bold 48px "Courier New", monospace';
        const retroFontMedium = 'bold 32px "Courier New", monospace';
        
        // Draw UI
        ctx.fillStyle = '#00FF00';
        ctx.font = retroFont;
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score.toString().padStart(6, '0')}`, 20, 30);
        ctx.fillText(`LIVES: ${currentLives}`, 20, canvas.height - 10);
        
        // Level display
        const levelNames = ['', 'BASIC', 'FORTRESS', 'MAZE', 'DIAMOND', 'INVADERS', 'SPIRAL', 'CHECKERBOARD'];
        const levelName = (currentLevel <= levelNames.length - 1) ? levelNames[currentLevel] : `LEVEL ${currentLevel}`;
        ctx.textAlign = 'right';
        ctx.fillText(`LEVEL ${currentLevel}: ${levelName}`, canvas.width - 20, 30);
        
        // Game state overlays
        if (gameState === 'levelStart') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#FFFF00';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText(`LEVEL ${currentLevel}`, canvas.width/2, canvas.height/2 - 60);
            
            ctx.fillStyle = '#00FFFF';
            ctx.font = retroFontMedium;
            ctx.fillText(levelName, canvas.width/2, canvas.height/2 - 10);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = retroFont;
            ctx.fillText('PRESS R TO START', canvas.width/2, canvas.height/2 + 40);
        }
        
        if (gameState === 'levelComplete') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00FF00';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL COMPLETE!', canvas.width/2, canvas.height/2 - 20);
            
            ctx.fillStyle = '#FFFF00';
            ctx.font = retroFont;
            ctx.fillText('BONUS: 500 POINTS', canvas.width/2, canvas.height/2 + 30);
        }
        
        if (gameState === 'gameComplete') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#FF00FF';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText('GAME COMPLETE!', canvas.width/2, canvas.height/2 - 40);
            
            ctx.fillStyle = '#00FF00';
            ctx.font = retroFontMedium;
            ctx.fillText('CONGRATULATIONS!', canvas.width/2, canvas.height/2 + 10);
            
            ctx.fillStyle = '#FFFF00';
            ctx.font = retroFont;
            ctx.fillText(`FINAL SCORE: ${score.toString().padStart(6, '0')}`, canvas.width/2, canvas.height/2 + 60);
        }
        
        if (ball.stuck && gameState === 'playing') {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = retroFont;
            ctx.textAlign = 'center';
            ctx.fillText('PRESS SPACE TO LAUNCH', canvas.width/2, canvas.height/2 + 50);
        }
        
        if (!gameRunning && !gameWon && currentLives <= 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#FF0000';
            ctx.font = retroFontLarge;
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = retroFont;
            ctx.fillText(`FINAL SCORE: ${score.toString().padStart(6, '0')}`, canvas.width/2, canvas.height/2 + 30);
            ctx.fillText('PRESS R TO RESTART', canvas.width/2, canvas.height/2 + 70);
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
        
        if (e.code === 'KeyR' && gameState === 'levelStart') {
            gameState = 'playing';
            gameRunning = true;
            showLevelStart = false;
        }
        
        if (e.code === 'Space' && ball.stuck && gameState === 'playing') {
            ball.stuck = false;
        }
        
        if (e.code === 'KeyR' && !gameRunning && currentLives <= 0) {
            currentLevel = settings.startLevel || 1;
            currentLives = initialLives;
            score = 0;
            currentBallSpeed = initialBallSpeed;
            initializeLevel(currentLevel);
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'Space', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        e.preventDefault();
    }
    
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
        
        if (ball.stuck) {
            ball.x = paddle.x + paddle.width / 2;
        }
    }
    
    const keyDownHandler = handleKeyDownContinuous;
    const keyUpHandler = handleKeyUpContinuous;
    
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    gameArea.appendChild(canvas);
    
    initializeLevel(currentLevel);
    
    gameInterval = setInterval(() => {
        updatePaddle();
        update();
        render();
    }, 16);
    
    render();
    
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
