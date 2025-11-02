// Sprite rendering system for Mario game
const SpriteRenderer = {
    // Enemy sprites
    enemies: {
        goomba: (ctx, enemy) => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Eyes
            ctx.fillStyle = '#000';
            const eyeOffset = enemy.animFrame === 0 ? 0 : 1;
            ctx.fillRect(enemy.x + 3 + eyeOffset, enemy.y + 3, 3, 3);
            ctx.fillRect(enemy.x + 13 - eyeOffset, enemy.y + 3, 3, 3);
            
            // Feet (animate walking)
            ctx.fillStyle = '#654321';
            if (enemy.animFrame === 0) {
                ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 3, 4, 3);
                ctx.fillRect(enemy.x + enemy.width - 6, enemy.y + enemy.height - 2, 4, 2);
            } else {
                ctx.fillRect(enemy.x + enemy.width - 6, enemy.y + enemy.height - 3, 4, 3);
                ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 2, 4, 2);
            }
        },
        
        koopa: (ctx, enemy) => {
            ctx.fillStyle = '#0a0';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.fillStyle = '#060';
            ctx.fillRect(enemy.x + 2, enemy.y + 2, enemy.width - 4, enemy.height - 4);
            
            // Shell pattern
            ctx.fillStyle = '#0a0';
            ctx.fillRect(enemy.x + 4, enemy.y + 4, 4, 4);
            ctx.fillRect(enemy.x + 12, enemy.y + 4, 4, 4);
            ctx.fillRect(enemy.x + 8, enemy.y + 8, 4, 4);
        }
    },
    
    // Environment sprites
    environment: {
        pipe: (ctx, platform) => {
            ctx.fillStyle = '#228B22';
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Pipe highlights
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(platform.x + 2, platform.y, 4, platform.height);
            ctx.fillRect(platform.x + platform.width - 6, platform.y, 4, platform.height);
            
            // Pipe top
            ctx.fillStyle = '#228B22';
            ctx.fillRect(platform.x - 4, platform.y - 4, platform.width + 8, 8);
        },
        
        brick: (ctx, block) => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(block.x, block.y, block.width, block.height);
            
            // Brick pattern
            ctx.fillStyle = '#654321';
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    ctx.fillRect(block.x + i * 8, block.y + j * 8, 6, 6);
                }
            }
        },
        
        question: (ctx, block) => {
            ctx.fillStyle = block.content ? '#FFD700' : '#8B4513';
            ctx.fillRect(block.x, block.y, block.width, block.height);
            
            if (block.content) {
                ctx.fillStyle = '#000';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('?', block.x + 16, block.y + 22);
                ctx.textAlign = 'left';
            }
        }
    },
    
    // Power-up sprites
    powerUps: {
        mushroom: (ctx, powerUp) => {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            ctx.fillStyle = '#fff';
            ctx.fillRect(powerUp.x + 4, powerUp.y + 4, 8, 8);
            ctx.fillRect(powerUp.x + 20, powerUp.y + 4, 8, 8);
        },
        
        fireflower: (ctx, powerUp) => {
            ctx.fillStyle = '#ff4500';
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(powerUp.x + 8, powerUp.y + 8, 16, 16);
        }
    }
};
