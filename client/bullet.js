import { BULLET_COLOR, BULLET_RADIUS } from './constants.js';

export function createBullet(bulletContainer, player) {
    const bullet = new PIXI.Graphics();
    bullet.context.fillStyle = BULLET_COLOR;
    bullet.context.circle(0, 0, BULLET_RADIUS);
    bullet.context.fill();
    bulletContainer.addChild(bullet);
    bullet.x = player.turret.x;
    bullet.y = player.turret.y;
    bullet.rotation = player.turret.rotation;
    bullet.vx = Math.cos(bullet.rotation) * 2;
    bullet.vy = Math.sin(bullet.rotation) * 2;
    return bullet;
}
