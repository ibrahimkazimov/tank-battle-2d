import { TURRET_WIDTH, TURRET_HEIGHT, TURRET_COLOR, WIDTH, HEIGHT } from '../constants.js';

export class Turret {
  constructor(app, isAI = false, worldContainer = null) {
    this.app = app;
    this.isAI = isAI;
    this.graphics = this.createGraphics();
    
    if (isAI && worldContainer) {
      worldContainer.addChild(this.graphics);
    } else {
      app.stage.addChild(this.graphics);
    }
  }
  
  createGraphics() {
    const turret = new PIXI.Graphics();
    // Draw turret from (0,0) so rotation works correctly
    turret.context.rect(0, -TURRET_WIDTH / 2, TURRET_HEIGHT, TURRET_WIDTH);
    turret.context.fillStyle = TURRET_COLOR;
    turret.context.fill();
    // Set the pivot point to the base of the turret
    turret.pivot.x = 0;
    turret.pivot.y = 0;
    
    // Position turret at center for player, will be repositioned for AI
    if (!this.isAI) {
      turret.x = WIDTH / 2;
      turret.y = HEIGHT / 2;
    }
    
    return turret;
  }
  
  get x() {
    return this.graphics.x;
  }
  
  set x(value) {
    if (!this.isAI) {
      this.graphics.x = value;
    }
  }
  
  get y() {
    return this.graphics.y;
  }
  
  set y(value) {
    if (!this.isAI) {
      this.graphics.y = value;
    }
  }
  
  get rotation() {
    return this.graphics.rotation;
  }
  
  set rotation(value) {
    this.graphics.rotation = value;
  }
  
  updateRotation(mouseX, mouseY, playerX, playerY) {
    // Calculate angle between player center and mouse position
    const dx = mouseX - playerX - WIDTH / 2;
    const dy = mouseY - playerY - HEIGHT / 2;
    this.rotation = Math.atan2(dy, dx);
  }
}