import { Player } from './player.js';
import { WallManager } from './wall.js';
import { Flag } from './flag.js';
import { BulletManager } from './bullet.js';
import { NetworkManager } from '../network/networkManager.js';
import { WIDTH, HEIGHT, BACKGROUND_COLOR, PLAYER2_SHOOT_INTERVAL } from '../constants.js';

export class Game {
  constructor() {
    this.app = null;
    this.player = null;
    this.otherPlayers = new Map();
    this.wallManager = null;
    this.bulletManager = null;
    this.flag = null;
    this.worldContainer = null;
    this.gameScale = 1;
    this.logicalWidth = WIDTH;
    this.logicalHeight = HEIGHT;
    this.networkManager = null;
    
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
    
    // Initialize network manager
    this.networkManager = new NetworkManager(this);
    this.networkManager.connect();
    
    // Initialize bullet manager
    this.bulletManager = new BulletManager(this.app, this.wallManager, this.worldContainer);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start game loop
    this.setupGameLoop();
  }
  
  setupEventListeners() {
    // Mouse movement for turret rotation - adjust for scale
    this.app.stage.on("pointermove", (event) => {
      if (this.player) {
        const mousePosition = event.data.global;
        // Convert screen coordinates to world coordinates
        const worldX = (mousePosition.x - this.app.stage.position.x) / this.gameScale - this.worldContainer.x;
        const worldY = (mousePosition.y - this.app.stage.position.y) / this.gameScale - this.worldContainer.y;
        
        // Update player's turret rotation
        this.player.updateTurretRotation(worldX, worldY);
      }
    });
    
    // Mouse click for shooting
    this.app.stage.on("pointerdown", () => {
      if (this.player && !this.player.isDead) {
        // Get the current rotation of the player's turret
        const rotation = this.player.rotation;
        this.networkManager.sendShoot(rotation);
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
      if (!this.player.isDead) {
        // Calculate angle to player
        const dx = this.player.x - this.player.x;
        const dy = this.player.y - this.player.y;
        const rotation = Math.atan2(dy, dx);
        
        // Update AI turret rotation
        this.player.turret.rotation = rotation;
        
        // Fire bullet
        const turretPos = this.player.getTurretPosition();
        this.bulletManager.createBullet(turretPos.x, turretPos.y, rotation, this.player);
      }
    }, PLAYER2_SHOOT_INTERVAL);
  }
  
  setupGameLoop() {
    this.app.ticker.add(() => {
      if (this.player) {
        // Update player position with interpolation
        const alpha = 0.1; // Interpolation factor
        this.player.x += (this.player.targetX - this.player.x) * alpha;
        this.player.y += (this.player.targetY - this.player.y) * alpha;
        
        // Send input to server
        this.networkManager.sendInput({
          left: this.keys.ArrowLeft || this.keys.a,
          right: this.keys.ArrowRight || this.keys.d,
          up: this.keys.ArrowUp || this.keys.w,
          down: this.keys.ArrowDown || this.keys.s,
          rotation: this.player.rotation // Send current rotation
        });
        
        // Update world container position to keep player centered
        const screenCenterX = this.app.screen.width / 2;
        const screenCenterY = this.app.screen.height / 2;
        
        // Calculate the world container position that will center the player
        this.worldContainer.x = screenCenterX - (this.player.x * this.gameScale) - this.app.stage.position.x;
        this.worldContainer.y = screenCenterY - (this.player.y * this.gameScale) - this.app.stage.position.y;
      }
      
      // Update other players' positions with interpolation
      this.updateOtherPlayers();
    });
  }
  
  updateOtherPlayers() {
    this.otherPlayers.forEach((otherPlayer, id) => {
      if (otherPlayer.targetX !== undefined) {
        // Interpolate position only
        const alpha = 0.1; // Interpolation factor
        otherPlayer.x += (otherPlayer.targetX - otherPlayer.x) * alpha;
        otherPlayer.y += (otherPlayer.targetY - otherPlayer.y) * alpha;
      }
    });
  }
  
  updateOtherPlayer(serverPlayer) {
    let otherPlayer = this.otherPlayers.get(serverPlayer.id);
    
    if (!otherPlayer) {
      // Create new player if it doesn't exist
      otherPlayer = new Player(this.app, this.wallManager, true, serverPlayer.x, serverPlayer.y, this.worldContainer);
      this.otherPlayers.set(serverPlayer.id, otherPlayer);
    }
    
    // Update target position for interpolation
    otherPlayer.targetX = serverPlayer.x;
    otherPlayer.targetY = serverPlayer.y;
    
    // Update rotation instantly without interpolation
    if (serverPlayer.rotation !== undefined) {
      otherPlayer.rotation = serverPlayer.rotation;
    }
    
    otherPlayer.health = serverPlayer.health;
    otherPlayer.isDead = serverPlayer.isDead;
  }
  
  updateBullets(serverBullets) {
    // Update each bullet from the server
    serverBullets.forEach(serverBullet => {
      this.bulletManager.updateBullet(serverBullet);
    });
  }
  
  removePlayer(playerId) {
    const otherPlayer = this.otherPlayers.get(playerId);
    if (otherPlayer) {
      otherPlayer.destroy();
      this.otherPlayers.delete(playerId);
    }
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
    this.app.destroy();
  }
}