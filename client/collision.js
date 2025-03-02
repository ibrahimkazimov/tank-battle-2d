export function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

export function checkPlayerWallCollision(newX, newY, walls) {
    const playerBounds = {
        x: newX - PLAYER_RADIUS + WIDTH/2,
        y: newY - PLAYER_RADIUS + HEIGHT/2,
        width: PLAYER_RADIUS * 2,
        height: PLAYER_RADIUS * 2
    };

    for (const wall of walls) {
        if (checkCollision(playerBounds, wall)) {
            return true;
        }
    }
    return false;
}

export function checkBulletWallCollision(bullet, walls) {
    const bulletBounds = {
        x: bullet.x - BULLET_RADIUS,
        y: bullet.y - BULLET_RADIUS,
        width: BULLET_RADIUS * 2,
        height: BULLET_RADIUS * 2
    };

    for (const wall of walls) {
        if (checkCollision(bulletBounds, wall)) {
            return true;
        }
    }
    return false;
}
