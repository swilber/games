# Authentic Super Mario Bros Restructure Plan

## Current Issues vs Authentic Experience

### 1. **Tile System**
- **Current**: 32x32 pixel tiles
- **Authentic**: 16x16 pixel tiles (original NES resolution)
- **Fix**: Reduce tile size, increase precision

### 2. **Physics**
- **Current**: Simple velocity/gravity
- **Authentic**: Precise acceleration curves, variable jump height
- **Fix**: Implement exact physics constants from original

### 3. **Sprites**
- **Current**: Basic colored rectangles
- **Authentic**: Pixel-perfect sprite rendering with proper animations
- **Fix**: Create authentic sprite system with frame animation

### 4. **Level Design**
- **Current**: Generic platform layout
- **Authentic**: Exact World 1-1 replica with proper positioning
- **Fix**: Use original level data and measurements

### 5. **Enemy Behavior**
- **Current**: Simple back-and-forth movement
- **Authentic**: Complex AI with edge detection, shell mechanics
- **Fix**: Implement proper enemy state machines

## Implementation Priority

### Phase 1: Core Physics (High Impact)
```javascript
// Authentic movement constants
WALK_ACCELERATION: 0.09375
MAX_WALK_SPEED: 1.5
JUMP_VELOCITY: -4.0
GRAVITY: 0.375
```

### Phase 2: Sprite System (Visual Impact)
```javascript
// 16x16 pixel sprites with proper animations
// Frame-based animation system
// Power-up transformation animations
```

### Phase 3: Level Accuracy (Gameplay Impact)
```javascript
// Exact World 1-1 layout
// Proper block positioning
// Hidden blocks and secrets
// Authentic pipe placements
```

### Phase 4: Enemy AI (Behavior Impact)
```javascript
// Goomba cliff detection
// Koopa shell mechanics
// Proper collision responses
```

### Phase 5: Power-Up System (Feature Completeness)
```javascript
// Small → Big → Fire progression
// Invincibility frames
// Proper damage system
```

## Recommended Restructure Approach

1. **Keep current working game as backup**
2. **Implement authentic physics first** (biggest gameplay impact)
3. **Replace sprite system** with pixel-perfect rendering
4. **Recreate World 1-1 exactly** using original measurements
5. **Add authentic enemy behaviors**
6. **Implement complete power-up system**

## Key Files to Create

- `mario-authentic-physics.js` - Exact physics implementation
- `mario-authentic-sprites.js` - Pixel-perfect sprite system  
- `mario-world-1-1.js` - Exact level replica
- `mario-enemy-ai.js` - Proper enemy behaviors
- `mario-powerups.js` - Complete power-up system

This approach will create a Mario game that truly feels like the original NES experience.
