async function createGalagaGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load Galaga configuration using ConfigManager
    let galagaConfig = {};
    if (typeof configManager !== 'undefined') {
        galagaConfig = await configManager.loadConfig('galaga');
        console.log('Galaga config loaded via ConfigManager:', galagaConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        galagaConfig = {
            gameplay: settings,
            physics: settings,
            visual: settings
        };
    }
    
    // Game state
    let gameRunning = false;
    let gameInterval = null;
    let gameWon = false;
    let gameOver = false;
    let gameStarted = false;
    let score = 0;
    let lives = galagaConfig.gameplay?.lives || 3;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = galagaConfig.physics?.canvasWidth || 800;
    canvas.height = galagaConfig.physics?.canvasHeight || 600;
    const ctx = canvas.getContext('2d');
    
    // Game objects
    const player = {
        x: canvas.width / 2 - 15,
        y: canvas.height - 50,
        width: galagaConfig.physics?.playerSize || 30,
        height: galagaConfig.physics?.playerSize || 30,
        speed: galagaConfig.gameplay?.playerSpeed || 4
    };
    
    const bullets = [];
    const enemies = [];
    const enemyBullets = [];
    
    // Input handling
    const keys = {};
    
    function createEnemyFormation() {
        const enemyCount = galagaConfig.gameplay?.enemyCount || 20;
        const enemySize = galagaConfig.physics?.enemySize || 25;
        const rows = 4;
        const cols = Math.ceil(enemyCount / rows);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols && enemies.length < enemyCount; col++) {
                enemies.push({
                    x: 100 + col * (enemySize + 20),
                    y: 50 + row * (enemySize + 15),
                    width: enemySize,
                    height: enemySize,
                    speed: galagaConfig.gameplay?.enemySpeed || 1,
                    direction: 1,
                    shootTimer: Math.random() * 300
                });
            }
        }
    }
    
    function render() {
        // Clear canvas
        ctx.fillStyle = galagaConfig.visual?.backgroundColor || '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw player
        ctx.fillStyle = galagaConfig.visual?.playerColor || '#00ff00';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Draw enemies
        ctx.fillStyle = galagaConfig.visual?.enemyColor || '#ff0000';
        enemies.forEach(enemy => {
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
        
        // Draw bullets
        ctx.fillStyle = galagaConfig.visual?.bulletColor || '#ffff00';
        bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw enemy bullets
        ctx.fillStyle = '#ff8800';
        enemyBullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw UI
        ctx.fillStyle = galagaConfig.visual?.textColor || '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 20, 30);
        ctx.fillText(`Lives: ${lives}`, 20, 60);
        
        if (!gameStarted) {
            ctx.font = '24px Arial';
            ctx.fillText('Press SPACE to shoot, Arrow keys to move', canvas.width/2 - 200, canvas.height/2);
        }
        
        if (gameWon) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '36px Arial';
            ctx.fillText('STAGE CLEAR!', canvas.width/2 - 100, canvas.height/2);
        }
        
        if (gameOver) {
            ctx.fillStyle = '#ff0000';
            ctx.font = '36px Arial';
            ctx.fillText('GAME OVER', canvas.width/2 - 100, canvas.height/2);
        }
    }
    
    function update() {
        if (!gameRunning || gameWon || gameOver) return;
        
        // Move player
        if (keys['ArrowLeft'] && player.x > 0) {
            player.x -= player.speed;
        }
        if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
            player.x += player.speed;
        }
        
        // Move bullets
        const bulletSpeed = galagaConfig.gameplay?.bulletSpeed || 5;
        bullets.forEach((bullet, index) => {
            bullet.y -= bulletSpeed;
            if (bullet.y < 0) {
                bullets.splice(index, 1);
            }
        });
        
        // Move enemy bullets
        enemyBullets.forEach((bullet, index) => {
            bullet.y += bulletSpeed * 0.7;
            if (bullet.y > canvas.height) {
                enemyBullets.splice(index, 1);
            }
        });
        
        // Move enemies
        let changeDirection = false;
        enemies.forEach(enemy => {
            enemy.x += enemy.speed * enemy.direction;
            if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
                changeDirection = true;
            }
            
            // Enemy shooting
            enemy.shootTimer--;
            if (enemy.shootTimer <= 0 && Math.random() < 0.001) {
                enemyBullets.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height,
                    width: 4,
                    height: 8
                });
                enemy.shootTimer = 200 + Math.random() * 300;
            }
        });
        
        if (changeDirection) {
            enemies.forEach(enemy => {
                enemy.direction *= -1;
                enemy.y += 20;
            });
        }
        
        // Collision detection - bullets vs enemies
        bullets.forEach((bullet, bulletIndex) => {
            enemies.forEach((enemy, enemyIndex) => {
                if (bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y) {
                    bullets.splice(bulletIndex, 1);
                    enemies.splice(enemyIndex, 1);
                    score += 100;
                }
            });
        });
        
        // Collision detection - enemy bullets vs player
        enemyBullets.forEach((bullet, index) => {
            if (bullet.x < player.x + player.width &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.height &&
                bullet.y + bullet.height > player.y) {
                enemyBullets.splice(index, 1);
                lives--;
                if (lives <= 0) {
                    gameOver = true;
                    gameRunning = false;
                }
            }
        });
        
        // Check win condition
        if (enemies.length === 0) {
            gameWon = true;
            gameRunning = false;
            
            // Call game complete callback
            if (callbacks && callbacks.onGameComplete) {
                setTimeout(() => {
                    callbacks.onGameComplete('galaga', { 
                        completed: true, 
                        score: score,
                        lives: lives 
                    });
                }, 1500);
            }
        }
        
        // Check lose condition - enemies reach bottom
        enemies.forEach(enemy => {
            if (enemy.y + enemy.height >= player.y) {
                gameOver = true;
                gameRunning = false;
            }
        });
    }
    
    function handleKeyDown(e) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'Space'];
        if (!gameKeys.includes(e.code)) return;
        
        if (!gameStarted) {
            gameStarted = true;
            if (callbacks && callbacks.onGameStart) {
                callbacks.onGameStart('galaga');
            }
        }
        
        keys[e.code] = true;
        
        if (e.code === 'Space' && gameRunning && !gameWon && !gameOver) {
            // Shoot bullet
            bullets.push({
                x: player.x + player.width / 2 - 2,
                y: player.y,
                width: galagaConfig.physics?.bulletSize || 4,
                height: galagaConfig.physics?.bulletSize || 4
            });
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        keys[e.code] = false;
    }
    
    // Store handler references for cleanup
    const keyDownHandler = handleKeyDown;
    const keyUpHandler = handleKeyUp;
    
    // Set up game
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    gameArea.appendChild(canvas);
    
    // Initialize game
    createEnemyFormation();
    
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
            document.removeEventListener('keyup', keyUpHandler);
        }
    };
}
