// Mario Entity System Migration Helper
// Gradually convert existing game to use entity system

import { 
    EntityManager, 
    PhysicsSystem, 
    AISystem, 
    RenderSystem, 
    EntityFactory 
} from './mario-entity-system.js';

class MarioEntityMigration {
    constructor(existingGame) {
        this.game = existingGame;
        this.entityManager = new EntityManager();
        this.setupSystems();
        this.migrateEntities();
    }
    
    setupSystems() {
        this.entityManager.addSystem(new PhysicsSystem());
        this.entityManager.addSystem(new AISystem());
        this.renderSystem = new RenderSystem();
        this.entityManager.addSystem(this.renderSystem);
    }
    
    migrateEntities() {
        // Convert player
        if (this.game.player) {
            const player = EntityFactory.createPlayer(
                this.game.player.x, 
                this.game.player.y
            );
            
            // Copy existing player properties
            const health = player.get('health');
            health.lives = this.game.player.lives;
            
            const physics = player.get('physics');
            physics.vx = this.game.player.vx || 0;
            physics.vy = this.game.player.vy || 0;
            
            this.playerEntity = player;
        }
        
        // Convert enemies
        if (this.game.enemies) {
            this.game.enemies.forEach(enemy => {
                let entity;
                
                switch (enemy.type) {
                    case 'goomba':
                        entity = EntityFactory.createGoomba(enemy.x, enemy.y);
                        break;
                    case 'koopa':
                        entity = EntityFactory.createKoopa(enemy.x, enemy.y);
                        break;
                    default:
                        entity = EntityFactory.createGoomba(enemy.x, enemy.y);
                }
                
                // Copy existing properties
                const physics = entity.get('physics');
                physics.vx = enemy.vx || -1;
                physics.vy = enemy.vy || 0;
            });
        }
        
        // Convert platforms
        if (this.game.platforms) {
            this.game.platforms.forEach(platform => {
                EntityFactory.createPlatform(
                    platform.x, 
                    platform.y, 
                    platform.width, 
                    platform.height
                );
            });
        }
        
        // Convert coins
        if (this.game.coins) {
            this.game.coins.forEach(coin => {
                if (!coin.collected) {
                    EntityFactory.createCoin(coin.x, coin.y);
                }
            });
        }
    }
    
    // Update method that can be called from existing game loop
    update() {
        this.entityManager.update();
        
        // Sync player entity back to game object for compatibility
        if (this.playerEntity) {
            const transform = this.playerEntity.get('transform');
            const physics = this.playerEntity.get('physics');
            const health = this.playerEntity.get('health');
            
            this.game.player.x = transform.x;
            this.game.player.y = transform.y;
            this.game.player.vx = physics.vx;
            this.game.player.vy = physics.vy;
            this.game.player.onGround = physics.onGround;
            this.game.player.lives = health.lives;
        }
    }
    
    // Render method that can be called from existing render function
    render(ctx) {
        this.renderSystem.render(ctx, this.entityManager);
    }
    
    // Helper methods for gradual migration
    getPlayerEntity() {
        return this.playerEntity;
    }
    
    getEnemyEntities() {
        return this.entityManager.query('ai');
    }
    
    getPlatformEntities() {
        return this.entityManager.query('transform', 'sprite').filter(e => 
            !e.has('physics') && !e.has('ai')
        );
    }
}

// Usage example for gradual migration:
/*
// In existing mario.js, add this to the game initialization:
const entityMigration = new MarioEntityMigration(game);

// In the game loop, add:
entityMigration.update();

// In the render function, optionally add:
entityMigration.render(ctx);

// Gradually replace existing systems:
// 1. Replace enemy AI with entity system
// 2. Replace physics with entity system  
// 3. Replace rendering with entity system
// 4. Remove old code once everything works
*/

export { MarioEntityMigration };
