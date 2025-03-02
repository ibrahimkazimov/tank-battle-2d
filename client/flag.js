import { FLAG_COLOR, FLAG_SIZE } from './constants.js';

export function createFlag(flagContainer) {
    const flag = new PIXI.Graphics();
    flag.context.fillStyle = FLAG_COLOR;
    flag.context.rect(-FLAG_SIZE / 2, -FLAG_SIZE, FLAG_SIZE, FLAG_SIZE);
    flag.context.fill();
    flag.x = WIDTH / 4;
    flag.y = HEIGHT / 2;
    flag.isCarried = false;
    flagContainer.addChild(flag);
    return flag;
}
