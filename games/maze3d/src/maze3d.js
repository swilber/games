function createMaze3DGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.border = '2px solid #000';
    canvas.style.background = '#000';
    
    const ctx = canvas.getContext('2d');
    
    let game = {
        player: { x: 1.5, y: 1.5, angle: 0 },
        maze: [],
        artifacts: [],
        mazeSize: settings.mazeSize,
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
        // Clear canvas
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height / 2); // Sky
        
        ctx.fillStyle = '#654321';
        ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2); // Floor
        
        if (!game.gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Use WASD or Arrow Keys to move', canvas.width/2, canvas.height/2 - 20);
            ctx.fillText('Find the green exit!', canvas.width/2, canvas.height/2 + 20);
            return;
        }
        
        const fov = Math.PI / 3; // 60 degrees
        const numRays = canvas.width; // Full resolution
        
        for (let i = 0; i < numRays; i++) {
            const rayAngle = game.player.angle - fov / 2 + (fov * i) / numRays;
            const distance = castRay(rayAngle);
            
            if (distance > 0) {
                // Fix fisheye effect
                const correctedDistance = distance * Math.cos(rayAngle - game.player.angle);
                
                const wallHeight = canvas.height / correctedDistance;
                const wallTop = (canvas.height - wallHeight) / 2;
                
                // Check if this wall has a special color
                const hitX = game.player.x + Math.cos(rayAngle) * distance;
                const hitY = game.player.y + Math.sin(rayAngle) * distance;
                const wallX = Math.floor(hitX);
                const wallY = Math.floor(hitY);
                
                let wallColor = null;
                game.artifacts.forEach(artifact => {
                    const artifactWallX = Math.floor(artifact.x);
                    const artifactWallY = Math.floor(artifact.y);
                    if (wallX === artifactWallX && wallY === artifactWallY) {
                        if (artifact.type === 'torch') wallColor = '#8B4513'; // Brown
                        else if (artifact.type === 'skull') wallColor = '#D2B48C'; // Tan
                        else if (artifact.type === 'gem') wallColor = '#228B22'; // Forest Green
                    }
                });
                
                if (wallColor) {
                    ctx.fillStyle = wallColor;
                } else {
                    // Normal wall color based on distance
                    const brightness = Math.max(50, 255 - distance * 20);
                    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
                }
                
                ctx.fillRect(i, wallTop, 1, wallHeight);
            }
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
                    const size = Math.max(10, 100 / finishDistance);
                    
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(screenX - size/2, canvas.height/2 - size/2, size, size);
                    
                    ctx.fillStyle = '#fff';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('EXIT', screenX, canvas.height/2 + 30);
                }
            }
        }
        
        // Draw minimap (if enabled)
        if (settings.showMinimap) {
            const mapSize = 120;
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
            
            // Draw exit on minimap
            ctx.fillStyle = '#0f0';
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
            gameWon = true;
            setTimeout(showQuestion, 1000);
        }
    }
    
    function handleMovement() {
        if (game.won || !game.gameStarted) return;
        
        const moveSpeed = settings.moveSpeed;
        const rotSpeed = 0.05;
        
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
        handleMovement();
        update();
        render();
        if (!game.won) {
            requestAnimationFrame(gameLoop);
        }
    }
    
    const keys = {};
    
    function handleKeyDown(e) {
        // Only handle game-related keys
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        if (!gameKeys.includes(e.code)) return;
        
        keys[e.code] = true;
        e.preventDefault();
        
        if (!game.gameStarted) {
            game.gameStarted = true;
        }
    }
    
    function handleKeyUp(e) {
        // Only handle game-related keys
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        if (!gameKeys.includes(e.code)) return;
        
        keys[e.code] = false;
        e.preventDefault();
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Navigate the 3D maze to find the exit!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    generateMaze();
    gameLoop();
}
