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
  constructor(app, worldContainer) {
    this.app = app;
    this.walls = [];
    this.wallContainer = new PIXI.Container();
    worldContainer.addChild(this.wallContainer);
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
    // Create walls to form a bounded area
    // Outer walls
    this.createWall(-1000, -1000, 2000, 20);  // Top
    this.createWall(-1000, 980, 2000, 20);    // Bottom
    this.createWall(-1000, -1000, 20, 2000);  // Left
    this.createWall(980, -1000, 20, 2000);    // Right
    
    // Inner walls
    this.createWall(-500, -500, 100, 20);     // Horizontal
    this.createWall(-500, -500, 20, 100);     // Vertical
    this.createWall(400, 400, 100, 20);       // Horizontal
    this.createWall(400, 400, 20, 100);       // Vertical
  }
}