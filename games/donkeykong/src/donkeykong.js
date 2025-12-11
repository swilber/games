// Custom Entity-Based Donkey Kong with Enhanced ASCII Maps

// Theme System
const DKThemes = {
    girders: {
        name: 'Girders',
        platforms: '#FF1493', // Hot pink
        ladders: '#00BFFF',   // Deep sky blue
        background: '#000000'  // Black
    },
    elevators: {
        name: 'Elevators', 
        platforms: '#FF1493', // Hot pink (same as girders for now)
        ladders: '#00BFFF',   // Deep sky blue (same as girders for now)
        background: '#000000'  // Black
    },
    factory: {
        name: 'Factory',
        platforms: '#8B4513', // Saddle brown
        ladders: '#FFD700',   // Gold
        background: '#1a1a1a'  // Dark gray
    },
    rivets: {
        name: 'Rivets',
        platforms: '#DC143C', // Crimson
        ladders: '#32CD32',   // Lime green
        background: '#000080'  // Navy blue
    }
};

class DKEntity {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
    }
    
    render(ctx) {
        // Override in subclasses
    }
}

class DKPlatform extends DKEntity {
    constructor(x, y, width, height, angle = 0, theme = 'girders') {
        super(x, y, width, height, 'platform');
        this.angle = angle; // Keep for reference but don't use in rendering
        this.theme = theme;
    }
    
    render(ctx) {
        // Get theme colors
        const themeColors = DKThemes[this.theme] || DKThemes.girders;
        const platformColor = themeColors.platforms;
        
        // Neon platform with rivets (always drawn straight)
        ctx.strokeStyle = platformColor;
        ctx.lineWidth = 4; // Thick lines
        
        // Top and bottom bars (straight)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.stroke();
        
        // Zigzag pattern through middle (straight)
        const bottomY = this.y + this.height - 2;
        const topY = this.y + 2;
        const peakX = this.x + this.width / 2;
        
        // Draw two separate lines to avoid filling
        ctx.beginPath();
        ctx.moveTo(this.x, bottomY);
        ctx.lineTo(peakX, topY); // Left side of ^
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(peakX, topY);
        ctx.lineTo(this.x + this.width, bottomY); // Right side of ^
        ctx.stroke();
        
        // Rivets (straight positioning)
        ctx.fillStyle = platformColor;
        for (let x = this.x + 10; x < this.x + this.width - 5; x += 20) {
            ctx.fillRect(x, this.y + 2, 2, 2);
            ctx.fillRect(x, this.y + this.height - 4, 2, 2);
        }
    }
}

class DKLadder extends DKEntity {
    constructor(x, y, width, height, theme = 'girders') {
        super(x, y, width, height, 'ladder');
        this.theme = theme;
    }
    
    render(ctx) {
        // Get theme colors
        const themeColors = DKThemes[this.theme] || DKThemes.girders;
        const ladderColor = themeColors.ladders;
        
        // Neon ladder
        ctx.strokeStyle = ladderColor;
        ctx.lineWidth = 4; // Thicker lines
        
        // Side rails
        ctx.beginPath();
        ctx.moveTo(this.x + 2, this.y);
        ctx.lineTo(this.x + 2, this.y + this.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x + this.width - 2, this.y);
        ctx.lineTo(this.x + this.width - 2, this.y + this.height);
        ctx.stroke();
        
        // Rungs
        for (let y = this.y + 8; y < this.y + this.height; y += 12) {
            ctx.beginPath();
            ctx.moveTo(this.x + 2, y);
            ctx.lineTo(this.x + this.width - 2, y);
            ctx.stroke();
        }
    }
}

class DKOilDrum extends DKEntity {
    constructor(x, y) {
        super(x, y, 25, 30, 'oildrum'); // Larger size
        this.ignited = false;
        this.flameTimer = 0;
    }
    
    ignite() {
        this.ignited = true;
    }
    
    render(ctx) {
        // Royal blue oil drum
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Light blue horizontal bands
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(this.x, this.y + 8, this.width, 3);
        ctx.fillRect(this.x, this.y + 19, this.width, 3);
        
        // Render flames if ignited
        if (this.ignited) {
            this.flameTimer++;
            const flameHeight = 10 + Math.sin(this.flameTimer * 0.3) * 4;
            
            // Orange flames
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(this.x + 2, this.y - flameHeight, this.width - 4, flameHeight);
            
            // Yellow flame tips
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(this.x + 4, this.y - flameHeight + 3, this.width - 8, flameHeight - 6);
        }
    }
}

class DKFireEnemy extends DKEntity {
    constructor(x, y) {
        super(x, y, 20, 24, 'fireenemy'); // Larger size
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.onLadder = false;
        this.speed = 1.5;
        this.animTimer = 0;
    }
    
