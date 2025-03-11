// This file contains all game constants
export const WIDTH = 1920;  // Standard 16:9 aspect ratio
export const HEIGHT = 1080;

// View distance (how far players can see)
export const VIEW_DISTANCE = 1200;  // Increased for better map visibility
export const MIN_ZOOM = 1.0;  // Keep minimum zoom to maintain good game view
export const MAX_ZOOM = 2.0;  // Maximum zoom level

export const PLAYER_RADIUS = 20;
export const PLAYER_SPEED = 0.5;
export const TURRET_WIDTH = 10;
export const TURRET_HEIGHT = 30;
export const BULLET_RADIUS = 5;
export const BULLET_SPEED = 1.5;
export const BULLET_COOLDOWN = 500; // 0.5 seconds in milliseconds

// Colors
export const BULLET_COLOR = "#FF0000";
export const PLAYER_COLOR = "#3355FF";
export const TURRET_COLOR = "#9B989A";
export const BACKGROUND_COLOR = "#EEEEEE";
export const WALL_COLOR = "#555555";
export const STROKE_COLOR = '#5D5D60';
export const STROKE_WIDTH = 2;

// Player Constants
export const PLAYER_MAX_HEALTH = 100;
export const BULLET_DAMAGE = 20;
export const BULLET_FORCE = 5; // Force applied to player when hit by a bullet
export const PLAYER2_COLOR = "#FF5533";
export const RESPAWN_TIME = 5000; // 5 seconds in milliseconds
export const PLAYER2_SHOOT_INTERVAL = 2000; // 2 seconds between shots