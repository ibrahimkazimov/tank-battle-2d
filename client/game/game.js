import { WallManager } from './wall.js';
import { BulletManager } from './bullet.js';
import { NetworkManager } from '../network/networkManager.js';
import { WIDTH, HEIGHT, BACKGROUND_COLOR, VIEW_DISTANCE, MIN_ZOOM, MAX_ZOOM } from '../constants.js';

export class Game {
  constructor() {
    this.app = null;
    this.player = null;
    this.otherPlayers = new Map();
    this.wallManager = null;
    this.bulletManager = null;
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
      F: false,
      E: false  // Add E key tracking
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
      e: "E",  // Add E key mapping
      E: "E"
    };
    
    // Add camera control flag
    this.isCameraAnimating = false;
    
    // Add auto-fire state
    this.isAutoFiring = false;
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
    this.bulletManager = new BulletManager(this.app, {wallManager: this.wallManager, worldContainer: this.worldContainer });
    
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
        if (now - this.lastShotTime < this.player.fireRate) { // Match server's FIRE_RATE
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

        // Toggle auto-fire when E is pressed
        if (mappedKey === "E" && !event.repeat) {  // !event.repeat prevents toggle on key hold
          this.isAutoFiring = !this.isAutoFiring;
          console.log("Auto-fire:", this.isAutoFiring ? "Enabled" : "Disabled");
        }
      }
    });
    
    window.addEventListener("keyup", (event) => {
      if (this.arrowMap.hasOwnProperty(event.key)) {
        this.keys[this.arrowMap[event.key]] = false;
      }
    });
  }
  
  setupGameLoop() {
    this.app.ticker.add((t) => {
      if (this.player && !this.player.isDead) {
        const deltaTime = t.deltaTime;

        // Handle auto-firing
        if (this.isAutoFiring && this.player && !this.player.isDead) {
          const now = Date.now();
          // Check if enough time has passed since last shot
          if (now - this.lastShotTime >= this.player.fireRate) { // Match server's FIRE_RATE
            this.lastShotTime = now;
            // Get the current rotation of the player's turret
            const rotation = this.player.rotation;
            // Send shoot event to server
            this.networkManager.sendShoot(rotation);
            // Start recoil animation
            this.player.turret.startRecoil();
          }
        }

        // Store current input state
        const currentInput = {
          left: this.keys.ArrowLeft || this.keys.a,
          right: this.keys.ArrowRight || this.keys.d,
          up: this.keys.ArrowUp || this.keys.w,
          down: this.keys.ArrowDown || this.keys.s,
          rotation: this.player.rotation,
          deltaTime: deltaTime,
          sequenceNumber: this.networkManager.inputSequenceNumber++
        };

        // Apply prediction locally
        this.applyInput(currentInput);

        // Send input to server
        this.networkManager.sendInput(currentInput);

        // Store input for reconciliation
        this.networkManager.pendingInputs.push(currentInput);

        // Update camera position logic remains the same
        if (!this.isCameraAnimating) {
          const screenCenterX = this.app.screen.width / 2;
          const screenCenterY = this.app.screen.height / 2;
          this.worldContainer.x = screenCenterX - (this.player.x * this.gameScale) - this.app.stage.position.x;
          this.worldContainer.y = screenCenterY - (this.player.y * this.gameScale) - this.app.stage.position.y;
        }

        // Update view mask position
        if (this.viewMask) {
          this.viewMask.x = this.player.x;
          this.viewMask.y = this.player.y;
        }
      }

      // Update other players' positions
      this.updateOtherPlayers();
    });
  }
  
  applyInput(input) {
    // Calculate acceleration based on input
    let ax = 0;
    let ay = 0;
    
    if (input.left) ax -= this.player.acceleration;
    if (input.right) ax += this.player.acceleration;
    if (input.up) ay -= this.player.acceleration;
    if (input.down) ay += this.player.acceleration;
    
    // Apply acceleration to velocity
    this.player.velocityX += ax * input.deltaTime;
    this.player.velocityY += ay * input.deltaTime;
    
    // Apply friction
    const frictionFactor = Math.pow(this.player.friction, input.deltaTime);
    this.player.velocityX *= frictionFactor;
    this.player.velocityY *= frictionFactor;

    // Limit speed
    const speed = Math.sqrt(this.player.velocityX ** 2 + this.player.velocityY ** 2);
    if (speed > this.player.maxSpeed) {
        const scale = this.player.maxSpeed / speed;
        this.player.velocityX *= scale;
        this.player.velocityY *= scale;
    }

    // Update position
    this.player.x += this.player.velocityX * input.deltaTime;
    this.player.y += this.player.velocityY * input.deltaTime;
  }
  
  updateOtherPlayers() {
    const now = Date.now();
    
    this.otherPlayers.forEach((otherPlayer, id) => {
      if (otherPlayer.previousState && otherPlayer.targetState) {
        // Calculate interpolation alpha based on timestamps
        const timeElapsed = now - otherPlayer.previousState.timestamp;
        const timeBetweenStates = otherPlayer.targetState.timestamp - otherPlayer.previousState.timestamp;
        let alpha = timeElapsed / timeBetweenStates;
        
        // Clamp alpha between 0 and 1
        alpha = Math.max(0, Math.min(1, alpha));
        
        // Interpolate position
        otherPlayer.x = otherPlayer.previousState.x + (otherPlayer.targetState.x - otherPlayer.previousState.x) * alpha;
        otherPlayer.y = otherPlayer.previousState.y + (otherPlayer.targetState.y - otherPlayer.previousState.y) * alpha;
        
        // Interpolate rotation
        const shortestAngle = ((((otherPlayer.targetState.rotation - otherPlayer.previousState.rotation) % (2 * Math.PI)) + (3 * Math.PI)) % (2 * Math.PI)) - Math.PI;
        otherPlayer.rotation = otherPlayer.previousState.rotation + shortestAngle * alpha;
        
        // Update turret rotation
        if (otherPlayer.turret) {
          otherPlayer.turret.graphics.rotation = otherPlayer.rotation;
        }
        
        // If we've reached or passed the target state, make it the previous state
        if (alpha >= 1) {
          otherPlayer.previousState = otherPlayer.targetState;
          otherPlayer.targetState = null;
        }
      }
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
}