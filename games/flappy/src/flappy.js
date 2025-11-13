async function createFlappyGame(settings, callbacks = null) {
    console.log('createFlappyGame called with settings:', settings);
    const gameArea = document.getElementById('game-area');
    console.log('gameArea found:', gameArea);
    
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
    
    console.log('Creating canvas...');
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    console.log('Canvas created, context:', ctx);
    
    // Background clouds
    const clouds = [];
    
    // Game object
    let game = {};
    
    try {
        console.log('Creating clouds...');
        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * 100 + 20,
                size: Math.random() * 30 + 20,
                speed: Math.random() * 0.5 + 0.2
            });
        }
        console.log('Clouds created:', clouds.length);
        
        console.log('Creating game object...');
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
        console.log('Game object created:', game);
        
        console.log('Defining game functions...');
        
    } catch (error) {
        console.error('Error during Flappy Bird initialization:', error);
        throw error;
    }
    
    console.log('Setting up event listeners and final initialization...');
    
    console.log('Defining updateClouds function...');
    function updateClouds() {
        clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.size < 0) {
                cloud.x = canvas.width + cloud.size;
                cloud.y = Math.random() * 100 + 20;
            }
        });
    }
    
    function drawCloud(x, y, size) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.4, y, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.2, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
        ctx.arc(x + size * 0.6, y - size * 0.3, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function drawBird(x, y, size) {
        // Bird body
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(x + size/2, y + size/2, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird wing
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.ellipse(x + size * 0.3, y + size * 0.4, size * 0.3, size * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird beak
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.moveTo(x + size * 0.9, y + size * 0.5);
        ctx.lineTo(x + size * 1.2, y + size * 0.4);
        ctx.lineTo(x + size * 0.9, y + size * 0.6);
        ctx.fill();
        
        // Bird eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + size * 0.7, y + size * 0.3, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye highlight
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(x + size * 0.72, y + size * 0.28, size * 0.03, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function drawPipe(x, topHeight, bottomY, width) {
        // Pipe gradient
        const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
        gradient.addColorStop(0, '#4CAF50');
        gradient.addColorStop(0.3, '#66BB6A');
        gradient.addColorStop(0.7, '#4CAF50');
        gradient.addColorStop(1, '#388E3C');
        
        // Top pipe
        ctx.fillStyle = gradient;
        ctx.fillRect(x, 0, width, topHeight);
        
        // Top pipe cap
        ctx.fillRect(x - 5, topHeight - 30, width + 10, 30);
        
        // Bottom pipe
        ctx.fillRect(x, bottomY, width, canvas.height - bottomY);
        
        // Bottom pipe cap
        ctx.fillRect(x - 5, bottomY, width + 10, 30);
        
        // Pipe shading
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x + width - 8, 0, 8, topHeight);
        ctx.fillRect(x + width - 8, bottomY, 8, canvas.height - bottomY);
        
        // Pipe highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 2, 0, 4, topHeight);
        ctx.fillRect(x + 2, bottomY, 4, canvas.height - bottomY);
    }
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
                    if (callbacks && callbacks.onGameComplete) {
                        setTimeout(() => {
                            callbacks.onGameComplete('flappy', { completed: true, score: game.score });
                        }, 1000);
                    }
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
        // Sky gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw clouds
        clouds.forEach(cloud => {
            drawCloud(cloud.x, cloud.y, cloud.size);
        });
        
        // Draw bird
        drawBird(game.bird.x, game.bird.y, game.bird.size);
        
        // Draw pipes with shading
        game.pipes.forEach(pipe => {
            drawPipe(pipe.x, pipe.topHeight, pipe.bottomY, pipe.width);
        });
        
        // UI text
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.strokeText(`Score: ${game.score}/${game.pipesToWin}`, 10, 25);
        ctx.fillText(`Score: ${game.score}/${game.pipesToWin}`, 10, 25);
        
        if (game.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.strokeText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.font = '18px "Courier New", monospace';
            ctx.strokeText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
        } else if (game.won) {
            ctx.fillStyle = 'rgba(0,255,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.strokeText('Level Complete!', canvas.width/2, canvas.height/2);
            ctx.fillText('Level Complete!', canvas.width/2, canvas.height/2);
        }
    }
    
    function gameLoop() {
        updateClouds();
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
    
    document.addEventListener('keydown', handleKeyPress);
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Press SPACE to flap, avoid pipes!';
    instructions.style.textAlign = 'center';
    
    console.log('Flappy Bird initialized, starting game loop');
    console.log('Game state:', game);
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    console.log('Adding canvas to gameArea...');
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    console.log('Canvas added, calling gameLoop...');
    gameLoop();
    console.log('gameLoop called, returning cleanup function...');
    
    // Return cleanup function
    return {
        cleanup: () => {
            document.removeEventListener('keydown', handleKeyPress);
        }
    };
}
