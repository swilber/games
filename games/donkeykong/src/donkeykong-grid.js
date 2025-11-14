// Donkey Kong Grid-Based System (inspired by GitHub project)

// Tile Types
const TileType = {
    EMPTY: 0,
    FLOOR: 1,
    LADDER: 2,
    MARIO: 3,
    DONKEYKONG: 4,
    BARREL: 5,
    HAMMER: 6,
    OILDRUM: 7
};

class DKGridGame {
    constructor(width = 80, height = 40) {
        this.width = width;
        this.height = height;
        this.map = Array(width).fill().map(() => Array(height).fill(TileType.EMPTY));
        this.originalMap = Array(width).fill().map(() => Array(height).fill(TileType.EMPTY));
        
        this.mario = { x: 0, y: height - 2 };
        this.donkeyKong = { x: width / 2, y: 0 };
        this.barrels = [];
        
        this.gameWon = false;
        this.gameOver = false;
    }
    
    loadMapFromText(mapText) {
        const lines = mapText.split('\n').filter(line => !line.startsWith('#') && line.trim());
        
        // Scale map to fit our grid
        const scaleX = this.width / (lines[0]?.length || 80);
        const scaleY = this.height / lines.length;
        
        lines.forEach((line, row) => {
            for (let col = 0; col < line.length && col < this.width; col++) {
                const char = line[col];
                const x = Math.floor(col * scaleX);
                const y = Math.floor(row * scaleY);
                
                if (x >= this.width || y >= this.height) continue;
                
                switch (char) {
                    case ' ':
                    case '.':
                    case '-':
                        this.map[x][y] = TileType.EMPTY;
                        this.originalMap[x][y] = TileType.EMPTY;
                        break;
                    case '=':
                        this.map[x][y] = TileType.FLOOR;
                        this.originalMap[x][y] = TileType.FLOOR;
                        break;
                    case 'H':
                        this.map[x][y] = TileType.LADDER;
                        this.originalMap[x][y] = TileType.LADDER;
                        break;
                    case 'M':
                        this.mario.x = x;
                        this.mario.y = y;
                        this.map[x][y] = TileType.MARIO;
                        this.originalMap[x][y] = TileType.EMPTY;
                        break;
                    case 'K':
                        this.donkeyKong.x = x;
                        this.donkeyKong.y = y;
                        this.map[x][y] = TileType.DONKEYKONG;
                        this.originalMap[x][y] = TileType.EMPTY;
                        break;
                }
            }
        });
    }
    
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return TileType.EMPTY;
        }
        return this.map[x][y];
    }
    
    canMoveToPosition(x, y) {
        // Check if position has floor or ladder support below
        const below = this.getTile(x, y + 1);
        const current = this.getTile(x, y);
        
        return (below === TileType.FLOOR || below === TileType.LADDER) && 
               current !== TileType.FLOOR;
    }
    
    moveMario(newX, newY) {
        if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height) {
            return false;
        }
        
        if (!this.canMoveToPosition(newX, newY)) {
            return false;
        }
        
        // Clear old position
        this.map[this.mario.x][this.mario.y] = this.originalMap[this.mario.x][this.mario.y];
        
        // Set new position
        this.mario.x = newX;
        this.mario.y = newY;
        this.map[newX][newY] = TileType.MARIO;
        
        // Check win condition
        if (this.mario.x === this.donkeyKong.x && this.mario.y === this.donkeyKong.y) {
            this.gameWon = true;
        }
        
        return true;
    }
    
    marioLeft() {
        return this.moveMario(this.mario.x - 1, this.mario.y);
    }
    
    marioRight() {
        return this.moveMario(this.mario.x + 1, this.mario.y);
    }
    
    marioUp() {
        // Can only move up on ladders
        if (this.originalMap[this.mario.x][this.mario.y] === TileType.LADDER) {
            return this.moveMario(this.mario.x, this.mario.y - 1);
        }
        return false;
    }
    
    marioDown() {
        // Can move down on ladders
        if (this.getTile(this.mario.x, this.mario.y + 1) === TileType.LADDER) {
            return this.moveMario(this.mario.x, this.mario.y + 1);
        }
        return false;
    }
    
    render(ctx, canvas) {
        const tileWidth = canvas.width / this.width;
        const tileHeight = canvas.height / this.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background
        ctx.fillStyle = '#000080';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render tiles
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.map[x][y];
                const pixelX = x * tileWidth;
                const pixelY = y * tileHeight;
                
                switch (tile) {
                    case TileType.FLOOR:
                        ctx.fillStyle = '#FF6B35';
                        ctx.fillRect(pixelX, pixelY, tileWidth, tileHeight);
                        break;
                    case TileType.LADDER:
                        ctx.fillStyle = '#8B4513';
                        ctx.fillRect(pixelX, pixelY, tileWidth, tileHeight);
                        break;
                    case TileType.MARIO:
                        ctx.fillStyle = '#FF0000';
                        ctx.fillRect(pixelX, pixelY, tileWidth, tileHeight);
                        break;
                    case TileType.DONKEYKONG:
                        ctx.fillStyle = '#8B4513';
                        ctx.fillRect(pixelX, pixelY, tileWidth, tileHeight);
                        break;
                    case TileType.BARREL:
                        ctx.fillStyle = '#654321';
                        ctx.fillRect(pixelX, pixelY, tileWidth, tileHeight);
                        break;
                }
            }
        }
    }
}

