import { Player } from './player.js';
import { WallManager } from './wall.js';
import { Flag } from './flag.js';
import { BulletManager } from './bullet.js';
import { WIDTH, HEIGHT, BACKGROUND_COLOR } from '../constants.js';

export class Game {
  constructor() {
    this.app = null;
    this.player = null;
    this.wallManager = null;
    this.bulletManager = null;
    this.flag = null;
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
    
    // Initialize game objects
    this.wallManager = new WallManager(this.app);
    this.wallManager.createDefaultWalls();
    
    this.bulletManager = new BulletManager(this.app, this.wallManager);
    
    this.player = new Player(this.app, this.wallManager);
    
    
    this.flag = new Flag(this.app);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start game loop
    this.setupGameLoop();
  }
  
  setupEventListeners() {
    // Mouse movement for turret rotation
    this.app.stage.on("pointermove", (event) => {
      const mousePosition = event.data.global;
      this.player.updateTurretRotation(mousePosition.x, mousePosition.y);
    });
    
    // Mouse click for shooting
    this.app.stage.on("pointerdown", () => {
      const turretPos = this.player.getTurretPosition();
      this.bulletManager.createBullet(turretPos.x, turretPos.y, turretPos.rotation);
    });
    
    // Keyboard controls
    window.addEventListener("keydown", (event) => {
      if (this.arrowMap.hasOwnProperty(event.key)) {
        const mappedKey = this.arrowMap[event.key];
        this.keys[mappedKey] = true;
        
        // Handle flag pickup/drop
        if (mappedKey === "F") {
          if (!this.flag.isCarried && this.flag.isNearPlayer(this.player)) {
            // Pickup flag
            this.flag.pickup(this.player);
          } else if (this.flag.isCarried) {
            // Drop flag
            this.flag.drop(this.player);
          }
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
    this.app.ticker.add(() => {
      // Update player position
      this.player.update(this.keys);
      
      // Update flag position if it's being carried
      this.flag.update(this.player);
    });
  }
}