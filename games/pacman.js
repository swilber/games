function createPacmanGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 575;
    canvas.style.border = '2px solid #000';
    canvas.style.background = '#000';
    
    const ctx = canvas.getContext('2d');
    const cellSize = 25;
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    
    // Classic Pac-Man maze layout (1 = wall, 0 = dot, 2 = power pellet, 3 = empty)
    const maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,2,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,2,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,3,3,3,3,3,3,3,3,3,3,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,3,1,1,3,3,3,3,1,1,3,1,1,0,1,1,1,1,1,1],
        [3,3,3,3,3,3,0,3,3,3,1,3,3,3,3,3,3,1,3,3,3,0,3,3,3,3,3,3],
        [1,1,1,1,1,1,0,1,1,3,1,3,3,3,3,3,3,1,3,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,3,1,1,1,1,1,1,1,1,3,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,3,3,3,3,3,3,3,3,3,3,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
        [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
        [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    
    let game = {
        pacman: { x: 14, y: 21, direction: 0, nextDirection: 0 }, // 0=right, 1=down, 2=left, 3=up
        ghosts: [
            { x: 13, y: 11, direction: 0, color: '#ff0000', mode: 'scatter' },
            { x: 14, y: 11, direction: 2, color: '#ffb8ff', mode: 'scatter' },
            { x: 14, y: 12, direction: 0, color: '#00ffff', mode: 'scatter' },
            { x: 15, y: 11, direction: 2, color: '#ffb852', mode: 'scatter' }
        ],
        score: 0,
        lives: 3,
        dotsRemaining: 0,
        powerMode: false,
        powerModeTimer: 0,
        gameOver: false,
        won: false,
        gameStarted: false,
        keys: {},
        animationFrame: 0
    };
    
    // Directions: right, down, left, up
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    
    function initializeGame() {
        // Count dots
        game.dotsRemaining = 0;
        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                if (maze[y][x] === 0 || maze[y][x] === 2) {
                    game.dotsRemaining++;
                }
            }
        }
        
        // Create ghosts
        const ghostColors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
        const startPositions = [[13, 11], [14, 11], [14, 12], [15, 11]];
        
        // Create ghosts with individual behaviors
        const ghostData = [
            { color: '#ff0000', behavior: 'chase', name: 'Blinky' },    // Red - direct chase
            { color: '#ffb8ff', behavior: 'ambush', name: 'Pinky' },   // Pink - ambush ahead
            { color: '#00ffff', behavior: 'patrol', name: 'Inky' },    // Cyan - patrol/shy
            { color: '#ffb852', behavior: 'random', name: 'Clyde' }    // Orange - random/flee
        ];
        
        for (let i = 0; i < settings.ghostCount; i++) {
            game.ghosts.push({
                x: startPositions[i][0],
                y: startPositions[i][1],
                direction: Math.floor(Math.random() * 4),
                color: ghostData[i].color,
                behavior: ghostData[i].behavior,
                vulnerable: false,
                dead: false,
                modeTimer: 0
            });
        }
    }
    
    function canMove(x, y) {
        if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
        return maze[y][x] !== 1;
    }
    
    function updatePacman() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Handle input
        if (game.keys['ArrowRight'] || game.keys['KeyD']) game.nextDirection = 0;
        if (game.keys['ArrowDown'] || game.keys['KeyS']) game.nextDirection = 1;
        if (game.keys['ArrowLeft'] || game.keys['KeyA']) game.nextDirection = 2;
        if (game.keys['ArrowUp'] || game.keys['KeyW']) game.nextDirection = 3;
        
        // Try to change direction
        const [nextDx, nextDy] = directions[game.nextDirection];
        if (canMove(game.pacman.x + nextDx, game.pacman.y + nextDy)) {
            game.pacman.direction = game.nextDirection;
        }
        
        // Move Pac-Man
        const [dx, dy] = directions[game.pacman.direction];
        let newX = game.pacman.x + dx;
        let newY = game.pacman.y + dy;
        
        // Handle screen wrapping
        if (newX < 0) newX = 27;
        if (newX > 27) newX = 0;
        
        if (canMove(newX, newY)) {
            game.pacman.x = newX;
            game.pacman.y = newY;
            
            // Tunnel effect (wrap around)
            if (game.pacman.x < 0) game.pacman.x = cols - 1;
            if (game.pacman.x >= cols) game.pacman.x = 0;
            
            // Eat dots
            const cell = maze[game.pacman.y][game.pacman.x];
            if (cell === 0) {
                maze[game.pacman.y][game.pacman.x] = 3;
                game.score += 10;
                game.dotsRemaining--;
            } else if (cell === 2) {
                maze[game.pacman.y][game.pacman.x] = 3;
                game.score += 50;
                game.dotsRemaining--;
                
                // Power mode
                game.powerMode = true;
                game.powerModeTimer = settings.powerPelletDuration;
                game.ghosts.forEach(ghost => {
                    if (!ghost.dead) {
                        ghost.vulnerable = true;
                    }
                });
            }
        }
        
        // Check win condition
        if (game.dotsRemaining === 0) {
            game.won = true;
            gameWon = true;
            setTimeout(showQuestion, 1000);
        }
    }
    
    function updateGhosts() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Update power mode
        if (game.powerMode) {
            game.powerModeTimer -= 150; // Match game loop timing (150ms per frame)
            if (game.powerModeTimer <= 0) {
                game.powerMode = false;
                game.ghosts.forEach(ghost => {
                    if (!ghost.dead) {
                        ghost.vulnerable = false;
                    }
                });
            }
        }
        
        game.ghosts.forEach(ghost => {
            if (ghost.dead && !ghost.returning) return;
            
            // Handle returning ghosts (eaten ghosts going back to base)
            if (ghost.returning) {
                const homeX = 14, homeY = 11;
                if (ghost.x === homeX && ghost.y === homeY) {
                    ghost.dead = false;
                    ghost.returning = false;
                    return;
                }
                
                // Move directly toward home
                if (ghost.x < homeX) ghost.x++;
                else if (ghost.x > homeX) ghost.x--;
                else if (ghost.y < homeY) ghost.y++;
                else if (ghost.y > homeY) ghost.y--;
                return;
            }
            
            // Ghost speed control - ghosts move slower than Pac-Man
            ghost.moveTimer = (ghost.moveTimer || 0) + 1;
            const moveDelay = ghost.vulnerable ? 3 : 2; // Slower when vulnerable
            
            if (ghost.moveTimer < moveDelay) return;
            ghost.moveTimer = 0;
            
            // Simple AI - random movement with preference toward Pac-Man
            const possibleMoves = [];
            for (let dir = 0; dir < 4; dir++) {
                const [dx, dy] = directions[dir];
                let newX = ghost.x + dx;
                let newY = ghost.y + dy;
                
                // Handle screen wrapping
                if (newX < 0) newX = 27;
                if (newX > 27) newX = 0;
                
                if (canMove(newX, newY)) {
                    possibleMoves.push(dir);
                }
            }
            
            if (possibleMoves.length > 0) {
                let targetX = game.pacman.x;
                let targetY = game.pacman.y;
                
                if (ghost.vulnerable) {
                    // Flee from Pac-Man when vulnerable
                    targetX = ghost.x + (ghost.x - game.pacman.x);
                    targetY = ghost.y + (ghost.y - game.pacman.y);
                } else {
                    // Individual ghost behaviors
                    switch (ghost.behavior) {
                        case 'chase': // Blinky - direct chase
                            targetX = game.pacman.x;
                            targetY = game.pacman.y;
                            break;
                        case 'ambush': // Pinky - target 4 spaces ahead of Pac-Man
                            const [pacDx, pacDy] = directions[game.pacman.direction];
                            targetX = game.pacman.x + (pacDx * 4);
                            targetY = game.pacman.y + (pacDy * 4);
                            break;
                        case 'patrol': // Inky - patrol corners, shy when close
                            const distToPac = Math.abs(ghost.x - game.pacman.x) + Math.abs(ghost.y - game.pacman.y);
                            if (distToPac < 8) {
                                // Flee to corner when too close
                                targetX = ghost.x < 15 ? 0 : 29;
                                targetY = ghost.y < 15 ? 0 : 22;
                            } else {
                                targetX = game.pacman.x;
                                targetY = game.pacman.y;
                            }
                            break;
                        case 'random': // Clyde - random movement, flee when close
                            const distToClyde = Math.abs(ghost.x - game.pacman.x) + Math.abs(ghost.y - game.pacman.y);
                            if (distToClyde < 8) {
                                // Flee to bottom-left corner
                                targetX = 0;
                                targetY = 22;
                            } else {
                                // Random target
                                targetX = Math.floor(Math.random() * cols);
                                targetY = Math.floor(Math.random() * rows);
                            }
                            break;
                    }
                }
                
                // Choose best direction toward target
                let bestDir = ghost.direction;
                let bestDistance = Infinity;
                
                possibleMoves.forEach(dir => {
                    const [dx, dy] = directions[dir];
                    const newX = ghost.x + dx;
                    const newY = ghost.y + dy;
                    const distance = Math.abs(newX - targetX) + Math.abs(newY - targetY);
                    
                    // Don't reverse direction unless necessary
                    const oppositeDir = (ghost.direction + 2) % 4;
                    if (dir !== oppositeDir || possibleMoves.length === 1) {
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestDir = dir;
                        }
                    }
                });
                
                ghost.direction = bestDir;
            }
            
            // Move ghost
            const [dx, dy] = directions[ghost.direction];
            let newX = ghost.x + dx;
            let newY = ghost.y + dy;
            
            // Handle screen wrapping
            if (newX < 0) newX = 27;
            if (newX > 27) newX = 0;
            
            if (canMove(newX, newY)) {
                ghost.x = newX;
                ghost.y = newY;
                
                // Tunnel effect
                if (ghost.x < 0) ghost.x = cols - 1;
                if (ghost.x >= cols) ghost.x = 0;
            }
        });
        
        // Check collisions after all movement is complete
        game.ghosts.forEach(ghost => {
            if (ghost.dead && !ghost.returning) return;
            
            if (ghost.x === game.pacman.x && ghost.y === game.pacman.y) {
                if (ghost.vulnerable) {
                    // Eat ghost - set to returning state
                    ghost.dead = true;
                    ghost.vulnerable = false;
                    ghost.returning = true;
                    game.score += 200;
                } else if (!ghost.returning) {
                    // Pac-Man dies
                    game.lives--;
                    if (game.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        // Reset positions
                        game.pacman.x = 14;
                        game.pacman.y = 21;
                        game.pacman.direction = 0;
                        game.ghosts.forEach((g, i) => {
                            const startPositions = [[13, 11], [14, 11], [14, 12], [15, 11]];
                            if (i < startPositions.length) {
                                g.x = startPositions[i][0];
                                g.y = startPositions[i][1];
                            }
                            g.vulnerable = false;
                            g.dead = false;
                            g.returning = false;
                        });
                        game.powerMode = false;
                        game.powerModeTimer = 0;
                    }
                }
            }
        });
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw maze
        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                const cell = maze[y][x];
                const pixelX = x * cellSize;
                const pixelY = y * cellSize;
                
                if (cell === 1) {
                    // Wall
                    ctx.fillStyle = '#0000ff';
                    ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
                } else if (cell === 0) {
                    // Dot
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(pixelX + 8, pixelY + 8, 4, 4);
                } else if (cell === 2) {
                    // Power pellet
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(pixelX + 4, pixelY + 4, 12, 12);
                }
            }
        }
        
        // Draw Pac-Man
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(game.pacman.x * cellSize + 2, game.pacman.y * cellSize + 2, cellSize - 4, cellSize - 4);
        
        // Draw mouth based on direction with animation
        const mouthOpen = Math.floor(game.animationFrame / 3) % 2 === 0; // Open/close every 3 frames
        
        if (mouthOpen) {
            ctx.fillStyle = '#000';
            const centerX = game.pacman.x * cellSize + cellSize / 2;
            const centerY = game.pacman.y * cellSize + cellSize / 2;
            const radius = (cellSize - 4) / 2;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            
            if (game.pacman.direction === 0) { // Right
                ctx.lineTo(centerX + radius, centerY - radius/2);
                ctx.lineTo(centerX + radius, centerY + radius/2);
            } else if (game.pacman.direction === 1) { // Down
                ctx.lineTo(centerX - radius/2, centerY + radius);
                ctx.lineTo(centerX + radius/2, centerY + radius);
            } else if (game.pacman.direction === 2) { // Left
                ctx.lineTo(centerX - radius, centerY - radius/2);
                ctx.lineTo(centerX - radius, centerY + radius/2);
            } else if (game.pacman.direction === 3) { // Up
                ctx.lineTo(centerX - radius/2, centerY - radius);
                ctx.lineTo(centerX + radius/2, centerY - radius);
            }
            
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw ghosts
        game.ghosts.forEach(ghost => {
            if (ghost.returning) {
                // Draw returning ghost as white outline
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(ghost.x * cellSize + 2, ghost.y * cellSize + 2, cellSize - 4, cellSize - 4);
            } else if (!ghost.dead) {
                if (ghost.vulnerable) {
                    ctx.fillStyle = game.powerModeTimer > 1000 ? '#0000ff' : '#ffffff';
                } else {
                    ctx.fillStyle = ghost.color;
                }
                ctx.fillRect(ghost.x * cellSize + 2, ghost.y * cellSize + 2, cellSize - 4, cellSize - 4);
                
                // Ghost eyes
                ctx.fillStyle = '#fff';
                ctx.fillRect(ghost.x * cellSize + 5, ghost.y * cellSize + 5, 3, 3);
                ctx.fillRect(ghost.x * cellSize + 12, ghost.y * cellSize + 5, 3, 3);
            }
        });
        
        // UI
        ctx.fillStyle = '#ffff00';
        ctx.font = '16px Arial';
        ctx.fillText(`Score: ${game.score}`, 10, 25);
        ctx.fillText(`Lives: ${game.lives}`, 10, 45);
        ctx.fillText(`Dots: ${game.dotsRemaining}`, 10, 65);
        
        if (game.powerMode) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText(`Power: ${Math.ceil(game.powerModeTimer / 1000)}s`, 10, 85);
        }
        
        if (!game.gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffff00';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Use Arrow Keys or WASD to move', canvas.width/2, canvas.height/2 - 20);
            ctx.fillText('Eat all dots to win!', canvas.width/2, canvas.height/2 + 20);
        }
        
        if (game.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffff00';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.font = '18px Arial';
            ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 40);
        } else if (game.won) {
            ctx.fillStyle = 'rgba(0,255,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffff00';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Level Complete!', canvas.width/2, canvas.height/2);
            ctx.font = '18px Arial';
            ctx.fillText(`Final Score: ${game.score}`, canvas.width/2, canvas.height/2 + 40);
        }
    }
    
    function gameLoop() {
        game.animationFrame++;
        updatePacman();
        updateGhosts();
        render();
        
        if (!game.gameOver && !game.won) {
            setTimeout(gameLoop, 150); // Slower game speed
        }
    }
    
    function handleKeyDown(e) {
        game.keys[e.code] = true;
        
        if (!game.gameStarted) {
            game.gameStarted = true;
            gameLoop();
        }
        
        if (game.gameOver && e.code === 'KeyR') {
            // Reset game state
            game.pacman = { x: 14, y: 17, direction: 0, nextDirection: 0 };
            game.ghosts = [];
            game.score = 0;
            game.lives = 3;
            game.dotsRemaining = 0;
            game.powerMode = false;
            game.powerModeTimer = 0;
            game.gameOver = false;
            game.won = false;
            game.gameStarted = true;
            game.keys = {};
            
            // Reset maze dots
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    if (maze[y][x] === 3) {
                        // Restore dots and power pellets
                        if ((x === 3 && y === 3) || (x === 26 && y === 3) || 
                            (x === 3 && y === 17) || (x === 26 && y === 17)) {
                            maze[y][x] = 2; // Power pellet
                        } else if (y === 1 || y === 4 || y === 15 || y === 17 || y === 21) {
                            maze[y][x] = 0; // Regular dot
                        }
                    }
                }
            }
            
            initializeGame();
            gameLoop();
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        game.keys[e.code] = false;
        e.preventDefault();
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Classic Pac-Man - eat all dots while avoiding ghosts!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    initializeGame();
    render();
}
