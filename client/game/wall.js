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
  
  // Helper function to check if a point collides with any wall
  checkPointCollision(x, y, radius) {
    for (const wall of this.walls) {
      const wallLeft = wall.x;
      const wallRight = wall.x + wall.width;
      const wallTop = wall.y;
      const wallBottom = wall.y + wall.height;
      
      // Check if point (with radius) intersects with wall
      if (x + radius > wallLeft && 
          x - radius < wallRight &&
          y + radius > wallTop && 
          y - radius < wallBottom) {
        return true;
      }
    }
    return false;
  }
  
  // Find a safe spawn position within the outer walls
  findSafeSpawnPosition(radius) {
    const maxAttempts = 100;
    const outerWalls = this.walls.slice(0, 4); // First 4 walls are outer walls
    
    if (outerWalls.length < 4) return { x: 0, y: 0 }; // Fallback to center
    
    // Calculate bounds from outer walls
    const bounds = {
      left: outerWalls[2].x + radius,
      right: outerWalls[3].x - radius,
      top: outerWalls[0].y + radius,
      bottom: outerWalls[1].y - radius
    };
    
    for (let i = 0; i < maxAttempts; i++) {
      // Generate random position within bounds
      const x = bounds.left + Math.random() * (bounds.right - bounds.left);
      const y = bounds.top + Math.random() * (bounds.bottom - bounds.top);
      
      // Check if position is clear of walls
      if (!this.checkPointCollision(x, y, radius)) {
        return { x, y };
      }
    }
    
    // If no position found, return center position
    return { x: 0, y: 0 };
  }
}