const app = new PIXI.Application();
const HEIGHT = 720;
const WIDTH = 1280;
const PLAYER_RADIUS = 10;
const PLAYER_SPEED = 1;
const TURRET_WIDTH = 10;
const TURRET_HEIGHT = 20;
const BULLET_RADIUS = 5;

const BULLET_COLOR = '#FFFF00';
const PLAYER_COLOR = '#0000FF';
const TURRET_COLOR = '#00FF00';
const BACKGROUND_COLOR = '#000000';
const WALL_COLOR = '#808080';  // Gray color for walls
const FLAG_COLOR = '#FF0000';  // Red color for flag
const FLAG_SIZE = 20;  // Size of the flag

await app.init({ 
    width: WIDTH, 
    height: HEIGHT, 
    eventMode: 'static',
    background: BACKGROUND_COLOR
});

// Make stage interactive and ensure it covers the full canvas
app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;

document.body.appendChild(app.canvas);

// Create containers for game objects
const bulletContainer = new PIXI.Container();
const wallContainer = new PIXI.Container();
const flagContainer = new PIXI.Container();
app.stage.addChild(wallContainer);
app.stage.addChild(flagContainer);
app.stage.addChild(bulletContainer);

// Create flag
const flag = new PIXI.Graphics();
flag.context.fillStyle = FLAG_COLOR;
flag.context.rect(-FLAG_SIZE/2, -FLAG_SIZE, FLAG_SIZE, FLAG_SIZE);
flag.context.fill();
flag.x = WIDTH / 4;
flag.y = HEIGHT / 2;
flag.isCarried = false;
flagContainer.addChild(flag);

// Create some walls
const walls = [];

function createWall(x, y, width, height) {
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

// Add some example walls
createWall(200, 100, 20, 200);  // Vertical wall
createWall(400, 400, 200, 20);  // Horizontal wall
createWall(800, 200, 20, 300);  // Another vertical wall

// Collision detection functions
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkPlayerWallCollision(newX, newY) {
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

function checkBulletWallCollision(bullet) {
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

// player is a circle with a turret
// turret is a thin rectangle
const turret = new PIXI.Graphics();
// Draw turret from (0,0) so rotation works correctly
turret.context.rect(0, -TURRET_WIDTH/2, TURRET_HEIGHT, TURRET_WIDTH);
turret.context.fillStyle = TURRET_COLOR;
turret.context.fill();
// Set the pivot point to the base of the turret
turret.pivot.x = 0;
turret.pivot.y = 0;
// Position turret at player center
turret.x = WIDTH / 2;
turret.y = HEIGHT / 2;
app.stage.addChild(turret);

const player = new PIXI.Graphics();
player.context.fillStyle = PLAYER_COLOR;
player.context.circle(WIDTH / 2, HEIGHT / 2, PLAYER_RADIUS);
player.context.fill();
app.stage.addChild(player);

player.turret = turret;

// turret should track the mouse
app.stage.on('pointermove', (event) => {
    const mousePosition = event.data.global;
    
    // Calculate angle between player center and mouse position
    const dx = mousePosition.x - player.x - WIDTH/2;
    const dy = mousePosition.y - player.y - HEIGHT/2;
    const angle = Math.atan2(dy, dx);
    
    // Set turret rotation
    player.turret.rotation = angle;
});


// fire the bullet
app.stage.on('pointerdown', () => {
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
    
    const tickerCallback = () => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Check for wall collision
        if (checkBulletWallCollision(bullet)) {
            bulletContainer.removeChild(bullet);
            app.ticker.remove(tickerCallback);
        }
    };
    
    app.ticker.add(tickerCallback);
});

// Track which keys are currently pressed
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    F: false
};

const arrowMap = {
    w: 'ArrowUp',
    a: 'ArrowLeft',
    s: 'ArrowDown',
    d: 'ArrowRight',
    ArrowUp: 'ArrowUp',
    ArrowLeft: 'ArrowLeft',
    ArrowDown: 'ArrowDown',
    ArrowRight: 'ArrowRight',
    f: 'F',
    F: 'F'
}

// Function to check if player is near flag
function isPlayerNearFlag() {
    const distance = Math.sqrt(
        Math.pow((player.x + WIDTH/2) - flag.x, 2) + 
        Math.pow((player.y + HEIGHT/2) - flag.y, 2)
    );
    return distance < PLAYER_RADIUS + FLAG_SIZE;
}

// Handle flag pickup/drop
window.addEventListener('keydown', (event) => {
    if (arrowMap.hasOwnProperty(event.key)) {
        const mappedKey = arrowMap[event.key];
        keys[mappedKey] = true;
        
        // Handle flag pickup/drop
        if (mappedKey === 'F') {
            if (!flag.isCarried && isPlayerNearFlag()) {
                // Pickup flag
                flag.isCarried = true;
            } else if (flag.isCarried) {
                // Drop flag
                flag.isCarried = false;
                flag.x = player.x + WIDTH/2;
                flag.y = player.y + HEIGHT/2;
            }
        }
    }
});

window.addEventListener('keyup', (event) => {
    if (arrowMap.hasOwnProperty(event.key)) {
        keys[arrowMap[event.key]] = false;
    }
});

// Update player position in game loop
app.ticker.add(() => {
    let newX = player.x;
    let newY = player.y;

    // Calculate new position based on keys
    if (keys.ArrowLeft) newX -= PLAYER_SPEED;
    if (keys.ArrowRight) newX += PLAYER_SPEED;
    if (keys.ArrowUp) newY -= PLAYER_SPEED;
    if (keys.ArrowDown) newY += PLAYER_SPEED;

    // Check for wall collisions before updating position
    if (!checkPlayerWallCollision(newX, player.y)) {
        player.x = newX;
        player.turret.x = newX + WIDTH/2;
        if (flag.isCarried) {
            flag.x = player.x + WIDTH/2;
        }
    }
    if (!checkPlayerWallCollision(player.x, newY)) {
        player.y = newY;
        player.turret.y = newY + HEIGHT/2;
        if (flag.isCarried) {
            flag.y = player.y + HEIGHT/2;
        }
    }

    // Existing boundary checks
    if(player.x < -WIDTH/2) {
        player.x = -WIDTH/2;
        player.turret.x = 0;
        if (flag.isCarried) flag.x = WIDTH/2;
    }
    if(player.x > WIDTH/2) {
        player.x = WIDTH/2;
        player.turret.x = WIDTH;
        if (flag.isCarried) flag.x = WIDTH;
    }
    if(player.y < -HEIGHT/2) {
        player.y = -HEIGHT/2;
        player.turret.y = 0;
        if (flag.isCarried) flag.y = 0;
    }
    if(player.y > HEIGHT/2) {
        player.y = HEIGHT/2;
        player.turret.y = HEIGHT;
        if (flag.isCarried) flag.y = HEIGHT;
    }
});