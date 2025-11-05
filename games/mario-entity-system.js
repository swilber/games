// Mario Entity System - Minimal but extensible

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
    
    remove(name) {
        this.components.delete(name);
        return this;
    }
}

// Core Components
class Transform {
    constructor(x = 0, y = 0, width = 16, height = 16) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

class Physics {
    constructor(vx = 0, vy = 0) {
        this.vx = vx;
        this.vy = vy;
        this.gravity = 0.5;
        this.onGround = false;
    }
}

class Sprite {
    constructor(color = '#FF0000') {
        this.color = color;
        this.facingRight = true;
    }
}

class Health {
    constructor(lives = 3) {
        this.lives = lives;
        this.invincible = false;
        this.invincibleTimer = 0;
    }
}

class AI {
    constructor(type = 'patrol') {
        this.type = type;
        this.state = 'active';
        this.direction = -1;
    }
}

class Interactive {
    constructor(type = 'question', contents = 'coin') {
        this.type = type;
        this.contents = contents;
        this.used = false;
    }
}

// Entity Manager
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
    
    get(id) {
        return this.entities.get(id);
    }
    
    destroy(id) {
        this.entities.delete(id);
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

// Systems
class PhysicsSystem {
    update(entityManager) {
        const entities = entityManager.query('transform', 'physics');
        
        entities.forEach(entity => {
            const transform = entity.get('transform');
            const physics = entity.get('physics');
            
            // Apply gravity
            physics.vy += physics.gravity;
            
            // Update position
            transform.x += physics.vx;
            transform.y += physics.vy;
            
            // Simple ground collision
            if (transform.y > 350) {
                transform.y = 350;
                physics.vy = 0;
                physics.onGround = true;
            } else {
                physics.onGround = false;
            }
        });
    }
}

class AISystem {
    update(entityManager) {
        const entities = entityManager.query('transform', 'physics', 'ai');
        
        entities.forEach(entity => {
            const transform = entity.get('transform');
            const physics = entity.get('physics');
            const ai = entity.get('ai');
            
            if (ai.type === 'patrol') {
                physics.vx = ai.direction;
                
                // Reverse at boundaries
                if (transform.x <= 0 || transform.x >= 800 - transform.width) {
                    ai.direction *= -1;
                }
            }
        });
    }
}

class RenderSystem {
    update(entityManager) {
        // This will be called from the main render loop
    }
    
    render(ctx, entityManager) {
        const entities = entityManager.query('transform', 'sprite');
        
        entities.forEach(entity => {
            const transform = entity.get('transform');
            const sprite = entity.get('sprite');
            
            ctx.fillStyle = sprite.color;
            ctx.fillRect(transform.x, transform.y, transform.width, transform.height);
        });
    }
}

// Entity Factory
class EntityFactory {
    static createPlayer(x, y) {
        return new Entity('player')
            .add('transform', new Transform(x, y, 16, 16))
            .add('physics', new Physics(0, 0))
            .add('sprite', new Sprite('#FF0000'))
            .add('health', new Health(3));
    }
    
    static createGoomba(x, y) {
        return new Entity()
            .add('transform', new Transform(x, y, 16, 16))
            .add('physics', new Physics(-1, 0))
            .add('sprite', new Sprite('#8B4513'))
            .add('ai', new AI('patrol'));
    }
    
    static createKoopa(x, y) {
        return new Entity()
            .add('transform', new Transform(x, y, 16, 24))
            .add('physics', new Physics(-1, 0))
            .add('sprite', new Sprite('#00FF00'))
            .add('ai', new AI('patrol'));
    }
    
    static createPlatform(x, y, width, height) {
        return new Entity()
            .add('transform', new Transform(x, y, width, height))
            .add('sprite', new Sprite('#00AA00'));
    }
    
    static createCoin(x, y) {
        return new Entity()
            .add('transform', new Transform(x, y, 12, 12))
            .add('sprite', new Sprite('#FFD700'));
    }
    
    static createQuestionBlock(x, y, contents = 'coin') {
        return new Entity()
            .add('transform', new Transform(x, y, 16, 16))
            .add('sprite', new Sprite('#FFAA00'))
            .add('interactive', new Interactive('question', contents));
    }
    
    static createBrickBlock(x, y) {
        return new Entity()
            .add('transform', new Transform(x, y, 16, 16))
            .add('sprite', new Sprite('#AA5500'))
            .add('interactive', new Interactive('brick'));
    }
    
    static createPipe(x, y, height = 32) {
        return new Entity()
            .add('transform', new Transform(x, y, 32, height))
            .add('sprite', new Sprite('#00AA00'));
    }
}

export { 
    Entity, 
    Transform, 
    Physics, 
    Sprite, 
    Health, 
    AI,
    Interactive,
    EntityManager, 
    PhysicsSystem, 
    AISystem, 
    RenderSystem, 
    EntityFactory 
};
