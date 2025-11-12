function createMemoryGame(settings) {
    const gameArea = document.getElementById('game-area');
    const sequence = [];
    const playerSequence = [];
    let currentStep = 0;
    let showingSequence = false;
    
    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    
    for(let i = 0; i < settings.gridSize; i++) {
        const square = document.createElement('div');
        square.className = 'memory-square';
        square.dataset.index = i;
        square.onclick = () => handleSquareClick(i);
        grid.appendChild(square);
    }
    
    function generateSequence() {
        sequence.length = 0;
        for(let i = 0; i < settings.sequenceLength; i++) {
            sequence.push(Math.floor(Math.random() * settings.gridSize));
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
        }, settings.showSpeed);
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
