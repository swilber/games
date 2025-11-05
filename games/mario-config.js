// Mario Game Configuration
// Centralized configuration for easy modification

export const GameConfig = {
    // Canvas settings
    canvas: {
        width: 800,
        height: 400,
        backgroundColor: '#5C94FC'
    },
    
    // Physics constants
    physics: {
        gravity: 0.5,
        jumpPower: -12,
        walkSpeed: 3,
        runSpeed: 5,
        friction: 0.8,
        terminalVelocity: 15
    },
    
    // Player settings
    player: {
        width: 16,
        height: 16,
        startLives: 3,
        invincibilityTime: 120, // frames
        shootCooldown: 20,
        powerStates: {
            small: { width: 16, height: 16 },
            big: { width: 16, height: 32 },
            fire: { width: 16, height: 32 }
        }
    },
    
    // Enemy settings
    enemies: {
        goomba: {
            width: 16,
            height: 16,
            speed: -1,
            points: 100
        },
        koopa: {
            width: 16,
            height: 24,
            speed: -1,
            points: 200,
            shellSpeed: 4
        },
        piranha: {
            width: 16,
            height: 24,
            emergeTime: 120,
            hideTime: 60
        }
    },
    
    // Level settings
    level: {
        tileSize: 16,
        groundY: 370,
        groundHeight: 30,
        levelWidth: 4000,
        scrollSpeed: 3
    },
    
    // Themes configuration
    themes: {
        overworld: {
            name: 'Overworld',
            colors: {
                sky: '#5C94FC',
                ground: '#8B4513',
                groundShadow: '#654321',
                pipe: '#00FF00',
                brick: '#CC6600',
                question: '#FFD700'
            }
        },
        underground: {
            name: 'Underground',
            colors: {
                sky: '#000000',
                ground: '#4682B4',
                groundShadow: '#2F4F4F',
                brick: '#5F9EA0',
                question: '#FFD700'
            }
        },
        castle: {
            name: 'Castle',
            colors: {
                sky: '#000000',
                ground: '#808080',
                groundShadow: '#404040',
                lava: '#FF4500',
                lavaBubble: '#FFFF00'
            }
        }
    },
    
    // Input mappings
    controls: {
        left: ['ArrowLeft', 'KeyA'],
        right: ['ArrowRight', 'KeyD'],
        jump: ['ArrowUp', 'Space'],
        run: ['ShiftLeft', 'ShiftRight'],
        fire: ['KeyX', 'KeyZ'],
        pause: ['KeyP'],
        restart: ['KeyR']
    },
    
    // Audio settings (for future implementation)
    audio: {
        enabled: true,
        volume: 0.7,
        sounds: {
            jump: 'jump.wav',
            coin: 'coin.wav',
            powerup: 'powerup.wav',
            stomp: 'stomp.wav'
        }
    },
    
    // Scoring system
    scoring: {
        coin: 200,
        goomba: 100,
        koopa: 200,
        flagPole: 5000,
        timeBonus: 50,
        combo: {
            multiplier: 2,
            maxMultiplier: 8
        }
    }
};

// Utility functions for configuration
export const ConfigUtils = {
    // Get nested config value safely
    get(path, defaultValue = null) {
        return path.split('.').reduce((obj, key) => 
            obj && obj[key] !== undefined ? obj[key] : defaultValue, GameConfig);
    },
    
    // Override config values
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, GameConfig);
        target[lastKey] = value;
    },
    
    // Merge theme configurations
    mergeTheme(themeName, overrides) {
        const theme = GameConfig.themes[themeName];
        if (theme) {
            Object.assign(theme, overrides);
        }
    }
};