    update(game) {
        this.animTimer++;
        
        // Original Donkey Kong fire enemy behavior:
        // 1. Move horizontally in one direction for a set distance
        // 2. When reaching platform edge or obstacle, reverse direction
        // 3. Occasionally climb ladders (semi-random with preference for Mario's level)
        // 4. Move at constant speed, not directly chasing Mario
        
        const tileWidth = 25; // Standard tile width
        
        // Initialize movement state if not set
        if (!this.movementState) {
            this.movementState = {
                direction: Math.random() < 0.5 ? -1 : 1, // -1 left, 1 right
                distanceTraveled: 0,
                maxDistance: tileWidth * (2 + Math.floor(Math.random() * 3)), // 2-4 tiles
                ladderCooldown: 0,
                onPlatformEdge: false
            };
        }
        
        // Initialize climbing state if not set
        if (!this.climbingState) {
            this.climbingState = {
                isClimbing: false,
                targetDirection: 0 // -1 up, 1 down, 0 not climbing
            };
        }
        
        // Check if on ladder (more forgiving when climbing)
        const fireCenter = this.x + this.width / 2;
        const fireBottom = this.y + this.height;
        const fireTop = this.y;
        
        this.onLadder = game.ladders.some(ladder => {
            const ladderCenter = ladder.x + ladder.width / 2;
            const ladderCenterZone = ladder.width * 0.8; // More forgiving horizontal zone
            
            // Must be horizontally aligned AND vertically overlapping with ladder
            const horizontalMatch = Math.abs(fireCenter - ladderCenter) < ladderCenterZone / 2;
            
            // More forgiving vertical bounds - allow some overhang
            let verticalMatch;
            if (this.climbingState && this.climbingState.isClimbing) {
                // When climbing, be more forgiving about vertical bounds
                verticalMatch = (fireBottom > ladder.y - 10) && (fireTop < ladder.y + ladder.height + 10);
            } else {
                // When not climbing, use normal bounds
                verticalMatch = (fireBottom > ladder.y) && (fireTop < ladder.y + ladder.height);
            }
            
            return horizontalMatch && verticalMatch;
        });
        
        // Ladder climbing logic
        if (this.onLadder) {
            if (this.movementState.ladderCooldown <= 0 && !this.climbingState.isClimbing) {
                const marioY = game.player.y;
                const fireY = this.y;
                const diff = Math.abs(marioY - fireY);
                
                // Start climbing if Mario is on a different level
                if (diff > 30) {
                    if (marioY < fireY) {
                        this.climbingState.isClimbing = true;
                        this.climbingState.targetDirection = -1; // Climb up
                    } else if (marioY > fireY) {
                        this.climbingState.isClimbing = true;
                        this.climbingState.targetDirection = 1; // Climb down
                    }
                }
            }
        } else {
            // Reset climbing state when not on ladder
            if (this.climbingState.isClimbing) {
                this.climbingState.isClimbing = false;
                this.climbingState.targetDirection = 0;
            }
        }
        
        // Handle climbing movement
        if (this.climbingState.isClimbing) {
            // Only Y movement while climbing
            this.vx = 0;
            this.vy = this.climbingState.targetDirection * this.speed;
            
            // Track starting position to avoid stopping at starting platform
            if (!this.climbingState.startY) {
                this.climbingState.startY = this.y;
            }
            
            let shouldStop = false;
            const climbedDistance = Math.abs(this.y - this.climbingState.startY);
            
            // Only check for platforms after climbing at least 20 pixels
            if (climbedDistance > 20) {
                // When climbing up, stop when fire enemy is clearly on a different platform
                if (this.climbingState.targetDirection < 0) { // Climbing up
                    game.platforms.forEach(platform => {
                        // Only stop at platforms that are above the starting position
                        if (platform.y < this.climbingState.startY - 10 &&
                            this.x + this.width/2 >= platform.x && 
                            this.x + this.width/2 <= platform.x + platform.width &&
                            this.y + this.height <= platform.y + 2) {
                            shouldStop = true;
                        }
                    });
                }
                
                // When climbing down, stop when hitting a platform below starting position
                if (this.climbingState.targetDirection > 0) { // Climbing down
                    game.platforms.forEach(platform => {
                        // Only stop at platforms that are below the starting position
                        if (platform.y > this.climbingState.startY + 10 &&
                            this.x + this.width/2 >= platform.x && 
                            this.x + this.width/2 <= platform.x + platform.width &&
                            this.y + this.height >= platform.y - 5 && 
                            this.y + this.height <= platform.y + 15) {
                            shouldStop = true;
                        }
                    });
                }
            }
            
            // Also stop if we've lost the ladder AND climbed some distance
            if (!this.onLadder && climbedDistance > 10) {
                shouldStop = true;
            }
            
            if (shouldStop) {
                this.climbingState.isClimbing = false;
                this.climbingState.targetDirection = 0;
                this.climbingState.startY = null;
                this.movementState.ladderCooldown = 120;
                this.vy = 0;
            }
        }
        // Horizontal movement (only when not climbing)
        else if (!this.climbingState.isClimbing) {
            // Only apply gravity if not on ground (prevents falling off platforms)
            if (!this.onGround && !this.onLadder) {
                this.vy += 0.5; // Gravity only when falling
            } else {
                this.vy = 0; // Stop vertical movement when on platform or ladder
            }
            
            // Check for platform edges or obstacles
            const nextX = this.x + (this.movementState.direction * this.speed);
            
            // Check if next position would be off platform
            let onPlatform = false;
            
            // Check regular platforms
            game.platforms.forEach(platform => {
                if (nextX + this.width/2 >= platform.x && 
                    nextX + this.width/2 <= platform.x + platform.width &&
                    this.y + this.height >= platform.y - 5 &&
                    this.y + this.height <= platform.y + platform.height + 5) {
                    onPlatform = true;
                }
            });
            
            // Also check elevator markers as platforms
            if (!onPlatform) {
                game.entities.forEach(entity => {
                    if (entity.type === 'elevatormarker' &&
                        nextX + this.width/2 >= entity.x && 
                        nextX + this.width/2 <= entity.x + entity.width &&
                        this.y + this.height >= entity.y - 5 &&
                        this.y + this.height <= entity.y + entity.height + 5) {
                        onPlatform = true;
                    }
                });
            }
            
            // Reverse direction if reaching edge or max distance or screen bounds
            if (!onPlatform || 
                this.movementState.distanceTraveled >= this.movementState.maxDistance ||
                nextX <= 0 || 
                nextX >= 600 - this.width) {
                
                this.movementState.direction *= -1;
                this.movementState.distanceTraveled = 0;
                this.movementState.maxDistance = tileWidth * (3 + Math.floor(Math.random() * 4));
            }
            
            // Move horizontally
            this.vx = this.movementState.direction * this.speed;
            this.movementState.distanceTraveled += Math.abs(this.vx);
        }
        
        // Reduce ladder cooldown
        if (this.movementState.ladderCooldown > 0) {
            this.movementState.ladderCooldown--;
        }
        
        // Apply movement
        this.x += this.vx;
        this.y += this.vy;
        
        // Platform collision (only when not on ladder)
        if (!this.onLadder) {
            this.onGround = false;
            
            // Check regular platforms
            game.platforms.forEach(platform => {
                if (this.x < platform.x + platform.width &&
                    this.x + this.width > platform.x &&
                    this.y + this.height >= platform.y - 2 &&
                    this.y + this.height <= platform.y + platform.height + 8) {
                    
                    if (this.vy >= 0) { // Only when falling or stationary
                        this.y = platform.y - this.height;
                        this.vy = 0;
                        this.onGround = true;
                        
                        // Reset movement state if it got corrupted
                        if (!this.movementState || !this.movementState.direction) {
                            this.movementState = {
                                direction: Math.random() < 0.5 ? -1 : 1,
                                distanceTraveled: 0,
                                maxDistance: 75 + Math.floor(Math.random() * 100),
                                ladderCooldown: 0,
                                onPlatformEdge: false
                            };
                        }
                    }
                }
            });
            
            // Also check elevator marker collisions
            if (!this.onGround) {
                game.entities.forEach(entity => {
                    if (entity.type === 'elevatormarker' &&
                        this.x < entity.x + entity.width &&
                        this.x + this.width > entity.x &&
                        this.y + this.height >= entity.y - 2 &&
                        this.y + this.height <= entity.y + entity.height + 8) {
                        
                        if (this.vy >= 0) {
                            this.y = entity.y - this.height;
                            this.vy = 0;
                            this.onGround = true;
                            
                            // Reset movement state if needed
                            if (!this.movementState || !this.movementState.direction) {
                                this.movementState = {
                                    direction: Math.random() < 0.5 ? -1 : 1,
                                    distanceTraveled: 0,
                                    maxDistance: 75 + Math.floor(Math.random() * 100),
                                    ladderCooldown: 0,
                                    onPlatformEdge: false
                                };
                            }
                        }
                    }
                });
            }
        }
        
        // Bounds
        if (this.x < 0) this.x = 0;
        if (this.x > 600 - this.width) this.x = 600 - this.width;
    }
    
    render(ctx) {
        // Animated fire sprite with flame tongues
        const flicker = Math.sin(this.animTimer * 0.4) * 0.3 + 0.7;
        const flicker2 = Math.sin(this.animTimer * 0.6 + 1) * 0.2 + 0.8;
        
        // Fire base (dark red/orange)
        ctx.fillStyle = `rgba(139, 69, 19, ${flicker})`;
        ctx.fillRect(this.x + 2, this.y + 16, this.width - 4, 8);
        
        // Main fire body (orange)
        ctx.fillStyle = `rgba(255, 69, 0, ${flicker})`;
        ctx.fillRect(this.x + 1, this.y + 8, this.width - 2, 16);
        
        // Fire middle (yellow-orange)
        ctx.fillStyle = `rgba(255, 140, 0, ${flicker2})`;
        ctx.fillRect(this.x + 3, this.y + 6, this.width - 6, 12);
        
        // Flame tongues (yellow) - multiple flickering tongues
        ctx.fillStyle = `rgba(255, 215, 0, ${flicker})`;
        const tongueHeight1 = 4 + Math.sin(this.animTimer * 0.5) * 2;
        const tongueHeight2 = 3 + Math.sin(this.animTimer * 0.7 + 2) * 2;
        const tongueHeight3 = 5 + Math.sin(this.animTimer * 0.3 + 4) * 2;
        
        // Left tongue
        ctx.fillRect(this.x + 2, this.y + 2, 4, tongueHeight1);
        // Center tongue
        ctx.fillRect(this.x + 8, this.y, 4, tongueHeight2);
        // Right tongue
        ctx.fillRect(this.x + 14, this.y + 3, 4, tongueHeight3);
        
        // Fire core (white hot center)
        ctx.fillStyle = `rgba(255, 255, 255, ${flicker * 0.4})`;
        ctx.fillRect(this.x + 6, this.y + 12, this.width - 12, 6);
    }
}

