// Mario Game - Theme system and sprite rendering

// Entity System - Phase 1: Run alongside existing code
class Entity {
    constructor(id = null) {
        this.id = id || Math.random().toString(36).substr(2, 9);
        this.components = new Map();
        this.active = true;
    }
    
    add(name, component) {
        this.components.set(name, component);
        return this;
    }
    
    get(name) {
        return this.components.get(name);
    }
    
    has(name) {
        return this.components.has(name);
    }
}

class Transform {
    constructor(x = 0, y = 0, width = 16, height = 16) {
        this.x = x; this.y = y; this.width = width; this.height = height;
    }
}

class Physics {
    constructor(vx = 0, vy = 0) {
        this.vx = vx; this.vy = vy; this.gravity = 0.5; this.onGround = false;
    }
}

class Sprite {
    constructor(color = '#FF0000', type = null) {
        this.color = color; 
        this.facingRight = true;
        this.type = type;
        this.powerState = 'small';
        this.invincible = false;
        this.state = 'walking';
    }
}

class AI {
    constructor(type = 'patrol') {
        this.type = type; this.direction = -1; this.state = 'active';
    }
}

class Platform {
    constructor(type = 'ground', moving = false) {
        this.type = type;
        this.moving = moving;
        this.vx = 0;
        this.vy = 0;
    }
}

class Block {
    constructor(type = 'brick', content = null) {
        this.type = type;
        this.content = content;
        this.hit = false;
    }
}

class Coin {
    constructor(value = 200) {
        this.value = value;
        this.collected = false;
    }
}

class Interactive {
    constructor(type = 'question', contents = 'coin') {
        this.type = type;
        this.contents = contents;
        this.used = false;
    }
}

class Collectible {
    constructor(type = 'coin', value = 200) {
        this.type = type;
        this.value = value;
        this.collected = false;
    }
}

class Projectile {
    constructor(type = 'fireball', damage = 1) {
        this.type = type;
        this.damage = damage;
        this.bounces = 0;
        this.maxBounces = 8;
        this.bounceCooldown = 0; // Prevent multiple bounces per frame
    }
}

class Particle {
    constructor(type = 'debris', life = 60, vx = 0, vy = 0) {
        this.type = type;
        this.life = life;
        this.maxLife = life;
        this.vx = vx;
        this.vy = vy;
    }
}

class Player {
    constructor() {
        this.lives = 3;
        this.score = 0;
        this.powerState = 'small'; // 'small', 'big', 'fire'
        this.facingRight = true;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.shootCooldown = 0;
    }
}

class Input {
    constructor() {
        this.left = false;
        this.right = false;
        this.jump = false;
        this.shoot = false;
    }
}

class Camera {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
}

class EntityManager {
    constructor() {
        this.entities = new Map();
        this.systems = [];
    }
    
    create(id = null) {
        const entity = new Entity(id);
        this.entities.set(entity.id, entity);
        return entity;
    }
    
    query(...componentNames) {
        return Array.from(this.entities.values()).filter(entity =>
            componentNames.every(name => entity.has(name))
        );
    }
    
    addSystem(system) {
        this.systems.push(system);
    }
    
    update() {
        this.systems.forEach(system => system.update(this));
    }
}

class PhysicsSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const entities = entityManager.query('transform', 'physics');
        
        entities.forEach(entity => {
            const transform = entity.get('transform');
            const physics = entity.get('physics');
            
            // Skip physics for piranha plants (they handle their own movement)
            if (entity.id.startsWith('piranha')) {
                return;
            }
            
            // Skip physics for projectiles (ProjectileSystem handles their collision)
            if (entity.has('projectile')) {
                // Apply gravity and velocity but no collision
                physics.vy += 0.5;
                transform.x += physics.vx;
                transform.y += physics.vy;
                
                // Terminal velocity
                if (physics.vy > 15) physics.vy = 15;
                return;
            }
            
            // Special handling for player entity
            if (entity.id === 'player') {
                // Apply gravity
                physics.vy += 0.5;
                
                // Store previous position for swept collision
                const prevX = transform.x;
                const prevY = transform.y;
                
                // Apply velocity
                transform.x += physics.vx;
                transform.y += physics.vy;
                
                // Handle platform collision for player with swept collision
                physics.onGround = false;
                const platformEntities = entityManager.query('transform', 'platform');
                const allSolids = [];
                
                // Add platform entities to collision check
                platformEntities.forEach(platformEntity => {
                    const platformTransform = platformEntity.get('transform');
                    allSolids.push(platformTransform);
                });
                
                allSolids.forEach(solid => {
                    // Check if moving into collision
                    if (transform.x < solid.x + solid.width &&
                        transform.x + transform.width > solid.x &&
                        transform.y < solid.y + solid.height &&
                        transform.y + transform.height > solid.y) {
                        
                        let verticalCollisionHandled = false;
                        
                        // Check vertical collision first (prioritize when falling)
                        if (physics.vy > 0 && prevY + transform.height <= solid.y) {
                            // Landing on top from above
                            transform.y = solid.y - transform.height;
                            physics.vy = 0;
                            physics.onGround = true;
                            verticalCollisionHandled = true;
                        }
                        else if (physics.vy < 0 && prevY >= solid.y + solid.height) {
                            // Hitting ceiling from below
                            transform.y = solid.y + solid.height;
                            physics.vy = 0;
                            verticalCollisionHandled = true;
                        }
                        
                        // Only handle horizontal collision if no vertical collision occurred
                        if (!verticalCollisionHandled) {
                            if (physics.vx > 0 && prevX + transform.width <= solid.x) {
                                // Hit right side of solid
                                transform.x = solid.x - transform.width;
                            } else if (physics.vx < 0 && prevX >= solid.x + solid.width) {
                                // Hit left side of solid
                                transform.x = solid.x + solid.width;
                            }
                        }
                    }
                });
                
                // Terminal velocity
                if (physics.vy > 15) physics.vy = 15;
                return;
            }
            
            // Apply gravity
            physics.vy += 0.5;
            
            // Apply velocity
            transform.x += physics.vx;
            transform.y += physics.vy;
            
            // Ground collision at y=350 as fallback
            physics.onGround = false;
            
            // Platform and block collision
            const platformEntities = entityManager.query('transform', 'platform');
            const blockEntities = entityManager.query('transform', 'block');
            const allSolids = [];
            
            // Add platform entities to collision check
            platformEntities.forEach(platformEntity => {
                const platformTransform = platformEntity.get('transform');
                allSolids.push(platformTransform);
            });
            
            // Add block entities to collision check
            blockEntities.forEach(blockEntity => {
                const blockTransform = blockEntity.get('transform');
                allSolids.push(blockTransform);
            });
            
            allSolids.forEach(solid => {
                if (transform.x < solid.x + solid.width &&
                    transform.x + transform.width > solid.x &&
                    transform.y < solid.y + solid.height &&
                    transform.y + transform.height > solid.y) {
                    
                    // Calculate overlap amounts
                    const overlapLeft = (transform.x + transform.width) - solid.x;
                    const overlapRight = (solid.x + solid.width) - transform.x;
                    const overlapTop = (transform.y + transform.height) - solid.y;
                    const overlapBottom = (solid.y + solid.height) - transform.y;
                    
                    // Find smallest overlap to determine collision direction
                    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                    
                    if (minOverlap === overlapTop && physics.vy >= 0) {
                        // Landing on top
                        transform.y = solid.y - transform.height;
                        physics.vy = 0;
                        physics.onGround = true;
                    } else if (minOverlap === overlapBottom && physics.vy < 0) {
                        // Hitting from below
                        transform.y = solid.y + solid.height;
                        physics.vy = 0;
                    } else if (minOverlap === overlapLeft && physics.vx > 0) {
                        // Hit right side of solid
                        transform.x = solid.x - transform.width;
                        physics.vx *= -1;
                        // Update AI direction for entities with AI
                        const ai = entity.get('ai');
                        if (ai) ai.direction = physics.vx;
                    } else if (minOverlap === overlapRight && physics.vx < 0) {
                        // Hit left side of solid
                        transform.x = solid.x + solid.width;
                        physics.vx *= -1;
                        // Update AI direction for entities with AI
                        const ai = entity.get('ai');
                        if (ai) ai.direction = physics.vx;
                    }
                }
            });
            
            // Remove fallback ground collision - let entities fall into pits
            
            // Screen boundaries
            if (transform.x <= 0 && physics.vx < 0) {
                physics.vx *= -1;
            }
            if (transform.x >= 3200 - transform.width && physics.vx > 0) {
                physics.vx *= -1;
            }
            
            // Terminal velocity
            if (physics.vy > 15) physics.vy = 15;
        });
    }
}

class AISystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const entities = entityManager.query('transform', 'ai');
        
        entities.forEach(entity => {
            const transform = entity.get('transform');
            const physics = entity.get('physics'); // May be null for parakoopas
            const ai = entity.get('ai');
            
            if (ai.type === 'flying') {
                // Parakoopa flying behavior - simple vertical oscillation
                if (!ai.topY) ai.topY = transform.y; // Starting position is top of flight
                if (!ai.flyDirection) ai.flyDirection = 1; // Start flying down
                if (!ai.flySpeed) ai.flySpeed = 1;
                
                // Move vertically only
                transform.y += ai.flyDirection * ai.flySpeed;
                
                // Check flight limits (120 pixels total range)
                const distanceFromTop = transform.y - ai.topY;
                
                if (ai.flyDirection === 1 && distanceFromTop >= 120) {
                    // Flying down and reached bottom limit, start flying up
                    ai.flyDirection = -1;
                } else if (ai.flyDirection === -1 && distanceFromTop <= 0) {
                    // Flying up and reached top limit, start flying down
                    ai.flyDirection = 1;
                }
                
                // No physics needed - direct position control
            } else if (ai.type === 'piranha') {
                // Piranha plant behavior - hide when Mario is nearby
                if (!ai.timer) ai.timer = 0;
                if (!ai.piranhaState) ai.piranhaState = 'hidden';
                if (!ai.baseY) ai.baseY = transform.y; // Store original pipe position
                if (!ai.hiddenY) ai.hiddenY = ai.baseY + 32; // Hidden position (in pipe)
                
                // Check if Mario is too close (within 48 pixels)
                const playerEntity = entityManager.entities.get('player');
                let tooClose = false;
                if (playerEntity) {
                    const playerTransform = playerEntity.get('transform');
                    const distance = Math.abs(playerTransform.x - transform.x);
                    tooClose = distance < 48;
                }
                
                ai.timer++;
                
                // Piranha behavior with Mario proximity check
                if (ai.piranhaState === 'hidden' && ai.timer > 60 && !tooClose) {
                    ai.piranhaState = 'emerging';
                    ai.timer = 0;
                } else if (ai.piranhaState === 'emerging') {
                    // Move up from pipe
                    transform.y = ai.hiddenY - (ai.timer * 1); // Emerge slowly
                    if (transform.y <= ai.baseY || ai.timer > 32) {
                        transform.y = ai.baseY;
                        ai.piranhaState = 'visible';
                        ai.timer = 0;
                    }
                } else if (ai.piranhaState === 'visible' && (ai.timer > 180 || tooClose)) {
                    ai.piranhaState = 'retreating';
                    ai.timer = 0;
                } else if (ai.piranhaState === 'retreating') {
                    // Move down into pipe
                    transform.y = ai.baseY + (ai.timer * 1); // Retreat slowly
                    if (transform.y >= ai.hiddenY || ai.timer > 32) {
                        transform.y = ai.hiddenY;
                        ai.piranhaState = 'hidden';
                        ai.timer = 0;
                    }
                }
                
                // Update sprite state
                entity.get('sprite').state = ai.piranhaState;
                return; // Skip normal AI processing
            }
            
            // Normal enemy AI (goombas, koopas, etc.) - only for entities with physics
            if (!physics) return; // Skip if no physics component
            
            // Ensure entity always has movement velocity
            if (physics.vx === 0) {
                physics.vx = ai.direction;
            }
            
            // Check for pits ahead (only for patrolling enemies on ground, not falling or shells)
            const sprite = entity.get('sprite');
            const isShell = sprite && (sprite.state === 'shell' || sprite.state === 'shellMoving');
            
            if (physics.onGround && !isShell) {
                const checkX = transform.x + (ai.direction > 0 ? transform.width + 5 : -5);
                const checkY = transform.y + transform.height + 10; // Look below feet
                
                let foundGround = false;
                // Check platform entities for ground ahead
                const platformEntities = entityManager.query('transform', 'platform');
                platformEntities.forEach(platformEntity => {
                    const platformTransform = platformEntity.get('transform');
                    if (checkX >= platformTransform.x && checkX <= platformTransform.x + platformTransform.width &&
                        checkY >= platformTransform.y && checkY <= platformTransform.y + platformTransform.height) {
                        foundGround = true;
                    }
                });
                
                // Turn around if no ground ahead (pit detection for patrolling enemies)
                if (!foundGround) {
                    ai.direction *= -1;
                    physics.vx = ai.direction;
                }
            }
            
            // Check boundaries and reverse direction if needed
            if (transform.x <= 0 && ai.direction < 0) {
                ai.direction = 1;
                physics.vx = 1;
            } else if (transform.x >= 3200 - transform.width && ai.direction > 0) {
                ai.direction = -1;
                physics.vx = -1;
            }
            
            // Ensure velocity matches direction
            physics.vx = ai.direction;
        });
    }
}

class InteractiveSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const playerEntity = entityManager.entities.get('player');
        if (!playerEntity) return;
        
        const playerTransform = playerEntity.get('transform');
        const playerPhysics = playerEntity.get('physics');
        const playerComp = playerEntity.get('player');
        
        // Handle all player-block collisions (both interactive and solid)
        const blockEntities = entityManager.query('transform', 'block');
        blockEntities.forEach(blockEntity => {
            const blockTransform = blockEntity.get('transform');
            const blockComp = blockEntity.get('block');
            
            if (playerTransform.x < blockTransform.x + blockTransform.width &&
                playerTransform.x + playerTransform.width > blockTransform.x &&
                playerTransform.y < blockTransform.y + blockTransform.height &&
                playerTransform.y + playerTransform.height > blockTransform.y) {
                
                // Landing on top
                if (playerPhysics.vy > 0 && playerTransform.y < blockTransform.y) {
                    playerTransform.y = blockTransform.y - playerTransform.height;
                    playerPhysics.vy = 0;
                    playerPhysics.onGround = true;
                }
                // Hitting from below
                else if (playerPhysics.vy < 0 && playerTransform.y > blockTransform.y) {
                    playerTransform.y = blockTransform.y + blockTransform.height;
                    playerPhysics.vy = 0;
                    
                    // Only trigger interaction if block is question type and not hit
                    if (blockComp.type === 'question' && !blockComp.hit) {
                        this.handleBlockHit(blockEntity, playerComp, entityManager);
                    }
                    // Handle brick destruction for big Mario
                    else if (blockComp.type === 'brick' && playerComp.powerState !== 'small') {
                        // Add brick destruction particles
                        const blockTransform = blockEntity.get('transform');
                        for (let i = 0; i < 4; i++) {
                            const particle = entityManager.create();
                            particle.add('transform', new Transform(
                                blockTransform.x + (i % 2) * blockTransform.width/2,
                                blockTransform.y + Math.floor(i / 2) * blockTransform.height/2,
                                8, 8
                            ));
                            particle.add('particle', new Particle(
                                'debris',
                                60,
                                (i % 2 === 0 ? -1 : 1) * (2 + Math.random()),
                                -3 - Math.random() * 2
                            ));
                        }
                        
                        // Remove brick block
                        entityManager.entities.delete(blockEntity.id);
                        playerComp.score += 50;
                    }
                }
                // Side collision
                else if (playerPhysics.vx > 0) {
                    playerTransform.x = blockTransform.x - playerTransform.width;
                } else if (playerPhysics.vx < 0) {
                    playerTransform.x = blockTransform.x + blockTransform.width;
                }
            }
        });
    }
    
    handleBlockHit(blockEntity, playerComp, entityManager) {
        const blockComp = blockEntity.get('block');
        const blockTransform = blockEntity.get('transform');
        
        if (blockComp.hit) return;
        blockComp.hit = true;
        
        if (blockComp.type === 'question' && blockComp.content) {
            if (blockComp.content === 'coin') {
                playerComp.score += 200;
                
                // Add coin animation above the block
                const particle = entityManager.create();
                particle.add('transform', new Transform(
                    blockTransform.x + blockTransform.width/2 - 8,
                    blockTransform.y - 16,
                    16, 16
                ));
                particle.add('particle', new Particle('coin', 30, 0, -2));
            } else {
                // Determine power-up type based on Mario's current state
                let powerUpType = blockComp.content;
                if (blockComp.content === 'fireflower' && playerComp.powerState === 'small') {
                    powerUpType = 'mushroom'; // Small Mario gets mushroom instead of fire flower
                }
                
                // Create power-up entity instead of adding to array
                const powerUpEntity = this.game.entityManager.create(`powerup_${Date.now()}`)
                    .add('transform', new Transform(blockTransform.x, blockTransform.y - 32, 32, 32))
                    .add('physics', new Physics(powerUpType === 'fireflower' ? 0 : 1, 0))
                    .add('sprite', new Sprite('#FF0000', powerUpType));
            }
            blockComp.content = null;
        }
    }
}

class PowerUpSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const playerEntity = entityManager.entities.get('player');
        if (!playerEntity) return;
        
        const playerTransform = playerEntity.get('transform');
        const playerComp = playerEntity.get('player');
        
        const powerUps = entityManager.query('transform', 'physics', 'sprite');
        
        powerUps.forEach(entity => {
            const sprite = entity.get('sprite');
            if (!sprite.type || !['mushroom', 'fireflower', 'star'].includes(sprite.type)) return;
            
            const transform = entity.get('transform');
            
            // Check collision with player
            if (playerTransform.x < transform.x + transform.width &&
                playerTransform.x + playerTransform.width > transform.x &&
                playerTransform.y < transform.y + transform.height &&
                playerTransform.y + playerTransform.height > transform.y) {
                
                // Power up Mario
                if (sprite.type === 'mushroom') {
                    if (playerComp.powerState === 'small') {
                        playerComp.powerState = 'big';
                        playerTransform.width = 16;
                        playerTransform.height = 32;
                        playerTransform.y -= 16;
                    }
                } else if (sprite.type === 'fireflower') {
                    playerComp.powerState = 'fire';
                    playerTransform.width = 16;
                    playerTransform.height = 32;
                    if (playerTransform.height === 16) playerTransform.y -= 16;
                }
                
                playerComp.score += 1000;
                entityManager.entities.delete(entity.id);
            }
        });
    }
}

class CollectibleSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const playerEntity = entityManager.entities.get('player');
        if (!playerEntity) return;
        
        const playerTransform = playerEntity.get('transform');
        const playerComp = playerEntity.get('player');
        
        const collectibles = entityManager.query('transform', 'collectible');
        
        collectibles.forEach(entity => {
            const transform = entity.get('transform');
            const collectible = entity.get('collectible');
            
            if (collectible.collected) return;
            
            // Check collision with player
            if (playerTransform.x < transform.x + transform.width &&
                playerTransform.x + playerTransform.width > transform.x &&
                playerTransform.y < transform.y + transform.height &&
                playerTransform.y + playerTransform.height > transform.y) {
                
                collectible.collected = true;
                playerComp.score += collectible.value;
                entityManager.entities.delete(entity.id);
            }
        });
    }
}

class ProjectileSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const playerEntity = entityManager.entities.get('player');
        const projectiles = entityManager.query('transform', 'physics', 'projectile');
        
        projectiles.forEach(entity => {
            const transform = entity.get('transform');
            const physics = entity.get('physics');
            const projectile = entity.get('projectile');
            
            // Update bounce cooldown
            if (projectile.bounceCooldown > 0) {
                projectile.bounceCooldown--;
            }
            
            // Remove if too many bounces
            if (projectile.bounces >= projectile.maxBounces) {
                entityManager.entities.delete(entity.id);
                return;
            }
            
            // Check collision with platforms and blocks for bouncing
            if (projectile.bounceCooldown === 0) {
                const platformEntities = entityManager.query('transform', 'platform');
                const blockEntities = entityManager.query('transform', 'block');
                const allSolids = [];
                
                // Add platform entities to collision check
                platformEntities.forEach(platformEntity => {
                    const platformTransform = platformEntity.get('transform');
                    allSolids.push(platformTransform);
                });
                
                // Add block entities to collision check
                blockEntities.forEach(blockEntity => {
                    const blockTransform = blockEntity.get('transform');
                    allSolids.push(blockTransform);
                });
                
                let bounced = false;
                
                for (const solid of allSolids) {
                    if (transform.x < solid.x + solid.width &&
                        transform.x + transform.width > solid.x &&
                        transform.y < solid.y + solid.height &&
                        transform.y + transform.height > solid.y) {
                        
                        // Simple ground bounce check - if moving down and hitting top of platform
                        if (physics.vy > 0 && transform.y < solid.y) {
                            transform.y = solid.y - transform.height;
                            physics.vy = -4;
                            projectile.bounces++;
                            projectile.bounceCooldown = 10; // Longer cooldown
                            bounced = true;
                            break; // Only bounce once per frame
                        }
                        // Wall collision - delete fireball
                        else if (physics.vx > 0 && transform.x < solid.x) {
                            entityManager.entities.delete(entity.id);
                            return;
                        }
                        else if (physics.vx < 0 && transform.x > solid.x) {
                            entityManager.entities.delete(entity.id);
                            return;
                        }
                    }
                }
            }
            
            // Check collision with enemies
            const enemies = entityManager.query('transform', 'ai');
            enemies.forEach(enemy => {
                const enemyTransform = enemy.get('transform');
                if (transform.x < enemyTransform.x + enemyTransform.width &&
                    transform.x + transform.width > enemyTransform.x &&
                    transform.y < enemyTransform.y + enemyTransform.height &&
                    transform.y + transform.height > enemyTransform.y) {
                    
                    // Hit enemy - remove both and award score
                    entityManager.entities.delete(enemy.id);
                    entityManager.entities.delete(entity.id);
                    
                    // Award score to player entity
                    if (playerEntity) {
                        const playerComp = playerEntity.get('player');
                        playerComp.score += 100;
                    }
                }
            });
            
            // Remove if off screen (increased bounds)
            if (transform.x < -100 || transform.x > 3500 || transform.y > 600) {
                entityManager.entities.delete(entity.id);
            }
        });
    }
}

class PlayerInputSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const player = entityManager.entities.get('player');
        if (!player) return;
        
        const transform = player.get('transform');
        const physics = player.get('physics');
        const playerComp = player.get('player');
        const input = player.get('input');
        
        // Update input state
        input.left = this.game.keys['ArrowLeft'] || this.game.keys['KeyA'];
        input.right = this.game.keys['ArrowRight'] || this.game.keys['KeyD'];
        input.jump = this.game.keys['ArrowUp'] || this.game.keys['KeyW'] || this.game.keys['Space'];
        input.shoot = this.game.keys['KeyX'] || this.game.keys['KeyZ'];
        
        // Handle movement
        if (input.left) {
            physics.vx = Math.max(physics.vx - 0.5, -5);
            playerComp.facingRight = false;
        } else if (input.right) {
            physics.vx = Math.min(physics.vx + 0.5, 5);
            playerComp.facingRight = true;
        } else {
            physics.vx *= 0.8;
        }
        
        // Handle jumping
        if (input.jump && physics.onGround) {
            physics.vy = -12;
            physics.onGround = false;
        }
        
        // Handle shooting
        if (input.shoot && playerComp.powerState === 'fire' && !playerComp.shootCooldown) {
            const fireballEntity = entityManager.create(`fireball_${Date.now()}`)
                .add('transform', new Transform(
                    transform.x + (playerComp.facingRight ? transform.width : -10),
                    transform.y + 10,
                    8, 8
                ))
                .add('physics', new Physics(
                    playerComp.facingRight ? 3 : -3,
                    -1
                ))
                .add('sprite', new Sprite('#FF4500', 'fireball'))
                .add('projectile', new Projectile('fireball', 1));
            
            playerComp.shootCooldown = 15;
        }
        
        // Update timers
        if (playerComp.shootCooldown > 0) playerComp.shootCooldown--;
        if (playerComp.invincible) {
            playerComp.invincibleTimer--;
            if (playerComp.invincibleTimer <= 0) {
                playerComp.invincible = false;
            }
        }
        
        // Update camera
        this.game.camera.x = Math.max(0, transform.x - 300);
    }
}

class CollisionSystem {
    constructor(game, resetLevel) {
        this.game = game;
        this.resetLevel = resetLevel;
    }
    
    update(entityManager) {
        const playerEntity = entityManager.entities.get('player');
        if (!playerEntity) return;
        
        const playerTransform = playerEntity.get('transform');
        const playerPhysics = playerEntity.get('physics');
        const playerComp = playerEntity.get('player');
        
        const goombaEntities = entityManager.query('transform', 'ai');
        
        goombaEntities.forEach(entity => {
            const transform = entity.get('transform');
            
            // Check collision with player (both in world coordinates)
            if (!playerComp.invincible &&
                playerTransform.x < transform.x + transform.width &&
                playerTransform.x + playerTransform.width > transform.x &&
                playerTransform.y < transform.y + transform.height &&
                playerTransform.y + playerTransform.height > transform.y) {
                
                if (playerPhysics.vy > 0 && playerTransform.y < transform.y) {
                    // Stomp goomba
                    entityManager.entities.delete(entity.id);
                    playerPhysics.vy = -8;
                    playerComp.score += 100;
                } else {
                    // Take damage
                    if (playerComp.powerState === 'big' || playerComp.powerState === 'fire') {
                        playerComp.powerState = 'small';
                        playerTransform.width = 16;
                        playerTransform.height = 16;
                        playerTransform.y += 16;
                    } else {
                        playerComp.lives--;
                        if (playerComp.lives <= 0) {
                            this.game.gameOver = true;
                        } else {
                            this.resetLevel();
                        }
                    }
                    playerComp.invincible = true;
                    playerComp.invincibleTimer = 120;
                }
            }
        });
    }
}

class PlayerSyncSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const playerEntity = entityManager.entities.get('player');
        if (playerEntity && this.game.player) {
            const transform = playerEntity.get('transform');
            const physics = playerEntity.get('physics');
            const playerComp = playerEntity.get('player');
            
            // Sync FROM entity TO game.player (reverse direction)
            this.game.player.x = transform.x;
            this.game.player.y = transform.y;
            this.game.player.width = transform.width;
            this.game.player.height = transform.height;
            this.game.player.vx = physics.vx;
            this.game.player.vy = physics.vy;
            this.game.player.onGround = physics.onGround;
            this.game.player.powerState = playerComp.powerState;
            this.game.player.facingRight = playerComp.facingRight;
            this.game.player.invincible = playerComp.invincible;
            this.game.player.invincibleTimer = playerComp.invincibleTimer;
            this.game.player.lives = playerComp.lives;
            this.game.player.score = playerComp.score;
        }
    }
}

class SquishSystem {
    update(entityManager) {
        const squished = entityManager.query('transform', 'sprite').filter(entity => 
            entity.get('sprite').state === 'squished'
        );
        
        squished.forEach(entity => {
            const sprite = entity.get('sprite');
            sprite.squishTimer--;
            
            if (sprite.squishTimer <= 0) {
                entityManager.entities.delete(entity.id);
            }
        });
    }
}

class PlatformMigrationSystem {
    constructor(game) {
        this.game = game;
        this.migrated = false;
        this.lastPlatformCount = 0;
    }
    
    update(entityManager) {
        // Check if we need to re-migrate (more reliable detection)
        const existingPlatformEntities = entityManager.query('transform', 'platform');
        const shouldHavePlatforms = this.game.platforms.length > 0;
        
        if (shouldHavePlatforms && existingPlatformEntities.length === 0) {
            // Platforms exist in array but no entities - level was reloaded
            this.migrated = false;
        }
        
        // Check if platforms array has changed (backup detection)
        if (this.game.platforms.length !== this.lastPlatformCount) {
            this.migrated = false;
            
            // Clear existing platform entities
            existingPlatformEntities.forEach(entity => {
                entityManager.entities.delete(entity.id);
            });
        }
        
        // Only migrate once per level
        if (!this.migrated) {
            // Create platform entities from existing platforms array
            this.game.platforms.forEach((platform, index) => {
                const isMoving = platform.moving || platform.type === 'horizontal_moving' || platform.type === 'vertical_moving' || platform.type === 'moving_up' || platform.type === 'moving_down';
                
                const platformEntity = entityManager.create(`platform_${index}`)
                    .add('transform', new Transform(platform.x, platform.y, platform.width, platform.height))
                    .add('platform', new Platform(platform.type, isMoving));
                
                // Copy movement properties if they exist
                if (isMoving) {
                    const platformComp = platformEntity.get('platform');
                    platformComp.vx = platform.vx || 0;
                    platformComp.vy = platform.vy || 0;
                    
                    // Initialize movement for horizontal platforms if not set
                    if (platform.type === 'horizontal_moving' && platformComp.vx === 0) {
                        platformComp.vx = 1;
                    }
                    // Initialize movement for vertical platforms if not set  
                    if (platform.type === 'vertical_moving' && platformComp.vy === 0) {
                        platformComp.vy = -1;
                    }
                }
            });
            
            this.migrated = true;
            this.lastPlatformCount = this.game.platforms.length;
        }
        
        // Sync platform entities back to array (only for collision detection now)
        const platformEntities = entityManager.query('transform', 'platform');
        platformEntities.forEach((entity, index) => {
            if (index < this.game.platforms.length) {
                const transform = entity.get('transform');
                const platform = entity.get('platform');
                
                // Only sync moving platforms back to array for collision detection
                if (platform.moving) {
                    this.game.platforms[index].x = transform.x;
                    this.game.platforms[index].y = transform.y;
                }
            }
        });
    }
}

class PlatformMovementSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const movingPlatforms = entityManager.query('transform', 'platform').filter(entity => 
            entity.get('platform').moving
        );
        
        movingPlatforms.forEach(entity => {
            const transform = entity.get('transform');
            const platform = entity.get('platform');
            
            // Move platform based on type
            if (platform.type === 'moving_up' || platform.type === 'moving_down') {
                transform.y += platform.vy;
                
                if (transform.y <= -50) {
                    transform.y = 400;
                } else if (transform.y >= 400) {
                    transform.y = -50;
                }
            } else if (platform.type === 'vertical_moving') {
                transform.y += platform.vy;
                
                if (transform.y <= 50 || transform.y >= 300) {
                    platform.vy *= -1;
                }
            } else if (platform.type === 'horizontal_moving') {
                transform.x += platform.vx;
                
                // Use the original platform's leftX and rightX bounds if available
                const originalPlatform = this.game.platforms[parseInt(entity.id.split('_')[1])];
                if (originalPlatform && originalPlatform.leftX !== undefined && originalPlatform.rightX !== undefined) {
                    if (transform.x <= originalPlatform.leftX || transform.x >= originalPlatform.rightX) {
                        platform.vx *= -1;
                    }
                } else {
                    // Fallback to screen bounds
                    if (transform.x <= 0 || transform.x >= 3200) {
                        platform.vx *= -1;
                    }
                }
            }
        });
    }
}

class BlockMigrationSystem {
    constructor(game) {
        this.game = game;
        this.migrated = false;
        this.lastBlockCount = 0;
    }
    
    update(entityManager) {
        // Check if we need to re-migrate (more reliable detection)
        const existingBlockEntities = entityManager.query('transform', 'block');
        const shouldHaveBlocks = this.game.blocks.length > 0;
        
        if (shouldHaveBlocks && existingBlockEntities.length === 0) {
            // Blocks exist in array but no entities - level was reloaded
            this.migrated = false;
        }
        
        // Check if blocks array has changed (backup detection)
        if (this.game.blocks.length !== this.lastBlockCount) {
            this.migrated = false;
            
            // Clear existing block entities
            existingBlockEntities.forEach(entity => {
                entityManager.entities.delete(entity.id);
            });
        }
        
        // Only migrate once per level
        if (!this.migrated) {
            // Create block entities from existing blocks array
            this.game.blocks.forEach((block, index) => {
                const blockEntity = entityManager.create(`block_${index}`)
                    .add('transform', new Transform(block.x, block.y, block.width, block.height))
                    .add('block', new Block(block.type, block.content));
                
                // Copy hit state if it exists
                if (block.hit !== undefined) {
                    blockEntity.get('block').hit = block.hit;
                }
            });
            
            this.migrated = true;
            this.lastBlockCount = this.game.blocks.length;
        }
        
        // Sync block entities with array (both ways for collision detection)
        const blockEntities = entityManager.query('transform', 'block');
        blockEntities.forEach((entity, index) => {
            if (index < this.game.blocks.length) {
                const block = entity.get('block');
                
                // Sync FROM entity TO array (for state changes like hit)
                this.game.blocks[index].hit = block.hit;
                this.game.blocks[index].content = block.content;
            }
        });
    }
}

class ImprovedCollisionSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const playerEntity = entityManager.entities.get('player');
        if (!playerEntity) return;
        
        const playerTransform = playerEntity.get('transform');
        const playerPhysics = playerEntity.get('physics');
        
        const enemies = entityManager.query('transform', 'ai');
        let playerBounced = false;
        
        enemies.forEach(enemy => {
            const enemyTransform = enemy.get('transform');
            const enemySprite = enemy.get('sprite');
            
            if (this.isColliding(playerTransform, enemyTransform)) {
                // Check if player is stomping (falling and intersecting from above)
                const playerCenterY = playerTransform.y + playerTransform.height / 2;
                const enemyCenterY = enemyTransform.y + enemyTransform.height / 2;
                const isFromAbove = playerCenterY < enemyCenterY;
                
                if (playerPhysics.vy > 0 && isFromAbove) {
                    // Stomp behavior based on enemy type
                    if (enemy.id.startsWith('goomba')) {
                        // Goomba: Squish flat then disappear
                        enemyTransform.height = 8; // Squish flat
                        enemy.components.delete('ai'); // Stop moving
                        enemy.components.delete('physics'); // Stop physics
                        enemySprite.state = 'squished';
                        enemySprite.squishTimer = 30; // Disappear after 30 frames
                    } else if (enemy.id.startsWith('koopa')) {
                        // Koopa: Turn into shell
                        enemyTransform.height = 16; // Shell height
                        enemyTransform.y += 8; // Move down to ground
                        enemy.components.delete('ai'); // Remove AI
                        enemy.components.delete('physics'); // Remove physics
                        enemySprite.state = 'shell';
                        enemySprite.kickable = true;
                    } else if (enemy.id.startsWith('parakoopa')) {
                        // Parakoopa: Convert to regular koopa when stomped
                        const ai = enemy.get('ai');
                        ai.type = 'patrol'; // Change to regular koopa AI
                        // Add physics component for walking behavior
                        const newPhysics = new Physics(-1, 0);
                        newPhysics.onGround = false; // Allow it to fall initially
                        enemy.add('physics', newPhysics);
                        enemySprite.state = 'walking';
                        // Remove flying properties
                        delete ai.topY;
                        delete ai.flyDirection;
                        delete ai.flySpeed;
                    } else if (enemy.id.startsWith('piranha')) {
                        // Piranha plants can't be stomped - damage player instead
                        if (this.game.player.powerState === 'big' || this.game.player.powerState === 'fire') {
                            this.game.player.powerState = 'small';
                            this.game.player.width = 16;
                            this.game.player.height = 16;
                            this.game.player.y += 16;
                        } else {
                            this.game.player.lives--;
                            if (this.game.player.lives <= 0) {
                                this.game.gameOver = true;
                            }
                        }
                        this.game.player.invincible = true;
                        this.game.player.invincibleTimer = 120;
                        return; // Skip player bounce
                    } else {
                        // Other enemies: Remove
                        entityManager.entities.delete(enemy.id);
                    }
                    
                    // Player bounce (only once per frame)
                    if (!playerBounced) {
                        playerPhysics.vy = -8;
                        this.game.player.vy = -8;
                        playerBounced = true;
                    }
                    this.game.player.score += 100;
                    
                    // Brief invincibility after stomping to prevent immediate damage
                    this.game.player.invincible = true;
                    this.game.player.invincibleTimer = 10;
                } else {
                    // Side collision - damage player (only if not invincible)
                    if (!this.game.player.invincible) {
                        if (this.game.player.powerState === 'big' || this.game.player.powerState === 'fire') {
                            this.game.player.powerState = 'small';
                            this.game.player.width = 16;
                            this.game.player.height = 16;
                            this.game.player.y += 16;
                        } else {
                            this.game.player.lives--;
                            if (this.game.player.lives <= 0) {
                                this.game.gameOver = true;
                            }
                        }
                        this.game.player.invincible = true;
                        this.game.player.invincibleTimer = 120;
                    }
                }
            }
        });
        
        // Handle shell kicking
        const shells = entityManager.query('transform', 'sprite').filter(entity => 
            entity.get('sprite').state === 'shell' && entity.get('sprite').kickable
        );
        
        shells.forEach(shell => {
            const shellTransform = shell.get('transform');
            const shellSprite = shell.get('sprite');
            
            if (this.isColliding(playerTransform, shellTransform)) {
                // Kick shell
                const kickDirection = playerTransform.x < shellTransform.x ? 1 : -1;
                shell.add('physics', new Physics(kickDirection * 4, 0)); // Slower shell movement
                shellSprite.kickable = false; // Can't kick again until it stops
            }
        });
        
        // Handle moving shell collisions with enemies
        const movingShells = entityManager.query('transform', 'physics', 'sprite').filter(entity => 
            entity.get('sprite').state === 'shell' && !entity.get('sprite').kickable
        );
        
        movingShells.forEach(shell => {
            const shellTransform = shell.get('transform');
            const shellPhysics = shell.get('physics');
            
            // Check collision with other enemies
            enemies.forEach(enemy => {
                if (enemy.id !== shell.id) {
                    const enemyTransform = enemy.get('transform');
                    
                    if (this.isColliding(shellTransform, enemyTransform)) {
                        // Shell kills enemy
                        if (enemy.id.startsWith('goomba')) {
                            entityManager.entities.delete(enemy.id);
                        } else if (enemy.id.startsWith('koopa')) {
                            entityManager.entities.delete(enemy.id);
                        } else {
                            entityManager.entities.delete(enemy.id);
                        }
                        this.game.player.score += 100;
                    }
                }
            });
            
            // Stop shell if it hits a wall
            if (Math.abs(shellPhysics.vx) > 0) {
                // Shell will be stopped by wall collision in PhysicsSystem
                // When it stops, make it kickable again
                if (shellPhysics.vx === 0) {
                    shell.get('sprite').kickable = true;
                }
            }
        });
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
}

class ImprovedRenderSystem {
    constructor(spriteRenderer) {
        this.lastLogTime = 0;
        this.spriteRenderer = spriteRenderer;
    }
    
    render(ctx, entityManager, camera) {
        const entities = entityManager.query('transform', 'sprite');
        
        // Throttled debug logging once per second
        const now = Date.now();
        if (now - this.lastLogTime >= 1000) {
            entities.forEach(entity => {
                const transform = entity.get('transform');
                const screenX = transform.x - camera.x;
            });
            this.lastLogTime = now;
        }
        
        entities.forEach(entity => {
            const transform = entity.get('transform');
            const sprite = entity.get('sprite');
            
            // Convert world coordinates to screen coordinates
            const screenX = transform.x - camera.x;
            const screenY = transform.y - camera.y;
            
            // Create fake object for sprite renderer
            const fakeObject = {
                x: screenX,
                y: screenY,
                width: transform.width,
                height: transform.height,
                alive: true,
                facingRight: sprite.facingRight !== false
            };
            
            // Use proper sprite rendering based on entity type
            if (entity.id === 'player') {
                // Render Mario using player sprite system
                fakeObject.powerState = sprite.powerState || 'small';
                fakeObject.invincible = sprite.invincible || false;
                this.spriteRenderer.player.mario(ctx, fakeObject);
            } else if (entity.id.startsWith('goomba')) {
                // Render goomba using enemy sprite system
                fakeObject.type = 'goomba';
                fakeObject.state = sprite.state || 'walking';
                this.spriteRenderer.enemies.goomba(ctx, fakeObject);
            } else if (entity.id.startsWith('koopa') || (entity.id.startsWith('parakoopa') && entity.get('ai')?.type === 'patrol')) {
                // Render koopa (including converted parakoopas)
                fakeObject.type = 'koopa';
                fakeObject.state = sprite.state || 'walking';
                this.spriteRenderer.enemies.koopa(ctx, fakeObject);
            } else if (entity.id.startsWith('parakoopa')) {
                // Render parakoopa (still flying)
                fakeObject.type = 'parakoopa';
                fakeObject.state = sprite.state || 'flying';
                this.spriteRenderer.enemies.parakoopa(ctx, fakeObject);
                fakeObject.type = 'koopa';
                fakeObject.state = sprite.state || 'walking';
                this.spriteRenderer.enemies.koopa(ctx, fakeObject);
            } else if (entity.id.startsWith('piranha')) {
                // Piranha plants are rendered separately behind pipes - skip here
            } else if (sprite.state === 'shell') {
                // Render shell (for stomped koopas)
                fakeObject.type = 'koopa';
                fakeObject.state = 'shell';
                this.spriteRenderer.enemies.koopa(ctx, fakeObject);
            } else if (entity.id.startsWith('powerup')) {
                // Render power-up
                this.renderPowerUp(ctx, { x: screenX, y: screenY, width: transform.width, height: transform.height, type: sprite.type });
            } else if (entity.id.startsWith('coin')) {
                // Render coin
                this.renderCoin(ctx, { x: screenX, y: screenY, width: transform.width, height: transform.height });
            } else if (entity.id.startsWith('fireball')) {
                // Render fireball
                this.renderFireball(ctx, { x: screenX, y: screenY, width: transform.width, height: transform.height });
            } else {
                // Fallback to colored rectangle for unknown entities
                ctx.fillStyle = sprite.color || '#FF0000';
                ctx.fillRect(screenX, screenY, transform.width, transform.height);
            }
        });
    }
    
    renderFireball(ctx, fireball) {
        // Orange fireball with yellow center (same as original)
        ctx.fillStyle = '#FF4500';
        ctx.fillRect(fireball.x, fireball.y, fireball.width, fireball.height);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(fireball.x + 1, fireball.y + 1, fireball.width - 2, fireball.height - 2);
    }
    
    renderCoin(ctx, coin) {
        // Draw oval-shaped yellow coin (same as original)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(coin.x + 6, coin.y + 4, 8, 12); // Taller oval shape
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(coin.x + 8, coin.y + 6, 4, 8); // Taller inner oval
    }
    
    renderPowerUp(ctx, powerUp) {
        if (powerUp.type === 'mushroom') {
            // Super Mushroom - red with white spots
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(powerUp.x + 3, powerUp.y + 12, 18, 12);
            ctx.fillRect(powerUp.x + 6, powerUp.y + 9, 12, 3);
            
            ctx.fillStyle = '#FFF';
            ctx.fillRect(powerUp.x + 7, powerUp.y + 14, 3, 3);
            ctx.fillRect(powerUp.x + 14, powerUp.y + 14, 3, 3);
            ctx.fillRect(powerUp.x + 10, powerUp.y + 18, 3, 3);
            
            ctx.fillStyle = '#FFDBAC';
            ctx.fillRect(powerUp.x + 10, powerUp.y + 24, 4, 8);
            
            ctx.fillStyle = '#DEB887';
            ctx.fillRect(powerUp.x + 11, powerUp.y + 25, 2, 6);
            
        } else if (powerUp.type === 'fireflower') {
            // Fire Flower
            ctx.fillStyle = '#00AA00';
            ctx.fillRect(powerUp.x + 11, powerUp.y + 16, 2, 12);
            ctx.fillRect(powerUp.x + 7, powerUp.y + 18, 4, 2);
            ctx.fillRect(powerUp.x + 13, powerUp.y + 18, 4, 2);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(powerUp.x + 4, powerUp.y + 10, 16, 6);
            ctx.fillRect(powerUp.x + 6, powerUp.y + 8, 12, 10);
            
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(powerUp.x + 6, powerUp.y + 11, 12, 4);
            ctx.fillRect(powerUp.x + 8, powerUp.y + 9, 8, 8);
            
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(powerUp.x + 8, powerUp.y + 12, 8, 2);
            ctx.fillRect(powerUp.x + 10, powerUp.y + 10, 4, 6);
        }
    }
}

class ParticleSystem {
    constructor(game) {
        this.game = game;
    }
    
    update(entityManager) {
        const particles = entityManager.query('transform', 'particle');
        
        particles.forEach(entity => {
            const transform = entity.get('transform');
            const particle = entity.get('particle');
            
            // Update position
            transform.x += particle.vx;
            transform.y += particle.vy;
            
            // Apply gravity for debris particles
            if (particle.type === 'debris') {
                particle.vy += 0.3;
            }
            
            // Decrease life
            particle.life--;
            
            // Remove dead particles
            if (particle.life <= 0) {
                entityManager.entities.delete(entity.id);
            }
        });
    }
}

class RenderSystem {
    constructor(spriteRenderer) {
        this.spriteRenderer = spriteRenderer;
    }
    
    render(ctx, entityManager, camera) {
        const entities = entityManager.query('transform', 'sprite');
        
        entities.forEach((entity, index) => {
            const transform = entity.get('transform');
            
            // Debug removed - was causing console spam
            
            // Create a fake enemy object for the sprite renderer
            // NOTE: ctx is already translated by camera, so use world coordinates directly
            const fakeEnemy = {
                x: transform.x,
                y: transform.y,
                width: transform.width,
                height: transform.height,
                type: 'goomba',
                alive: true
            };
            
            // Use the existing goomba sprite renderer
            this.spriteRenderer.enemies.goomba(ctx, fakeEnemy);
        });
    }
}

