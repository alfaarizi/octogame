/**
 * @file Shared JSDoc types. Distances are meters: x grows eastward and z southward across the
 * floor plan, and y grows upward from the floor.
 */

/**
 * A point on the floor plan.
 * @typedef {object} FloorPoint
 * @property {number} x
 * @property {number} z
 */

/**
 * A point or direction in 3D space.
 * @typedef {object} Point3
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * Where someone appears and which way they face, as a yaw (see Pose).
 * @typedef {FloorPoint & { yaw: number }} SpawnPoint
 */

/**
 * A place a candy can hide, and the room it's in.
 * @typedef {Point3 & { room: string }} CandySpot
 */

/**
 * The extent of a box along each axis.
 * @typedef {object} Size3
 * @property {number} width - Along x.
 * @property {number} height - Along y.
 * @property {number} depth - Along z.
 */

/**
 * A rectangle on the floor plan, from (x0, z0) to (x1, z1).
 * @typedef {object} Rect
 * @property {number} x0
 * @property {number} z0
 * @property {number} x1
 * @property {number} z1
 */

/**
 * A floor-plan rectangle that also spans y0 to y1 in height.
 * @typedef {Rect & { y0: number, y1: number }} Box
 */

/**
 * The numbers from `min` to `max`.
 * @typedef {object} Range
 * @property {number} min
 * @property {number} max
 */

/**
 * A line of sight: where it starts and the unit direction it points along.
 * @typedef {object} Ray
 * @property {Point3} origin
 * @property {Point3} direction
 */

/**
 * The space a light covers around its ray.
 * @typedef {object} Cone
 * @property {number} halfAngle - Radians from the center line to the edge.
 * @property {number} range - Meters from the origin.
 */

/**
 * Where someone stands and where they look. Yaw 0 looks toward -z and turns left as it grows;
 * pitch looks up as it grows.
 * @typedef {object} Pose
 * @property {FloorPoint} position
 * @property {number} yaw
 * @property {number} pitch
 */

/**
 * What the player is asking to do this frame. Each axis is -1, 0 or 1.
 * @typedef {object} MovementIntent
 * @property {number} forward
 * @property {number} strafe - +1 is right.
 * @property {number} turn - +1 is left.
 * @property {boolean} sprint
 */

/**
 * How the player actually moved this frame.
 * @typedef {object} Movement
 * @property {boolean} moving
 * @property {boolean} sprinting
 */

/**
 * The choices a player makes on the title screen.
 * @typedef {object} Session
 * @property {string} playerName
 * @property {boolean} chickenMode - Whether to skip the jump scare.
 */

/**
 * Mouse capture for mouse-look, implemented by BrowserPointerLock and SimulatedPointerLock.
 * @typedef {object} PointerLock
 * @property {boolean} isLocked
 * @property {() => void} request
 * @property {() => void} release
 * @property {(listener: (isLocked: boolean) => void) => () => void} onChange - Returns an unsubscribe function.
 */

export {};
