function createFroggerGame(settings) {
    const gameArea = document.getElementById('game-area');
    
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
        levelsToWin: settings.levelsToWin || 5,
        laneTypes: levelLayouts[0],
        baseCarSpeed: settings.carSpeed,
        baseCarDensity: settings.carDensity
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
            return;
        }
        
        game.currentLevel = Math.min(game.currentLevel + 1, levelLayouts.length - 1);
        game.laneTypes = levelLayouts[game.currentLevel];
        console.log(`Frogger: Moving to level ${game.currentLevel + 1}`);
        resetLevel();
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
    }
    
    function createCar(visualLane) {
        const direction = visualLane % 2 === 0 ? 1 : -1;
        const startX = direction === 1 ? -80 : canvas.width + 80;
        const difficulty = getCurrentDifficulty();
        
        game.cars.push({
            x: startX,
            y: canvas.height - (visualLane + 1) * laneHeight + laneHeight / 2,
            width: 60,
            height: 30,
            speed: difficulty.carSpeed * direction,
            visualLane: visualLane
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
                game.gameOver = true;
            }
        });
        
        // Check water drowning
        const frogVisualLane = getVisualLaneFromY(game.frog.y);
        
        if (getLaneType(frogVisualLane) === 2 && !game.onLog) {
            game.gameOver = true;
        }
        
        // Check boundaries
        if (game.frog.x < 0 || game.frog.x > canvas.width) {
            game.gameOver = true;
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
        ctx.fillStyle = '#f44';
        game.cars.forEach(car => {
            ctx.fillRect(car.x, car.y - car.height/2, car.width, car.height);
        });
        
        // Draw logs
        ctx.fillStyle = '#a52';
        game.logs.forEach(log => {
            ctx.fillRect(log.x, log.y - log.height/2, log.width, log.height);
        });
        
        // Draw frog
        ctx.fillStyle = game.onLog ? '#6f6' : '#4f4';
        ctx.fillRect(game.frog.x, game.frog.y - game.frog.size/2, game.frog.size, game.frog.size);
        
        // Draw UI
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.fillText(`Level: ${game.levelsCompleted + 1}/${game.levelsToWin}`, 10, 25);
        
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
        updateObstacles();
        draw();
        if (!game.gameOver && !game.won) {
            requestAnimationFrame(gameLoop);
        }
    }
    
    function handleKeyPress(e) {
        if (!game.gameStarted) {
            game.gameStarted = true;
        }
        
        if (game.gameOver) {
            if (e.code === 'KeyR') {
                // Reset to current level
                game.frog = { x: canvas.width / 2, y: canvas.height - laneHeight / 2, size: 18 };
                game.cars = [];
                game.logs = [];
                game.onLog = false;
                game.gameOver = false;
                game.gameStarted = false;
                // Keep level progression and lane types
                gameLoop();
            }
            return;
        }
        
        if (game.won) return;
        
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
    }
    
    document.addEventListener('keydown', handleKeyPress);
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Cross roads avoiding cars, ride logs across water!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    gameLoop();
}
