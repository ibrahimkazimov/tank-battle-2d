import * as PIXI from 'pixi.js';
import { GAME_CONFIG, COLORS, PLAYER_CONFIG, WORLD_BOUNDS, BULLET_CONFIG } from '@tank-battle/shared';
import { MAP_CONFIG } from '@tank-battle/shared/src/map.js';

export class Renderer {
  constructor(container) {
    this.app = new PIXI.Application();
    this.container = container;
    this.world = new PIXI.Container();
    this.playerGraphics = new Map();
    this.bulletGraphics = [];
    this.wallsGraphics = null;
    this.gameScale = 1;

    // Separate containers for layers
    this.layers = {
      background: new PIXI.Container(),
      walls: new PIXI.Container(),
      bullets: new PIXI.Container(),
      players: new PIXI.Container(),
      ui: new PIXI.Container()
    };
  }

  async init() {
    await this.app.init({
      // resizeTo: window, // We handle resizing manually for fixed aspect ratio
      backgroundColor: COLORS.BACKGROUND,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    
    // Style for centering
    this.app.canvas.style.position = 'absolute';
    this.app.canvas.style.top = '50%';
    this.app.canvas.style.left = '50%';
    this.app.canvas.style.transform = 'translate(-50%, -50%)';
    
    this.container.appendChild(this.app.canvas);
    
    // Add layers to world
    this.world.addChild(this.layers.background);
    this.world.addChild(this.layers.walls);
    this.world.addChild(this.layers.bullets);
    this.world.addChild(this.layers.players);
    
    this.app.stage.addChild(this.world);
    
    // Draw grid background
    this.drawBackground();
    
    // Draw static walls once
    this.drawWalls(MAP_CONFIG.WALLS);

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  handleResize() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Target aspect ratio
    const targetRatio = GAME_CONFIG.WIDTH / GAME_CONFIG.HEIGHT;
    const windowRatio = windowWidth / windowHeight;

    let width, height;

    if (windowRatio > targetRatio) {
      // Window is wider than target: fit to height
      height = windowHeight;
      width = height * targetRatio;
    } else {
      // Window is taller than target: fit to width
      width = windowWidth;
      height = width / targetRatio;
    }

    // Resize renderer to fit the calculated dimensions
    this.app.renderer.resize(width, height);

    // Scaling factor to map game coordinates to screen coordinates
    // We want the whole GAME_CONFIG dimensions to fit into the new renderer dimensions.
    // So scale = newWidth / logicalWidth
    this.gameScale = width / GAME_CONFIG.WIDTH;
    
    this.app.stage.scale.set(this.gameScale);
    
    // Reset stage position - we rely on CSS centering of the canvas + camera centering
    this.app.stage.position.set(0, 0);
  }

  drawBackground() {
    const bg = new PIXI.Graphics();
    bg.rect(WORLD_BOUNDS.LEFT - 1000, WORLD_BOUNDS.TOP - 1000, 
            (WORLD_BOUNDS.RIGHT - WORLD_BOUNDS.LEFT) + 2000, 
            (WORLD_BOUNDS.BOTTOM - WORLD_BOUNDS.TOP) + 2000);
    bg.fill({ color: COLORS.BACKGROUND });

    // Draw grid
    bg.context.strokeStyle = 'rgba(0,0,0,0.05)';
    bg.context.lineWidth = 2;
    
    for (let x = WORLD_BOUNDS.LEFT; x <= WORLD_BOUNDS.RIGHT; x+= 100) {
        bg.moveTo(x, WORLD_BOUNDS.TOP);
        bg.lineTo(x, WORLD_BOUNDS.BOTTOM);
    }
    for (let y = WORLD_BOUNDS.TOP; y <= WORLD_BOUNDS.BOTTOM; y+= 100) {
        bg.moveTo(WORLD_BOUNDS.LEFT, y);
        bg.lineTo(WORLD_BOUNDS.RIGHT, y);
    }
    bg.stroke();
    
    this.layers.background.addChild(bg);
  }

  drawWalls(walls) {
    if (this.wallsGraphics) {
      this.wallsGraphics.destroy();
    }
    const g = new PIXI.Graphics();
    g.context.fillStyle = COLORS.WALL;
    
    walls.forEach(wall => {
      g.rect(wall.x, wall.y, wall.width, wall.height);
      g.fill();
    });
    
    this.wallsGraphics = g;
    this.layers.walls.addChild(g);
  }

  render(gameState, localPlayerId) {
    // 1. Update Players
    this.updatePlayers(gameState.players);
    
    // 2. Update Bullets
    this.updateBullets(gameState.bullets);

    // 3. Camera Follow
    const localPlayer = gameState.players.find(p => p.id === localPlayerId);
    if (localPlayer) {
      this.centerCamera(localPlayer.x, localPlayer.y);
    }
  }

  updatePlayers(players) {
    // Mark all as not updated
    for (const [id, graphics] of this.playerGraphics) {
       graphics.touched = false;
    }

    players.forEach(player => {
        let container = this.playerGraphics.get(player.id);
        
        if (!container) {
            container = this.createPlayerGraphics(player);
            this.layers.players.addChild(container);
            this.playerGraphics.set(player.id, container);
        }

        container.touched = true;
        container.visible = player.isVisible && !player.isDead;
        
        // Smooth interpolation could be done here, for now just set position
        container.x = player.x;
        container.y = player.y;
        
        // Rotate body/turret
        // Note: gameState has 'rotation' which is likely turret rotation or body rotation?
        // In v1, player had separate rotation for body (usually movement dir) and turret (mouse dir)
        // Shared physics has 'rotation' on player. Assume it's body or turret?
        // Let's assume input.rotation drives turret.
        
        // Update turret rotation
        const turret = container.getChildByName('turret');
        if (turret) turret.rotation = player.rotation;
        
        // Update health bar
        this.updateHealthBar(container, player);
    });

    // Remove stale players
    for (const [id, container] of this.playerGraphics) {
        if (!container.touched) {
            container.destroy();
            this.playerGraphics.delete(id);
        }
    }
  }

  createPlayerGraphics(player) {
    const container = new PIXI.Container();
    
    // Body
    const body = new PIXI.Graphics();
    body.circle(0, 0, PLAYER_CONFIG.RADIUS);
    body.fill({ color: player.color });
    body.stroke({ color: COLORS.STROKE, width: COLORS.STROKE_WIDTH });
    container.addChild(body);

    // Turret
    const turret = new PIXI.Graphics();
    turret.name = 'turret';
    turret.roundRect(0, -5, 30, 10, 5); // 30 length
    turret.fill({ color: COLORS.TURRET });
    turret.stroke({ color: COLORS.STROKE, width: COLORS.STROKE_WIDTH });
    turret.pivot.set(0, 0); // Rotate around center of tank
    container.addChild(turret);

    // Name tag
    const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 14,
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
    });
    const text = new PIXI.Text({ text: player.name, style });
    text.anchor.set(0.5);
    text.y = -PLAYER_CONFIG.RADIUS - 20;
    container.addChild(text);

    // Health Bar Container
    const healthBar = new PIXI.Container();
    healthBar.name = 'healthBar';
    healthBar.y = PLAYER_CONFIG.RADIUS + 15;
    container.addChild(healthBar);

    return container;
  }

