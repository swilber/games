// Progress tracking system
const ProgressTracker = {
    getProgress() {
        const saved = localStorage.getItem('arcadeChallengesProgress');
        return saved ? JSON.parse(saved) : { completed: [], currentLevel: 0 };
    },
    
    saveProgress(progress) {
        localStorage.setItem('arcadeChallengesProgress', JSON.stringify(progress));
    },
    
    markCompleted(levelIndex) {
        const progress = this.getProgress();
        if (!progress.completed.includes(levelIndex)) {
            progress.completed.push(levelIndex);
        }
        // Only unlock the immediate next level
        progress.currentLevel = Math.max(progress.currentLevel, levelIndex + 1);
        this.saveProgress(progress);
    },
    
    isCompleted(levelIndex) {
        return this.getProgress().completed.includes(levelIndex);
    },
    
    getCurrentLevel() {
        return this.getProgress().currentLevel;
    }
};

let currentLevel = 0;
let gameWon = false;
let selectedLevel = 0;
let unlockedLevels = [];
let levels = [];
let config = {};
let gameConfigs = {};
let currentGameInstance = null;

// Configuration Manager
class ConfigManager {
    constructor() {
        this.configs = {};
        this.defaults = {};
    }
    
    async loadConfig(gameType) {
        // Load default config from JSON file
        if (!this.defaults[gameType]) {
            try {
                // Try game-specific config directory first
                let configPath = `games/${gameType}/config/${gameType}.json?t=${Date.now()}`;
                let response = await fetch(configPath);
                
                // Fallback to old config location
                if (!response.ok) {
                    configPath = `config/games/${gameType}.json?t=${Date.now()}`;
                    response = await fetch(configPath);
                }
                
                // Final fallback to root config
                if (!response.ok) {
                    configPath = `config/${gameType}.json?t=${Date.now()}`;
                    response = await fetch(configPath);
                }
                
                this.defaults[gameType] = await response.json();
            } catch (error) {
                console.warn(`No config file found for ${gameType}, using empty config`);
                this.defaults[gameType] = {};
            }
        }
        
        // Load from localStorage and merge with defaults
        const storageKey = `config_${gameType}`;
        const savedConfig = localStorage.getItem(storageKey);
        const userConfig = savedConfig ? JSON.parse(savedConfig) : {};
        
        this.configs[gameType] = this.deepMerge(this.defaults[gameType], userConfig);
        return this.configs[gameType];
    }
    
    saveConfig(gameType, config) {
        this.configs[gameType] = config;
        localStorage.setItem(`config_${gameType}`, JSON.stringify(config));
    }
    
    async resetConfig(gameType) {
        console.log(`Resetting config for ${gameType}`);
        
        // Clear cached defaults to force reload from file
        delete this.defaults[gameType];
        delete this.configs[gameType];
        
        // Load fresh defaults from file
        console.log(`Loading fresh config for ${gameType}`);
        await this.loadConfig(gameType);
        
        console.log(`Loaded defaults for ${gameType}:`, this.defaults[gameType]);
        
        if (this.defaults[gameType]) {
            this.configs[gameType] = JSON.parse(JSON.stringify(this.defaults[gameType]));
            localStorage.removeItem(`config_${gameType}`);
            console.log(`Reset config for ${gameType}:`, this.configs[gameType]);
            return this.configs[gameType];
        } else {
            console.error(`No default config found for ${gameType}`);
            return {};
        }
    }
    
    getConfig(gameType) {
        return this.configs[gameType] || {};
    }
    
    deepMerge(target, source) {
        const result = JSON.parse(JSON.stringify(target));
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }
}

const configManager = new ConfigManager();

let currentConfigTab = 'mario';
let currentGameConfig = {};
let originalConfig = {}; // Track original config for change detection

// System Configuration Functions
function showConfigType(type) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide sections
    document.getElementById('system-config').classList.toggle('hidden', type !== 'system');
    document.getElementById('game-config').classList.toggle('hidden', type !== 'game');
    
    // Show/hide game config buttons
    document.getElementById('game-config-buttons').classList.toggle('hidden', type !== 'game');
    
    // Load system config state if showing system tab
    if (type === 'system') {
        loadSystemConfig();
    } else if (type === 'game') {
        // Load default game config if switching to game tab
        showConfigTab('mario');
    }
}

