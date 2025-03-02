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
    // Left wall
    this.createWall(-100, -100, 20, 1000);
    // Right wall
    this.createWall(1100, -100, 20, 1000);
    // Top wall
    this.createWall(-100, -100, 1220, 20);
    // Bottom wall
    this.createWall(-100, 900, 1220, 20);
    
    // Add some obstacles
    this.createWall(200, 100, 20, 200);  // Vertical wall
    this.createWall(500, 500, 200, 20);  // Horizontal wall
    this.createWall(800, 200, 20, 300);  // Another vertical wall
  }
}