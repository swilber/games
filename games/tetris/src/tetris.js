async function createTetrisGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Tetris configuration using ConfigManager
    let tetrisConfig = {};
    if (typeof configManager !== 'undefined') {
        tetrisConfig = await configManager.loadConfig('tetris');
        console.log('Tetris config loaded via ConfigManager:', tetrisConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        tetrisConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameWon = false;
    let gameOver = false;
    let gameStarted = false;
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropTimer = 0;
    let lockTimer = 0;
    let softDrop = false;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = tetrisConfig.physics?.canvasWidth || 480;
    canvas.height = tetrisConfig.physics?.canvasHeight || 640;
    const ctx = canvas.getContext('2d');
    
    // Game board
    const BOARD_WIDTH = tetrisConfig.physics?.boardWidth || 10;
    const BOARD_HEIGHT = tetrisConfig.physics?.boardHeight || 20;
    const BLOCK_SIZE = tetrisConfig.physics?.blockSize || 32;
    const board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    
    // Tetromino definitions (authentic Tetris pieces)
    const TETROMINOES = {
        I: {
            shape: [
                [0,0,0,0],
                [1,1,1,1],
                [0,0,0,0],
                [0,0,0,0]
            ],
            color: '#00FFFF' // Cyan
        },
        O: {
            shape: [
                [1,1],
                [1,1]
            ],
            color: '#FFFF00' // Yellow
        },
        T: {
            shape: [
                [0,1,0],
                [1,1,1],
                [0,0,0]
            ],
            color: '#800080' // Purple
        },
        S: {
            shape: [
                [0,1,1],
                [1,1,0],
                [0,0,0]
            ],
            color: '#00FF00' // Green
        },
        Z: {
            shape: [
                [1,1,0],
                [0,1,1],
                [0,0,0]
            ],
            color: '#FF0000' // Red
        },
        J: {
            shape: [
                [1,0,0],
                [1,1,1],
                [0,0,0]
            ],
            color: '#0000FF' // Blue
        },
        L: {
            shape: [
                [0,0,1],
                [1,1,1],
                [0,0,0]
            ],
            color: '#FFA500' // Orange
        }
    };
    
    const PIECE_TYPES = Object.keys(TETROMINOES);
    
    // Current and next pieces
    let currentPiece = null;
    let nextPiece = null;
    let ghostPiece = null;
    let flashingLines = [];
    let flashTimer = 0;
    
    // Input handling
    const keys = {};
    let keyRepeatTimers = {};
    
    function createPiece(type) {
        const template = TETROMINOES[type];
        return {
            type: type,
            shape: template.shape.map(row => [...row]),
            color: template.color,
            x: Math.floor(BOARD_WIDTH / 2) - Math.floor(template.shape[0].length / 2),
            y: 0,
            rotation: 0
        };
    }
    
    function getRandomPiece() {
        return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    }
    
    function rotatePiece(piece, clockwise = true) {
        const rotated = {
            ...piece,
            shape: piece.shape.map(row => [...row])
        };
        
        const size = rotated.shape.length;
        
        // Rotate matrix
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (clockwise) {
                    rotated.shape[j][size - 1 - i] = piece.shape[i][j];
                } else {
                    rotated.shape[size - 1 - j][i] = piece.shape[i][j];
                }
            }
        }
        
        return rotated;
    }
    
    function isValidPosition(piece, offsetX = 0, offsetY = 0) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = piece.x + x + offsetX;
                    const newY = piece.y + y + offsetY;
                    
                    if (newX < 0 || newX >= BOARD_WIDTH || 
                        newY >= BOARD_HEIGHT || 
                        (newY >= 0 && board[newY][newX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    function placePiece(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;
                    if (boardY >= 0) {
                        board[boardY][boardX] = piece.color;
                    }
                }
            }
        }
    }
    
    function clearLines() {
        const linesToClear = [];
        
        // Find complete lines
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                linesToClear.push(y);
            }
        }
        
        if (linesToClear.length > 0) {
            // Start flashing animation
            flashingLines = [...linesToClear];
            flashTimer = 300; // Flash for 300ms
            return linesToClear.length;
        }
        
        return 0;
    }
    
    function removeFlashingLines() {
        let linesCleared = flashingLines.length;
        
        // Remove the flashing lines
        flashingLines.forEach(lineY => {
            board.splice(lineY, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
        });
        
        if (linesCleared > 0) {
            lines += linesCleared;
            
            // Scoring system (authentic Tetris scoring)
            const baseScore = [0, 40, 100, 300, 1200][linesCleared];
            score += baseScore * (level + 1);
            
            // Level progression
            const newLevel = Math.floor(lines / (tetrisConfig.gameplay?.linesPerLevel || 10)) + 1;
            if (newLevel > level) {
                level = newLevel;
            }
        }
        
        flashingLines = [];
        flashTimer = 0;
        return linesCleared;
    }
    
    function calculateGhost(piece) {
        const ghost = { ...piece };
        while (isValidPosition(ghost, 0, 1)) {
            ghost.y++;
        }
        return ghost;
    }
    
    function spawnNewPiece() {
        if (!nextPiece) {
            nextPiece = getRandomPiece();
        }
        
        currentPiece = createPiece(nextPiece);
        nextPiece = getRandomPiece();
        
        // Check game over
        if (!isValidPosition(currentPiece)) {
            gameOver = true;
            gameRunning = false;
            return;
        }
        
        ghostPiece = calculateGhost(currentPiece);
    }
    
    function getDropSpeed() {
        const level1Speed = 800; // Slow start
        const level5Speed = 175; // Fast end at level 5
        
        // Linear interpolation between level 1 and level 5
        const progress = (level - 1) / 4; // 0 to 1 over 4 level increments
        return Math.round(level1Speed - (level1Speed - level5Speed) * progress);
    }
    
    function drawBlock(x, y, color, alpha = 1) {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        // Block border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.globalAlpha = 1;
    }
    
    function drawPiece(piece, offsetX = 0, offsetY = 0, alpha = 1) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    drawBlock(
                        piece.x + x + offsetX, 
                        piece.y + y + offsetY, 
                        piece.color, 
                        alpha
                    );
                }
            }
        }
    }
    
    function drawBoard() {
        // Draw placed blocks
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x]) {
                    // Flash completed lines
                    if (flashingLines.includes(y)) {
                        const flashIntensity = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
                        drawBlock(x, y, '#ffffff', flashIntensity);
                    } else {
                        drawBlock(x, y, board[y][x]);
                    }
                }
            }
        }
        
        // Draw grid
        ctx.strokeStyle = tetrisConfig.visual?.gridColor || '#333333';
        ctx.lineWidth = 1;
        for (let x = 0; x <= BOARD_WIDTH; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK_SIZE, 0);
            ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
            ctx.stroke();
        }
        for (let y = 0; y <= BOARD_HEIGHT; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK_SIZE);
            ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
            ctx.stroke();
        }
    }
    
    function drawUI() {
        const uiX = BOARD_WIDTH * BLOCK_SIZE + 20;
        
        // Draw background panels for retro look
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(uiX - 10, 10, 140, 80); // Score panel
        ctx.fillRect(uiX - 10, 100, 140, 80); // Lines panel
        ctx.fillRect(uiX - 10, 190, 140, 80); // Level panel
        ctx.fillRect(uiX - 10, 280, 140, 120); // Next piece panel
        ctx.fillRect(uiX - 10, 410, 140, 80); // Progress panel
        
        // Draw panel borders
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(uiX - 10, 10, 140, 80); // Score border
        ctx.strokeRect(uiX - 10, 100, 140, 80); // Lines border
        ctx.strokeRect(uiX - 10, 190, 140, 80); // Level border
        ctx.strokeRect(uiX - 10, 280, 140, 120); // Next piece border
        ctx.strokeRect(uiX - 10, 410, 140, 80); // Progress border
        
        ctx.fillStyle = tetrisConfig.visual?.textColor || '#ffffff';
        ctx.font = '20px "Courier New", monospace';
        
        // Score
        ctx.fillText('SCORE', uiX, 30);
        ctx.fillStyle = '#00ff00';
        ctx.fillText(score.toString(), uiX, 55);
        
        // Lines
        ctx.fillStyle = '#ffffff';
        ctx.fillText('LINES', uiX, 120);
        ctx.fillStyle = '#00ff00';
        ctx.fillText(lines.toString(), uiX, 145);
        
        // Level
        ctx.fillStyle = '#ffffff';
        ctx.fillText('LEVEL', uiX, 210);
        ctx.fillStyle = '#00ff00';
        ctx.fillText(level.toString(), uiX, 235);
        
        // Next piece
        ctx.fillStyle = '#ffffff';
        ctx.fillText('NEXT', uiX, 300);
        if (nextPiece) {
            const nextTemplate = TETROMINOES[nextPiece];
            ctx.fillStyle = nextTemplate.color;
            for (let y = 0; y < nextTemplate.shape.length; y++) {
                for (let x = 0; x < nextTemplate.shape[y].length; x++) {
                    if (nextTemplate.shape[y][x]) {
                        ctx.fillRect(
                            uiX + x * 20, 
                            320 + y * 20, 
                            18, 18
                        );
                        // Add block borders for retro look
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(
                            uiX + x * 20, 
                            320 + y * 20, 
                            18, 18
                        );
                    }
                }
            }
        }
        
        // Progress information
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText('PROGRESS', uiX, 430);
        
        const linesPerLevel = tetrisConfig.gameplay?.linesPerLevel || 10;
        const currentLevelLines = lines % linesPerLevel;
        const targetLevel = 5; // Win condition level
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillText(`Level ${level}/${targetLevel}`, uiX, 450);
        ctx.fillText(`Lines: ${currentLevelLines}/${linesPerLevel}`, uiX, 465);
        
        // Progress bar
        const barWidth = 100;
        const barHeight = 8;
        const progress = currentLevelLines / linesPerLevel;
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(uiX, 470, barWidth, barHeight);
        
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(uiX, 470, barWidth * progress, barHeight);
        
        // Controls panel
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(uiX - 10, 500, 140, 80);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(uiX - 10, 500, 140, 80);
        
        // Controls
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('← → Move', uiX, 520);
        ctx.fillText('↓ Soft Drop', uiX, 535);
        ctx.fillText('↑ Hard Drop', uiX, 550);
        ctx.fillText('SPACE Rotate', uiX, 565);
    }
    
    function render() {
        // Clear canvas
        ctx.fillStyle = tetrisConfig.visual?.backgroundColor || '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw game board
        drawBoard();
        
        // Draw ghost piece
        if (ghostPiece && currentPiece) {
            drawPiece(ghostPiece, 0, 0, 0.3);
        }
        
        // Draw current piece
        if (currentPiece) {
            drawPiece(currentPiece);
        }
        
        // Draw UI
        drawUI();
        
        if (!gameStarted) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '24px "Courier New", monospace';
            ctx.fillText('TETRIS', canvas.width/2 - 50, canvas.height/2 - 50);
            ctx.font = '16px "Courier New", monospace';
            ctx.fillText('Press any key to start', canvas.width/2 - 80, canvas.height/2);
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = '36px "Courier New", monospace';
            ctx.fillText('GAME OVER', canvas.width/2 - 100, canvas.height/2);
        }
    }
    
    function update(deltaTime) {
        if (!gameRunning || gameOver || !currentPiece) return;
        
        // Handle flashing lines animation
        if (flashTimer > 0) {
            flashTimer -= deltaTime;
            if (flashTimer <= 0) {
                removeFlashingLines();
                spawnNewPiece();
            }
            return; // Don't update game while flashing
        }
        
        dropTimer += deltaTime;
        const currentDropSpeed = softDrop ? 50 : getDropSpeed();
        
        if (dropTimer >= currentDropSpeed) {
            if (isValidPosition(currentPiece, 0, 1)) {
                currentPiece.y++;
                lockTimer = 0;
            } else {
                // Piece can't fall further - place it and check for lines
                placePiece(currentPiece);
                const linesFound = clearLines();
                if (linesFound === 0) {
                    spawnNewPiece();
                }
                lockTimer = 0;
            }
            dropTimer = 0;
        }
        
        // Update ghost piece
        if (currentPiece) {
            ghostPiece = calculateGhost(currentPiece);
        }
    }
    
    function handleKeyDown(e) {
        if (!gameStarted) {
            gameStarted = true;
            spawnNewPiece();
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('tetris');
            }
            return;
        }
        
        if (!gameRunning || gameOver || !currentPiece) return;
        
        keys[e.code] = true;
        
        switch(e.code) {
            case 'ArrowLeft':
                if (isValidPosition(currentPiece, -1, 0)) {
                    currentPiece.x--;
                }
                break;
                
            case 'ArrowRight':
                if (isValidPosition(currentPiece, 1, 0)) {
                    currentPiece.x++;
                }
                break;
                
            case 'ArrowDown':
                softDrop = true;
                break;
                
            case 'ArrowUp':
                // Hard drop
                while (isValidPosition(currentPiece, 0, 1)) {
                    currentPiece.y++;
                    score += 2; // Hard drop bonus
                }
                break;
                
            case 'Space':
                // Rotate clockwise
                const rotatedCW = rotatePiece(currentPiece, true);
                if (isValidPosition(rotatedCW)) {
                    currentPiece.shape = rotatedCW.shape;
                }
                break;
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        keys[e.code] = false;
        
        if (e.code === 'ArrowDown') {
            softDrop = false;
        }
    }
    
    // Store handler references for cleanup
    const keyDownHandler = handleKeyDown;
    const keyUpHandler = handleKeyUp;
    
    // Set up game
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    gameArea.appendChild(canvas);
    
    // Start game loop
    gameRunning = true;
    let lastTime = 0;
    
    function gameLoop(currentTime) {
        if (!gameRunning) return;
        
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        update(deltaTime);
        render();
        
        // Check win condition (reach level 5)
        if (level >= 5) {
            gameWon = true;
            gameRunning = false;
            
            if (callbacks && callbacks.onGameComplete) {
                setTimeout(() => {
                    callbacks.onGameComplete('tetris', { 
                        completed: true, 
                        score: score,
                        lines: lines,
                        level: level 
                    });
                }, 1500);
            }
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    requestAnimationFrame(gameLoop);
    render(); // Initial render
    
    // Return cleanup function
    return {
        cleanup: () => {
            gameRunning = false;
            document.removeEventListener('keydown', keyDownHandler);
            document.removeEventListener('keyup', keyUpHandler);
        }
    };
}
