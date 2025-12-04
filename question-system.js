// 8-bit Style Question/Answer System
let questionSystem = {
    currentQuestion: null,
    expectedAnswer: null,
    currentCallback: null,
    
    // Show question at end of game with 8-bit style
    showQuestion(levelId) {
        const level = levels.find(l => l.id === levelId);
        if (!level || !level.question) return;
        
        this.currentQuestion = level.question;
        this.expectedAnswer = level.answer;
        
        this.displayQuestionModal(level.question);
    },
    
    // Show answer prompt at start of next game
    showAnswerPrompt(callback) {
        console.log('showAnswerPrompt called');
        console.log('currentQuestion:', this.currentQuestion);
        
        if (!this.currentQuestion || !this.expectedAnswer) {
            console.log('No pending question, allowing access');
            callback(true); // No question pending, allow access
            return;
        }
        
        // Store callback for later use
        this.currentCallback = callback;
        
        console.log('Displaying answer modal');
        this.displayAnswerModal(this.expectedAnswer);
    },
    
    displayQuestionModal(question) {
        const modal = document.createElement('div');
        modal.className = 'retro-modal';
        modal.innerHTML = `
            <div class="retro-container">
                <div class="retro-header">CHALLENGE COMPLETE!</div>
                <div class="retro-content">
                    <div class="retro-text">Remember this question:</div>
                    <div class="retro-question">${question}</div>
                    <div class="retro-instruction">You'll need to answer this to unlock the next challenge!</div>
                    <div class="retro-buttons">
                        <button class="retro-button" onclick="questionSystem.closeQuestionModal()">CONTINUE</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addRetroStyles();
    },
    
    displayAnswerModal(expectedAnswer, callback) {
        const modal = document.createElement('div');
        modal.className = 'retro-modal';
        modal.innerHTML = `
            <div class="retro-container">
                <div class="retro-header">CHALLENGE LOCKED</div>
                <div class="retro-content">
                    <div class="retro-text">Enter the answer from the previous challenge:</div>
                    <input type="text" class="retro-input" id="retro-answer-input" placeholder="Type your answer...">
                    <div class="retro-buttons">
                        <button class="retro-button" onclick="questionSystem.checkAnswer('${expectedAnswer}', ${callback})">SUBMIT</button>
                        <button class="retro-button retro-button-secondary" onclick="questionSystem.closeAnswerModal(false, ${callback})">CANCEL</button>
                    </div>
                    <div class="retro-error" id="answer-error" style="display: none;">Incorrect answer! Try again.</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addRetroStyles();
        
        // Focus input and handle Enter key
        const input = document.getElementById('retro-answer-input');
        input.focus();
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkAnswer(expectedAnswer, callback);
            }
        });
    },
    
    checkAnswer(expectedAnswer, callback) {
        const input = document.getElementById('retro-answer-input');
        console.log('Input element:', input);
        console.log('Input value raw:', input ? input.value : 'INPUT NOT FOUND');
        
        if (!input) {
            console.error('Answer input field not found!');
            return;
        }
        
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = expectedAnswer.toLowerCase();
        
        console.log('User answer:', userAnswer);
        console.log('Match:', userAnswer === correctAnswer);
        
        // Check for bypass setting - allow empty string if enabled
        const bypassEnabled = localStorage.getItem('bypassQuestions') === 'true';
        const isEmptyBypass = bypassEnabled && userAnswer === '';
        
        if (userAnswer === correctAnswer || isEmptyBypass) {
            // Correct answer or valid bypass - clear pending question and allow access
            this.currentQuestion = null;
            this.expectedAnswer = null;
            this.closeAnswerModal(true, callback);
        } else {
            // Wrong answer - show error
            const errorDiv = document.getElementById('answer-error');
            errorDiv.style.display = 'block';
            input.value = '';
            input.focus();
            
            // Add shake animation
            input.classList.add('retro-shake');
            setTimeout(() => input.classList.remove('retro-shake'), 500);
        }
    },
    
    closeQuestionModal() {
        const modal = document.querySelector('.retro-modal');
        if (modal) {
            modal.remove();
        }
        
        // Return to level select after showing the question
        if (typeof showLevelSelect === 'function') {
            showLevelSelect();
        }
    },
    
    closeAnswerModal(success, callback) {
        const modal = document.querySelector('.retro-modal');
        if (modal) {
            modal.remove();
        }
        
        // Use the stored callback from showAnswerPrompt
        if (typeof this.currentCallback === 'function') {
            this.currentCallback(success);
            this.currentCallback = null; // Clear after use
        }
    },
    
    addRetroStyles() {
        if (document.getElementById('retro-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'retro-styles';
        style.textContent = `
            .retro-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Courier New', monospace;
            }
            
            .retro-container {
                background: #000;
                border: 4px solid #00ff00;
                border-radius: 0;
                padding: 0;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 0 20px #00ff00;
                animation: retro-glow 2s ease-in-out infinite alternate;
            }
            
            .retro-header {
                background: #00ff00;
                color: #000;
                padding: 15px;
                text-align: center;
                font-weight: bold;
                font-size: 18px;
                letter-spacing: 2px;
                border-bottom: 2px solid #00ff00;
            }
            
            .retro-content {
                padding: 25px;
                color: #00ff00;
            }
            
            .retro-text {
                font-size: 14px;
                margin-bottom: 15px;
                text-align: center;
            }
            
            .retro-question {
                background: #003300;
                border: 2px solid #00ff00;
                padding: 15px;
                margin: 15px 0;
                font-size: 16px;
                text-align: center;
                color: #00ff00;
                font-weight: bold;
            }
            
            .retro-instruction {
                font-size: 12px;
                text-align: center;
                margin: 15px 0;
                color: #00aa00;
            }
            
            .retro-input {
                width: 100%;
                padding: 12px;
                background: #000;
                border: 2px solid #00ff00;
                color: #00ff00;
                font-family: 'Courier New', monospace;
                font-size: 16px;
                margin: 15px 0;
                box-sizing: border-box;
            }
            
            .retro-input:focus {
                outline: none;
                box-shadow: 0 0 10px #00ff00;
            }
            
            .retro-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 20px;
            }
            
            .retro-button {
                background: #00ff00;
                color: #000;
                border: none;
                padding: 12px 25px;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                letter-spacing: 1px;
            }
            
            .retro-button:hover {
                background: #00aa00;
                box-shadow: 0 0 10px #00ff00;
            }
            
            .retro-button-secondary {
                background: #333;
                color: #00ff00;
                border: 2px solid #00ff00;
            }
            
            .retro-button-secondary:hover {
                background: #555;
            }
            
            .retro-error {
                color: #ff0000;
                text-align: center;
                margin-top: 15px;
                font-weight: bold;
                animation: retro-blink 1s infinite;
            }
            
            .retro-shake {
                animation: retro-shake 0.5s;
            }
            
            @keyframes retro-glow {
                from { box-shadow: 0 0 20px #00ff00; }
                to { box-shadow: 0 0 30px #00ff00, 0 0 40px #00ff00; }
            }
            
            @keyframes retro-blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }
            
            @keyframes retro-shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        
        document.head.appendChild(style);
    }
};
