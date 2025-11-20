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
    
    // Different colors for each cell
    const cellColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    
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
        
        // Count occurrences of each cell in sequence
        const cellCounts = {};
        sequence.forEach(cellIndex => {
            cellCounts[cellIndex] = (cellCounts[cellIndex] || 0) + 1;
        });
        
        const showDuration = memoryConfig.timing?.showDuration || settings.showSpeed || 600;
        
        function showNextStep() {
            if (step >= sequence.length) {
                showingSequence = false;
                return;
            }
            
            const cellIndex = sequence[step];
            const blinkCount = cellCounts[cellIndex];
            
            // Blink the cell multiple times if it appears multiple times
            blinkCell(cellIndex, blinkCount, () => {
                step++;
                setTimeout(showNextStep, 200); // Pause between cells
            });
        }
        
        showNextStep();
    }
    
    function blinkCell(cellIndex, blinkCount, callback) {
        const cell = grid.children[cellIndex];
        let blinks = 0;
        
        function doBlink() {
            if (blinks >= blinkCount) {
                cell.style.opacity = '0.3'; // Return to dim state
                if (callback) callback();
                return;
            }
            
            // Bright
            cell.style.opacity = '1.0';
            cell.style.boxShadow = '0 0 20px ' + cellColors[cellIndex % cellColors.length];
            
            setTimeout(() => {
                // Dim
                cell.style.opacity = '0.3';
                cell.style.boxShadow = 'none';
                blinks++;
                
                setTimeout(doBlink, 200); // Pause between blinks
            }, 300);
        }
        
        doBlink();
    }
    
    function handleSquareClick(index) {
        if(showingSequence) return;
        
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
            // Success - light up all cells briefly
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
        }
    }
    
    function resetGame() {
        playerSequence.length = 0;
        currentStep = 0;
        
        // Reset all cells to dim state
        for(let i = 0; i < gridSize; i++) {
            grid.children[i].style.opacity = '0.3';
            grid.children[i].style.boxShadow = 'none';
        }
        
        setTimeout(() => {
            generateSequence();
            showSequence();
        }, 1000);
    }
    
    gameArea.appendChild(grid);
    generateSequence();
    setTimeout(showSequence, 1000);
}
