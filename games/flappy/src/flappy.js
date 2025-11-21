async function createFlappyGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Flappy Bird configuration using ConfigManager
    let flappyConfig = {};
    if (typeof configManager !== 'undefined') {
        flappyConfig = await configManager.loadConfig('flappy');
    } else {
        flappyConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameStarted = false;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = flappyConfig.physics?.canvasWidth || 800;
    canvas.height = flappyConfig.physics?.canvasHeight || 600;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    
    // Game objects
    const birdStartX = canvas.width * 0.125; // 10% from left edge
    const birdStartY = canvas.height * 0.5;  // Center vertically
    const bird = { 
        x: birdStartX, 
        y: birdStartY, 
        velocity: 0,
        size: flappyConfig.physics?.birdSize || 20 
    };
    const pipes = [];
    let score = 0;
    const pipeGap = flappyConfig.pipes?.gap || 150;
    const pipesToWin = flappyConfig.gameplay?.pipesToWin || 15;
    let gameWon = false;
    
    function createPipe() {
        const minHeight = flappyConfig.pipes?.minHeight || 50;
        const maxHeight = canvas.height - pipeGap - minHeight;
        
        // Use pipeVariation to vary pipe opening positions
        const pipeVariation = flappyConfig.gameplay?.pipeVariation || 0.5; // 0 = no variation, 1 = max variation
        const variation = maxHeight * pipeVariation; // How much the opening can vary
        const centerHeight = (minHeight + maxHeight) / 2;
        const topHeight = centerHeight - (variation / 2) + (Math.random() * variation);
        
        pipes.push({
            x: canvas.width,
            topHeight: Math.max(minHeight, Math.min(maxHeight, topHeight)),
            bottomY: Math.max(minHeight, Math.min(maxHeight, topHeight)) + pipeGap,
            width: flappyConfig.pipes?.width || 80,
            passed: false
        });
    }
    
    function render() {
        // Retro gradient background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(0.5, '#16213e');
        bgGradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw bird with retro shading
        const birdGradient = ctx.createLinearGradient(bird.x, bird.y, bird.x + bird.size, bird.y + bird.size);
        birdGradient.addColorStop(0, '#ffff00');
        birdGradient.addColorStop(0.7, '#ffcc00');
        birdGradient.addColorStop(1, '#cc9900');
        ctx.fillStyle = birdGradient;
        ctx.fillRect(bird.x, bird.y, bird.size, bird.size);
        
        // Bird highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bird.x + 2, bird.y + 2, bird.size - 8, bird.size - 8);
        
        // Draw pipes with retro 3D effect
        pipes.forEach(pipe => {
            // Main pipe color
            const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            pipeGradient.addColorStop(0, '#00ff41');
            pipeGradient.addColorStop(0.3, '#00cc33');
            pipeGradient.addColorStop(1, '#009926');
            ctx.fillStyle = pipeGradient;
            
            // Top pipe
            ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            // Bottom pipe  
            ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, canvas.height - pipe.bottomY);
            
            // 3D highlight effect
            ctx.fillStyle = '#66ff66';
            ctx.fillRect(pipe.x, 0, 4, pipe.topHeight);
            ctx.fillRect(pipe.x, pipe.bottomY, 4, canvas.height - pipe.bottomY);
            
            // 3D shadow effect
            ctx.fillStyle = '#004d1a';
            ctx.fillRect(pipe.x + pipe.width - 4, 0, 4, pipe.topHeight);
            ctx.fillRect(pipe.x + pipe.width - 4, pipe.bottomY, 4, canvas.height - pipe.bottomY);
        });
        
        // Retro UI styling
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 3;
        ctx.fillStyle = '#00ffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'left';
        
        const scoreText = `SCORE: ${score}/${pipesToWin}`;
        ctx.strokeText(scoreText, 12, 27);
        ctx.fillText(scoreText, 12, 27);
        
        // Instructions with retro glow
        if (!gameStarted) {
            ctx.font = 'bold 32px "Courier New", monospace';
            ctx.fillStyle = '#ffff00';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 5;
            ctx.textAlign = 'center';
            const instructText = 'PRESS SPACE TO FLAP!';
            ctx.strokeText(instructText, canvas.width / 2, canvas.height / 2);
            ctx.fillText(instructText, canvas.width / 2, canvas.height / 2);
            ctx.textAlign = 'left'; // Reset text alignment
        } else if (!gameRunning && !gameWon) {
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = '#ff0066';
            ctx.shadowColor = '#ff0066';
            ctx.shadowBlur = 8;
            ctx.textAlign = 'center';
            const gameOverText = 'GAME OVER!';
            const restartText = 'PRESS SPACE TO RESTART';
            ctx.strokeText(gameOverText, canvas.width/2, canvas.height/2 - 10);
            ctx.fillText(gameOverText, canvas.width/2, canvas.height/2 - 10);
            ctx.font = 'bold 12px "Courier New", monospace';
            ctx.strokeText(restartText, canvas.width/2, canvas.height/2 + 15);
            ctx.fillText(restartText, canvas.width/2, canvas.height/2 + 15);
        }
        
        if (gameWon) {
            ctx.font = 'bold 24px "Courier New", monospace';
            ctx.fillStyle = '#00ff00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            const winText = 'LEVEL COMPLETE!';
            ctx.strokeText(winText, canvas.width/2, canvas.height/2);
            ctx.fillText(winText, canvas.width/2, canvas.height/2);
        }
        
        // Reset shadow and text alignment for next frame
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
    }
    
    function update() {
        if (!gameRunning || gameWon) return;
        
        // Bird physics (always active when game is running)
        const gravity = flappyConfig.physics?.gravity || 0.6;
        const terminalVelocity = flappyConfig.physics?.terminalVelocity || 8;
        bird.velocity += gravity;
        bird.velocity = Math.min(bird.velocity, terminalVelocity);
        bird.y += bird.velocity;
        
        // Boundary check
        if (bird.y <= 0 || bird.y >= canvas.height - bird.size) {
            gameRunning = false;
            return;
        }
        
        // Only update pipes after game has started
        if (!gameStarted) return;
        
        // Create pipes
        const pipeSpacing = (flappyConfig.pipes?.spacing || 200) * 1.5;
        if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - pipeSpacing) {
            createPipe();
        }
        
        // Update pipes
        const speed = flappyConfig.pipes?.speed || flappyConfig.gameplay?.gameSpeed || 3;
        pipes.forEach(pipe => {
            pipe.x -= speed;
            
            // Score
            if (!pipe.passed && pipe.x + pipe.width < bird.x) {
                pipe.passed = true;
                score++;
                
                if (score >= pipesToWin) {
                    gameWon = true;
                    gameRunning = false;
                    
                    if (callbacks && callbacks.onGameComplete) {
                        setTimeout(() => {
                            callbacks.onGameComplete('flappy', { completed: true, score: score });
                        }, 1000);
                    }
                }
            }
            
            // Collision
            if (bird.x + bird.size > pipe.x && bird.x < pipe.x + pipe.width) {
                if (bird.y < pipe.topHeight || bird.y + bird.size > pipe.bottomY) {
                    gameRunning = false;
                }
            }
        });
        
        // Remove off-screen pipes
        pipes.splice(0, pipes.length, ...pipes.filter(pipe => pipe.x > -pipe.width));
    }
    
    function handleKeyDown(e) {
        if (e.code !== 'Space') return;
        
        if (!gameRunning && !gameWon) {
            // Restart game
            bird.x = birdStartX;
            bird.y = birdStartY;
            bird.velocity = 0;
            pipes.length = 0;
            score = 0;
            gameWon = false;
            gameStarted = false;
            gameRunning = true;
        } else if (!gameStarted) {
            // Start game AND jump on first press
            gameStarted = true;
            const jumpStrength = flappyConfig.physics?.jumpStrength || -11;
            bird.velocity = jumpStrength;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('flappy');
            }
        } else if (gameRunning && !gameWon) {
            const jumpStrength = flappyConfig.physics?.jumpStrength || -11;
            bird.velocity = jumpStrength;
        }
        
        e.preventDefault();
    }
    
    // Store handler reference for cleanup
    const keyDownHandler = handleKeyDown;
    
    // Set up game
    document.addEventListener('keydown', keyDownHandler);
    gameArea.appendChild(canvas);
    
    // Start game loop immediately
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
