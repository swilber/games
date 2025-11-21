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
    let currentLevel = 1;
    let gameWon = false;
    let isResetting = false; // Prevent multiple resets
    
    const maxLevels = memoryConfig.gameplay?.levels || settings.levels || 5;
    const baseSequenceLength = memoryConfig.gameplay?.baseSequenceLength || settings.sequenceLength || 4;
    
    // Different colors for each cell
    const cellColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    // Create UI container
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    
    // Level display
    const levelDisplay = document.createElement('div');
    levelDisplay.style.fontSize = '24px';
    levelDisplay.style.color = '#00ff88';
    levelDisplay.style.marginBottom = '20px';
    levelDisplay.style.fontFamily = 'monospace';
    container.appendChild(levelDisplay);
    
    // Sequence length display
    const sequenceDisplay = document.createElement('div');
    sequenceDisplay.style.fontSize = '18px';
    sequenceDisplay.style.color = '#ffffff';
    sequenceDisplay.style.marginBottom = '20px';
    container.appendChild(sequenceDisplay);
    
    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    container.appendChild(grid);
    
    const gridSize = memoryConfig.gameplay?.gridSize || settings.gridSize || 9;
    for(let i = 0; i < gridSize; i++) {
        const square = document.createElement('div');
        square.className = 'memory-square';
        square.dataset.index = i;
        square.style.backgroundColor = cellColors[i % cellColors.length];
        square.style.opacity = '0.3'; // Dim by default
        square.onclick = () => handleSquareClick(i);
        grid.appendChild(square);
    }
    
    function updateDisplay() {
        levelDisplay.textContent = `LEVEL ${currentLevel} / ${maxLevels}`;
        const currentSequenceLength = baseSequenceLength + currentLevel - 1;
        sequenceDisplay.textContent = `Remember ${currentSequenceLength} items`;
    }
    
    function generateSequence() {
        const currentSequenceLength = baseSequenceLength + currentLevel - 1;
        
        if (currentLevel === 1) {
            // First level: generate completely new sequence
            sequence.length = 0;
            for(let i = 0; i < currentSequenceLength; i++) {
                sequence.push(Math.floor(Math.random() * gridSize));
            }
        } else {
            // Subsequent levels: keep existing sequence and add one more item
            sequence.push(Math.floor(Math.random() * gridSize));
        }
    }
    
    let sequenceTimeout = null;
    let blinkTimeouts = [];
    
    function clearAllAnimations() {
        // Clear any pending sequence timeout
        if (sequenceTimeout) {
            clearTimeout(sequenceTimeout);
            sequenceTimeout = null;
        }
        
        // Clear all pending blink timeouts
        blinkTimeouts.forEach(timeout => clearTimeout(timeout));
        blinkTimeouts = [];
        
        // Reset all cells to dim state immediately
        for(let i = 0; i < gridSize; i++) {
            grid.children[i].style.opacity = '0.3';
            grid.children[i].style.boxShadow = 'none';
        }
        
        showingSequence = false;
    }
    
    function showSequence() {
        clearAllAnimations(); // Clear any existing animations first
        showingSequence = true;
        let step = 0;
        
        function showNextStep() {
            if (step >= sequence.length) {
                showingSequence = false;
                return;
            }
            
            const cellIndex = sequence[step];
            
            // Show each step individually - one blink per step
            blinkCell(cellIndex, () => {
                step++;
                const basePause = memoryConfig.timing?.pauseBetween || settings.pauseBetween || 200;
                const speedIncrease = memoryConfig.timing?.speedIncrease || settings.speedIncrease || 0.9;
                const levelMultiplier = Math.pow(speedIncrease, currentLevel - 1);
                const adjustedPause = Math.max(50, basePause * levelMultiplier); // Minimum 50ms
                
                sequenceTimeout = setTimeout(showNextStep, adjustedPause);
            });
        }
        
        showNextStep();
    }
    
    function blinkCell(cellIndex, callback) {
        const cell = grid.children[cellIndex];
        
        // Bright
        cell.style.opacity = '1.0';
        cell.style.boxShadow = '0 0 20px ' + cellColors[cellIndex % cellColors.length];
        
        const baseShowDuration = memoryConfig.timing?.showDuration || settings.showDuration || 500;
        const speedIncrease = memoryConfig.timing?.speedIncrease || settings.speedIncrease || 0.9;
        const levelMultiplier = Math.pow(speedIncrease, currentLevel - 1);
        const adjustedDuration = Math.max(100, baseShowDuration * levelMultiplier); // Minimum 100ms
        
        const timeout = setTimeout(() => {
            // Dim
            cell.style.opacity = '0.3';
            cell.style.boxShadow = 'none';
            
            if (callback) callback();
        }, adjustedDuration);
        
        blinkTimeouts.push(timeout);
    }
    
    function handleSquareClick(index) {
        if(showingSequence || isResetting) return; // Block clicks during sequence or reset
        
        // Add visual feedback
        const cell = grid.children[index];
        cell.style.opacity = '1.0';
        cell.style.boxShadow = '0 0 20px ' + cellColors[index % cellColors.length];
        
        setTimeout(() => {
            cell.style.opacity = '0.3';
            cell.style.boxShadow = 'none';
        }, 200);
        
        playerSequence.push(index);
        
        if(playerSequence[currentStep] !== sequence[currentStep]) {
            // Show error feedback
            cell.style.backgroundColor = '#FF0000';
            setTimeout(() => {
                cell.style.backgroundColor = cellColors[index % cellColors.length];
                resetGame();
            }, 500);
            return;
        }
        
        currentStep++;
        
        if(currentStep === sequence.length) {
            // Level complete
            if (currentLevel >= maxLevels) {
                // Game complete
                for(let i = 0; i < gridSize; i++) {
                    grid.children[i].style.opacity = '1.0';
                    grid.children[i].style.boxShadow = '0 0 15px ' + cellColors[i % cellColors.length];
                }
                
                setTimeout(() => {
                    for(let i = 0; i < gridSize; i++) {
                        grid.children[i].style.opacity = '0.3';
                        grid.children[i].style.boxShadow = 'none';
                    }
                    gameWon = true;
                    setTimeout(showQuestion, 500);
                }, 1000);
            } else {
                // Next level
                currentLevel++;
                playerSequence.length = 0;
                currentStep = 0;
                
                // Show level complete feedback
                levelDisplay.textContent = `LEVEL ${currentLevel - 1} COMPLETE!`;
                levelDisplay.style.color = '#00ff00';
                
                setTimeout(() => {
                    updateDisplay();
                    levelDisplay.style.color = '#00ff88';
                    generateSequence();
                    showSequence();
                }, 1500);
            }
        }
    }
    
    function resetGame() {
        if (isResetting) return; // Prevent multiple resets
        isResetting = true;
        
        clearAllAnimations(); // Clear any ongoing animations
        
        playerSequence.length = 0;
        currentStep = 0;
        currentLevel = 1;
        sequence.length = 0;
        
        setTimeout(() => {
            updateDisplay();
            generateSequence();
            showSequence();
            isResetting = false; // Allow new interactions
        }, 1000);
    }
    
    gameArea.appendChild(container);
    updateDisplay();
    generateSequence();
    setTimeout(showSequence, 1000);
}
