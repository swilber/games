async function createMemoryGame(settings) {
    const gameArea = document.getElementById('game-area');
    
    // Load Memory configuration using ConfigManager
    let memoryConfig = {};
    if (typeof configManager !== 'undefined') {
        memoryConfig = await configManager.loadConfig('memory');
        console.log('Memory config loaded via ConfigManager:', memoryConfig);
    } else {
        console.log('ConfigManager not available, using settings fallback');
        memoryConfig = {
            gameplay: settings,
            timing: settings,
            visual: settings
        };
    }
    
    const sequence = [];
    const playerSequence = [];
    let currentStep = 0;
    let showingSequence = false;
    
    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    
    const gridSize = memoryConfig.gameplay?.gridSize || settings.gridSize || 9;
    for(let i = 0; i < gridSize; i++) {
        const square = document.createElement('div');
        square.className = 'memory-square';
        square.dataset.index = i;
        square.onclick = () => handleSquareClick(i);
        grid.appendChild(square);
    }
    
    function generateSequence() {
        sequence.length = 0;
        const sequenceLength = memoryConfig.gameplay?.sequenceLength || settings.sequenceLength || 4;
        for(let i = 0; i < sequenceLength; i++) {
            sequence.push(Math.floor(Math.random() * gridSize));
        }
    }
    
    function showSequence() {
        showingSequence = true;
        let step = 0;
        
        const interval = setInterval(() => {
            if(step > 0) {
                grid.children[sequence[step-1]].classList.remove('active');
            }
            
            if(step < sequence.length) {
                grid.children[sequence[step]].classList.add('active');
                step++;
            } else {
                clearInterval(interval);
                grid.children[sequence[step-1]].classList.remove('active');
                showingSequence = false;
            }
        }, memoryConfig.timing?.showDuration || settings.showSpeed || 600);
    }
    
    function handleSquareClick(index) {
        if(showingSequence) return;
        
        // Add visual feedback
        grid.children[index].classList.add('active');
        setTimeout(() => grid.children[index].classList.remove('active'), 200);
        
        playerSequence.push(index);
        
        if(playerSequence[currentStep] !== sequence[currentStep]) {
            resetGame();
            return;
        }
        
        currentStep++;
        
        if(currentStep === sequence.length) {
            gameWon = true;
            setTimeout(showQuestion, 500);
        }
    }
    
    function resetGame() {
        playerSequence.length = 0;
        currentStep = 0;
        setTimeout(() => {
            generateSequence();
            showSequence();
        }, 1000);
    }
    
    gameArea.appendChild(grid);
    generateSequence();
    setTimeout(showSequence, 1000);
}
