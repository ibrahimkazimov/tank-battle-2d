import { TURRET_WIDTH, TURRET_HEIGHT, TURRET_COLOR, WIDTH, HEIGHT, BULLET_COOLDOWN, PLAYER_COLOR, PLAYER2_COLOR } from '../constants.js';

export class Turret {
  constructor(app, isAI = false, worldContainer = null) {
    this.app = app; // Reference to the main app
    this.isAI = isAI; // Whether the turret belongs to an AI
    this.worldContainer = worldContainer;
    this.length = 30;
    this.width = 8;
    
    this.graphics = new PIXI.Graphics();
    this.graphics.context.fillStyle = isAI ? PLAYER2_COLOR : PLAYER_COLOR;
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
    
    this.recoilAnimation = null; // Recoil animation timeout
    this.recoilDistance = 3; // Reduced recoil distance
    this.recoilDuration = 100; // Longer duration for smoother animation
    this.playerPushBackDistance = 0.5; // Very slight push back for the player
    this.animationStartTime = 0; // Recoil animation start time
    this.startX = 0; // Recoil start position
    this.startY = 0; // Recoil start position
    this.targetX = 0; // Recoil target position
    this.targetY = 0; // Recoil target position
    this.lastFired = 0; // Last time the turret fired
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
    // Calculate angle between player center and mouse position in world coordinates
    const dx = mouseX - playerX;
    const dy = mouseY - playerY;
    
    // Calculate the angle
    let angle = Math.atan2(dy, dx);
    
    // Normalize the angle to be between 0 and 2π
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    
    // Update rotation directly
    this.graphics.rotation = angle;
  }

  // Add recoil animation when firing
  fire() {
    // Store current position for recoil animation
    this.startX = this.graphics.x;
    this.startY = this.graphics.y;
    
    // Calculate recoil direction based on turret rotation
    const recoilDistance = 5;
    const recoilX = -Math.cos(this.rotation) * recoilDistance;
    const recoilY = -Math.sin(this.rotation) * recoilDistance;
    
    // Calculate target position for recoil animation
    const targetX = this.startX + recoilX;
    const targetY = this.startY + recoilY;
    
    // Get the player's current position
    const player = this.player;
    if (!player) return;
    
    // Calculate bullet spawn position using player's graphics position
    const turretLength = 30;
    const bulletX = player.graphics.x + Math.cos(this.rotation) * turretLength;
    const bulletY = player.graphics.y + Math.sin(this.rotation) * turretLength;
    
    // Create bullet at the correct position
    this.game.bulletManager.createBullet(bulletX, bulletY, this.rotation, player);
    
    // Start recoil animation
    const recoilDuration = 100; // ms
    const startTime = Date.now();
    
    const animateRecoil = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / recoilDuration, 1);
      
      // Ease out cubic function for smooth recoil
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      this.graphics.x = this.startX + (targetX - this.startX) * easeOutCubic;
      this.graphics.y = this.startY + (targetY - this.startY) * easeOutCubic;
      
      if (progress < 1) {
        requestAnimationFrame(animateRecoil);
      } else {
        // Reset position after recoil
        this.graphics.x = this.startX;
        this.graphics.y = this.startY;
      }
    };
    
    animateRecoil();
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

  destroy() {
    if (this.graphics && this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics);
    }
  }
}