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

    this.socket.on('playerRespawned', (respawnData) => {
      this.handlePlayerRespawn(respawnData);
    });

    this.socket.on('playerDied', (deathData) => {
      this.handlePlayerDeath(deathData);
    });
  }

  handlePlayerDeath(deathData) {
    const otherPlayer = this.game.otherPlayers.get(deathData.playerId);
    if (otherPlayer) {
      otherPlayer.isDead = true;
      otherPlayer.isVisible = false;
      otherPlayer.x = deathData.x;
      otherPlayer.y = deathData.y;

      // TODO: add a message like "Player X was killed by Player Y"
      console.log(`Player ${otherPlayer.name} was killed by Player ${deathData.killerName}`);
      
      // Immediately hide graphics
      if (otherPlayer.graphics) {
        otherPlayer.graphics.visible = false;
      }
      if (otherPlayer.turret && otherPlayer.turret.graphics) {
        otherPlayer.turret.graphics.visible = false;
      }
      
      // Create death effect
      otherPlayer.createExplosion();
    }
  }

  handlePlayerRespawn(respawnData) {
    if (respawnData.playerId === this.socket.id) {
      // This is our player respawning
      if (this.game.player) {
        this.game.player.x = respawnData.x;
        this.game.player.y = respawnData.y;
        this.game.player.health = respawnData.health;
        this.game.player.isDead = false;
        this.game.player.isVisible = true;
        
        // Make graphics visible
        if (this.game.player.graphics) {
          this.game.player.graphics.visible = true;
        }
        if (this.game.player.turret && this.game.player.turret.graphics) {
          this.game.player.turret.graphics.visible = true;
        }
        
        // Clear any death effects
        this.game.player.clearExplosionParticles();
        
        // Animate camera to new position
        this.game.animateCameraToPosition(respawnData.x, respawnData.y);
      }
    } else {
      // Other player respawning
      const otherPlayer = this.game.otherPlayers.get(respawnData.playerId);
      if (otherPlayer) {
        otherPlayer.x = respawnData.x;
        otherPlayer.y = respawnData.y;
        otherPlayer.health = respawnData.health;
        otherPlayer.isDead = false;
        otherPlayer.isVisible = respawnData.isVisible;
        
        // Make graphics visible
        if (otherPlayer.graphics) {
          otherPlayer.graphics.visible = respawnData.isVisible;
        }
        if (otherPlayer.turret && otherPlayer.turret.graphics) {
          otherPlayer.turret.graphics.visible = respawnData.isVisible;
        }
        
        // Clear any death effects
        otherPlayer.clearExplosionParticles();
      }
    }
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
            {
              wallManager: this.game.wallManager,
              worldContainer: this.game.worldContainer,
              color: playerData.color,
              isMainPlayer: false,
              spawnX: playerData.x,
              spawnY: playerData.y,
              fireRate: playerData.fireRate,
              health: playerData.health,
              maxSpeed: playerData.maxSpeed,
              radius: playerData.radius,
              respawnTime: playerData.respawnTime,
              bulletRadius: playerData.bulletRadius,
              bulletSpeed: playerData.bulletSpeed,
              bulletDamage: playerData.bulletDamage,
              bulletPower: playerData.bulletPower,
              kills: playerData.kills,
              deaths: playerData.deaths
            }
          );
          newPlayer.previousState = newState;
          newPlayer.targetState = null;
          newPlayer.isVisible = playerData.isVisible;
          // Set name immediately after creation
          newPlayer.setName(playerData.name);
          
          if (newPlayer.graphics) {
            newPlayer.graphics.visible = playerData.isVisible;
          }
          if (newPlayer.turret && newPlayer.turret.graphics) {
            newPlayer.turret.graphics.visible = playerData.isVisible;
          }
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
          otherPlayer.kills = playerData.kills;
          otherPlayer.deaths = playerData.deaths;
          
          // Handle shooting state
          if (playerData.isShooting && !otherPlayer.isShooting) {
            otherPlayer.isShooting = true;
            otherPlayer.turret.startRecoil();
          }
          otherPlayer.isShooting = playerData.isShooting;
          
          otherPlayer.isVisible = playerData.isVisible;
          
          // Update visibility
          if (otherPlayer.graphics) {
            otherPlayer.graphics.visible = playerData.isVisible;
          }
          if (otherPlayer.turret && otherPlayer.turret.graphics) {
            otherPlayer.turret.graphics.visible = playerData.isVisible;
          }
          
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
          this.game.player.kills = playerData.kills;
          this.game.player.deaths = playerData.deaths;
          
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
          {
            wallManager: this.game.wallManager,
            worldContainer: this.game.worldContainer,
            color: playerData.color,
            isMainPlayer: true,
            spawnX: data.spawnPosition.x,
            spawnY: data.spawnPosition.y,
            fireRate: playerData.fireRate,
            health: playerData.health,
            maxSpeed: playerData.maxSpeed,
            radius: playerData.radius,
            respawnTime: playerData.respawnTime,
            bulletRadius: playerData.bulletRadius,
            bulletSpeed: playerData.bulletSpeed,
            bulletDamage: playerData.bulletDamage,
            bulletPower: playerData.bulletPower,
            kills: playerData.kills,
            deaths: playerData.deaths
          }
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
        velocityY: this.game.player.velocityY,
        isShooting: true
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