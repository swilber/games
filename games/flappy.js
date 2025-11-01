function createFlappyGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.border = '2px solid #000';
    canvas.style.background = 'linear-gradient(#70c5ce, #dee4aa)';
    
    const ctx = canvas.getContext('2d');
    
    let game = {
        bird: { x: 100, y: 200, velocity: 0, size: 20 },
        pipes: [],
        score: 0,
        gameSpeed: settings.gameSpeed,
        pipeGap: settings.pipeGap,
        pipesToWin: settings.pipesToWin,
        gameOver: false,
        won: false
    };
    
    function createPipe() {
        const minHeight = 50;
        const maxHeight = canvas.height - game.pipeGap - minHeight;
        const height = Math.random() * (maxHeight - minHeight) + minHeight;
        
        game.pipes.push({
            x: canvas.width,
            topHeight: height,
            bottomY: height + game.pipeGap,
            width: 50,
            passed: false
        });
    }
    
    function updateBird() {
        if (game.gameOver || game.won) return;
        
        game.bird.velocity += 0.15;
        game.bird.velocity = Math.min(game.bird.velocity, 4);
        game.bird.y += game.bird.velocity;
        
        if (game.bird.y <= 0 || game.bird.y >= canvas.height - game.bird.size) {
            game.gameOver = true;
        }
    }
    
    function updatePipes() {
        if (game.gameOver || game.won) return;
        
        if (game.pipes.length === 0 || game.pipes[game.pipes.length - 1].x < canvas.width - 200) {
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
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${game.score}/${game.pipesToWin}`, 10, 30);
        
        if (game.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.font = '18px Arial';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
        } else if (game.won) {
            ctx.fillStyle = 'rgba(0,255,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
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
                    bird: { x: 100, y: 200, velocity: 0, size: 20 },
                    pipes: [],
                    score: 0,
                    gameSpeed: settings.gameSpeed,
                    pipeGap: settings.pipeGap,
                    pipesToWin: settings.pipesToWin,
                    gameOver: false,
                    won: false
                };
                gameLoop();
            } else if (!game.won) {
                game.bird.velocity = -5;
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
