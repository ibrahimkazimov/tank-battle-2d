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
  
  async init() {
    // Initialize PIXI application
    this.app = new PIXI.Application();
    await this.app.init({
      width: WIDTH,
      height: HEIGHT,
      eventMode: "static",
      background: BACKGROUND_COLOR,
    });
    
    // Make stage interactive and ensure it covers the full canvas
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
    
    document.body.appendChild(this.app.canvas);
    
    // Create world container for all game objects
    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);
    
    // Initialize game objects
    this.wallManager = new WallManager(this.app, this.worldContainer);
    this.wallManager.createDefaultWalls();
    
    // Create players at opposite corners
    this.player = new Player(this.app, this.wallManager, false, -WIDTH/2 + 100, -HEIGHT/2 + 100);
    this.player2 = new Player(this.app, this.wallManager, true, WIDTH/2 - 100, HEIGHT/2 - 100, this.worldContainer);
    
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
    // Mouse movement for turret rotation
    this.app.stage.on("pointermove", (event) => {
      const mousePosition = event.data.global;
      this.player.updateTurretRotation(mousePosition.x, mousePosition.y);
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
      
      // Update world container position (opposite of player movement)
      this.worldContainer.x = -this.player.x;
      this.worldContainer.y = -this.player.y;
    });
  }
  
  destroy() {
    this.player.destroy();
    this.player2.destroy();
    this.app.destroy();
  }
}