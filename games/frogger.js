function createFroggerGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    const totalLanes = 12;
    const laneHeight = canvas.height / (totalLanes + 2);
    
    let game = {
        frog: { x: canvas.width / 2, y: canvas.height - laneHeight / 2, size: 18 },
        cars: [],
        logs: [],
        onLog: false,
        gameOver: false,
        won: false,
        gameStarted: false
    };
    
    // Lane types: 0=safe, 1=road, 2=water (from bottom to top)
    const laneTypes = [0, 1, 1, 1, 1, 0, 2, 2, 2, 2, 2, 0, 0];
    
    function createCar(lane) {
        const direction = lane % 2 === 0 ? 1 : -1;
        const startX = direction === 1 ? -80 : canvas.width + 80;
        
        game.cars.push({
            x: startX,
            y: (lane + 1) * laneHeight + laneHeight / 2,
            width: 70,
            height: 22,
            speed: settings.carSpeed * direction * (0.8 + Math.random() * 0.4),
            lane: lane
        });
    }
    
    function createLog(lane) {
        const direction = lane % 2 === 0 ? -1 : 1;
        const startX = direction === 1 ? -120 : canvas.width + 120;
        
        game.logs.push({
            x: startX,
            y: (lane + 1) * laneHeight + laneHeight / 2,
            width: 100,
            height: 18,
            speed: settings.carSpeed * 0.6 * direction,
            lane: lane
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
        for (let lane = 0; lane < totalLanes; lane++) {
            if (laneTypes[lane + 1] === 1 && Math.random() < settings.carDensity / 100) {
                createCar(lane);
            }
            if (laneTypes[lane + 1] === 2 && Math.random() < settings.carDensity / 40) {
                createLog(lane);
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
        const frogLaneIndex = Math.floor(game.frog.y / laneHeight);
        
        if (frogLaneIndex >= 0 && frogLaneIndex < laneTypes.length && 
            laneTypes[frogLaneIndex] === 2 && !game.onLog) {
            game.gameOver = true;
        }
        
        // Check boundaries
        if (game.frog.x < 0 || game.frog.x > canvas.width) {
            game.gameOver = true;
        }
        
        // Check win condition
        if (game.frog.y < laneHeight) {
            game.won = true;
            gameWon = true;
            setTimeout(showQuestion, 1000);
        }
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw lanes based on type
        for (let i = 0; i <= totalLanes + 1; i++) {
            const y = i * laneHeight;
            
            if (laneTypes[i] === 0) { // Safe zone
                ctx.fillStyle = '#4a4';
            } else if (laneTypes[i] === 1) { // Road
                ctx.fillStyle = '#333';
            } else { // Water
                ctx.fillStyle = '#44a';
            }
            
            ctx.fillRect(0, y, canvas.width, laneHeight);
        }
        
        // Draw lane dividers for roads
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([8, 8]);
        for (let i = 1; i <= totalLanes; i++) {
            if (laneTypes[i] === 1 && laneTypes[i+1] === 1) {
                ctx.beginPath();
                ctx.moveTo(0, (i + 1) * laneHeight);
                ctx.lineTo(canvas.width, (i + 1) * laneHeight);
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
                game = {
                    frog: { x: canvas.width / 2, y: canvas.height - laneHeight / 2, size: 18 },
                    cars: [],
                    logs: [],
                    onLog: false,
                    gameOver: false,
                    won: false,
                    gameStarted: false
                };
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
