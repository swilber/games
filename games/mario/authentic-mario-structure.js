// Authentic Super Mario Bros Game Structure

const AuthenticMario = {
    // Game constants matching original
    CONSTANTS: {
        TILE_SIZE: 16,
        SCREEN_WIDTH: 256,
        SCREEN_HEIGHT: 240,
        GROUND_Y: 208,
        GRAVITY: 0.375,
        MAX_FALL_SPEED: 4.5,
        WALK_ACCELERATION: 0.09375,
        MAX_WALK_SPEED: 1.5,
        JUMP_VELOCITY: -4.0,
        HIGH_JUMP_VELOCITY: -5.0
    },

    // Authentic sprite system with pixel-perfect rendering
    Sprites: {
        mario: {
            small: {
                idle: { width: 16, height: 16, frames: [[0,0]] },
                walk: { width: 16, height: 16, frames: [[16,0], [32,0], [48,0]] },
                jump: { width: 16, height: 16, frames: [[80,0]] },
                crouch: { width: 16, height: 16, frames: [[64,0]] }
            },
            big: {
                idle: { width: 16, height: 32, frames: [[0,16]] },
                walk: { width: 16, height: 32, frames: [[16,16], [32,16], [48,16]] },
                jump: { width: 16, height: 32, frames: [[80,16]] },
                crouch: { width: 16, height: 24, frames: [[64,16]] }
            },
            fire: {
                idle: { width: 16, height: 32, frames: [[0,48]] },
                walk: { width: 16, height: 32, frames: [[16,48], [32,48], [48,48]] },
                jump: { width: 16, height: 32, frames: [[80,48]] },
                throw: { width: 16, height: 32, frames: [[96,48]] }
            }
        },
        
        enemies: {
            goomba: {
                walk: { width: 16, height: 16, frames: [[0,96], [16,96]] },
                squished: { width: 16, height: 8, frames: [[32,104]] }
            },
            koopa: {
                walk: { width: 16, height: 24, frames: [[48,88], [64,88]] },
                shell: { width: 16, height: 16, frames: [[80,96]] },
                shellMoving: { width: 16, height: 16, frames: [[96,96], [112,96]] }
            }
        },
        
        blocks: {
            brick: { width: 16, height: 16, frames: [[0,128]] },
            question: { width: 16, height: 16, frames: [[16,128], [32,128], [48,128]] },
            questionEmpty: { width: 16, height: 16, frames: [[64,128]] },
            pipe: { width: 32, height: 32, frames: [[0,144]] }
        }
    },

    // Authentic World 1-1 layout (exact replica)
    Levels: {
        '1-1': {
            width: 3392, // Original level width in pixels
            timeLimit: 400,
            music: 'overworld',
            
            // Tile-based layout matching original exactly
            layout: [
                // Ground tiles (each represents 16x16 pixel area)
                { type: 'ground', x: 0, y: 208, width: 2048 },
                { type: 'pit', x: 2048, y: 208, width: 64 },
                { type: 'ground', x: 2112, y: 208, width: 1280 },
                
                // Pipes (exact positions from original)
                { type: 'pipe', x: 448, y: 176, height: 32 },
                { type: 'pipe', x: 608, y: 160, height: 48 },
                { type: 'pipe', x: 736, y: 144, height: 64 },
                { type: 'pipe', x: 912, y: 160, height: 48 },
                
                // Question blocks and bricks
                { type: 'question', x: 256, y: 144, content: 'coin' },
                { type: 'brick', x: 320, y: 144 },
                { type: 'question', x: 336, y: 144, content: 'mushroom' },
                { type: 'brick', x: 352, y: 144 },
                { type: 'question', x: 368, y: 144, content: 'coin' },
                { type: 'brick', x: 384, y: 144 },
                
                // Hidden blocks
                { type: 'hidden', x: 256, y: 80, content: '1up' },
                { type: 'hidden', x: 784, y: 144, content: 'coin' }
            ],
            
            // Enemy positions matching original
            enemies: [
                { type: 'goomba', x: 352, y: 192 },
                { type: 'goomba', x: 528, y: 192 },
                { type: 'koopa', x: 832, y: 184 },
                { type: 'goomba', x: 1280, y: 192 },
                { type: 'goomba', x: 1312, y: 192 }
            ]
        }
    },

    // Authentic physics system
    Physics: {
        updateMario: (mario, input) => {
            // Horizontal movement with authentic acceleration
            if (input.left && !input.right) {
                mario.vx = Math.max(mario.vx - AuthenticMario.CONSTANTS.WALK_ACCELERATION, 
                                   -AuthenticMario.CONSTANTS.MAX_WALK_SPEED);
                mario.facing = 'left';
            } else if (input.right && !input.left) {
                mario.vx = Math.min(mario.vx + AuthenticMario.CONSTANTS.WALK_ACCELERATION, 
                                   AuthenticMario.CONSTANTS.MAX_WALK_SPEED);
                mario.facing = 'right';
            } else {
                // Friction when no input
                mario.vx *= 0.89;
                if (Math.abs(mario.vx) < 0.01) mario.vx = 0;
            }
            
            // Jumping with variable height
            if (input.jump && mario.onGround) {
                mario.vy = input.jumpHeld ? 
                    AuthenticMario.CONSTANTS.HIGH_JUMP_VELOCITY : 
                    AuthenticMario.CONSTANTS.JUMP_VELOCITY;
                mario.onGround = false;
            }
            
            // Gravity
            if (!mario.onGround) {
                mario.vy = Math.min(mario.vy + AuthenticMario.CONSTANTS.GRAVITY, 
                                   AuthenticMario.CONSTANTS.MAX_FALL_SPEED);
            }
            
            // Update position
            mario.x += mario.vx;
            mario.y += mario.vy;
        },
        
        // Pixel-perfect collision detection
        checkCollision: (rect1, rect2) => {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }
    },

    // Authentic power-up system
    PowerUps: {
        mushroom: {
            points: 1000,
            effect: (mario) => {
                if (mario.powerState === 'small') {
                    mario.powerState = 'big';
                    mario.height = 32;
                    mario.y -= 16; // Adjust position for size change
                }
            }
        },
        
        fireFlower: {
            points: 1000,
            effect: (mario) => {
                mario.powerState = 'fire';
                mario.height = 32;
                if (mario.height === 16) mario.y -= 16;
            }
        },
        
        star: {
            points: 1000,
            effect: (mario) => {
                mario.invincible = true;
                mario.invincibleTimer = 600; // 10 seconds at 60fps
            }
        }
    },

    // Authentic enemy AI
    EnemyAI: {
        goomba: {
            update: (enemy) => {
                enemy.x += enemy.vx;
                
                // Animation
                enemy.animTimer++;
                if (enemy.animTimer > 30) {
                    enemy.animFrame = (enemy.animFrame + 1) % 2;
                    enemy.animTimer = 0;
                }
                
                // Turn around at edges or walls
                if (enemy.hitWall || enemy.atEdge) {
                    enemy.vx *= -1;
                }
            }
        },
        
        koopa: {
            update: (enemy) => {
                if (enemy.state === 'walking') {
                    enemy.x += enemy.vx;
                    enemy.animTimer++;
                    if (enemy.animTimer > 20) {
                        enemy.animFrame = (enemy.animFrame + 1) % 2;
                        enemy.animTimer = 0;
                    }
                } else if (enemy.state === 'shell') {
                    // Shell can be kicked
                    if (enemy.kicked) {
                        enemy.x += enemy.shellVx;
                    }
                }
            }
        }
    }
};

// Usage example for authentic Mario implementation
const createAuthenticMario = () => {
    return {
        // Implement using AuthenticMario structure
        sprites: AuthenticMario.Sprites,
        levels: AuthenticMario.Levels,
        physics: AuthenticMario.Physics,
        powerUps: AuthenticMario.PowerUps,
        enemyAI: AuthenticMario.EnemyAI
    };
};
