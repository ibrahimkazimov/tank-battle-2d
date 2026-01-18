// Game Configuration
export const GAME_CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  VIEW_DISTANCE: 1200,
  MIN_ZOOM: 1.0,
  MAX_ZOOM: 2.0,
  TICK_RATE: 25,
  INTERPOLATION_DELAY: 100,
};

// Body Configuration
export const BODY_CONFIG = {
  RADIUS: 20,
};

// Turret Configuration
export const TURRET_CONFIG = {
  LENGTH: 30,
  WIDTH: 10,
};

// Player Configuration
export const PLAYER_CONFIG = {
  SPEED: 2.5,
  MAX_HEALTH: 100,
  RESPAWN_TIME: 3000,
  ACCELERATION: 1.0,
  FRICTION: 0.95,
  MAX_SPEED: 5.0, // PLAYER_SPEED * 2
  FIRE_RATE: 250,
};

// Bullet Configuration
export const BULLET_CONFIG = {
  RADIUS: 5,
  SPEED: 30,
  DAMAGE: 20,
  POWER: 0.5,
  HEALTH: 40,
  VS_BULLET_DAMAGE: 40,
  DESTRUCTION_TIME: 50,
  FADE_SPEED: 0.8,
};

// Tank Types Configuration
export const TANK_TYPES = {
  standard: {
    id: "standard",
    name: "Standard",
    description: "Balanced all-rounder",
    body: {
      radius: BODY_CONFIG.RADIUS,
    },
    turret: {
      length: TURRET_CONFIG.LENGTH,
      width: TURRET_CONFIG.WIDTH,
    },
    speed: PLAYER_CONFIG.SPEED,
    maxSpeed: PLAYER_CONFIG.MAX_SPEED,
    fireRate: PLAYER_CONFIG.FIRE_RATE,
    bullet: {
      speed: BULLET_CONFIG.SPEED,
      damage: BULLET_CONFIG.DAMAGE,
      power: BULLET_CONFIG.POWER,
      radius: BULLET_CONFIG.RADIUS,
    },
  },
  heavy: {
    id: "heavy",
    name: "Heavy",
    description: "Slow but powerful",
    body: {
      radius: BODY_CONFIG.RADIUS * 1.3,
    },
    turret: {
      length: TURRET_CONFIG.LENGTH * 1.1,
      width: TURRET_CONFIG.WIDTH * 1.4,
    },
    speed: PLAYER_CONFIG.SPEED * 0.7,
    maxSpeed: PLAYER_CONFIG.MAX_SPEED * 0.7,
    fireRate: PLAYER_CONFIG.FIRE_RATE * 1.3,
    bullet: {
      speed: BULLET_CONFIG.SPEED * 0.85,
      damage: BULLET_CONFIG.DAMAGE * 1.8,
      power: BULLET_CONFIG.POWER * 1.5,
      radius: BULLET_CONFIG.RADIUS * 1.3,
    },
  },
  speeder: {
    id: "speeder",
    name: "Speeder",
    description: "Fast and agile",
    body: {
      radius: BODY_CONFIG.RADIUS * 0.85,
    },
    turret: {
      length: TURRET_CONFIG.LENGTH * 0.9,
      width: TURRET_CONFIG.WIDTH * 0.8,
    },
    speed: PLAYER_CONFIG.SPEED * 1.5,
    maxSpeed: PLAYER_CONFIG.MAX_SPEED * 1.5,
    fireRate: PLAYER_CONFIG.FIRE_RATE * 0.8,
    bullet: {
      speed: BULLET_CONFIG.SPEED * 1.1,
      damage: BULLET_CONFIG.DAMAGE * 0.7,
      power: BULLET_CONFIG.POWER * 0.7,
      radius: BULLET_CONFIG.RADIUS * 0.9,
    },
  },
  sniper: {
    id: "sniper",
    name: "Sniper",
    description: "Long-range precision",
    body: {
      radius: BODY_CONFIG.RADIUS * 0.95,
    },
    turret: {
      length: TURRET_CONFIG.LENGTH * 1.6,
      width: TURRET_CONFIG.WIDTH * 0.7,
    },
    speed: PLAYER_CONFIG.SPEED * 0.9,
    maxSpeed: PLAYER_CONFIG.MAX_SPEED * 0.9,
    fireRate: PLAYER_CONFIG.FIRE_RATE * 1.8,
    bullet: {
      speed: BULLET_CONFIG.SPEED * 1.5,
      damage: BULLET_CONFIG.DAMAGE * 1.4,
      power: BULLET_CONFIG.POWER * 1.2,
      radius: BULLET_CONFIG.RADIUS * 0.85,
    },
  },
};

// Colors
export const COLORS = {
  PLAYER1: "#1BB4D6",
  PLAYER2: "#BE7FF4",
  PLAYER3: "#F04E52",
  PLAYER4: "#04E16D",
  TURRET: "#9B989A",
  BACKGROUND: "#EEEEEE",
  WALL: "#555555",
  STROKE: "#5D5D60",
  STROKE_WIDTH: 2,
};

// Events
export const EVENTS = {
  CONNECT: "connection",
  DISCONNECT: "disconnect",
  GAME_STATE: "gameState",
  PLAYER_INPUT: "playerInput",
  PLAYER_DIED: "playerDied",
  PLAYER_RESPAWNED: "playerRespawned",
  PLAYER_DISCONNECTED: "playerDisconnected",
  SHOOT: "shoot",
  RESPAWN: "respawn",
};

// World Boundaries
export const WORLD_BOUNDS = {
  LEFT: -1000,
  RIGHT: 1000,
  TOP: -1000,
  BOTTOM: 1000,
};
