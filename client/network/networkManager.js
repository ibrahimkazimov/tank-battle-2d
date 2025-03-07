import { Player } from '../game/player.js';

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.isConnected = false;
    this.serverUrl = 'http://localhost:3000';
    this.interpolationDelay = 100; // ms
    this.lastProcessedTimestamp = 0;
    this.pendingInputs = [];
  }

  connect() {
    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      cors: {
        origin: "*"
      }
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('gameState', (gameState) => {
      this.handleGameState(gameState);
    });

    this.socket.on('playerDisconnected', (playerId) => {
      this.handlePlayerDisconnected(playerId);
    });
  }

  handleGameState(data) {
    // Update other players
    data.players.forEach(playerData => {
      if (playerData.id !== this.socket.id) {
        this.game.updateOtherPlayer(playerData);
      } else {
        // Update our own player's position
        if (this.game.player) {
          this.game.player.targetX = playerData.x;
          this.game.player.targetY = playerData.y;
          this.game.player.targetRotation = playerData.rotation;
          this.game.player.health = playerData.health;
          this.game.player.color = playerData.color;
          
          // Handle death state change
          if (playerData.isDead !== this.game.player.isDead) {
            this.game.player.isDead = playerData.isDead;
            if (playerData.isDead) {
              this.game.player.die();
            }
          }
        }
      }
    });

    // Update bullets with interpolation
    if (data.bullets) {
      data.bullets.forEach(bulletData => {
        // Calculate interpolation delay
        const delay = Date.now() - bulletData.timestamp;
        const alpha = Math.min(delay / this.interpolationDelay, 1);
        
        // Update bullet position with interpolation
        this.game.bulletManager.updateBullet({
          ...bulletData,
          alpha
        });
      });
    }

    // Set player spawn position if provided
    if (data.spawnPosition) {
      if (!this.game.player) {
        // Get the player data for this client
        const playerData = data.players.find(p => p.id === this.socket.id);
        // Create player at spawn position with server-assigned color
        this.game.player = new Player(
          this.game.app,
          this.game.wallManager,
          false,
          data.spawnPosition.x,
          data.spawnPosition.y,
          this.game.worldContainer,
          playerData.color
        );
      } else {
        // Update existing player position
        this.game.player.x = data.spawnPosition.x;
        this.game.player.y = data.spawnPosition.y;
        this.game.player.targetX = data.spawnPosition.x;
        this.game.player.targetY = data.spawnPosition.y;
      }
    }
  }

  handlePlayerDisconnected(playerId) {
    this.game.removePlayer(playerId);
  }

  sendInput(input) {
    if (this.isConnected) {
      this.socket.emit('playerInput', {
        ...input,
        rotation: this.game.player ? this.game.player.rotation : 0
      });
    }
  }

  sendShoot(rotation) {
    if (this.isConnected) {
      // Send both rotation and current player position
      this.socket.emit('shoot', {
        rotation,
        x: this.game.player.x,
        y: this.game.player.y,
        velocityX: this.game.player.velocityX,
        velocityY: this.game.player.velocityY
      });
    }
  }

  sendRespawn() {
    if (this.socket && this.isConnected) {
      this.socket.emit('respawn');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
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
    
    // Update target position for interpolation
    otherPlayer.targetX = serverPlayer.x;
    otherPlayer.targetY = serverPlayer.y;
    otherPlayer.targetRotation = serverPlayer.rotation;
    otherPlayer.health = serverPlayer.health;
    otherPlayer.isDead = serverPlayer.isDead;
    otherPlayer.color = serverPlayer.color;
  }
} 