import { Player } from './player.js';
import { WallManager } from './wall.js';
import { Flag } from './flag.js';
import { BulletManager } from './bullet.js';
import { WIDTH, HEIGHT, BACKGROUND_COLOR, PLAYER2_SHOOT_INTERVAL } from '../constants.js';

export class Game {
  constructor() {
    this.app = null;
    this.player = null;
    this.player2 = null;
    this.wallManager = null;
    this.bulletManager = null;
    this.flag = null;
    this.worldContainer = null;
    this.gameScale = 1;
    this.logicalWidth = WIDTH;
    this.logicalHeight = HEIGHT;
    
    // Camera animation properties
    this.cameraAnimation = null;
    this.cameraStartX = 0;
    this.cameraStartY = 0;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
    this.cameraAnimationStartTime = 0;
    this.cameraAnimationDuration = 1000; // 1 second duration
    
    this.keys = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      F: false
    };
    
    this.arrowMap = {
      w: "ArrowUp",
      a: "ArrowLeft",
      s: "ArrowDown",
      d: "ArrowRight",
      ArrowUp: "ArrowUp",
      ArrowLeft: "ArrowLeft",
      ArrowDown: "ArrowDown",
      ArrowRight: "ArrowRight",
      f: "F",
      F: "F",
    };
  }
  
  calculateScale() {
    // Get the window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate scale based on the smaller ratio to maintain aspect ratio
    const scaleX = windowWidth / this.logicalWidth;
    const scaleY = windowHeight / this.logicalHeight;
    this.gameScale = Math.min(scaleX, scaleY);
    
    // Update the renderer size
    this.app.renderer.resize(windowWidth, windowHeight);
    
    // Center the game stage
    const scaledWidth = this.logicalWidth * this.gameScale;
    const scaledHeight = this.logicalHeight * this.gameScale;
    this.app.stage.scale.set(this.gameScale);
    this.app.stage.position.x = (windowWidth - scaledWidth) / 2;
    this.app.stage.position.y = (windowHeight - scaledHeight) / 2;
  }
  
  async init() {
    // Initialize PIXI application with responsive size
    this.app = new PIXI.Application();
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      eventMode: "static",
      background: BACKGROUND_COLOR,
      resolution: window.devicePixelRatio || 1,
    });
    
    // Attach game instance to app for easy access
    this.app.game = this;
    
    // Make stage interactive and ensure it covers the full canvas
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
    
    document.body.appendChild(this.app.canvas);
    
    // Create world container for all game objects
    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);
    
    // Set up responsive handling
    this.calculateScale();
    window.addEventListener('resize', () => this.calculateScale());
    
    // Initialize game objects
    this.wallManager = new WallManager(this.app, this.worldContainer);
    this.wallManager.createDefaultWalls();
    
    // Create players at opposite corners
    this.player = new Player(this.app, this.wallManager, false, -this.logicalWidth/2 + 100, -this.logicalHeight/2 + 100);
    this.player2 = new Player(this.app, this.wallManager, true, this.logicalWidth/2 - 100, this.logicalHeight/2 - 100, this.worldContainer);
    
    this.bulletManager = new BulletManager(this.app, this.wallManager, this.worldContainer);
    this.bulletManager.setPlayers([this.player, this.player2]);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start game loop
    this.setupGameLoop();
    
    // Start AI shooting
    this.startAIBehavior();
  }
  
  setupEventListeners() {
    // Mouse movement for turret rotation - adjust for scale
    this.app.stage.on("pointermove", (event) => {
      const mousePosition = event.data.global;
      // Convert screen coordinates to logical game coordinates
      const logicalX = (mousePosition.x - this.app.stage.position.x) / this.gameScale;
      const logicalY = (mousePosition.y - this.app.stage.position.y) / this.gameScale;
      this.player.updateTurretRotation(logicalX, logicalY);
    });
    
    // Mouse click for shooting
    this.app.stage.on("pointerdown", () => {
      if (!this.player.isDead) {
        const turretPos = this.player.getTurretPosition();
        this.bulletManager.createBullet(turretPos.x, turretPos.y, turretPos.rotation, this.player);
      }
    });
    
    // Keyboard controls
    window.addEventListener("keydown", (event) => {
      if (this.arrowMap.hasOwnProperty(event.key)) {
        const mappedKey = this.arrowMap[event.key];
        this.keys[mappedKey] = true;
      }
    });
    
    window.addEventListener("keyup", (event) => {
      if (this.arrowMap.hasOwnProperty(event.key)) {
        this.keys[this.arrowMap[event.key]] = false;
      }
    });
  }
  
  startAIBehavior() {
    // AI shooting interval
    setInterval(() => {
      if (!this.player2.isDead) {
        // Calculate angle to player
        const dx = this.player.x - this.player2.x;
        const dy = this.player.y - this.player2.y;
        const rotation = Math.atan2(dy, dx);
        
        // Update AI turret rotation
        this.player2.turret.rotation = rotation;
        
        // Fire bullet
        const turretPos = this.player2.getTurretPosition();
        this.bulletManager.createBullet(turretPos.x, turretPos.y, rotation, this.player2);
      }
    }, PLAYER2_SHOOT_INTERVAL);
  }
  
  setupGameLoop() {
    this.app.ticker.add(() => {
      // Update player position
      this.player.update(this.keys);
      
      // Update AI position
      this.player2.update({});  // Pass empty keys object since AI doesn't use keyboard input
      
      // Update world container position (opposite of player movement)
      this.worldContainer.x = -this.player.x;
      this.worldContainer.y = -this.player.y;
    });
  }
  
  animateCameraToPosition(targetX, targetY) {
    // Clear any existing camera animation
    if (this.cameraAnimation) {
      this.app.ticker.remove(this.cameraAnimation);
    }

    // Store start and target positions
    this.cameraStartX = this.worldContainer.x;
    this.cameraStartY = this.worldContainer.y;
    this.cameraTargetX = -targetX;
    this.cameraTargetY = -targetY;
    this.cameraAnimationStartTime = Date.now();

    // Create smooth easing function
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    // Create animation function
    this.cameraAnimation = () => {
      const elapsed = Date.now() - this.cameraAnimationStartTime;
      const progress = Math.min(elapsed / this.cameraAnimationDuration, 1);
      const easedProgress = easeOutCubic(progress);

      // Interpolate camera position
      this.worldContainer.x = this.cameraStartX + (this.cameraTargetX - this.cameraStartX) * easedProgress;
      this.worldContainer.y = this.cameraStartY + (this.cameraTargetY - this.cameraStartY) * easedProgress;

      // Remove animation when complete
      if (progress >= 1) {
        this.app.ticker.remove(this.cameraAnimation);
        this.cameraAnimation = null;
      }
    };

    // Add animation to ticker
    this.app.ticker.add(this.cameraAnimation);
  }
  
  destroy() {
    this.player.destroy();
    this.player2.destroy();
    this.app.destroy();
  }
}