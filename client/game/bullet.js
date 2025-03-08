import { BULLET_RADIUS, BULLET_COLOR, BULLET_SPEED, WIDTH, HEIGHT, BULLET_DAMAGE, TURRET_HEIGHT, BULLET_FORCE } from '../constants.js';
import { checkCollision, getDistance } from '../utils/collision.js';

export class BulletManager {
  constructor(app, wallManager, worldContainer) {
    this.app = app;
    this.wallManager = wallManager;
    this.bullets = new Map(); // Use Map to track bullets by ID
    this.worldContainer = worldContainer;
    
    // All bullets now go in the world container
    this.bulletContainer = new PIXI.Container();
    this.worldContainer.addChild(this.bulletContainer);
    
    // Add a ticker to update bullet collisions
    this.app.ticker.add(this.updateBulletCollisions.bind(this));
  }
  
  createBullet(x, y, rotation, sourcePlayer) {
    const bullet = new PIXI.Graphics();
    bullet.context.fillStyle = BULLET_COLOR;
    bullet.context.circle(0, 0, BULLET_RADIUS);
    bullet.context.fill();
    
    // Add bullet to world container
    this.bulletContainer.addChild(bullet);
    
    // Position bullet in world coordinates
    bullet.x = x;
    bullet.y = y;
    bullet.rotation = rotation;
    bullet.vx = Math.cos(rotation) * BULLET_SPEED;
    bullet.vy = Math.sin(rotation) * BULLET_SPEED;
    bullet.sourcePlayer = sourcePlayer;
    bullet.isAIBullet = sourcePlayer.isAI;
    
    return bullet;
  }
  
  updateBullet(serverBullet) {
    let bullet = this.bullets.get(serverBullet.id);
    
    if (!bullet) {
      // Don't create new bullets that are already destroying
      if (serverBullet.destroying) {
        return;
      }
      
      // Create new bullet
      const sourcePlayer = serverBullet.sourceId === this.app.game.networkManager.socket.id 
        ? this.app.game.player 
        : this.app.game.otherPlayers.get(serverBullet.sourceId);
      
      if (!sourcePlayer) return; // Skip if source player not found
      
      bullet = this.createBullet(
        serverBullet.x,
        serverBullet.y,
        serverBullet.rotation,
        sourcePlayer
      );
      bullet.id = serverBullet.id;
      this.bullets.set(serverBullet.id, bullet);
    } else {
      // Handle destroying state
      if (serverBullet.destroying) {
        if (!bullet.destroying) {
          // Start destruction animation
          bullet.destroying = true;
          bullet.destructionStartTime = Date.now();
          // Add fade out effect
          const fadeOut = () => {
            bullet.alpha -= 0.2; // Fade out quickly
            if (bullet.alpha <= 0) {
              this.destroyBullet(bullet.id);
            } else {
              requestAnimationFrame(fadeOut);
            }
          };
          fadeOut();
        }
        return;
      }
      
      // Update existing bullet
      bullet.x = serverBullet.x;
      bullet.y = serverBullet.y;
      bullet.rotation = serverBullet.rotation;
      bullet.vx = Math.cos(serverBullet.rotation) * BULLET_SPEED;
      bullet.vy = Math.sin(serverBullet.rotation) * BULLET_SPEED;
    }
  }
  
  checkBulletWallCollision(bullet) {
    const bulletBounds = {
      x: bullet.x - BULLET_RADIUS,
      y: bullet.y - BULLET_RADIUS,
      width: BULLET_RADIUS * 2,
      height: BULLET_RADIUS * 2,
    };

    for (const wall of this.wallManager.getWalls()) {
      if (checkCollision(bulletBounds, wall)) {
        this.destroyBullet(bullet.id);
        return true;
      }
    }
    return false;
  }

  checkBulletPlayerCollision(bullet) {
    // Check collision with each player
    const players = [this.app.game.player, ...Array.from(this.app.game.otherPlayers.values())];
    
    for (const player of players) {
      // Skip if player is dead
      if (player.isDead) continue;


      // Calculate distance between bullet and player
      const distance = getDistance(bullet.x, bullet.y, player.x, player.y);
      
      if (distance < BULLET_RADIUS + player.radius) {
        // Apply damage
        player.takeDamage(BULLET_DAMAGE);
        
        // Calculate force direction based on bullet's velocity
        const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
        let forceX = bullet.vx;
        let forceY = bullet.vy;
        
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

  updateBulletCollisions() {
    for (const [id, bullet] of this.bullets) {
      // Update bullet position
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Check for wall collision
      if (this.checkBulletWallCollision(bullet)) {
        continue;
      }

      // Check for player collision
      if (this.checkBulletPlayerCollision(bullet)) {
        this.destroyBullet(id);
        continue;
      }

      // Check if bullet is out of bounds
      const screenX = bullet.x + this.worldContainer.x;
      const screenY = bullet.y + this.worldContainer.y;
      const buffer = WIDTH / 2;
      
      if (screenX < -buffer || screenX > WIDTH + buffer || 
          screenY < -buffer || screenY > HEIGHT + buffer) {
        this.destroyBullet(id);
      }
    }
  }

  destroyBullet(id) {
    const bullet = this.bullets.get(id);
    if (bullet) {
      this.bulletContainer.removeChild(bullet);
      this.bullets.delete(id);
    }
  }

  destroy() {
    // Clean up all bullets
    for (const [id] of this.bullets) {
      this.destroyBullet(id);
    }
    this.bulletContainer.destroy();
  }
}