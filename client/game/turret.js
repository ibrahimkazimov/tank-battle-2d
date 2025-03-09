import { TURRET_WIDTH, TURRET_HEIGHT, TURRET_COLOR, WIDTH, HEIGHT, BULLET_COOLDOWN, PLAYER_COLOR, PLAYER2_COLOR } from '../constants.js';

export class Turret {
  constructor(app, isAI, worldContainer, color) {
    this.app = app;
    this.isAI = isAI;
    this.worldContainer = worldContainer;
    this.color = color;
    this.length = 30;
    this.width = 8;
    this.graphics = this.createGraphics();
    
    // Recoil animation properties
    this.isRecoiling = false;
    this.recoilStartTime = 0;
    this.recoilDuration = 100; // ms
    this.recoilDistance = 5;
    this.baseX = 0;
    this.baseY = 0;
    
    // Store the parent player reference
    this.player = null;
  }
  
  createGraphics() {
    const turret = new PIXI.Graphics();
    
    // Draw turret barrel horizontally (pointing right at 0 degrees)
    turret.context.fillStyle = this.color;
    turret.context.rect(0, -this.width/2, this.length, this.width);
    turret.context.fill();
    
    // Set the pivot point to the center of rotation
    turret.pivot.set(0, 0);
    
    // Add to world container if it exists
    if (this.worldContainer) {
      this.worldContainer.addChild(turret);
    } else {
      this.app.stage.addChild(turret);
    }
    
    return turret;
  }
  
  startRecoil() {
    if (this.isRecoiling) return;
    
    this.isRecoiling = true;
    this.recoilStartTime = Date.now();
    
    // Store the current position as base position
    this.baseX = this.graphics.x;
    this.baseY = this.graphics.y;
    
    // Start the recoil animation
    if (!this.recoilTicker) {
      this.recoilTicker = () => this.updateRecoil();
      this.app.ticker.add(this.recoilTicker);
    }
  }
  
  updateRecoil() {
    if (!this.isRecoiling) return;
    
    const elapsed = Date.now() - this.recoilStartTime;
    const progress = Math.min(elapsed / this.recoilDuration, 1);
    
    // Use sine curve for smooth back-and-forth motion
    const recoilOffset = Math.sin(progress * Math.PI) * this.recoilDistance;
    
    // Calculate recoil direction based on current rotation
    const recoilX = -Math.cos(this.graphics.rotation) * recoilOffset;
    const recoilY = -Math.sin(this.graphics.rotation) * recoilOffset;
    
    // Update position relative to the current player position
    if (this.player) {
      this.graphics.x = this.player.x + recoilX;
      this.graphics.y = this.player.y + recoilY;
    }
    
    // End animation when complete
    if (progress >= 1) {
      this.isRecoiling = false;
      if (this.recoilTicker) {
        this.app.ticker.remove(this.recoilTicker);
        this.recoilTicker = null;
      }
      // Reset to current player position
      if (this.player) {
        this.graphics.x = this.player.x;
        this.graphics.y = this.player.y;
      }
    }
  }
  
  destroy() {
    if (this.recoilTicker) {
      this.app.ticker.remove(this.recoilTicker);
    }
    if (this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics);
    }
    this.graphics.destroy();
  }
  
  setPlayer(player) {
    this.player = player;
  }
}