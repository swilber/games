// Mario Game - Simplified Collision System
// Clean, extensible collision detection

class CollisionSystem {
    constructor() {
        this.spatialGrid = new SpatialGrid(64); // 64px grid cells
        this.collisionPairs = new Map();
    }
    
    // Simple AABB collision check
    static checkAABB(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    // Get collision overlap amounts
    static getOverlap(a, b) {
        const overlapX = Math.min(a.x + a.width - b.x, b.x + b.width - a.x);
        const overlapY = Math.min(a.y + a.height - b.y, b.y + b.height - a.y);
        return { x: overlapX, y: overlapY };
    }
    
    // Determine collision direction
    static getCollisionSide(moving, stationary) {
        const centerX = moving.x + moving.width / 2;
        const centerY = moving.y + moving.height / 2;
        const targetCenterX = stationary.x + stationary.width / 2;
        const targetCenterY = stationary.y + stationary.height / 2;
        
        const dx = centerX - targetCenterX;
        const dy = centerY - targetCenterY;
        
        const overlap = CollisionSystem.getOverlap(moving, stationary);
        
        // Determine which axis has less overlap (collision direction)
        if (overlap.x < overlap.y) {
            return dx > 0 ? 'left' : 'right';
        } else {
            return dy > 0 ? 'top' : 'bottom';
        }
    }
    
    update(entities) {
        // Clear and rebuild spatial grid
        this.spatialGrid.clear();
        
        // Add all entities to spatial grid
        entities.forEach(entity => {
            if (entity.collider) {
                this.spatialGrid.add(entity);
            }
        });
        
        // Check collisions using spatial grid
        entities.forEach(entity => {
            if (!entity.collider) return;
            
            const nearby = this.spatialGrid.getNearby(entity);
            nearby.forEach(other => {
                if (entity === other) return;
                
                if (CollisionSystem.checkAABB(entity, other)) {
                    this.handleCollision(entity, other);
                }
            });
        });
    }
    
    handleCollision(a, b) {
        // Get collision handlers for both entities
        const handlerA = CollisionHandlers[a.type];
        const handlerB = CollisionHandlers[b.type];
        
        // Call collision handlers
        if (handlerA && handlerA[b.type]) {
            handlerA[b.type](a, b);
        }
        if (handlerB && handlerB[a.type]) {
            handlerB[a.type](b, a);
        }
    }
}

// Spatial grid for performance optimization
class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }
    
    clear() {
        this.grid.clear();
    }
    
    getKey(x, y) {
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        return `${gridX},${gridY}`;
    }
    
    add(entity) {
        // Add entity to all cells it overlaps
        const startX = Math.floor(entity.x / this.cellSize);
        const endX = Math.floor((entity.x + entity.width) / this.cellSize);
        const startY = Math.floor(entity.y / this.cellSize);
        const endY = Math.floor((entity.y + entity.height) / this.cellSize);
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                this.grid.get(key).push(entity);
            }
        }
    }
    
    getNearby(entity) {
        const nearby = new Set();
        const startX = Math.floor(entity.x / this.cellSize);
        const endX = Math.floor((entity.x + entity.width) / this.cellSize);
        const startY = Math.floor(entity.y / this.cellSize);
        const endY = Math.floor((entity.y + entity.height) / this.cellSize);
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                const cell = this.grid.get(key);
                if (cell) {
                    cell.forEach(other => nearby.add(other));
                }
            }
        }
        
        return Array.from(nearby);
    }
}

// Collision response handlers
const CollisionHandlers = {
    player: {
        platform: (player, platform) => {
            const side = CollisionSystem.getCollisionSide(player, platform);
            
            switch (side) {
                case 'top':
                    player.y = platform.y - player.height;
                    player.vy = 0;
                    player.onGround = true;
                    break;
                case 'bottom':
                    player.y = platform.y + platform.height;
                    player.vy = 0;
                    break;
                case 'left':
                    player.x = platform.x - player.width;
                    player.vx = 0;
                    break;
                case 'right':
                    player.x = platform.x + platform.width;
                    player.vx = 0;
                    break;
            }
        },
        
        enemy: (player, enemy) => {
            if (player.invincible) return;
            
            const side = CollisionSystem.getCollisionSide(player, enemy);
            
            if (side === 'top' && player.vy > 0) {
                // Stomp enemy
                enemy.alive = false;
                player.vy = -8;
                player.score += 100;
            } else {
                // Take damage
                if (player.powerState === 'big' || player.powerState === 'fire') {
                    player.powerState = 'small';
                    player.height = 16;
                } else {
                    player.lives--;
                    if (player.lives <= 0) {
                        // Game over
                    } else {
                        // Reset level
                    }
                }
                player.invincible = true;
                player.invincibleTimer = 120;
            }
        },
        
        coin: (player, coin) => {
            if (!coin.collected) {
                coin.collected = true;
                player.score += 200;
                player.coins++;
            }
        },
        
        powerup: (player, powerup) => {
            switch (powerup.type) {
                case 'mushroom':
                    if (player.powerState === 'small') {
                        player.powerState = 'big';
                        player.height = 32;
                        player.y -= 16;
                    }
                    break;
                case 'fireflower':
                    player.powerState = 'fire';
                    player.height = 32;
                    if (player.height === 16) player.y -= 16;
                    break;
            }
            powerup.collected = true;
            player.score += 1000;
        }
    },
    
    enemy: {
        platform: (enemy, platform) => {
            const side = CollisionSystem.getCollisionSide(enemy, platform);
            
            switch (side) {
                case 'top':
                    enemy.y = platform.y - enemy.height;
                    enemy.vy = 0;
                    enemy.onGround = true;
                    break;
                case 'left':
                case 'right':
                    enemy.vx *= -1; // Reverse direction
                    break;
            }
        }
    }
};

// Simple collision component
class Collider {
    constructor(type, solid = true) {
        this.type = type;
        this.solid = solid;
        this.triggers = []; // What this collider responds to
    }
}

// Usage example:
function setupCollisionSystem(game) {
    const collision = new CollisionSystem();
    
    // Add colliders to entities
    game.player.collider = new Collider('player');
    game.player.type = 'player';
    
    game.platforms.forEach(platform => {
        platform.collider = new Collider('platform');
        platform.type = 'platform';
    });
    
    game.enemies.forEach(enemy => {
        enemy.collider = new Collider('enemy');
        enemy.type = 'enemy';
    });
    
    return collision;
}

export { CollisionSystem, CollisionHandlers, Collider };
