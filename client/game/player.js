import { PLAYER_RADIUS, PLAYER_COLOR, PLAYER_SPEED, WIDTH, HEIGHT, PLAYER_MAX_HEALTH, RESPAWN_TIME, PLAYER2_COLOR } from '../constants.js';
import { Turret } from './turret.js';
import { checkCollision, getDistance, checkCircleRectCollision } from '../utils/collision.js';
import { HealthBar } from './healthBar.js';

export class Player {
  constructor(app, wallManager, isAI = false, spawnX = 0, spawnY = 0, worldContainer = null, color = '#4287f5') {
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
    this.color = color;
    this.name = '';
    
    // Store reference to game instance
    this.game = app.game;
    
    // Create turret first so it's behind the player
    this.turret = new Turret(app, isAI, worldContainer, color);
    this.turret.setPlayer(this); // Set player reference in turret
    
    this.graphics = this.createGraphics();
    
    // Create health bar for main player only
    if (!this.isAI) {
      this.healthBar = new HealthBar(app);
      // Ensure health bar shows full health initially
      this.healthBar.update(PLAYER_MAX_HEALTH);
      this.healthBar.setName(this.name);
    }
    
    // Set initial position
    this._x = spawnX;
    this._y = spawnY;
    
    // Add velocity properties
    this.velocityX = 0;
    this.velocityY = 0;
    this.acceleration = 0.5;
    this.friction = 0.95;
    this.maxSpeed = PLAYER_SPEED * 2;
    
    // Network interpolation properties
    this.targetX = spawnX;
    this.targetY = spawnY;
    this.targetRotation = 0;
    
    // Set initial rotation
    this.rotation = 0;
    this.turret.rotation = 0;
  }
  
