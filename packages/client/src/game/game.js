import { Renderer } from './renderer.js';
import { InputManager } from './input.js';
import { NetworkManager } from './network.js';
import { Physics } from '@tank-battle/shared';
import { MAP_CONFIG } from '@tank-battle/shared/src/map.js';

export class Game {
  constructor(container, playerName) {
    this.playerName = playerName;
    this.renderer = new Renderer(container);
    this.input = new InputManager();
    this.network = new NetworkManager(this);
    
    this.gameState = null;
    this.lastTime = 0;
    
    this.init();
  }

  async init() {
    await this.renderer.init();
    this.network.connect(this.playerName);
    
    // Start loop
    this.renderer.app.ticker.add(this.update.bind(this));
    
    // Mouse listener for shooting
    this.renderer.app.stage.eventMode = 'static';
    this.renderer.app.stage.hitArea = this.renderer.app.screen;
    this.renderer.app.stage.on('pointerdown', () => {
        if (this.localPlayer && !this.localPlayer.isDead) {
             const mousePos = this.renderer.app.renderer.events.pointer.global;
             const worldPos = this.renderer.screenToWorld(mousePos.x, mousePos.y);
             const rotation = Math.atan2(worldPos.y - this.localPlayer.y, worldPos.x - this.localPlayer.x);
             this.network.sendShoot(rotation);
        } else if (this.localPlayer && this.localPlayer.isDead) {
            this.network.sendRespawn();
        }
    });

    console.log('Game initialized');
  }

  onGameState(state) {
    this.gameState = state;
  }

  get localPlayer() {
      if (!this.gameState || !this.network.socket) return null;
      return this.gameState.players.find(p => p.id === this.network.socket.id);
  }

  update(time) {
     if (!this.gameState) return;
     
     // 1. Process Input
     const inputState = this.input.getState();
     
     // Calculate rotation based on mouse
     let rotation = 0;
     if (this.localPlayer) {
         const mousePos = this.renderer.app.renderer.events.pointer.global;
         const worldPos = this.renderer.screenToWorld(mousePos.x, mousePos.y);
         rotation = Math.atan2(worldPos.y - this.localPlayer.y, worldPos.x - this.localPlayer.x);
     }

     const dt = time.deltaTime; // PIXI deltaTime is 1 for 60fps
     
     // Prepare input payload
     const inputPayload = {
         ...inputState,
         rotation,
         deltaTime: dt
     };

     // Send to server
     this.network.sendInput(inputPayload);

     // Client-side prediction could go here
     // if (this.localPlayer) {
     //    Physics.updatePlayer(this.localPlayer, inputPayload, MAP_CONFIG.WALLS);
     // }
     
     // 2. Render
     this.renderer.render(this.gameState, this.network.socket?.id);
  }
}
