async function createSnakeGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Call onGameStart callback if provided
    if (callbacks?.onGameStart) {
        await callbacks.onGameStart('snake');
    }
    
    // Load Snake configuration using ConfigManager (same as Mario/Pac-Man)
    let snakeConfig = {};
    if (typeof configManager !== 'undefined') {
        snakeConfig = await configManager.loadConfig('snake');
        console.log('Snake config loaded via ConfigManager:', snakeConfig);
    } else {
        // Fallback to default values
        console.warn('Could not load Snake config, using defaults');
        snakeConfig = {
            gameplay: { gameSpeed: 150, requiredScore: 5, boardSize: 400, gridSize: 20 },
            snake: { startLength: 1, growthRate: 1, startX: 200, startY: 200 },
            scoring: { foodValue: 1 }
        };
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = snakeConfig.gameplay.boardSize;
    canvas.height = snakeConfig.gameplay.boardSize;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    const gridSize = snakeConfig.gameplay.gridSize;
    
    let snake = [{x: snakeConfig.snake.startX, y: snakeConfig.snake.startY}];
    let food = {x: 100, y: 100};
    let dx = 0, dy = 0;
    let score = 0;
    let currentLevel = 1;
    let lives = snakeConfig.gameplay?.lives || 3;
    let gameStarted = false;
    let gameInterval;
    
    // Calculate level-specific values
    function getLevelRequiredScore() {
        const baseScore = snakeConfig.gameplay?.requiredScore || 5;
        const scoreIncrease = snakeConfig.gameplay?.scoreIncrease || 3;
        return baseScore + ((currentLevel - 1) * scoreIncrease);
    }
    
    function getLevelSpeed() {
        const baseSpeed = snakeConfig.gameplay?.gameSpeed || 150;
        const speedIncrease = snakeConfig.gameplay?.speedIncrease || 20;
        return Math.max(50, baseSpeed - ((currentLevel - 1) * speedIncrease));
    }
    
    function drawGame() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#0f0';
        snake.forEach(segment => {
            ctx.fillRect(segment.x, segment.y, gridSize, gridSize);
        });
        
        ctx.fillStyle = '#f00';
        ctx.fillRect(food.x, food.y, gridSize, gridSize);
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'left';
        const totalLevels = snakeConfig.gameplay?.totalLevels || 3;
        ctx.fillText(`Level: ${currentLevel}/${totalLevels}`, 10, 25);
        ctx.fillText(`Score: ${score}/${getLevelRequiredScore()}`, 10, 45);
        ctx.fillText(`Lives: ${lives}`, 10, 65);
        
        if (!gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Press arrow key to begin', canvas.width/2, canvas.height/2);
            ctx.font = '18px "Courier New", monospace';
            ctx.fillText(`Level ${currentLevel} - Get ${getLevelRequiredScore()} points`, canvas.width/2, canvas.height/2 + 40);
        }
    }
    
    function moveSnake() {
        if (!gameStarted) return;
        
        const head = {x: snake[0].x + dx, y: snake[0].y + dy};
        
        if(head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
            lives--;
            if(lives <= 0) {
                resetGame();
            } else {
                // Reset current level but keep progress
                snake = [{x: snakeConfig.snake.startX, y: snakeConfig.snake.startY}];
                dx = 0; dy = 0;
                score = 0;
                gameStarted = false;
                generateFood();
            }
            return;
        }
        
        if(snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            lives--;
            if(lives <= 0) {
                resetGame();
            } else {
                // Reset current level but keep progress
                snake = [{x: snakeConfig.snake.startX, y: snakeConfig.snake.startY}];
                dx = 0; dy = 0;
                score = 0;
                gameStarted = false;
                generateFood();
            }
            return;
        }
        
        snake.unshift(head);
        
        if(head.x === food.x && head.y === food.y) {
            score += snakeConfig.scoring?.foodValue || 1;
            if(score >= getLevelRequiredScore()) {
                const totalLevels = snakeConfig.gameplay?.totalLevels || 3;
                if(currentLevel >= totalLevels) {
                    // Game complete - all levels finished
                    if (callbacks?.onGameComplete) {
                        const currentLevelData = levels?.[currentLevel];
                        callbacks.onGameComplete('snake', currentLevelData);
                    } else {
                        gameWon = true;
                        showQuestion();
                    }
                    return;
                } else {
                    // Next level
                    currentLevel++;
                    score = 0;
                    snake = [{x: snakeConfig.snake.startX, y: snakeConfig.snake.startY}];
                    dx = 0; dy = 0;
                    gameStarted = false;
                    
                    // Update game speed for new level
                    clearInterval(gameInterval);
                    gameInterval = setInterval(() => {
                        moveSnake();
                        drawGame();
                    }, getLevelSpeed());
                    
                    generateFood();
                    return;
                }
            }
            generateFood();
        } else {
            snake.pop();
        }
    }
    
    function generateFood() {
        do {
            food.x = Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize;
            food.y = Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize;
        } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
    }
    
    function resetGame() {
        snake = [{x: snakeConfig.snake.startX, y: snakeConfig.snake.startY}];
        dx = 0; dy = 0;
        score = 0;
        currentLevel = 1;
        lives = snakeConfig.gameplay?.lives || 3;
        gameStarted = false;
        
        // Reset to level 1 speed
        clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            moveSnake();
            drawGame();
        }, getLevelSpeed());
        
        generateFood();
    }
    
    function handleKeyPress(e) {
        if (!gameStarted) {
            gameStarted = true;
        }
        
        if(e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -gridSize; }
        if(e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = gridSize; }
        if(e.key === 'ArrowLeft' && dx === 0) { dx = -gridSize; dy = 0; }
        if(e.key === 'ArrowRight' && dx === 0) { dx = gridSize; dy = 0; }
    }
    
    document.addEventListener('keydown', handleKeyPress);
    
    // Store handler reference for cleanup
    const keyPressHandler = handleKeyPress;
    
    generateFood();
    gameArea.appendChild(canvas);
    
    gameInterval = setInterval(() => {
        moveSnake();
        drawGame();
    }, getLevelSpeed());
    
    drawGame();
    
    // Return cleanup function
    return {
        cleanup: () => {
            if (gameInterval) {
                clearInterval(gameInterval);
            }
            document.removeEventListener('keydown', keyPressHandler);
        }
    };
}
