import { BULLET_RADIUS, BULLET_COLOR, BULLET_SPEED, WIDTH, HEIGHT, BULLET_DAMAGE, TURRET_HEIGHT, BULLET_FORCE } from '../constants.js';
import { checkCollision, getDistance } from '../utils/collision.js';

export class BulletManager {
  constructor(app, wallManager, worldContainer) {
    this.app = app;
    this.wallManager = wallManager;
    this.bullets = [];
    this.worldContainer = worldContainer;
    
    // All bullets now go in the world container
    this.aiBulletContainer = new PIXI.Container();
    this.worldContainer.addChild(this.aiBulletContainer);
    
    // Add a ticker to update bullet collisions
    this.app.ticker.add(this.updateBulletCollisions.bind(this));
  }
  
  createBullet(x, y, rotation, sourcePlayer) {
    // Check if the turret can fire
    if (!sourcePlayer.turret.fire()) return null;

    const bullet = new PIXI.Graphics();
    bullet.context.fillStyle = BULLET_COLOR;
    bullet.context.circle(0, 0, BULLET_RADIUS);
    bullet.context.fill();
    
    // Add health to the bullet for collision detection
    bullet.health = 1;

    // Calculate the bullet's starting position in world coordinates
    let worldX, worldY;
    if (sourcePlayer.isAI) {
      // For AI, use its world position
      worldX = sourcePlayer.x;
      worldY = sourcePlayer.y;
    } else {
      // For player, use player's world position (negative of world container position)
      worldX = -this.worldContainer.x + WIDTH/2;
      worldY = -this.worldContainer.y + HEIGHT/2;
    }
    
    // Add bullet to world container
    this.aiBulletContainer.addChild(bullet);
    
    // Position bullet at the turret's tip
    const turretLength = TURRET_HEIGHT;
    bullet.x = worldX + Math.cos(rotation) * turretLength;
    bullet.y = worldY + Math.sin(rotation) * turretLength;
    
    bullet.rotation = rotation;
    bullet.vx = Math.cos(rotation) * BULLET_SPEED;
    bullet.vy = Math.sin(rotation) * BULLET_SPEED;
    bullet.sourcePlayer = sourcePlayer;
    bullet.isAIBullet = sourcePlayer.isAI;
    
    this.bullets.push(bullet);
    
    const tickerCallback = () => {
      // All bullets now move in world space
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Check for wall collision
      if (this.checkBulletWallCollision(bullet)) {
        this.destroyBullet(bullet);
        this.app.ticker.remove(tickerCallback);
        return;
      }

      // Check for player collision
      if (this.checkBulletPlayerCollision(bullet)) {
        this.destroyBullet(bullet);
        this.app.ticker.remove(tickerCallback);
        return;
      }

      // Get bullet's screen coordinates for bounds checking
      const screenX = bullet.x + this.worldContainer.x;
      const screenY = bullet.y + this.worldContainer.y;

      // Use a larger boundary to prevent premature destruction
      const buffer = WIDTH / 2;  // Add a buffer zone
      if (screenX < -buffer || screenX > WIDTH + buffer || 
          screenY < -buffer || screenY > HEIGHT + buffer) {
        this.destroyBullet(bullet);
        this.app.ticker.remove(tickerCallback);
      }
    };

    this.app.ticker.add(tickerCallback);
    return bullet;
  }
  
  checkBulletWallCollision(bullet) {
    // Bullet is now always in world coordinates
    const bulletBounds = {
      x: bullet.x - BULLET_RADIUS,
      y: bullet.y - BULLET_RADIUS,
      width: BULLET_RADIUS * 2,
      height: BULLET_RADIUS * 2,
    };

    for (const wall of this.wallManager.getWalls()) {
      if (checkCollision(bulletBounds, wall.graphics)) {
        return true;
      }
    }
    return false;
  }

  checkBulletPlayerCollision(bullet) {
    // Convert bullet world position to screen position
    const bulletScreenX = bullet.x + this.worldContainer.x;
    const bulletScreenY = bullet.y + this.worldContainer.y;

    // Check collision with each player
    for (const player of this.getPlayers()) {
      // Skip if player is dead
      if (player.isDead) continue;

      // Only check collision with the opposing player
      if (bullet.sourcePlayer.isAI === player.isAI) continue;

      // Get player screen position
      let playerScreenX, playerScreenY;
      if (player.isAI) {
        playerScreenX = player.x + this.worldContainer.x;
        playerScreenY = player.y + this.worldContainer.y;
      } else {
        playerScreenX = WIDTH / 2;
        playerScreenY = HEIGHT / 2;
      }

      // Calculate distance between bullet and player
      const distance = getDistance(bulletScreenX, bulletScreenY, playerScreenX, playerScreenY);
      
      if (distance < BULLET_RADIUS + player.radius) {
        // Apply damage
        player.takeDamage(BULLET_DAMAGE);
        
        // Calculate force direction based on bullet's velocity
        const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
        let forceX, forceY;
        
        if (player.isAI) {
          // For AI, use bullet's world velocity directly since AI is in world coordinates
          forceX = bullet.vx;
          forceY = bullet.vy;
        } else {
          // For player, use bullet's world velocity directly since player is in screen coordinates
          forceX = bullet.vx;
          forceY = bullet.vy;
        }
        
        // Normalize and scale the force
        const length = Math.sqrt(forceX * forceX + forceY * forceY);
        forceX = (forceX / length) * BULLET_FORCE;
        forceY = (forceY / length) * BULLET_FORCE;
        
        // Apply force
        player.applyForce(forceX, forceY);
        
        return true;
      }
    }
    return false;
  }

  // Update bullet collisions
  updateBulletCollisions() {
    for (let i = 0; i < this.bullets.length; i++) {
      const bulletA = this.bullets[i];
      for (let j = i + 1; j < this.bullets.length; j++) {
        const bulletB = this.bullets[j];
        const distance = getDistance(bulletA.x, bulletA.y, bulletB.x, bulletB.y);
        if (distance < BULLET_RADIUS * 2) {
          bulletA.health -= 1;
          bulletB.health -= 1;
        }
      }
    }
    // Filter out bullets with health <= 0
    this.bullets = this.bullets.filter(bullet => {
      if (bullet.health <= 0) {
        this.destroyBullet(bullet);
        return false;
      }
      return true;
    });
  }

  destroyBullet(bullet) {
    this.aiBulletContainer.removeChild(bullet);
    const index = this.bullets.indexOf(bullet);
    if (index > -1) {
      this.bullets.splice(index, 1);
    }
  }

  setPlayers(players) {
    this.players = players;
  }

  getPlayers() {
    return this.players || [];
  }
}