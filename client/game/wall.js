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
  
  // Create walls from server data
  createWallsFromData(wallsData) {
    // Clear existing walls
    this.walls.forEach(wall => {
      if (wall.graphics) {
        wall.graphics.destroy();
      }
    });
    this.walls = [];
    
    // Create new walls from server data
    wallsData.forEach(wallData => {
      this.createWall(wallData.x, wallData.y, wallData.width, wallData.height);
    });
  }

}