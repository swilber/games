async function createDirtbikeGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Dirtbike configuration using ConfigManager
    let dirtbikeConfig = {};
    if (typeof configManager !== 'undefined') {
        dirtbikeConfig = await configManager.loadConfig('dirtbike');
        console.log('Dirtbike config loaded via ConfigManager:', dirtbikeConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        dirtbikeConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameWon = false;
    let gameStarted = false;
    let gameTime = 0;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = dirtbikeConfig.physics?.canvasWidth || 800;
    canvas.height = dirtbikeConfig.physics?.canvasHeight || 400;
    const ctx = canvas.getContext('2d');
    
    // Game objects
    const bike = {
        x: 100,
        y: 300,
        vx: 0,
        vy: 0,
        rotation: 0,
        onGround: false,
        crashed: false,
        size: 20
    };
    
    const camera = { x: 0 };
    const trackLength = dirtbikeConfig.gameplay?.trackLength || 2000;
    
    // Generate terrain
    const terrain = [];
    const ramps = [];
    
    function generateTerrain() {
        // Base ground level
        let groundY = 350;
        let hillPhase = 0;
        
        for (let x = 0; x < trackLength; x += 20) {
            // Create bigger hills and valleys using sine waves
            hillPhase += 0.02;
            const hillVariation = Math.sin(hillPhase) * 60 + Math.sin(hillPhase * 2.3) * 30;
            groundY = 350 + hillVariation;
            
            // Add random bumps
            groundY += (Math.random() - 0.5) * 20;
            groundY = Math.max(250, Math.min(380, groundY));
            terrain.push({ x, y: groundY });
            
            // Add ramps more frequently on hills
            if (x > 200 && x < trackLength - 200 && Math.random() < 0.08) {
                ramps.push({
                    x: x,
                    y: groundY - 50,
                    width: 80,
                    height: 50
                });
            }
            
            // Add obstacles (rocks)
            if (x > 300 && x < trackLength - 300 && Math.random() < 0.03) {
                ramps.push({
                    x: x,
                    y: groundY - 15,
                    width: 25,
                    height: 15,
                    obstacle: true
                });
            }
        }
        
        // Finish line
        terrain.push({ x: trackLength, y: 350, finish: true });
    }
    
    function getGroundY(x) {
        // Find terrain point at x position
        for (let i = 0; i < terrain.length - 1; i++) {
            if (x >= terrain[i].x && x <= terrain[i + 1].x) {
                // Linear interpolation between points
                const t = (x - terrain[i].x) / (terrain[i + 1].x - terrain[i].x);
                return terrain[i].y + t * (terrain[i + 1].y - terrain[i].y);
            }
        }
        return 350; // Default ground level
    }
    
    function update() {
        if (!gameRunning || bike.crashed) return;
        
        gameTime += 1/60; // Assuming 60fps
        
        const gravity = dirtbikeConfig.physics?.gravity || 0.5;
        const friction = dirtbikeConfig.physics?.friction || 0.95;
        
        // Apply gravity
        bike.vy += gravity;
        
        // Apply friction when on ground
        if (bike.onGround) {
            bike.vx *= friction;
        }
        
        // Update position
        bike.x += bike.vx;
        bike.y += bike.vy;
        
        // Check ground collision
        const groundY = getGroundY(bike.x);
        bike.onGround = false;
        
        // Check obstacle collisions
        for (let ramp of ramps) {
            if (ramp.obstacle && 
                bike.x > ramp.x - 10 && bike.x < ramp.x + ramp.width + 10 &&
                bike.y > ramp.y - 10 && bike.y < ramp.y + ramp.height + 10) {
                bike.crashed = true;
                setTimeout(() => {
                    if (callbacks && callbacks.onGameComplete) {
                        callbacks.onGameComplete('dirtbike', { completed: false, crashed: true });
                    }
                }, 1000);
                return;
            }
        }
        
        if (bike.y >= groundY - bike.size) {
            bike.y = groundY - bike.size;
            bike.vy = 0;
            bike.onGround = true;
            
            // Check landing angle for crash
            if (Math.abs(bike.rotation) > 1.5 && Math.abs(bike.vy) > 5) {
                bike.crashed = true;
                setTimeout(() => {
                    if (callbacks && callbacks.onGameComplete) {
                        callbacks.onGameComplete('dirtbike', { completed: false, crashed: true });
                    }
                }, 1000);
                return;
            }
            
            // Straighten bike when on ground
            bike.rotation *= 0.9;
        }
        
        // Update camera to follow bike
        camera.x = bike.x - canvas.width / 3;
        
        // Check win condition (reached end)
        if (bike.x >= trackLength) {
            gameWon = true;
            gameRunning = false;
            
            if (callbacks && callbacks.onGameComplete) {
                setTimeout(() => {
                    callbacks.onGameComplete('dirtbike', { 
                        completed: true, 
                        time: gameTime.toFixed(1) 
                    });
                }, 1000);
            }
        }
        
        // Check time limit
        const timeLimit = dirtbikeConfig.gameplay?.timeLimit || 60;
        if (gameTime > timeLimit) {
            bike.crashed = true;
            setTimeout(() => {
                if (callbacks && callbacks.onGameComplete) {
                    callbacks.onGameComplete('dirtbike', { completed: false, timeout: true });
                }
            }, 1000);
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw sky
        ctx.fillStyle = dirtbikeConfig.visual?.skyColor || '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Save context for camera transform
        ctx.save();
        ctx.translate(-camera.x, 0);
        
        // Draw terrain
        ctx.fillStyle = dirtbikeConfig.visual?.trackColor || '#8B4513';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let point of terrain) {
            ctx.lineTo(point.x, point.y);
        }
        ctx.lineTo(trackLength, canvas.height);
        ctx.closePath();
        ctx.fill();
        
        // Draw ramps and obstacles
        for (let ramp of ramps) {
            if (ramp.obstacle) {
                ctx.fillStyle = '#666666'; // Gray for obstacles
            } else {
                ctx.fillStyle = dirtbikeConfig.visual?.rampColor || '#654321'; // Brown for ramps
            }
            ctx.fillRect(ramp.x, ramp.y, ramp.width, ramp.height);
        }
        
        // Draw finish line
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(trackLength, 200);
        ctx.lineTo(trackLength, 400);
        ctx.stroke();
        
        // Draw bike
        ctx.save();
        ctx.translate(bike.x, bike.y);
        ctx.rotate(bike.rotation);
        
        if (bike.crashed) {
            ctx.fillStyle = '#666666';
        } else {
            ctx.fillStyle = dirtbikeConfig.visual?.bikeColor || '#ff4444';
        }
        
        // Simple bike representation
        ctx.fillRect(-bike.size/2, -bike.size/2, bike.size, bike.size/2);
        // Wheels
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-8, 0, 4, 0, Math.PI * 2);
        ctx.arc(8, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        ctx.restore();
        
        // Draw UI
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText(`Speed: ${Math.abs(bike.vx).toFixed(1)}`, 10, 30);
        ctx.fillText(`Time: ${gameTime.toFixed(1)}s`, 10, 50);
        ctx.fillText(`Distance: ${Math.max(0, bike.x - 100).toFixed(0)}m`, 10, 70);
        
        if (!gameStarted) {
            ctx.fillStyle = '#000000';
            ctx.font = '20px Arial';
            ctx.fillText('Arrow Keys: Lean/Throttle, Space: Jump', 200, 50);
        }
        
        if (gameWon) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '32px Arial';
            ctx.fillText('FINISH!', canvas.width/2 - 60, canvas.height/2);
        }
        
        if (bike.crashed) {
            ctx.fillStyle = '#ff0000';
            ctx.font = '32px Arial';
            ctx.fillText('CRASHED!', canvas.width/2 - 70, canvas.height/2);
        }
    }
    
    function handleKeyDown(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
        if (!gameKeys.includes(e.code)) return;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('dirtbike');
            }
        }
        
        if (!gameRunning || bike.crashed) return;
        
        const speed = dirtbikeConfig.gameplay?.speed || settings?.speed || 6;
        const jumpPower = dirtbikeConfig.physics?.jumpPower || 12;
        
        switch(e.code) {
            case 'ArrowLeft':
                bike.rotation -= 0.15;
                if (bike.onGround) bike.vx -= 0.5;
                break;
            case 'ArrowRight':
                bike.rotation += 0.15;
                if (bike.onGround) bike.vx += 0.5;
                break;
            case 'ArrowUp':
                if (bike.onGround) bike.vx += speed * 1.5; // Much higher acceleration
                break;
            case 'ArrowDown':
                if (bike.onGround) bike.vx -= speed * 0.8;
                break;
            case 'Space':
                if (bike.onGround) {
                    bike.vy = -jumpPower;
                    bike.onGround = false;
                }
                break;
        }
        
        // Limit max speed
        const maxSpeed = dirtbikeConfig.physics?.maxSpeed || 15;
        bike.vx = Math.max(-maxSpeed, Math.min(maxSpeed, bike.vx));
        
        e.preventDefault();
    }
    
    // Store handler reference for cleanup
    const keyDownHandler = handleKeyDown;
    
    // Initialize game
    generateTerrain();
    document.addEventListener('keydown', keyDownHandler);
    gameArea.appendChild(canvas);
    
    // Start game loop
    gameRunning = true;
    gameInterval = setInterval(() => {
        update();
        render();
    }, 16); // ~60fps
    
    render(); // Initial render
    
    // Return cleanup function
    return {
        cleanup: () => {
            gameRunning = false;
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            document.removeEventListener('keydown', keyDownHandler);
        }
    };
}
