let currentLevel = 0;
let gameWon = false;
let selectedLevel = 0;
let unlockedLevels = [];
let levels = [];
let config = {};
let gameConfigs = {};

async function loadGameConfig(gameType) {
    if (!gameConfigs[gameType]) {
        try {
            const response = await fetch(`config/${gameType}.json`);
            gameConfigs[gameType] = await response.json();
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
    if (!gameConfig) {
        console.error(`No config found for ${gameType}, using fallback`);
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
        case 'quiz':
            return {
                timeLimit: difficulty > 7 ? 30 - (difficulty - 7) * 5 : 0,
                multipleChoice: true
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
                lanes: 5
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
        case 'pacman':
            return {
                ghostSpeed: Math.max(0.8, 0.5 + (difficulty * 0.1)),
                powerPelletDuration: Math.max(3000, 8000 - (difficulty * 500)),
                ghostCount: Math.min(4, 1 + Math.floor(difficulty / 3)),
                levelsToWin: Math.max(1, Math.min(5, Math.ceil(difficulty / 2)))
            };
        default:
            return {};
    }
}

// Load configuration and questions
Promise.all([
    fetch('config.json').then(response => response.json()),
    fetch('questions.json').then(response => response.json())
])
.then(([configData, questionsData]) => {
    config = configData;
    
    // Merge config with questions, sort by order
    levels = config.levels
        .filter(level => level.enabled)
        .sort((a, b) => a.order - b.order)
        .map(configLevel => {
            const questionData = questionsData.levels.find(q => q.id === configLevel.id);
            return { ...configLevel, ...questionData };
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

function showLevelSelect() {
    document.getElementById('level-select').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    
    const levelButtons = document.getElementById('level-buttons');
    levelButtons.innerHTML = '';
    
    levels.forEach((level, index) => {
        const button = document.createElement('button');
        button.textContent = level.title;
        button.className = 'level-button';
        
        if(unlockedLevels[index]) {
            button.onclick = () => selectLevel(index);
        } else {
            button.classList.add('locked');
            button.onclick = () => showLevelUnlock(index);
        }
        
        levelButtons.appendChild(button);
    });
}

function selectLevel(levelIndex) {
    currentLevel = levelIndex;
    selectedLevel = levelIndex;
    document.getElementById('level-select').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    startLevel();
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
    const level = levels[currentLevel];
    document.getElementById('level-title').textContent = level.title;
    document.getElementById('level-description').textContent = level.description;
    
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = '';
    gameWon = false;
    
    switch(level.type) {
        case 'memory':
            createMemoryGame(await getDifficulty('memory'));
            break;
        case 'snake':
            createSnakeGame(await getDifficulty('snake'));
            break;
        case 'quiz':
            createQuizGame(await getDifficulty('quiz'));
            break;
        case 'flappy':
            createFlappyGame(await getDifficulty('flappy'));
            break;
        case 'frogger':
            createFroggerGame(await getDifficulty('frogger'));
            break;
        case 'maze3d':
            createMaze3DGame(await getDifficulty('maze3d'));
            break;
        case 'mario':
            createMarioGame(await getDifficulty('mario'));
            break;
        case 'donkeykong':
            createDonkeyKongGame(await getDifficulty('donkeykong'));
            break;
        case 'pacman':
            createPacmanGame(await getDifficulty('pacman'));
            break;
    }
}

function showQuestion() {
    if(!gameWon) return;
    
    const modal = document.getElementById('question-modal');
    const questionText = document.getElementById('question-text');
    const answerInput = document.getElementById('answer-input');
    
    questionText.textContent = levels[currentLevel].question;
    answerInput.value = '';
    modal.classList.remove('hidden');
    answerInput.focus();
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
