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
        mazeSize: mazeConfig.gameplay?.mazeSize || settings?.mazeSize || 50,
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
        
        // Initialize empty artifacts array (no wall artifacts, only finish indicator)
        game.artifacts = [];
        
        // Spawn creatures throughout the maze
        spawnCreatures();
    }
    
    function spawnCreatures() {
        const creatureTypes = ['spider', 'sphinx', 'skrewt', 'dementor'];
        const numCreatures = Math.floor(game.mazeSize * 0.3); // About 30% of maze size
        
        for (let i = 0; i < numCreatures; i++) {
            let x, y;
            let attempts = 0;
            let validPosition = false;
            
            // Find empty maze position that's not too close to other creatures
            do {
                x = Math.floor(Math.random() * (game.mazeSize - 2)) + 1;
                y = Math.floor(Math.random() * (game.mazeSize - 2)) + 1;
                attempts++;
                
                // Check if position is valid (empty maze cell, not start/finish)
                const isEmptyCell = game.maze[y][x] === 0;
                const notStartPosition = !(x === 1 && y === 1);
                const notFinishPosition = !(x === game.mazeSize - 2 && y === game.mazeSize - 2);
                
                if (isEmptyCell && notStartPosition && notFinishPosition) {
                    // Check distance from existing creatures (minimum 1.5 cells apart)
                    validPosition = true;
                    for (let existing of game.artifacts) {
                        const distance = Math.sqrt(Math.pow(x + 0.5 - existing.x, 2) + Math.pow(y + 0.5 - existing.y, 2));
                        if (distance < 1.5) {
                            validPosition = false;
                            break;
                        }
                    }
                }
            } while (!validPosition && attempts < 200);
            
            if (validPosition) {
                const creatureType = creatureTypes[Math.floor(Math.random() * creatureTypes.length)];
                game.artifacts.push({
                    type: creatureType,
                    x: x + 0.5,
                    y: y + 0.5
                });
            }
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
                    
                    // Goblet bowl (bottom half only)
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = `rgba(180, 200, 255, ${0.9 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(screenX, centerY - gobletHeight * 0.4, gobletWidth * 0.6, gobletHeight * 0.5, 0, 0, Math.PI);
                    ctx.fill();
                    
                    // Bowl rim (darker edge, overlapping the bowl)
                    ctx.fillStyle = `rgba(120, 150, 220, ${0.9 * pulse})`;
                    ctx.beginPath();
                    ctx.ellipse(screenX, centerY - gobletHeight * 0.4, gobletWidth * 0.6, gobletHeight * 0.1, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Silver handles (left and right, elliptical and curving outward, connected to bowl)
                    ctx.strokeStyle = `rgba(200, 200, 220, ${0.8 * pulse})`;
                    ctx.lineWidth = Math.max(2, baseSize * 0.1);
                    
                    // Left handle (elliptical, wider than tall)
                    ctx.beginPath();
                    ctx.ellipse(screenX - gobletWidth * 0.4, centerY - gobletHeight * 0.25, gobletWidth * 0.4, gobletWidth * 0.25, 0, Math.PI * 0.7, Math.PI * 1.3);
                    ctx.stroke();
                    
                    // Right handle (elliptical, wider than tall)
                    ctx.beginPath();
                    ctx.ellipse(screenX + gobletWidth * 0.4, centerY - gobletHeight * 0.25, gobletWidth * 0.4, gobletWidth * 0.25, 0, -Math.PI * 0.3, Math.PI * 0.3);
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
        
        // Draw start indicator (Maze Entrance) if visible and not blocked by walls
        const startX = 1.5;
        const startY = 1.5;
        const startDistance = Math.sqrt(
            Math.pow(game.player.x - startX, 2) + 
            Math.pow(game.player.y - startY, 2)
        );
        
        if (startDistance < 8) {
            const startAngle = Math.atan2(startY - game.player.y, startX - game.player.x);
            const angleDiff = startAngle - game.player.angle;
            
            // Normalize angle difference
            let normalizedAngle = angleDiff;
            while (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;
            while (normalizedAngle < -Math.PI) normalizedAngle += 2 * Math.PI;
            
            const fov = Math.PI / 3;
            if (Math.abs(normalizedAngle) < fov / 2) {
                // Check if path to start is clear
                const steps = Math.floor(startDistance * 2);
                let pathClear = true;
                for (let i = 1; i < steps; i++) {
                    const checkX = game.player.x + (startX - game.player.x) * (i / steps);
                    const checkY = game.player.y + (startY - game.player.y) * (i / steps);
                    if (game.maze[Math.floor(checkY)][Math.floor(checkX)] === 1) {
                        pathClear = false;
                        break;
                    }
                }
                
                if (pathClear) {
                    const screenX = canvas.width / 2 + (normalizedAngle / fov) * canvas.width;
                    const baseSize = Math.max(20, 200 / startDistance);
                    const centerY = canvas.height / 2;
                    const hedgeHeight = baseSize * 2.0;
                    
                    // Draw entrance pillars (dark green hedge material, full height from ground to top)
                    ctx.fillStyle = '#2d5016';
                    ctx.fillRect(screenX - baseSize * 0.6, centerY - hedgeHeight * 0.5, baseSize * 0.25, hedgeHeight);
                    ctx.fillRect(screenX + baseSize * 0.35, centerY - hedgeHeight * 0.5, baseSize * 0.25, hedgeHeight);
                    
                    // Draw entrance arch (dark green hedge material, thick like pillars)
                    ctx.strokeStyle = '#2d5016';
                    ctx.lineWidth = baseSize * 0.5;
                    ctx.beginPath();
                    ctx.arc(screenX, centerY - hedgeHeight * 0.5, baseSize * 0.35, Math.PI, 2 * Math.PI);
                    ctx.stroke();
                    
                    // Draw black entrance space
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(screenX - baseSize * 0.35, centerY - hedgeHeight * 0.5, baseSize * 0.7, hedgeHeight);
                    ctx.beginPath();
                    ctx.arc(screenX, centerY - hedgeHeight * 0.5, baseSize * 0.35, Math.PI, 2 * Math.PI);
                    ctx.fill();
                    
                    // Entrance text
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#2d5016';
                    ctx.lineWidth = 1;
                    ctx.font = `bold ${Math.max(12, baseSize * 0.25)}px "Courier New", monospace`;
                    ctx.textAlign = 'center';
                    ctx.strokeText('MAZE ENTRANCE', screenX, centerY + hedgeHeight * 0.6);
                    ctx.fillText('MAZE ENTRANCE', screenX, centerY + hedgeHeight * 0.6);
                }
            }
        }
        
        // Draw creatures if visible and not blocked by walls
        game.artifacts.forEach(creature => {
            const creatureDistance = Math.sqrt(
                Math.pow(game.player.x - creature.x, 2) + 
                Math.pow(game.player.y - creature.y, 2)
            );
            
            if (creatureDistance < 8) {
                const creatureAngle = Math.atan2(creature.y - game.player.y, creature.x - game.player.x);
                const angleDiff = creatureAngle - game.player.angle;
                
                // Normalize angle difference
                let normalizedAngle = angleDiff;
                while (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;
                while (normalizedAngle < -Math.PI) normalizedAngle += 2 * Math.PI;
                
                const fov = Math.PI / 3;
                if (Math.abs(normalizedAngle) < fov / 2) {
                    // Check if path to creature is clear
                    const steps = Math.floor(creatureDistance * 2);
                    let pathClear = true;
                    for (let i = 1; i < steps; i++) {
                        const checkX = game.player.x + (creature.x - game.player.x) * (i / steps);
                        const checkY = game.player.y + (creature.y - game.player.y) * (i / steps);
                        if (game.maze[Math.floor(checkY)][Math.floor(checkX)] === 1) {
                            pathClear = false;
                            break;
                        }
                    }
                    
                    if (pathClear) {
                        const screenX = canvas.width / 2 + (normalizedAngle / fov) * canvas.width;
                        const baseSize = Math.max(40, 300 / creatureDistance);
                        const centerY = canvas.height / 2;
                        
                        // Draw creature based on type
                        if (creature.type === 'spider') {
                            // Giant spider - on ground with bent legs
                            const groundY = centerY + baseSize * 0.4;
                            
                            // 8 legs - bent down to ground
                            ctx.strokeStyle = '#1a1a1a';
                            ctx.lineWidth = baseSize * 0.05;
                            for (let i = 0; i < 8; i++) {
                                const angle = (i / 4) * Math.PI - Math.PI/2;
                                const side = i < 4 ? -1 : 1;
                                const legStartX = screenX + Math.cos(angle) * baseSize * 0.3;
                                const legStartY = groundY - baseSize * 0.2;
                                const legMidX = screenX + Math.cos(angle) * baseSize * 0.8;
                                const legMidY = groundY - baseSize * 0.4;
                                const legEndX = screenX + Math.cos(angle) * baseSize * 1.2;
                                const legEndY = groundY;
                                
                                ctx.beginPath();
                                ctx.moveTo(legStartX, legStartY);
                                ctx.lineTo(legMidX, legMidY);
                                ctx.lineTo(legEndX, legEndY);
                                ctx.stroke();
                            }
                            
                            // Large circular body
                            ctx.fillStyle = '#0a0a0a';
                            ctx.beginPath();
                            ctx.arc(screenX, groundY - baseSize * 0.2, baseSize * 0.3, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Small circular head
                            ctx.fillStyle = '#1a1a1a';
                            ctx.beginPath();
                            ctx.arc(screenX, groundY - baseSize * 0.4, baseSize * 0.15, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Glowing red eyes on head - 2 big central, 2 smaller above/beside
                            ctx.fillStyle = '#ff0000';
                            ctx.shadowColor = '#ff0000';
                            ctx.shadowBlur = 5;
                            
                            // Two big central eyes
                            ctx.beginPath();
                            ctx.arc(screenX - baseSize * 0.05, groundY - baseSize * 0.42, baseSize * 0.03, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(screenX + baseSize * 0.05, groundY - baseSize * 0.42, baseSize * 0.03, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Two smaller eyes next to and above the big ones
                            ctx.beginPath();
                            ctx.arc(screenX - baseSize * 0.08, groundY - baseSize * 0.45, baseSize * 0.02, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(screenX + baseSize * 0.08, groundY - baseSize * 0.45, baseSize * 0.02, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            ctx.shadowBlur = 0;
                            
                        } else if (creature.type === 'sphinx') {
                            // Sphinx - lion body with Egyptian woman's head
                            const centerY = canvas.height / 2;
                            
                            // Long brown hair (drawn behind everything, starts at bottom of headdress)
                            ctx.fillStyle = '#8B4513';
                            ctx.fillRect(screenX - baseSize * 0.3, centerY - baseSize * 0.5, baseSize * 0.6, baseSize * 0.6);
                            
                            // Back lion legs (middle two legs drawn behind body)
                            ctx.fillStyle = '#B8860B';
                            ctx.fillRect(screenX - baseSize * 0.1, centerY + baseSize * 0.3, baseSize * 0.15, baseSize * 0.3);
                            ctx.fillRect(screenX + baseSize * 0.1, centerY + baseSize * 0.3, baseSize * 0.15, baseSize * 0.3);
                            
                            // Back feet (ovals at bottom of back legs)
                            ctx.beginPath();
                            ctx.ellipse(screenX - baseSize * 0.025, centerY + baseSize * 0.65, baseSize * 0.1, baseSize * 0.06, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.ellipse(screenX + baseSize * 0.175, centerY + baseSize * 0.65, baseSize * 0.1, baseSize * 0.06, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Lion tail (drawn behind body)
                            ctx.strokeStyle = '#B8860B';
                            ctx.lineWidth = baseSize * 0.08;
                            ctx.beginPath();
                            ctx.moveTo(screenX + baseSize * 0.5, centerY + baseSize * 0.1);
                            ctx.lineTo(screenX + baseSize * 0.7, centerY - baseSize * 0.2);
                            ctx.stroke();
                            
                            // Tail hair (brown oval at end of tail)
                            ctx.fillStyle = '#8B4513';
                            ctx.beginPath();
                            ctx.ellipse(screenX + baseSize * 0.7, centerY - baseSize * 0.2, baseSize * 0.08, baseSize * 0.12, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Lion body
                            ctx.fillStyle = '#DAA520';
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY + baseSize * 0.1, baseSize * 0.5, baseSize * 0.3, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Front lion legs (outer two legs drawn in front of body)
                            ctx.fillStyle = '#B8860B';
                            ctx.fillRect(screenX - baseSize * 0.4, centerY + baseSize * 0.3, baseSize * 0.15, baseSize * 0.3);
                            ctx.fillRect(screenX + baseSize * 0.3, centerY + baseSize * 0.3, baseSize * 0.15, baseSize * 0.3);
                            
                            // Front feet (ovals at bottom of front legs)
                            ctx.beginPath();
                            ctx.ellipse(screenX - baseSize * 0.325, centerY + baseSize * 0.65, baseSize * 0.1, baseSize * 0.06, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.ellipse(screenX + baseSize * 0.375, centerY + baseSize * 0.65, baseSize * 0.1, baseSize * 0.06, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Egyptian woman's head (full head)
                            ctx.fillStyle = '#DEB887';
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY - baseSize * 0.4, baseSize * 0.25, baseSize * 0.3, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Half headdress/nemes (top half drawn over head but under bandana)
                            ctx.fillStyle = '#4169E1';
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY - baseSize * 0.5, baseSize * 0.3, baseSize * 0.2, 0, Math.PI, 2 * Math.PI);
                            ctx.fill();
                            
                            // Headdress stripes (on half headdress)
                            ctx.strokeStyle = '#FFD700';
                            ctx.lineWidth = baseSize * 0.02;
                            for (let i = 0; i < 3; i++) {
                                const stripeY = centerY - baseSize * 0.55 + i * baseSize * 0.05;
                                ctx.beginPath();
                                ctx.moveTo(screenX - baseSize * 0.25, stripeY);
                                ctx.lineTo(screenX + baseSize * 0.25, stripeY);
                                ctx.stroke();
                            }
                            
                            // Gold bandana (rectangle higher on head, edge to edge)
                            ctx.fillStyle = '#FFD700';
                            ctx.fillRect(screenX - baseSize * 0.25, centerY - baseSize * 0.55, baseSize * 0.5, baseSize * 0.08);
                            
                            // Small gold snake coming out from center of bandana
                            ctx.strokeStyle = '#FFD700';
                            ctx.lineWidth = baseSize * 0.02;
                            ctx.beginPath();
                            ctx.moveTo(screenX, centerY - baseSize * 0.51);
                            ctx.lineTo(screenX - baseSize * 0.03, centerY - baseSize * 0.57);
                            ctx.lineTo(screenX + baseSize * 0.02, centerY - baseSize * 0.61);
                            ctx.stroke();
                            
                            // Small snake head
                            ctx.fillStyle = '#FFD700';
                            ctx.beginPath();
                            ctx.ellipse(screenX + baseSize * 0.02, centerY - baseSize * 0.61, baseSize * 0.015, baseSize * 0.02, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Snake eyes
                            ctx.fillStyle = '#000000';
                            ctx.beginPath();
                            ctx.arc(screenX + baseSize * 0.015, centerY - baseSize * 0.615, baseSize * 0.005, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(screenX + baseSize * 0.025, centerY - baseSize * 0.615, baseSize * 0.005, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Eyes
                            ctx.fillStyle = '#000';
                            ctx.beginPath();
                            ctx.arc(screenX - baseSize * 0.08, centerY - baseSize * 0.42, baseSize * 0.03, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(screenX + baseSize * 0.08, centerY - baseSize * 0.42, baseSize * 0.03, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Nose and mouth
                            ctx.fillStyle = '#CD853F';
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY - baseSize * 0.35, baseSize * 0.02, baseSize * 0.03, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            ctx.strokeStyle = '#8B4513';
                            ctx.lineWidth = baseSize * 0.015;
                            ctx.beginPath();
                            ctx.arc(screenX, centerY - baseSize * 0.3, baseSize * 0.05, 0, Math.PI);
                            ctx.stroke();
                            
                            // Fangs
                            ctx.fillStyle = '#FFFFFF';
                            ctx.beginPath();
                            ctx.moveTo(screenX - baseSize * 0.04, centerY - baseSize * 0.3);
                            ctx.lineTo(screenX - baseSize * 0.04, centerY - baseSize * 0.25);
                            ctx.lineTo(screenX - baseSize * 0.035, centerY - baseSize * 0.22);
                            ctx.closePath();
                            ctx.fill();
                            ctx.beginPath();
                            ctx.moveTo(screenX + baseSize * 0.04, centerY - baseSize * 0.3);
                            ctx.lineTo(screenX + baseSize * 0.04, centerY - baseSize * 0.25);
                            ctx.lineTo(screenX + baseSize * 0.035, centerY - baseSize * 0.22);
                            ctx.closePath();
                            ctx.fill();
                            
                        } else if (creature.type === 'skrewt') {
                            // Blast-ended skrewt - scorpion-like with stingers and 8 legs
                            const groundY = centerY + baseSize * 0.4;
                            
                            // 8 legs like spider - bent down to ground
                            ctx.strokeStyle = '#654321';
                            ctx.lineWidth = baseSize * 0.04;
                            for (let i = 0; i < 8; i++) {
                                const angle = (i / 4) * Math.PI - Math.PI/2;
                                const legStartX = screenX + Math.cos(angle) * baseSize * 0.25;
                                const legStartY = groundY - baseSize * 0.1;
                                const legMidX = screenX + Math.cos(angle) * baseSize * 0.6;
                                const legMidY = groundY - baseSize * 0.3;
                                const legEndX = screenX + Math.cos(angle) * baseSize * 0.9;
                                const legEndY = groundY;
                                
                                ctx.beginPath();
                                ctx.moveTo(legStartX, legStartY);
                                ctx.lineTo(legMidX, legMidY);
                                ctx.lineTo(legEndX, legEndY);
                                ctx.stroke();
                            }
                            
                            // Main centipede body - three overlapping circles
                            ctx.fillStyle = '#8B4513';
                            ctx.beginPath();
                            ctx.arc(screenX - baseSize * 0.15, groundY - baseSize * 0.1, baseSize * 0.2, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(screenX, groundY - baseSize * 0.1, baseSize * 0.2, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(screenX + baseSize * 0.15, groundY - baseSize * 0.1, baseSize * 0.2, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Front gigantic tail with curved stinger (top quarter oval, rotated counter-clockwise 10 degrees)
                            ctx.strokeStyle = '#654321';
                            ctx.lineWidth = baseSize * 0.12;
                            ctx.beginPath();
                            ctx.ellipse(screenX - baseSize * 0.05, groundY - baseSize * 0.1, baseSize * 0.3, baseSize * 0.7, -Math.PI/18, Math.PI, Math.PI * 1.5);
                            ctx.stroke();
                            
                            // Front stinger point (adjusted for rotation)
                            ctx.fillStyle = '#2F2F2F';
                            ctx.beginPath();
                            ctx.moveTo(screenX - baseSize * 0.2, groundY - baseSize * 0.75);
                            ctx.lineTo(screenX - baseSize * 0.13, groundY - baseSize * 0.88);
                            ctx.lineTo(screenX - baseSize * 0.27, groundY - baseSize * 0.88);
                            ctx.closePath();
                            ctx.fill();
                            
                            // Back gigantic tail with curved stinger (top quarter oval, rotated clockwise 10 degrees)
                            ctx.strokeStyle = '#8B4513';
                            ctx.lineWidth = baseSize * 0.15;
                            ctx.beginPath();
                            ctx.ellipse(screenX + baseSize * 0.05, groundY - baseSize * 0.1, baseSize * 0.3, baseSize * 0.7, Math.PI/18, Math.PI * 1.5, Math.PI * 2);
                            ctx.stroke();
                            
                            // Back stinger point (adjusted for rotation)
                            ctx.fillStyle = '#2F2F2F';
                            ctx.beginPath();
                            ctx.moveTo(screenX + baseSize * 0.2, groundY - baseSize * 0.75);
                            ctx.lineTo(screenX + baseSize * 0.13, groundY - baseSize * 0.88);
                            ctx.lineTo(screenX + baseSize * 0.27, groundY - baseSize * 0.88);
                            ctx.closePath();
                            ctx.fill();
                            
                            // Explosive flame shooting from rear
                            ctx.fillStyle = '#FF4500';
                            ctx.shadowColor = '#FF4500';
                            ctx.shadowBlur = 15;
                            
                            // Main flame shape
                            ctx.beginPath();
                            ctx.moveTo(screenX + baseSize * 0.3, groundY - baseSize * 0.1);
                            ctx.lineTo(screenX + baseSize * 0.5, groundY - baseSize * 0.3);
                            ctx.lineTo(screenX + baseSize * 0.55, groundY - baseSize * 0.1);
                            ctx.lineTo(screenX + baseSize * 0.6, groundY - baseSize * 0.25);
                            ctx.lineTo(screenX + baseSize * 0.65, groundY - baseSize * 0.05);
                            ctx.lineTo(screenX + baseSize * 0.6, groundY + baseSize * 0.1);
                            ctx.lineTo(screenX + baseSize * 0.5, groundY + baseSize * 0.05);
                            ctx.lineTo(screenX + baseSize * 0.4, groundY + baseSize * 0.1);
                            ctx.closePath();
                            ctx.fill();
                            
                            // Inner flame tips
                            ctx.fillStyle = '#FF6600';
                            ctx.beginPath();
                            ctx.moveTo(screenX + baseSize * 0.45, groundY - baseSize * 0.05);
                            ctx.lineTo(screenX + baseSize * 0.55, groundY - baseSize * 0.2);
                            ctx.lineTo(screenX + baseSize * 0.6, groundY - baseSize * 0.1);
                            ctx.lineTo(screenX + baseSize * 0.55, groundY + baseSize * 0.05);
                            ctx.closePath();
                            ctx.fill();
                            
                            ctx.shadowBlur = 0;
                            
                        } else if (creature.type === 'dementor') {
                            // Dementor - floating hooded figure with bent arms and skeletal hands
                            ctx.fillStyle = '#1a1a1a';
                            ctx.shadowBlur = 0; // Remove shadow blur for all dementor elements
                            
                            // Dementor body - six progressively larger ovals (spread out more)
                            // First oval (smallest)
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY - baseSize * 0.7, baseSize * 0.14, baseSize * 0.2, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Second oval
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY - baseSize * 0.45, baseSize * 0.16, baseSize * 0.22, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Third oval
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY - baseSize * 0.2, baseSize * 0.18, baseSize * 0.24, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Fourth oval
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY + baseSize * 0.05, baseSize * 0.2, baseSize * 0.26, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Fifth oval
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY + baseSize * 0.3, baseSize * 0.22, baseSize * 0.28, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Sixth oval (largest, top half only, connects to tattered edges)
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY + baseSize * 0.65, baseSize * 0.25, baseSize * 0.3, 0, Math.PI, 2 * Math.PI);
                            ctx.fill();
                            
                            // Smaller hood to match skinnier body (moved higher, with shadow)
                            ctx.shadowColor = '#000000';
                            ctx.shadowBlur = 20;
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY - baseSize * 1.0, baseSize * 0.25, baseSize * 0.4, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.shadowBlur = 0; // Remove shadow for subsequent elements
                            
                            // Bent arms coming out the sides (attached to first robe oval at widest part)
                            ctx.strokeStyle = '#1a1a1a';
                            ctx.lineWidth = baseSize * 0.08;
                            // Left arm (attached to widest part of first oval)
                            ctx.beginPath();
                            ctx.moveTo(screenX - baseSize * 0.15, centerY - baseSize * 0.4);
                            ctx.lineTo(screenX - baseSize * 0.6, centerY - baseSize * 0.3);
                            ctx.lineTo(screenX - baseSize * 0.7, centerY);
                            ctx.stroke();
                            // Right arm (attached to widest part of first oval)
                            ctx.beginPath();
                            ctx.moveTo(screenX + baseSize * 0.15, centerY - baseSize * 0.4);
                            ctx.lineTo(screenX + baseSize * 0.6, centerY - baseSize * 0.3);
                            ctx.lineTo(screenX + baseSize * 0.7, centerY);
                            ctx.stroke();
                            
                            // Dark gray hands (simple ovals, positioned at arm ends)
                            ctx.fillStyle = '#696969';
                            // Left hand
                            ctx.beginPath();
                            ctx.ellipse(screenX - baseSize * 0.7, centerY, baseSize * 0.06, baseSize * 0.08, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            // Right hand
                            ctx.beginPath();
                            ctx.ellipse(screenX + baseSize * 0.7, centerY, baseSize * 0.06, baseSize * 0.08, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Tattered edges (gradient from robe color to darker gray, limited to bottom oval width, no shadow)
                            ctx.shadowBlur = 0; // Remove shadow for tattered edges
                            const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89]; // 24 primes
                            const xPositions = [0.1, 0.8, 0.3, 0.9, 0.2, 0.7, 0.4, 0.6, 0.15, 0.85, 0.35, 0.75, 0.25, 0.65, 0.45, 0.55, 0.05, 0.95, 0.12, 0.88, 0.32, 0.78, 0.22, 0.68]; // Random X positions
                            for (let i = 0; i < 24; i++) {
                                // Limit X positions to width of bottom robe oval (baseSize * 0.25 width)
                                const tatterX = screenX - baseSize * 0.25 + xPositions[i] * baseSize * 0.5;
                                
                                const baseLength = baseSize * 0.15; // Same base length for all
                                // Use different prime number for each oval to avoid patterns
                                const seed = creature.x * 1000 + creature.y * 100;
                                const randomPhase = ((seed * primes[i] * 9301 + 49297) % 233280) / 233280 * Math.PI * 2;
                                const tatterLength = baseLength + Math.sin(randomPhase + Date.now() * 0.005) * baseSize * 0.05;
                                const tatterY = centerY + baseSize * 0.65 + tatterLength / 2; // Attached to bottom of sixth oval
                                
                                // Create gradient from robe color to darker gray
                                const gradient = ctx.createLinearGradient(0, tatterY - tatterLength / 2, 0, tatterY + tatterLength / 2);
                                gradient.addColorStop(0, '#1a1a1a'); // Robe color at top
                                gradient.addColorStop(1, '#333333'); // Darker gray at bottom
                                ctx.fillStyle = gradient;
                                
                                ctx.beginPath();
                                ctx.ellipse(tatterX, tatterY, baseSize * 0.03, tatterLength, 0, 0, 2 * Math.PI);
                                ctx.fill();
                            }
                            
                            // Dark void face (moved higher)
                            ctx.fillStyle = '#000000';
                            ctx.beginPath();
                            ctx.ellipse(screenX, centerY - baseSize * 0.9, baseSize * 0.15, baseSize * 0.2, 0, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            ctx.shadowBlur = 0;
                        }
                    }
                }
            }
        });
        
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
            
            // Draw Maze Entrance (start) on minimap
            ctx.fillStyle = '#2d5016';
            ctx.fillRect(10 + 1 * cellSize, 10 + 1 * cellSize, cellSize, cellSize);
            
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
                else if (artifact.type === 'spider') ctx.fillStyle = '#1a1a1a';
                else if (artifact.type === 'sphinx') ctx.fillStyle = '#DAA520';
                else if (artifact.type === 'skrewt') ctx.fillStyle = '#8B4513';
                else if (artifact.type === 'dementor') ctx.fillStyle = '#2F2F2F';
                
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
