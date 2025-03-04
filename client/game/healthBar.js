import { PLAYER_COLOR, PLAYER_MAX_HEALTH, WIDTH, HEIGHT } from '../constants.js';

export class HealthBar {
  constructor(app) {
    this.app = app;
    this.width = 400;
    this.height = 10;
    this.borderWidth = 2;
    this.borderRadius = 5;
    this.graphics = this.createGraphics();
    
    // Position at bottom center of screen
    this.graphics.x = WIDTH / 2 - this.width / 2;
    this.graphics.y = HEIGHT - 40; // 40 pixels from bottom
    
    this.app.stage.addChild(this.graphics);
  }
  
  createGraphics() {
    const container = new PIXI.Container();
    
    // Background (border)
    const background = new PIXI.Graphics();
    background.context.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
    this.drawRoundedRect(background.context, 0, 0, this.width, this.height, this.borderRadius);
    background.context.fill();
    container.addChild(background);
    
    // Health bar
    this.healthBar = new PIXI.Graphics();
    this.healthBar.context.fillStyle = PLAYER_COLOR;
    this.drawRoundedRect(this.healthBar.context, this.borderWidth, this.borderWidth, 
                        this.width - this.borderWidth * 2, 
                        this.height - this.borderWidth * 2, 
                        this.borderRadius - this.borderWidth);
    this.healthBar.context.fill();
    container.addChild(this.healthBar);

    // Player name
    this.nameText = new PIXI.Text('Player', {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: '#ffffff',
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 2
    });
    this.nameText.x = this.width / 2 - this.nameText.width / 2;
    this.nameText.y = -20; // Position above the health bar
    container.addChild(this.nameText);
    
    return container;
  }

  // Helper function to draw rounded rectangle
  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  update(health) {
    const healthPercent = health / PLAYER_MAX_HEALTH;
    this.healthBar.context.clear();
    this.healthBar.context.fillStyle = PLAYER_COLOR;
    this.drawRoundedRect(this.healthBar.context, 
                        this.borderWidth, 
                        this.borderWidth, 
                        (this.width - this.borderWidth * 2) * healthPercent, 
                        this.height - this.borderWidth * 2, 
                        this.borderRadius - this.borderWidth);
    this.healthBar.context.fill();
  }

  setName(name) {
    this.nameText.text = name;
  }
  
  destroy() {
    this.app.stage.removeChild(this.graphics);
  }
} 