import {
  GAME_CONFIG,
  PLAYER_CONFIG,
  BODY_CONFIG,
  TURRET_CONFIG,
  EVENTS,
  Physics,
  COLORS,
  BULLET_CONFIG,
  WORLD_BOUNDS,
} from "@tank-battle/shared";
import { MAP_CONFIG } from "@tank-battle/shared/src/map.js";

export class GameManager {
  constructor(io, sessionId) {
    this.io = io;
    this.sessionId = sessionId;
    this.players = new Map();
    this.bullets = [];
    this.walls = MAP_CONFIG.WALLS;
    this.colorIndex = 0;
    this.loopInterval = null;

    // Start game loop
    this.startGameLoop();
  }

  stopGameLoop() {
    if (this.loopInterval) clearInterval(this.loopInterval);
  }

  handleConnection(socket) {
    // Join the session room
    socket.join(this.sessionId);

    const playerName = socket.handshake.query.playerName || "Anonymous";
    console.log(
      `[${this.sessionId}] Player connected:`,
      socket.id,
      "Name:",
      playerName,
    );

    // Assign color
    const colors = Object.values(COLORS).filter(
      (c) =>
        typeof c === "string" &&
        c.startsWith("#") &&
        c !== COLORS.TURRET &&
        c !== COLORS.BACKGROUND &&
        c !== COLORS.WALL &&
        c !== COLORS.STROKE,
    );
    // Or just use the player specific ones if I assume they are named PLAYER...
    const playerColors = [
      COLORS.PLAYER1,
      COLORS.PLAYER2,
      COLORS.PLAYER3,
      COLORS.PLAYER4,
    ];
    const playerColor = playerColors[this.colorIndex % playerColors.length];
    this.colorIndex++;

    const spawnPos = this.findSafeSpawnPosition();

    // Initialize player
    const player = {
      id: socket.id,
      name: playerName,
      x: spawnPos.x,
      y: spawnPos.y,
      health: PLAYER_CONFIG.MAX_HEALTH,
      velocityX: 0,
      velocityY: 0,
      acceleration: PLAYER_CONFIG.ACCELERATION,
      friction: PLAYER_CONFIG.FRICTION,
      maxSpeed: PLAYER_CONFIG.MAX_SPEED,
      fireRate: PLAYER_CONFIG.FIRE_RATE,
      isDead: false,
      isShooting: false,
      lastShotTime: 0,
      lastProcessedInput: null,
      isVisible: true,
      kills: 0,
      deaths: 0,
      knockbackX: 0,
      knockbackY: 0,
      knockbackTimer: 0,
      // Component-based structure
      body: {
        radius: BODY_CONFIG.RADIUS,
        color: playerColor,
      },
      turret: {
        length: TURRET_CONFIG.LENGTH,
        width: TURRET_CONFIG.WIDTH,
        rotation: 0,
        color: COLORS.TURRET,
      },
    };

    this.players.set(socket.id, player);

    // Send initial state
    socket.emit(EVENTS.GAME_STATE, {
      players: Array.from(this.players.values()),
      bullets: this.bullets,
      walls: this.walls,
      spawnPosition: spawnPos,
    });

    // Handle events
    socket.on(EVENTS.PLAYER_INPUT, (input) => this.handleInput(socket, input));
    socket.on(EVENTS.SHOOT, (data) => this.handleShoot(socket, data));
    socket.on(EVENTS.RESPAWN, () => this.handleRespawn(socket));
    socket.on("disconnect", () => this.handleDisconnect(socket));
  }

  handleInput(socket, input) {
    const player = this.players.get(socket.id);
    if (player && !player.isDead) {
      // Basic input validation/sanitization could go here
      const dt = Math.min(input.deltaTime, 100); // Cap delta time to prevent huge jumps

      const physicsInput = {
        left: input.left,
        right: input.right,
        up: input.up,
        down: input.down,
        deltaTime: dt,
      };

      Physics.updatePlayer(player, physicsInput, this.walls);
      player.lastProcessedInput = input.sequenceNumber;

      if (input.rotation !== undefined) {
        player.turret.rotation = input.rotation;
      }
    }
  }

  handleShoot(socket, data) {
    const player = this.players.get(socket.id);
    if (player && !player.isDead) {
      const now = Date.now();
      if (now - player.lastShotTime < PLAYER_CONFIG.FIRE_RATE) {
        return;
      }

      player.isShooting = true;
      player.lastShotTime = now;

      const turretLength = player.turret.length;
      const bulletX = player.x + Math.cos(data) * turretLength; // data is rotation
      const bulletY = player.y + Math.sin(data) * turretLength;

      // Check if spawn point is inside a wall (gun barrel clipping)
      // We check the line from player center to bullet spawn point
      const wallCollision = Physics.checkBulletCollisions(
        {
          x: bulletX,
          y: bulletY,
          prevX: player.x,
          prevY: player.y,
          destroying: false,
        },
        [],
        this.walls,
      );

      if (wallCollision) {
        // Play a "clink" sound or just don't shoot?
        // Ideally we spawn an explosion effect at the wall
        return;
      }

      const bullet = {
        id: Date.now() + Math.random(), // Ensure uniqueness
        x: bulletX,
        y: bulletY,
        prevX: player.x, // Start raycast from player center for first frame safety
        prevY: player.y,
        rotation: data,
        velocityX: Math.cos(data) * BULLET_CONFIG.SPEED,
        velocityY: Math.sin(data) * BULLET_CONFIG.SPEED,
        sourceId: socket.id,
        radius: BULLET_CONFIG.RADIUS,
        power: BULLET_CONFIG.POWER,
        health: BULLET_CONFIG.HEALTH,
        destroying: false,
        timestamp: Date.now(),
      };

      this.bullets.push(bullet);

      setTimeout(() => {
        if (player) player.isShooting = false;
      }, 100);
    }
  }

