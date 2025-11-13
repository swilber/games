async function createFakeGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Fake Game configuration using ConfigManager
    let fakeConfig = {};
    if (typeof configManager !== 'undefined') {
        fakeConfig = await configManager.loadConfig('fake');
        console.log('Fake config loaded via ConfigManager:', fakeConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        fakeConfig = {
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
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = fakeConfig.physics?.canvasWidth || 400;
    canvas.height = fakeConfig.physics?.canvasHeight || 300;
    const ctx = canvas.getContext('2d');
    
    // Game objects
    const player = { 
        x: 50, 
        y: 150, 
        size: fakeConfig.physics?.playerSize || 20 
    };
    const goal = { 
        x: 350, 
        y: 150, 
        size: fakeConfig.physics?.goalSize || 30 
    };
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw player
        ctx.fillStyle = fakeConfig.visual?.playerColor || '#0000ff';
        ctx.fillRect(player.x, player.y, player.size, player.size);
        
        // Draw goal
        ctx.fillStyle = fakeConfig.visual?.goalColor || '#ffd700';
        ctx.fillRect(goal.x, goal.y, goal.size, goal.size);
        
        // Instructions
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText('Use arrow keys to reach the gold square', 50, 30);
        
        if (gameWon) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '24px Arial';
            ctx.fillText('YOU WIN!', 150, 100);
        }
    }
    
    function update() {
        if (!gameRunning || gameWon) return;
        
        // Check win condition
        if (Math.abs(player.x - goal.x) < 30 && Math.abs(player.y - goal.y) < 30) {
            gameWon = true;
            gameRunning = false;
            
            // Call game complete callback
            if (callbacks && callbacks.onGameComplete) {
                setTimeout(() => {
                    callbacks.onGameComplete('fake', { completed: true });
                }, 1000);
            }
        }
    }
    
    function handleKeyDown(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        if (!gameKeys.includes(e.code)) return;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('fake');
            }
        }
        
        if (!gameRunning || gameWon) return;
        
        const speed = fakeConfig.gameplay?.speed || 5;
        switch(e.code) {
            case 'ArrowLeft':
                player.x = Math.max(0, player.x - speed);
                break;
            case 'ArrowRight':
                player.x = Math.min(canvas.width - player.size, player.x + speed);
                break;
            case 'ArrowUp':
                player.y = Math.max(0, player.y - speed);
                break;
            case 'ArrowDown':
                player.y = Math.min(canvas.height - player.size, player.y + speed);
                break;
        }
        
        e.preventDefault();
    }
    
    // Store handler reference for cleanup
    const keyDownHandler = handleKeyDown;
    
    // Set up game
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
