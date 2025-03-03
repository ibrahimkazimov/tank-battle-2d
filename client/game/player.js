import { PLAYER_RADIUS, PLAYER_COLOR, PLAYER_SPEED, WIDTH, HEIGHT, PLAYER_MAX_HEALTH, RESPAWN_TIME, PLAYER2_COLOR } from '../constants.js';
import { Turret } from './turret.js';
import { checkCollision } from '../utils/collision.js';

export class Player {
  constructor(app, wallManager, isAI = false, spawnX = 0, spawnY = 0, worldContainer = null) {
    this.app = app;
    this.wallManager = wallManager;
    this.radius = PLAYER_RADIUS;
    this.isAI = isAI;
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.worldContainer = worldContainer;
    this.health = PLAYER_MAX_HEALTH;
    this.isDead = false;
    this.respawnTimer = null;
    
    // Create turret first so it's behind the player
    this.turret = new Turret(app, isAI, worldContainer);
    if (isAI) {
      this.turret.graphics.x = spawnX;
      this.turret.graphics.y = spawnY;
    }
    
    this.graphics = this.createGraphics();
    
    // Set initial position
    this._x = spawnX;
    this._y = spawnY;
    
    // Add velocity properties
    this.velocityX = 0;
    this.velocityY = 0;
    this.acceleration = 0.5;  // Acceleration when moving
    this.friction = 0.95;     // Friction to slow down when not moving (value between 0 and 1)
    this.maxSpeed = PLAYER_SPEED * 2;  // Maximum speed the tank can reach
  }
  
  createGraphics() {
    const player = new PIXI.Graphics();
    player.context.fillStyle = this.isAI ? PLAYER2_COLOR : PLAYER_COLOR;
    player.context.circle(0, 0, PLAYER_RADIUS);
    player.context.fill();
    
    // For AI, position in world coordinates. For player, keep centered
    if (this.isAI) {
      player.x = this.spawnX;
      player.y = this.spawnY;
      this.worldContainer.addChild(player);
    } else {
      // Center player in logical coordinates
      player.x = WIDTH / 2;
      player.y = HEIGHT / 2;
      this.app.stage.addChild(player);
    }
    return player;
  }
  
  get x() {
    return this._x;
  }
  
  set x(value) {
    this._x = value;
    if (!this.isAI) {
      // Keep player centered in logical coordinates
      this.graphics.x = WIDTH / 2;
      this.turret.x = WIDTH / 2;
    } else {
      this.graphics.x = value;
      this.turret.graphics.x = value;
    }
  }
  
  get y() {
    return this._y;
  }
  
  set y(value) {
    this._y = value;
    if (!this.isAI) {
      // Keep player centered in logical coordinates
      this.graphics.y = HEIGHT / 2;
      this.turret.y = HEIGHT / 2;
    } else {
      this.graphics.y = value;
      this.turret.graphics.y = value;
    }
  }
  
  update(keys) {
    if (this.isDead) return;
    
    // Calculate acceleration based on input
    let ax = 0;
    let ay = 0;
    
    if (keys.ArrowLeft) ax -= this.acceleration;
    if (keys.ArrowRight) ax += this.acceleration;
    if (keys.ArrowUp) ay -= this.acceleration;
    if (keys.ArrowDown) ay += this.acceleration;
    
    // Apply acceleration to velocity
    this.velocityX += ax;
    this.velocityY += ay;
    
    // Apply friction
    this.velocityX *= this.friction;
    this.velocityY *= this.friction;
    
    // Limit speed
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }
    
    // Calculate new position
    const newX = this.x + this.velocityX;
    const newY = this.y + this.velocityY;
    
    // Check for collisions before updating position
    if (!this.checkWallCollision(newX, newY)) {
      this.x = newX;
      this.y = newY;
    } else {
      // On collision, stop movement in that direction
      this.velocityX = 0;
      this.velocityY = 0;
    }
    
    // Enforce world boundaries
    this.enforceWorldBoundaries();
  }
  
  updateTurretRotation(mouseX, mouseY) {
    if (!this.isAI) {
      // Calculate angle between player center and mouse position in logical coordinates
      const dx = mouseX - WIDTH / 2;
      const dy = mouseY - HEIGHT / 2;
      this.turret.rotation = Math.atan2(dy, dx);
    }
  }
  
  getTurretPosition() {
    return {
      x: this.x,
      y: this.y,
      rotation: this.turret.rotation
    };
  }
  
  enforceWorldBoundaries() {
    const WORLD_BOUNDS = {
      left: -WIDTH,
      right: WIDTH,
      top: -HEIGHT,
      bottom: HEIGHT
    };

    if (this.x < WORLD_BOUNDS.left) {
      this.x = WORLD_BOUNDS.left;
      this.velocityX = 0;  // Stop horizontal movement at boundary
    }
    if (this.x > WORLD_BOUNDS.right) {
      this.x = WORLD_BOUNDS.right;
      this.velocityX = 0;  // Stop horizontal movement at boundary
    }
    if (this.y < WORLD_BOUNDS.top) {
      this.y = WORLD_BOUNDS.top;
      this.velocityY = 0;  // Stop vertical movement at boundary
    }
    if (this.y > WORLD_BOUNDS.bottom) {
      this.y = WORLD_BOUNDS.bottom;
      this.velocityY = 0;  // Stop vertical movement at boundary
    }
  }
  
  checkWallCollision(newX, newY) {
    const playerBounds = {
      x: WIDTH / 2 - PLAYER_RADIUS,
      y: HEIGHT / 2 - PLAYER_RADIUS,
      width: PLAYER_RADIUS * 2,
      height: PLAYER_RADIUS * 2,
    };

    // Adjust for world position
    const worldX = -newX;
    const worldY = -newY;

    for (const wall of this.wallManager.getWalls()) {
      const adjustedWall = {
        x: wall.graphics.x + worldX,
        y: wall.graphics.y + worldY,
        width: wall.graphics.width,
        height: wall.graphics.height
      };

      if (checkCollision(playerBounds, adjustedWall)) {
        return true;
      }
    }
    return false;
  }

  takeDamage(damage) {
    if (this.isDead) return;
    
    this.health -= damage;
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.health = 0;
    this.graphics.visible = false;
    this.turret.graphics.visible = false;

    // Start respawn timer
    this.respawnTimer = setTimeout(() => {
      this.respawn();
    }, RESPAWN_TIME);
  }

  respawn() {
    this.isDead = false;
    this.health = PLAYER_MAX_HEALTH;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.graphics.visible = true;
    this.turret.graphics.visible = true;
  }

  destroy() {
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
    }
    this.app.stage.removeChild(this.graphics);
    this.turret.graphics.destroy();
  }
}