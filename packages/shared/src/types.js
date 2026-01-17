/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {number} rotation
 * @property {number} health
 * @property {number} velocityX
 * @property {number} velocityY
 * @property {number} acceleration
 * @property {number} friction
 * @property {number} maxSpeed
 * @property {boolean} isDead
 * @property {string} color
 * @property {number} kills
 * @property {number} deaths
 */

/**
 * @typedef {Object} Bullet
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {number} velocityX
 * @property {number} velocityY
 * @property {number} rotation
 * @property {string} sourceId
 * @property {boolean} destroying
 */

/**
 * @typedef {Object} GameState
 * @property {Player[]} players
 * @property {Bullet[]} bullets
 * @property {Object[]} walls
 */
