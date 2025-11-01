function createQuizGame(settings) {
    const gameArea = document.getElementById('game-area');
    const question = document.createElement('h3');
    question.textContent = "What is the capital of France?";
    
    const options = ['London', 'Berlin', 'Paris', 'Madrid'];
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'quiz-options';
    
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'quiz-option';
        button.textContent = option;
        button.onclick = () => {
            if(option === 'Paris') {
                gameWon = true;
                showQuestion();
            } else {
                button.style.background = '#ff4444';
                setTimeout(() => button.style.background = '#333', 1000);
            }
        };
        optionsDiv.appendChild(button);
    });
    
    gameArea.appendChild(question);
    gameArea.appendChild(optionsDiv);
}
