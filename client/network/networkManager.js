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
    this.inputSequenceNumber = 0;
    this.serverUpdateRate = 1000 / 60; // 60Hz server update rate
  }

  connect() {
    this.socket = io({
      query: {
        playerName: this.game.playerName
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
    // Create walls if they are provided in initial state
    if (data.walls) {
      this.game.wallManager.createWallsFromData(data.walls);
    }
    
    // Update other players
    data.players.forEach(playerData => {
      if (playerData.id !== this.socket.id) {
        // Create state object with timestamp
        const newState = {
          ...playerData,
          timestamp: data.timestamp
        };
        
        const otherPlayer = this.game.otherPlayers.get(playerData.id);
        if (!otherPlayer) {
          // Create new player if it doesn't exist
          const newPlayer = new Player(
            this.game.app,
            this.game.wallManager,
            true,
            playerData.x,
            playerData.y,
            this.game.worldContainer,
            playerData.color
          );
          newPlayer.previousState = newState;
          newPlayer.targetState = null;
          this.game.otherPlayers.set(playerData.id, newPlayer);
        } else {
          // Update existing player's state buffer
          if (!otherPlayer.previousState) {
            otherPlayer.previousState = newState;
          } else if (!otherPlayer.targetState) {
            otherPlayer.targetState = newState;
          } else {
            // Shift states forward
            otherPlayer.previousState = otherPlayer.targetState;
            otherPlayer.targetState = newState;
          }
          
          // Update non-interpolated properties
          otherPlayer.health = playerData.health;
          otherPlayer.isDead = playerData.isDead;
          otherPlayer.color = playerData.color;
          otherPlayer.isShooting = playerData.isShooting;
          
          if (playerData.isDead && !otherPlayer.wasDeadLastUpdate) {
            otherPlayer.die();
          }
          otherPlayer.wasDeadLastUpdate = playerData.isDead;
        }
      } else {
        // Update our own player's state
        if (this.game.player) {
          // Handle authoritative health updates
          if (this.game.player.health !== playerData.health) {
            this.game.player.health = playerData.health;
            if (this.game.player.healthBar) {
              requestAnimationFrame(() => {
                this.game.player.healthBar.update(playerData.health);
              });
            }
          }

          // Server reconciliation
          this.reconcileState(playerData);
          
          // Update other authoritative states
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
        // Set player name immediately
        this.game.player.setName(this.game.playerName);
      } else {
        // Update existing player's spawn position
        this.game.player.updateSpawnPosition(data.spawnPosition.x, data.spawnPosition.y);
      }
    }
  }

  reconcileState(serverState) {
    // Save the last known good state from server
    const serverX = serverState.x;
    const serverY = serverState.y;
    
    // Remove old inputs that have been processed by the server
    if (serverState.lastProcessedInput !== undefined) {
      this.pendingInputs = this.pendingInputs.filter(input => 
        input.sequenceNumber > serverState.lastProcessedInput
      );
    }

    // Reset position to server state
    this.game.player.x = serverX;
    this.game.player.y = serverY;
    this.game.player.velocityX = serverState.velocityX;
    this.game.player.velocityY = serverState.velocityY;

    // Reapply all pending inputs
    this.pendingInputs.forEach(input => {
      this.game.applyInput(input);
    });
  }

  handlePlayerDisconnected(playerId) {
    this.game.removePlayer(playerId);
  }

  sendInput(input) {
    if (this.isConnected) {
      this.socket.emit('playerInput', {
        ...input,
        sequenceNumber: input.sequenceNumber
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
} 