import { WALL_COLOR } from './constants.js';

export function createWall(x, y, width, height, wallContainer, walls) {
    const wall = new PIXI.Graphics();
    wall.context.fillStyle = WALL_COLOR;
    wall.context.rect(0, 0, width, height);
    wall.context.fill();
    wall.x = x;
    wall.y = y;
    wall.width = width;
    wall.height = height;
    wallContainer.addChild(wall);
    walls.push(wall);
    return wall;
}