// ASCII Map Converter
const convertASCIIToLevel = (asciiLines) => {
    asciiLines.forEach((line, i) => {
        // Show unique characters in this line
        const uniqueChars = [...new Set(line.split(''))].sort();
        
        // Count specific characters we're looking for
        const counts = {
            'G': (line.match(/G/g) || []).length,
            'K': (line.match(/K/g) || []).length,
            'B': (line.match(/B/g) || []).length,
            '?': (line.match(/\?/g) || []).length,
            'X': (line.match(/X/g) || []).length,
            'P': (line.match(/P/g) || []).length,
            '#': (line.match(/#/g) || []).length
        };
    });
    
    const level = { tiles: [], enemies: [], blocks: [], width: 0, castle: null };
    
    // Find ground line (line with # symbols)
    const groundLineIndex = asciiLines.findIndex(line => line.includes('#'));
    
    if (groundLineIndex === -1) {
        console.warn('No ground line found!');
        return level;
    }
    
    const groundLine = asciiLines[groundLineIndex];
    
    const width = groundLine.length;
    level.width = width;
    
    // Initialize tiles array
    level.tiles = new Array(width).fill('G');
    
    // Check enemy line (line above ground)
    const enemyLineIndex = groundLineIndex - 1;
    if (enemyLineIndex >= 0) {
        const enemyLine = asciiLines[enemyLineIndex];
        
        // Look for enemies and other elements
        for (let x = 0; x < width && x < enemyLine.length; x++) {
            if (enemyLine[x] === 'G') {
                level.enemies.push({x: x * 16, type: 'goomba'});
            }
            if (enemyLine[x] === 'K') {
                level.enemies.push({x: x * 16, type: 'koopa'});
            }
            if (enemyLine[x] === 'k') {
                level.enemies.push({x: x * 16, type: 'parakoopa'});
            }
            if (enemyLine[x] === 'p') {
                level.enemies.push({x: x * 16, y: 320, type: 'piranha'});
                level.tiles[x] = 'p'; // Pipe with piranha
            }
            if (enemyLine[x] === 'P') {
                level.tiles[x] = 'p'; // Regular pipe
            }
            if (enemyLine[x] === 'F') {
                // Flag position - we'll handle this in the level initialization
            }
        }
    }
    
    // Process ground line for pits
    for (let x = 0; x < width; x++) {
        if (groundLine[x] === 'X') {
            level.tiles[x] = 'P'; // Pit
        }
    }
    
    // Check for blocks in upper lines
    for (let y = 0; y < groundLineIndex - 1; y++) {
        const blockLine = asciiLines[y];
        
        // Count blocks in this line
        const bCount = (blockLine.match(/B/g) || []).length;
        const qCount = (blockLine.match(/\?/g) || []).length;
        if (bCount > 0 || qCount > 0) {
        }
        
        for (let x = 0; x < width && x < blockLine.length; x++) {
            if (blockLine[x] === '?') {
                const content = Math.random() > 0.6 ? 'mushroom' : Math.random() > 0.3 ? 'coin' : 'fireflower';
                level.blocks.push({
                    x: x * 16, 
                    y: 272,
                    type: 'question', 
                    content
                });
            }
            if (blockLine[x] === 'B') {
                level.blocks.push({
                    x: x * 16, 
                    y: 272,
                    type: 'brick'
                });
            }
        }
    }
    
    return level;
};

// Load ASCII maps from files


// Fallback map creator
const createFallbackMap = (level) => {
    const themes = { '1-1': 'overworld', '1-2': 'underground', '1-3': 'trees', '1-4': 'castle' };
    return {
        width: 100,
        theme: themes[level],
        tiles: Array(100).fill('G'),
        enemies: [
            {x: 300, type: 'goomba'}, {x: 600, type: 'koopa'}, {x: 900, type: 'goomba'}
        ],
        blocks: [
            {x: 400, y: 208, type: 'question', content: 'coin'},
            {x: 500, y: 208, type: 'brick'},
            {x: 700, y: 208, type: 'question', content: 'mushroom'}
        ]
    };
};

const LevelMapper = {
    GROUND_Y: 370,
    GROUND_HEIGHT: 30,
    TILE_SIZE: 16,
    levels: null, // Will be loaded asynchronously
    
    async init() {
        this.levels = await loadASCIIMaps();
    },
    
    createFromMap: (mapData) => {
        const level = { platforms: [], blocks: [], pits: [], enemies: [], coins: [], castle: null };
        let currentGroundStart = null;
        let currentGroundWidth = 0;
        
        for (let x = 0; x < mapData.width; x++) {
            const tileX = x * LevelMapper.TILE_SIZE;
            const tile = mapData.tiles[x];
            
            if (tile === 'G') {
                if (currentGroundStart === null) {
                    currentGroundStart = tileX;
                    currentGroundWidth = LevelMapper.TILE_SIZE;
                } else {
                    currentGroundWidth += LevelMapper.TILE_SIZE;
                }
            } else {
                if (currentGroundStart !== null) {
                    level.platforms.push({
                        x: currentGroundStart, y: LevelMapper.GROUND_Y,
                        width: currentGroundWidth, height: LevelMapper.GROUND_HEIGHT, type: 'ground'
                    });
                    currentGroundStart = null;
                }
                if (tile === 'P') {
                    level.pits.push({ x: tileX, width: LevelMapper.TILE_SIZE }); // Single tile width pits
                } else if (tile === 'p') {
                    level.platforms.push({
                        x: tileX, y: LevelMapper.GROUND_Y - 50,
                        width: LevelMapper.TILE_SIZE * 2, height: 50 + LevelMapper.GROUND_HEIGHT, type: 'pipe'
                    });
                }
            }
        }
        
        if (currentGroundStart !== null) {
            level.platforms.push({
                x: currentGroundStart, y: LevelMapper.GROUND_Y,
                width: currentGroundWidth, height: LevelMapper.GROUND_HEIGHT, type: 'ground'
            });
        }
        return level;
    }
};

async function createMarioGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    // Debug mode - show level selection menu
    if (settings && settings.debug) {
        const levelSelector = document.createElement('div');
        levelSelector.style.cssText = 'text-align: center; padding: 20px; background: #000; color: #fff;';
        
        const title = document.createElement('h3');
        title.textContent = 'Debug: Select Level';
        title.style.color = '#fff';
        levelSelector.appendChild(title);
        
        const levels = [
            { id: 1, name: 'Level 1-1 (Overworld)', theme: 'overworld' },
            { id: 2, name: 'Level 1-2 (Underground)', theme: 'underground' },
            { id: 3, name: 'Level 1-3 (Trees)', theme: 'trees' },
            { id: 4, name: 'Level 1-4 (Castle)', theme: 'castle' }
        ];
        
        levels.forEach(level => {
            const button = document.createElement('button');
            button.textContent = level.name;
            button.style.cssText = 'margin: 10px; padding: 10px 20px; font-size: 16px; background: #333; color: #fff; border: 2px solid #666; cursor: pointer;';
            button.onmouseover = () => button.style.background = '#555';
            button.onmouseout = () => button.style.background = '#333';
            button.onclick = () => {
                gameArea.removeChild(levelSelector);
                startMarioGame(level.id);
            };
            levelSelector.appendChild(button);
        });
        
        gameArea.appendChild(levelSelector);
        return;
    }
    
    // Normal mode - start with level 3 (current default)
    startMarioGame(3);
    
    function startMarioGame(levelId) {
        // Use only level 1-1 for now
        
        // Use only level 1-1 - no level maps array needed
    
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    
    let game = {
        player: { 
            x: 50, y: 300, width: 16, height: 16, 
            vx: 0, vy: 0, onGround: false, 
            lives: 3, score: 0, powerState: 'small',
            facingRight: true, shootCooldown: 0
        },
        camera: { x: 0 },
        platforms: [],
        blocks: [],
        enemies: [],
        coins: [],
        fireballs: [],
        pits: [],
        currentLevel: levelId, // Use selected level
        levelsCompleted: 0,
        levelsToWin: 3, // Three levels now
        levelWidth: 4000,
        gameOver: false,
        won: false,
        gameStarted: false,
        keys: {},
        currentTheme: 'overworld',
        frameCount: 0,
        
        // Entity System - Phase 1
        entityManager: new EntityManager(),
        renderSystem: null, // Will be initialized after SpriteRenderer is defined
        lastLogTime: 0 // For position logging
    };
    
    // Theme System - centralized theme configuration
    const Themes = {
        overworld: {
            name: 'Overworld',
            colors: {
                sky: '#5C94FC', // Baby blue
                ground: '#8B4513',
                groundShadow: '#654321',
                pipe: '#00FF00',
                pipeShadow: '#00AA00',
                brick: '#CC6600',
                brickShadow: '#994400',
                question: '#FFD700',
                questionShadow: '#CC9900',
                cloud: '#FFFFFF',
                bush: '#90EE90', // Light green
                hill: '#228B22'  // Darker green
            },
            sprites: {
                platform: 'grass',
                background: 'hills'
            }
        },
        
        underground: {
            name: 'Underground',
            colors: {
                sky: '#000000',
                ground: '#4682B4', // Blue-green tinted ground
                groundShadow: '#2F4F4F', // Darker blue-green shadow
                pipe: '#00AA00',
                pipeShadow: '#007700',
                brick: '#5F9EA0', // Blue-green tinted brick (CadetBlue)
                brickShadow: '#2F4F4F', // Dark blue-green shadow
                question: '#FFD700', // Keep same golden color as overworld
                questionShadow: '#CC9900' // Keep same golden shadow as overworld
            },
            sprites: {
                platform: 'brick',
                background: 'cave'
            }
        },
        
        trees: {
            name: 'Tree Tops',
            colors: {
                sky: '#5C94FC', // Baby blue like overworld
                ground: '#228B22', // Green tree platforms (original)
                groundShadow: '#006400', // Dark green tree platforms (original)
                pipe: '#00FF00',
                pipeShadow: '#00AA00',
                brick: '#CC6600', // Orange like overworld
                brickShadow: '#994400', // Dark orange like overworld
                question: '#FFD700',
                questionShadow: '#CC9900',
                cloud: '#FFFFFF',
                cloudShadow: '#CCCCCC', // Gray for cloud shading
                bush: '#90EE90', // Light green
                hill: '#228B22'  // Darker green
            },
            sprites: {
                platform: 'tree',
                background: 'sky'
            }
        },
        
        castle: {
            name: 'Castle',
            colors: {
                sky: '#000000', // Black background
                ground: '#808080', // Gray brick
                groundShadow: '#404040', // Dark gray
                pipe: '#00FF00',
                pipeShadow: '#00AA00',
                brick: '#808080', // Gray brick
                brickShadow: '#404040', // Dark gray
                question: '#FFD700',
                questionShadow: '#CC9900',
                lava: '#FF4500', // Orange-red lava
                lavaBubble: '#FFFF00' // Yellow bubbles
            },
            sprites: {
                platform: 'brick',
                background: 'castle'
            }
        }
    };
    
    // Theme utilities
    const ThemeSystem = {
        current: null,
        
        setTheme: (themeName) => {
            ThemeSystem.current = Themes[themeName] || Themes.overworld;
        },
        
        getColor: (colorName) => {
            return ThemeSystem.current?.colors[colorName] || '#FF00FF'; // Magenta for missing colors
        },
        
        renderBackground: (ctx, canvas) => {
            // Sky background
            ctx.fillStyle = ThemeSystem.getColor('sky');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add theme-specific background elements
            if (ThemeSystem.current?.name === 'Overworld') {
                // Clouds high in the sky
                ctx.fillStyle = ThemeSystem.getColor('cloud');
                const cloudPositions = [120, 380, 620, 880, 1140, 1400, 1660, 1920];
                cloudPositions.forEach((x, i) => {
                    const cloudX = x - (game.camera?.x || 0) * 0.5; // Parallax effect
                    const cloudY = 60 + (i % 3) * 20; // Varying heights
                    
                    // Cloud shape
                    ctx.fillRect(cloudX, cloudY, 60, 20);
                    ctx.fillRect(cloudX + 10, cloudY - 10, 40, 20);
                    ctx.fillRect(cloudX + 20, cloudY - 20, 20, 20);
                });
                
                // Hills coming out of ground
                ctx.fillStyle = ThemeSystem.getColor('hill');
                const hillPositions = [200, 450, 750, 1100, 1450, 1800];
                hillPositions.forEach((x, i) => {
                    const hillX = x - (game.camera?.x || 0);
                    const hillWidth = 40 + (i % 2) * 20; // Smaller hills
                    const hillHeight = 30 + (i % 3) * 10; // Smaller heights
                    const groundY = canvas.height - 35; // 10 pixels lower (was -45)
                    
                    // Half oval with flat bottom - invert the width calculation
                    for (let y = 0; y < hillHeight; y++) {
                        // Invert: y=0 (top) should be narrow, y=hillHeight (bottom) should be wide
                        const normalizedY = (hillHeight - y) / hillHeight; // 1 at top, 0 at bottom
                        const width = hillWidth * Math.sqrt(1 - normalizedY * normalizedY);
                        ctx.fillRect(hillX - width/2, groundY - hillHeight + y, width, 1);
                    }
                });
                
                // Small bushes coming out of ground
                ctx.fillStyle = ThemeSystem.getColor('bush');
                const bushPositions = [150, 320, 480, 680, 920, 1200, 1380, 1620];
                bushPositions.forEach((x, i) => {
                    const bushX = x - (game.camera?.x || 0);
                    const bushWidth = 30 + (i % 2) * 15; // Varying sizes
                    const bushHeight = 20 + (i % 3) * 10;
                    const groundY = canvas.height - 35; // 10 pixels lower (was -45)
                    
                    // Bush shape - three circles
                    const circleRadius = bushHeight / 3;
                    for (let circle = 0; circle < 3; circle++) {
                        const circleX = bushX + (circle * bushWidth / 3);
                        for (let y = 0; y < circleRadius * 2; y++) {
                            const width = Math.sqrt(circleRadius * circleRadius - (y - circleRadius) * (y - circleRadius)) * 2;
                            ctx.fillRect(circleX - width/2, groundY - y, width, 1);
                        }
                    }
                });
            } else if (ThemeSystem.current?.name === 'Tree Tops') {
                // More clouds at different levels for sky theme
                
                // High clouds
                const highClouds = [100, 320, 540, 760, 980, 1200, 1420, 1640, 1860];
                highClouds.forEach((x, i) => {
                    const cloudX = x - (game.camera?.x || 0) * 0.3; // Slower parallax for distance
                    const cloudY = 40 + (i % 2) * 15;
                    
                    // White cloud body
                    ctx.fillStyle = ThemeSystem.getColor('cloud');
                    ctx.fillRect(cloudX, cloudY, 40, 12);
                    ctx.fillRect(cloudX + 6, cloudY - 6, 28, 12);
                    ctx.fillRect(cloudX + 12, cloudY - 12, 16, 12);
                    
                    // Gray cloud shadow (bottom)
                    ctx.fillStyle = ThemeSystem.getColor('cloudShadow');
                    ctx.fillRect(cloudX, cloudY + 8, 40, 4);
                    ctx.fillRect(cloudX + 6, cloudY + 2, 28, 4);
                    ctx.fillRect(cloudX + 12, cloudY - 4, 16, 4);
                });
                
                // Mid-level clouds
                const midClouds = [200, 450, 700, 950, 1250, 1500, 1750];
                midClouds.forEach((x, i) => {
                    const cloudX = x - (game.camera?.x || 0) * 0.4;
                    const cloudY = 120 + (i % 3) * 20;
                    
                    // White cloud body
                    ctx.fillStyle = ThemeSystem.getColor('cloud');
                    ctx.fillRect(cloudX, cloudY, 48, 14);
                    ctx.fillRect(cloudX + 8, cloudY - 8, 32, 14);
                    ctx.fillRect(cloudX + 16, cloudY - 14, 16, 14);
                    
                    // Gray cloud shadow (bottom)
                    ctx.fillStyle = ThemeSystem.getColor('cloudShadow');
                    ctx.fillRect(cloudX, cloudY + 10, 48, 4);
                    ctx.fillRect(cloudX + 8, cloudY + 2, 32, 4);
                    ctx.fillRect(cloudX + 16, cloudY - 6, 16, 4);
                });
                
                // Lower clouds
                const lowClouds = [80, 380, 620, 880, 1140, 1400, 1660];
                lowClouds.forEach((x, i) => {
                    const cloudX = x - (game.camera?.x || 0) * 0.5;
                    const cloudY = 200 + (i % 2) * 25;
                    
                    // White cloud body
                    ctx.fillStyle = ThemeSystem.getColor('cloud');
                    ctx.fillRect(cloudX, cloudY, 56, 16);
                    ctx.fillRect(cloudX + 10, cloudY - 10, 36, 16);
                    ctx.fillRect(cloudX + 18, cloudY - 16, 20, 16);
                    
                    // Gray cloud shadow (bottom)
                    ctx.fillStyle = ThemeSystem.getColor('cloudShadow');
                    ctx.fillRect(cloudX, cloudY + 12, 56, 4);
                    ctx.fillRect(cloudX + 10, cloudY + 2, 36, 4);
                    ctx.fillRect(cloudX + 18, cloudY - 8, 20, 4);
                });
            }
        },
        
        renderPlatform: (ctx, platform) => {
            if (platform.type === 'moving_up' || platform.type === 'moving_down' || 
                platform.type === 'vertical_moving' || platform.type === 'horizontal_moving') {
                // Pink girder with holes
                ctx.fillStyle = '#FF69B4'; // Hot pink
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                
                // Lighter pink highlight on top and left
                ctx.fillStyle = '#FFB6C1'; // Light pink
                ctx.fillRect(platform.x, platform.y, platform.width, 1); // Top highlight
                ctx.fillRect(platform.x, platform.y, 1, platform.height); // Left highlight
                
                // Darker pink shadow on bottom and right
                ctx.fillStyle = '#C71585'; // Medium violet red
                ctx.fillRect(platform.x, platform.y + platform.height - 1, platform.width, 1); // Bottom shadow
                ctx.fillRect(platform.x + platform.width - 1, platform.y, 1, platform.height); // Right shadow
                
                // Black holes - 2 holes per cell (every 20 pixels)
                ctx.fillStyle = '#000000';
                const holeSize = 2;
                const cellSize = 20; // One cell = 20 pixels
                
                for (let cellX = 0; cellX < platform.width; cellX += cellSize) {
                    const hole1X = platform.x + cellX + 4;
                    const hole2X = platform.x + cellX + 14;
                    const holeY = platform.y + platform.height/2 - holeSize/2;
                    
                    // Only draw holes if they're within the platform bounds
                    if (hole1X + holeSize <= platform.x + platform.width) {
                        ctx.fillRect(hole1X, holeY, holeSize, holeSize);
                    }
                    if (hole2X + holeSize <= platform.x + platform.width) {
                        ctx.fillRect(hole2X, holeY, holeSize, holeSize);
                    }
                }
            } else if (platform.type === 'tree') {
                // Tree platforms are rendered in the main render function as grouped objects
                // Skip individual rendering here
            } else if (platform.type === 'block') {
                // 3D block platform - use overworld colors in Tree Tops theme
                if (ThemeSystem.current?.name === 'Tree Tops') {
                    // Use overworld brown colors
                    ctx.fillStyle = '#8B4513'; // Brown like overworld
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Light brown highlights on top and left
                    ctx.fillStyle = '#DEB887'; // Light brown highlight
                    ctx.fillRect(platform.x, platform.y, platform.width, 2); // Top highlight
                    ctx.fillRect(platform.x, platform.y, 2, platform.height); // Left highlight
                    
                    // Dark brown shadows on bottom and right
                    ctx.fillStyle = '#654321'; // Dark brown shadow
                    ctx.fillRect(platform.x, platform.y + platform.height - 2, platform.width, 2); // Bottom shadow
                    ctx.fillRect(platform.x + platform.width - 2, platform.y, 2, platform.height); // Right shadow
                } else {
                    // Regular theme colors
                    ctx.fillStyle = ThemeSystem.getColor('ground');
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Light highlights on top and left (2px wide)
                    ctx.fillStyle = '#DEB887'; // Light brown highlight
                    ctx.fillRect(platform.x, platform.y, platform.width, 2); // Top highlight
                    ctx.fillRect(platform.x, platform.y, 2, platform.height); // Left highlight
                    
                    // Dark shadows on bottom and right (2px wide)
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    ctx.fillRect(platform.x, platform.y + platform.height - 2, platform.width, 2); // Bottom shadow
                    ctx.fillRect(platform.x + platform.width - 2, platform.y, 2, platform.height); // Right shadow
                }
            } else {
                // Regular ground platform - use brown overworld colors in trees theme
                if (platform.type === 'ground' && ThemeSystem.current?.name === 'Tree Tops') {
                    ctx.fillStyle = '#8B4513'; // Brown like overworld
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Brown shadow
                    ctx.fillStyle = '#654321'; // Dark brown like overworld
                    ctx.fillRect(platform.x, platform.y + platform.height - 3, platform.width, 3);
                } else if (platform.type === 'ground' && ThemeSystem.current?.name === 'Castle') {
                    // Castle ground - gray brick pattern
                    ctx.fillStyle = ThemeSystem.getColor('ground');
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Add brick pattern
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    const brickHeight = 8;
                    const brickWidth = 16;
                    
                    // Horizontal lines
                    for (let row = 0; row < platform.height; row += brickHeight) {
                        ctx.fillRect(platform.x, platform.y + row, platform.width, 1);
                    }
                    
                    // Vertical lines (offset every other row)
                    for (let row = 0; row < platform.height; row += brickHeight) {
                        const offset = (Math.floor(row / brickHeight) % 2) * (brickWidth / 2);
                        for (let col = offset; col < platform.width; col += brickWidth) {
                            ctx.fillRect(platform.x + col, platform.y + row, 1, brickHeight);
                        }
                    }
                    
                    // Ground shadow
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    ctx.fillRect(platform.x, platform.y + platform.height - 3, platform.width, 3);
                } else {
                    // Regular ground platform
                    ctx.fillStyle = ThemeSystem.getColor('ground');
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    
                    // Ground shadow
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    ctx.fillRect(platform.x, platform.y + platform.height - 3, platform.width, 3);
                }
            }
        },
        
        renderBlock: (ctx, block) => {
            if (block.type === 'question') {
                if (!block.hit) {
                    // Question block
                    ctx.fillStyle = ThemeSystem.getColor('question');
                    ctx.fillRect(block.x, block.y, block.width, block.height);
                    
                    // Question block shadow
                    ctx.fillStyle = ThemeSystem.getColor('questionShadow');
                    ctx.fillRect(block.x, block.y + block.height - 3, block.width, 3);
                    
                    // Question mark
                    ctx.fillStyle = '#000';
                    ctx.fillRect(block.x + 6, block.y + 4, 8, 2);  // Top horizontal line
                    ctx.fillRect(block.x + 12, block.y + 6, 2, 4); // Right vertical line
                    ctx.fillRect(block.x + 8, block.y + 10, 6, 2); // Middle horizontal line
                    ctx.fillRect(block.x + 9, block.y + 12, 2, 2); // Vertical down
                    ctx.fillRect(block.x + 9, block.y + 16, 2, 2); // Dot
                } else {
                    // Used block (darker)
                    ctx.fillStyle = ThemeSystem.getColor('groundShadow');
                    ctx.fillRect(block.x, block.y, block.width, block.height);
                }
            } else if (block.type === 'brick') {
                // Brick block
                ctx.fillStyle = ThemeSystem.getColor('brick');
                ctx.fillRect(block.x, block.y, block.width, block.height);
                
                // Brick shadow
                ctx.fillStyle = ThemeSystem.getColor('brickShadow');
                ctx.fillRect(block.x, block.y + block.height - 3, block.width, 3);
                
                // Brick pattern
                ctx.fillStyle = ThemeSystem.getColor('brickShadow');
                ctx.fillRect(block.x + 2, block.y + 2, 16, 1);
                ctx.fillRect(block.x + 2, block.y + 10, 16, 1);
                ctx.fillRect(block.x + 10, block.y + 6, 1, 4);
            }
        }
    };
    
    // Sprite rendering system - defined after ThemeSystem to access theme colors
    const SpriteRenderer = {
        enemies: {
            goomba: (ctx, enemy) => {
                // Theme-aware Goomba colors
                let bodyColor, shadowColor;
                if (ThemeSystem.current?.name === 'Underground') {
                    bodyColor = '#5F9EA0'; // Blue-green tinted
                    shadowColor = '#2F4F4F'; // Dark blue-green
                } else {
                    bodyColor = '#8B4513'; // Normal brown
                    shadowColor = '#654321'; // Normal dark brown
                }
                
                if (enemy.state === 'squished') {
                    // Squished goomba - flat brown rectangle
                    ctx.fillStyle = shadowColor;
                    ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 8); // Flat squished body
                    
                    // Eyes still visible
                    ctx.fillStyle = '#FFF';
                    ctx.fillRect(enemy.x + 5, enemy.y + 12, 2, 1);
                    ctx.fillRect(enemy.x + 13, enemy.y + 12, 2, 1);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(enemy.x + 6, enemy.y + 12, 1, 1);
                    ctx.fillRect(enemy.x + 14, enemy.y + 12, 1, 1);
                } else {
                    // Normal goomba - brown mushroom with proper shape (moved down to fill height)
                    ctx.fillStyle = bodyColor;
                    ctx.fillRect(enemy.x + 2, enemy.y + 8, 16, 10); // Main body (moved down 2px)
                    ctx.fillRect(enemy.x + 4, enemy.y + 6, 12, 2);  // Top cap (moved down 2px)
                    ctx.fillRect(enemy.x + 6, enemy.y + 4, 8, 2);   // Very top (moved down 2px)
                    
                    // Darker brown for shading
                    ctx.fillStyle = shadowColor;
                    ctx.fillRect(enemy.x + 3, enemy.y + 9, 14, 1);  // Body shadow (moved down 2px)
                    
                    // Eyes - white background with black pupils
                    ctx.fillStyle = '#FFF';
                    ctx.fillRect(enemy.x + 5, enemy.y + 10, 2, 2);  // Eyes (moved down 2px)
                    ctx.fillRect(enemy.x + 13, enemy.y + 10, 2, 2);
                    
                    // Animated eye pupils
                    ctx.fillStyle = '#000';
                    const eyeOffset = enemy.animFrame === 0 ? 0 : 1;
                    ctx.fillRect(enemy.x + 5 + eyeOffset, enemy.y + 10, 1, 1);  // Pupils (moved down 2px)
                    ctx.fillRect(enemy.x + 14 - eyeOffset, enemy.y + 10, 1, 1);
                }
                
                // Angry eyebrows
                ctx.fillStyle = '#000';
                ctx.fillRect(enemy.x + 5, enemy.y + 7, 3, 1);
                ctx.fillRect(enemy.x + 12, enemy.y + 7, 3, 1);
                
                // Feet - animated for walking
                ctx.fillStyle = bodyColor;
                if (enemy.animFrame === 0) {
                    ctx.fillRect(enemy.x + 2, enemy.y + 16, 3, 2);
                    ctx.fillRect(enemy.x + 15, enemy.y + 17, 3, 1);
                } else {
                    ctx.fillRect(enemy.x + 15, enemy.y + 16, 3, 2);
                    ctx.fillRect(enemy.x + 2, enemy.y + 17, 3, 1);
                }
            },
            
            koopa: (ctx, enemy) => {
                // Theme-aware Koopa colors
                let shellColor, bodyColor, shadowColor;
                if (ThemeSystem.current?.name === 'Underground') {
                    shellColor = '#4682B4'; // Blue-green shell
                    bodyColor = '#5F9EA0'; // Blue-green body
                    shadowColor = '#2F4F4F'; // Dark blue-green
                } else {
                    shellColor = '#228B22'; // Normal green shell
                    bodyColor = '#FFDBAC'; // Normal peach body
                    shadowColor = '#006400'; // Normal dark green
                }
                
                if (enemy.state === 'shell' || enemy.state === 'shellMoving') {
                    // Shell only - theme colored with yellow trim
                    ctx.fillStyle = shellColor;
                    ctx.fillRect(enemy.x + 2, enemy.y + 4, 16, 12); // Shell body
                    
                    // Yellow shell trim
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(enemy.x + 2, enemy.y + 4, 16, 1);  // Top edge
                    ctx.fillRect(enemy.x + 2, enemy.y + 15, 16, 1); // Bottom edge
                    ctx.fillRect(enemy.x + 2, enemy.y + 5, 1, 10);  // Left edge
                    ctx.fillRect(enemy.x + 17, enemy.y + 5, 1, 10); // Right edge
                } else {
                    // Walking Koopa - shell with head and feet
                    ctx.fillStyle = shellColor;
                    ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 10); // Main shell
                    
                    // Yellow shell trim
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 1);  // Top edge
                    ctx.fillRect(enemy.x + 2, enemy.y + 19, 16, 1);  // Bottom edge
                    ctx.fillRect(enemy.x + 2, enemy.y + 11, 1, 8);   // Left edge
                    ctx.fillRect(enemy.x + 17, enemy.y + 11, 1, 8);  // Right edge
                    
                    // Shell pattern
                    ctx.fillStyle = shadowColor;
                    ctx.fillRect(enemy.x + 6, enemy.y + 13, 2, 2);
                    ctx.fillRect(enemy.x + 12, enemy.y + 13, 2, 2);
                    ctx.fillRect(enemy.x + 9, enemy.y + 16, 2, 2);
                    
                    // Head
                    ctx.fillStyle = bodyColor;
                    ctx.fillRect(enemy.x + 6, enemy.y + 4, 8, 6); // Head
                    
                    // Eyes
                    ctx.fillStyle = '#000';
                    ctx.fillRect(enemy.x + 7, enemy.y + 5, 1, 1);
                    ctx.fillRect(enemy.x + 10, enemy.y + 5, 1, 1);
                }
            },
            
            parakoopa: (ctx, enemy) => {
                // Theme-aware Parakoopa colors (same as koopa)
                let shellColor, bodyColor, shadowColor;
                if (ThemeSystem.current?.name === 'Underground') {
                    shellColor = '#4682B4'; // Blue-green shell
                    bodyColor = '#5F9EA0'; // Blue-green body
                    shadowColor = '#2F4F4F'; // Dark blue-green
                } else {
                    shellColor = '#228B22'; // Normal green shell
                    bodyColor = '#FFDBAC'; // Normal peach body
                    shadowColor = '#006400'; // Normal dark green
                }
                
                // Shell with head and feet (always walking state for parakoopa)
                ctx.fillStyle = shellColor;
                ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 10); // Main shell
                
                // Yellow shell trim
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 1);  // Top edge
                ctx.fillRect(enemy.x + 2, enemy.y + 19, 16, 1);  // Bottom edge
                ctx.fillRect(enemy.x + 2, enemy.y + 11, 1, 8);   // Left edge
                ctx.fillRect(enemy.x + 17, enemy.y + 11, 1, 8);  // Right edge
                
                // Shell pattern
                ctx.fillStyle = shadowColor;
                ctx.fillRect(enemy.x + 6, enemy.y + 13, 2, 2);
                ctx.fillRect(enemy.x + 12, enemy.y + 13, 2, 2);
                ctx.fillRect(enemy.x + 9, enemy.y + 16, 2, 2);
                
                // Head
                ctx.fillStyle = bodyColor;
                ctx.fillRect(enemy.x + 6, enemy.y + 4, 8, 6); // Head
                
                // Eyes
                ctx.fillStyle = '#000';
                ctx.fillRect(enemy.x + 7, enemy.y + 5, 1, 1);
                ctx.fillRect(enemy.x + 10, enemy.y + 5, 1, 1);
                
                // Wings - animated
                const wingFlap = Math.floor(Date.now() / 150) % 2;
                ctx.fillStyle = '#FFFFFF'; // White wings
                if (wingFlap === 0) {
                    // Wings up
                    ctx.fillRect(enemy.x + 1, enemy.y + 2, 3, 6); // Left wing
                    ctx.fillRect(enemy.x + 16, enemy.y + 2, 3, 6); // Right wing
                } else {
                    // Wings down
                    ctx.fillRect(enemy.x + 1, enemy.y + 6, 3, 6); // Left wing
                    ctx.fillRect(enemy.x + 16, enemy.y + 6, 3, 6); // Right wing
                }
                
                // Wing outlines
                ctx.fillStyle = '#000000';
                if (wingFlap === 0) {
                    ctx.fillRect(enemy.x + 1, enemy.y + 2, 3, 1); // Left wing top
                    ctx.fillRect(enemy.x + 16, enemy.y + 2, 3, 1); // Right wing top
                } else {
                    ctx.fillRect(enemy.x + 1, enemy.y + 11, 3, 1); // Left wing bottom
                    ctx.fillRect(enemy.x + 16, enemy.y + 11, 3, 1); // Right wing bottom
                }
            },
            
            piranha: (ctx, enemy) => {
                // Piranha Plant - green stem with red head, upward-facing mouth
                
                // Stem (always visible part)
                ctx.fillStyle = '#228B22'; // Green stem
                ctx.fillRect(enemy.x + 7, enemy.y + 16, 6, 16); // Vertical stem
                
                // Only draw head if not fully hidden
                if (enemy.state !== 'hidden' || enemy.y < enemy.hiddenY) {
                    const mouthOpen = Math.floor(Date.now() / 300) % 2 === 0; // Animate mouth
                    
                    // Head - red with darker outline
                    ctx.fillStyle = '#DC143C'; // Dark red head
                    ctx.fillRect(enemy.x + 2, enemy.y + 2, 16, 14); // Main head (wider, shorter)
                    
                    // Head outline - darker red
                    ctx.fillStyle = '#8B0000';
                    ctx.fillRect(enemy.x + 2, enemy.y + 2, 16, 1); // Top
                    ctx.fillRect(enemy.x + 2, enemy.y + 15, 16, 1); // Bottom
                    ctx.fillRect(enemy.x + 2, enemy.y + 3, 1, 12); // Left
                    ctx.fillRect(enemy.x + 17, enemy.y + 3, 1, 12); // Right
                    
                    // Two leaves on sides
                    ctx.fillStyle = '#228B22'; // Green leaves
                    ctx.fillRect(enemy.x, enemy.y + 6, 3, 6); // Left leaf
                    ctx.fillRect(enemy.x + 17, enemy.y + 6, 3, 6); // Right leaf
                    
                    // Leaf details
                    ctx.fillStyle = '#006400'; // Dark green
                    ctx.fillRect(enemy.x, enemy.y + 7, 1, 4); // Left leaf vein
                    ctx.fillRect(enemy.x + 19, enemy.y + 7, 1, 4); // Right leaf vein
                    
                    // Mouth - upward facing, animated
                    if (mouthOpen) {
                        // Open mouth - black opening
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(enemy.x + 4, enemy.y + 4, 12, 8); // Mouth opening
                        
                        // White teeth around mouth edge
                        ctx.fillStyle = '#FFFFFF';
                        // Top teeth
                        ctx.fillRect(enemy.x + 5, enemy.y + 4, 2, 2);
                        ctx.fillRect(enemy.x + 8, enemy.y + 4, 2, 2);
                        ctx.fillRect(enemy.x + 11, enemy.y + 4, 2, 2);
                        ctx.fillRect(enemy.x + 14, enemy.y + 4, 2, 2);
                        // Bottom teeth
                        ctx.fillRect(enemy.x + 5, enemy.y + 10, 2, 2);
                        ctx.fillRect(enemy.x + 8, enemy.y + 10, 2, 2);
                        ctx.fillRect(enemy.x + 11, enemy.y + 10, 2, 2);
                        ctx.fillRect(enemy.x + 14, enemy.y + 10, 2, 2);
                    } else {
                        // Closed mouth - just a line
                        ctx.fillStyle = '#8B0000';
                        ctx.fillRect(enemy.x + 4, enemy.y + 8, 12, 1); // Mouth line
                    }
                    
                    // White spots on head
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(enemy.x + 4, enemy.y + 3, 2, 1);
                    ctx.fillRect(enemy.x + 14, enemy.y + 3, 2, 1);
                    ctx.fillRect(enemy.x + 6, enemy.y + 13, 2, 1);
                    ctx.fillRect(enemy.x + 12, enemy.y + 13, 2, 1);
                }
            }
        },
        
        player: {
            mario: (ctx, player) => {
                const isSmall = player.powerState === 'small';
                const isFire = player.powerState === 'fire';
                const baseY = player.y;
                const isMoving = Math.abs(player.vx) > 0.1;
                const isJumping = player.vy < -1 || !player.onGround;
                const animFrame = Math.floor(Date.now() / 150) % 2;
                
                // Mario's hat - red for normal, white for fire Mario
                ctx.fillStyle = isFire ? '#FFFFFF' : '#FF0000';
                if (isSmall) {
                    ctx.fillRect(player.x + 2, baseY, 12, 4);
                } else {
                    ctx.fillRect(player.x + 2, baseY, 16, 6);
                }
                
                ctx.fillStyle = isFire ? '#CCCCCC' : '#CC0000';
                if (isSmall) {
                    ctx.fillRect(player.x + 3, baseY + 1, 10, 1);
                } else {
                    ctx.fillRect(player.x + 3, baseY + 1, 14, 1);
                }
                
                // Face - peach color
                ctx.fillStyle = '#FFDBAC';
                if (isSmall) {
                    ctx.fillRect(player.x + 3, baseY + 3, 10, 4);
                } else {
                    ctx.fillRect(player.x + 3, baseY + 5, 14, 6);
                }
                
                if (!isSmall) {
                    // Big Mario - overalls and shirt
                    ctx.fillStyle = isFire ? '#FFFFFF' : '#0066CC';
                    ctx.fillRect(player.x + 2, baseY + 11, 16, 12);
                    
                    // Red shirt showing through
                    ctx.fillStyle = '#FF0000';
                    ctx.fillRect(player.x + 7, baseY + 14, 6, 8);
                    
                    // Overall straps
                    ctx.fillStyle = isFire ? '#FFFFFF' : '#0066CC';
                    ctx.fillRect(player.x + 4, baseY + 9, 3, 4);
                    ctx.fillRect(player.x + 13, baseY + 9, 3, 4);
                    
                    // Buttons - yellow
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(player.x + 8, baseY + 15, 1, 1);
                    ctx.fillRect(player.x + 8, baseY + 18, 1, 1);
                    
                    // Gloves - white (bigger)
                    ctx.fillStyle = '#FFF';
                    if (isJumping) {
                        if (player.facingRight) {
                            ctx.fillRect(player.x + 18, baseY + 12, 4, 4);
                            ctx.fillRect(player.x - 2, baseY + 18, 4, 4);
                        } else {
                            ctx.fillRect(player.x - 2, baseY + 12, 4, 4);
                            ctx.fillRect(player.x + 18, baseY + 18, 4, 4);
                        }
                    } else {
                        ctx.fillRect(player.x, baseY + 16, 3, 4);
                        ctx.fillRect(player.x + 17, baseY + 16, 3, 4);
                    }
                    
                    // Shoes - brown (bigger)
                    ctx.fillStyle = '#8B4513';
                    if (isJumping) {
                        if (player.facingRight) {
                            ctx.fillRect(player.x + 14, baseY + 24, 6, 4);
                            ctx.fillRect(player.x, baseY + 29, 6, 4);
                        } else {
                            ctx.fillRect(player.x, baseY + 24, 6, 4);
                            ctx.fillRect(player.x + 14, baseY + 29, 6, 4);
                        }
                    } else if (isMoving) {
                        if (animFrame === 0) {
                            ctx.fillRect(player.x, baseY + 27, 6, 4);
                            ctx.fillRect(player.x + 14, baseY + 26, 6, 4);
                        } else {
                            ctx.fillRect(player.x, baseY + 26, 6, 4);
                            ctx.fillRect(player.x + 14, baseY + 27, 6, 4);
                        }
                    } else {
                        ctx.fillRect(player.x, baseY + 27, 6, 4);
                        ctx.fillRect(player.x + 14, baseY + 27, 6, 4);
                    }
                } else {
                    // Small Mario - overalls
                    ctx.fillStyle = isFire ? '#FFFFFF' : '#0066CC';
                    ctx.fillRect(player.x + 2, baseY + 4, 12, 6);
                    
                    // Small gloves
                    ctx.fillStyle = '#FFF';
                    if (isJumping) {
                        if (player.facingRight) {
                            ctx.fillRect(player.x + 10, baseY - 1, 2, 2);
                            ctx.fillRect(player.x + 3, baseY + 6, 2, 2);
                        } else {
                            ctx.fillRect(player.x + 4, baseY - 1, 2, 2);
                            ctx.fillRect(player.x + 11, baseY + 6, 2, 2);
                        }
                    } else {
                        ctx.fillRect(player.x + 1, baseY + 6, 2, 2);
                        ctx.fillRect(player.x + 13, baseY + 6, 2, 2);
                    }
                    
                    // Small shoes
                    ctx.fillStyle = '#8B4513';
                    if (isJumping) {
                        if (player.facingRight) {
                            ctx.fillRect(player.x + 13, baseY + 10, 4, 2);
                            ctx.fillRect(player.x + 1, baseY + 14, 4, 2);
                        } else {
                            ctx.fillRect(player.x + 1, baseY + 10, 4, 2);
                            ctx.fillRect(player.x + 13, baseY + 14, 4, 2);
                        }
                    } else if (isMoving) {
                        if (animFrame === 0) {
                            ctx.fillRect(player.x + 2, baseY + 13, 4, 2);
                            ctx.fillRect(player.x + 10, baseY + 11, 4, 2);
                        } else {
                            ctx.fillRect(player.x + 2, baseY + 11, 4, 2);
                            ctx.fillRect(player.x + 10, baseY + 13, 4, 2);
                        }
                    } else {
                        ctx.fillRect(player.x + 2, baseY + 12, 4, 2);
                        ctx.fillRect(player.x + 10, baseY + 12, 4, 2);
                    }
                }
                
                // Profile nose when moving
                if (Math.abs(player.vx) >= 0.1 || isJumping) {
                    ctx.fillStyle = '#FFDBAC';
                    if (player.facingRight) {
                        if (isSmall) {
                            ctx.fillRect(player.x + 12, baseY + 3, 3, 2);
                        } else {
                            ctx.fillRect(player.x + 16, baseY + 7, 4, 3);
                        }
                    } else {
                        if (isSmall) {
                            ctx.fillRect(player.x + 1, baseY + 3, 3, 2);
                        } else {
                            ctx.fillRect(player.x, baseY + 7, 4, 3);
                        }
                    }
                }
            }
        }
    };
    
    // Initialize RenderSystem now that SpriteRenderer is defined
    // game.renderSystem = new RenderSystem(SpriteRenderer); // Disabled - using ImprovedRenderSystem
    game.improvedRenderSystem = new ImprovedRenderSystem(SpriteRenderer);
    game.camera = new Camera(0, 0);
    
    // Initialize Entity Systems once (not on every reset) - using improved versions
    game.entityManager.addSystem(new PhysicsSystem(game));
    game.entityManager.addSystem(new PlayerInputSystem(game));
    game.entityManager.addSystem(new PlayerSyncSystem(game));
    game.entityManager.addSystem(new AISystem(game)); // Run after physics to restore velocity
    game.entityManager.addSystem(new ImprovedCollisionSystem(game));
    game.entityManager.addSystem(new SquishSystem());
    game.entityManager.addSystem(new InteractiveSystem(game));
    game.entityManager.addSystem(new PowerUpSystem(game));
    game.entityManager.addSystem(new CollectibleSystem(game));
    game.entityManager.addSystem(new ProjectileSystem(game));
    game.entityManager.addSystem(new ParticleSystem(game));
    game.entityManager.addSystem(new PlatformMigrationSystem(game));
    game.entityManager.addSystem(new PlatformMovementSystem(game));
    game.entityManager.addSystem(new BlockMigrationSystem(game));
    
    // Map Character Definitions - defines what each ASCII character creates
    const MapCharacters = {
        '#': { type: 'platform', variant: 'ground' },
        '%': { type: 'platform', variant: 'block' },
        'T': { type: 'platform', variant: 'tree' },
        '?': { type: 'block', variant: 'question', content: 'coin' },
        'C': { type: 'block', variant: 'question', content: 'coin' },
        'M': { type: 'block', variant: 'question', content: 'mushroom' },
        'F': { type: 'block', variant: 'question', content: 'fireflower' },
        'S': { type: 'block', variant: 'question', content: 'star' },
        'B': { type: 'block', variant: 'brick' },
        'G': { type: 'enemy', variant: 'goomba' },
        'K': { type: 'enemy', variant: 'koopa' },
        'k': { type: 'enemy', variant: 'parakoopa' },
        'c': { type: 'coin', variant: 'stationary' },
        'P': { type: 'pipe', variant: 'standard' },
        '^': { type: 'platform', variant: 'moving_up' },
        'v': { type: 'platform', variant: 'moving_down' },
        'W': { type: 'platform', variant: 'vertical_moving' },
        'Z': { type: 'platform', variant: 'horizontal_moving' },
        '@': { type: 'spawn', variant: 'player' },
        '&': { type: 'flag', variant: 'standard' },
        'X': { type: 'pit', variant: 'standard' },
        '-': { type: 'empty', variant: 'sky' }
    };
    
    // Map Object Factories - creates game objects from character definitions
    const MapObjectFactories = {
        platform: (def, x, y, tileSize) => {
            let platform;
            
            // Add movement properties for moving platforms
            if (def.variant === 'moving_up') {
                platform = { x, y, width: tileSize, height: 8, type: def.variant }; // Thinner
                platform.vy = -1; // Move up
                platform.moving = true;
            } else if (def.variant === 'moving_down') {
                platform = { x, y, width: tileSize, height: 8, type: def.variant }; // Thinner
                platform.vy = 1; // Move down
                platform.moving = true;
            } else {
                platform = { x, y, width: tileSize, height: tileSize, type: def.variant };
            }
            
            return platform;
        },
        
        block: (def, x, y, tileSize) => ({
            x, y, width: tileSize, height: tileSize, 
            type: def.variant, hit: false, content: def.content
        }),
        
        enemy: (def, x, y, tileSize, lines) => {
            const enemy = {
                x, width: 20, vx: -1, vy: 0, 
                type: def.variant, state: 'walking', alive: true, onGround: true
            };
            
            // Position enemy on ground level
            let groundY = y;
            for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                if (lines[checkY] && lines[checkY][Math.floor(x / tileSize)] === '#') {
                    groundY = checkY * tileSize - (def.variant === 'goomba' ? 18 : 20);
                    break;
                }
            }
            
            enemy.y = groundY;
            enemy.height = def.variant === 'goomba' ? 18 : 20;
            return enemy;
        },
        
        coin: (def, x, y, tileSize) => ({
            x, y, width: tileSize, height: tileSize, collected: false
        }),
        
        pipe: (def, x, y, tileSize) => {
            // Will be processed in groups later
            return null;
        },
        
        flag: (def, x, y, tileSize, lines) => {
            // Find ground level for flag placement
            let groundY = y;
            for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                if (lines[checkY] && lines[checkY][Math.floor(x / tileSize)] === '#') {
                    groundY = checkY * tileSize;
                    break;
                }
            }
            return { x, y: groundY - (10 * tileSize), width: 35, height: 10 * tileSize };
        },
        
        spawn: (def, x, y, tileSize, lines) => {
            
            // Find a safe ground position (not over a pit)
            let safeX = x;
            let groundY = y;
            const spawnTileX = Math.floor(x / tileSize);
            
            // First, try to find ground directly below the spawn point
            for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                const line = lines[checkY];
                if (line && line[spawnTileX] === '#') {
                    groundY = checkY * tileSize - 16;
                    break;
                }
            }
            
            // If spawn is over a pit (no ground found), find the nearest safe ground
            if (groundY === y) {
                // Look for the first solid ground to the left or right
                for (let offset = 1; offset < 50; offset++) {
                    // Try left
                    const leftTileX = spawnTileX - offset;
                    if (leftTileX >= 0) {
                        for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                            const line = lines[checkY];
                            if (line && line[leftTileX] === '#') {
                                safeX = leftTileX * tileSize;
                                groundY = checkY * tileSize - 16;
                                break;
                            }
                        }
                        if (groundY !== y) break;
                    }
                    
                    // Try right
                    const rightTileX = spawnTileX + offset;
                    for (let checkY = Math.floor(y / tileSize); checkY < lines.length; checkY++) {
                        const line = lines[checkY];
                        if (line && line[rightTileX] && line[rightTileX] === '#') {
                            safeX = rightTileX * tileSize;
                            groundY = checkY * tileSize - 16;
                            break;
                        }
                    }
                    if (groundY !== y) break;
                }
            }
            
            // Final fallback
            if (groundY === y) {
                safeX = 50;
                groundY = 334;
            }
            
            return { x: safeX, y: groundY };
        },
        
        pit: (def, x, y, tileSize) => ({ x, width: tileSize }), // Create pit object
        
        empty: () => null // Sky/empty space
    };
    
    
    async function initializeLevel() {
        try {
            let mapFile, theme;
            if (game.currentLevel === 1) {
                mapFile = 'mario-1-1-map.txt';
                theme = 'overworld';
            } else if (game.currentLevel === 2) {
                mapFile = 'mario-1-2-map.txt';
                theme = 'underground';
            } else if (game.currentLevel === 3) {
                mapFile = 'mario-1-3-map.txt';
                theme = 'overworld';
            } else if (game.currentLevel === 4) {
                mapFile = 'mario-1-4-map.txt';
                theme = 'castle';
            }
            
            const response = await fetch(`./games/mario/${mapFile}?v=${Date.now()}`);
            const mapText = await response.text();
            const layout = parseASCIIMap(mapText);
            
            // Set theme based on level
            game.currentTheme = theme;
            ThemeSystem.setTheme(theme);
        } catch (error) {
            console.error('Failed to load map:', error);
        }
    }
    
    async function initializeLevel() {
        try {
            let mapFile, theme;
            if (game.currentLevel === 1) {
                mapFile = 'mario-1-1-map.txt';
                theme = 'overworld';
            } else if (game.currentLevel === 2) {
                mapFile = 'mario-1-2-map.txt';
                theme = 'underground';
            } else if (game.currentLevel === 3) {
                mapFile = 'mario-1-3-map.txt';
                theme = 'trees';
            } else if (game.currentLevel === 4) {
                mapFile = 'mario-1-4-map.txt';
                theme = 'castle';
            }
            
            const response = await fetch(`./games/mario/${mapFile}?v=${Date.now()}`);
            const mapText = await response.text();
            const layout = parseASCIIMap(mapText);
            
            // Set theme based on level
            game.currentTheme = theme;
            ThemeSystem.setTheme(theme);
            
            // Store layout for reset purposes
            game.currentLayout = layout;
            
            game.platforms = layout.platforms;
            game.blocks = layout.blocks;
            
            // Convert ALL enemies to entities
            // Clear existing entities first
            game.entityManager.entities.clear();
            
            
            game.enemies = []; // Keep empty - all enemies now in entity system
            
            // Process enemies from layout (from level data)
            let goombaCount = 0;
            let koopaCount = 0;
            let enemyCount = 0;
            
            if (layout.enemies) {
                layout.enemies.forEach(enemy => {
                    if (enemy.type === 'goomba') {
                        goombaCount++;
                        // Create entity for goomba
                        const goombaEntity = game.entityManager.create(`goomba${goombaCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 300, 20, 18))
                            .add('physics', new Physics(-1, 0))
                            .add('sprite', new Sprite('#8B4513'))
                            .add('ai', new AI('patrol'));
                    } else if (enemy.type === 'koopa') {
                        koopaCount++;
                        // Create entity for koopa
                        const koopaEntity = game.entityManager.create(`koopa${koopaCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 300, 20, 24))
                            .add('physics', new Physics(-0.5, 0))
                            .add('sprite', new Sprite('#00AA00'))
                            .add('ai', new AI('patrol'));
                    } else if (enemy.type === 'parakoopa') {
                        koopaCount++;
                        // Create entity for parakoopa (flying koopa) - NO PHYSICS
                        const parakoopaEntity = game.entityManager.create(`parakoopa${koopaCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 280, 20, 24))
                            .add('sprite', new Sprite('#00AA00', 'flying'))
                            .add('ai', new AI('flying'));
                    } else if (enemy.type === 'piranha') {
                        enemyCount++;
                        // Create entity for piranha plant
                        const piranhaEntity = game.entityManager.create(`piranha${enemyCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 300, 20, 32))
                            .add('physics', new Physics(0, 0)) // Add physics for position updates
                            .add('sprite', new Sprite('#228B22', 'piranha'))
                            .add('ai', new AI('piranha')); // Special AI type for piranha behavior
                    } else {
                        enemyCount++;
                        // Convert other enemy types to entities too
                        const enemyEntity = game.entityManager.create(`${enemy.type}${enemyCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 332, 20, 20))
                            .add('physics', new Physics(-1, 0))
                            .add('sprite', new Sprite('#FF6600'))
                            .add('ai', new AI('patrol'));
                    }
                });
            }
            
            // All enemies now in entity system - no filtering needed
            
            // Add player entity for tracking
            const playerEntity = game.entityManager.create('player')
                .add('transform', new Transform(layout.startX || 50, layout.startY || 300, 16, 16))
                .add('physics', new Physics(0, 0))
                .add('sprite', new Sprite('#FF0000'))
                .add('player', new Player())
                .add('input', new Input());
            
            game.pits = layout.pits || [];
            game.flag = layout.flag;
            game.castles = layout.castles || [];
            
            // Convert coins to entities
            convertCoinsToEntities(layout);
            
            // Use the same function for initial load
            resetMarioPosition();
            
        } catch (error) {
            console.error('Failed to load map:', error);
            // Fallback to basic level
            game.platforms = [{x: 0, y: 350, width: 2000, height: 50}];
            game.blocks = [];
            game.enemies = [];
            game.flag = {x: 1800, y: 200, width: 35, height: 150};
        }
    }
    
    function parseASCIIMap(mapText) {
        const rawLines = mapText.split('\n');
        const lines = rawLines.filter(line => !line.startsWith('# ') && line.length > 0);
        const platforms = [];
        const blocks = [];
        const enemies = [];
        const coins = [];
        const pits = [];
        let flag = null;
        let startX = 50, startY = 300;
        
        const tileSize = 20;
        
        // Parse each character using the mapping system
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                const char = line[x];
                const worldX = x * tileSize;
                const worldY = y * tileSize;
                
                // Skip W and Z characters - they're handled by grouping logic later
                if (char === 'W' || char === 'Z') continue;
                
                const charDef = MapCharacters[char];
                if (!charDef) continue; // Skip unknown characters
                
                const factory = MapObjectFactories[charDef.type];
                if (!factory) continue; // Skip if no factory
                
                const obj = factory(charDef, worldX, worldY, tileSize, lines);
                if (!obj) continue; // Skip if factory returns null
                
                // Add to appropriate collection based on type
                switch (charDef.type) {
                    case 'platform':
                        platforms.push(obj);
                        break;
                    case 'block':
                        blocks.push(obj);
                        break;
                    case 'enemy':
                        enemies.push(obj);
                        break;
                    case 'coin':
                        coins.push(obj);
                        break;
                    case 'pit':
                        pits.push(obj);
                        break;
                    case 'flag':
                        flag = obj;
                        break;
                    case 'spawn':
                        startX = obj.x;
                        startY = obj.y;
                        break;
                }
            }
        }
        
        // Process connected P groups into single pipes
        const processedPs = new Set();
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                if ((line[x] === 'P' || line[x] === 'p') && !processedPs.has(`${x},${y}`)) {
                    // Find the bounds of this connected P group
                    let minX = x, maxX = x, minY = y, maxY = y;
                    const toCheck = [{x, y}];
                    const groupPs = new Set();
                    let hasPiranha = false;
                    
                    while (toCheck.length > 0) {
                        const {x: cx, y: cy} = toCheck.pop();
                        const key = `${cx},${cy}`;
                        if (groupPs.has(key) || cy >= lines.length || cx >= lines[cy].length || (lines[cy][cx] !== 'P' && lines[cy][cx] !== 'p')) continue;
                        
                        // Check if this pipe has a piranha
                        if (lines[cy][cx] === 'p') {
                            hasPiranha = true;
                        }
                        
                        groupPs.add(key);
                        processedPs.add(key);
                        minX = Math.min(minX, cx);
                        maxX = Math.max(maxX, cx);
                        minY = Math.min(minY, cy);
                        maxY = Math.max(maxY, cy);
                        
                        // Check adjacent cells
                        toCheck.push({x: cx+1, y: cy}, {x: cx-1, y: cy}, {x: cx, y: cy+1}, {x: cx, y: cy-1});
                    }
                    
                    // Create single piranha for this pipe group if it has 'p' characters
                    if (hasPiranha) {
                        const centerX = (minX + maxX) / 2;
                        const piranhaY = minY * tileSize - 36; // Stick out more from pipe
                        enemies.push({
                            x: centerX * tileSize, 
                            y: piranhaY,
                            type: 'piranha',
                            alive: true
                        });
                    }
                    
                    // Create single pipe for this group
                    platforms.push({
                        x: minX * tileSize,
                        y: minY * tileSize,
                        width: (maxX - minX + 1) * tileSize,
                        height: (maxY - minY + 1) * tileSize,
                        type: 'pipe'
                    });
                }
            }
        }
        
        // Process connected W and Z groups into single moving platforms
        const processedWs = new Set();
        const processedZs = new Set();
        
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                // Process W groups (vertical moving platforms)
                if (line[x] === 'W' && !processedWs.has(`${x},${y}`)) {
                    let minX = x, maxX = x, minY = y, maxY = y;
                    const toCheck = [{x, y}];
                    const groupWs = new Set();
                    
                    while (toCheck.length > 0) {
                        const {x: cx, y: cy} = toCheck.pop();
                        const key = `${cx},${cy}`;
                        if (groupWs.has(key) || cy >= lines.length || cx >= lines[cy].length || lines[cy][cx] !== 'W') continue;
                        
                        groupWs.add(key);
                        processedWs.add(key);
                        minX = Math.min(minX, cx);
                        maxX = Math.max(maxX, cx);
                        minY = Math.min(minY, cy);
                        maxY = Math.max(maxY, cy);
                        
                        toCheck.push({x: cx+1, y: cy}, {x: cx-1, y: cy}, {x: cx, y: cy+1}, {x: cx, y: cy-1});
                    }
                    
                    // Create single vertical moving platform
                    const randomOffset = Math.random() * (8 * tileSize);
                    platforms.push({
                        x: minX * tileSize,
                        y: minY * tileSize + randomOffset,
                        width: (maxX - minX + 1) * tileSize,
                        height: 8,
                        type: 'vertical_moving',
                        topY: minY * tileSize,
                        bottomY: minY * tileSize + (8 * tileSize),
                        vy: 1,
                        moving: true
                    });
                }
                
                // Process Z groups (horizontal moving platforms)
                if (line[x] === 'Z' && !processedZs.has(`${x},${y}`)) {
                    let minX = x, maxX = x, minY = y, maxY = y;
                    const toCheck = [{x, y}];
                    const groupZs = new Set();
                    
                    while (toCheck.length > 0) {
                        const {x: cx, y: cy} = toCheck.pop();
                        const key = `${cx},${cy}`;
                        if (groupZs.has(key) || cy >= lines.length || cx >= lines[cy].length || lines[cy][cx] !== 'Z') continue;
                        
                        groupZs.add(key);
                        processedZs.add(key);
                        minX = Math.min(minX, cx);
                        maxX = Math.max(maxX, cx);
                        minY = Math.min(minY, cy);
                        maxY = Math.max(maxY, cy);
                        
                        toCheck.push({x: cx+1, y: cy}, {x: cx-1, y: cy}, {x: cx, y: cy+1}, {x: cx, y: cy-1});
                    }
                    
                    // Create single horizontal moving platform
                    const randomOffset = Math.random() * (8 * tileSize);
                    platforms.push({
                        x: minX * tileSize + randomOffset,
                        y: minY * tileSize,
                        width: (maxX - minX + 1) * tileSize,
                        height: 8,
                        type: 'horizontal_moving',
                        leftX: minX * tileSize,
                        rightX: minX * tileSize + (8 * tileSize),
                        vx: 1,
                        moving: true
                    });
                }
            }
        }
        
        // Handle castle characters 'q' (2-level) and 'Q' (3-level) - find all castles
        let castles = [];
        
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                if (line[x] === 'q' || line[x] === 'Q') {
                    // Find ground level
                    let groundY = y * tileSize;
                    for (let checkY = y; checkY < lines.length; checkY++) {
                        if (lines[checkY] && lines[checkY][x] === '#') {
                            groundY = checkY * tileSize;
                            break;
                        }
                    }
                    const isLarge = line[x] === 'Q';
                    const castleHeight = isLarge ? 180 : 140; // Taller castles
                    const castle = { x: x * tileSize, y: groundY - castleHeight, large: isLarge };
                    castles.push(castle);
                }
            }
        }

        return {platforms, blocks, enemies, coins, pits, flag, castles, startX, startY};
    }
    
    
    function resetMarioPosition() {
        // Reset Mario to starting position and state
        game.player.x = game.currentLayout?.startX || 50;
        game.player.y = game.currentLayout?.startY || 300;
        game.player.vx = 0;
        game.player.vy = 0;
        game.player.onGround = false; // Let gravity handle landing
        game.player.powerState = 'small';
        game.player.width = 16;
        game.player.height = 16;
        game.player.facingRight = true;
        game.player.shootCooldown = 0;
        game.player.invincibleTimer = 0;
    }
    
    async function initializeGameState(preserveLives = false) {
        const currentLives = preserveLives ? game.livesToRestore : 3;
        
        try {
            let mapFile, theme;
            if (game.currentLevel === 1) {
                mapFile = 'mario-1-1-map.txt';
                theme = 'overworld';
            } else if (game.currentLevel === 2) {
                mapFile = 'mario-1-2-map.txt';
                theme = 'underground';
            } else if (game.currentLevel === 3) {
                mapFile = 'mario-1-3-map.txt';
                theme = 'trees';
            } else if (game.currentLevel === 4) {
                mapFile = 'mario-1-4-map.txt';
                theme = 'castle';
            }
            
            const response = await fetch(`./games/mario/${mapFile}?v=${Date.now()}`);
            const mapText = await response.text();
            const layout = parseASCIIMap(mapText);
            
            // Set theme
            game.currentTheme = theme;
            ThemeSystem.setTheme(theme);
            
            // Store layout for reset purposes
            game.currentLayout = layout;
            
            // Reset all game state
            game.platforms = layout.platforms;
            game.blocks = layout.blocks;
            
            // Convert ALL enemies to entities
            // Clear existing entities first
            game.entityManager.entities.clear();
            
            game.enemies = []; // Keep empty - all enemies now in entity system
            
            // Process enemies from layout (from level data)
            let goombaCount = 0;
            let koopaCount = 0;
            let enemyCount = 0;
            
            if (layout.enemies) {
                layout.enemies.forEach(enemy => {
                    if (enemy.type === 'goomba') {
                        goombaCount++;
                        // Create entity for goomba
                        const goombaEntity = game.entityManager.create(`goomba${goombaCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 334, 20, 18))
                            .add('physics', new Physics(-1, 0))
                            .add('sprite', new Sprite('#8B4513'))
                            .add('ai', new AI('patrol'));
                    } else if (enemy.type === 'koopa') {
                        koopaCount++;
                        // Create entity for koopa
                        const koopaEntity = game.entityManager.create(`koopa${koopaCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 334, 20, 24))
                            .add('physics', new Physics(-0.5, 0))
                            .add('sprite', new Sprite('#00AA00'))
                            .add('ai', new AI('patrol'));
                    } else if (enemy.type === 'parakoopa') {
                        koopaCount++;
                        // Create entity for parakoopa (flying koopa) - NO PHYSICS
                        const parakoopaEntity = game.entityManager.create(`parakoopa${koopaCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 314, 20, 24))
                            .add('sprite', new Sprite('#00AA00', 'flying'))
                            .add('ai', new AI('flying'));
                    } else if (enemy.type === 'piranha') {
                        enemyCount++;
                        // Create entity for piranha plant
                        const piranhaEntity = game.entityManager.create(`piranha${enemyCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 334, 20, 32))
                            .add('physics', new Physics(0, 0)) // Add physics for position updates
                            .add('sprite', new Sprite('#228B22', 'piranha'))
                            .add('ai', new AI('piranha')); // Special AI type for piranha behavior
                    } else {
                        enemyCount++;
                        // Convert other enemy types to entities too
                        const enemyEntity = game.entityManager.create(`${enemy.type}${enemyCount}`)
                            .add('transform', new Transform(enemy.x, enemy.y || 334, 20, 20))
                            .add('physics', new Physics(-1, 0))
                            .add('sprite', new Sprite('#FF6600'))
                            .add('ai', new AI('patrol'));
                    }
                });
            }
            
            // All enemies now in entity system - no filtering needed
            
            // Add player entity for tracking
            const playerEntity = game.entityManager.create('player')
                .add('transform', new Transform(layout.startX || 50, layout.startY || 300, 16, 16))
                .add('physics', new Physics(0, 0))
                .add('sprite', new Sprite('#FF0000'))
                .add('player', new Player())
                .add('input', new Input());
            
            game.pits = layout.pits || [];
            game.flag = layout.flag;
            game.castles = layout.castles || [];
            
            // Convert coins to entities
            convertCoinsToEntities(layout);
            
            // Reset Mario completely
            game.player.x = layout.startX;
            game.player.y = layout.startY;
            game.player.vx = 0;
            game.player.vy = 0;
            game.player.onGround = false;
            game.player.powerState = 'small';
            game.player.width = 16;
            game.player.height = 16;
            game.player.facingRight = true;
            game.player.shootCooldown = 0;
            game.player.invincibleTimer = 0;
            game.player.lives = currentLives;
            
            // Reset camera
            game.camera.x = 0;
            
            // Reset other game state
            game.fireballs = [];
            game.gameOver = false;
            game.won = false;
            
            game.enemies.forEach((enemy, i) => {
            });
            
            // Initialize position logging timer
            game.lastLogTime = Date.now();
            
        } catch (error) {
            console.error('Failed to load map:', error);
            // Fallback to basic level
            game.platforms = [{x: 0, y: 350, width: 2000, height: 50}];
            game.blocks = [];
            game.enemies = [];
            game.pits = [];
            game.flag = {x: 1800, y: 200, width: 35, height: 150};
            game.castles = [];
        }
    }
    
    async function initializeLevel() {
        return initializeGameState(false); // Fresh start with 3 lives
    }
    
    function resetLevel() {
        // Store current lives count
        const currentLives = game.player.lives;
        
        // Increment reset counter for platform migration system
        game.levelResetCounter = (game.levelResetCounter || 0) + 1;
        
        
        // Set flag to reload level on next frame
        game.needsLevelReset = true;
        game.livesToRestore = currentLives;
    }
    
    // Old CollisionSystem removed - using ImprovedCollisionSystem instead
    
    function checkScreenBoundary() {
        const playerEntity = game.entityManager.entities.get('player');
        if (!playerEntity) return;
        
        const playerTransform = playerEntity.get('transform');
        const playerComp = playerEntity.get('player');
        
        // Check if Mario fell below the screen
        if (playerTransform.y > 500) {
            playerComp.lives--;
            if (playerComp.lives <= 0) {
                game.gameOver = true;
            } else {
                resetLevel();
            }
        }
    }
    
    function nextLevel() {
        game.levelsCompleted++;
        if (game.levelsCompleted >= game.levelsToWin) {
            game.won = true;
        } else {
            // Progress to next level
            game.currentLevel = game.levelsCompleted + 1;
            initializeLevel();
        }
    }
    
    function checkWin() {
        const playerEntity = game.entityManager.entities.get('player');
        if (!playerEntity) return;
        
        const playerTransform = playerEntity.get('transform');
        
        if (game.flag && playerTransform.x + playerTransform.width > game.flag.x) {
            nextLevel();
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Use theme system for background
        ThemeSystem.renderBackground(ctx, canvas);
        
        ctx.save();
        ctx.translate(-game.camera.x, 0);
        
        // Draw tree trunks first (background)
        const treePlatforms = game.platforms.filter(p => p.type === 'tree');
        const processedTrees = new Set();
        
        treePlatforms.forEach(platform => {
            const key = `${platform.x},${platform.y}`;
            if (processedTrees.has(key)) return;
            
            // Find connected tree platforms (horizontal group)
            let minX = platform.x;
            let maxX = platform.x + platform.width;
            let treeY = platform.y;
            
            // Check for connected platforms to the right
            let checkX = platform.x + platform.width;
            while (treePlatforms.some(p => p.x === checkX && p.y === treeY)) {
                maxX = checkX + platform.width;
                processedTrees.add(`${checkX},${treeY}`);
                checkX += platform.width;
            }
            
            // Check for connected platforms to the left
            checkX = platform.x - platform.width;
            while (treePlatforms.some(p => p.x === checkX && p.y === treeY)) {
                minX = checkX;
                processedTrees.add(`${checkX},${treeY}`);
                checkX -= platform.width;
            }
            
            processedTrees.add(key);
            
            // Draw tree top as solid lime green rectangle with rounded corners
            const treeWidth = maxX - minX;
            const cornerRadius = 4;
            
            // Main tree top rectangle
            ctx.fillStyle = '#32CD32'; // Lime green
            ctx.fillRect(minX, treeY, treeWidth, platform.height);
            
            // Round off the top corners by removing sharp corner pixels
            ctx.fillStyle = ThemeSystem.getColor('sky'); // Sky color to "erase" corners
            
            // Top-left corner rounding
            ctx.fillRect(minX, treeY, 2, 1); // Remove corner pixels
            ctx.fillRect(minX, treeY + 1, 1, 1);
            
            // Top-right corner rounding  
            ctx.fillRect(maxX - 2, treeY, 2, 1); // Remove corner pixels
            ctx.fillRect(maxX - 1, treeY + 1, 1, 1);
            
            // Darker green shadow at bottom
            ctx.fillStyle = '#228B22'; // Darker green shadow
            ctx.fillRect(minX, treeY + platform.height - 3, treeWidth, 3);
            
            // Create shaded half-circle bumps hanging down from the bottom
            const bumpRadius = 6;
            const bumpSpacing = 12;
            for (let x = minX + bumpRadius; x < maxX - bumpRadius; x += bumpSpacing) {
                const centerX = x;
                const centerY = treeY + platform.height;
                
                // Draw half-circle bump hanging down with shading
                for (let i = -bumpRadius; i <= bumpRadius; i++) {
                    const height = Math.sqrt(bumpRadius * bumpRadius - i * i);
                    
                    // Light green on top/left side of bump
                    if (i <= 0) {
                        ctx.fillStyle = '#32CD32'; // Light green highlight
                    } else {
                        ctx.fillStyle = '#006400'; // Dark green shadow
                    }
                    
                    ctx.fillRect(centerX + i, centerY, 1, height);
                }
            }
            
            // Draw single trunk for this tree group (middle section)
            const trunkWidth = Math.max(8, treeWidth - 40); // Narrower trunk
            const trunkX = minX + (treeWidth - trunkWidth) / 2;
            
            // Tree trunk
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(trunkX, treeY + platform.height, trunkWidth, 400 - (treeY + platform.height));
            
            // Tree trunk shading
            ctx.fillStyle = '#654321';
            ctx.fillRect(trunkX, treeY + platform.height, 2, 400 - (treeY + platform.height));
            ctx.fillRect(trunkX + trunkWidth - 2, treeY + platform.height, 2, 400 - (treeY + platform.height));
        });
        
        // Castles (background elements - render before everything else)
        if (game.castles && game.castles.length > 0) {
            game.castles.forEach(castle => {
            const isLarge = castle.large;
            
            // Helper function to draw brick pattern
            function drawBrickPattern(x, y, width, height, baseColor, shadowColor) {
                ctx.fillStyle = baseColor;
                ctx.fillRect(x, y, width, height);
                
                // Draw brick lines
                ctx.fillStyle = shadowColor;
                const brickHeight = 8;
                const brickWidth = 16;
                
                // Horizontal lines
                for (let row = 0; row < height; row += brickHeight) {
                    ctx.fillRect(x, y + row, width, 1);
                }
                
                // Vertical lines (offset every other row)
                for (let row = 0; row < height; row += brickHeight) {
                    const offset = (Math.floor(row / brickHeight) % 2) * (brickWidth / 2);
                    for (let col = offset; col < width; col += brickWidth) {
                        ctx.fillRect(x + col, y + row, 1, brickHeight);
                    }
                }
            }
            
            // Castle dimensions based on size
            const castleWidth = isLarge ? 160 : 120;
            const towerWidth = isLarge ? 40 : 30;
            const towerHeight = isLarge ? 180 : 140;
            
            // Draw tiered castle structure with proper shading boundaries
            if (isLarge) {
                // 3-tier castle - draw from bottom to top (largest to smallest)
                const tier1Width = castleWidth;
                const tier2Width = castleWidth * 0.75;
                const tier3Width = castleWidth * 0.5;
                const tierHeight = 60;
                
                // Tier 1 (bottom/largest) - draw first
                drawBrickPattern(castle.x, castle.y + tierHeight * 2, tier1Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(castle.x, castle.y + tierHeight * 2, 2, tierHeight);
                ctx.fillRect(castle.x, castle.y + tierHeight * 2, tier1Width, 2);
                ctx.fillStyle = '#696969';
                ctx.fillRect(castle.x + tier1Width - 2, castle.y + tierHeight * 2, 2, tierHeight);
                ctx.fillRect(castle.x, castle.y + tierHeight * 3 - 2, tier1Width, 2);
                
                // Tier 2 (middle) - draw second
                const tier2X = castle.x + (tier1Width - tier2Width) / 2;
                drawBrickPattern(tier2X, castle.y + tierHeight, tier2Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(tier2X, castle.y + tierHeight, 2, tierHeight);
                ctx.fillRect(tier2X, castle.y + tierHeight, tier2Width, 2);
                ctx.fillStyle = '#696969';
                ctx.fillRect(tier2X + tier2Width - 2, castle.y + tierHeight, 2, tierHeight);
                ctx.fillRect(tier2X, castle.y + tierHeight * 2 - 2, tier2Width, 2);
                
                // Tier 3 (top/smallest) - draw last with limited shading
                const tier3X = castle.x + (tier1Width - tier3Width) / 2;
                drawBrickPattern(tier3X, castle.y, tier3Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(tier3X, castle.y, 2, tierHeight);
                ctx.fillRect(tier3X, castle.y, tier3Width, 2);
                ctx.fillStyle = '#696969';
                // Only shade the right edge within the tier bounds
                ctx.fillRect(tier3X + tier3Width - 2, castle.y, 2, tierHeight);
                // Only shade the bottom edge within the tier bounds  
                ctx.fillRect(tier3X, castle.y + tierHeight - 2, tier3Width, 2);
            } else {
                // 2-tier castle - draw from bottom to top
                const tier1Width = castleWidth;
                const tier2Width = castleWidth * 0.7;
                const tierHeight = 70;
                
                // Tier 1 (bottom/larger) - draw first
                drawBrickPattern(castle.x, castle.y + tierHeight, tier1Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(castle.x, castle.y + tierHeight, 2, tierHeight);
                ctx.fillRect(castle.x, castle.y + tierHeight, tier1Width, 2);
                ctx.fillStyle = '#696969';
                ctx.fillRect(castle.x + tier1Width - 2, castle.y + tierHeight, 2, tierHeight);
                ctx.fillRect(castle.x, castle.y + tierHeight * 2 - 2, tier1Width, 2);
                
                // Tier 2 (top/smaller) - draw second with limited shading
                const tier2X = castle.x + (tier1Width - tier2Width) / 2;
                drawBrickPattern(tier2X, castle.y, tier2Width, tierHeight, '#A0A0A0', '#808080');
                ctx.fillStyle = '#B8B8B8';
                ctx.fillRect(tier2X, castle.y, 2, tierHeight);
                ctx.fillRect(tier2X, castle.y, tier2Width, 2);
                ctx.fillStyle = '#696969';
                // Only shade within tier bounds
                ctx.fillRect(tier2X + tier2Width - 2, castle.y, 2, tierHeight);
                ctx.fillRect(tier2X, castle.y + tierHeight - 2, tier2Width, 2);
            }
            
            // Left tower (positioned to reach ground) with shading - draw first
            const totalCastleHeight = isLarge ? 180 : 140;
            drawBrickPattern(castle.x - 30, castle.y + totalCastleHeight - towerHeight, towerWidth, towerHeight, '#A0A0A0', '#808080');
            // Tower shading
            ctx.fillStyle = '#696969';
            ctx.fillRect(castle.x - 30 + towerWidth - 2, castle.y + totalCastleHeight - towerHeight, 2, towerHeight);
            ctx.fillRect(castle.x - 30, castle.y + totalCastleHeight - 2, towerWidth, 2);
            
            // Right tower (positioned to reach ground) with shading - draw second
            drawBrickPattern(castle.x + castleWidth - 10, castle.y + totalCastleHeight - towerHeight, towerWidth, towerHeight, '#A0A0A0', '#808080');
            // Tower shading
            ctx.fillStyle = '#696969';
            ctx.fillRect(castle.x + castleWidth - 10 + towerWidth - 2, castle.y + totalCastleHeight - towerHeight, 2, towerHeight);
            ctx.fillRect(castle.x + castleWidth - 10, castle.y + totalCastleHeight - 2, towerWidth, 2);
            
            // Center tower (only for large castle) - draw BEHIND the tiers, not in front
            if (isLarge) {
                // Position center tower to only extend above the top tier, not from ground
                const centerTowerHeight = 60; // Only above the castle
                drawBrickPattern(castle.x + castleWidth/2 - 20, castle.y - centerTowerHeight, towerWidth, centerTowerHeight, '#A0A0A0', '#808080');
                // Center tower shading
                ctx.fillStyle = '#696969';
                ctx.fillRect(castle.x + castleWidth/2 - 20 + towerWidth - 2, castle.y - centerTowerHeight, 2, centerTowerHeight);
                ctx.fillRect(castle.x + castleWidth/2 - 20, castle.y - 2, towerWidth, 2);
            }
            
            // Tower crenellations (battlements)
            ctx.fillStyle = '#A0A0A0';
            
            // Left tower crenellations
            const leftTowerX = castle.x - 30;
            const leftTowerTop = castle.y + totalCastleHeight - towerHeight - 10;
            for (let i = 0; i < Math.floor(towerWidth/8); i++) {
                if (i % 2 === 0) {
                    ctx.fillRect(leftTowerX + i * 8, leftTowerTop, 6, 10);
                }
            }
            
            // Right tower crenellations
            const rightTowerX = castle.x + castleWidth - 10;
            const rightTowerTop = castle.y + totalCastleHeight - towerHeight - 10;
            for (let i = 0; i < Math.floor(towerWidth/8); i++) {
                if (i % 2 === 0) {
                    ctx.fillRect(rightTowerX + i * 8, rightTowerTop, 6, 10);
                }
            }
            
            // Castle tier crenellations
            if (isLarge) {
                // 3-tier castle crenellations
                const tierHeight = 60;
                
                // Top tier (tier 3) crenellations
                const tier3Width = castleWidth * 0.5;
                const tier3X = castle.x + (castleWidth - tier3Width) / 2;
                for (let i = 0; i < Math.floor(tier3Width/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(tier3X + i * 8, castle.y - 10, 6, 10);
                    }
                }
                
                // Middle tier (tier 2) crenellations
                const tier2Width = castleWidth * 0.75;
                const tier2X = castle.x + (castleWidth - tier2Width) / 2;
                for (let i = 0; i < Math.floor(tier2Width/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(tier2X + i * 8, castle.y + tierHeight - 10, 6, 10);
                    }
                }
                
                // Bottom tier (tier 1) crenellations
                for (let i = 0; i < Math.floor(castleWidth/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(castle.x + i * 8, castle.y + tierHeight * 2 - 10, 6, 10);
                    }
                }
                
                // Center tower crenellations
                const centerTowerX = castle.x + castleWidth/2 - 20;
                const centerTowerTop = castle.y - 60 - 10; // Top of the shortened center tower
                for (let i = 0; i < Math.floor(towerWidth/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(centerTowerX + i * 8, centerTowerTop, 6, 10);
                    }
                }
            } else {
                // 2-tier castle crenellations
                const tierHeight = 70;
                
                // Top tier (tier 2) crenellations
                const tier2Width = castleWidth * 0.7;
                const tier2X = castle.x + (castleWidth - tier2Width) / 2;
                for (let i = 0; i < Math.floor(tier2Width/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(tier2X + i * 8, castle.y - 10, 6, 10);
                    }
                }
                
                // Bottom tier (tier 1) crenellations
                for (let i = 0; i < Math.floor(castleWidth/8); i++) {
                    if (i % 2 === 0) {
                        ctx.fillRect(castle.x + i * 8, castle.y + tierHeight - 10, 6, 10);
                    }
                }
            }
            
            // Windows on tiers
            ctx.fillStyle = '#000000';
            
            if (isLarge) {
                // 3-tier castle windows
                const tierHeight = 60;
                // Tier 1 windows (bottom)
                ctx.fillRect(castle.x + 20, castle.y + tierHeight * 2 + 25, 12, 16);
                ctx.fillRect(castle.x + castleWidth - 32, castle.y + tierHeight * 2 + 25, 12, 16);
                // Tier 2 windows (middle)
                ctx.fillRect(castle.x + castleWidth * 0.3, castle.y + tierHeight + 25, 12, 16);
                ctx.fillRect(castle.x + castleWidth * 0.7 - 12, castle.y + tierHeight + 25, 12, 16);
                // Tier 3 windows (top)
                ctx.fillRect(castle.x + castleWidth * 0.4, castle.y + 25, 12, 16);
                ctx.fillRect(castle.x + castleWidth * 0.6 - 12, castle.y + 25, 12, 16);
            } else {
                // 2-tier castle windows
                const tierHeight = 70;
                // Tier 1 windows (bottom)
                ctx.fillRect(castle.x + 20, castle.y + tierHeight + 30, 12, 16);
                ctx.fillRect(castle.x + castleWidth - 32, castle.y + tierHeight + 30, 12, 16);
                // Tier 2 windows (top)
                ctx.fillRect(castle.x + castleWidth * 0.35, castle.y + 30, 12, 16);
                ctx.fillRect(castle.x + castleWidth * 0.65 - 12, castle.y + 30, 12, 16);
            }
            
            // Tower windows
            ctx.fillRect(castle.x - 20, castle.y + 40, 8, 12);
            ctx.fillRect(castle.x + castleWidth - 2, castle.y + 40, 8, 12);
            
            // Center tower window (large castle only)
            if (isLarge) {
                ctx.fillRect(castle.x + castleWidth/2 - 6, castle.y - 30, 12, 16);
            }
            
            // Main entrance - arched door (on bottom tier)
            ctx.fillStyle = '#000000';
            const doorWidth = isLarge ? 40 : 30;
            const doorHeight = isLarge ? 40 : 35;
            const doorX = castle.x + castleWidth/2 - doorWidth/2;
            const doorY = castle.y + (isLarge ? 180 - doorHeight : 140 - doorHeight);
            
            // Door rectangle
            ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
            
            // Door arch (semicircle top)
            ctx.beginPath();
            ctx.arc(doorX + doorWidth/2, doorY, doorWidth/2, Math.PI, 0, false);
            ctx.fill();
            
            // Castle flag
            const flagPoleX = castle.x + castleWidth/2 - 2;
            let flagPoleY;
            if (isLarge) {
                // Large castle: flag at top of center tower
                flagPoleY = castle.y - 60 - 30; // Raised by 10 pixels
            } else {
                // Small castle: flag at top of top tier
                flagPoleY = castle.y - 35; // Lowered by 5 pixels
            }
            const flagPoleHeight = 30;
            
            // Flag pole
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(flagPoleX, flagPoleY, 3, flagPoleHeight);
            
            // Flag (triangular, right-side up)
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(flagPoleX + 3, flagPoleY);
            ctx.lineTo(flagPoleX + 25, flagPoleY + 8);
            ctx.lineTo(flagPoleX + 3, flagPoleY + 16);
            ctx.closePath();
            ctx.fill();
            
            // Flag details (Mushroom Kingdom emblem)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(flagPoleX + 12, flagPoleY + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            });
        }
        
        // Piranha plants (render behind pipes) - now handled by entity system
        
        // Piranha plants (render behind pipes)
        game.entityManager.query('transform', 'sprite').forEach(entity => {
            if (entity.id.startsWith('piranha')) {
                const transform = entity.get('transform');
                const sprite = entity.get('sprite');
                const piranhaState = sprite.state || 'hidden';
                
                if (piranhaState !== 'hidden') {
                    const fakeObject = {
                        x: transform.x,
                        y: transform.y,
                        width: transform.width,
                        height: transform.height,
                        type: 'piranha',
                        state: piranhaState,
                        alive: true
                    };
                    SpriteRenderer.enemies.piranha(ctx, fakeObject);
                }
            }
        });
        
        // Platforms
        const platformEntities = game.entityManager.query('transform', 'platform');
        platformEntities.forEach(entity => {
            const transform = entity.get('transform');
            const platformComp = entity.get('platform');
            
            if (platformComp.type === 'pipe') {
                // Pipe body - green
                ctx.fillStyle = ThemeSystem.getColor('pipe');
                ctx.fillRect(transform.x, transform.y, transform.width, transform.height);
                
                // Pipe rim (top edge) - lighter green
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(transform.x - 2, transform.y - 8, transform.width + 4, 12);
                
                // Pipe highlights
                ctx.fillStyle = '#90EE90';
                ctx.fillRect(transform.x + 2, transform.y, 2, transform.height);
                
                // Pipe shadows
                ctx.fillStyle = ThemeSystem.getColor('pipeShadow');
                ctx.fillRect(transform.x + transform.width - 2, transform.y, 2, transform.height);
            } else {
                // Use theme system for platform rendering
                ThemeSystem.renderPlatform(ctx, {
                    x: transform.x,
                    y: transform.y,
                    width: transform.width,
                    height: transform.height,
                    type: platformComp.type
                });
            }
        });
        
        // Pits (render lava for castle theme)
        if (game.pits && game.pits.length > 0) {
            game.pits.forEach(pit => {
                if (ThemeSystem.current?.name === 'Castle') {
                    // Bubbling lava pit
                    const lavaY = 380; // Ground level
                    const lavaHeight = 100;
                    
                    // Base lava
                    ctx.fillStyle = ThemeSystem.getColor('lava');
                    ctx.fillRect(pit.x, lavaY, pit.width, lavaHeight);
                    
                    // Animated bubbles
                    const time = game.frameCount * 0.1;
                    const bubbleCount = Math.floor(pit.width / 8);
                    
                    for (let i = 0; i < bubbleCount; i++) {
                        const bubbleX = pit.x + (i * 8) + Math.sin(time + i) * 2;
                        const bubbleY = lavaY + 10 + Math.sin(time * 2 + i * 0.5) * 5;
                        const bubbleSize = 2 + Math.sin(time * 3 + i) * 1;
                        
                        ctx.fillStyle = ThemeSystem.getColor('lavaBubble');
                        ctx.fillRect(bubbleX, bubbleY, bubbleSize, bubbleSize);
                    }
                    
                    // Lava glow effect
                    ctx.fillStyle = '#FF6500';
                    ctx.fillRect(pit.x, lavaY, pit.width, 3);
                }
            });
        }
        
        // Blocks
        const blockEntities = game.entityManager.query('transform', 'block');
        blockEntities.forEach(entity => {
            const transform = entity.get('transform');
            const blockComp = entity.get('block');
            
            ThemeSystem.renderBlock(ctx, {
                x: transform.x,
                y: transform.y,
                width: transform.width,
                height: transform.height,
                type: blockComp.type,
                content: blockComp.content,
                hit: blockComp.hit
            });
        });
        
        // Enemies - all now handled by entity system
        // (Piranha plants and other enemies now rendered by ImprovedRenderSystem)
        
        ctx.restore();
        
        ctx.save();
        ctx.translate(-game.camera.x, 0);
        
        // Player (with invincibility flashing)
        if (!game.player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
            SpriteRenderer.player.mario(ctx, game.player);
        }
        
        // Particles (coins, effects)
        const particleEntities = game.entityManager.query('transform', 'particle');
        particleEntities.forEach(entity => {
            const transform = entity.get('transform');
            const particle = entity.get('particle');
            
            if (particle.type === 'coin') {
                // Render animated coin
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(transform.x, transform.y, transform.width, transform.height);
                ctx.fillStyle = '#FFA500';
                ctx.fillRect(transform.x + 2, transform.y + 2, transform.width - 4, transform.height - 4);
                
                // Add score text
                ctx.fillStyle = '#FFF';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('200', transform.x + transform.width/2, transform.y - 5);
                ctx.textAlign = 'left';
            } else if (particle.type === 'debris') {
                // Render brick fragments
                ctx.fillStyle = '#CD853F';
                ctx.fillRect(transform.x, transform.y, transform.width, transform.height);
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(transform.x + 1, transform.y + 1, transform.width - 2, transform.height - 2);
            }
        });
        
        // Flag
        if (game.flag) {
            const flagPoleColor = game.currentTheme === 'underground' ? '#FFFFFF' : '#000000';
            ctx.fillStyle = flagPoleColor;
            ctx.fillRect(game.flag.x, game.flag.y, 5, game.flag.height);
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(game.flag.x + 5, game.flag.y, 30, 20);
        }
        
        ctx.restore();
        
        // UI
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(`Lives: ${game.player.lives}`, 10, 30);
        ctx.fillText(`Score: ${game.player.score}`, 10, 60);
        ctx.fillText(`Level: ${game.levelsCompleted + 1}/${game.levelsToWin}`, 10, 90);
        
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
        }
        
        // Render entities (power-ups, etc.) - in untranslated context
        if (game.improvedRenderSystem) {
            game.improvedRenderSystem.render(ctx, game.entityManager, game.camera);
        }
    }
    
    function gameLoop() {
        // Handle level reset if needed
        if (game.needsLevelReset) {
            game.needsLevelReset = false;
            initializeGameState(true).then(() => {
                // Continue game loop after reset
                if (!game.gameOver && !game.won) {
                    requestAnimationFrame(gameLoop);
                }
            });
            return; // Skip this frame while resetting
        }
        
        game.frameCount++;
        // updatePlayer(); // Disabled - now handled by PlayerInputSystem
        // updateMovingPlatforms(); // Disabled - now handled by PlatformMovementSystem
        // updateParticles(); // Disabled - now handled by ParticleSystem
        
        // Update Entity System - Phase 1
        game.entityManager.update();
        
        checkScreenBoundary();
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
            initializeGameState(false).then(() => {
                gameLoop();
            });
        }
        
        e.preventDefault();
    }
    
    function handleKeyUp(e) {
        game.keys[e.code] = false;
        e.preventDefault();
    }
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Classic Mario Bros platformer - jump on enemies, collect coins, reach the flag!';
    instructions.style.textAlign = 'center';
    
    gameArea.appendChild(instructions);
    gameArea.appendChild(canvas);
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Convert all question blocks to entities
    function convertQuestionBlocksToEntities() {
        let blockCount = 0;
        game.blocks.forEach(block => {
            if (block.type === 'question') {
                blockCount++;
                const blockEntity = game.entityManager.create(`question${blockCount}`)
                    .add('transform', new Transform(block.x, block.y, block.width, block.height))
                    .add('interactive', new Interactive('question', block.content || 'coin'));
            }
        });
    }
    
    // Convert all coins to entities
    function convertCoinsToEntities(layout) {
        if (!layout.coins) return;
        
        let coinCount = 0;
        layout.coins.forEach(coin => {
            coinCount++;
            const coinEntity = game.entityManager.create(`coin${coinCount}`)
                .add('transform', new Transform(coin.x, coin.y, coin.width, coin.height))
                .add('sprite', new Sprite('#FFD700', 'coin'))
                .add('collectible', new Collectible('coin', 200));
        });
    }
    
    initializeLevel().then(() => {
        convertQuestionBlocksToEntities();
        gameLoop();
    });
    } // End startMarioGame function
} // End createMarioGame function