class DKBarrel extends DKEntity {
    constructor(x, y, isBlue = false) {
        super(x, y, 16, 16, 'barrel'); // Small enough for Mario to jump over
        this.vx = 2; // Rolling speed
        this.vy = 0;
        this.isBlue = isBlue;
        this.onGround = false;
    }
    
    render(ctx) {
        // Barrel color
        const barrelColor = this.isBlue ? '#4169E1' : '#8B4513'; // Royal blue or saddle brown
        const shadowColor = this.isBlue ? '#191970' : '#654321'; // Darker shades
        
        // Main barrel body (circle)
        ctx.fillStyle = barrelColor;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Barrel bands (horizontal lines for shading)
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 2, this.y + 4);
        ctx.lineTo(this.x + this.width - 2, this.y + 4);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x + 2, this.y + this.height - 4);
        ctx.lineTo(this.x + this.width - 2, this.y + this.height - 4);
        ctx.stroke();
        
        // Highlight (top-left curve for 3D effect)
        ctx.strokeStyle = this.isBlue ? '#6495ED' : '#CD853F';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2 - 2, Math.PI, Math.PI * 1.5);
        ctx.stroke();
    }
}

class DKHammer extends DKEntity {
    constructor(x, y) {
        super(x, y, 15, 20, 'hammer');
    }
    
    render(ctx) {
        // Hammer handle
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x + 6, this.y + 5, 3, 15);
        
        // Hammer head
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x, this.y, 15, 8);
        
        ctx.fillStyle = '#888';
        ctx.fillRect(this.x + 1, this.y + 1, 13, 6);
    }
}

class DKCollectible extends DKEntity {
    constructor(x, y, collectibleType) {
        super(x, y, 32, 32, 'collectible');
        this.collectibleType = collectibleType; // 'umbrella', 'bag', 'hat'
        this.collected = false;
    }
    
    render(ctx) {
        if (this.collected) return;
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        switch(this.collectibleType) {
            case 'umbrella':
                // Umbrella handle (brown)
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX - 2, centerY + 4, 4, 12);
                
                // Umbrella canopy (pink/magenta)
                ctx.fillStyle = '#FF1493';
                ctx.beginPath();
                ctx.arc(centerX, centerY - 4, 12, 0, Math.PI, true);
                ctx.fill();
                
                // Umbrella ribs
                ctx.strokeStyle = '#C71585';
                ctx.lineWidth = 2;
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI / 4) * i - Math.PI/2;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY - 4);
                    ctx.lineTo(centerX + Math.cos(angle) * 12, centerY - 4 + Math.sin(angle) * 12);
                    ctx.stroke();
                }
                break;
                
            case 'bag':
                // Purse body (pink)
                ctx.fillStyle = '#FF1493';
                ctx.fillRect(centerX - 10, centerY - 4, 20, 16);
                
                // Purse clasp (darker pink)
                ctx.fillStyle = '#C71585';
                ctx.fillRect(centerX - 10, centerY - 4, 20, 4);
                
                // Purse handle (brown)
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(centerX, centerY - 8, 6, 0, Math.PI, true);
                ctx.stroke();
                break;
                
            case 'hat':
                // Hat brim (white)
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.ellipse(centerX, centerY + 6, 14, 4, 0, 0, 2 * Math.PI);
                ctx.fill();
                
                // Hat crown (white)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(centerX - 6, centerY - 8, 12, 14);
                
                // Hat band (light brown/tan)
                ctx.fillStyle = '#D2B48C';
                ctx.fillRect(centerX - 6, centerY + 2, 12, 2);
                
                // Straw texture lines
                ctx.strokeStyle = '#F5DEB3';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(centerX - 6, centerY - 6 + i * 4);
                    ctx.lineTo(centerX + 6, centerY - 6 + i * 4);
                    ctx.stroke();
                }
                break;
        }
    }
}

class DKElevatorMarker extends DKEntity {
    constructor(x, y, markerType) {
        super(x, y, 50, 10, 'elevatormarker'); // Two cells wide to match elevator
        this.markerType = markerType; // 'start' or 'end'
    }
    
