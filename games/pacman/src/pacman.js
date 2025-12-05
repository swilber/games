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
            gameplay: { gameSpeed: 150, levelsToWin: 2 }
        };
    }
    
    const canvas = document.createElement('canvas');
    const cellSize = 25;
    
    // Set initial canvas size (will be updated when map loads)
    canvas.width = 700;
    canvas.height = 625; // Increased to fit 25-row ASCII map
    canvas.style.border = '2px solid #000';
    canvas.style.background = '#000';
    
    // Update canvas size based on map dimensions
    function updateCanvasSize() {
        if (game.asciiMapData && game.asciiMapData.maze) {
            const mapHeight = game.asciiMapData.maze.length;
            const mapWidth = game.asciiMapData.maze[0] ? game.asciiMapData.maze[0].length : 28;
            
            canvas.width = mapWidth * cellSize;
            canvas.height = mapHeight * cellSize;
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
            
            console.log(`Canvas resized to: ${canvas.width}x${canvas.height} for ${mapWidth}x${mapHeight} map`);
        }
    }

    const ctx = canvas.getContext('2d');
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    
    // Load ASCII map from file
    async function loadAsciiMap(mapFile) {
        try {
            const response = await fetch(`./games/pacman/maps/${mapFile}?v=${Date.now()}`);
            const mapText = await response.text();
            const lines = mapText.trim().split('\n');
            
            const maze = [];
            let pacmanStart = { x: 14, y: 21 };
            const ghostStarts = [];
            
            for (let y = 0; y < lines.length; y++) {
                const row = [];
                for (let x = 0; x < lines[y].length; x++) {
                    const char = lines[y][x];
                    switch (char) {
                        case '#': row.push(1); break;  // Wall
                        case '*': row.push(0); break;  // Dot
                        case '@': row.push(2); break;  // Power pellet
                        case ' ': row.push(3); break;  // Empty space
                        case 'C': // Pac-Man start
                            row.push(3);
                            pacmanStart = { x, y };
                            break;
                        case 'G': // Ghost start
                            row.push(3);
                            ghostStarts.push({ x, y });
                            break;
                        default: row.push(3); break;   // Default to empty
                    }
                }
                maze.push(row);
            }
            
            return { maze, pacmanStart, ghostStarts };
        } catch (error) {
            console.warn('Could not load ASCII map:', error);
            return null;
        }
    }

    // Multiple maze layouts - authentic Pac-Man maps
    const mazeLayouts = [
        // Original Pac-Man maze (easier)
        [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,2,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,2,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
            [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,3,3,3,3,3,3,3,3,3,3,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,3,1,1,1,3,3,1,1,1,3,1,1,0,1,1,1,1,1,1],
            [3,3,3,3,3,3,0,3,3,3,1,3,3,3,3,3,3,1,3,3,3,0,3,3,3,3,3,3],
            [1,1,1,1,1,1,0,1,1,3,1,3,3,3,3,3,3,1,3,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,3,1,1,1,1,1,1,1,1,3,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,3,3,3,3,3,3,3,3,3,3,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,2,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,2,1],
            [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
            [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
            [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        // Ms. Pac-Man style maze (more challenging)
        [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1],
            [1,2,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,2,1],
            [1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,0,1,1,1,3,3,1,1,1,0,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,0,1,3,3,3,3,3,3,1,0,1,1,0,1,1,1,1,1,1],
            [3,3,3,3,3,3,0,0,0,0,1,3,3,3,3,3,3,1,0,0,0,0,3,3,3,3,3,3],
            [1,1,1,1,1,1,0,1,1,0,1,3,3,3,3,3,3,1,0,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
            [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1],
            [1,2,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,2,1],
            [1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ]
    ];
    
    let game = {
        currentMazeIndex: 0, // Start with easier original Pac-Man maze
        levelsCompleted: 0,
        levelsToWin: pacmanConfig.gameplay?.levelsToWin || 2,
        maze: null,
        pacman: { x: 14, y: 21, direction: 0, nextDirection: 0, moveTimer: 0 }, // Will be updated from map
        ghosts: [], // Will be populated from map
        score: 0,
        lives: pacmanConfig.player.lives,
        dotsRemaining: 0,
        powerMode: false,
        powerModeTimer: 0,
        gameOver: false,
        won: false,
        gameStarted: false,
        keys: {},
        animationFrame: 0,
        asciiMapData: null // Store loaded ASCII map data
    };
    
    // Directions: right, down, left, up
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    
    async function initializeGame() {
        // Try to load ASCII map first
        game.asciiMapData = await loadAsciiMap('level1.txt');
        console.log('ASCII map loaded:', !!game.asciiMapData);
        
        // Update canvas size based on loaded map
        updateCanvasSize();
        
        initializeLevel();
        
        // Count dots
        game.dotsRemaining = 0;
        for (let y = 0; y < game.maze.length; y++) {
            for (let x = 0; x < game.maze[y].length; x++) {
                if (game.maze[y][x] === 0 || game.maze[y][x] === 2) {
                    game.dotsRemaining++;
                }
            }
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
        
        // Select next maze in sequence (cycle through available mazes)
        game.currentMazeIndex = (game.currentMazeIndex + 1) % mazeLayouts.length;
        initializeLevel();
    }
    
    function initializeLevel() {
        if (game.asciiMapData) {
            console.log('Using ASCII map data');
            // Use ASCII map data
            game.maze = JSON.parse(JSON.stringify(game.asciiMapData.maze));
            game.pacman = { 
                x: game.asciiMapData.pacmanStart.x, 
                y: game.asciiMapData.pacmanStart.y, 
                direction: 0, 
                nextDirection: 0, 
                moveTimer: 0 
            };
            
            // Set up ghosts from ASCII map positions
            const colors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
            game.ghosts = game.asciiMapData.ghostStarts.slice(0, pacmanConfig.ghosts.count).map((pos, i) => ({
                x: pos.x,
                y: pos.y,
                direction: i % 4, // Vary initial directions
                color: colors[i % colors.length],
                mode: 'scatter',
                moveTimer: 0,
                vulnerable: false,
                dead: false,
                returning: false
            }));
        } else {
            console.log('Using fallback hardcoded maze');
            // Fallback to hardcoded maze
            game.maze = JSON.parse(JSON.stringify(mazeLayouts[game.currentMazeIndex]));
            game.pacman = { x: 14, y: 21, direction: 0, nextDirection: 0, moveTimer: 0 };
            game.ghosts = [
                { x: 13, y: 11, direction: 0, color: '#ff0000', mode: 'scatter' },
                { x: 14, y: 11, direction: 2, color: '#ffb8ff', mode: 'scatter' },
                { x: 14, y: 12, direction: 0, color: '#00ffff', mode: 'scatter' },
                { x: 15, y: 11, direction: 2, color: '#ffb852', mode: 'scatter' }
            ].slice(0, pacmanConfig.ghosts.count);
        }
        
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
            
            // Handle screen wrapping - instantaneous
            const mapWidth = game.maze[0] ? game.maze[0].length : 28;
            if (newX < 0) newX = mapWidth - 1;
            if (newX >= mapWidth) newX = 0;
            
            if (canMove(newX, newY)) {
                game.pacman.x = newX;
                game.pacman.y = newY;
            
            // Eat dots
            const cell = game.maze[game.pacman.y][game.pacman.x];
            if (cell === 0) {
                game.maze[game.pacman.y][game.pacman.x] = 3;
                game.score += pacmanConfig.scoring?.dotValue || 10;
                game.dotsRemaining--;
                
                // Check for level completion
                if (game.dotsRemaining === 0) {
                    nextLevel();
                }
            } else if (cell === 2) {
                game.maze[game.pacman.y][game.pacman.x] = 3;
                game.score += pacmanConfig.powerups?.powerPelletPoints || 50;
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
                
                // Handle screen wrapping based on actual map dimensions
                const mapWidth = game.maze[0] ? game.maze[0].length : 28;
                if (newX < 0) newX = mapWidth - 1;
                if (newX >= mapWidth) newX = 0;
                
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
            
            // Handle screen wrapping based on actual map dimensions
            const mapWidth = game.maze[0] ? game.maze[0].length : 28;
            if (newX < 0) newX = mapWidth - 1;
            if (newX >= mapWidth) newX = 0;
            
            if (canMove(newX, newY)) {
                ghost.x = newX;
                ghost.y = newY;
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
                    game.score += pacmanConfig.powerups?.ghostPoints || 200;
                } else if (!ghost.returning) {
                    // Pac-Man dies
                    game.lives--;
                    if (game.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        // Reset positions using ASCII map data if available
                        if (game.asciiMapData) {
                            game.pacman.x = game.asciiMapData.pacmanStart.x;
                            game.pacman.y = game.asciiMapData.pacmanStart.y;
                            game.pacman.direction = 0;
                            game.ghosts.forEach((g, i) => {
                                if (i < game.asciiMapData.ghostStarts.length) {
                                    g.x = game.asciiMapData.ghostStarts[i].x;
                                    g.y = game.asciiMapData.ghostStarts[i].y;
                                }
                                g.vulnerable = false;
                                g.dead = false;
                                g.returning = false;
                            });
                        } else {
                            // Fallback to hardcoded positions
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
                        }
                        game.powerMode = false;
                        game.powerModeTimer = 0;
                    }
                }
            }
        });
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw maze with both convex and concave rounded corners
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        for (let y = 0; y < game.maze.length; y++) {
            for (let x = 0; x < game.maze[y].length; x++) {
                const cell = game.maze[y][x];
                
                if (cell === 1) {
                    const pixelX = x * cellSize;
                    const pixelY = y * cellSize;
                    
                    // Check adjacent cells for wall borders
                    const topWall = y === 0 || game.maze[y-1][x] !== 1;
                    const bottomWall = y === game.maze.length-1 || game.maze[y+1][x] !== 1;
                    const leftWall = x === 0 || game.maze[y][x-1] !== 1;
                    const rightWall = x === game.maze[y].length-1 || game.maze[y][x+1] !== 1;
                    
                    // Check for concave corners (inside corners)
                    const concaveTopLeft = !topWall && !leftWall && 
                        (y > 0 && game.maze[y-1][x] === 1) && 
                        (x > 0 && game.maze[y][x-1] === 1) && 
                        (y > 0 && x > 0 && game.maze[y-1][x-1] !== 1);
                    
                    const concaveTopRight = !topWall && !rightWall && 
                        (y > 0 && game.maze[y-1][x] === 1) && 
                        (x < game.maze[y].length-1 && game.maze[y][x+1] === 1) && 
                        (y > 0 && x < game.maze[y].length-1 && game.maze[y-1][x+1] !== 1);
                    
                    const concaveBottomLeft = !bottomWall && !leftWall && 
                        (y < game.maze.length-1 && game.maze[y+1][x] === 1) && 
                        (x > 0 && game.maze[y][x-1] === 1) && 
                        (y < game.maze.length-1 && x > 0 && game.maze[y+1][x-1] !== 1);
                    
                    const concaveBottomRight = !bottomWall && !rightWall && 
                        (y < game.maze.length-1 && game.maze[y+1][x] === 1) && 
                        (x < game.maze[y].length-1 && game.maze[y][x+1] === 1) && 
                        (y < game.maze.length-1 && x < game.maze[y].length-1 && game.maze[y+1][x+1] !== 1);
                    
                    const cornerRadius = 4;
                    
                    // Draw wall borders with gaps for BOTH convex AND concave corners
                    if (topWall) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX + (leftWall || concaveTopLeft ? cornerRadius : 0), pixelY);
                        ctx.lineTo(pixelX + cellSize - (rightWall || concaveTopRight ? cornerRadius : 0), pixelY);
                        ctx.stroke();
                    }
                    
                    if (bottomWall) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX + (leftWall || concaveBottomLeft ? cornerRadius : 0), pixelY + cellSize);
                        ctx.lineTo(pixelX + cellSize - (rightWall || concaveBottomRight ? cornerRadius : 0), pixelY + cellSize);
                        ctx.stroke();
                    }
                    
                    if (leftWall) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX, pixelY + (topWall || concaveTopLeft ? cornerRadius : 0));
                        ctx.lineTo(pixelX, pixelY + cellSize - (bottomWall || concaveBottomLeft ? cornerRadius : 0));
                        ctx.stroke();
                    }
                    
                    if (rightWall) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX + cellSize, pixelY + (topWall || concaveTopRight ? cornerRadius : 0));
                        ctx.lineTo(pixelX + cellSize, pixelY + cellSize - (bottomWall || concaveBottomRight ? cornerRadius : 0));
                        ctx.stroke();
                    }
                    
                    // Draw convex (outside) corner arcs
                    if (topWall && leftWall) {
                        ctx.beginPath();
                        ctx.arc(pixelX + cornerRadius, pixelY + cornerRadius, cornerRadius, Math.PI, 1.5 * Math.PI);
                        ctx.stroke();
                    }
                    if (topWall && rightWall) {
                        ctx.beginPath();
                        ctx.arc(pixelX + cellSize - cornerRadius, pixelY + cornerRadius, cornerRadius, 1.5 * Math.PI, 0);
                        ctx.stroke();
                    }
                    if (bottomWall && leftWall) {
                        ctx.beginPath();
                        ctx.arc(pixelX + cornerRadius, pixelY + cellSize - cornerRadius, cornerRadius, 0.5 * Math.PI, Math.PI);
                        ctx.stroke();
                    }
                    if (bottomWall && rightWall) {
                        ctx.beginPath();
                        ctx.arc(pixelX + cellSize - cornerRadius, pixelY + cellSize - cornerRadius, cornerRadius, 0, 0.5 * Math.PI);
                        ctx.stroke();
                    }
                    
                    // Draw concave (inside) corner arcs - positioned opposite of convex arcs
                    if (concaveTopLeft) {
                        ctx.beginPath();
                        ctx.arc(pixelX - cornerRadius, pixelY - cornerRadius, cornerRadius, 0, 0.5 * Math.PI);
                        ctx.stroke();
                    }
                    if (concaveTopRight) {
                        ctx.beginPath();
                        ctx.arc(pixelX + cellSize + cornerRadius, pixelY - cornerRadius, cornerRadius, 0.5 * Math.PI, Math.PI);
                        ctx.stroke();
                    }
                    if (concaveBottomLeft) {
                        ctx.beginPath();
                        ctx.arc(pixelX - cornerRadius, pixelY + cellSize + cornerRadius, cornerRadius, 1.5 * Math.PI, 0);
                        ctx.stroke();
                    }
                    if (concaveBottomRight) {
                        ctx.beginPath();
                        ctx.arc(pixelX + cellSize + cornerRadius, pixelY + cellSize + cornerRadius, cornerRadius, Math.PI, 1.5 * Math.PI);
                        ctx.stroke();
                    }
                } else if (cell === 0) {
                    // Dot
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(x * cellSize + 8, y * cellSize + 8, 4, 4);
                } else if (cell === 2) {
                    // Power pellet
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(x * cellSize + 4, y * cellSize + 4, 12, 12);
                }
            }
        }
        
        // Draw UI - retro Pac-Man style in single row
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        
        // Create retro-style UI text in one row (ensure score is a number)
        const score = (game.score || 0).toString().padStart(6, '0');
        let uiText = `SCORE ${score}    LIVES ${game.lives}    LEVEL ${game.levelsCompleted + 1}/${game.levelsToWin}    DOTS ${game.dotsRemaining}`;
        if (game.powerMode) {
            uiText += `    POWER ${Math.ceil(game.powerModeTimer / 1000)}S`;
        }
        ctx.fillText(uiText, 20, 20); // Moved up from 30 to 20 to embed in blue wall
        
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
    
    async function handleKeyDown(e) {
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
            
            // Reinitialize level with proper ghost setup
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
            
            await initializeGame();
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
    
    // Initialize game with ASCII map loading
    async function startGame() {
        await initializeGame();
        render();
    }
    
    // Start the game
    startGame();
    
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
