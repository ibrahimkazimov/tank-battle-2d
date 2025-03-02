import { HEIGHT, WIDTH, PLAYER_SPEED } from "./constants.js";
import { createPlayer, updateTurretRotation } from "./player.js";
import { createWall } from "./wall.js";
import { createFlag } from "./flag.js";
import { createBullet } from "./bullet.js";
import {
  checkPlayerWallCollision,
  checkBulletWallCollision,
} from "./collision.js";

const app = new PIXI.Application();
await app.init({
  width: WIDTH,
  height: HEIGHT,
  eventMode: "static",
  background: BACKGROUND_COLOR,
});

document.body.appendChild(app.canvas);

const bulletContainer = new PIXI.Container();
const wallContainer = new PIXI.Container();
const flagContainer = new PIXI.Container();
app.stage.addChild(wallContainer);
app.stage.addChild(flagContainer);
app.stage.addChild(bulletContainer);

const player = createPlayer(app);
const flag = createFlag(flagContainer);
const walls = [];

createWall(200, 100, 20, 200, wallContainer, walls);
createWall(400, 400, 200, 20, wallContainer, walls);
createWall(800, 200, 20, 300, wallContainer, walls);

app.stage.on("pointermove", (event) => {
  updateTurretRotation(player, event);
});

app.stage.on("pointerdown", () => {
  const bullet = createBullet(bulletContainer, player);
  const tickerCallback = () => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (checkBulletWallCollision(bullet, walls)) {
      bulletContainer.removeChild(bullet);
      app.ticker.remove(tickerCallback);
    }
  };
  app.ticker.add(tickerCallback);
});

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  F: false,
};
const arrowMap = {
  w: "ArrowUp",
  a: "ArrowLeft",
  s: "ArrowDown",
  d: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowLeft: "ArrowLeft",
  ArrowDown: "ArrowDown",
  ArrowRight: "ArrowRight",
  f: "F",
  F: "F",
};

window.addEventListener("keydown", (event) => {
  if (arrowMap.hasOwnProperty(event.key)) {
    const mappedKey = arrowMap[event.key];
    keys[mappedKey] = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (arrowMap.hasOwnProperty(event.key)) {
    keys[arrowMap[event.key]] = false;
  }
});

app.ticker.add(() => {
  let newX = player.x;
  let newY = player.y;

  if (keys.ArrowLeft) newX -= PLAYER_SPEED;
  if (keys.ArrowRight) newX += PLAYER_SPEED;
  if (keys.ArrowUp) newY -= PLAYER_SPEED;
  if (keys.ArrowDown) newY += PLAYER_SPEED;

  if (!checkPlayerWallCollision(newX, player.y, walls)) {
    player.x = newX;
    player.turret.x = newX + WIDTH / 2;
    if (flag.isCarried) {
      flag.x = player.x + WIDTH / 2;
    }
  }

  if (!checkPlayerWallCollision(player.x, newY, walls)) {
    player.y = newY;
    player.turret.y = newY + HEIGHT / 2;
    if (flag.isCarried) {
      flag.y = player.y + HEIGHT / 2;
    }
  }
});
