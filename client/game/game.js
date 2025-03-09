import { Player } from './player.js';
import { WallManager } from './wall.js';
import { Flag } from './flag.js';
import { BulletManager } from './bullet.js';
import { NetworkManager } from '../network/networkManager.js';
import { WIDTH, HEIGHT, BACKGROUND_COLOR, PLAYER2_SHOOT_INTERVAL, VIEW_DISTANCE, MIN_ZOOM, MAX_ZOOM } from '../constants.js';

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
    
    // Add fire rate tracking
    this.lastShotTime = 0;
    this.canShoot = true;
    
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
    
    // Add camera control flag
    this.isCameraAnimating = false;
  }
  
  calculateScale() {
    // Get the window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate base scale based on the smaller ratio to maintain aspect ratio
    const scaleX = windowWidth / this.logicalWidth;
    const scaleY = windowHeight / this.logicalHeight;
    let baseScale = Math.min(scaleX, scaleY);
    
    // Calculate the view scale based on VIEW_DISTANCE
    // Reduced multiplier from 1.5 to 1.2 to show more of the map
    const viewScale = (VIEW_DISTANCE * 2 * 1.2) / Math.min(windowWidth, windowHeight);
    
    // Combine scales and clamp between MIN_ZOOM and MAX_ZOOM
    this.gameScale = Math.min(Math.max(baseScale / viewScale, MIN_ZOOM), MAX_ZOOM);
    
    // Update the renderer size
    this.app.renderer.resize(windowWidth, windowHeight);
    
    // Center the game stage
    const scaledWidth = this.logicalWidth * this.gameScale;
    const scaledHeight = this.logicalHeight * this.gameScale;
    this.app.stage.scale.set(this.gameScale);
    this.app.stage.position.x = (windowWidth - scaledWidth) / 2;
    this.app.stage.position.y = (windowHeight - scaledHeight) / 2;
    
    // Update the view mask if it exists
    this.updateViewMask();
  }
  
  updateViewMask() {
    // Remove existing mask if any
    if (this.viewMask) {
      this.worldContainer.mask = null;
      this.viewMask.destroy();
    }
    
    // Create circular mask for view distance
    this.viewMask = new PIXI.Graphics();
    this.viewMask.context.fillStyle = '#000000';
    this.viewMask.context.circle(0, 0, VIEW_DISTANCE);
    this.viewMask.context.fill();
    
    // Position mask at player
    if (this.player) {
      this.viewMask.x = this.player.x;
      this.viewMask.y = this.player.y;
    }
    
    // Add mask to world container
    this.worldContainer.addChild(this.viewMask);
    this.worldContainer.mask = this.viewMask;
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
    
    // Initialize network manager
    this.networkManager = new NetworkManager(this);
    this.networkManager.connect();
    
    // Initialize bullet manager
    this.bulletManager = new BulletManager(this.app, this.wallManager, this.worldContainer);
    
    // Create view mask
    this.updateViewMask();
    
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
        const now = Date.now();
        // Check if enough time has passed since last shot
        if (now - this.lastShotTime < 250) { // Match server's FIRE_RATE
          return; // Too soon to shoot again
        }
        
        this.lastShotTime = now;
        // Get the current rotation of the player's turret
        const rotation = this.player.rotation;
        // Start recoil animation
        this.player.turret.startRecoil();
        // Send shoot event to server
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
          rotation: this.player.rotation
        });
        
        // Only update camera position if not animating
        if (!this.isCameraAnimating) {
          // Update world container position to keep player centered
          const screenCenterX = this.app.screen.width / 2;
          const screenCenterY = this.app.screen.height / 2;
          
          // Calculate the world container position that will center the player
          this.worldContainer.x = screenCenterX - (this.player.x * this.gameScale) - this.app.stage.position.x;
          this.worldContainer.y = screenCenterY - (this.player.y * this.gameScale) - this.app.stage.position.y;
        }
        
        // Update view mask position
        if (this.viewMask) {
          this.viewMask.x = this.player.x;
          this.viewMask.y = this.player.y;
        }
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
      otherPlayer = new Player(
        this.app,
        this.wallManager,
        true,
        serverPlayer.x,
        serverPlayer.y,
        this.worldContainer,
        serverPlayer.color
      );
      this.otherPlayers.set(serverPlayer.id, otherPlayer);
    }
    
    // Update player name
    otherPlayer.setName(serverPlayer.name);
    
    // Update target position for interpolation
    otherPlayer.targetX = serverPlayer.x;
    otherPlayer.targetY = serverPlayer.y;
    
    // Update rotation instantly without interpolation
    if (serverPlayer.rotation !== undefined) {
      otherPlayer.rotation = serverPlayer.rotation;
    }
    
    // Handle shooting state if provided
    if (serverPlayer.isShooting && !otherPlayer.turret.isRecoiling) {
      otherPlayer.turret.startRecoil();
    }
    
    // Update health and handle death/respawn state changes
    otherPlayer.health = serverPlayer.health;
    if (serverPlayer.isDead !== otherPlayer.isDead) {
      otherPlayer.isDead = serverPlayer.isDead;
      if (serverPlayer.isDead) {
        otherPlayer.die();
      } else {
        // Handle respawn
        otherPlayer.graphics.visible = true;
        if (otherPlayer.turret && otherPlayer.turret.graphics) {
          otherPlayer.turret.graphics.visible = true;
        }
        otherPlayer.x = serverPlayer.x;
        otherPlayer.y = serverPlayer.y;
        otherPlayer.clearExplosionParticles();
      }
    }
    
    otherPlayer.color = serverPlayer.color;
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
      this.isCameraAnimating = false;
    }

    // Calculate current and target world positions
    const screenCenterX = this.app.screen.width / 2;
    const screenCenterY = this.app.screen.height / 2;
    
    // Store start position (current world container position)
    this.cameraStartX = this.worldContainer.x;
    this.cameraStartY = this.worldContainer.y;
    
    // Calculate final target position
    this.cameraTargetX = screenCenterX - (targetX * this.gameScale) - this.app.stage.position.x;
    this.cameraTargetY = screenCenterY - (targetY * this.gameScale) - this.app.stage.position.y;
    
    this.cameraAnimationStartTime = Date.now();
    this.isCameraAnimating = true;

    // Create smooth easing function
    const easeOutCubic = (t) => {
      return 1 - Math.pow(1 - t, 3);
    };

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
        this.isCameraAnimating = false;
      }
    };

    // Add animation to ticker
    this.app.ticker.add(this.cameraAnimation);
  }
  
  destroy() {
    this.player.destroy();
    this.app.destroy();
  }
  
  // Add method to find safe spawn position
  findSafeSpawnPosition() {
    return this.wallManager.findSafeSpawnPosition(PLAYER_RADIUS);
  }
}