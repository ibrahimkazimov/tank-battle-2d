import { BULLET_RADIUS, BULLET_COLOR, BULLET_SPEED } from '../constants.js';
import { checkCollision } from '../utils/collision.js';

export class BulletManager {
  constructor(app, wallManager) {
    this.app = app;
    this.wallManager = wallManager;
    this.bullets = [];
    this.bulletContainer = new PIXI.Container();
    app.stage.addChild(this.bulletContainer);
  }
  
  createBullet(x, y, rotation) {
    const bullet = new PIXI.Graphics();
    bullet.context.fillStyle = BULLET_COLOR;
    bullet.context.circle(0, 0, BULLET_RADIUS);
    bullet.context.fill();
    this.bulletContainer.addChild(bullet);
    
    bullet.x = x;
    bullet.y = y;
    bullet.rotation = rotation;
    bullet.vx = Math.cos(rotation) * BULLET_SPEED;
    bullet.vy = Math.sin(rotation) * BULLET_SPEED;
    
    this.bullets.push(bullet);
    
    const tickerCallback = () => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Check for wall collision
      if (this.checkBulletWallCollision(bullet)) {
        this.bulletContainer.removeChild(bullet);
        this.app.ticker.remove(tickerCallback);
        const index = this.bullets.indexOf(bullet);
        if (index > -1) {
          this.bullets.splice(index, 1);
        }
      }
    };

    this.app.ticker.add(tickerCallback);
    return bullet;
  }
  
  checkBulletWallCollision(bullet) {
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
}