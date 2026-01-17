// Game Configuration
export const GAME_CONFIG = {
  WIDTH: 1920,
  HEIGHT: 1080,
  VIEW_DISTANCE: 1200,
  MIN_ZOOM: 1.0,
  MAX_ZOOM: 2.0,
  TICK_RATE: 60,
  INTERPOLATION_DELAY: 100,
};

// Player Configuration
export const PLAYER_CONFIG = {
  RADIUS: 20,
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
  SPEED: 15,
  DAMAGE: 20,
  POWER: 0.5,
  HEALTH: 40,
  VS_BULLET_DAMAGE: 40,
  DESTRUCTION_TIME: 50,
  FADE_SPEED: 0.8,
};

// Colors
export const COLORS = {
  PLAYER1: '#1BB4D6',
  PLAYER2: '#BE7FF4',
  PLAYER3: '#F04E52',
  PLAYER4: '#04E16D',
  TURRET: "#9B989A",
  BACKGROUND: "#EEEEEE",
  WALL: "#555555",
  STROKE: '#5D5D60',
  STROKE_WIDTH: 2,
};

// Events
export const EVENTS = {
  CONNECT: 'connection',
  DISCONNECT: 'disconnect',
  GAME_STATE: 'gameState',
  PLAYER_INPUT: 'playerInput',
  PLAYER_DIED: 'playerDied',
  PLAYER_RESPAWNED: 'playerRespawned',
  PLAYER_DISCONNECTED: 'playerDisconnected',
  SHOOT: 'shoot',
  RESPAWN: 'respawn',
};

// World Boundaries
export const WORLD_BOUNDS = {
  LEFT: -1000,
  RIGHT: 1000,
  TOP: -1000,
  BOTTOM: 1000
};
