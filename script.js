let currentLevel = 0;
let gameWon = false;
let selectedLevel = 0;
let unlockedLevels = [];
let levels = [];
let config = {};

function getDifficulty(gameType) {
    const difficulty = config.gameSettings.difficulty; // 1-10
    console.log(`Getting difficulty for ${gameType}: ${difficulty}`);
    
    switch(gameType) {
        case 'memory':
            const memorySettings = {
                sequenceLength: Math.max(2, Math.min(12, 2 + difficulty)),
                gridSize: 9,
                showSpeed: Math.max(200, 1000 - (difficulty * 80))
            };
            console.log('Memory settings:', memorySettings);
            return memorySettings;
        case 'snake':
            const snakeSettings = {
                gameSpeed: Math.max(50, 250 - (difficulty * 20)),
                requiredScore: Math.max(1, Math.min(10, Math.ceil(difficulty / 2))),
                boardSize: 400
            };
            console.log('Snake settings:', snakeSettings);
            return snakeSettings;
        case 'quiz':
            return {
                timeLimit: difficulty > 7 ? 30 - (difficulty - 7) * 5 : 0,
                multipleChoice: true
            };
        case 'flappy':
            const flappySettings = {
                gameSpeed: Math.max(1.5, 1 + (difficulty * 0.2)),
                pipeGap: Math.max(100, 180 - (difficulty * 10)),
                pipesToWin: Math.max(3, 3 + difficulty)
            };
            console.log('Flappy settings:', flappySettings);
            return flappySettings;
        case 'frogger':
            const froggerSettings = {
                carSpeed: Math.max(1, 1 + (difficulty * 0.3)),
                carDensity: Math.max(0.3, 0.1 + (difficulty * 0.05)),
                lanes: 5
            };
            console.log('Frogger settings:', froggerSettings);
            return froggerSettings;
        case 'maze3d':
            const maze3dSettings = {
                mazeSize: Math.max(8, 5 + (difficulty * 3)),
                wallDensity: Math.max(0.2, 0.1 + (difficulty * 0.03)),
                moveSpeed: config.gameSettings.moveSpeed,
                showMinimap: config.gameSettings.showMinimap
            };
            console.log('Maze3D settings:', maze3dSettings);
            return maze3dSettings;
        case 'mario':
            const marioSettings = {
                levelLength: Math.max(800, 600 + (difficulty * 200)),
                enemyCount: Math.max(2, difficulty),
                jumpHeight: 15,
                gravity: 0.8
            };
            console.log('Mario settings:', marioSettings);
            return marioSettings;
        case 'donkeykong':
            const dkSettings = {
                barrelSpeed: Math.max(0.8, 0.5 + (difficulty * 0.1)),
                barrelFrequency: config.gameSettings.barrelFrequency,
                ladderCount: Math.max(3, 2 + Math.floor(difficulty / 2)),
                levelCount: Math.max(1, Math.floor(difficulty / 2))
            };
            console.log('DonkeyKong settings:', dkSettings);
            return dkSettings;
        case 'pacman':
            const pacmanSettings = {
                ghostSpeed: Math.max(0.8, 0.5 + (difficulty * 0.1)),
                powerPelletDuration: Math.max(3000, 8000 - (difficulty * 500)),
                ghostCount: Math.min(4, 1 + Math.floor(difficulty / 3))
            };
            console.log('Pacman settings:', pacmanSettings);
            return pacmanSettings;
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

function startLevel() {
    const level = levels[currentLevel];
    document.getElementById('level-title').textContent = level.title;
    document.getElementById('level-description').textContent = level.description;
    
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = '';
    gameWon = false;
    
    switch(level.type) {
        case 'memory':
            createMemoryGame(getDifficulty('memory'));
            break;
        case 'snake':
            createSnakeGame(getDifficulty('snake'));
            break;
        case 'quiz':
            createQuizGame(getDifficulty('quiz'));
            break;
        case 'flappy':
            createFlappyGame(getDifficulty('flappy'));
            break;
        case 'frogger':
            createFroggerGame(getDifficulty('frogger'));
            break;
        case 'maze3d':
            createMaze3DGame(getDifficulty('maze3d'));
            break;
        case 'mario':
            createMarioGame(getDifficulty('mario'));
            break;
        case 'donkeykong':
            createDonkeyKongGame(getDifficulty('donkeykong'));
            break;
        case 'pacman':
            createPacmanGame(getDifficulty('pacman'));
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
