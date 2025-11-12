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
    let gameStarted = false;
    let gameInterval;
    
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
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}/${snakeConfig.gameplay.requiredScore}`, 10, 30);
        
        if (!gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Press arrow key to begin', canvas.width/2, canvas.height/2);
        }
    }
    
    function moveSnake() {
        if (!gameStarted) return;
        
        const head = {x: snake[0].x + dx, y: snake[0].y + dy};
        
        if(head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
            resetGame();
            return;
        }
        
        if(snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            resetGame();
            return;
        }
        
        snake.unshift(head);
        
        if(head.x === food.x && head.y === food.y) {
            score += snakeConfig.scoring.foodValue;
            if(score >= snakeConfig.gameplay.requiredScore) {
                // Use callback if provided, otherwise fallback to global functions
                if (callbacks?.onGameComplete) {
                    const currentLevelData = levels?.[currentLevel];
                    callbacks.onGameComplete('snake', currentLevelData);
                } else {
                    // Fallback to original global approach
                    gameWon = true;
                    showQuestion();
                }
                return;
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
        gameStarted = false;
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
    }, snakeConfig.gameplay.gameSpeed);
    
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
