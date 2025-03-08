const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const path = require('path');

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Game state
const gameState = {
  players: new Map(),
  bullets: [],
  walls: [
    // Outer walls
    { x: -1000, y: -1000, width: 2000, height: 20 }, // Top
    { x: -1000, y: 980, width: 2000, height: 20 },   // Bottom
    { x: -1000, y: -1000, width: 20, height: 2000 }, // Left
    { x: 980, y: -1000, width: 20, height: 2000 },   // Right
    
        // Inner walls (Balanced & Strategic)
    { x: -500, y: -500, width: 150, height: 20 },    // Horizontal - Top Left
    { x: -500, y: -450, width: 20, height: 150 },    // Vertical - Top Left

    { x: 350, y: -500, width: 150, height: 20 },     // Horizontal - Top Right
    { x: 450, y: -450, width: 20, height: 150 },     // Vertical - Top Right

    { x: -500, y: 400, width: 150, height: 20 },     // Horizontal - Bottom Left
    { x: -500, y: 400, width: 20, height: 150 },     // Vertical - Bottom Left

    { x: 400, y: 400, width: 150, height: 20 },      // Horizontal - Bottom Right
    { x: 450, y: 400, width: 20, height: 150 },      // Vertical - Bottom Right

    // Central Structure (Creates a chokepoint)
    { x: -100, y: -100, width: 200, height: 20 },    // Horizontal
    { x: -100, y: -100, width: 20, height: 200 },    // Vertical
    { x: 80, y: -100, width: 20, height: 200 },      // Vertical
    { x: -100, y: 80, width: 200, height: 20 }       // Horizontal
  ],
  lastUpdateTime: Date.now(),
  colorIndex: 0 // Keep track of assigned colors
};

// Game constants (moved from client)
const GAME_CONSTANTS = {
  PLAYER_RADIUS: 20,
  PLAYER_SPEED: 4.0, // Increased 4x from 1.0
  PLAYER_MAX_HEALTH: 100,
  BULLET_RADIUS: 5,
  BULLET_SPEED: 7.5, // Increased 5x from 1.5
  BULLET_DAMAGE: 20,
  TICK_RATE: 60,
  INTERPOLATION_DELAY: 100, // ms
  COLORS: {
    PLAYER1: '#4287f5', // Blue
    PLAYER2: '#f54242', // Red
    PLAYER3: '#42f554', // Green
    PLAYER4: '#f542f5'  // Purple
  }
};

