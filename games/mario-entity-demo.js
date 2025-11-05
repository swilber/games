// Mario Entity System Demo
// Standalone demo showing the entity system in action

import { 
    EntityManager, 
    PhysicsSystem, 
    AISystem, 
    RenderSystem, 
    EntityFactory 
} from './mario-entity-system.js';

function createEntityDemo() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.border = '2px solid #000';
    
    const ctx = canvas.getContext('2d');
    const entityManager = new EntityManager();
    
    // Setup systems
    entityManager.addSystem(new PhysicsSystem());
    entityManager.addSystem(new AISystem());
    const renderSystem = new RenderSystem();
    
    // Create entities
    const player = EntityFactory.createPlayer(50, 300);
    const goomba1 = EntityFactory.createGoomba(200, 334);
    const goomba2 = EntityFactory.createGoomba(400, 334);
    const koopa = EntityFactory.createKoopa(600, 326);
    const platform = EntityFactory.createPlatform(0, 366, 800, 34);
    const coin1 = EntityFactory.createCoin(150, 300);
    const coin2 = EntityFactory.createCoin(350, 300);
    
    // Input handling
    const keys = {};
    document.addEventListener('keydown', (e) => keys[e.code] = true);
    document.addEventListener('keyup', (e) => keys[e.code] = false);
    
    function gameLoop() {
        // Handle player input
        const playerTransform = player.get('transform');
        const playerPhysics = player.get('physics');
        
        if (keys['ArrowLeft'] || keys['KeyA']) {
            playerPhysics.vx = -3;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
            playerPhysics.vx = 3;
        } else {
            playerPhysics.vx *= 0.8;
        }
        
        if ((keys['ArrowUp'] || keys['Space']) && playerPhysics.onGround) {
            playerPhysics.vy = -12;
        }
        
        // Update all systems
        entityManager.update();
        
        // Render
        ctx.fillStyle = '#5C94FC';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        renderSystem.render(ctx, entityManager);
        
        // Show entity count
        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.fillText(`Entities: ${entityManager.entities.size}`, 10, 30);
        
        requestAnimationFrame(gameLoop);
    }
    
    // Add to page
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
        gameArea.innerHTML = '';
        
        const title = document.createElement('h3');
        title.textContent = 'Entity System Demo';
        title.style.textAlign = 'center';
        
        const instructions = document.createElement('p');
        instructions.textContent = 'Arrow keys or WASD to move, Space to jump';
        instructions.style.textAlign = 'center';
        
        gameArea.appendChild(title);
        gameArea.appendChild(instructions);
        gameArea.appendChild(canvas);
        
        gameLoop();
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.createEntityDemo = createEntityDemo;
}

export { createEntityDemo };
