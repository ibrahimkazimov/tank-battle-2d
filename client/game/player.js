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
      // Only update graphics for human player
      this.graphics.x = WIDTH / 2;
      this.turret.x = WIDTH / 2;
    }
  }
  
  get y() {
    return this._y;
  }
  
  set y(value) {
    this._y = value;
    if (!this.isAI) {
      // Only update graphics for human player
      this.graphics.y = HEIGHT / 2;
      this.turret.y = HEIGHT / 2;
    }
  }
  
  update(keys) {
    if (this.isDead) return;

    if (this.isAI) return; // AI doesn't move at all

    // Apply acceleration based on input
    if (keys.ArrowLeft) {
      this.velocityX -= this.acceleration;
    }
    if (keys.ArrowRight) {
      this.velocityX += this.acceleration;
    }
    if (keys.ArrowUp) {
      this.velocityY -= this.acceleration;
    }
    if (keys.ArrowDown) {
      this.velocityY += this.acceleration;
    }
    
    // Apply friction when no input is given
    if (!keys.ArrowLeft && !keys.ArrowRight) {
      this.velocityX *= this.friction;
    }
    if (!keys.ArrowUp && !keys.ArrowDown) {
      this.velocityY *= this.friction;
    }
    
    // Limit maximum speed
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }
    
    // Stop very small movements to prevent endless sliding
    if (Math.abs(this.velocityX) < 0.01) this.velocityX = 0;
    if (Math.abs(this.velocityY) < 0.01) this.velocityY = 0;
    
    // Calculate new position
    let newX = this.x + this.velocityX;
    let newY = this.y + this.velocityY;
    
    // Check for wall collisions before updating position
    if (!this.checkWallCollision(newX, this.y)) {
      this.x = newX;
    } else {
      // Stop horizontal movement on collision
      this.velocityX = 0;
    }
    
    if (!this.checkWallCollision(this.x, newY)) {
      this.y = newY;
    } else {
      // Stop vertical movement on collision
      this.velocityY = 0;
    }
    
    // Keep player within world boundaries
    this.enforceWorldBoundaries();
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
  
  updateTurretRotation(mouseX, mouseY) {
    // Calculate angle between center of screen and mouse position
    const dx = mouseX - WIDTH / 2;
    const dy = mouseY - HEIGHT / 2;
    this.turret.rotation = Math.atan2(dy, dx);
  }
  
  getTurretPosition() {
    return {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      rotation: this.turret.rotation
    };
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