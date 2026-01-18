/**
 * @typedef {Object} BodyComponent
 * @property {number} radius
 * @property {string} color
 */

/**
 * @typedef {Object} TurretComponent
 * @property {number} length
 * @property {number} width
 * @property {number} rotation
 * @property {string} color
 */

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {number} health
 * @property {number} velocityX
 * @property {number} velocityY
 * @property {number} acceleration
 * @property {number} friction
 * @property {number} maxSpeed
 * @property {boolean} isDead
 * @property {number} kills
 * @property {number} deaths
 * @property {BodyComponent} body
 * @property {TurretComponent} turret
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
