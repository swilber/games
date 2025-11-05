// Mario Game - Refactored Architecture
// Modular design for better extensibility

// Core Game Engine
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.frameCount = 0;
        this.running = false;
        this.systems = new Map();
    }
    
    addSystem(name, system) {
        this.systems.set(name, system);
        system.init?.(this);
    }
    
    start() {
        this.running = true;
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.running) return;
        
        this.frameCount++;
        
        // Update all systems
        for (const [name, system] of this.systems) {
            system.update?.(this);
        }
        
        // Render all systems
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const [name, system] of this.systems) {
            system.render?.(this.ctx, this);
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Entity Component System
class Entity {
    constructor() {
        this.components = new Map();
        this.id = Math.random().toString(36);
    }
    
    addComponent(name, component) {
        this.components.set(name, component);
        return this;
    }
    
    getComponent(name) {
        return this.components.get(name);
    }
    
    hasComponent(name) {
        return this.components.has(name);
    }
}

// Components
class Transform {
    constructor(x = 0, y = 0, width = 16, height = 16) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

class Physics {
    constructor(vx = 0, vy = 0, gravity = 0.5) {
        this.vx = vx;
        this.vy = vy;
        this.gravity = gravity;
        this.onGround = false;
    }
}

class Sprite {
    constructor(color = '#FF0000', type = 'rect') {
        this.color = color;
        this.type = type;
    }
}

class Health {
    constructor(lives = 3) {
        this.lives = lives;
        this.invincible = false;
        this.invincibleTimer = 0;
    }
}

// Systems
class PhysicsSystem {
    update(engine) {
        engine.entities?.forEach(entity => {
            const transform = entity.getComponent('transform');
            const physics = entity.getComponent('physics');
            
            if (!transform || !physics) return;
            
            // Apply gravity
            physics.vy += physics.gravity;
            
            // Update position
            transform.x += physics.vx;
            transform.y += physics.vy;
            
            // Ground collision (simplified)
            if (transform.y > 350) {
                transform.y = 350;
                physics.vy = 0;
                physics.onGround = true;
            }
        });
    }
}

class RenderSystem {
    render(ctx, engine) {
        engine.entities?.forEach(entity => {
            const transform = entity.getComponent('transform');
            const sprite = entity.getComponent('sprite');
            
            if (!transform || !sprite) return;
            
            ctx.fillStyle = sprite.color;
            ctx.fillRect(transform.x, transform.y, transform.width, transform.height);
        });
    }
}

class InputSystem {
    constructor() {
        this.keys = {};
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    update(engine) {
        // Handle player input
        const player = engine.entities?.find(e => e.hasComponent('player'));
        if (!player) return;
        
        const transform = player.getComponent('transform');
        const physics = player.getComponent('physics');
        
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            physics.vx = -3;
        } else if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            physics.vx = 3;
        } else {
            physics.vx *= 0.8; // Friction
        }
        
        if ((this.keys['ArrowUp'] || this.keys['Space']) && physics.onGround) {
            physics.vy = -12;
            physics.onGround = false;
        }
    }
}

// Level System
class LevelSystem {
    constructor() {
        this.currentLevel = null;
        this.themes = new Map();
    }
    
    addTheme(name, theme) {
        this.themes.set(name, theme);
    }
    
    loadLevel(levelData) {
        this.currentLevel = levelData;
        // Create entities from level data
    }
}

// Factory for creating game objects
class EntityFactory {
    static createPlayer(x, y) {
        return new Entity()
            .addComponent('transform', new Transform(x, y, 16, 16))
            .addComponent('physics', new Physics())
            .addComponent('sprite', new Sprite('#FF0000'))
            .addComponent('health', new Health(3))
            .addComponent('player', {});
    }
    
    static createGoomba(x, y) {
        return new Entity()
            .addComponent('transform', new Transform(x, y, 16, 16))
            .addComponent('physics', new Physics(-1, 0))
            .addComponent('sprite', new Sprite('#8B4513'))
            .addComponent('enemy', { type: 'goomba' });
    }
    
    static createPlatform(x, y, width, height) {
        return new Entity()
            .addComponent('transform', new Transform(x, y, width, height))
            .addComponent('sprite', new Sprite('#00FF00'))
            .addComponent('platform', {});
    }
}

// Usage example
function createMarioGame(settings) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    
    const engine = new GameEngine(canvas);
    
    // Add systems
    engine.addSystem('input', new InputSystem());
    engine.addSystem('physics', new PhysicsSystem());
    engine.addSystem('render', new RenderSystem());
    engine.addSystem('level', new LevelSystem());
    
    // Create entities
    engine.entities = [
        EntityFactory.createPlayer(50, 300),
        EntityFactory.createGoomba(300, 334),
        EntityFactory.createPlatform(0, 366, 800, 34)
    ];
    
    document.getElementById('game-area').appendChild(canvas);
    engine.start();
}

// Export for use
if (typeof module !== 'undefined') {
    module.exports = { createMarioGame, GameEngine, EntityFactory };
}
