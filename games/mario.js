function createMarioGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    
    let game = {
        player: { 
            x: 50, y: 300, width: 20, height: 30, 
            vx: 0, vy: 0, onGround: false, 
            lives: 3, score: 0 
        },
        camera: { x: 0 },
        platforms: [],
        enemies: [],
        coins: [],
        particles: [],
        levelWidth: settings.levelLength,
        gameOver: false,
        won: false,
        gameStarted: false,
        keys: {}
    };
    
    function generateLevel() {
        // Ground platforms
        for (let x = 0; x < game.levelWidth; x += 40) {
            game.platforms.push({ x, y: 350, width: 40, height: 50, type: 'ground' });
        }
        
        // Floating platforms
        for (let i = 0; i < 8; i++) {
            const x = 150 + i * 80;
            const y = 250 - Math.sin(i * 0.5) * 50;
            game.platforms.push({ x, y, width: 60, height: 20, type: 'platform' });
        }
        
        // Enemies
        for (let i = 0; i < settings.enemyCount; i++) {
            const x = 200 + i * 150;
            game.enemies.push({ 
                x, y: 320, width: 20, height: 20, 
                vx: -1, type: 'goomba', alive: true,
                animFrame: 0, animTimer: 0
            });
        }
        
        // Coins
        for (let i = 0; i < 10; i++) {
            const x = 100 + i * 70;
            const y = 200 - Math.random() * 100;
            game.coins.push({ x, y, width: 15, height: 15, collected: false });
        }
        
        // Flag at end
        game.flag = { x: game.levelWidth - 100, y: 200, width: 10, height: 150 };
    }
    
    function updatePlayer() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        // Horizontal movement
        if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
            game.player.vx = Math.max(game.player.vx - 0.5, -5);
        } else if (game.keys['ArrowRight'] || game.keys['KeyD']) {
            game.player.vx = Math.min(game.player.vx + 0.5, 5);
        } else {
            game.player.vx *= 0.8; // Friction
        }
        
        // Jumping
        if ((game.keys['ArrowUp'] || game.keys['KeyW'] || game.keys['Space']) && game.player.onGround) {
            game.player.vy = -settings.jumpHeight;
            game.player.onGround = false;
        }
        
        // Gravity
        game.player.vy += settings.gravity;
        
        // Update position
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;
        
        // Platform collision
        game.player.onGround = false;
        game.platforms.forEach(platform => {
            if (game.player.x < platform.x + platform.width &&
                game.player.x + game.player.width > platform.x &&
                game.player.y < platform.y + platform.height &&
                game.player.y + game.player.height > platform.y) {
                
                // Landing on top
                if (game.player.vy > 0 && game.player.y < platform.y) {
                    game.player.y = platform.y - game.player.height;
                    game.player.vy = 0;
                    game.player.onGround = true;
                }
                // Hitting from below
                else if (game.player.vy < 0 && game.player.y > platform.y) {
                    game.player.y = platform.y + platform.height;
                    game.player.vy = 0;
                }
                // Side collision
                else if (game.player.vx > 0) {
                    game.player.x = platform.x - game.player.width;
                } else if (game.player.vx < 0) {
                    game.player.x = platform.x + platform.width;
                }
            }
        });
        
        // Boundary checks
        if (game.player.x < 0) game.player.x = 0;
        if (game.player.y > canvas.height) {
            game.player.lives--;
            if (game.player.lives <= 0) {
                game.gameOver = true;
            } else {
                game.player.x = 50;
                game.player.y = 300;
                game.player.vx = 0;
                game.player.vy = 0;
            }
        }
        
        // Camera follow
        game.camera.x = Math.max(0, Math.min(game.player.x - canvas.width / 2, game.levelWidth - canvas.width));
    }
    
    function updateEnemies() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            enemy.x += enemy.vx;
            
            // Update animation
            enemy.animTimer++;
            if (enemy.animTimer > 20) {
                enemy.animFrame = (enemy.animFrame + 1) % 2;
                enemy.animTimer = 0;
            }
            
            // Simple boundary check - turn around at edges
            if (enemy.x <= 100 || enemy.x >= game.levelWidth - 150) {
                enemy.vx *= -1;
            }
            
            // Player collision
            if (game.player.x < enemy.x + enemy.width &&
                game.player.x + game.player.width > enemy.x &&
                game.player.y < enemy.y + enemy.height &&
                game.player.y + game.player.height > enemy.y) {
                
                // Jump on enemy
                if (game.player.vy > 0 && game.player.y < enemy.y) {
                    enemy.alive = false;
                    game.player.vy = -8; // Bounce
                    game.player.score += 100;
                    
                    // Particle effect
                    for (let i = 0; i < 5; i++) {
                        game.particles.push({
                            x: enemy.x + enemy.width/2,
                            y: enemy.y + enemy.height/2,
                            vx: (Math.random() - 0.5) * 4,
                            vy: Math.random() * -3,
                            life: 30,
                            color: '#ff6'
                        });
                    }
                } else {
                    // Hit by enemy
                    game.player.lives--;
                    if (game.player.lives <= 0) {
                        game.gameOver = true;
                    } else {
                        game.player.x = Math.max(50, game.player.x - 100);
                        game.player.vx = 0;
                    }
                }
            }
        });
    }
    
    function updateCoins() {
        if (game.gameOver || game.won || !game.gameStarted) return;
        
        game.coins.forEach(coin => {
            if (coin.collected) return;
            
            if (game.player.x < coin.x + coin.width &&
                game.player.x + game.player.width > coin.x &&
                game.player.y < coin.y + coin.height &&
                game.player.y + game.player.height > coin.y) {
                
                coin.collected = true;
                game.player.score += 50;
                
                // Particle effect
                for (let i = 0; i < 3; i++) {
                    game.particles.push({
                        x: coin.x + coin.width/2,
                        y: coin.y + coin.height/2,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * -2,
                        life: 20,
                        color: '#fd0'
                    });
                }
            }
        });
    }
    
    function updateParticles() {
        game.particles = game.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2; // Gravity
            particle.life--;
            return particle.life > 0;
        });
    }
    
    function checkWin() {
        if (game.player.x + game.player.width > game.flag.x) {
            game.won = true;
            gameWon = true;
            setTimeout(showQuestion, 1000);
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(-game.camera.x, 0);
        
        // Platforms
        game.platforms.forEach(platform => {
            ctx.fillStyle = platform.type === 'ground' ? '#8B4513' : '#228B22';
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });
        
        // Coins
        game.coins.forEach(coin => {
            if (!coin.collected) {
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(coin.x, coin.y, coin.width, coin.height);
                ctx.fillStyle = '#FFA500';
                ctx.fillRect(coin.x + 3, coin.y + 3, coin.width - 6, coin.height - 6);
            }
        });
        
        // Enemies
        game.enemies.forEach(enemy => {
            if (enemy.alive) {
                // Body
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                
                // Eyes (animate position slightly)
                ctx.fillStyle = '#000';
                const eyeOffset = enemy.animFrame === 0 ? 0 : 1;
                ctx.fillRect(enemy.x + 3 + eyeOffset, enemy.y + 3, 3, 3);
                ctx.fillRect(enemy.x + 13 - eyeOffset, enemy.y + 3, 3, 3);
                
                // Feet (animate to show walking)
                ctx.fillStyle = '#654321';
                if (enemy.animFrame === 0) {
                    ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 3, 4, 3);
                    ctx.fillRect(enemy.x + enemy.width - 6, enemy.y + enemy.height - 2, 4, 2);
                } else {
                    ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 2, 4, 2);
                    ctx.fillRect(enemy.x + enemy.width - 6, enemy.y + enemy.height - 3, 4, 3);
                }
            }
        });
        
        // Player
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(game.player.x + 2, game.player.y + 2, game.player.width - 4, game.player.height - 4);
        
        // Flag
        ctx.fillStyle = '#000';
        ctx.fillRect(game.flag.x, game.flag.y, 5, game.flag.height);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.flag.x + 5, game.flag.y, 30, 20);
        
        // Particles
        game.particles.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, 3, 3);
        });
        
        ctx.restore();
        
        // UI
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(`Lives: ${game.player.lives}`, 10, 30);
        ctx.fillText(`Score: ${game.player.score}`, 10, 60);
        
        if (!game.gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Use Arrow Keys or WASD to move', canvas.width/2, canvas.height/2 - 20);
            ctx.fillText('SPACE or UP to jump. Reach the flag!', canvas.width/2, canvas.height/2 + 20);
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
            ctx.font = '18px Arial';
            ctx.fillText(`Final Score: ${game.player.score}`, canvas.width/2, canvas.height/2 + 40);
        }
    }
    
    function gameLoop() {
        updatePlayer();
        updateEnemies();
        updateCoins();
        updateParticles();
        checkWin();
        render();
        
        if (!game.gameOver && !game.won) {
            requestAnimationFrame(gameLoop);
        }
    }
    
    function handleKeyDown(e) {
        game.keys[e.code] = true;
        
        if (!game.gameStarted) {
            game.gameStarted = true;
        }
        
        if (game.gameOver && e.code === 'KeyR') {
            // Restart
            game.player = { 
                x: 50, y: 300, width: 20, height: 30, 
                vx: 0, vy: 0, onGround: false, 
                lives: 3, score: 0 
            };
            game.camera.x = 0;
            game.enemies.forEach(enemy => enemy.alive = true);
            game.coins.forEach(coin => coin.collected = false);
            game.particles = [];
            game.gameOver = false;
            game.won = false;
            gameLoop();
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        game.keys[e.code] = false;
        e.preventDefault();
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Classic Mario Bros platformer - jump on enemies, collect coins, reach the flag!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    generateLevel();
    gameLoop();
}
