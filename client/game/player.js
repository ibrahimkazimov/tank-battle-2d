import { PLAYER_RADIUS, PLAYER_COLOR, PLAYER_SPEED, WIDTH, HEIGHT } from '../constants.js';
import { Turret } from './turret.js';
import { checkCollision } from '../utils/collision.js';

export class Player {
  constructor(app, wallManager) {
    this.app = app;
    this.wallManager = wallManager;
    this.radius = PLAYER_RADIUS;
    this.turret = new Turret(app);
    this.graphics = this.createGraphics();
    
    // Set initial position
    this._x = 0;
    this._y = 0;
  }
  
  createGraphics() {
    const player = new PIXI.Graphics();
    player.context.fillStyle = PLAYER_COLOR;
    player.context.circle(0, 0, PLAYER_RADIUS);
    player.context.fill();
    player.x = WIDTH / 2;
    player.y = HEIGHT / 2;
    this.app.stage.addChild(player);
    return player;
  }
  
  get x() {
    return this._x;
  }
  
  set x(value) {
    this._x = value;
    // Keep graphics centered
    this.graphics.x = WIDTH / 2;
    this.turret.x = WIDTH / 2;
  }
  
  get y() {
    return this._y;
  }
  
  set y(value) {
    this._y = value;
    // Keep graphics centered
    this.graphics.y = HEIGHT / 2;
    this.turret.y = HEIGHT / 2;
  }
  
  update(keys) {
    let newX = this.x;
    let newY = this.y;

    // Calculate new position based on keys
    if (keys.ArrowLeft) newX -= PLAYER_SPEED;
    if (keys.ArrowRight) newX += PLAYER_SPEED;
    if (keys.ArrowUp) newY -= PLAYER_SPEED;
    if (keys.ArrowDown) newY += PLAYER_SPEED;

    // Check for wall collisions before updating position
    if (!this.checkWallCollision(newX, this.y)) {
      this.x = newX;
    }
    
    if (!this.checkWallCollision(this.x, newY)) {
      this.y = newY;
    }

    // Keep player within world boundaries
    this.enforceWorldBoundaries();
  }
  
  enforceWorldBoundaries() {
    // Assuming the world is twice the size of the viewport
    const WORLD_BOUNDS = {
      left: -WIDTH,
      right: WIDTH,
      top: -HEIGHT,
      bottom: HEIGHT
    };

    if (this.x < WORLD_BOUNDS.left) {
      this.x = WORLD_BOUNDS.left;
    }
    if (this.x > WORLD_BOUNDS.right) {
      this.x = WORLD_BOUNDS.right;
    }
    if (this.y < WORLD_BOUNDS.top) {
      this.y = WORLD_BOUNDS.top;
    }
    if (this.y > WORLD_BOUNDS.bottom) {
      this.y = WORLD_BOUNDS.bottom;
    }
  }
  
  checkWallCollision(newX, newY) {
    const playerBounds = {
      x: WIDTH / 2 - PLAYER_RADIUS,
      y: HEIGHT / 2 - PLAYER_RADIUS,
      width: PLAYER_RADIUS * 2,
      height: PLAYER_RADIUS * 2,
    };

    // Adjust for world position
    const worldX = -newX;
    const worldY = -newY;

    for (const wall of this.wallManager.getWalls()) {
      const adjustedWall = {
        x: wall.graphics.x + worldX,
        y: wall.graphics.y + worldY,
        width: wall.graphics.width,
        height: wall.graphics.height
      };

      if (checkCollision(playerBounds, adjustedWall)) {
        return true;
      }
    }
    return false;
  }
  
  updateTurretRotation(mouseX, mouseY) {
    // Calculate angle between center of screen and mouse position
    const dx = mouseX - WIDTH / 2;
    const dy = mouseY - HEIGHT / 2;
    this.turret.rotation = Math.atan2(dy, dx);
  }
  
  getTurretPosition() {
    return {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      rotation: this.turret.rotation
    };
  }
}