  handleRespawn(socket) {
    const player = this.players.get(socket.id);
    if (player && player.isDead) {
      const spawnPos = this.findSafeSpawnPosition();
      player.isDead = false;
      player.health = PLAYER_CONFIG.MAX_HEALTH;
      player.x = spawnPos.x;
      player.y = spawnPos.y;
      player.velocityX = 0;
      player.velocityY = 0;
      player.isVisible = true;

      this.io.to(this.sessionId).emit(EVENTS.PLAYER_RESPAWNED, {
        playerId: socket.id,
        x: spawnPos.x,
        y: spawnPos.y,
        health: PLAYER_CONFIG.MAX_HEALTH,
        isVisible: true,
      });
    }
  }

  handleDisconnect(socket) {
    console.log(`[${this.sessionId}] Player disconnected:`, socket.id);
    this.players.delete(socket.id);
    this.io.to(this.sessionId).emit(EVENTS.PLAYER_DISCONNECTED, socket.id);
  }

  findSafeSpawnPosition() {
    const maxAttempts = 100;
    const padding = BODY_CONFIG.RADIUS * 2;
    // Simple logic: pick random point within bounds that isn't inside a wall
    // Using a smaller safe area to avoid map edges
    const safeBounds = {
      left: -900,
      right: 900,
      top: -900,
      bottom: 900,
    };

    for (let i = 0; i < maxAttempts; i++) {
      const x =
        safeBounds.left + Math.random() * (safeBounds.right - safeBounds.left);
      const y =
        safeBounds.top + Math.random() * (safeBounds.bottom - safeBounds.top);

      let collides = false;
      // Check walls
      for (const wall of this.walls) {
        if (
          x + padding > wall.x &&
          x - padding < wall.x + wall.width &&
          y + padding > wall.y &&
          y - padding < wall.y + wall.height
        ) {
          collides = true;
          break;
        }
      }

      if (!collides) return { x, y };
    }
    return { x: 0, y: 0 };
  }

  startGameLoop() {
    const TICK_INTERVAL = 1000 / GAME_CONFIG.TICK_RATE;

    this.loopInterval = setInterval(() => {
      const currentTime = Date.now();

      // 1. Process physics/movement (already mostly handled by input, but could add server-side checks or momentum)
      // Knockback logic
      for (const [_, player] of this.players) {
        if (player.knockbackTimer > 0) {
          player.velocityX += player.knockbackX;
          player.velocityY += player.knockbackY;
          player.knockbackX *= 0.9;
          player.knockbackY *= 0.9;
          player.knockbackTimer -= TICK_INTERVAL;
        }
      }

      // 2. Update Bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const bullet = this.bullets[i];

        if (bullet.destroying) {
          if (
            Date.now() - bullet.destructionStartTime >
            BULLET_CONFIG.DESTRUCTION_TIME
          ) {
            this.bullets.splice(i, 1);
          }
          continue;
        }

        bullet.prevX = bullet.x;
        bullet.prevY = bullet.y;
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;

        // Check world bounds
        if (
          bullet.x < WORLD_BOUNDS.LEFT * 2 ||
          bullet.x > WORLD_BOUNDS.RIGHT * 2 ||
          bullet.y < WORLD_BOUNDS.TOP * 2 ||
          bullet.y > WORLD_BOUNDS.BOTTOM * 2
        ) {
          this.bullets.splice(i, 1);
          continue;
        }

        // Check collisions
        const collision = Physics.checkBulletCollisions(
          bullet,
          this.players,
          this.walls,
        );

        if (collision) {
          this.startBulletDestruction(bullet);

          if (collision.type === "player") {
            const player = collision.object;
            // Apply damage and knockback
            const dx = bullet.x - player.x;
            const dy = bullet.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const knockbackDirX = -dx / distance;
            const knockbackDirY = -dy / distance;

            player.knockbackX =
              knockbackDirX * BULLET_CONFIG.POWER * BULLET_CONFIG.SPEED;
            player.knockbackY =
              knockbackDirY * BULLET_CONFIG.POWER * BULLET_CONFIG.SPEED;
            player.knockbackTimer = 300;

            player.health -= BULLET_CONFIG.DAMAGE;

            if (player.health <= 0 && !player.isDead) {
              player.isDead = true;
              player.isVisible = false;
              player.deaths++;

              const killer = this.players.get(bullet.sourceId);
              if (killer) killer.kills++;

              this.io.to(this.sessionId).emit(EVENTS.PLAYER_DIED, {
                playerId: player.id,
                x: player.x,
                y: player.y,
                killerName: killer ? killer.name : "Unknown",
                killerKills: killer ? killer.kills : 0,
              });
            }
          }
        }
      }

      // 3. Broadcast State
      this.io.to(this.sessionId).emit(EVENTS.GAME_STATE, {
        players: Array.from(this.players.values()).map((p) => ({
          ...p, // sending everything for now, can optimize later
        })),
        bullets: this.bullets,
        timestamp: Date.now(),
      });
    }, TICK_INTERVAL);
  }

  startBulletDestruction(bullet) {
    bullet.destroying = true;
    bullet.destructionStartTime = Date.now();
    bullet.velocityX = 0;
    bullet.velocityY = 0;
  }
}
