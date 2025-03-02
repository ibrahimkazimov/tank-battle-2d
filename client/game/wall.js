import { WALL_COLOR } from '../constants.js';

export class Wall {
  constructor(app, wallContainer, x, y, width, height) {
    this.app = app;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.graphics = this.createGraphics(wallContainer);
  }
  
  createGraphics(container) {
    const wall = new PIXI.Graphics();
    wall.context.fillStyle = WALL_COLOR;
    wall.context.rect(0, 0, this.width, this.height);
    wall.context.fill();
    wall.x = this.x;
    wall.y = this.y;
    container.addChild(wall);
    return wall;
  }
}

export class WallManager {
  constructor(app) {
    this.app = app;
    this.walls = [];
    this.wallContainer = new PIXI.Container();
    app.stage.addChild(this.wallContainer);
  }
  
  createWall(x, y, width, height) {
    const wall = new Wall(this.app, this.wallContainer, x, y, width, height);
    this.walls.push(wall);
    return wall;
  }
  
  getWalls() {
    return this.walls;
  }
  
  // Generate some example walls
  createDefaultWalls() {
    this.createWall(200, 100, 20, 200);  // Vertical wall
    this.createWall(500, 500, 200, 20);  // Horizontal wall
    this.createWall(800, 200, 20, 300);  // Another vertical wall
  }
}