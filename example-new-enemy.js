// Example: Adding a new "Spiny" enemy

// 1. Add sprite rendering
SpriteRenderer.enemies.spiny = (ctx, enemy) => {
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    
    // Spikes
    ctx.fillStyle = '#000';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(enemy.x + i * 5, enemy.y - 2, 2, 4);
    }
};

// 2. Add enemy behavior
LevelManager.enemyTypes.spiny = { 
    vx: -0.3, 
    width: 18, 
    height: 18, 
    health: 1,
    dangerous: true // Can't jump on it
};

// 3. Use in level
const newLevel = LevelManager.createLevel({
    platforms: [
        LevelManager.components.ground(0, 500),
        LevelManager.components.ground(600, 400)
    ],
    enemies: [
        { x: 200, type: 'spiny' },
        { x: 350, type: 'goomba' }
    ]
});
