import { FLAG_COLOR, FLAG_SIZE, WIDTH, HEIGHT } from '../constants.js';
import { getDistance } from '../utils/collision.js';

export class Flag {
  constructor(app) {
    this.app = app;
    this.isCarried = false;
    this.flagContainer = new PIXI.Container();
    app.stage.addChild(this.flagContainer);
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
    const playerCenterX = player.x + WIDTH / 2;
    const playerCenterY = player.y + HEIGHT / 2;
    const distance = getDistance(playerCenterX, playerCenterY, this.x, this.y);
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
      this.x = player.x + WIDTH / 2;
      this.y = player.y + HEIGHT / 2;
      return true;
    }
    return false;
  }
  
  update(player) {
    if (this.isCarried) {
      this.x = player.x + WIDTH / 2;
      this.y = player.y + HEIGHT / 2;
    }
  }
}