// Physics calculations
const physics = {
  updatePlayer(player, input) {
    // Calculate acceleration based on input
    let ax = 0;
    let ay = 0;
    
    if (input.left) ax -= player.acceleration;
    if (input.right) ax += player.acceleration;
    if (input.up) ay -= player.acceleration;
    if (input.down) ay += player.acceleration;
    
    // Apply acceleration to velocity
    player.velocityX += ax;
    player.velocityY += ay;
    
    // Apply friction
    player.velocityX *= player.friction;
    player.velocityY *= player.friction;
    
    // Limit speed
    const speed = Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY);
    if (speed > player.maxSpeed) {
      const scale = player.maxSpeed / speed;
      player.velocityX *= scale;
      player.velocityY *= scale;
    }
    
    // Calculate new position
    const newX = player.x + player.velocityX;
    const newY = player.y + player.velocityY;
    
    // Check wall collisions before updating position
    const collision = this.checkWallCollisions(player, newX, newY);
    
    // Update position based on collision
    if (!collision.x) {
      player.x = newX;
    }
    if (!collision.y) {
      player.y = newY;
    }
    
    // Stop velocity in direction of collision
    if (collision.x) player.velocityX = 0;
    if (collision.y) player.velocityY = 0;
    
    // Enforce world boundaries
    this.enforceWorldBoundaries(player);
  },

  checkWallCollisions(player, newX, newY) {
    const playerRadius = GAME_CONSTANTS.PLAYER_RADIUS;
    let collision = { x: false, y: false };
    
    // Check each wall for collision
    gameState.walls.forEach(wall => {
      // Calculate wall bounds
      const wallLeft = wall.x;
      const wallRight = wall.x + wall.width;
      const wallTop = wall.y;
      const wallBottom = wall.y + wall.height;
      
      // Check X-axis collision (horizontal movement)
      if (newY + playerRadius > wallTop && 
          newY - playerRadius < wallBottom) {
        if (newX + playerRadius > wallLeft && 
            newX - playerRadius < wallRight) {
          // Determine which side of the wall we're hitting
          if (player.x < wallLeft) {
            // Hitting from left
            collision.x = true;
            player.x = wallLeft - playerRadius;
          } else if (player.x > wallRight) {
            // Hitting from right
            collision.x = true;
            player.x = wallRight + playerRadius;
          }
        }
      }
      
      // Check Y-axis collision (vertical movement)
      if (newX + playerRadius > wallLeft && 
          newX - playerRadius < wallRight) {
        if (newY + playerRadius > wallTop && 
            newY - playerRadius < wallBottom) {
          // Determine which side of the wall we're hitting
          if (player.y < wallTop) {
            // Hitting from top
            collision.y = true;
            player.y = wallTop - playerRadius;
          } else if (player.y > wallBottom) {
            // Hitting from bottom
            collision.y = true;
            player.y = wallBottom + playerRadius;
          }
        }
      }
    });
    
    return collision;
  },

  checkBulletCollisions(bullet) {
    const bulletRadius = GAME_CONSTANTS.BULLET_RADIUS;
    
    // Check wall collisions first
    for (const wall of gameState.walls) {
      const wallLeft = wall.x;
      const wallRight = wall.x + wall.width;
      const wallTop = wall.y;
      const wallBottom = wall.y + wall.height;
      
      // Check if bullet is within wall bounds
      if (bullet.x + bulletRadius > wallLeft && 
          bullet.x - bulletRadius < wallRight &&
          bullet.y + bulletRadius > wallTop && 
          bullet.y - bulletRadius < wallBottom) {
        return true; // Bullet hit a wall
      }
    }
    
    // Check player collisions
    for (const [playerId, player] of gameState.players) {
      // Skip collision check for dead players
      if (player.isDead) {
        continue;
      }
      
      // Calculate distance between bullet and player
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if bullet hits player
      if (distance < GAME_CONSTANTS.PLAYER_RADIUS + bulletRadius) {
        // If this is the source player, ignore the collision but don't destroy the bullet
        if (playerId === bullet.sourceId) {
          continue;
        }
        
        // Hit a different player - apply damage
        player.health -= GAME_CONSTANTS.BULLET_DAMAGE;
        if (player.health <= 0) {
          player.isDead = true;
          player.deathPosition = { x: player.x, y: player.y };
        }
        
        // Always destroy the bullet when it hits a player, whether it kills them or not
        return true;
      }
    }
    
    return false;
  },

  enforceWorldBoundaries(player) {
    const WORLD_BOUNDS = {
      left: -1000,
      right: 1000,
      top: -1000,
      bottom: 1000
    };

    if (player.x < WORLD_BOUNDS.left) {
      player.x = WORLD_BOUNDS.left;
      player.velocityX = 0;
    }
    if (player.x > WORLD_BOUNDS.right) {
      player.x = WORLD_BOUNDS.right;
      player.velocityX = 0;
    }
    if (player.y < WORLD_BOUNDS.top) {
      player.y = WORLD_BOUNDS.top;
      player.velocityY = 0;
    }
    if (player.y > WORLD_BOUNDS.bottom) {
      player.y = WORLD_BOUNDS.bottom;
      player.velocityY = 0;
    }
  },

  findSafeSpawnPosition() {
    const maxAttempts = 100;
    const PLAYER_RADIUS = GAME_CONSTANTS.PLAYER_RADIUS;
    
    // Calculate bounds from outer walls (first 4 walls are outer walls)
    const outerWalls = gameState.walls.slice(0, 4);
    const bounds = {
      left: outerWalls[2].x + PLAYER_RADIUS,
      right: outerWalls[3].x - PLAYER_RADIUS,
      top: outerWalls[0].y + PLAYER_RADIUS,
      bottom: outerWalls[1].y - PLAYER_RADIUS
    };
    
    for (let i = 0; i < maxAttempts; i++) {
      // Generate random position within bounds
      const x = bounds.left + Math.random() * (bounds.right - bounds.left);
      const y = bounds.top + Math.random() * (bounds.bottom - bounds.top);
      
      // Check if position collides with any walls
      let collides = false;
      for (const wall of gameState.walls) {
        if (x + PLAYER_RADIUS > wall.x && 
            x - PLAYER_RADIUS < wall.x + wall.width &&
            y + PLAYER_RADIUS > wall.y && 
            y - PLAYER_RADIUS < wall.y + wall.height) {
          collides = true;
          break;
        }
      }
      
      if (!collides) {
        return { x, y };
      }
    }
    
    // If no safe position found, return center position
    return { x: 0, y: 0 };
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Get next color from the color array
  const colors = Object.values(GAME_CONSTANTS.COLORS);
  const playerColor = colors[gameState.colorIndex % colors.length];
  gameState.colorIndex++;
  
  // Find a safe spawn position
  const spawnPos = physics.findSafeSpawnPosition();
  
  // Initialize player with safe spawn position
  const player = {
    id: socket.id,
    x: spawnPos.x,
    y: spawnPos.y,
    rotation: 0,
    health: GAME_CONSTANTS.PLAYER_MAX_HEALTH,
    velocityX: 0,
    velocityY: 0,
    acceleration: 1.0,
    friction: 0.95,
    maxSpeed: GAME_CONSTANTS.PLAYER_SPEED * 2,
    isDead: false,
    color: playerColor
  };
  
  gameState.players.set(socket.id, player);
  
  // Send initial game state to new player
  socket.emit('gameState', {
    players: Array.from(gameState.players.values()),
    bullets: gameState.bullets,
    walls: gameState.walls,
    spawnPosition: { x: spawnPos.x, y: spawnPos.y }
  });
  
  // Handle player input
  socket.on('playerInput', (input) => {
    const player = gameState.players.get(socket.id);
    if (player && !player.isDead) {  // Only process input if player is alive
      // Map the input keys to movement
      const mappedInput = {
        left: input.left || input.ArrowLeft || input.a,
        right: input.right || input.ArrowRight || input.d,
        up: input.up || input.ArrowUp || input.w,
        down: input.down || input.ArrowDown || input.s
      };
      
      // Update player movement
      physics.updatePlayer(player, mappedInput);
      
      // Update player rotation if provided
      if (input.rotation !== undefined) {
        player.rotation = input.rotation;
      }
    }
  });
  
  // Handle player respawn
  socket.on('respawn', () => {
    const player = gameState.players.get(socket.id);
    if (player && player.isDead) {
      // Find a safe spawn position
      const spawnPos = physics.findSafeSpawnPosition();
      
      // Reset player state
      player.isDead = false;
      player.health = GAME_CONSTANTS.PLAYER_MAX_HEALTH;
      player.x = spawnPos.x;
      player.y = spawnPos.y;
      player.velocityX = 0;
      player.velocityY = 0;
      player.rotation = 0;

      // Send immediate update to the respawning player with spawn position
      socket.emit('gameState', {
        players: Array.from(gameState.players.values()),
        bullets: gameState.bullets,
        spawnPosition: spawnPos,
        timestamp: Date.now()
      });
    }
  });
  
  // Handle shooting
  socket.on('shoot', (data) => {
    const player = gameState.players.get(socket.id);
    if (player && !player.isDead) {
      const turretLength = 30; // Length of turret
      
      // Calculate bullet spawn position using client position and velocity
      const bulletX = data.x + Math.cos(data.rotation) * turretLength;
      const bulletY = data.y + Math.sin(data.rotation) * turretLength;
      
      const bullet = {
        id: Date.now(),
        x: bulletX,
        y: bulletY,
        rotation: data.rotation,
        velocityX: Math.cos(data.rotation) * GAME_CONSTANTS.BULLET_SPEED,
        velocityY: Math.sin(data.rotation) * GAME_CONSTANTS.BULLET_SPEED,
        sourceId: socket.id,
        radius: GAME_CONSTANTS.BULLET_RADIUS,
        timestamp: Date.now()
      };
      gameState.bullets.push(bullet);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    gameState.players.delete(socket.id);
    io.emit('playerDisconnected', socket.id);
  });
});

// Game loop
const TICK_INTERVAL = 1000 / GAME_CONSTANTS.TICK_RATE;
setInterval(() => {
  // Update bullet positions and check collisions
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    
    // Update bullet position
    bullet.x += bullet.velocityX;
    bullet.y += bullet.velocityY;
    
    // Check for collisions
    if (physics.checkBulletCollisions(bullet)) {
      // Remove bullet if it hit something
      gameState.bullets.splice(i, 1);
    }
    
    // Remove bullets that are out of bounds
    if (bullet.x < -2000 || bullet.x > 2000 || 
        bullet.y < -2000 || bullet.y > 2000) {
      gameState.bullets.splice(i, 1);
    }
  }
  
  // Broadcast game state to all clients
  io.emit('gameState', {
    players: Array.from(gameState.players.values()),
    bullets: gameState.bullets,
    timestamp: Date.now()
  });
  
  gameState.lastUpdateTime = Date.now();
}, TICK_INTERVAL);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 