function loadSystemConfig() {
    // Load show game names setting
    const showGameNames = localStorage.getItem('showGameNames') !== 'false';
    document.getElementById('show-game-names').checked = showGameNames;
    
    // Load bypass questions setting
    const bypassQuestions = localStorage.getItem('bypassQuestions') === 'true';
    document.getElementById('bypass-questions').checked = bypassQuestions;
    
    // Update reset button color based on progress data
    updateResetButtonState();
}

function toggleBypassQuestions() {
    const bypass = document.getElementById('bypass-questions').checked;
    localStorage.setItem('bypassQuestions', bypass);
}

function updateResetButtonState() {
    const resetButton = document.querySelector('button[onclick="resetLevelProgress()"]');
    if (!resetButton) return;
    
    // Check if there's any progress data to clear
    let hasProgressData = false;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('level_') || key.startsWith('progress_') || key === 'currentLevel' || key === 'arcadeChallengesProgress') {
            hasProgressData = true;
            break;
        }
    }
    
    if (hasProgressData) {
        resetButton.style.background = '#ff4444';
        resetButton.style.color = 'white';
        resetButton.disabled = false;
    } else {
        resetButton.style.background = '#666';
        resetButton.style.color = '#999';
        resetButton.disabled = true;
    }
}

function toggleGameNames() {
    const showNames = document.getElementById('show-game-names').checked;
    localStorage.setItem('showGameNames', showNames);
    
    // Update level buttons immediately
    showLevelSelect();
}

function resetLevelProgress() {
    // Clear all progress-related localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('level_') || key.startsWith('progress_') || key === 'currentLevel' || key === 'arcadeChallengesProgress') {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Reset progress tracker
    if (window.ProgressTracker) {
        window.ProgressTracker.currentLevel = 1;
        window.ProgressTracker.completedLevels = new Set();
        // Force save the reset state
        window.ProgressTracker.saveProgress();
    }
    
    // Refresh the level selection display
    showLevelSelect();
    
    // Update button state
    updateResetButtonState();
}
// Configuration Modal Functions
async function openConfigModal() {
    document.getElementById('config-modal').classList.remove('hidden');
    // Prevent background scrolling but allow modal content scrolling
    document.body.style.overflow = 'hidden';
    showConfigType('system');
}

function closeConfigModal() {
    document.getElementById('config-modal').classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
}

async function showConfigTab(gameType) {
    currentConfigTab = gameType;
    
    // Update dropdown selection
    const gameSelect = document.getElementById('game-select');
    if (gameSelect) {
        gameSelect.value = gameType;
    }
    
    // Load and display config
    currentGameConfig = await configManager.loadConfig(gameType);
    originalConfig = JSON.parse(JSON.stringify(currentGameConfig)); // Deep copy
    generateConfigForm(gameType, currentGameConfig);
    updateSaveButtonState();
}

function generateConfigForm(gameType, config) {
    const content = document.getElementById('config-content');
    content.innerHTML = '';
    
    if (gameType === 'mario') {
        generateMarioConfigForm(config, content);
    } else if (gameType === 'pacman') {
        generatePacmanConfigForm(config, content);
    } else if (gameType === 'snake') {
        generateSnakeConfigForm(config, content);
    } else if (gameType === 'breakout') {
        generateBreakoutConfigForm(config, content);
    } else if (gameType === 'memory') {
        generateMemoryConfigForm(config, content);
    } else if (gameType === 'fake') {
        generateFakeConfigForm(config, content);
    } else if (gameType === 'tetris') {
        generateTetrisConfigForm(config, content);
    } else if (gameType === 'punchout') {
        generatePunchoutConfigForm(config, content);
    } else if (gameType === 'flappy') {
        generateFlappyConfigForm(config, content);
    } else if (gameType === 'frogger') {
        generateFroggerConfigForm(config, content);
    } else if (gameType === 'maze3d') {
        generateMaze3DConfigForm(config, content);
    } else if (gameType === 'donkeykong') {
        generateDonkeyKongConfigForm(config, content);
    } else if (gameType === 'asteroids') {
        generateAsteroidsConfigForm(config, content);
    } else if (gameType === 'spaceinvaders') {
        generateSpaceInvadersConfigForm(config, content);
    }
    // Add other games later
}

