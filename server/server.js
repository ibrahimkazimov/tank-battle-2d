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
  PLAYER_SPEED: 2.5,
  PLAYER_MAX_HEALTH: 100,
  RESPAWN_TIME: 3000,
  BULLET_RADIUS: 5,
  BULLET_SPEED: 15,
  BULLET_DAMAGE: 20,
  BULLET_POWER: 0.5,
  BULLET_HEALTH: 40,
  BULLET_VS_BULLET_DAMAGE: 40,
  BULLET_DESTRUCTION_TIME: 50,
  BULLET_FADE_SPEED: 0.8,
  FIRE_RATE: 250, // Time in milliseconds between shots (4 shots per second)
  TICK_RATE: 60,
  INTERPOLATION_DELAY: 100,
  COLORS: {
    PLAYER1: '#1BB4D6',
    PLAYER2: '#BE7FF4',
    PLAYER3: '#F04E52',
    PLAYER4: '#04E16D'
  }
};

// Physics calculations
const physics = {
  updatePlayer(player, input) {
    const deltaTime = input.deltaTime || 1; // Default to 1 if not provided

    // Calculate acceleration based on input
    let ax = 0;
    let ay = 0;
    
    if (input.left) ax -= player.acceleration * deltaTime;
    if (input.right) ax += player.acceleration * deltaTime;
    if (input.up) ay -= player.acceleration * deltaTime;
    if (input.down) ay += player.acceleration * deltaTime;
    
    // Apply acceleration to velocity
    player.velocityX += ax;
    player.velocityY += ay;
    
    // Apply friction (ensure friction is correctly scaled by deltaTime)
    const frictionFactor = Math.pow(player.friction, deltaTime);
    player.velocityX *= frictionFactor;
    player.velocityY *= frictionFactor;

    // Limit speed
    const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);
    if (speed > player.maxSpeed) {
        const scale = player.maxSpeed / speed;
        player.velocityX *= scale;
        player.velocityY *= scale;
    }

    // Calculate new position
    const newX = player.x + player.velocityX * deltaTime;
    const newY = player.y + player.velocityY * deltaTime;

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
    
    // Skip collision checks for destroying bullets
    if (bullet.destroying) {
      return false;
    }
    
    // Check bullet-to-bullet collisions first
    for (const otherBullet of gameState.bullets) {
      // Skip self-collision, destroying bullets, and bullets from same team
      if (otherBullet === bullet || otherBullet.sourceId === bullet.sourceId || otherBullet.destroying) {
        continue;
      }
      
      // Calculate distance between bullets
      const dx = bullet.x - otherBullet.x;
      const dy = bullet.y - otherBullet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if bullets collide
      if (distance < bulletRadius * 2) {
        // Damage both bullets
        bullet.health -= GAME_CONSTANTS.BULLET_VS_BULLET_DAMAGE;
        otherBullet.health -= GAME_CONSTANTS.BULLET_VS_BULLET_DAMAGE;
        
        // Start destruction animation if health depleted
        if (otherBullet.health <= 0) {
          startBulletDestruction(otherBullet);
        }
        if (bullet.health <= 0) {
          startBulletDestruction(bullet);
          return false; // Don't immediately destroy, let it fade out
        }
      }
    }
    
    // Check wall collisions
    for (const wall of gameState.walls) {
      const wallLeft = wall.x;
      const wallRight = wall.x + wall.width;
      const wallTop = wall.y;
      const wallBottom = wall.y + wall.height;
      
      if (bullet.x + bulletRadius > wallLeft && 
          bullet.x - bulletRadius < wallRight &&
          bullet.y + bulletRadius > wallTop && 
          bullet.y - bulletRadius < wallBottom) {
        return true;
      }
    }
    
    // Check player collisions
    for (const [playerId, player] of gameState.players) {
      if (player.isDead) {
        continue;
      }
      
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < GAME_CONSTANTS.PLAYER_RADIUS + bulletRadius) {
        if (playerId === bullet.sourceId) {
          continue;
        }
        
        const knockbackDirX = -dx / distance;
        const knockbackDirY = -dy / distance;
        
        player.velocityX += knockbackDirX * GAME_CONSTANTS.BULLET_POWER * GAME_CONSTANTS.BULLET_SPEED;
        player.velocityY += knockbackDirY * GAME_CONSTANTS.BULLET_POWER * GAME_CONSTANTS.BULLET_SPEED;
        
        player.health -= GAME_CONSTANTS.BULLET_DAMAGE;
        if (player.health <= 0) {
          player.isDead = true;
          player.isVisible = false;
          player.deathPosition = { x: player.x, y: player.y };
          player.deaths += 1;
          
          // Update killer's score
          const killer = gameState.players.get(bullet.sourceId);
          if (killer) {
            killer.kills += 1;
          }

          // Immediately broadcast death state to all clients
          io.emit('playerDied', {
            playerId: playerId,
            x: player.x,
            y: player.y,
            deathPosition: player.deathPosition,
            killerName: killer ? killer.name : 'Unknown',
            killerKills: killer ? killer.kills : 0
          });
        }
        
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
  // Get player name from connection query
  const playerName = socket.handshake.query.playerName || 'Anonymous';
  console.log('Player connected:', socket.id, 'Name:', playerName);
  
  // Get next color from the color array
  const colors = Object.values(GAME_CONSTANTS.COLORS);
  const playerColor = colors[gameState.colorIndex % colors.length];
  gameState.colorIndex++;
  
  // Find a safe spawn position
  const spawnPos = physics.findSafeSpawnPosition();
  
  // Initialize player with safe spawn position
  const player = {
    id: socket.id,
    name: playerName,
    x: spawnPos.x,
    y: spawnPos.y,
    rotation: 0,
    health: GAME_CONSTANTS.PLAYER_MAX_HEALTH,
    velocityX: 0,
    velocityY: 0,
    acceleration: 1.0,
    friction: 0.95,
    maxSpeed: GAME_CONSTANTS.PLAYER_SPEED * 2,
    fireRate: GAME_CONSTANTS.FIRE_RATE,
    radius: GAME_CONSTANTS.PLAYER_RADIUS,
    bulletRadius: GAME_CONSTANTS.BULLET_RADIUS,
    bulletSpeed: GAME_CONSTANTS.BULLET_SPEED,
    bulletDamage: GAME_CONSTANTS.BULLET_DAMAGE,
    bulletPower: GAME_CONSTANTS.BULLET_POWER,
    isDead: false,
    color: playerColor,
    isShooting: false,
    lastShotTime: 0,
    lastProcessedInput: null,
    isVisible: true,
    kills: 0,
    deaths: 0
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
    if (player && !player.isDead) {
      // Map the input keys to movement
      const mappedInput = {
        left: input.left || input.ArrowLeft || input.a,
        right: input.right || input.ArrowRight || input.d,
        up: input.up || input.ArrowUp || input.w,
        down: input.down || input.ArrowDown || input.s,
        deltaTime: input.deltaTime
      };
      
      // Update player movement
      physics.updatePlayer(player, mappedInput);
      
      // Store last processed input
      player.lastProcessedInput = input.sequenceNumber;
      
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
      player.isVisible = true;

      // Broadcast immediate respawn state to ALL clients
      io.emit('playerRespawned', {
        playerId: socket.id,
        x: spawnPos.x,
        y: spawnPos.y,
        health: GAME_CONSTANTS.PLAYER_MAX_HEALTH,
        isVisible: true
      });

      // Also send in next game state update
      io.emit('gameState', {
        players: Array.from(gameState.players.values()).map(p => ({
          ...p,
          lastProcessedInput: p.lastProcessedInput,
          isVisible: p.isVisible
        })),
        bullets: gameState.bullets,
        timestamp: Date.now()
      });
    }
  });
  
  // Handle shooting
  socket.on('shoot', (data) => {
    const player = gameState.players.get(socket.id);
    if (player && !player.isDead) {
      // Check fire rate
      const now = Date.now();
      if (now - player.lastShotTime < GAME_CONSTANTS.FIRE_RATE) {
        return; // Too soon to shoot again
      }

      // Set shooting state
      player.isShooting = true;
      player.lastShotTime = now;
      
      const turretLength = 30;
      
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
        power: GAME_CONSTANTS.BULLET_POWER,
        health: GAME_CONSTANTS.BULLET_HEALTH,
        destroying: false,
        timestamp: Date.now()
      };
      gameState.bullets.push(bullet);

      // Reset shooting state after a short delay
      setTimeout(() => {
        if (player) {
          player.isShooting = false;
        }
      }, 100); // Reset after 100ms
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
  // Reset shooting states after a short delay
  const currentTime = Date.now();
  for (const [_, player] of gameState.players) {
    if (player.isShooting && currentTime - player.lastShotTime > 100) {
      player.isShooting = false;
    }
  }
  
  // Update bullet positions and check collisions
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    
    if (bullet.destroying) {
      // Check if destruction animation is complete
      if (Date.now() - bullet.destructionStartTime > GAME_CONSTANTS.BULLET_DESTRUCTION_TIME) {
        gameState.bullets.splice(i, 1);
        continue;
      }
      // Skip position update for destroying bullets
      continue;
    }
    
    // Update bullet position only if not destroying
    bullet.x += bullet.velocityX;
    bullet.y += bullet.velocityY;
    
    // Check for collisions
    if (physics.checkBulletCollisions(bullet)) {
      startBulletDestruction(bullet);
      continue;
    }
    
    // Remove bullets that are out of bounds
    if (bullet.x < -2000 || bullet.x > 2000 || 
        bullet.y < -2000 || bullet.y > 2000) {
      gameState.bullets.splice(i, 1);
    }
  }
  
  // Broadcast game state to all clients
  io.emit('gameState', {
    players: Array.from(gameState.players.values()).map(player => ({
      ...player,
      lastProcessedInput: player.lastProcessedInput // Include the last processed input
    })),
    bullets: gameState.bullets,
    timestamp: Date.now()
  });
  
  gameState.lastUpdateTime = Date.now();
}, TICK_INTERVAL);

// Update the startBulletDestruction function
function startBulletDestruction(bullet) {
  bullet.destroying = true;
  bullet.destructionStartTime = Date.now();
  // Stop the bullet completely
  bullet.velocityX = 0;
  bullet.velocityY = 0;
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 