    render(ctx) {
        // Yellow platform marker
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Darker yellow outline
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

class DKElevator extends DKEntity {
    constructor(x, y, direction, startY, endY, theme = 'girders') {
        const tileHeight = 20; // Standard cell height
        super(x, y, 50, tileHeight, 'elevator'); // Two cells wide (25*2=50), 1 cell deep (20)
        this.direction = direction; // 'up' or 'down'
        this.startY = startY;
        this.endY = endY;
        this.speed = 1;
        this.theme = theme;
        this.platforms = []; // Multiple platforms on this elevator
        this.trackHeight = Math.abs(endY - startY);
        
        // Create 3 platforms spaced along the track
        const platformSpacing = this.trackHeight / 4; // Space them out
        for (let i = 0; i < 3; i++) {
            let platformY;
            if (direction === 'up') {
                platformY = startY - (i * platformSpacing);
            } else {
                platformY = endY + (i * platformSpacing);
            }
            
            this.platforms.push({
                x: x,
                y: platformY,
                width: this.width,
                height: tileHeight, // 1 cell deep
                movingUp: direction === 'up'
            });
        }
    }
    
    update() {
        this.platforms.forEach(platform => {
            if (platform.movingUp) {
                platform.y -= this.speed;
                // Teleport to bottom when reaching top
                if (platform.y <= this.endY) {
                    platform.y = this.startY;
                }
            } else {
                platform.y += this.speed;
                // Teleport to top when reaching bottom
                if (platform.y >= this.startY) {
                    platform.y = this.endY;
                }
            }
        });
    }
    
    render(ctx) {
        // Render elevator track (single pink line in center)
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.startY + this.height/2);
        ctx.lineTo(this.x + this.width/2, this.endY + this.height/2);
        ctx.stroke();
        
        // Render all platforms
        this.platforms.forEach(platform => {
            // Get theme colors
            const themeColors = DKThemes[this.theme] || DKThemes.girders;
            const platformColor = themeColors.platforms;
            
            // Make platform 1 cell deep (same as tileHeight)
            const tileHeight = 20; // Standard cell height
            platform.height = tileHeight;
            
            // Neon platform with rivets (same as DKPlatform)
            ctx.strokeStyle = platformColor;
            ctx.lineWidth = 4; // Thick lines
            
            // Top and bottom bars
            ctx.beginPath();
            ctx.moveTo(platform.x, platform.y);
            ctx.lineTo(platform.x + platform.width, platform.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(platform.x, platform.y + platform.height);
            ctx.lineTo(platform.x + platform.width, platform.y + platform.height);
            ctx.stroke();
            
            // Zigzag pattern through middle (two zigzags for two cells)
            const bottomY = platform.y + platform.height - 2;
            const topY = platform.y + 2;
            const cellWidth = platform.width / 2; // Two cells
            
            // First zigzag (left cell)
            const peak1X = platform.x + cellWidth / 2;
            ctx.beginPath();
            ctx.moveTo(platform.x, bottomY);
            ctx.lineTo(peak1X, topY);
            ctx.lineTo(platform.x + cellWidth, bottomY);
            ctx.stroke();
            
            // Second zigzag (right cell)
            const peak2X = platform.x + cellWidth + cellWidth / 2;
            ctx.beginPath();
            ctx.moveTo(platform.x + cellWidth, bottomY);
            ctx.lineTo(peak2X, topY);
            ctx.lineTo(platform.x + platform.width, bottomY);
            ctx.stroke();
            
            // Rivets (use darker color like regular platforms)
            ctx.fillStyle = '#333'; // Dark gray rivets like other platforms
            for (let x = platform.x + 10; x < platform.x + platform.width - 5; x += 20) {
                ctx.fillRect(x - 2, platform.y + 3, 4, 4);
                ctx.fillRect(x - 2, platform.y + platform.height - 7, 4, 4);
            }
        });
    }
}

// Enhanced Map Parser
class DKMapParser {
    static async loadMap(mapPath, theme = 'girders') {
        const cacheBuster = Date.now();
        const response = await fetch(`${mapPath}?t=${cacheBuster}`);
        const mapText = await response.text();
        return this.parseMap(mapText, theme);
    }
    
    static parseMap(mapText, theme = 'girders') {
        const lines = mapText.split('\n');
        const entities = [];
        
        const canvasWidth = 600;
        const canvasHeight = 500;
        const mapWidth = Math.max(...lines.map(line => line.length));
        const mapHeight = lines.length;
        
        const tileWidth = canvasWidth / mapWidth;
        const tileHeight = canvasHeight / mapHeight;
        
        // First pass: create platforms and collect their positions
        const platforms = [];
        const processedElevatorCells = new Set(); // Track processed elevator cells
        
        lines.forEach((line, row) => {
            for (let col = 0; col < line.length; col++) {
                const char = line[col];
                const x = col * tileWidth;
                let y = row * tileHeight;
                
                // Skip if this elevator cell was already processed as part of a group
                const cellKey = `${row}-${col}`;
                if (processedElevatorCells.has(cellKey)) {
                    continue;
                }
                
                // Adjust Y position for slanted platforms every 2 cells
                const cellPair = Math.floor(col / 2);
                let yOffset = 0;
                
                switch (char) {
                    case '-':
                        const flatPlatform = new DKPlatform(x, y, tileWidth, tileHeight, 0, theme);
                        entities.push(flatPlatform);
                        platforms.push({x, y, width: tileWidth, height: tileHeight});
                        break;
                    case '/':
                        yOffset = cellPair * -1;
                        const upPlatform = new DKPlatform(x, y + yOffset, tileWidth, tileHeight, 0.1, theme);
                        entities.push(upPlatform);
                        platforms.push({x, y: y + yOffset, width: tileWidth, height: tileHeight});
                        break;
                    case '\\':
                        yOffset = cellPair * 1;
                        const downPlatform = new DKPlatform(x, y + yOffset, tileWidth, tileHeight, -0.1, theme);
                        entities.push(downPlatform);
                        platforms.push({x, y: y + yOffset, width: tileWidth, height: tileHeight});
                        break;
                    case 'o':
                        entities.push(new DKOilDrum(x, y - 20));
                        break;
                    case 'p':
                        entities.push(new DKHammer(x, y - 5));
                        break;
                    case 'u': // Umbrella (parasol)
                        entities.push(new DKCollectible(x, y - 25, 'umbrella'));
                        break;
                    case 'b': // Bag (purse)
                        entities.push(new DKCollectible(x, y - 25, 'bag'));
                        break;
                    case 'h': // Hat
                        entities.push(new DKCollectible(x, y - 25, 'hat'));
                        break;
                    case 'f': // Fire enemy
                        entities.push(new DKFireEnemy(x, y - 20));
                        break;
                    case '^': // Elevator going up
                    case 'v': // Elevator going down
                        // Find consecutive elevator characters of same type
                        let width = 0;
                        let checkCol = col;
                        while (checkCol < line.length && line[checkCol] === char) {
                            processedElevatorCells.add(`${row}-${checkCol}`);
                            width++;
                            checkCol++;
                        }
                        entities.push({ 
                            type: 'elevator', 
                            x, 
                            y, 
                            direction: char === '^' ? 'up' : 'down',
                            width: width * tileWidth
                        });
                        break;
                    case 'e': // Elevator start marker
                    case 'E': // Elevator end marker
                        // Find consecutive elevator markers of same type
                        let markerWidth = 0;
                        let checkMarkerCol = col;
                        while (checkMarkerCol < line.length && line[checkMarkerCol] === char) {
                            processedElevatorCells.add(`${row}-${checkMarkerCol}`);
                            markerWidth++;
                            checkMarkerCol++;
                        }
                        const marker = new DKElevatorMarker(x, y, char === 'e' ? 'start' : 'end');
                        marker.width = markerWidth * tileWidth; // Set actual width
                        entities.push(marker);
                        break;
                    case 'M':
                        entities.push({ type: 'mario', x, y: y - 20 });
                        break;
                    case 'K':
                        entities.push({ type: 'donkeykong', x, y: y - 25 });
                        break;
                    case 'P':
                        entities.push({ type: 'princess', x, y: y - 25 });
                        break;
                }
            }
        });
        
        // Second pass: create ladders with proper heights
        lines.forEach((line, row) => {
            for (let col = 0; col < line.length; col++) {
                const char = line[col];
                if (char === 'H') {
                    const x = col * tileWidth;
                    const y = row * tileHeight;
                    
                    // Check if this column has elevator markers - if so, skip ladder creation
                    const hasElevatorMarkers = entities.some(entity => 
                        entity.type === 'elevatormarker' && 
                        x >= entity.x && x < entity.x + entity.width
                    );
                    
                    if (hasElevatorMarkers) {
                        continue; // Skip ladder creation in elevator columns
                    }
                    
                    // Find the closest platform above and below this ladder position
                    let platformBelow = null;
                    let platformAbove = null;
                    
                    // Find closest platform below (smallest y > current y)
                    let minDistanceBelow = Infinity;
                    platforms.forEach(p => {
                        if (Math.abs(p.x - x) < tileWidth/2 && p.y > y) {
                            const distance = p.y - y;
                            if (distance < minDistanceBelow) {
                                minDistanceBelow = distance;
                                platformBelow = p;
                            }
                        }
                    });
                    
                    // Find closest platform above (largest y < current y)
                    let minDistanceAbove = Infinity;
                    platforms.forEach(p => {
                        if (Math.abs(p.x - x) < tileWidth/2 && p.y < y) {
                            const distance = y - p.y;
                            if (distance < minDistanceAbove) {
                                minDistanceAbove = distance;
                                platformAbove = p;
                            }
                        }
                    });
                    
                    let ladderY = y;
                    let ladderHeight = tileHeight;
                    
                    if (platformAbove && platformBelow) {
                        // Ladder spans from bottom of upper platform to top of lower platform
                        // Add 5 pixel gap above the lower platform
                        ladderY = platformAbove.y + platformAbove.height;
                        ladderHeight = (platformBelow.y - 5) - ladderY;
                    } else if (platformBelow) {
                        // Ladder goes from current position to top of platform below
                        // Add 5 pixel gap above the platform
                        ladderHeight = (platformBelow.y - 5) - y;
                    } else if (platformAbove) {
                        // Ladder goes from bottom of platform above to current position
                        ladderY = platformAbove.y + platformAbove.height;
                        ladderHeight = y + tileHeight - ladderY;
                    }
                    
                    // Ensure minimum ladder height
                    if (ladderHeight < 20) ladderHeight = 20;
                    
                    entities.push(new DKLadder(x, ladderY, tileWidth, ladderHeight, theme));
                }
            }
        });
        
        return entities;
    }
}

// Level Configuration
const DKLevels = {
    1: { name: 'Girders', file: 'level1.map', theme: 'girders' },
    2: { name: 'Elevators', file: 'level2.map', theme: 'elevators' }
};

async function createDonkeyKongGame(settings, callbacks = null) {
    const gameArea = document.getElementById('game-area');
    
    // Load configuration
    let dkConfig = {};
    if (typeof configManager !== 'undefined') {
        dkConfig = await configManager.loadConfig('donkeykong');
    }
    
    // Check if unlock all levels is enabled
    const unlockAllLevels = dkConfig.unlockAllLevels || settings?.unlockAllLevels || 
                           dkConfig.gameplay?.unlockAllLevels || false;
    
    console.log('Donkey Kong - unlockAllLevels:', unlockAllLevels);
    console.log('dkConfig:', dkConfig);
    console.log('settings:', settings);
    
    // Temporary: Force level selection for testing
    // Remove this line once configuration is working
    // if (true) {
    
    if (unlockAllLevels) {
        // Show level selection dialog
        console.log('About to show level selection');
        
        // Simple inline level selection instead of separate function
        gameArea.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #FFFFFF; font-family: Arial, sans-serif; background: #000; min-height: 400px;">
                <h1 style="color: #FF1493; font-size: 36px; margin-bottom: 30px;">DONKEY KONG</h1>
                <h2 style="color: #00BFFF; font-size: 24px; margin-bottom: 40px;">SELECT LEVEL</h2>
                <button onclick="window.loadDKLevel(1)" 
                        style="background: #FF1493; color: #000; border: 2px solid #00BFFF; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 1: Girders
                </button>
                <button onclick="window.loadDKLevel(2)" 
                        style="background: #FF1493; color: #000; border: 2px solid #00BFFF; 
                               padding: 15px 30px; font-size: 18px; margin: 10px;
                               cursor: pointer; display: block; margin: 10px auto;">
                    Level 2: Elevators
                </button>
            </div>
        `;
        
        // Simple global function
        window.loadDKLevel = (levelNum) => {
            console.log('Loading level:', levelNum);
            const levelConfig = DKLevels[levelNum] || DKLevels[1];
            createDonkeyKongLevel(levelNum, gameArea, settings, callbacks);
        };
        
        console.log('Level selection shown successfully');
        return {
            cleanup: () => {
                // Clean up global function when game is closed
                if (window.loadDKLevel) {
                    delete window.loadDKLevel;
                }
            }
        };
    } else {
        // Load default level 1
        return createDonkeyKongLevel(1, gameArea, settings, callbacks);
    }
}

function showLevelSelection(gameArea, settings, callbacks) {
    console.log('showLevelSelection called');
    console.log('gameArea:', gameArea);
    console.log('Available levels:', Object.keys(DKLevels));
    
    const levelSelectionHTML = `
        <div style="text-align: center; padding: 50px; color: #FFFFFF; font-family: 'Courier New', monospace; background: #000; min-height: 400px;">
            <h1 style="color: #FF1493; font-size: 36px; margin-bottom: 30px;">DONKEY KONG</h1>
            <h2 style="color: #00BFFF; font-size: 24px; margin-bottom: 40px;">SELECT LEVEL</h2>
            <div id="level-buttons" style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                ${Object.entries(DKLevels).map(([num, level]) => `
                    <button onclick="loadDonkeyKongLevel(${num})" 
                            style="background: #FF1493; color: #000; border: 2px solid #00BFFF; 
                                   padding: 15px 30px; font-size: 18px; font-family: 'Courier New', monospace;
                                   cursor: pointer; min-width: 200px;">
                        Level ${num}: ${level.name}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    console.log('Setting gameArea innerHTML');
    gameArea.innerHTML = levelSelectionHTML;
    
    console.log('gameArea after setting innerHTML:', gameArea.innerHTML.substring(0, 100));
    
    // Check if content is still there after a delay
    setTimeout(() => {
        console.log('gameArea content after 1 second:', gameArea.innerHTML.substring(0, 100));
    }, 1000);
    
    // Make level loading function globally available
    window.loadDonkeyKongLevel = (levelNum) => {
        console.log('Loading level:', levelNum);
        createDonkeyKongLevel(levelNum, gameArea, settings, callbacks);
    };
    
    console.log('Level selection setup complete');
}

async function createDonkeyKongLevel(levelNum, gameArea, settings, callbacks) {
    console.log('createDonkeyKongLevel called with level:', levelNum);
    
    // Load configuration
    let dkConfig = {};
    if (typeof configManager !== 'undefined') {
        dkConfig = await configManager.loadConfig('donkeykong');
    }
    
    // Get level configuration
    const levelConfig = DKLevels[levelNum] || DKLevels[1];
    console.log('Using level config:', levelConfig);
    
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 500;
    canvas.style.border = '2px solid #000';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    // Ensure canvas dimensions match actual size
    canvas.style.width = '600px';
    canvas.style.height = '500px';
    const ctx = canvas.getContext('2d');
    
    // Game State
    const game = {
        entities: [],
        platforms: [],
        ladders: [],
        barrels: [],
        oildrums: [],
        hammers: [],
        elevators: [],
        collectibles: [],
        fireEnemies: [],
        player: { x: 50, y: 450, vx: 0, vy: 0, onGround: false, width: 20, height: 30, lives: 3, 
                 hasHammer: false, hammerTimer: 0, hammerSwingTimer: 0, facingRight: true },
        donkeyKong: { x: 50, y: 50, width: 40, height: 40 },
        princess: { x: 550, y: 50, width: 20, height: 30 },
        barrelTimer: 0,
        barrelThrowRate: 120, // Configurable: frames between barrel throws
        gameRunning: false,
        gameInterval: null,
        gameOver: false,
        keys: {},
        score: 0,
        currentLevel: levelNum
    };
    
    async function loadLevel() {
        const entities = await DKMapParser.loadMap(`./games/donkeykong/maps/${levelConfig.file}`, levelConfig.theme);
        
        entities.forEach(entity => {
            if (entity.type === 'platform') {
                game.platforms.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'ladder') {
                game.ladders.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'oildrum') {
                game.oildrums.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'hammer') {
                game.hammers.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'collectible') {
                game.collectibles.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'fireenemy') {
                game.fireEnemies.push(entity);
                game.entities.push(entity);
            } else if (entity.type === 'elevatormarker') {
                game.entities.push(entity);
            } else if (entity.type === 'elevator') {
                // Store elevator data for processing after all entities are loaded
                entity.elevatorData = true;
            } else if (entity.type === 'mario') {
                game.player.x = entity.x;
                game.player.y = entity.y;
            } else if (entity.type === 'donkeykong') {
                game.donkeyKong.x = entity.x;
                game.donkeyKong.y = entity.y;
            } else if (entity.type === 'princess') {
                game.princess.x = entity.x;
                game.princess.y = entity.y;
            }
        });
        
        // Process elevators after all entities are loaded
        const elevatorData = entities.filter(e => e.elevatorData);
        const elevatorMarkers = entities.filter(e => e.type === 'elevatormarker');
        
        console.log('Elevator data found:', elevatorData.length);
        console.log('Elevator markers found:', elevatorMarkers.length);
        
        elevatorData.forEach(elevatorInfo => {
            // Find start and end markers for this elevator column
            const sameColumn = elevatorMarkers.filter(marker => 
                Math.abs(marker.x - elevatorInfo.x) < 15
            );
            
            console.log('Same column markers for elevator at', elevatorInfo.x, ':', sameColumn.length);
            
            if (sameColumn.length >= 2) {
                // For elevators, start is always the lower position, end is always the higher position
                const positions = sameColumn.map(m => m.y).sort((a, b) => b - a); // Sort descending (higher y = lower on screen)
                const startY = positions[0]; // Lower position (higher y value)
                const endY = positions[1];   // Higher position (lower y value)
                
                console.log('Creating elevator from', startY, 'to', endY, 'direction:', elevatorInfo.direction);
                const elevator = new DKElevator(
                    elevatorInfo.x, 
                    startY, 
                    elevatorInfo.direction,
                    startY,
                    endY,
                    levelConfig.theme
                );
                // Use the width from the grouped elevator data
                elevator.width = elevatorInfo.width || 50;
                game.elevators.push(elevator);
                game.entities.push(elevator);
            }
        });
        
        // Store current theme for background rendering
        game.currentTheme = levelConfig.theme;
        
        render();
    }
    
    function gameLoop() {
        if (!game.gameRunning) return;
        
        // Donkey Kong throws barrels
        game.barrelTimer++;
        if (game.barrelTimer >= game.barrelThrowRate) {
            game.barrelTimer = 0;
            const isBlue = Math.random() < 0.3; // 30% chance for blue barrel
            const barrel = new DKBarrel(game.donkeyKong.x + 20, game.donkeyKong.y + 40, isBlue);
            game.barrels.push(barrel);
        }
        
        // Update barrels
        game.barrels.forEach((barrel, index) => {
            // Barrel physics
            barrel.vy += 0.5; // Gravity
            barrel.x += barrel.vx;
            barrel.y += barrel.vy;
            
            // Screen edge collision (turn around)
            if (barrel.x <= 0 || barrel.x >= canvas.width - barrel.width) {
                barrel.vx = -barrel.vx;
            }
            
            // Platform collision
            barrel.onGround = false;
            game.platforms.forEach(platform => {
                if (barrel.x < platform.x + platform.width &&
                    barrel.x + barrel.width > platform.x &&
                    barrel.y < platform.y + platform.height &&
                    barrel.y + barrel.height > platform.y) {
                    
                    if (barrel.vy > 0) {
                        barrel.y = platform.y - barrel.height;
                        barrel.vy = 0;
                        barrel.onGround = true;
                    }
                }
            });
            
            // Elevator marker collision (treat markers as platforms)
            game.entities.forEach(entity => {
                if (entity.type === 'elevatormarker' &&
                    barrel.x < entity.x + entity.width &&
                    barrel.x + barrel.width > entity.x &&
                    barrel.y < entity.y + entity.height &&
                    barrel.y + barrel.height > entity.y) {
                    
                    if (barrel.vy > 0) {
                        barrel.y = entity.y - barrel.height;
                        barrel.vy = 0;
                        barrel.onGround = true;
                    }
                }
            });
            
            // Remove barrels that fall off screen
            if (barrel.y > canvas.height + 50) {
                game.barrels.splice(index, 1);
            }
        });
        
        // Check barrel-Mario collision
        game.barrels.forEach(barrel => {
            if (game.player.x < barrel.x + barrel.width &&
                game.player.x + game.player.width > barrel.x &&
                game.player.y < barrel.y + barrel.height &&
                game.player.y + game.player.height > barrel.y) {
                
                // Mario hit by barrel - lose life and restart
                game.player.lives--;
                if (game.player.lives <= 0) {
                    // Game over
                    game.gameRunning = false;
                    game.gameOver = true;
                    clearInterval(game.gameInterval);
                    return;
                } else {
                    // Restart level - reset Mario position and clear barrels
                    game.player.x = 50;
                    game.player.y = 450;
                    game.player.vx = 0;
                    game.player.vy = 0;
                    game.player.onGround = false;
                    game.barrels = []; // Clear all barrels
                    game.barrelTimer = 0;
                }
            }
        });
        
        // Check collectible-Mario collision
        game.collectibles.forEach(collectible => {
            if (!collectible.collected &&
                game.player.x < collectible.x + collectible.width &&
                game.player.x + game.player.width > collectible.x &&
                game.player.y < collectible.y + collectible.height &&
                game.player.y + game.player.height > collectible.y) {
                
                // Mario collected item - add points based on level
                collectible.collected = true;
                let points = 300; // Level 1 default
                if (game.currentLevel === 2) points = 500;
                else if (game.currentLevel >= 3) points = 800;
                
                game.score += points;
            }
        });
        
        // Check hammer pickup collision
        if (!game.player.hasHammer) {
            game.hammers.forEach((hammer, index) => {
                if (game.player.x < hammer.x + hammer.width &&
                    game.player.x + game.player.width > hammer.x &&
                    game.player.y < hammer.y + hammer.height &&
                    game.player.y + game.player.height > hammer.y) {
                    
                    // Mario picked up hammer
                    game.player.hasHammer = true;
                    game.player.hammerTimer = 1200; // 20 seconds at 60fps
                    game.player.hammerSwingTimer = 0;
                    
                    // Remove hammer from game
                    game.hammers.splice(index, 1);
                    const entityIndex = game.entities.indexOf(hammer);
                    if (entityIndex > -1) {
                        game.entities.splice(entityIndex, 1);
                    }
                }
            });
        }
        
        // Update elevators
        game.elevators.forEach(elevator => {
            elevator.update();
        });
        
        // Update fire enemies
        game.fireEnemies.forEach(fire => {
            fire.update(game);
        });
        
        // Check oil drum collisions with barrels
        game.oildrums.forEach(oildrum => {
            game.barrels.forEach((barrel, barrelIndex) => {
                if (barrel.x < oildrum.x + oildrum.width &&
                    barrel.x + barrel.width > oildrum.x &&
                    barrel.y < oildrum.y + oildrum.height &&
                    barrel.y + barrel.height > oildrum.y) {
                    
                    if (barrel.isBlue) {
                        // Blue barrel ignites oil drum and creates fire enemy
                        if (!oildrum.ignited) {
                            oildrum.ignite();
                        }
                        
                        // Create fire enemy
                        const fireEnemy = new DKFireEnemy(oildrum.x, oildrum.y - 16);
                        game.fireEnemies.push(fireEnemy);
                        game.entities.push(fireEnemy);
                        
                        // Remove blue barrel
                        game.barrels.splice(barrelIndex, 1);
                    } else if (oildrum.ignited) {
                        // Ignited oil drum destroys brown barrels
                        game.barrels.splice(barrelIndex, 1);
                        game.score += 100; // Points for destroying barrel
                    }
                }
            });
        });
        
        // Check fire enemy collisions with Mario
        game.fireEnemies.forEach(fire => {
            if (game.player.x < fire.x + fire.width &&
                game.player.x + game.player.width > fire.x &&
                game.player.y < fire.y + fire.height &&
                game.player.y + game.player.height > fire.y) {
                
                // Mario hit by fire - lose life and restart
                game.player.lives--;
                if (game.player.lives <= 0) {
                    // Game over
                    game.gameRunning = false;
                    game.gameOver = true;
                    clearInterval(game.gameInterval);
                    return;
                } else {
                    // Restart level - reset Mario position and clear enemies
                    game.player.x = 50;
                    game.player.y = 450;
                    game.player.vx = 0;
                    game.player.vy = 0;
                    game.player.onGround = false;
                    game.barrels = [];
                    
                    // Remove fire enemies from entities array
                    game.fireEnemies.forEach(fire => {
                        const entityIndex = game.entities.indexOf(fire);
                        if (entityIndex > -1) {
                            game.entities.splice(entityIndex, 1);
                        }
                    });
                    game.fireEnemies = [];
                    
                    game.barrelTimer = 0;
                }
            }
        });
        
        // Update hammer timer
        if (game.player.hasHammer) {
            game.player.hammerTimer--;
            game.player.hammerSwingTimer++;
            
            if (game.player.hammerTimer <= 0) {
                game.player.hasHammer = false;
            }
        }
        
        // Check if Mario is on a ladder (center must be touching ladder center)
        // Cannot climb ladders while holding hammer
        const marioCenter = game.player.x + game.player.width / 2;
        const onLadder = !game.player.hasHammer && game.ladders.some(ladder => {
            const ladderCenter = ladder.x + ladder.width / 2;
            const ladderCenterZone = ladder.width * 0.6; // 60% of ladder width for center zone
            
            return Math.abs(marioCenter - ladderCenter) < ladderCenterZone / 2 &&
                   game.player.y < ladder.y + ladder.height &&
                   game.player.y + game.player.height > ladder.y;
        });
        
        // Also check if there's a ladder that starts at Mario's level and goes down
        const ladderBelow = game.ladders.some(ladder => {
            const ladderCenter = ladder.x + ladder.width / 2;
            const ladderCenterZone = ladder.width * 0.6;
            
            const centerMatch = Math.abs(marioCenter - ladderCenter) < ladderCenterZone / 2;
            // Ladder should start at or near Mario's platform level and extend downward
            const startsAtMarioLevel = Math.abs(ladder.y - (game.player.y + game.player.height)) < 20;
            const extendsDown = ladder.y + ladder.height > game.player.y + game.player.height + 30;
            
            return centerMatch && startsAtMarioLevel && extendsDown;
        });
        
        // Handle movement
        if (game.keys['ArrowLeft']) {
            game.player.vx = -3;
            game.player.facingRight = false;
        } else if (game.keys['ArrowRight']) {
            game.player.vx = 3;
            game.player.facingRight = true;
        } else {
            game.player.vx = 0;
        }
        
        // Handle ladder climbing (disable gravity when on ladder)
        if (onLadder) {
            if (game.keys['ArrowUp']) {
                game.player.vy = -3;
            } else if (game.keys['ArrowDown']) {
                game.player.vy = 3;
            } else {
                game.player.vy = 0; // Stop vertical movement when not pressing up/down
            }
        } else if (ladderBelow && game.keys['ArrowDown']) {
            // Allow Mario to start climbing down when there's a ladder below him
            game.player.vy = 3;
        } else {
            // Only apply gravity when not on ladder
            game.player.vy += 0.5;
        }
        
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;
        
        // Bounds
        if (game.player.x < 0) game.player.x = 0;
        if (game.player.x > canvas.width - game.player.width) game.player.x = canvas.width - game.player.width;
        
        // Platform collision (only when not on ladder)
        if (!onLadder) {
            game.player.onGround = false;
            game.platforms.forEach(platform => {
                if (game.player.x < platform.x + platform.width &&
                    game.player.x + game.player.width > platform.x &&
                    game.player.y + game.player.height >= platform.y &&
                    game.player.y + game.player.height <= platform.y + platform.height + 5) {
                    
                    // Only land on platform if Mario is falling (vy > 0) and his feet hit the top
                    if (game.player.vy > 0 && game.player.y + game.player.height >= platform.y) {
                        game.player.y = platform.y - game.player.height;
                        game.player.vy = 0;
                        game.player.onGround = true;
                    }
                }
            });
            
            // Check elevator collisions
            game.elevators.forEach(elevator => {
                elevator.platforms.forEach(platform => {
                    if (game.player.x < platform.x + platform.width &&
                        game.player.x + game.player.width > platform.x &&
                        game.player.y + game.player.height >= platform.y &&
                        game.player.y + game.player.height <= platform.y + platform.height + 5) {
                        
                        if (game.player.vy > 0 && game.player.y + game.player.height >= platform.y) {
                            game.player.y = platform.y - game.player.height;
                            game.player.vy = 0;
                            game.player.onGround = true;
                            
                            // Move Mario with the elevator platform
                            if (platform.movingUp) {
                                game.player.y -= elevator.speed;
                                // Teleport Mario with platform
                                if (platform.y <= elevator.endY) {
                                    game.player.y += elevator.trackHeight;
                                }
                            } else {
                                game.player.y += elevator.speed;
                                // Teleport Mario with platform
                                if (platform.y >= elevator.startY) {
                                    game.player.y -= elevator.trackHeight;
                                }
                            }
                        }
                    }
                });
            });
            
            // Check elevator marker collisions (yellow platforms)
            game.entities.forEach(entity => {
                if (entity.type === 'elevatormarker' &&
                    game.player.x < entity.x + entity.width &&
                    game.player.x + game.player.width > entity.x &&
                    game.player.y + game.player.height >= entity.y &&
                    game.player.y + game.player.height <= entity.y + entity.height + 5) {
                    
                    if (game.player.vy > 0 && game.player.y + game.player.height >= entity.y) {
                        game.player.y = entity.y - game.player.height;
                        game.player.vy = 0;
                        game.player.onGround = true;
                    }
                }
            });
        }
        
        // Check if Mario reached the Princess (level complete)
        if (game.player.x < game.princess.x + game.princess.width &&
            game.player.x + game.player.width > game.princess.x &&
            game.player.y < game.princess.y + game.princess.height &&
            game.player.y + game.player.height > game.princess.y) {
            
            // Level complete!
            game.gameRunning = false;
            clearInterval(game.gameInterval);
            
            // Check if there's a next level
            const nextLevel = game.currentLevel + 1;
            const hasNextLevel = DKLevels[nextLevel] !== undefined;
            
            if (hasNextLevel) {
                // Darken background for better text visibility
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Show level completion and next level message with thick text
                ctx.textAlign = 'center';
                
                // Level Complete text
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.font = 'bold 48px Courier New';
                ctx.strokeText('LEVEL COMPLETE!', canvas.width / 2, canvas.height / 2 - 50);
                ctx.fillStyle = '#FFFF00';
                ctx.fillText('LEVEL COMPLETE!', canvas.width / 2, canvas.height / 2 - 50);
                
                // Starting Level text
                ctx.font = 'bold 32px Courier New';
                ctx.strokeText(`STARTING LEVEL ${nextLevel}`, canvas.width / 2, canvas.height / 2 + 20);
                ctx.fillStyle = '#00FF00';
                ctx.fillText(`STARTING LEVEL ${nextLevel}`, canvas.width / 2, canvas.height / 2 + 20);
                
                // Level name text
                ctx.font = 'bold 20px Courier New';
                ctx.strokeText(`${DKLevels[nextLevel].name.toUpperCase()}`, canvas.width / 2, canvas.height / 2 + 60);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`${DKLevels[nextLevel].name.toUpperCase()}`, canvas.width / 2, canvas.height / 2 + 60);
                
                // Auto-advance to next level after 3 seconds
                setTimeout(() => {
                    createDonkeyKongLevel(nextLevel, gameArea, settings, callbacks);
                }, 3000);
                
            } else {
                // Darken background for better text visibility
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Game complete - no more levels
                ctx.textAlign = 'center';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                
                ctx.font = 'bold 48px Courier New';
                ctx.strokeText('GAME COMPLETE!', canvas.width / 2, canvas.height / 2 - 30);
                ctx.fillStyle = '#FFFF00';
                ctx.fillText('GAME COMPLETE!', canvas.width / 2, canvas.height / 2 - 30);
                
                ctx.font = 'bold 24px Courier New';
                ctx.strokeText('CONGRATULATIONS!', canvas.width / 2, canvas.height / 2 + 20);
                ctx.fillStyle = '#00FF00';
                ctx.fillText('CONGRATULATIONS!', canvas.width / 2, canvas.height / 2 + 20);
                
                // Show question callback after 2 seconds
                if (!game.questionCallbackTriggered) {
                    game.questionCallbackTriggered = true;
                    
                    setTimeout(() => {
                        if (callbacks && callbacks.onGameComplete) {
                            callbacks.onGameComplete();
                        }
                    }, 2000);
                }
            }
            
            return; // Stop game loop
        }
        
        render();
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Theme-based background
        const themeColors = DKThemes[game.currentTheme || 'girders'] || DKThemes.girders;
        ctx.fillStyle = themeColors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render entities
        game.entities.forEach(entity => {
            entity.render(ctx);
        });
        
        // Mario (original red/blue sprite style)
        const marioX = game.player.x;
        const marioY = game.player.y;
        const marioW = game.player.width;
        const marioH = game.player.height;
        
        // Mario's hat (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(marioX + 2, marioY, marioW - 4, 8);
        
        // Mario's face (peach)
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(marioX + 4, marioY + 6, marioW - 8, 6);
        
        // Mario's shirt (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(marioX + 2, marioY + 12, marioW - 4, 8);
        
        // Mario's overalls (blue)
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(marioX + 3, marioY + 20, marioW - 6, 6);
        
        // Mario's legs (blue)
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(marioX + 2, marioY + 26, 6, 4);
        ctx.fillRect(marioX + marioW - 8, marioY + 26, 6, 4);
        
        // Render hammer if Mario has one
        if (game.player.hasHammer) {
            const swingAngle = Math.sin(game.player.hammerSwingTimer * 0.2) * 0.6; // -0.6 to 0.6 radians
            const pivotX = marioX + marioW / 2;
            const pivotY = marioY + 10;
            
            // Use player's facing direction
            const baseAngle = game.player.facingRight ? 0 : Math.PI;
            const finalAngle = baseAngle + swingAngle;
            
            // Calculate hammer position based on swing angle
            const handleLength = 18;
            const handleEndX = pivotX + Math.cos(finalAngle) * handleLength;
            const handleEndY = pivotY + Math.sin(finalAngle) * handleLength;
            
            // Hammer handle (from pivot to end)
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.lineTo(handleEndX, handleEndY);
            ctx.stroke();
            
            // Hammer head at end of handle (vertical orientation)
            ctx.fillStyle = '#666';
            ctx.fillRect(handleEndX - 4, handleEndY - 7, 8, 14);
            ctx.fillStyle = '#888';
            ctx.fillRect(handleEndX - 3, handleEndY - 6, 6, 12);
            
            // Check hammer-barrel collision using hammer head position
            game.barrels.forEach((barrel, index) => {
                if (handleEndX - 4 < barrel.x + barrel.width &&
                    handleEndX + 4 > barrel.x &&
                    handleEndY - 7 < barrel.y + barrel.height &&
                    handleEndY + 7 > barrel.y) {
                    
                    // Destroy barrel and add points
                    game.barrels.splice(index, 1);
                    game.score += 500;
                }
            });
        }
        
        // Donkey Kong (brown gorilla with tie)
        const dkX = game.donkeyKong.x;
        const dkY = game.donkeyKong.y;
        const dkW = game.donkeyKong.width;
        const dkH = game.donkeyKong.height;
        
        // DK's body (brown)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(dkX, dkY + 8, dkW, dkH - 8);
        
        // DK's head (brown)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(dkX + 8, dkY, dkW - 16, 16);
        
        // DK's face (lighter brown)
        ctx.fillStyle = '#D2691E';
        ctx.fillRect(dkX + 12, dkY + 4, dkW - 24, 8);
        
        // DK's tie (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(dkX + dkW/2 - 3, dkY + 16, 6, 16);
        
        // DK's arms
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(dkX - 4, dkY + 12, 8, 12);
        ctx.fillRect(dkX + dkW - 4, dkY + 12, 8, 12);
        
        // Princess Peach (pink dress, blonde hair)
        const pX = game.princess.x;
        const pY = game.princess.y;
        const pW = game.princess.width;
        const pH = game.princess.height;
        
        // Princess's hair (blonde)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(pX + 2, pY, pW - 4, 8);
        
        // Princess's face (peach)
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(pX + 4, pY + 6, pW - 8, 6);
        
        // Princess's dress (pink)
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(pX, pY + 12, pW, pH - 12);
        
        // Princess's dress details (hot pink)
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(pX + 2, pY + 16, pW - 4, 2);
        ctx.fillRect(pX + 2, pY + 22, pW - 4, 2);
        
        // Render barrels
        game.barrels.forEach(barrel => {
            barrel.render(ctx);
        });
        
        // Display lives and level info
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Lives: ${game.player.lives}`, 10, 25);
        ctx.fillText(`Level ${game.currentLevel}: ${DKLevels[game.currentLevel]?.name || 'Unknown'}`, 10, 45);
        ctx.fillText(`Score: ${game.score}`, 10, 65);
        
        // Display game over screen
        if (game.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#FF0000';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '24px Arial';
            ctx.fillText('Press R to restart from Level 1', canvas.width / 2, canvas.height / 2 + 50);
        }
    }
    
    function restartToLevel1() {
        // Reset game state to level 1 FIRST
        game.currentLevel = 1;
        game.score = 0;
        game.gameOver = false;
        game.player.lives = 3;
        game.player.x = 50;
        game.player.y = 450;
        game.player.vx = 0;
        game.player.vy = 0;
        game.player.onGround = false;
        game.player.hasHammer = false;
        game.player.hammerTimer = 0;
        game.player.hammerSwingTimer = 0;
        game.player.facingRight = true;
        
        // Clear all game objects
        game.barrels = [];
        game.oildrums = [];
        game.hammers = [];
        game.elevators = [];
        game.collectibles = [];
        game.fireEnemies = [];
        
        // Reset timers
        game.barrelTimer = 0;
        
        // Reload level 1
        loadLevel().then(() => {
            game.gameRunning = true;
            game.gameInterval = setInterval(gameLoop, 16);
        }).catch(error => {
            console.error('Error loading level:', error);
        });
    }
    
    // Controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Return to level selection if unlock all levels is enabled
            const unlockAllLevels = dkConfig.unlockAllLevels || settings?.unlockAllLevels || false;
            if (unlockAllLevels) {
                game.gameRunning = false;
                if (game.gameInterval) {
                    clearInterval(game.gameInterval);
                }
                showLevelSelection(gameArea, settings, callbacks);
                return;
            }
        }
        
        if (game.gameOver && e.key === 'r') {
            // Restart game - reset to level 1
            if (callbacks?.onGameComplete) {
                callbacks.onGameComplete('donkeykong', { 
                    completed: false, 
                    score: game.score,
                    level: 1,
                    restart: true
                });
            } else {
                // Fallback: use the restart function
                restartToLevel1();
            }
            return;
        }
        
        if (!game.gameRunning && e.key === 'r') {
            // This handles other non-game-over restart scenarios
            restartToLevel1();
            return;
        }
        
        if (!game.gameRunning) return;
        
        game.keys[e.key] = true;
        
        if (e.key === ' ' && game.player.onGround) {
            game.player.vy = -6; // Reduced to jump ~3 grid cells high
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        game.keys[e.key] = false;
        e.preventDefault();
    });
    
    // Initialize
    await loadLevel();
    
    gameArea.innerHTML = '';
    gameArea.appendChild(canvas);
    
    // Auto-start game
    game.gameRunning = true;
    game.gameInterval = setInterval(gameLoop, 16);
    
    return {
        cleanup: () => {
            if (game.gameInterval) {
                clearInterval(game.gameInterval);
            }
            game.gameRunning = false;
        }
    };
}