function generateMarioConfigForm(config, container) {
    const sections = [
        { key: 'player', title: 'Player Settings' },
        { key: 'enemies', title: 'Enemy Settings' },
        { key: 'physics', title: 'Physics Settings' },
        { key: 'powerups', title: 'Power-up Settings' },
        { key: 'projectiles', title: 'Projectile Settings' },
        { key: 'debug', title: 'Debug Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function createConfigField(section, key, value) {
    const field = document.createElement('div');
    field.className = 'config-field';
    
    const label = document.createElement('label');
    label.textContent = formatLabel(key);
    
    const input = createInputForValue(section, key, value);
    
    field.appendChild(label);
    field.appendChild(input);
    
    return field;
}

function createInputForValue(section, key, value) {
    const input = document.createElement('input');
    const inputId = `config_${section}_${key}`;
    input.id = inputId;
    
    if (typeof value === 'boolean') {
        input.type = 'checkbox';
        input.checked = value;
        input.addEventListener('change', () => updateConfigValue(section, key, input.checked));
    } else if (typeof value === 'number') {
        input.type = 'number';
        input.value = value;
        input.step = value % 1 === 0 ? '1' : '0.1';
        input.addEventListener('input', () => updateConfigValue(section, key, parseFloat(input.value)));
    } else {
        input.type = 'text';
        input.value = value;
        input.addEventListener('input', () => updateConfigValue(section, key, input.value));
    }
    
    return input;
}

function updateConfigValue(section, key, value) {
    if (!currentGameConfig[section]) {
        currentGameConfig[section] = {};
    }
    currentGameConfig[section][key] = value;
    updateSaveButtonState();
}

function generatePacmanConfigForm(config, container) {
    const sections = [
        { key: 'player', title: 'Player Settings' },
        { key: 'ghosts', title: 'Ghost Settings' },
        { key: 'powerups', title: 'Power-up Settings' },
        { key: 'gameplay', title: 'Gameplay Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateSnakeConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'snake', title: 'Snake Settings' },
        { key: 'scoring', title: 'Scoring Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateBreakoutConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' },
        { key: 'scoring', title: 'Scoring Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateMemoryConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'timing', title: 'Timing Settings' },
        { key: 'visual', title: 'Visual Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateFakeConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' },
        { key: 'visual', title: 'Visual Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateTetrisConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' },
        { key: 'visual', title: 'Visual Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generatePunchoutConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'opponents', title: 'Opponent Settings' },
        { key: 'physics', title: 'Physics Settings' },
        { key: 'visual', title: 'Visual Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateFlappyConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' },
        { key: 'pipes', title: 'Pipe Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateFroggerConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateMaze3DConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateDonkeyKongConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateAsteroidsConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' },
        { key: 'scoring', title: 'Scoring Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function generateSpaceInvadersConfigForm(config, container) {
    const sections = [
        { key: 'gameplay', title: 'Gameplay Settings' },
        { key: 'physics', title: 'Physics Settings' },
        { key: 'scoring', title: 'Scoring Settings' },
        { key: 'formation', title: 'Formation Settings' }
    ];
    
    sections.forEach(section => {
        if (config[section.key]) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section';
            sectionDiv.innerHTML = `<h4>${section.title}</h4>`;
            
            Object.entries(config[section.key]).forEach(([key, value]) => {
                const field = createConfigField(section.key, key, value);
                sectionDiv.appendChild(field);
            });
            
            container.appendChild(sectionDiv);
        }
    });
}

function updateSaveButtonState() {
    const saveBtn = document.getElementById('save-config-btn');
    const hasChanges = JSON.stringify(currentGameConfig) !== JSON.stringify(originalConfig);
    
    saveBtn.disabled = !hasChanges;
}

function formatLabel(key) {
    return key.replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .replace(/([a-z])([A-Z])/g, '$1 $2');
}

async function resetCurrentConfig() {
    console.log(`resetCurrentConfig called for ${currentConfigTab}`);
    currentGameConfig = await configManager.resetConfig(currentConfigTab);
    console.log(`After reset, currentGameConfig:`, currentGameConfig);
    console.log(`Config keys:`, Object.keys(currentGameConfig));
    console.log(`Has player section:`, !!currentGameConfig.player);
    console.log(`Has enemies section:`, !!currentGameConfig.enemies);
    originalConfig = JSON.parse(JSON.stringify(currentGameConfig)); // Update original
    generateConfigForm(currentConfigTab, currentGameConfig);
    updateSaveButtonState();
    console.log(`Reset complete for ${currentConfigTab}`);
}

function saveCurrentConfig() {
    configManager.saveConfig(currentConfigTab, currentGameConfig);
    originalConfig = JSON.parse(JSON.stringify(currentGameConfig)); // Update original
    updateSaveButtonState();
}

// Show debug controls if debug mode is enabled
function initializeDebugMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gubed') === 'true') {
        document.getElementById('debug-controls').classList.remove('hidden');
    }
}

async function loadGameConfig(gameType) {
    if (!gameConfigs[gameType]) {
        try {
            // Try game-specific config directory first
            let configPath = `games/${gameType}/config/${gameType}.json?t=${Date.now()}`;
            console.log(`Trying to load config from: ${configPath}`);
            let response = await fetch(configPath);
            
            // Fallback to old config location
            if (!response.ok) {
                configPath = `config/games/${gameType}.json?t=${Date.now()}`;
                console.log(`Fallback to: ${configPath}`);
                response = await fetch(configPath);
            }
            
            // Final fallback to root config
            if (!response.ok) {
                configPath = `config/${gameType}.json?t=${Date.now()}`;
                console.log(`Final fallback to: ${configPath}`);
                response = await fetch(configPath);
            }
            
            if (!response.ok) {
                console.error(`Failed to load config from any path for ${gameType}`);
                return null;
            }
            
            gameConfigs[gameType] = await response.json();
            console.log(`Successfully loaded config from ${configPath}:`, gameConfigs[gameType]);
        } catch (error) {
            console.error(`Failed to load config for ${gameType}:`, error);
            return null;
        }
    }
    return gameConfigs[gameType];
}

function calculateDifficultyValue(param, difficulty) {
    if (param.static) return param.value;
    
    let value;
    if (param.formula) {
        // Use custom formula with available variables
        const base = param.base || 0;
        const multiplier = param.multiplier || 0;
        value = eval(param.formula);
    } else {
        // Use base + multiplier formula
        value = param.base + (difficulty * param.multiplier);
    }
    
    return Math.max(param.min, Math.min(param.max, value));
}

async function getDifficulty(gameType) {
    // Check for difficulty override via query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const difficultyParam = urlParams.get('difficulty');
    const difficulty = difficultyParam ? Math.max(1, Math.min(10, parseInt(difficultyParam))) : config.gameSettings.difficulty;
    
    console.log(`Getting difficulty for ${gameType}: ${difficulty}${difficultyParam ? ' (from URL param)' : ''}`);
    
    const gameConfig = await loadGameConfig(gameType);
    console.log(`Loaded config for ${gameType}:`, gameConfig);
    
    if (!gameConfig) {
        console.error(`No config found for ${gameType}, using fallback`);
        return getFallbackDifficulty(gameType, difficulty);
    }
    
    if (!gameConfig.difficulty) {
        console.error(`No difficulty section found for ${gameType}, using fallback`);
        return getFallbackDifficulty(gameType, difficulty);
    }
    
    const settings = {};
    for (const [key, param] of Object.entries(gameConfig.difficulty)) {
        settings[key] = calculateDifficultyValue(param, difficulty);
    }
    
    console.log(`${gameConfig.name} settings:`, settings);
    return settings;
}

function getFallbackDifficulty(gameType, difficulty) {
    // Fallback to original hardcoded logic if config files fail
    switch(gameType) {
        case 'memory':
            return {
                sequenceLength: Math.max(2, Math.min(12, 2 + difficulty)),
                gridSize: 9,
                showSpeed: Math.max(200, 1000 - (difficulty * 80))
            };
        case 'snake':
            return {
                gameSpeed: Math.max(50, 250 - (difficulty * 20)),
                requiredScore: Math.max(1, Math.min(10, Math.ceil(difficulty / 2))),
                boardSize: 400
            };
        case 'flappy':
            return {
                gameSpeed: Math.max(1.5, 1 + (difficulty * 0.2)),
                pipeGap: Math.max(100, 180 - (difficulty * 10)),
                pipesToWin: Math.max(3, 3 + difficulty)
            };
        case 'frogger':
            return {
                carSpeed: Math.max(1, 1 + (difficulty * 0.3)),
                carDensity: Math.max(0.3, 0.1 + (difficulty * 0.05)),
                lanes: 5,
                levelsToWin: Math.ceil(difficulty / 2)
            };
        case 'maze3d':
            return {
                mazeSize: Math.max(8, 5 + (difficulty * 3)),
                wallDensity: Math.max(0.2, 0.1 + (difficulty * 0.03)),
                moveSpeed: config.gameSettings.moveSpeed,
                showMinimap: config.gameSettings.showMinimap
            };
        case 'mario':
            return {
                levelLength: Math.max(800, 600 + (difficulty * 200)),
                enemyCount: Math.max(2, difficulty),
                jumpHeight: 15,
                gravity: 0.8
            };
        case 'donkeykong':
            return {
                barrelSpeed: Math.max(0.8, 0.5 + (difficulty * 0.1)),
                barrelFrequency: config.gameSettings.barrelFrequency,
                ladderCount: Math.max(3, 2 + Math.floor(difficulty / 2)),
                levelCount: Math.max(1, Math.floor(difficulty / 2))
            };
        case 'fake':
            return {
                speed: 5 + difficulty
            };
        case 'tetris':
            return {
                dropSpeed: Math.max(100, 800 - (difficulty * 50)),
                linesPerLevel: 10
            };
        case 'asteroids':
            return {
                asteroidCount: Math.max(2, 2 + Math.floor(difficulty / 2)),
                asteroidSpeed: Math.max(0.3, 0.3 + (difficulty * 0.1)),
                ufoSpawnRate: Math.max(0.002, 0.002 + (difficulty * 0.001)),
                lives: 3,
                levels: Math.max(3, Math.min(8, 3 + Math.floor(difficulty / 2))),
                powerUpChance: 0.1
            };
        case 'spaceinvaders':
            return {
                invaderSpeed: Math.max(0.5, 0.5 + (difficulty * 0.1)),
                invaderDropSpeed: Math.max(8, 8 + (difficulty * 2)),
                bulletSpeed: Math.max(4, 4 + (difficulty * 0.5)),
                ufoSpawnRate: Math.max(0.001, 0.001 + (difficulty * 0.0005)),
                lives: 3,
                levels: Math.max(5, Math.min(10, 5 + Math.floor(difficulty / 2))),
                playerSpeed: 4,
                maxPlayerBullets: 1
            };
        case 'punchout':
            return {
                playerHealth: Math.max(80, 100 - (difficulty * 5)),
                opponentSpeed: Math.max(0.8, 0.8 + (difficulty * 0.1)),
                roundTime: Math.max(120, 180 - (difficulty * 10)),
                stamina: 100,
                maxStars: 3,
                fighterCount: Math.min(3, Math.max(1, Math.floor(difficulty / 2) + 1))
            };
        case 'breakout':
            const level = levels[currentLevel]; // Get current level data
            return {
                ballSpeed: Math.max(2, 3 + (difficulty * 0.5)),
                paddleSpeed: Math.max(4, 6 + (difficulty * 0.3)),
                brickRows: Math.min(8, Math.floor(4 + (difficulty * 0.4))),
                powerUpChance: Math.min(0.25, 0.1 + (difficulty * 0.01)),
                startLevel: level?.breakoutLevel || 1, // Use specific breakout level
                lives: 3,
                levels: 3 // This will be overridden by ConfigManager
            };
        case 'pacman':
            return {
                ghostSpeed: Math.max(0.8, 0.5 + (difficulty * 0.1)),
                powerPelletDuration: Math.max(3000, 8000 - (difficulty * 500)),
                ghostCount: Math.min(4, 1 + Math.floor(difficulty / 3)),
                levelsToWin: Math.max(1, Math.min(5, Math.ceil(difficulty / 2)))
            };
        case 'asteroids':
            return {
                asteroidCount: Math.max(4, 4 + Math.floor(difficulty / 2)),
                asteroidSpeed: Math.max(0.5, 0.5 + (difficulty * 0.1)),
                ufoSpawnRate: Math.max(0.002, 0.002 + (difficulty * 0.001)),
                lives: 3,
                levels: Math.max(3, Math.min(8, 3 + Math.floor(difficulty / 2)))
            };
        case 'spaceinvaders':
            return {
                invaderSpeed: Math.max(0.5, 0.5 + (difficulty * 0.1)),
                invaderDropSpeed: Math.max(8, 8 + (difficulty * 2)),
                bulletSpeed: Math.max(4, 4 + (difficulty * 0.5)),
                ufoSpawnRate: Math.max(0.001, 0.001 + (difficulty * 0.0005)),
                lives: 3,
                levels: Math.max(5, Math.min(10, 5 + Math.floor(difficulty / 2)))
            };
        case 'punchout':
            return {
                playerHealth: Math.max(60, 100 - (difficulty * 8)),
                opponentSpeed: Math.max(1.0, 0.8 + (difficulty * 0.15)),
                roundTime: Math.max(90, 180 - (difficulty * 15)),
                stamina: Math.max(80, 100 - (difficulty * 5)),
                maxStars: 3,
                fighterCount: Math.min(3, Math.max(1, Math.floor(difficulty / 2) + 1))
            };
        default:
            return {};
    }
}

// Simple decryption function
function simpleDecrypt(encrypted, key = 'arcade2025') {
    try {
        // Convert base64 to binary string
        const decoded = atob(encrypted);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i);
            const keyChar = key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode ^ keyChar);
        }
        return result;
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
}

// Load configuration and questions
Promise.all([
    fetch('config.json').then(response => response.json()),
    fetch('questions.enc').then(response => response.text()).then(encrypted => {
        try {
            const decrypted = simpleDecrypt(encrypted.trim());
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Failed to decrypt questions:', error);
            console.log('Encrypted data length:', encrypted.length);
            console.log('First 100 chars of decrypted:', simpleDecrypt(encrypted.trim()).substring(0, 100));
            throw error;
        }
    })
])
.then(([configData, questionsData]) => {
    config = configData;
    
    // Create levels from ordered config games and questions
    levels = config.levels
        .filter(level => level.enabled)
        .sort((a, b) => a.order - b.order)
        .map((configLevel, index) => {
            const questionData = questionsData.questions[index] || {};
            const unlockAnswer = index > 0 ? questionsData.questions[index - 1]?.answer : null;
            
            return {
                ...configLevel,
                question: questionData.question,
                answer: unlockAnswer, // Answer needed to unlock this level
                showQuestion: questionData.question, // Question to show when this level is completed
                title: `Challenge ${index + 1}: ${configLevel.type}`
            };
        });
    
    console.log('Loaded levels:', levels);
    
    // Initialize unlocked levels
    unlockedLevels = new Array(levels.length).fill(false);
    for(let i = 0; i < config.gameSettings.startUnlocked; i++) {
        unlockedLevels[i] = true;
    }
    
    showLevelSelect();
})
.catch(error => {
    console.error('Error loading game data:', error);
});

function updateLevelButtons() {
    const levelButtons = document.querySelectorAll('.level-button');
    levelButtons.forEach((button, index) => {
        if (unlockedLevels[index]) {
            button.classList.remove('locked');
            button.onclick = () => selectLevel(index);
        } else {
            button.classList.add('locked');
            button.onclick = () => selectLevel(index); // Use new system for all levels
        }
    });
}

function showLevelSelect() {
    document.getElementById('level-select').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    
    const levelButtons = document.getElementById('level-buttons');
    levelButtons.innerHTML = '';
    
    // Check localStorage setting for showing game names
    const showGameTitles = localStorage.getItem('showGameNames') !== 'false';
    
    levels.forEach((level, index) => {
        const button = document.createElement('button');
        const progress = ProgressTracker.getProgress();
        const isCompleted = ProgressTracker.isCompleted(index);
        const isCurrent = progress.currentLevel === index && !isCompleted;
        const isAvailable = index <= progress.currentLevel;
        
        // Create retro status indicator
        let statusIcon = '';
        let statusClass = '';
        
        if (isCompleted) {
            statusIcon = '★ ';
            statusClass = 'completed';
        } else if (isCurrent) {
            statusIcon = '▶ ';
            statusClass = 'current';
        } else {
            statusIcon = '◯ ';
            statusClass = 'locked';
        }
        
        button.innerHTML = `<span class="status-icon">${statusIcon}</span>${showGameTitles ? level.title : `Challenge ${index + 1}`}`;
        button.className = `level-button ${statusClass}`;
        
        if (isAvailable) {
            button.onclick = () => selectLevel(index);
        } else {
            button.onclick = () => selectLevel(index); // Use new system for all levels
        }
        
        levelButtons.appendChild(button);
    });
}

function selectLevel(levelIndex) {
    currentLevel = levelIndex;
    selectedLevel = levelIndex;
    
    console.log('selectLevel called for level:', levelIndex);
    
    // First level is always accessible
    if (levelIndex === 0) {
        document.getElementById('level-select').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        startLevel();
        return;
    }
    
    // All other levels require answering their question
    const levelData = levels[levelIndex];
    if (levelData && levelData.question && levelData.answer) {
        // Set up question system for this specific level
        questionSystem.currentQuestion = levelData.question;
        questionSystem.expectedAnswer = levelData.answer;
        questionSystem.showAnswerPrompt((success) => {
            if (success) {
                document.getElementById('level-select').classList.add('hidden');
                document.getElementById('game-screen').classList.remove('hidden');
                startLevel();
            }
            // If failed, stay on level select
        });
    } else {
        alert('This level has no question configured.');
    }
}

function showLevelSelection() {
    // Clean up current game
    if (currentGameInstance && typeof currentGameInstance.cleanup === 'function') {
        console.log('Calling cleanup for current game');
        currentGameInstance.cleanup();
    }
    currentGameInstance = null;
    
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('level-select').classList.remove('hidden');
}

function showLevelUnlock(levelIndex) {
    const level = levels[levelIndex];
    if(!level.unlockQuestion) return;
    
    selectedLevel = levelIndex;
    document.getElementById('unlock-question-text').textContent = level.unlockQuestion;
    document.getElementById('unlock-answer-input').value = '';
    document.getElementById('level-unlock-modal').classList.remove('hidden');
    document.getElementById('unlock-answer-input').focus();
}

function checkUnlockAnswer() {
    const answer = document.getElementById('unlock-answer-input').value.toLowerCase().trim();
    const correctAnswer = levels[selectedLevel].unlockAnswer.toLowerCase();
    
    if(answer === correctAnswer) {
        unlockedLevels[selectedLevel] = true;
        hideLevelUnlock();
        selectLevel(selectedLevel);
    } else {
        alert('Incorrect answer. Try again!');
    }
}

function hideLevelUnlock() {
    document.getElementById('level-unlock-modal').classList.add('hidden');
}

async function startLevel() {
    // Check if there's a pending answer before starting the level
    if (currentLevel > 0) {
        questionSystem.showAnswerPrompt((success) => {
            if (success) {
                initializeLevel();
            } else {
                // Return to level selection if answer is wrong or cancelled
                showLevelSelection();
            }
        });
    } else {
        initializeLevel();
    }
}

// Callback-based game creation wrapper
async function createGameWithCallbacks(gameType, settings) {
    console.log('createGameWithCallbacks called with gameType:', gameType, 'settings:', settings);
    const gameCallbacks = {
        onGameStart: async (gameId) => {
            // Question checking is now handled in selectLevel
            // Games can start immediately once selectLevel allows them
            return;
        },
        onGameComplete: (gameId, questionData) => {
            // Mark level as completed
            ProgressTracker.markCompleted(currentLevel);
            
            // Show this level's question for future reference
            const currentLevelData = levels[currentLevel];
            if (typeof questionSystem !== 'undefined' && currentLevelData && currentLevelData.showQuestion) {
                questionSystem.showQuestionDirect(currentLevelData.showQuestion);
            }
            // Don't unlock next level or proceed automatically
            // Player will need to manually select next level and answer its question
        },
        onLevelComplete: () => {
            // Handle individual level completion within a game
            proceedToNextLevel();
        }
    };
    
    // Create games with callbacks
    switch(gameType) {
        case 'mario':
            return await createMarioGame(settings, gameCallbacks);
        case 'donkeykong':
            return await createDonkeyKongGame(settings, gameCallbacks);
        case 'pacman':
            return await createPacmanGame(settings, gameCallbacks);
        case 'snake':
            return await createSnakeGame(settings, gameCallbacks);
        case 'fake':
            return await createFakeGame(settings, gameCallbacks);
        case 'tetris':
            return await createTetrisGame(settings, gameCallbacks);
        case 'breakout':
            return await createBreakoutGame(settings, gameCallbacks);
        case 'asteroids':
            return await createAsteroidsGame(settings, gameCallbacks);
        case 'spaceinvaders':
            return await createSpaceInvadersGame(settings, gameCallbacks);
        case 'punchout':
            return await createPunchOutGame(settings, gameCallbacks);
        case 'maze3d':
            return await createMaze3DGame(settings, gameCallbacks);
        case 'flappy':
            console.log('Creating flappy game with settings:', settings);
            return await createFlappyGame(settings, gameCallbacks);
        default:
            // Fallback for games without callback support yet
            return await createGameLegacy(gameType, settings);
    }
}

// Legacy game creation for backward compatibility
async function createGameLegacy(gameType, settings) {
    switch(gameType) {
        case 'frogger':
            return createFroggerGame(settings);
        case 'maze3d':
            return createMaze3DGame(settings);
        case 'donkeykong':
            return createDonkeyKongGame(settings);
    }
}

async function initializeLevel() {
    const level = levels[currentLevel];
    document.getElementById('level-title').textContent = level.title;
    
    // Clean up previous game
    if (currentGameInstance && typeof currentGameInstance.cleanup === 'function') {
        console.log('Cleaning up previous game before starting new level');
        currentGameInstance.cleanup();
    }
    currentGameInstance = null;
    
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = '';
    gameWon = false;
    
    switch(level.type) {
        case 'memory':
            // Modern callback system
            currentGameInstance = await createMemoryGame(await getDifficulty(level.type), {
                onGameComplete: (gameId, questionData) => {
                    // Mark level as completed
                    ProgressTracker.markCompleted(currentLevel);
                    
                    const currentLevelData = levels[currentLevel];
                    if (typeof questionSystem !== 'undefined' && currentLevelData && currentLevelData.showQuestion) {
                        questionSystem.showQuestionDirect(currentLevelData.showQuestion);
                    }
                }
            });
            break;
        case 'frogger':
            // Legacy games without callback support
            currentGameInstance = await createGameLegacy(level.type, await getDifficulty(level.type));
            break;
        case 'donkeykong':
        case 'mario':
        case 'pacman':
        case 'snake':
        case 'fake':
        case 'tetris':
        case 'breakout':
        case 'asteroids':
        case 'spaceinvaders':
        case 'punchout':
        case 'maze3d':
        case 'flappy':
            // Modern games with callback support
            console.log('Creating modern game:', level.type);
            currentGameInstance = await createGameWithCallbacks(level.type, await getDifficulty(level.type));
            console.log('Modern game created, has cleanup:', typeof currentGameInstance?.cleanup === 'function');
            break;
    }
}

function showGameComplete() {
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #00ff00; font-family: 'Courier New', monospace;">
            <h1 style="font-size: 48px; margin-bottom: 20px;">GAME COMPLETE!</h1>
            <p style="font-size: 24px;">Congratulations! You've beaten all levels!</p>
            <button onclick="location.reload()" style="margin-top: 30px; padding: 15px 30px; font-size: 18px; background: #00ff00; color: #000; border: none; cursor: pointer;">PLAY AGAIN</button>
        </div>
    `;
}

function showQuestion() {
    if(!gameWon) return;
    
    // Check if questionSystem is available
    if (typeof questionSystem === 'undefined') {
        console.error('Question system not loaded');
        // Fallback to direct progression
        proceedToNextLevel();
        return;
    }
    
    // Show question using the new 8-bit system
    const currentLevelData = levels[currentLevel];
    if (currentLevelData && currentLevelData.showQuestion) {
        questionSystem.showQuestionDirect(currentLevelData.showQuestion);
        
        // Don't unlock next level here - wait for correct answer
        // The level will be unlocked when the answer is provided correctly
    } else {
        // No question, proceed directly
        proceedToNextLevel();
    }
}

function proceedToNextLevel() {
    if (currentLevel < levels.length - 1) {
        unlockedLevels[currentLevel + 1] = true;
        updateLevelButtons();
        currentLevel++;
        startLevel();
    } else {
        showGameComplete();
    }
}

function checkAnswer() {
    const answer = document.getElementById('answer-input').value.toLowerCase().trim();
    const correctAnswer = levels[currentLevel].answer.toLowerCase();
    
    if(answer === correctAnswer) {
        document.getElementById('question-modal').classList.add('hidden');
        
        // Unlock next level
        if (currentLevel + 1 < levels.length) {
            unlockedLevels[currentLevel + 1] = true;
        }
        
        currentLevel++;
        
        if(currentLevel >= levels.length) {
            document.getElementById('game-complete').classList.remove('hidden');
        } else {
            setTimeout(startLevel, 500);
        }
    } else {
        alert('Incorrect answer. Try again!');
    }
}

function restartGame() {
    currentLevel = 0;
    unlockedLevels = new Array(levels.length).fill(false);
    for(let i = 0; i < config.gameSettings.startUnlocked; i++) {
        unlockedLevels[i] = true;
    }
    document.getElementById('game-complete').classList.add('hidden');
    showLevelSelect();
}

// Start with level selection
document.getElementById('level-unlock-modal').classList.add('hidden');
document.getElementById('question-modal').classList.add('hidden');

// Initialize debug mode if enabled
initializeDebugMode();
