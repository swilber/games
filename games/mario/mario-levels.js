// Level configuration system for Mario game
const LevelManager = {
    // Enemy behavior definitions
    enemyTypes: {
        goomba: { vx: -0.5, width: 20, height: 20, health: 1 },
        koopa: { vx: -1, width: 20, height: 20, health: 2 },
        // Easy to add new enemies:
        // spiny: { vx: -0.3, width: 18, height: 18, health: 1 },
        // piranha: { vx: 0, width: 24, height: 32, health: 1, behavior: 'vertical' }
    },
    
    // Block type definitions
    blockTypes: {
        brick: { breakable: true, points: 50 },
        question: { breakable: false, points: 200 },
        // metal: { breakable: false, points: 0 }
    },
    
    // Power-up definitions
    powerUpTypes: {
        mushroom: { points: 1000, effect: 'grow' },
        fireflower: { points: 1000, effect: 'fire' },
        // star: { points: 1000, effect: 'invincible' },
        // oneup: { points: 0, effect: 'extralife' }
    },
    
    // Level templates for easy creation
    createLevel: (config) => ({
        platforms: config.platforms || [],
        blocks: config.blocks || [],
        enemies: config.enemies || [],
        coins: config.coins || [],
        pits: config.pits || [],
        theme: config.theme || 'overworld',
        music: config.music || 'overworld',
        timeLimit: config.timeLimit || 400
    }),
    
    // Pre-built level components
    components: {
        // Standard ground section
        ground: (startX, width) => ({
            x: startX, y: 370, width: width, height: 30, type: 'ground'
        }),
        
        // Standard pit
        pit: (x, width = 64) => ({ x: x, width: width }),
        
        // Pipe generator
        pipe: (x, height = 66) => ({
            x: x, y: 370 - height, width: 32, height: height, type: 'pipe'
        }),
        
        // Block stairs
        stairs: (startX, startY, steps, direction = 1) => {
            const blocks = [];
            for (let i = 0; i < steps; i++) {
                blocks.push({
                    x: startX + (i * 32 * direction),
                    y: startY - (i * 32),
                    width: 32, height: 32,
                    type: 'brick'
                });
            }
            return blocks;
        }
    }
};
