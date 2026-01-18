import {
  GAME_CONFIG,
  PLAYER_CONFIG,
  BODY_CONFIG,
  WORLD_BOUNDS,
  BULLET_CONFIG,
} from "./constants.js";

export const Physics = {
  /**
   * Update player position based on input
   * @param {Object} player - The player object
   * @param {Object} input - User input
   * @param {Array<Object>} walls - List of walls
   */
  updatePlayer(player, input, walls) {
    const deltaTime = input.deltaTime || 1;

    // Calculate acceleration based on input
    let ax = 0;
    let ay = 0;

    if (input.left) ax -= player.acceleration * deltaTime;
    if (input.right) ax += player.acceleration * deltaTime;
    if (input.up) ay -= player.acceleration * deltaTime;
    if (input.down) ay += player.acceleration * deltaTime;

    // Apply acceleration to velocity
    player.velocityX += ax;
    player.velocityY += ay;

    // Apply friction
    const frictionFactor = Math.pow(player.friction, deltaTime);
    player.velocityX *= frictionFactor;
    player.velocityY *= frictionFactor;

    // Limit speed
    const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);
    if (speed > player.maxSpeed) {
      const scale = player.maxSpeed / speed;
      player.velocityX *= scale;
      player.velocityY *= scale;
    }

    // Calculate new position
    const newX = player.x + player.velocityX * deltaTime;
    const newY = player.y + player.velocityY * deltaTime;

    // Check wall collisions
    const collision = this.checkWallCollisions(player, newX, newY, walls);

    // Update position based on collision
    if (!collision.x) {
      player.x = newX;
    }
    if (!collision.y) {
      player.y = newY;
    }

    // Stop velocity in direction of collision
    if (collision.x) player.velocityX = 0;
    if (collision.y) player.velocityY = 0;

    // Enforce world boundaries
    this.enforceWorldBoundaries(player);
  },

  checkWallCollisions(player, newX, newY, walls) {
    const playerRadius = player.body?.radius ?? BODY_CONFIG.RADIUS;
    let collision = { x: false, y: false };

    if (!walls) return collision;

    walls.forEach((wall) => {
      const wallLeft = wall.x;
      const wallRight = wall.x + wall.width;
      const wallTop = wall.y;
      const wallBottom = wall.y + wall.height;

      // Check X-axis collision
      if (newY + playerRadius > wallTop && newY - playerRadius < wallBottom) {
        if (newX + playerRadius > wallLeft && newX - playerRadius < wallRight) {
          if (player.x < wallLeft) {
            collision.x = true;
            player.x = wallLeft - playerRadius;
          } else if (player.x > wallRight) {
            collision.x = true;
            player.x = wallRight + playerRadius;
          }
        }
      }

      // Check Y-axis collision
      if (newX + playerRadius > wallLeft && newX - playerRadius < wallRight) {
        if (newY + playerRadius > wallTop && newY - playerRadius < wallBottom) {
          if (player.y < wallTop) {
            collision.y = true;
            player.y = wallTop - playerRadius;
          } else if (player.y > wallBottom) {
            collision.y = true;
            player.y = wallBottom + playerRadius;
          }
        }
      }
    });

    return collision;
  },

  enforceWorldBoundaries(player) {
    if (player.x < WORLD_BOUNDS.LEFT) {
      player.x = WORLD_BOUNDS.LEFT;
      player.velocityX = 0;
    }
    if (player.x > WORLD_BOUNDS.RIGHT) {
      player.x = WORLD_BOUNDS.RIGHT;
      player.velocityX = 0;
    }
    if (player.y < WORLD_BOUNDS.TOP) {
      player.y = WORLD_BOUNDS.TOP;
      player.velocityY = 0;
    }
    if (player.y > WORLD_BOUNDS.BOTTOM) {
      player.y = WORLD_BOUNDS.BOTTOM;
      player.velocityY = 0;
    }
  },

  checkBulletCollisions(bullet, players, walls, bullets = []) {
    const bulletRadius = BULLET_CONFIG.RADIUS;

    if (bullet.destroying) return false;

    // Bullet vs Bullet
    // Currently only needed on server, but good to have logic available
    // Skipping complex bullet-bullet interaction for shared physics for now to keep it simple
    // unless required for client-side smoothing which usually doesn't simulate full logic.

    // Wall Collisions
    for (const wall of walls) {
      // If we have previous position, do a line intersection check (raycast)
      if (bullet.prevX !== undefined && bullet.prevY !== undefined) {
        const intersection = this.checkLineRectIntersection(
          bullet.prevX,
          bullet.prevY,
          bullet.x,
          bullet.y,
          wall,
        );
        if (intersection) {
          // Move bullet to collision point for visual accuracy (optional but good)
          bullet.x = intersection.x;
          bullet.y = intersection.y;
          return { type: "wall", object: wall };
        }
      }

      // Fallback to circle overlap (for low speeds or first frame if no prev pos)
      // Also still good to keep as a secondary check
      const wallLeft = wall.x;
      const wallRight = wall.x + wall.width;
      const wallTop = wall.y;
      const wallBottom = wall.y + wall.height;

      if (
        bullet.x + bulletRadius > wallLeft &&
        bullet.x - bulletRadius < wallRight &&
        bullet.y + bulletRadius > wallTop &&
        bullet.y - bulletRadius < wallBottom
      ) {
        return { type: "wall", object: wall };
      }
    }

    // Player Collisions
    const playerList =
      players instanceof Map ? Array.from(players.values()) : players;

    for (const player of playerList) {
      if (player.isDead) continue;
      if (player.id === bullet.sourceId) continue;

      // Simple Circle collision for players
      // (Could be upgraded to Circle Sweep if needed, but walls are the main issue)
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (
        distance <
        (player.body?.radius ?? BODY_CONFIG.RADIUS) + bulletRadius
      ) {
        return { type: "player", object: player };
      }
    }

    return null;
  },

  checkLineRectIntersection(x1, y1, x2, y2, wall) {
    const left = wall.x;
    const right = wall.x + wall.width;
    const top = wall.y;
    const bottom = wall.y + wall.height;

    // Check intersection with each of the 4 borders
    const topInt = this.checkLineIntersection(
      x1,
      y1,
      x2,
      y2,
      left,
      top,
      right,
      top,
    );
    const bottomInt = this.checkLineIntersection(
      x1,
      y1,
      x2,
      y2,
      left,
      bottom,
      right,
      bottom,
    );
    const leftInt = this.checkLineIntersection(
      x1,
      y1,
      x2,
      y2,
      left,
      top,
      left,
      bottom,
    );
    const rightInt = this.checkLineIntersection(
      x1,
      y1,
      x2,
      y2,
      right,
      top,
      right,
      bottom,
    );

    // Find the closest intersection
    let closest = null;
    let minDist = Infinity;

    [topInt, bottomInt, leftInt, rightInt].forEach((pt) => {
      if (pt) {
        const d = (pt.x - x1) ** 2 + (pt.y - y1) ** 2;
        if (d < minDist) {
          minDist = d;
          closest = pt;
        }
      }
    });

    return closest;
  },

  checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Computed using determinant form
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return null; // Parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      };
    }
    return null;
  },
};
