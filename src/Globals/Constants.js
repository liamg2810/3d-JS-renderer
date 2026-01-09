export const CHUNKSIZE = 16;
export const TERRAIN_NOISE_SCALE = 0.025;
export const TEMPERATURE_NOISE_SCALE = 0.005;
export const HUMIDITY_NOISE_SCALE = 0.01;
export const CAVE_NOISE_SCALE = 0.1;
export const ORE_NOISE_SCALE = 0.1;
export const WATER_LEVEL = 72;
export const CONTINENTIAL_NOISE_SCALE = 0.002;
export const WEIRDNESS_NOISE_SCALE = 0.02;
export const SPAGHETTI_CAVE_VALUE = 0.8;
export const SPAGHETTI_CAVE_RANGE = 0.2;
export const SPAGHETTI_CAVE_RADIUS = 12;

export const MAX_HEIGHT = 256;

/**
 * @typedef {{KEYFRAMES: {x: number; y: number}[]; DURATION: number}} PARTICLE
 */

/** @type {{[key: string]: PARTICLE}} */
export const PARTICLES = {
	EXPLOSION: {
		KEYFRAMES: [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
			{ x: 3, y: 0 },
			{ x: 4, y: 0 },
			{ x: 5, y: 0 },
			{ x: 6, y: 0 },
			{ x: 7, y: 0 },
		],
		DURATION: 500 / 8, // 8 frames in a 500ms
	},
	ENCHANT: {
		KEYFRAMES: [
			{ x: 1, y: 14 },
			{ x: 2, y: 14 },
			{ x: 3, y: 14 },
			{ x: 4, y: 14 },
			{ x: 5, y: 14 },
			{ x: 6, y: 14 },
			{ x: 7, y: 14 },
			{ x: 8, y: 14 },
			{ x: 9, y: 14 },
			{ x: 10, y: 14 },
			{ x: 11, y: 14 },
			{ x: 12, y: 14 },
			{ x: 13, y: 14 },
			{ x: 14, y: 14 },
			{ x: 15, y: 14 },
			{ x: 0, y: 15 },
			{ x: 1, y: 15 },
			{ x: 2, y: 15 },
			{ x: 3, y: 15 },
			{ x: 4, y: 15 },
			{ x: 5, y: 15 },
			{ x: 6, y: 15 },
			{ x: 7, y: 15 },
			{ x: 8, y: 15 },
			{ x: 9, y: 15 },
			{ x: 10, y: 15 },
			{ x: 11, y: 15 },
		],
		DURATION: 500 / 8, // 8 frames in a 500ms
	},
	RED_THING: {
		KEYFRAMES: [
			{ x: 0, y: 13 },
			{ x: 1, y: 13 },
			{ x: 2, y: 13 },
		],
		DURATION: 300 / 3, // 3 frames in 300ms
	},
};
