// Mario Game State Management
// Centralized state management with proper transitions

export class GameState {
    constructor() {
        this.current = 'loading';
        this.previous = null;
        this.data = new Map();
        this.listeners = new Map();
    }
    
    // State transition with validation
    setState(newState, data = {}) {
        const validTransitions = {
            loading: ['menu', 'playing'],
            menu: ['playing', 'settings'],
            playing: ['paused', 'gameOver', 'levelComplete', 'menu'],
            paused: ['playing', 'menu'],
            gameOver: ['menu', 'playing'],
            levelComplete: ['playing', 'menu'],
            settings: ['menu']
        };
        
        if (!validTransitions[this.current]?.includes(newState)) {
            console.warn(`Invalid state transition: ${this.current} -> ${newState}`);
            return false;
        }
        
        this.previous = this.current;
        this.current = newState;
        
        // Store state-specific data
        this.data.set(newState, { ...this.data.get(newState), ...data });
        
        // Notify listeners
        this.notifyListeners(newState, this.previous);
        
        return true;
    }
    
    // Get current state
    getState() {
        return this.current;
    }
    
    // Get state data
    getData(state = this.current) {
        return this.data.get(state) || {};
    }
    
    // Add state change listener
    onStateChange(callback) {
        const id = Math.random().toString(36);
        this.listeners.set(id, callback);
        return id;
    }
    
    // Remove listener
    removeListener(id) {
        this.listeners.delete(id);
    }
    
    // Notify all listeners
    notifyListeners(newState, oldState) {
        this.listeners.forEach(callback => {
            callback(newState, oldState, this.getData(newState));
        });
    }
    
    // Check if in specific state
    is(state) {
        return this.current === state;
    }
    
    // Check if was in specific state
    was(state) {
        return this.previous === state;
    }
}

// Game data management
export class GameData {
    constructor() {
        this.player = {
            x: 50,
            y: 300,
            lives: 3,
            score: 0,
            powerState: 'small',
            coins: 0
        };
        
        this.level = {
            current: 1,
            completed: 0,
            timeRemaining: 400,
            theme: 'overworld'
        };
        
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            smoothing: 0.1
        };
        
        this.entities = {
            platforms: [],
            enemies: [],
            powerUps: [],
            coins: [],
            blocks: [],
            particles: []
        };
        
        this.input = {
            keys: {},
            lastPressed: null,
            combos: []
        };
    }
    
    // Reset player data
    resetPlayer() {
        this.player = {
            x: 50,
            y: 300,
            lives: 3,
            score: 0,
            powerState: 'small',
            coins: 0
        };
    }
    
    // Reset level data
    resetLevel() {
        this.level.timeRemaining = 400;
        this.camera.x = 0;
        this.camera.targetX = 0;
        
        // Clear entities
        Object.keys(this.entities).forEach(key => {
            this.entities[key] = [];
        });
    }
    
    // Save game state to localStorage
    save() {
        const saveData = {
            player: this.player,
            level: this.level,
            timestamp: Date.now()
        };
        
        localStorage.setItem('mario-save', JSON.stringify(saveData));
    }
    
    // Load game state from localStorage
    load() {
        const saveData = localStorage.getItem('mario-save');
        if (saveData) {
            const parsed = JSON.parse(saveData);
            this.player = { ...this.player, ...parsed.player };
            this.level = { ...this.level, ...parsed.level };
            return true;
        }
        return false;
    }
}

// State machine for different game states
export class StateMachine {
    constructor(gameState, gameData) {
        this.gameState = gameState;
        this.gameData = gameData;
        this.states = new Map();
        this.setupStates();
    }
    
    setupStates() {
        // Loading state
        this.states.set('loading', {
            enter: () => {
                console.log('Loading game assets...');
            },
            update: () => {
                // Simulate loading
                setTimeout(() => {
                    this.gameState.setState('menu');
                }, 1000);
            },
            render: (ctx) => {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.fillStyle = '#FFF';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Loading...', ctx.canvas.width/2, ctx.canvas.height/2);
            }
        });
        
        // Menu state
        this.states.set('menu', {
            enter: () => {
                console.log('Entered menu');
            },
            update: () => {
                // Handle menu input
                if (this.gameData.input.keys['Space']) {
                    this.gameState.setState('playing');
                }
            },
            render: (ctx) => {
                ctx.fillStyle = '#5C94FC';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.fillStyle = '#FFF';
                ctx.font = '36px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('MARIO', ctx.canvas.width/2, ctx.canvas.height/2 - 50);
                ctx.font = '18px Arial';
                ctx.fillText('Press SPACE to start', ctx.canvas.width/2, ctx.canvas.height/2 + 50);
            }
        });
        
        // Playing state
        this.states.set('playing', {
            enter: () => {
                console.log('Game started');
            },
            update: () => {
                // Main game update logic
                if (this.gameData.input.keys['KeyP']) {
                    this.gameState.setState('paused');
                }
            },
            render: (ctx) => {
                // Main game rendering
                this.renderGame(ctx);
            }
        });
        
        // Paused state
        this.states.set('paused', {
            enter: () => {
                console.log('Game paused');
            },
            update: () => {
                if (this.gameData.input.keys['KeyP']) {
                    this.gameState.setState('playing');
                }
            },
            render: (ctx) => {
                // Render game with pause overlay
                this.renderGame(ctx);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.fillStyle = '#FFF';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('PAUSED', ctx.canvas.width/2, ctx.canvas.height/2);
            }
        });
    }
    
    getCurrentState() {
        return this.states.get(this.gameState.getState());
    }
    
    update() {
        const state = this.getCurrentState();
        state?.update();
    }
    
    render(ctx) {
        const state = this.getCurrentState();
        state?.render(ctx);
    }
    
    renderGame(ctx) {
        // Placeholder for main game rendering
        ctx.fillStyle = '#5C94FC';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Render player
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.gameData.player.x, this.gameData.player.y, 16, 16);
    }
}
