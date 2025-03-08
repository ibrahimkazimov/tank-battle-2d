import { TURRET_WIDTH, TURRET_HEIGHT, TURRET_COLOR, WIDTH, HEIGHT, BULLET_COOLDOWN, PLAYER_COLOR, PLAYER2_COLOR } from '../constants.js';

export class Turret {
  constructor(app, isAI = false, worldContainer = null, color) {
    this.app = app;
    this.isAI = isAI;
    this.worldContainer = worldContainer;
    this.length = 30;
    this.width = 8;
    
    this.graphics = new PIXI.Graphics();
    this.graphics.context.fillStyle = color || (isAI ? PLAYER2_COLOR : PLAYER_COLOR);
    this.graphics.context.rect(0, -this.width/2, this.length, this.width);
    this.graphics.context.fill();
    
    // Add to world container if it exists, otherwise add to app stage
    if (this.worldContainer) {
      this.worldContainer.addChild(this.graphics);
    } else {
      this.app.stage.addChild(this.graphics);
    }
    
    // Set initial position
    this.graphics.x = 0;
    this.graphics.y = 0;
    
    // Recoil properties
    this.isRecoiling = false;
    this.recoilStartTime = 0;
    this.recoilDuration = 100; // ms
    this.recoilDistance = 5;
    this.baseX = 0;
    this.baseY = 0;
    
    // Add update ticker for recoil animation
    this.app.ticker.add(this.updateRecoil.bind(this));
  }
  
  get x() {
    return this.graphics.x;
  }
  
  set x(value) {
    this.graphics.x = value;
    this.baseX = value; // Update base position
  }
  
  get y() {
    return this.graphics.y;
  }
  
  set y(value) {
    this.graphics.y = value;
    this.baseY = value; // Update base position
  }
  
  get rotation() {
    return this.graphics.rotation;
  }
  
  set rotation(value) {
    this.graphics.rotation = value;
  }
  
  startRecoil() {
    this.isRecoiling = true;
    this.recoilStartTime = Date.now();
    this.baseX = this.graphics.x;
    this.baseY = this.graphics.y;
  }
  
  updateRecoil() {
    if (!this.isRecoiling) return;
    
    const elapsed = Date.now() - this.recoilStartTime;
    const progress = Math.min(elapsed / this.recoilDuration, 1);
    
    // Smooth easing function for recoil
    const easeOutQuad = 1 - Math.pow(1 - progress, 2);
    
    // First half of animation: move back
    if (progress <= 0.5) {
      const recoilProgress = easeOutQuad * 2; // Scale to [0,1] for first half
      const recoilX = -Math.cos(this.rotation) * this.recoilDistance;
      const recoilY = -Math.sin(this.rotation) * this.recoilDistance;
      
      this.graphics.x = this.baseX + recoilX * recoilProgress;
      this.graphics.y = this.baseY + recoilY * recoilProgress;
    } 
    // Second half of animation: return to original position
    else {
      const returnProgress = (easeOutQuad - 0.5) * 2; // Scale to [0,1] for second half
      const recoilX = -Math.cos(this.rotation) * this.recoilDistance;
      const recoilY = -Math.sin(this.rotation) * this.recoilDistance;
      
      this.graphics.x = this.baseX + recoilX * (1 - returnProgress);
      this.graphics.y = this.baseY + recoilY * (1 - returnProgress);
    }
    
    // End animation
    if (progress >= 1) {
      this.isRecoiling = false;
      this.graphics.x = this.baseX;
      this.graphics.y = this.baseY;
    }
  }

  destroy() {
    if (this.graphics && this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics);
    }
    // Remove ticker
    this.app.ticker.remove(this.updateRecoil.bind(this));
  }
}