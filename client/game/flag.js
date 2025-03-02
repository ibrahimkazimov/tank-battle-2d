import { FLAG_COLOR, FLAG_SIZE, WIDTH, HEIGHT } from '../constants.js';
import { getDistance } from '../utils/collision.js';

export class Flag {
  constructor(app, worldContainer) {
    this.app = app;
    this.isCarried = false;
    this.flagContainer = new PIXI.Container();
    worldContainer.addChild(this.flagContainer);
    this.graphics = this.createGraphics();
  }
  
  createGraphics() {
    const flag = new PIXI.Graphics();
    flag.context.fillStyle = FLAG_COLOR;
    flag.context.rect(-FLAG_SIZE / 2, -FLAG_SIZE, FLAG_SIZE, FLAG_SIZE);
    flag.context.fill();
    flag.x = WIDTH / 4;
    flag.y = HEIGHT / 2;
    flag.isCarried = false;
    this.flagContainer.addChild(flag);
    return flag;
  }
  
  get x() {
    return this.graphics.x;
  }
  
  set x(value) {
    this.graphics.x = value;
  }
  
  get y() {
    return this.graphics.y;
  }
  
  set y(value) {
    this.graphics.y = value;
  }
  
  isNearPlayer(player) {
    // Convert player's world position to screen coordinates
    const screenX = WIDTH / 2;
    const screenY = HEIGHT / 2;
    
    // Convert flag's position to screen coordinates
    const flagScreenX = this.x + this.flagContainer.parent.x;
    const flagScreenY = this.y + this.flagContainer.parent.y;
    
    const distance = getDistance(screenX, screenY, flagScreenX, flagScreenY);
    return distance < player.radius + FLAG_SIZE;
  }
  
  pickup(player) {
    if (!this.isCarried && this.isNearPlayer(player)) {
      this.isCarried = true;
      return true;
    }
    return false;
  }
  
  drop(player) {
    if (this.isCarried) {
      this.isCarried = false;
      // Convert screen center to world coordinates
      this.x = WIDTH / 2 - this.flagContainer.parent.x;
      this.y = HEIGHT / 2 - this.flagContainer.parent.y;
      return true;
    }
    return false;
  }
  
  update(player) {
    if (this.isCarried) {
      // Convert screen center to world coordinates
      this.x = WIDTH / 2 - this.flagContainer.parent.x;
      this.y = HEIGHT / 2 - this.flagContainer.parent.y;
    }
  }
}