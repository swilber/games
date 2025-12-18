async function createFroggerGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Frogger configuration using ConfigManager
    let froggerConfig = {};
    if (typeof configManager !== 'undefined') {
        froggerConfig = await configManager.loadConfig('frogger');
        console.log('Frogger config loaded via ConfigManager:', froggerConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        froggerConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings
        };
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    const totalLanes = 12;
    const laneHeight = canvas.height / (totalLanes + 2);
    
    // Different level layouts (from bottom to top: 0=safe, 1=road, 2=water)
    const levelLayouts = [
        // Level 1 - Basic (bottom to top)
        [0, 1, 1, 1, 0, 2, 2, 2, 0, 1, 1, 0, 0],
        // Level 2 - More water
        [0, 1, 1, 0, 2, 2, 2, 2, 0, 1, 1, 1, 0],
        // Level 3 - Alternating
        [0, 1, 2, 1, 2, 0, 2, 1, 2, 1, 0, 1, 0],
        // Level 4 - Dense traffic
        [0, 1, 1, 1, 1, 0, 2, 2, 0, 1, 1, 1, 0],
        // Level 5 - Water maze
        [0, 1, 0, 2, 2, 2, 2, 2, 2, 0, 1, 1, 0],
        // Level 6 - Mixed challenge
        [0, 1, 2, 1, 0, 2, 1, 2, 1, 0, 2, 1, 0],
        // Level 7 - Advanced
        [0, 1, 1, 2, 2, 1, 2, 2, 1, 2, 1, 1, 0],
        // Level 8 - Expert
        [0, 1, 2, 2, 1, 2, 1, 2, 2, 1, 2, 1, 0]
    ];
    
    function getLaneType(visualLane) {
        // visualLane 0 = bottom (where frog starts), visualLane 12 = top (goal)
        if (!game.laneTypes || visualLane < 0 || visualLane >= game.laneTypes.length) {
            return 0; // Default to safe zone
        }
        return game.laneTypes[visualLane];
    }
    
    function getVisualLaneFromY(y) {
        return Math.floor((canvas.height - y) / laneHeight);
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    
    let game = {
        frog: { x: canvas.width / 2, y: canvas.height - laneHeight / 2, size: 18 },
        cars: [],
        logs: [],
        onLog: false,
        gameOver: false,
        won: false,
        gameStarted: false,
        currentLevel: 0,
        levelsCompleted: 0,
        levelsToWin: froggerConfig.gameplay?.levelsToWin || settings?.levelsToWin || 5,
        lives: froggerConfig.gameplay?.lives || 3,
        maxLives: froggerConfig.gameplay?.lives || 3,
        lifeLostMessage: false,
        lifeLostTimer: 0,
        laneTypes: levelLayouts[0],
        baseCarSpeed: froggerConfig.gameplay?.carSpeed || settings?.carSpeed || 2,
        baseCarDensity: froggerConfig.gameplay?.carDensity || settings?.carDensity || 0.3
    };
    
    console.log('Frogger game settings:', settings);
    console.log('Frogger levelsToWin:', game.levelsToWin);
    
    function getCurrentDifficulty() {
        const levelMultiplier = 1 + (game.currentLevel * 0.3);
        return {
            carSpeed: game.baseCarSpeed * levelMultiplier,
            carDensity: Math.min(0.8, game.baseCarDensity * levelMultiplier)
        };
    }
    
    function nextLevel() {
        game.levelsCompleted++;
        console.log(`Frogger nextLevel: completed=${game.levelsCompleted}, toWin=${game.levelsToWin}`);
        
        if (game.levelsCompleted >= game.levelsToWin) {
            game.won = true;
            console.log('Frogger: All levels completed, game won!');
            
            // Call game complete callback
            if (callbacks && callbacks.onGameComplete) {
                setTimeout(() => {
                    callbacks.onGameComplete('frogger', { 
                        completed: true, 
                        levelsCompleted: game.levelsCompleted 
                    });
                }, 1000);
            }
            return;
        }
        
        game.currentLevel = Math.min(game.currentLevel + 1, levelLayouts.length - 1);
        game.laneTypes = levelLayouts[game.currentLevel];
        console.log(`Frogger: Moving to level ${game.currentLevel + 1}`);
        resetLevel();
    }
    
    function loseLife() {
        game.lives--;
        if (game.lives <= 0) {
            game.gameOver = true;
        } else {
            // Show life lost message
            game.lifeLostMessage = true;
            game.lifeLostTimer = 0;
            
            // Reset frog position but keep level progress
            game.frog.x = canvas.width / 2;
            game.frog.y = canvas.height - laneHeight / 2;
            game.onLog = false;
        }
    }
    
    function resetLevel() {
        game.frog.x = canvas.width / 2;
        game.frog.y = canvas.height - laneHeight / 2;
        game.cars = [];
        game.logs = [];
        game.onLog = false;
        game.gameOver = false;
        // Ensure lane types are set
        if (!game.laneTypes) {
            game.laneTypes = levelLayouts[game.currentLevel];
        }
        
        // Pre-populate screen with cars and logs if game has started
        if (game.gameStarted) {
            populateInitialObstacles();
        }
    }
    
    function populateInitialObstacles() {
        for (let visualLane = 0; visualLane < totalLanes; visualLane++) {
            const laneType = getLaneType(visualLane);
            
            if (laneType === 1) { // Car lanes (roads)
                // Add 2-3 cars per lane spread across the screen
                const carsPerLane = 2 + Math.floor(Math.random() * 2); // 2-3 cars
                for (let i = 0; i < carsPerLane; i++) {
                    const direction = visualLane % 2 === 0 ? 1 : -1;
                    const spacing = canvas.width / carsPerLane;
                    const x = (i * spacing) + (Math.random() * spacing * 0.5);
                    const difficulty = getCurrentDifficulty();
                    
                    // Random vehicle type and color
                    const vehicleTypes = ['car', 'truck'];
                    const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
                    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    
                    const width = vehicleType === 'truck' ? 80 : 60;
                    const height = vehicleType === 'truck' ? 35 : 30;
                    
                    game.cars.push({
                        x: x,
                        y: canvas.height - (visualLane + 1) * laneHeight + laneHeight / 2,
                        width: width,
                        height: height,
                        speed: difficulty.carSpeed * direction,
                        lane: visualLane,
                        type: vehicleType,
                        color: color
                    });
                }
            } else if (laneType === 2) { // Log lanes (water)
                // Add 1-2 logs per lane spread across the screen
                const logsPerLane = 1 + Math.floor(Math.random() * 2); // 1-2 logs
                for (let i = 0; i < logsPerLane; i++) {
                    const direction = visualLane % 2 === 0 ? -1 : 1;
                    const spacing = canvas.width / logsPerLane;
                    const x = (i * spacing) + (Math.random() * spacing * 0.5);
                    const difficulty = getCurrentDifficulty();
                    
                    game.logs.push({
                        x: x,
                        y: canvas.height - (visualLane + 1) * laneHeight + laneHeight / 2,
                        width: 100,
                        height: 18,
                        speed: difficulty.carSpeed * 0.6 * direction,
                        lane: visualLane
                    });
                }
            }
        }
    }
    
    function createCar(visualLane) {
        const direction = visualLane % 2 === 0 ? 1 : -1;
        const startX = direction === 1 ? -80 : canvas.width + 80;
        const difficulty = getCurrentDifficulty();
        
        // Random vehicle type and color
        const vehicleTypes = ['car', 'truck'];
        const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const width = vehicleType === 'truck' ? 80 : 60;
        const height = vehicleType === 'truck' ? 35 : 30;
        
        game.cars.push({
            x: startX,
            y: canvas.height - (visualLane + 1) * laneHeight + laneHeight / 2,
            width: width,
            height: height,
            speed: difficulty.carSpeed * direction,
            visualLane: visualLane,
            type: vehicleType,
            color: color
        });
    }
    
    function createLog(visualLane) {
        const direction = visualLane % 2 === 0 ? -1 : 1;
        const startX = direction === 1 ? -120 : canvas.width + 120;
        const difficulty = getCurrentDifficulty();
        
        game.logs.push({
            x: startX,
            y: canvas.height - (visualLane + 1) * laneHeight + laneHeight / 2,
            width: 100,
            height: 18,
            speed: difficulty.carSpeed * 0.6 * direction,
            visualLane: visualLane
        });
    }
    
    function updateObstacles() {
        if (!game.gameStarted || game.gameOver || game.won) return;
        
        game.onLog = false;
        
        // Move cars
        game.cars.forEach(car => {
            car.x += car.speed;
        });
        
        // Move logs and check if frog is on one
        game.logs.forEach(log => {
            log.x += log.speed;
            
            // Check if frog is on this log - more precise detection
            if (game.frog.x + game.frog.size > log.x && 
                game.frog.x < log.x + log.width &&
                Math.abs(game.frog.y - log.y) < laneHeight / 3) {
                game.onLog = true;
                game.frog.x += log.speed; // Move frog with log
            }
        });
        
        // Remove off-screen obstacles
        game.cars = game.cars.filter(car => car.x > -100 && car.x < canvas.width + 100);
        game.logs = game.logs.filter(log => log.x > -150 && log.x < canvas.width + 150);
        
        // Add new obstacles
        for (let visualLane = 0; visualLane < totalLanes; visualLane++) {
            const difficulty = getCurrentDifficulty();
            const laneType = getLaneType(visualLane);
            
            if (laneType === 1 && Math.random() < difficulty.carDensity / 100) {
                createCar(visualLane);
            }
            if (laneType === 2 && Math.random() < difficulty.carDensity / 40) {
                createLog(visualLane);
            }
        }
        
        // Check car collisions
        game.cars.forEach(car => {
            if (game.frog.x < car.x + car.width &&
                game.frog.x + game.frog.size > car.x &&
                game.frog.y < car.y + car.height/2 &&
                game.frog.y + game.frog.size > car.y - car.height/2) {
                loseLife();
            }
        });
        
        // Check water drowning
        const frogVisualLane = getVisualLaneFromY(game.frog.y);
        
        if (getLaneType(frogVisualLane) === 2 && !game.onLog) {
            loseLife();
        }
        
        // Check boundaries
        if (game.frog.x < 0 || game.frog.x > canvas.width) {
            loseLife();
        }
        
        // Check win condition
        console.log('Frogger update: frog.y =', game.frog.y, 'laneHeight =', laneHeight, 'condition =', game.frog.y < laneHeight);
        if (game.frog.y < laneHeight) {
            console.log('Frogger: Win condition triggered, frog.y =', game.frog.y, 'laneHeight =', laneHeight);
            nextLevel();
            if (game.won) {
                gameWon = true;
                setTimeout(showQuestion, 1000);
            }
        }
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw lanes based on type
        for (let visualLane = 0; visualLane <= totalLanes; visualLane++) {
            const y = canvas.height - (visualLane + 1) * laneHeight;
            const laneType = getLaneType(visualLane);
            
            if (laneType === 0) { // Safe zone
                ctx.fillStyle = '#4a4';
            } else if (laneType === 1) { // Road
                ctx.fillStyle = '#333';
            } else { // Water
                ctx.fillStyle = '#44a';
            }
            
            ctx.fillRect(0, y, canvas.width, laneHeight);
        }
        
        // Draw lane dividers for roads
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([8, 8]);
        for (let visualLane = 1; visualLane < totalLanes; visualLane++) {
            if (getLaneType(visualLane) === 1 && getLaneType(visualLane + 1) === 1) {
                const y = canvas.height - (visualLane + 1) * laneHeight;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);
        
        // Draw cars
        game.cars.forEach(car => {
            const carX = car.x;
            const carY = car.y - car.height/2;
            const carWidth = car.width;
            const carHeight = car.height;
            const vehicleColor = car.color || '#e74c3c';
            const isMovingRight = car.speed > 0;
            
            if (car.type === 'truck') {
                // Truck body (larger)
                ctx.fillStyle = vehicleColor;
                ctx.fillRect(carX + 5, carY + 5, carWidth - 10, carHeight - 10);
                
                // Truck cab
                ctx.fillStyle = vehicleColor;
                ctx.fillRect(carX + (isMovingRight ? carWidth - 25 : 5), carY + 2, 20, carHeight - 16);
                
                // Truck windshield
                ctx.fillStyle = '#85c1e9';
                ctx.fillRect(carX + (isMovingRight ? carWidth - 22 : 8), carY + 4, 14, 8);
                
                // Truck wheels (more wheels)
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(carX + 8, carY + carHeight - 8, 8, 6);
                ctx.fillRect(carX + carWidth/2 - 4, carY + carHeight - 8, 8, 6);
                ctx.fillRect(carX + carWidth - 16, carY + carHeight - 8, 8, 6);
                
                // Truck grille/back
                ctx.fillStyle = '#34495e';
                const grillX = isMovingRight ? carX + carWidth - 5 : carX;
                ctx.fillRect(grillX, carY + 8, 5, carHeight - 16);
                
            } else {
                // Regular car body
                ctx.fillStyle = vehicleColor;
                ctx.fillRect(carX + 5, carY + 5, carWidth - 10, carHeight - 10);
                
                // Car roof
                const roofColor = vehicleColor === '#f1c40f' ? '#f39c12' : '#34495e';
                ctx.fillStyle = roofColor;
                ctx.fillRect(carX + 12, carY + 2, carWidth - 24, carHeight - 16);
                
                // Windshield
                ctx.fillStyle = '#85c1e9';
                ctx.fillRect(carX + 15, carY + 4, carWidth - 30, 8);
                
                // Wheels
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(carX + 8, carY + carHeight - 8, 8, 6);
                ctx.fillRect(carX + carWidth - 16, carY + carHeight - 8, 8, 6);
            }
            
            // Headlights/taillights
            ctx.fillStyle = isMovingRight ? '#f1c40f' : '#e74c3c';
            const lightX = isMovingRight ? carX + carWidth - 3 : carX;
            ctx.fillRect(lightX, carY + 8, 3, 6);
            ctx.fillRect(lightX, carY + 16, 3, 6);
        });
        
        // Draw logs
        game.logs.forEach(log => {
            const logX = log.x;
            const logY = log.y - log.height/2;
            const logWidth = log.width;
            const logHeight = log.height;
            
            // Log body (brown wood)
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(logX, logY, logWidth, logHeight);
            
            // Wood grain lines
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(logX, logY + logHeight/3);
            ctx.lineTo(logX + logWidth, logY + logHeight/3);
            ctx.moveTo(logX, logY + 2*logHeight/3);
            ctx.lineTo(logX + logWidth, logY + 2*logHeight/3);
            ctx.stroke();
            
            // Left log end (darker) with tree rings
            ctx.fillStyle = '#654321';
            ctx.fillRect(logX, logY, 4, logHeight);
            
            // Tree rings on left end only (oval for perspective)
            ctx.strokeStyle = '#4a2c17';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.save();
            ctx.translate(logX + 2, logY + logHeight/2);
            ctx.scale(0.6, 1); // Make it oval (narrower horizontally)
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.restore();
            ctx.stroke();
            
            // Right log end (darker) - no rings
            ctx.fillStyle = '#654321';
            ctx.fillRect(logX + logWidth - 4, logY, 4, logHeight);
        });
        
        // Draw frog
        ctx.fillStyle = game.onLog ? '#6f6' : '#4f4';
        ctx.fillRect(game.frog.x, game.frog.y - game.frog.size/2, game.frog.size, game.frog.size);
        
        // Draw UI
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Lives box (left side)
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(10, 10, 80, 25);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Lives: ${game.lives}`, 15, 15);
        
        // Level box (right side)
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(canvas.width - 120, 10, 110, 25);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Level: ${game.levelsCompleted + 1}/${game.levelsToWin}`, canvas.width - 115, 15);
        
        ctx.textBaseline = 'alphabetic'; // Reset to default
        
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
        
        if (!game.gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Cross roads, ride logs across water', canvas.width/2, canvas.height/2 - 20);
            ctx.fillText('Press arrow keys to move', canvas.width/2, canvas.height/2 + 10);
            ctx.fillText('Reach the top to win!', canvas.width/2, canvas.height/2 + 40);
        }
        
        if (game.lifeLostMessage) {
            game.lifeLostTimer++;
            if (game.lifeLostTimer > 120) { // Show for 2 seconds at 60fps
                game.lifeLostMessage = false;
                game.lifeLostTimer = 0;
            }
            
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LIFE LOST!', canvas.width/2, canvas.height/2 - 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px Arial';
            ctx.fillText(`${game.lives} lives remaining`, canvas.width/2, canvas.height/2 + 20);
        }
        
        if (game.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.font = '18px Arial';
            ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 40);
        } else if (game.won) {
            ctx.fillStyle = 'rgba(0,255,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Level Complete!', canvas.width/2, canvas.height/2);
        }
    }
    
    function gameLoop() {
        if (!gameRunning) return;
        
        updateObstacles();
        draw();
    }
    
    function handleKeyPress(e) {
        if (!game.gameStarted) {
            game.gameStarted = true;
            // Pre-populate screen with cars and logs when game starts
            populateInitialObstacles();
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('frogger');
            }
        }
        
        if (game.gameOver) {
            if (e.code === 'KeyR') {
                // Reset entire game
                game.frog = { x: canvas.width / 2, y: canvas.height - laneHeight / 2, size: 18 };
                game.cars = [];
                game.logs = [];
                game.onLog = false;
                game.gameOver = false;
                game.gameStarted = false;
                game.currentLevel = 0;
                game.levelsCompleted = 0;
                game.lives = game.maxLives;
                game.laneTypes = levelLayouts[0];
                if (!gameRunning) {
                    gameRunning = true;
                    gameInterval = setInterval(gameLoop, 16);
                }
            }
            return;
        }
        
        if (game.won) return;
        
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (!gameKeys.includes(e.key)) return;
        
        const moveDistance = laneHeight;
        
        if (e.key === 'ArrowUp') {
            game.frog.y = Math.max(laneHeight / 2, game.frog.y - moveDistance);
        }
        if (e.key === 'ArrowDown') {
            game.frog.y = Math.min(canvas.height - laneHeight / 2, game.frog.y + moveDistance);
        }
        if (e.key === 'ArrowLeft') {
            game.frog.x = Math.max(game.frog.size / 2, game.frog.x - 25);
        }
        if (e.key === 'ArrowRight') {
            game.frog.x = Math.min(canvas.width - game.frog.size / 2, game.frog.x + 25);
        }
        
        e.preventDefault();
    }
    
    // Store handler reference for cleanup
    const keyPressHandler = handleKeyPress;
    
    document.addEventListener('keydown', keyPressHandler);
    
    gameArea.appendChild(canvas);
    
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
            document.removeEventListener('keydown', keyPressHandler);
        }
    };
}
