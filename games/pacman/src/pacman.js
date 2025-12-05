async function createPacmanGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Call onGameStart callback if provided
    if (callbacks?.onGameStart) {
        await callbacks.onGameStart('pacman');
    }
    
    // Load Pac-Man configuration using ConfigManager (same as Mario)
    let pacmanConfig = {};
    if (typeof configManager !== 'undefined') {
        pacmanConfig = await configManager.loadConfig('pacman');
        console.log('Pac-Man config loaded via ConfigManager:', pacmanConfig);
    } else {
        // Fallback to default values
        console.warn('Could not load Pac-Man config, using defaults');
        pacmanConfig = {
            player: { lives: 3, speed: 0.33 },
            ghosts: { speed: 1, count: 4 },
            powerups: { powerPelletDuration: 8000, dotValue: 10, powerPelletValue: 50, ghostValue: 200 },
            gameplay: { gameSpeed: 150, levelsToWin: 3 }
        };
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 575;
    canvas.style.border = '2px solid #000';
    canvas.style.background = '#000';
    
    const ctx = canvas.getContext('2d');
    const cellSize = 25;
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    
    // Multiple maze layouts
    const mazeLayouts = [
        // Layout 1 - Classic
        [
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
        ],
        // Layout 2 - Modified corners
        [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,2,1,1,0,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,0,1,1,2,1],
            [1,0,1,1,0,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,0,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
            [1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
            [1,1,1,1,0,1,1,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,1,1,1,1,1],
            [3,3,3,3,0,1,1,3,3,3,3,3,3,3,3,3,3,3,3,1,1,0,3,3,3,3,3,3],
            [1,1,1,1,0,1,1,3,1,1,3,3,3,3,3,3,1,1,3,1,1,0,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,3,1,3,3,3,3,3,3,3,3,1,3,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,0,1,1,3,1,3,3,3,3,3,3,3,3,1,3,1,1,0,1,1,1,1,1,1],
            [3,3,3,3,0,1,1,3,1,1,1,1,1,1,1,1,1,1,3,1,1,0,3,3,3,3,3,3],
            [1,1,1,1,0,1,1,3,3,3,3,3,3,3,3,3,3,3,3,1,1,0,1,1,1,1,1,1],
            [1,0,0,0,0,1,1,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,0,0,0,0,0,1],
            [1,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,1,1,1],
            [1,0,1,1,0,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,0,1,1,0,1],
            [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1],
            [1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ]
    ];
    
    let game = {
        currentMazeIndex: Math.floor(Math.random() * mazeLayouts.length),
        levelsCompleted: 0,
        levelsToWin: settings.levelsToWin || 2,
        maze: null,
        pacman: { x: 14, y: 21, direction: 0, nextDirection: 0, moveTimer: 0 }, // 0=right, 1=down, 2=left, 3=up
        ghosts: [
            { x: 13, y: 11, direction: 0, color: '#ff0000', mode: 'scatter' },
            { x: 14, y: 11, direction: 2, color: '#ffb8ff', mode: 'scatter' },
            { x: 14, y: 12, direction: 0, color: '#00ffff', mode: 'scatter' },
            { x: 15, y: 11, direction: 2, color: '#ffb852', mode: 'scatter' }
        ],
        score: 0,
        lives: pacmanConfig.player.lives,
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
        
        for (let i = 0; i < pacmanConfig.ghosts.count; i++) {
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
        return game.maze[y][x] !== 1;
    }
    
    function nextLevel() {
        game.levelsCompleted++;
        if (game.levelsCompleted >= game.levelsToWin) {
            game.won = true;
            return;
        }
        
        // Select new random maze
        game.currentMazeIndex = Math.floor(Math.random() * mazeLayouts.length);
        initializeLevel();
    }
    
    function initializeLevel() {
        game.maze = JSON.parse(JSON.stringify(mazeLayouts[game.currentMazeIndex]));
        game.pacman = { x: 14, y: 21, direction: 0, nextDirection: 0, moveTimer: 0 };
        game.ghosts = [
            { x: 13, y: 11, direction: 0, color: '#ff0000', mode: 'scatter' },
            { x: 14, y: 11, direction: 2, color: '#ffb8ff', mode: 'scatter' },
            { x: 14, y: 12, direction: 0, color: '#00ffff', mode: 'scatter' },
            { x: 15, y: 11, direction: 2, color: '#ffb852', mode: 'scatter' }
        ].slice(0, pacmanConfig.ghosts.count);
        
        // Count dots
        game.dotsRemaining = 0;
        for (let y = 0; y < game.maze.length; y++) {
            for (let x = 0; x < game.maze[y].length; x++) {
                if (game.maze[y][x] === 0 || game.maze[y][x] === 2) {
                    game.dotsRemaining++;
                }
            }
        }
        
        game.powerMode = false;
        game.powerModeTimer = 0;
    }
    
    function updatePacman() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Handle input
        if (game.keys['ArrowRight']) game.nextDirection = 0;
        if (game.keys['ArrowDown']) game.nextDirection = 1;
        if (game.keys['ArrowLeft']) game.nextDirection = 2;
        if (game.keys['ArrowUp']) game.nextDirection = 3;
        
        // Pac-Man speed control
        game.pacman.moveTimer = (game.pacman.moveTimer || 0) + pacmanConfig.player.speed;
        
        if (game.pacman.moveTimer >= 1) {
            game.pacman.moveTimer = 0;
            
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
            const cell = game.maze[game.pacman.y][game.pacman.x];
            if (cell === 0) {
                game.maze[game.pacman.y][game.pacman.x] = 3;
                game.score += pacmanConfig.powerups.dotValue;
                game.dotsRemaining--;
                
                // Check for level completion
                if (game.dotsRemaining === 0) {
                    nextLevel();
                }
            } else if (cell === 2) {
                game.maze[game.pacman.y][game.pacman.x] = 3;
                game.score += pacmanConfig.powerups.powerPelletValue;
                game.dotsRemaining--;
                
                // Check for level completion
                if (game.dotsRemaining === 0) {
                    nextLevel();
                }
                
                // Power mode
                game.powerMode = true;
                game.powerModeTimer = pacmanConfig.powerups.powerPelletDuration;
                game.ghosts.forEach(ghost => {
                    if (!ghost.dead) {
                        ghost.vulnerable = true;
                    }
                });
            }
        }
        } // Close movement timer block
        
        // Check win condition
        if (game.dotsRemaining === 0) {
            game.won = true;
            // Use callback if provided, otherwise fallback to global functions
            if (callbacks?.onGameComplete) {
                const currentLevelData = levels?.[currentLevel];
                callbacks.onGameComplete('pacman', currentLevelData);
            } else {
                // Fallback to original global approach
                gameWon = true;
                setTimeout(showQuestion, 1000);
            }
        }
    }
    
    function updateGhosts() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Update power mode
        if (game.powerMode) {
            game.powerModeTimer -= pacmanConfig.gameplay.gameSpeed; // Match game loop timing
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
            
            // Ghost speed control - scaled with player speed but individual personalities
            ghost.moveTimer = (ghost.moveTimer || 0) + 1;
            // Scale ghost speed with player speed: slower player = slower ghosts
            const ghostSpeedMultiplier = ghost.vulnerable ? 0.5 : 1.0; // Vulnerable ghosts are slower
            const scaledDelay = (pacmanConfig.ghosts.speed || 1) / (pacmanConfig.player.speed * ghostSpeedMultiplier);
            
            if (ghost.moveTimer < scaledDelay) return;
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
                    game.score += pacmanConfig.powerups.ghostValue;
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
        for (let y = 0; y < game.maze.length; y++) {
            for (let x = 0; x < game.maze[y].length; x++) {
                const cell = game.maze[y][x];
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
        
        // Draw UI
        ctx.fillStyle = '#ffff00';
        ctx.font = '16px Arial';
        ctx.fillText(`Score: ${game.score}`, 10, 20);
        ctx.fillText(`Lives: ${game.lives}`, 120, 20);
        ctx.fillText(`Level: ${game.levelsCompleted + 1}/${game.levelsToWin}`, 200, 20);
        
        if (game.won) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
            ctx.font = '24px Arial';
            ctx.fillText(`Completed ${game.levelsToWin} levels!`, canvas.width/2, canvas.height/2 + 50);
            ctx.textAlign = 'left';
            return;
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
    
    let gameRunning = true;
    let gameTimeout = null;
    
    function gameLoop() {
        game.animationFrame++;
        updatePacman();
        updateGhosts();
        render();
        
        if (!game.gameOver && !game.won && gameRunning) {
            gameTimeout = setTimeout(gameLoop, pacmanConfig.gameplay.gameSpeed);
        }
    }
    
    function handleKeyDown(e) {
        // Only handle game-related keys
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        
        game.keys[e.code] = true;
        
        if (!game.gameStarted) {
            game.gameStarted = true;
            if (gameRunning) {
                gameLoop();
            }
        }
        
        if (game.gameOver && e.code === 'KeyR') {
            // Reset game state
            game.pacman = { x: 14, y: 17, direction: 0, nextDirection: 0 };
            game.ghosts = [];
            game.score = 0;
            game.lives = pacmanConfig.player.lives;
            game.dotsRemaining = 0;
            game.powerMode = false;
            game.powerModeTimer = 0;
            game.gameOver = false;
            game.won = false;
            game.gameStarted = true;
            game.keys = {};
            
            // Reinitialize ghosts with proper count
            initializeGhosts();
            initializeLevel();
            
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
            if (gameRunning) {
                gameLoop();
            }
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        // Only handle game-related keys
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyR'];
        if (!gameKeys.includes(e.code)) return;
        
        game.keys[e.code] = false;
        e.preventDefault();
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Store handler references for cleanup
    const keyDownHandler = handleKeyDown;
    const keyUpHandler = handleKeyUp;
    
    gameArea.appendChild(canvas);
    
    // Initialize first level
    initializeLevel();
    render();
    
    // Return cleanup function
    return {
        cleanup: () => {
            gameRunning = false;
            if (gameTimeout) {
                clearTimeout(gameTimeout);
            }
            document.removeEventListener('keydown', keyDownHandler);
            document.removeEventListener('keyup', keyUpHandler);
        }
    };
}
