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
    this.x = 0;
    this.y = 0;
  }
  
  createGraphics() {
    const player = new PIXI.Graphics();
    player.context.fillStyle = PLAYER_COLOR;
    player.context.circle(WIDTH / 2, HEIGHT / 2, PLAYER_RADIUS);
    player.context.fill();
    this.app.stage.addChild(player);
    return player;
  }
  
  get x() {
    return this.graphics.x;
  }
  
  set x(value) {
    this.graphics.x = value;
    this.turret.x = value + WIDTH / 2;
  }
  
  get y() {
    return this.graphics.y;
  }
  
  set y(value) {
    this.graphics.y = value;
    this.turret.y = value + HEIGHT / 2;
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

    // Keep player within boundaries
    this.enforceWorldBoundaries();
  }
  
  enforceWorldBoundaries() {
    if (this.x < -WIDTH / 2) {
      this.x = -WIDTH / 2;
    }
    if (this.x > WIDTH / 2) {
      this.x = WIDTH / 2;
    }
    if (this.y < -HEIGHT / 2) {
      this.y = -HEIGHT / 2;
    }
    if (this.y > HEIGHT / 2) {
      this.y = HEIGHT / 2;
    }
  }
  
  checkWallCollision(newX, newY) {
    const playerBounds = {
      x: newX - PLAYER_RADIUS + WIDTH / 2,
      y: newY - PLAYER_RADIUS + HEIGHT / 2,
      width: PLAYER_RADIUS * 2,
      height: PLAYER_RADIUS * 2,
    };

    for (const wall of this.wallManager.getWalls()) {
      if (checkCollision(playerBounds, wall.graphics)) {
        return true;
      }
    }
    return false;
  }
  
  updateTurretRotation(mouseX, mouseY) {
    this.turret.updateRotation(mouseX, mouseY, this.x, this.y);
  }
  
  getTurretPosition() {
    return {
      x: this.turret.x,
      y: this.turret.y,
      rotation: this.turret.rotation
    };
  }
}