async function createDonkeyKongGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 500;
    canvas.style.border = '2px solid #000';
    const ctx = canvas.getContext('2d');
    
    // Create grid game (24x20 for better fit)
    const game = new DKGridGame(24, 20);
    let gameRunning = false;
    let gameInterval = null;
    
    // Load map
    try {
        const response = await fetch('/games/donkeykong/githubproj/DonkeyKongAscii/level1.map');
        const mapText = await response.text();
        game.loadMapFromText(mapText);
    } catch (error) {
        console.error('Failed to load GitHub map, using fallback');
        // Create simple fallback
        for (let x = 0; x < game.width; x++) {
            game.map[x][game.height - 1] = TileType.FLOOR;
            game.originalMap[x][game.height - 1] = TileType.FLOOR;
        }
        game.mario.x = 0;
        game.mario.y = game.height - 2;
        game.map[0][game.height - 2] = TileType.MARIO;
    }
    
    // Controls
    const keys = {};
    
    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        keys[e.key] = true;
        
        switch (e.key) {
            case 'ArrowLeft':
                game.marioLeft();
                break;
            case 'ArrowRight':
                game.marioRight();
                break;
            case 'ArrowUp':
                game.marioUp();
                break;
            case 'ArrowDown':
                game.marioDown();
                break;
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    function gameLoop() {
        if (!gameRunning) return;
        
        game.render(ctx, canvas);
        
        if (game.gameWon) {
            console.log('Game Won!');
            gameRunning = false;
        }
    }
    
    gameArea.innerHTML = '';
    gameArea.appendChild(canvas);
    
    // Start button
    const startButton = document.createElement('button');
    startButton.textContent = 'Start Grid Game';
    startButton.onclick = () => {
        if (!gameRunning) {
            gameRunning = true;
            gameInterval = setInterval(gameLoop, 100); // Slower for grid movement
            startButton.textContent = 'Stop Game';
        } else {
            gameRunning = false;
            clearInterval(gameInterval);
            startButton.textContent = 'Start Grid Game';
        }
    };
    
    gameArea.appendChild(startButton);
    
    // Initial render
    game.render(ctx, canvas);
    
    return {
        cleanup: () => {
            if (gameInterval) {
                clearInterval(gameInterval);
            }
            gameRunning = false;
        }
    };
}
