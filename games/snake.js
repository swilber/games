function createSnakeGame(settings) {
    const gameArea = document.getElementById('game-area');
    const canvas = document.createElement('canvas');
    canvas.width = settings.boardSize;
    canvas.height = settings.boardSize;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    
    let snake = [{x: 200, y: 200}];
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
        ctx.fillText(`Score: ${score}/${settings.requiredScore}`, 10, 30);
        
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
            score++;
            if(score >= settings.requiredScore) {
                gameWon = true;
                showQuestion();
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
        snake = [{x: 200, y: 200}];
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
    
    generateFood();
    gameArea.appendChild(canvas);
    
    gameInterval = setInterval(() => {
        moveSnake();
        drawGame();
    }, settings.gameSpeed);
    
    drawGame();
}
