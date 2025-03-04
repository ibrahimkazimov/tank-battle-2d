import { PLAYER_RADIUS, PLAYER_COLOR, PLAYER_SPEED, WIDTH, HEIGHT, PLAYER_MAX_HEALTH, RESPAWN_TIME, PLAYER2_COLOR } from '../constants.js';
import { Turret } from './turret.js';
import { checkCollision } from '../utils/collision.js';
import { HealthBar } from './healthBar.js';

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
    this.explosionParticles = [];
    
    // Store reference to game instance
    this.game = app.game;
    
    // Create turret first so it's behind the player
    this.turret = new Turret(app, isAI, worldContainer);
    if (isAI) {
      this.turret.graphics.x = spawnX;
      this.turret.graphics.y = spawnY;
    }
    
    this.graphics = this.createGraphics();
    
    // Create health bar for main player only
    if (!isAI) {
      this.healthBar = new HealthBar(app);
      this.healthBar.update(this.health);
      this.healthBar.setName('Player 1'); // Set default name
    }
    
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
      // Only set turret x if it's not in recoil animation
      if (!this.turret.recoilAnimation) {
        this.turret.x = WIDTH / 2;
      }
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
      // Only set turret y if it's not in recoil animation
      if (!this.turret.recoilAnimation) {
        this.turret.y = HEIGHT / 2;
      }
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
      this.health = 0;
      this.die();
    }
    
    // Update health bar
    if (!this.isAI && this.healthBar) {
      this.healthBar.update(this.health);
    }
  }

  applyForce(forceX, forceY) {
    if (this.isDead) return;
    
    // Add force to current velocity
    if (this.isAI) {
      // For AI, apply force in world coordinates
      this.velocityX += forceX;
      this.velocityY += forceY;
    } else {
      // For player, apply force in screen coordinates
      this.velocityX += forceX;
      this.velocityY += forceY;
    }
    
    // Limit speed after force application
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }
  }

  createExplosion() {
    const numParticles = 16;
    const particleSpeed = 3;
    const particleSize = 4;
    const particleColor = this.isAI ? PLAYER2_COLOR : PLAYER_COLOR;
    
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const particle = new PIXI.Graphics();
      
      // Draw particle
      particle.context.fillStyle = particleColor;
      particle.context.circle(0, 0, particleSize);
      particle.context.fill();
      
      // Position particle at player center
      if (this.isAI) {
        particle.x = this.x;
        particle.y = this.y;
      } else {
        // For main player, use screen center coordinates
        particle.x = WIDTH / 2;
        particle.y = HEIGHT / 2;
      }
      
      // Add to appropriate container
      if (this.isAI && this.worldContainer) {
        this.worldContainer.addChild(particle);
      } else {
        this.app.stage.addChild(particle);
      }
      
      // Set particle velocity
      particle.vx = Math.cos(angle) * particleSpeed;
      particle.vy = Math.sin(angle) * particleSpeed;
      
      // Add fade out animation
      const fadeOut = () => {
        particle.alpha -= 0.03;
        if (particle.alpha <= 0) {
          if (this.isAI && this.worldContainer) {
            this.worldContainer.removeChild(particle);
          } else {
            this.app.stage.removeChild(particle);
          }
          const index = this.explosionParticles.indexOf(particle);
          if (index > -1) {
            this.explosionParticles.splice(index, 1);
          }
        }
      };
      
      // Add movement animation
      const move = () => {
        particle.x += particle.vx;
        particle.y += particle.vy;
      };
      
      this.app.ticker.add(move);
      this.app.ticker.add(fadeOut);
      this.explosionParticles.push(particle);
    }
  }

  die() {
    this.isDead = true;
    this.health = 0;
    
    // Create explosion effect
    this.createExplosion();
    
    // Hide player and turret
    this.graphics.visible = false;
    this.turret.graphics.visible = false;

    // Start respawn timer
    this.respawnTimer = setTimeout(() => {
      this.respawn();
    }, RESPAWN_TIME);
  }


  clearExplosionParticles() {
    for (const particle of this.explosionParticles) {
      if (this.isAI && this.worldContainer) {
        this.worldContainer.removeChild(particle);
      } else {
        this.app.stage.removeChild(particle);
      }
    }
  }

  respawn() {
    this.isDead = false;
    this.health = PLAYER_MAX_HEALTH;
    this.velocityX = 0;
    this.velocityY = 0;
    
    // Update health bar
    if (!this.isAI && this.healthBar) {
      this.healthBar.update(this.health);
    }
    
    // Clean up any remaining explosion particles
    this.clearExplosionParticles();
    this.explosionParticles = [];

    // For the main player, animate camera to spawn position
    if (!this.isAI) {
      // Keep player invisible during camera transition
      this.graphics.visible = false;
      this.turret.graphics.visible = false;

      // Animate camera to spawn position
      this.app.game.animateCameraToPosition(this.spawnX, this.spawnY);

      // Show player after camera animation completes
      setTimeout(() => {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.graphics.visible = true;
        this.turret.graphics.visible = true;
      }, this.app.game.cameraAnimationDuration);
    } else {
      // For AI, just respawn immediately
      this.x = this.spawnX;
      this.y = this.spawnY;
      this.graphics.visible = true;
      this.turret.graphics.visible = true;
    }
  }

  destroy() {
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
    }
    
    // Clean up explosion particles
    this.clearExplosionParticles();
    
    // Clean up health bar
    if (!this.isAI && this.healthBar) {
      this.healthBar.destroy();
    }
    
    this.app.stage.removeChild(this.graphics);
    this.turret.graphics.destroy();
  }
}