  updateHealthBar(container, player) {
    const healthBar = container.getChildByName('healthBar');
    healthBar.removeChildren(); // clear old
    
    const width = 40;
    const height = 6;
    const pct = Math.max(0, player.health / PLAYER_CONFIG.MAX_HEALTH);
    
    // Background
    const bg = new PIXI.Graphics();
    bg.rect(-width/2, 0, width, height);
    bg.fill({ color: 0x333333 });
    healthBar.addChild(bg);
    
    // Foreground
    const fg = new PIXI.Graphics();
    fg.rect(-width/2, 0, width * pct, height);
    fg.fill({ color: pct > 0.5 ? 0x00ff00 : pct > 0.2 ? 0xffff00 : 0xff0000 });
    healthBar.addChild(fg);
  }

  updateBullets(bullets) {
     // Clear old bullets
     this.layers.bullets.removeChildren();
     
     // Simple redraw every frame (optimization: use pool if needed)
     // v1 was creating objects, let's keep it simple for now as PIXI handles many objects well
     
     const g = new PIXI.Graphics();
     
     bullets.forEach(bullet => {
         g.circle(bullet.x, bullet.y, bullet.radius);
         g.fill({ color: 0x000000 });
     });
     
     this.layers.bullets.addChild(g);
  }

  centerCamera(x, y) {
      const screenWidth = this.app.screen.width;
      const screenHeight = this.app.screen.height;
      
      this.world.pivot.set(x, y);
      this.world.position.set(screenWidth / 2 / this.gameScale, screenHeight / 2 / this.gameScale);
  }

  // Helper to convert screen to world
  screenToWorld(x, y) {
      if (!this.world) return { x: 0, y: 0 };
      // Apply inverse transform
      return this.world.toLocal({x, y});
  }
}
