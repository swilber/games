async function createMaze3DGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load 3D Maze configuration using ConfigManager
    let mazeConfig = {};
    if (typeof configManager !== 'undefined') {
        mazeConfig = await configManager.loadConfig('maze3d');
        console.log('3D Maze config loaded via ConfigManager:', mazeConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        mazeConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameStarted = false;
    
    const canvas = document.createElement('canvas');
    canvas.width = mazeConfig.visual?.canvasWidth || 800;
    canvas.height = mazeConfig.visual?.canvasHeight || 600;
    canvas.style.border = '2px solid #000';
    canvas.style.background = '#000';
    
    const ctx = canvas.getContext('2d');
    
    let game = {
        player: { x: 1.5, y: 1.5, angle: 0 },
        maze: [],
        artifacts: [],
        mazeSize: mazeConfig.gameplay?.mazeSize || settings?.mazeSize || 15,
        gameOver: false,
        won: false,
        gameStarted: false
    };
    
    function generateMaze() {
        // Create maze grid (1 = wall, 0 = path)
        game.maze = Array(game.mazeSize).fill().map(() => Array(game.mazeSize).fill(1));
        
        // Recursive backtracking maze generation
        const stack = [];
        const visited = Array(game.mazeSize).fill().map(() => Array(game.mazeSize).fill(false));
        
        function getNeighbors(x, y) {
            const neighbors = [];
            const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]]; // up, right, down, left
            
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx > 0 && nx < game.mazeSize - 1 && ny > 0 && ny < game.mazeSize - 1 && !visited[ny][nx]) {
                    neighbors.push([nx, ny, x + dx/2, y + dy/2]); // include wall between
                }
            }
            return neighbors;
        }
        
        // Start from (1,1)
        let currentX = 1, currentY = 1;
        game.maze[currentY][currentX] = 0;
        visited[currentY][currentX] = true;
        
        while (true) {
            const neighbors = getNeighbors(currentX, currentY);
            
            if (neighbors.length > 0) {
                // Choose random neighbor
                const [nx, ny, wallX, wallY] = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Carve path to neighbor
                game.maze[ny][nx] = 0;
                game.maze[wallY][wallX] = 0;
                visited[ny][nx] = true;
                
                // Push current to stack and move to neighbor
                stack.push([currentX, currentY]);
                currentX = nx;
                currentY = ny;
            } else if (stack.length > 0) {
                // Backtrack
                [currentX, currentY] = stack.pop();
            } else {
                break; // Done
            }
        }
        
        // Ensure start area is accessible
        game.maze[1][1] = 0;
        game.maze[1][2] = 0;
        game.maze[2][1] = 0;
        
        // Ensure end area is accessible
        const endX = game.mazeSize - 2;
        const endY = game.mazeSize - 2;
        game.maze[endY][endX] = 0;
        game.maze[endY][endX - 1] = 0;
        game.maze[endY - 1][endX] = 0;
        
        // Add artifacts to walls for navigation landmarks
        game.artifacts = [];
        const artifactCount = Math.floor(game.mazeSize / 2);
        const artifactTypes = ['torch', 'skull', 'gem'];
        
        // Find walls that are adjacent to paths
        const validWalls = [];
        for (let y = 1; y < game.mazeSize - 1; y++) {
            for (let x = 1; x < game.mazeSize - 1; x++) {
                if (game.maze[y][x] === 1) { // This is a wall
                    // Check if adjacent to any path
                    const adjacentToPaths = [
                        game.maze[y-1][x], game.maze[y+1][x],
                        game.maze[y][x-1], game.maze[y][x+1]
                    ].some(cell => cell === 0);
                    
                    if (adjacentToPaths) {
                        validWalls.push({x, y});
                    }
                }
            }
        }
        
        // Place artifacts on random valid walls
        for (let i = 0; i < Math.min(artifactCount, validWalls.length); i++) {
            const wallIndex = Math.floor(Math.random() * validWalls.length);
            const wall = validWalls.splice(wallIndex, 1)[0];
            
            game.artifacts.push({
                x: wall.x + 0.5,
                y: wall.y + 0.5,
                type: artifactTypes[Math.floor(Math.random() * artifactTypes.length)]
            });
        }
    }
    
    function castRay(angle) {
        const rayX = Math.cos(angle);
        const rayY = Math.sin(angle);
        
        let distance = 0;
        let hit = false;
        
        while (!hit && distance < 20) {
            distance += 0.1;
            
            const testX = game.player.x + rayX * distance;
            const testY = game.player.y + rayY * distance;
            
            const mapX = Math.floor(testX);
            const mapY = Math.floor(testY);
            
            if (mapX < 0 || mapX >= game.mazeSize || mapY < 0 || mapY >= game.mazeSize || 
                game.maze[mapY][mapX] === 1) {
                hit = true;
            }
        }
        
        return distance;
    }
    
    function render() {
        const fov = Math.PI / 3;
        const halfFov = fov / 2;
        
        // Nighttime sky gradient with lighter horizon
        const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
        skyGradient.addColorStop(0, '#0a0a2e');
        skyGradient.addColorStop(0.6, '#1a1a3a');
        skyGradient.addColorStop(0.9, '#3a3a5a');
        skyGradient.addColorStop(1, '#4a4a6a');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
        
        // Add stars with fixed world positions
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 120; i++) {
            // Fixed world angle for each star
            const starWorldAngle = (i * 0.3) % (Math.PI * 2);
            const starElevation = (i * 0.1) % 0.8; // Height in sky (0-0.8)
            
            // Calculate screen position based on player's viewing angle
            const relativeAngle = starWorldAngle - game.player.angle;
            let normalizedAngle = relativeAngle;
            while (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;
            while (normalizedAngle < -Math.PI) normalizedAngle += 2 * Math.PI;
            
            // Only draw stars in field of view
            if (Math.abs(normalizedAngle) < Math.PI / 3) {
                const starX = canvas.width / 2 + (normalizedAngle / (Math.PI / 3)) * canvas.width;
                const starY = (canvas.height / 2) * (1 - starElevation);
                
                if (starX >= 0 && starX < canvas.width && starY >= 0 && starY < canvas.height / 2) {
                    const brightness = (i % 4) * 0.2 + 0.3;
                    const size = (i % 3) + 1;
                    
                    ctx.globalAlpha = brightness;
                    if (size === 1) {
                        ctx.fillRect(starX, starY, 1, 1);
                    } else if (size === 2) {
                        ctx.fillRect(starX, starY, 2, 2);
                    } else {
                        ctx.fillRect(starX, starY, 2, 2);
                        ctx.fillRect(starX - 1, starY + 1, 1, 1);
                        ctx.fillRect(starX + 2, starY + 1, 1, 1);
                        ctx.fillRect(starX + 1, starY - 1, 1, 1);
                        ctx.fillRect(starX + 1, starY + 3, 1, 1);
                    }
                }
            }
        }
        ctx.globalAlpha = 1;
        
        // Add textured moon with fixed world position
        const moonWorldAngle = Math.PI / 4; // Fixed at 45 degrees in world
        const moonRelativeAngle = moonWorldAngle - game.player.angle;
        let moonNormalizedAngle = moonRelativeAngle;
        while (moonNormalizedAngle > Math.PI) moonNormalizedAngle -= 2 * Math.PI;
        while (moonNormalizedAngle < -Math.PI) moonNormalizedAngle += 2 * Math.PI;
        
        // Only draw moon if in field of view
        if (Math.abs(moonNormalizedAngle) < fov * 1.5) { // Slightly wider FOV for moon
            const moonX = canvas.width / 2 + (moonNormalizedAngle / fov) * canvas.width * 0.8;
            const moonY = canvas.height * 0.15;
            const moonRadius = 60;
            
            // Moon base with gradient
            const moonGradient = ctx.createRadialGradient(
                moonX - 15, moonY - 15, 0,
                moonX, moonY, moonRadius
            );
            moonGradient.addColorStop(0, '#f5f5dc');
            moonGradient.addColorStop(0.7, '#e0e0b0');
            moonGradient.addColorStop(1, '#c0c090');
            
            ctx.fillStyle = moonGradient;
            ctx.beginPath();
            ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add craters (scaled up 3x)
            ctx.fillStyle = 'rgba(180, 180, 150, 0.6)';
            ctx.beginPath();
            ctx.arc(moonX - 18, moonY - 12, 9, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(moonX + 12, moonY + 6, 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(moonX - 6, moonY + 18, 4.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(moonX + 24, moonY - 24, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Grass ground
        const grassGradient = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
        grassGradient.addColorStop(0, '#2d5016');
        grassGradient.addColorStop(0.3, '#3d6020');
        grassGradient.addColorStop(1, '#1d4010');
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
        
        if (!game.gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Use WASD or Arrow Keys to move', canvas.width/2, canvas.height/2 - 20);
            ctx.fillText('Find the Triwizard Cup!', canvas.width/2, canvas.height/2 + 20);
            return;
        }
        
        // Cast rays for each screen column
        for (let x = 0; x < canvas.width; x++) {
            // Calculate ray angle
            const rayAngle = game.player.angle - halfFov + (x / canvas.width) * fov;
            
            // Ray direction
            const rayDirX = Math.cos(rayAngle);
            const rayDirY = Math.sin(rayAngle);
            
            // Current position
            let mapX = Math.floor(game.player.x);
            let mapY = Math.floor(game.player.y);
            
            // Length of ray from current position to x or y side
            const deltaDistX = Math.abs(1 / rayDirX);
            const deltaDistY = Math.abs(1 / rayDirY);
            
            let perpWallDist;
            let stepX, stepY;
            let sideDistX, sideDistY;
            let hit = false;
            let side; // 0 for x-side, 1 for y-side
            
            // Calculate step and initial sideDist
            if (rayDirX < 0) {
                stepX = -1;
                sideDistX = (game.player.x - mapX) * deltaDistX;
            } else {
                stepX = 1;
                sideDistX = (mapX + 1.0 - game.player.x) * deltaDistX;
            }
            
            if (rayDirY < 0) {
                stepY = -1;
                sideDistY = (game.player.y - mapY) * deltaDistY;
            } else {
                stepY = 1;
                sideDistY = (mapY + 1.0 - game.player.y) * deltaDistY;
            }
            
            // Perform DDA
            while (!hit) {
                // Jump to next map square, either in x-direction, or in y-direction
                if (sideDistX < sideDistY) {
                    sideDistX += deltaDistX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaDistY;
                    mapY += stepY;
                    side = 1;
                }
                
                // Check if ray has hit a wall
                if (mapX < 0 || mapX >= game.mazeSize || mapY < 0 || mapY >= game.mazeSize || 
                    game.maze[mapY][mapX] === 1) {
                    hit = true;
                }
            }
            
            // Calculate distance
            if (side === 0) {
                perpWallDist = (mapX - game.player.x + (1 - stepX) / 2) / rayDirX;
            } else {
                perpWallDist = (mapY - game.player.y + (1 - stepY) / 2) / rayDirY;
            }
            
            // Calculate height of line to draw on screen
            const lineHeight = Math.floor(canvas.height / perpWallDist);
            
            // Calculate lowest and highest pixel to fill in current stripe
            let drawStart = Math.floor(-lineHeight / 2 + canvas.height / 2);
            if (drawStart < 0) drawStart = 0;
            
            let drawEnd = Math.floor(lineHeight / 2 + canvas.height / 2);
            if (drawEnd >= canvas.height) drawEnd = canvas.height - 1;
            
            // Calculate texture coordinate
            let wallX;
            if (side === 0) {
                wallX = game.player.y + perpWallDist * rayDirY;
            } else {
                wallX = game.player.x + perpWallDist * rayDirX;
            }
            wallX -= Math.floor(wallX);
            
            // Simple hedge texture using gradients (much faster)
            const leafPattern = Math.sin(wallX * 8) * 0.2 + 0.8;
            
            // Base hedge colors
            let baseGreen = 70 * leafPattern;
            let darkGreen = 50 * leafPattern;
            let lightGreen = 30 * leafPattern;
            
            // Apply wall orientation shading
            if (side === 1) {
                baseGreen *= 0.7;
                darkGreen *= 0.7;
                lightGreen *= 0.7;
            }
            
            // Apply distance shading
            const brightness = Math.max(0.3, 1 - perpWallDist * 0.15);
            baseGreen *= brightness;
            darkGreen *= brightness;
            lightGreen *= brightness;
            
            // Create gradient for hedge appearance
            const gradient = ctx.createLinearGradient(0, drawStart, 0, drawEnd);
            gradient.addColorStop(0, `rgb(${lightGreen + 20}, ${baseGreen + 30}, ${darkGreen + 10})`);
            gradient.addColorStop(0.3, `rgb(${lightGreen + 10}, ${baseGreen + 20}, ${darkGreen + 5})`);
            gradient.addColorStop(0.7, `rgb(${lightGreen}, ${baseGreen}, ${darkGreen})`);
            gradient.addColorStop(1, `rgb(${lightGreen - 10}, ${baseGreen - 20}, ${darkGreen - 5})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
        }
        
        // Draw finish indicator if visible and not blocked by walls
        const finishX = game.mazeSize - 1.5;
        const finishY = game.mazeSize - 1.5;
        const finishDistance = Math.sqrt(
            Math.pow(game.player.x - finishX, 2) + 
            Math.pow(game.player.y - finishY, 2)
        );
        
        if (finishDistance < 8) {
            const finishAngle = Math.atan2(finishY - game.player.y, finishX - game.player.x);
            const angleDiff = finishAngle - game.player.angle;
            
            // Normalize angle difference
            let normalizedAngle = angleDiff;
            while (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;
            while (normalizedAngle < -Math.PI) normalizedAngle += 2 * Math.PI;
            
            const fov = Math.PI / 3;
            if (Math.abs(normalizedAngle) < fov / 2) {
                // Check if exit is blocked by walls
                const rayDistance = castRay(finishAngle);
                
                if (rayDistance >= finishDistance - 0.5) {
                    const screenX = canvas.width / 2 + (normalizedAngle / fov) * canvas.width;
                    const baseSize = Math.max(15, 120 / finishDistance);
                    
                    // Pulsing glow effect
                    const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
                    
                    const gobletWidth = baseSize * 0.8;
                    const gobletHeight = baseSize * 1.2;
                    const centerY = canvas.height / 2;
                    
                    // Outer magical glow
                    ctx.shadowColor = '#4080ff';
                    ctx.shadowBlur = 20 * pulse;
                    ctx.fillStyle = `rgba(64, 128, 255, ${0.2 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(screenX, centerY - gobletHeight * 0.2, gobletWidth * 1.2, gobletHeight * 0.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Goblet bowl (egg-shaped)
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = `rgba(180, 200, 255, ${0.9 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(screenX, centerY - gobletHeight * 0.4, gobletWidth * 0.6, gobletHeight * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Bowl rim (darker edge)
                    ctx.fillStyle = `rgba(120, 150, 220, ${0.9 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(screenX, centerY - gobletHeight * 0.65, gobletWidth * 0.6, gobletHeight * 0.1, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Silver handles (left and right)
                    ctx.strokeStyle = `rgba(200, 200, 220, ${0.8 * pulse})`;
                    ctx.lineWidth = Math.max(2, baseSize * 0.1);
                    
                    // Left handle
                    ctx.beginPath();
                    ctx.arc(screenX - gobletWidth * 0.7, centerY - gobletHeight * 0.4, gobletWidth * 0.25, -Math.PI * 0.3, Math.PI * 0.3);
                    ctx.stroke();
                    
                    // Right handle  
                    ctx.beginPath();
                    ctx.arc(screenX + gobletWidth * 0.7, centerY - gobletHeight * 0.4, gobletWidth * 0.25, Math.PI * 0.7, Math.PI * 1.3);
                    ctx.stroke();
                    
                    // Goblet stem (curved)
                    ctx.fillStyle = `rgba(150, 170, 240, ${0.9 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(screenX, centerY + gobletHeight * 0.1, gobletWidth * 0.12, gobletHeight * 0.4, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Goblet base (curved)
                    ctx.fillStyle = `rgba(120, 140, 200, ${0.9 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(screenX, centerY + gobletHeight * 0.45, gobletWidth * 0.4, gobletHeight * 0.15, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Magical sparkles
                    for (let i = 0; i < 4; i++) {
                        const angle = (Date.now() * 0.003 + i * Math.PI * 0.5) % (Math.PI * 2);
                        const sparkleX = screenX + Math.cos(angle) * gobletWidth * 0.8;
                        const sparkleY = centerY - gobletHeight * 0.4 + Math.sin(angle * 2) * gobletHeight * 0.2;
                        const sparkleSize = Math.sin(Date.now() * 0.01 + i) * 2 + 2;
                        
                        ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
                        ctx.beginPath();
                        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    ctx.shadowBlur = 0;
                    
                    // Cup text
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#4080ff';
                    ctx.lineWidth = 1;
                    ctx.font = `bold ${Math.max(12, baseSize * 0.3)}px "Courier New", monospace`;
                    ctx.textAlign = 'center';
                    ctx.strokeText('TRIWIZARD CUP', screenX, centerY + gobletHeight * 0.8);
                    ctx.fillText('TRIWIZARD CUP', screenX, centerY + gobletHeight * 0.8);
                }
            }
        }
        
        // Draw minimap (if enabled)
        if (mazeConfig.gameplay?.showMinimap !== false) {
            const mapSize = mazeConfig.visual?.minimapSize || 120;
            const cellSize = mapSize / game.mazeSize;
            
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(10, 10, mapSize, mapSize);
            
            for (let y = 0; y < game.mazeSize; y++) {
                for (let x = 0; x < game.mazeSize; x++) {
                    if (game.maze[y][x] === 1) {
                        ctx.fillStyle = '#666';
                        ctx.fillRect(10 + x * cellSize, 10 + y * cellSize, cellSize, cellSize);
                    }
                }
            }
            
            // Draw player on minimap
            ctx.fillStyle = '#ff0';
            ctx.fillRect(10 + game.player.x * cellSize - 2, 10 + game.player.y * cellSize - 2, 4, 4);
            
            // Draw Triwizard Cup on minimap
            ctx.fillStyle = '#4080ff';
            ctx.shadowColor = '#4080ff';
            ctx.shadowBlur = 3;
            ctx.fillRect(10 + (game.mazeSize - 2) * cellSize, 10 + (game.mazeSize - 2) * cellSize, cellSize, cellSize);
            
            // Draw artifacts on minimap
            game.artifacts.forEach(artifact => {
                if (artifact.type === 'torch') ctx.fillStyle = '#ff6600';
                else if (artifact.type === 'skull') ctx.fillStyle = '#eee';
                else if (artifact.type === 'gem') ctx.fillStyle = '#00ff88';
                
                ctx.fillRect(10 + (artifact.x - 0.5) * cellSize, 10 + (artifact.y - 0.5) * cellSize, cellSize/2, cellSize/2);
            });
        }
        
        if (game.won) {
            ctx.fillStyle = 'rgba(0,255,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Maze Complete!', canvas.width/2, canvas.height/2);
        }
    }
    
    function update() {
        // Check win condition
        const playerMapX = Math.floor(game.player.x);
        const playerMapY = Math.floor(game.player.y);
        
        if (playerMapX === game.mazeSize - 2 && playerMapY === game.mazeSize - 2) {
            game.won = true;
            gameRunning = false;
            
            if (callbacks && callbacks.onGameComplete) {
                setTimeout(() => {
                    callbacks.onGameComplete('maze3d', { completed: true });
                }, 1000);
            }
        }
    }
    
    function handleMovement() {
        if (game.won || !game.gameStarted) return;
        
        const moveSpeed = mazeConfig.physics?.moveSpeed || settings?.moveSpeed || 0.08;
        const rotSpeed = mazeConfig.physics?.rotSpeed || 0.05;
        
        // Movement
        if (keys['KeyW'] || keys['ArrowUp']) {
            const newX = game.player.x + Math.cos(game.player.angle) * moveSpeed;
            const newY = game.player.y + Math.sin(game.player.angle) * moveSpeed;
            
            if (game.maze[Math.floor(newY)] && game.maze[Math.floor(newY)][Math.floor(newX)] === 0) {
                game.player.x = newX;
                game.player.y = newY;
            }
        }
        
        if (keys['KeyS'] || keys['ArrowDown']) {
            const newX = game.player.x - Math.cos(game.player.angle) * moveSpeed;
            const newY = game.player.y - Math.sin(game.player.angle) * moveSpeed;
            
            if (game.maze[Math.floor(newY)] && game.maze[Math.floor(newY)][Math.floor(newX)] === 0) {
                game.player.x = newX;
                game.player.y = newY;
            }
        }
        
        // Rotation
        if (keys['KeyA'] || keys['ArrowLeft']) {
            game.player.angle -= rotSpeed;
        }
        
        if (keys['KeyD'] || keys['ArrowRight']) {
            game.player.angle += rotSpeed;
        }
    }
    
    function gameLoop() {
        if (!gameRunning) return;
        
        handleMovement();
        update();
        render();
    }
    
    const keys = {};
    
    function handleKeyDown(e) {
        // Immediately return if game is not running or if it's not a game key
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        if (!gameRunning || !gameKeys.includes(e.code)) return;
        
        keys[e.code] = true;
        
        if (!game.gameStarted) {
            game.gameStarted = true;
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('maze3d');
            }
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        // Immediately return if game is not running or if it's not a game key
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        if (!gameRunning || !gameKeys.includes(e.code)) return;
        
        keys[e.code] = false;
        e.preventDefault();
    }
    
    // Store handler references for cleanup
    const keyDownHandler = handleKeyDown;
    const keyUpHandler = handleKeyUp;
    
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Navigate the 3D maze to find the Triwizard Cup!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    generateMaze();
    
    // Start game loop
    gameRunning = true;
    gameInterval = setInterval(gameLoop, 16); // ~60fps
    
    // Return cleanup function
    return {
        cleanup: () => {
            gameRunning = false;
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            document.removeEventListener('keydown', keyDownHandler);
            document.removeEventListener('keyup', keyUpHandler);
        }
    };
}
