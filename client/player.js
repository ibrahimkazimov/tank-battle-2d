import { PLAYER_COLOR, PLAYER_RADIUS, TURRET_WIDTH, TURRET_HEIGHT, TURRET_COLOR } from './constants.js';

export function createPlayer(app) {
    const player = new PIXI.Graphics();
    player.context.fillStyle = PLAYER_COLOR;
    player.context.circle(WIDTH / 2, HEIGHT / 2, PLAYER_RADIUS);
    player.context.fill();
    app.stage.addChild(player);

    const turret = new PIXI.Graphics();
    turret.context.rect(0, -TURRET_WIDTH/2, TURRET_HEIGHT, TURRET_WIDTH);
    turret.context.fillStyle = TURRET_COLOR;
    turret.context.fill();
    turret.pivot.x = 0;
    turret.pivot.y = 0;
    turret.x = WIDTH / 2;
    turret.y = HEIGHT / 2;
    app.stage.addChild(turret);

    player.turret = turret;
    return player;
}

export function updateTurretRotation(player, event) {
    const mousePosition = event.data.global;
    const dx = mousePosition.x - player.x - WIDTH/2;
    const dy = mousePosition.y - player.y - HEIGHT/2;
    const angle = Math.atan2(dy, dx);
    player.turret.rotation = angle;
}
