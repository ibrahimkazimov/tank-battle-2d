import { TURRET_WIDTH, TURRET_HEIGHT, TURRET_COLOR, WIDTH, HEIGHT } from '../constants.js';

export class Turret {
  constructor(app, isAI = false, worldContainer = null) {
    this.app = app;
    this.isAI = isAI;
    this.graphics = this.createGraphics();
    this.recoilAnimation = null;
    this.recoilDistance = 3; // Reduced recoil distance
    this.recoilDuration = 100; // Longer duration for smoother animation
    this.animationStartTime = 0;
    this.startX = 0;
    this.startY = 0;
    this.targetX = 0;
    this.targetY = 0;
    
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
    this.graphics.x = value;
  }
  
  get y() {
    return this.graphics.y;
  }
  
  set y(value) {
    this.graphics.y = value;
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

  // Add recoil animation when firing
  fire() {
    if (this.recoilAnimation) {
      clearTimeout(this.recoilAnimation);
      this.app.ticker.remove(this.animateRecoil);
    }

    // Store current position
    this.startX = this.graphics.x;
    this.startY = this.graphics.y;
    
    // Calculate recoil direction based on turret rotation
    const recoilX = -Math.cos(this.rotation) * this.recoilDistance;
    const recoilY = -Math.sin(this.rotation) * this.recoilDistance;
    
    if (this.isAI) {
      // For AI, move in world coordinates
      this.targetX = this.startX + recoilX;
      this.targetY = this.startY + recoilY;
    } else {
      // For main player, use screen center coordinates
      this.targetX = WIDTH/2 + recoilX;
      this.targetY = HEIGHT/2 + recoilY;
    }

    // Start animation
    this.animationStartTime = Date.now();
    this.app.ticker.add(this.animateRecoil);

    // Set timeout to remove animation
    this.recoilAnimation = setTimeout(() => {
      this.app.ticker.remove(this.animateRecoil);
      if (this.isAI) {
        this.graphics.x = this.startX;
        this.graphics.y = this.startY;
      } else {
        this.graphics.x = WIDTH/2;
        this.graphics.y = HEIGHT/2;
      }
    }, this.recoilDuration);
  }

  // Animation ticker function
  animateRecoil = () => {
    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(elapsed / this.recoilDuration, 1);
    
    // Use smooth easing function
    const t = this.easeInOutQuad(progress);
    
    // Interpolate position
    this.graphics.x = this.startX + (this.targetX - this.startX) * t;
    this.graphics.y = this.startY + (this.targetY - this.startY) * t;
  }

  // Smooth easing function
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}