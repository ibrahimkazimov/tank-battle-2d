import { BULLET_RADIUS, BULLET_COLOR, BULLET_SPEED, WIDTH, HEIGHT, BULLET_DAMAGE, TURRET_HEIGHT } from '../constants.js';
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
  }
  
  createBullet(x, y, rotation, sourcePlayer) {
    // Trigger turret recoil animation
    sourcePlayer.turret.fire();

    const bullet = new PIXI.Graphics();
    bullet.context.fillStyle = BULLET_COLOR;
    bullet.context.circle(0, 0, BULLET_RADIUS);
    bullet.context.fill();
    
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
        player.takeDamage(BULLET_DAMAGE);
        return true;
      }
    }
    return false;
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