  createGraphics() {
    const player = new PIXI.Container();
    
    // Create tank body container that will rotate
    this.bodyContainer = new PIXI.Container();
    player.addChild(this.bodyContainer);
    
    // Create tank body
    const body = new PIXI.Graphics();
    body.context.fillStyle = this.color;
    body.context.circle(0, 0, PLAYER_RADIUS);
    body.context.fill();
    this.bodyContainer.addChild(body);
    
    // Create name text only for other players
    if (this.isAI) {
      this.nameText = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#ffffff',
        align: 'center',
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowDistance: 2
      });
      this.nameText.anchor.set(0.5);
      this.nameText.y = -40; // Position above tank
      player.addChild(this.nameText); // Add to main container, not body container
    }
    
    // Add to world container if it exists, otherwise add to app stage
    if (this.worldContainer) {
      this.worldContainer.addChild(player);
    } else {
      this.app.stage.addChild(player);
    }
    
    // Set initial position
    player.x = this.spawnX;
    player.y = this.spawnY;
    
    return player;
  }
  
  get rotation() {
    return this._rotation || 0;
  }
  
  set rotation(value) {
    this._rotation = value;
    if (this.turret) {
      this.turret.graphics.rotation = value;
      // Only rotate the body container, not the entire graphics container
      if (this.bodyContainer) {
        this.bodyContainer.rotation = value;
      }
    }
  }
  
  get x() {
    return this._x;
  }
  
  set x(value) {
    this._x = value;
    if (this.graphics && this.graphics.parent) {
      this.graphics.x = value;
      if (this.turret && this.turret.graphics && this.turret.graphics.parent) {
        this.turret.graphics.x = value;
      }
    }
  }
  
  get y() {
    return this._y;
  }
  
  set y(value) {
    this._y = value;
    if (this.graphics && this.graphics.parent) {
      this.graphics.y = value;
      if (this.turret && this.turret.graphics && this.turret.graphics.parent) {
        this.turret.graphics.y = value;
      }
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
    
    // Calculate new position in world coordinates
    const newX = this.x + this.velocityX;
    const newY = this.y + this.velocityY;
    
    // Check for collisions before updating position
    if (!this.checkWallCollision(newX, newY)) {
      this.x = newX;
      this.y = newY;
    } else {
      // Try moving only horizontally
      const horizontalX = this.x + this.velocityX;
      const horizontalY = this.y;
      if (!this.checkWallCollision(horizontalX, horizontalY)) {
        this.x = horizontalX;
      } else {
        // Stop horizontal velocity on collision
        this.velocityX *= -0.5; // Add some bounce effect
      }
      
      // Try moving only vertically
      const verticalX = this.x;
      const verticalY = this.y + this.velocityY;
      if (!this.checkWallCollision(verticalX, verticalY)) {
        this.y = verticalY;
      } else {
        // Stop vertical velocity on collision
        this.velocityY *= -0.5; // Add some bounce effect
      }
    }
    
    // Enforce world boundaries
    this.enforceWorldBoundaries();
  }
  
  updateTurretRotation(mouseX, mouseY) {
    if (this.isDead) return;
    
    // Calculate angle between player and mouse in world coordinates
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    
    // Calculate the angle
    let angle = Math.atan2(dy, dx);
    
    // Normalize the angle to be between 0 and 2π
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    
    // For local player, update rotation instantly
    if (!this.isAI) {
      this._rotation = angle;
      this.graphics.rotation = angle;
      this.turret.graphics.rotation = angle;
    }
    
    // Still set target rotation for network sync
    this.targetRotation = angle;
  }
  
  getTurretPosition() {
    const turretLength = 30;
    // Use the actual player position for bullet spawn
    return {
      x: this.graphics.x + Math.cos(this.rotation) * turretLength,
      y: this.graphics.y + Math.sin(this.rotation) * turretLength,
      rotation: this.rotation
    };
  }
  
  takeDamage(amount) {
    if (this.isDead) return;
    
    // Only update health bar if we're the main player
    if (!this.isAI && this.healthBar) {
      this.healthBar.update(this.health);
    }
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  die() {
    this.isDead = true;
    this.health = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    
    // Hide player and turret graphics
    this.graphics.visible = false;
    if (this.turret && this.turret.graphics) {
      this.turret.graphics.visible = false;
    }
    
    // Create explosion effect
    this.createExplosion();
    
    // Start respawn timer only for local player
    if (!this.isAI) {
      this.respawnTimer = setTimeout(() => this.respawn(), RESPAWN_TIME);
    }
  }
  
  respawn() {
    // Notify server about respawn
    if (!this.isAI) {
      this.app.game.networkManager.sendRespawn();
    }
    
    this.isDead = false;
    this.health = PLAYER_MAX_HEALTH;
    this.velocityX = 0;
    this.velocityY = 0;
    
    // Reset rotation to initial state
    this._rotation = 0;
    
    // Update health bar
    if (!this.isAI && this.healthBar) {
      this.healthBar.update(this.health);
    }
    
    // Clean up any remaining explosion particles
    this.clearExplosionParticles();
    this.explosionParticles = [];

    // Make graphics visible again
    this.graphics.visible = true;
    if (this.turret && this.turret.graphics) {
      this.turret.graphics.visible = true;
    }

    // For AI players, update position immediately
    if (this.isAI) {
      this.x = this.spawnX;
      this.y = this.spawnY;
      this.targetX = this.spawnX;
      this.targetY = this.spawnY;
      
      // Reset graphics rotation
      this.graphics.rotation = this._rotation;
      this.turret.graphics.rotation = this._rotation;
      
      // Ensure turret is properly positioned
      this.turret.graphics.x = this.graphics.x;
      this.turret.graphics.y = this.graphics.y;
    }
    // For the main player, position will be updated when server sends spawn position
  }
  
  applyForce(forceX, forceY) {
    if (this.isDead) return;
    
    this.velocityX += forceX;
    this.velocityY += forceY;
    
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }
  }
  
  destroy() {
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
    }
    this.clearExplosionParticles();
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    this.graphics.destroy();
    this.turret.destroy();
  }
  
  checkWallCollision(newX, newY) {
    // Create circle object for the player in world coordinates
    const playerCircle = {
      x: newX,
      y: newY,
      radius: PLAYER_RADIUS
    };

    for (const wall of this.wallManager.getWalls()) {
      const wallRect = {
        x: wall.graphics.x,
        y: wall.graphics.y,
        width: wall.graphics.width,
        height: wall.graphics.height
      };

      if (checkCircleRectCollision(playerCircle, wallRect)) {
        // Calculate wall normal (perpendicular to wall surface)
        const isVerticalWall = wallRect.width < wallRect.height;
        const normalX = isVerticalWall ? 1 : 0;
        const normalY = isVerticalWall ? 0 : 1;

        // Calculate dot product of velocity and normal
        const dotProduct = this.velocityX * normalX + this.velocityY * normalY;

        // If moving towards the wall
        if (dotProduct < 0) {
          // Project velocity onto the wall plane
          this.velocityX = this.velocityX - dotProduct * normalX;
          this.velocityY = this.velocityY - dotProduct * normalY;
        }

        return true;
      }
    }
    return false;
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

  createExplosion() {
    const numParticles = 16;
    const particleSpeed = 3;
    const particleSize = 4;
    const particleColor = this.color;
    
    // Use the actual player position for the explosion
    const explosionX = this.x;
    const explosionY = this.y;
    
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const particle = new PIXI.Graphics();
      
      // Draw particle
      particle.context.fillStyle = particleColor;
      particle.context.circle(0, 0, particleSize);
      particle.context.fill();
      
      // Position particle at player center using world coordinates
      particle.x = explosionX;
      particle.y = explosionY;
      
      // Add to world container for consistent coordinate system
      if (this.worldContainer) {
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
          if (this.worldContainer) {
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

  clearExplosionParticles() {
    for (const particle of this.explosionParticles) {
      if (this.worldContainer) {
        this.worldContainer.removeChild(particle);
      } else {
        this.app.stage.removeChild(particle);
      }
    }
  }

  // Add method to update spawn position
  updateSpawnPosition(x, y) {
    this.spawnX = x;
    this.spawnY = y;
    
    if (!this.isAI) {
      // Update position immediately to prevent flicker
      this.x = x;
      this.y = y;
      this.targetX = x;
      this.targetY = y;
      
      // Reset graphics rotation
      this.graphics.rotation = this._rotation;
      this.turret.graphics.rotation = this._rotation;
      
      // Ensure turret is properly positioned
      this.turret.graphics.x = this.graphics.x;
      this.turret.graphics.y = this.graphics.y;
      
      // Animate camera to new position
      this.app.game.animateCameraToPosition(x, y);
    }
  }

  // Add method to apply knockback
  applyKnockback(directionX, directionY, power) {
    if (this.isDead) return;
    
    // Apply knockback force as velocity change
    this.velocityX += directionX * power;
    this.velocityY += directionY * power;
    
    // Ensure velocity doesn't exceed max speed
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }
  }

  setName(name) {
    this.name = name;
    // Update floating name text only for other players
    if (this.isAI && this.nameText) {
      this.nameText.text = name;
    }
    // Update health bar name for main player
    if (!this.isAI) {
      this.healthBar?.setName(name);
    }
  }
}