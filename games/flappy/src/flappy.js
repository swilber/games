async function createFlappyGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    // Load Flappy Bird configuration using ConfigManager
    let flappyConfig = {};
    if (typeof configManager !== 'undefined') {
        flappyConfig = await configManager.loadConfig('flappy');
        console.log('Flappy config loaded via ConfigManager:', flappyConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        flappyConfig = {
            gameplay: settings,
            physics: settings,
            pipes: settings,
            scoring: settings
        };
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.border = '2px solid #000';
    canvas.style.background = 'linear-gradient(#70c5ce, #dee4aa)';
    
    const ctx = canvas.getContext('2d');
    
    let game = {
        bird: { 
            x: 100, 
            y: 200, 
            velocity: 0, 
            size: flappyConfig.physics?.birdSize || 20 
        },
        pipes: [],
        score: 0,
        gameSpeed: flappyConfig.gameplay?.gameSpeed || settings.gameSpeed || 2,
        pipeGap: flappyConfig.pipes?.gap || settings.pipeGap || 150,
        pipesToWin: flappyConfig.gameplay?.pipesToWin || settings.pipesToWin || 5,
        gameOver: false,
        won: false
    };
    
    function createPipe() {
        const minHeight = flappyConfig.pipes?.minHeight || 50;
        const maxHeight = canvas.height - game.pipeGap - minHeight;
        
        // Ensure we always have visible top and bottom pipes
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        const bottomY = topHeight + game.pipeGap;
        
        game.pipes.push({
            x: canvas.width,
            topHeight: topHeight,
            bottomY: bottomY,
            width: flappyConfig.pipes?.width || 80,
            passed: false
        });
    }
    
    function updateBird() {
        if (game.gameOver || game.won) return;
        
        const gravity = flappyConfig.physics?.gravity || 0.6;
        const terminalVelocity = flappyConfig.physics?.terminalVelocity || 8;
        
        game.bird.velocity += gravity;
        game.bird.velocity = Math.min(game.bird.velocity, terminalVelocity);
        game.bird.y += game.bird.velocity;
        
        if (game.bird.y <= 0 || game.bird.y >= canvas.height - game.bird.size) {
            game.gameOver = true;
        }
    }
    
    function updatePipes() {
        if (game.gameOver || game.won) return;
        
        if (game.pipes.length === 0 || game.pipes[game.pipes.length - 1].x < canvas.width - (flappyConfig.pipes?.spacing || 200)) {
            createPipe();
        }
        
        game.pipes.forEach(pipe => {
            pipe.x -= game.gameSpeed;
            
            if (!pipe.passed && pipe.x + pipe.width < game.bird.x) {
                pipe.passed = true;
                game.score++;
                
                if (game.score >= game.pipesToWin) {
                    game.won = true;
                    gameWon = true;
                    setTimeout(showQuestion, 1000);
                }
            }
            
            if (game.bird.x < pipe.x + pipe.width && 
                game.bird.x + game.bird.size > pipe.x) {
                if (game.bird.y < pipe.topHeight || 
                    game.bird.y + game.bird.size > pipe.bottomY) {
                    game.gameOver = true;
                }
            }
        });
        
        game.pipes = game.pipes.filter(pipe => pipe.x > -pipe.width);
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(game.bird.x, game.bird.y, game.bird.size, game.bird.size);
        
        ctx.fillStyle = '#4ecdc4';
        game.pipes.forEach(pipe => {
            ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, canvas.height - pipe.bottomY);
        });
        
        ctx.fillStyle = 'white';
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${game.score}/${game.pipesToWin}`, 10, 25);
        
        if (game.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.font = '18px "Courier New", monospace';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
        } else if (game.won) {
            ctx.fillStyle = 'rgba(0,255,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Level Complete!', canvas.width/2, canvas.height/2);
        }
    }
    
    function gameLoop() {
        updateBird();
        updatePipes();
        draw();
        if (!game.gameOver && !game.won) {
            requestAnimationFrame(gameLoop);
        }
    }
    
    function handleKeyPress(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (game.gameOver) {
                game = {
                    bird: { 
                        x: 100, 
                        y: 200, 
                        velocity: 0, 
                        size: flappyConfig.physics?.birdSize || 20 
                    },
                    pipes: [],
                    score: 0,
                    gameSpeed: flappyConfig.gameplay?.gameSpeed || settings.gameSpeed || 2,
                    pipeGap: flappyConfig.pipes?.gap || settings.pipeGap || 150,
                    pipesToWin: flappyConfig.gameplay?.pipesToWin || settings.pipesToWin || 5,
                    gameOver: false,
                    won: false
                };
                gameLoop();
            } else if (!game.won) {
                const jumpStrength = flappyConfig.physics?.jumpStrength || -12;
                game.bird.velocity = jumpStrength;
            }
        }
    }
    
    document.addEventListener('keydown', handleKeyPress);
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Press SPACE to flap, avoid pipes!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    gameLoop();
}
