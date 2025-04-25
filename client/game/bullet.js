
export class BulletManager {
  constructor(app, {wallManager, worldContainer}) {
    this.app = app;
    this.wallManager = wallManager;
    this.bullets = new Map(); // Use Map to track bullets by ID
    this.worldContainer = worldContainer;
    
    // All bullets now go in the world container
    this.bulletContainer = new PIXI.Container();
    this.worldContainer.addChild(this.bulletContainer);
  }
  
  createBullet(x, y, rotation, sourcePlayer) {
    const bullet = new PIXI.Graphics();
    bullet.context.fillStyle = sourcePlayer.color;
    bullet.context.circle(0, 0, sourcePlayer.bulletRadius);
    bullet.context.fill();
    
    // Add bullet to world container
    this.bulletContainer.addChild(bullet);
    
    // Position bullet in world coordinates
    bullet.x = x;
    bullet.y = y;
    bullet.rotation = rotation;
    bullet.vx = Math.cos(rotation) * sourcePlayer.bulletSpeed;
    bullet.vy = Math.sin(rotation) * sourcePlayer.bulletSpeed;
    bullet.sourcePlayer = sourcePlayer;
    
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
      bullet.vx = Math.cos(serverBullet.rotation) * bullet.sourcePlayer.bulletSpeed;
      bullet.vy = Math.sin(serverBullet.rotation) * bullet.sourcePlayer.bulletSpeed;
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