// Advanced Brick Breaker Level Maps
const advancedMaps = {
    // Fortress pattern - thick walls with narrow passages
    fortress: {
        name: "Fortress",
        difficulty: "Hard",
        pattern: [
            "RRRRRRRRRRRRRR",
            "R............R",
            "R.OOOOOOOOOO.R",
            "R.O........O.R",
            "R.O.YYYYYY.O.R",
            "R.O.Y....Y.O.R",
            "R.O.Y.GG.Y.O.R",
            "R.O.Y....Y.O.R",
            "R.O.YYYYYY.O.R",
            "R.O........O.R",
            "R.OOOOOOOOOO.R",
            "R............R",
            "RRRRRRRRRRRRRR"
        ]
    },

    // Spiral pattern
    spiral: {
        name: "Spiral",
        difficulty: "Medium",
        pattern: [
            "BBBBBBBBBBBBBB",
            "B............B",
            "B.GGGGGGGGGG.B",
            "B.G........G.B",
            "B.G.YYYYYY.G.B",
            "B.G.Y....Y.G.B",
            "B.G.Y.OO.Y.G.B",
            "B.G.Y.OR.Y.G.B",
            "B.G.Y.RR.Y.G.B",
            "B.G.YYYYYY.G.B",
            "B.G........G.B",
            "B.GGGGGGGGGG.B",
            "B............B",
            "BBBBBBBBBBBBBB"
        ]
    },

    // Diamond formation
    diamond: {
        name: "Diamond",
        difficulty: "Medium",
        pattern: [
            "......RR......",
            ".....RRRR.....",
            "....RRRRRR....",
            "...OOOOOOOO...",
            "..OOOOOOOOOO..",
            ".YYYYYYYYYYYY.",
            "GGGGGGGGGGGGGG",
            ".YYYYYYYYYYYY.",
            "..OOOOOOOOOO..",
            "...OOOOOOOO...",
            "....RRRRRR....",
            ".....RRRR.....",
            "......RR......"
        ]
    },

    // Maze pattern
    maze: {
        name: "Maze",
        difficulty: "Hard",
        pattern: [
            "RRRRRRRRRRRRRR",
            "R....R....R..R",
            "R.RR.R.RR.R.RR",
            "R....R....R..R",
            "RRRR.RRRR.RRRR",
            "O....O....O..O",
            "O.OO.O.OO.O.OO",
            "O....O....O..O",
            "YYYY.YYYY.YYYY",
            "G....G....G..G",
            "G.GG.G.GG.G.GG",
            "G....G....G..G",
            "BBBBBBBBBBBBBB"
        ]
    },

    // Cross pattern
    cross: {
        name: "Cross",
        difficulty: "Medium",
        pattern: [
            "......RR......",
            "......RR......",
            "......RR......",
            "OOOOOOOOOOOOOO",
            "OOOOOOOOOOOOOO",
            "......YY......",
            "......YY......",
            "GGGGGGGGGGGGGG",
            "GGGGGGGGGGGGGG",
            "......BB......",
            "......BB......",
            "......BB......"
        ]
    },

    // Pyramid with gaps
    pyramid: {
        name: "Pyramid",
        difficulty: "Easy",
        pattern: [
            "......RR......",
            ".....R..R.....",
            "....R....R....",
            "...O......O...",
            "..O........O..",
            ".Y..........Y.",
            "G............G",
            "BBBBBBBBBBBBBB"
        ]
    },

    // Checkerboard
    checkerboard: {
        name: "Checkerboard",
        difficulty: "Medium",
        pattern: [
            "R.R.R.R.R.R.R.",
            ".O.O.O.O.O.O.O",
            "Y.Y.Y.Y.Y.Y.Y.",
            ".G.G.G.G.G.G.G",
            "B.B.B.B.B.B.B.",
            ".R.R.R.R.R.R.R",
            "O.O.O.O.O.O.O.",
            ".Y.Y.Y.Y.Y.Y.Y"
        ]
    },

    // Invaders pattern
    invaders: {
        name: "Space Invaders",
        difficulty: "Hard",
        pattern: [
            "..RR....RR....",
            ".RRRR..RRRR...",
            "RRRRRRRRRRRRRR",
            "RRR.RRRR.RRRRR",
            "RRRRRRRRRRRRRR",
            "..R.RRRR.R....",
            ".R.R....R.R...",
            "R..R....R..R.."
        ]
    }
};

// Color mapping for brick types
const brickTypeColors = {
    'R': { color: '#ff0000', hits: 3, points: 10 }, // Red - 3 hits
    'O': { color: '#ff8000', hits: 2, points: 7 },  // Orange - 2 hits
    'Y': { color: '#ffff00', hits: 2, points: 5 },  // Yellow - 2 hits
    'G': { color: '#00ff00', hits: 1, points: 3 },  // Green - 1 hit
    'B': { color: '#0080ff', hits: 1, points: 1 },  // Blue - 1 hit
    '.': null // Empty space
};

// Function to generate bricks from pattern
function generateBricksFromPattern(pattern, canvasWidth = 800) {
    const bricks = [];
    const rows = pattern.length;
    const cols = pattern[0].length;
    const brickWidth = (canvasWidth - 40) / cols;
    const brickHeight = 20;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const brickType = pattern[row][col];
            const brickInfo = brickTypeColors[brickType];
            
            if (brickInfo) {
                bricks.push({
                    x: 20 + col * (brickWidth + 2),
                    y: 60 + row * (brickHeight + 5),
                    width: brickWidth,
                    height: brickHeight,
                    color: brickInfo.color,
                    points: brickInfo.points,
                    hits: brickInfo.hits,
                    maxHits: brickInfo.hits
                });
            }
        }
    }
    
    return bricks;
}

// Function to get random advanced map
function getRandomAdvancedMap() {
    const mapNames = Object.keys(advancedMaps);
    const randomName = mapNames[Math.floor(Math.random() * mapNames.length)];
    return advancedMaps[randomName];
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { advancedMaps, generateBricksFromPattern, getRandomAdvancedMap };
}
