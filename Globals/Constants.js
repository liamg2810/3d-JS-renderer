export const TEXTURES = {
	GRASS: {
		top: 1,
		base: 0,
		bottom: 8,
	},
	LOG: {
		top: 4,
		bottom: 4,
		base: 3,
	},
	SAND: {
		base: 5,
	},
	WATER: {
		base: 6,
	},
	LEAVES: {
		base: 2,
	},
	STONE: {
		base: 7,
	},
	DIRT: {
		base: 8,
	},
	COAL: {
		base: 9,
	},
	BEDROCK: {
		base: 10,
	},
	SPRUCE_LEAVES: {
		base: 14,
	},
	SPRUCE_LOG: {
		base: 11,
		top: 12,
		bottom: 12,
	},
	SANDSTONE: {
		base: 22,
		top: 19,
		bottom: 21,
	},
	ICE: {
		base: 18,
	},
	POPPY: {
		base: 23,
	},
	GLOWSTONE: {
		base: 24,
	},
};

export const BLOCKS = {
	AIR: 0,
	GRASS: 1,
	LOG: 2,
	SAND: 3,
	WATER: 4,
	LEAVES: 5,
	STONE: 6,
	DIRT: 7,
	COAL: 8,
	BEDROCK: 9,
	SPRUCE_LEAVES: 10,
	SPRUCE_LOG: 11,
	SANDSTONE: 12,
	ICE: 13,
	POPPY: 14,
	GLOWSTONE: 15,
};

export const TRANSPARENT = new Set([
	BLOCKS.WATER,
	BLOCKS.LEAVES,
	BLOCKS.SPRUCE_LEAVES,
	BLOCKS.ICE,
	BLOCKS.POPPY,
	BLOCKS.AIR,
	BLOCKS.GLOWSTONE,
]);

export const LIGHT_SOURCES = new Set([BLOCKS.GLOWSTONE]);

/**
 * @type {{
 *   [key: string]: {
 *     	baseHeight: number;
 *     	heightVariation: number;
 *     	tempCenter?: number;
 *     	humidityCenter?: number;
 * 		surfaceBlock: (x, z, elevation) => BLOCKS;
 * 		subSurfaceBlock: BLOCKS;
 * 		treeChance: number;
 * 		code: number;
 * 		color: string;
 *   }
 * }}
 */
export const BIOMES = {
	PLAINS: {
		baseHeight: 68,
		heightVariation: 6,
		surfaceBlock: (x, z, elevation) => BLOCKS.GRASS,
		subSurfaceBlock: BLOCKS.DIRT,
		tempCenter: 0.5,
		humidityCenter: 0.5,
		treeChance: 0.01,
		code: 0,
		color: "rgb(0, 255, 0)",
	},
	DESERT: {
		baseHeight: 70,
		heightVariation: 3,
		surfaceBlock: (x, z, elevation) => BLOCKS.SAND,
		subSurfaceBlock: BLOCKS.SANDSTONE,
		tempCenter: 0.7,
		humidityCenter: 0.3,
		treeChance: 0,
		code: 1,
		color: "rgb(135, 135, 7)",
	},
	MOUNTAINS: {
		baseHeight: 72,
		heightVariation: 32,
		surfaceBlock: (x, z, elevation) => BLOCKS.STONE,
		subSurfaceBlock: BLOCKS.STONE,
		tempCenter: 0.3,
		humidityCenter: 0.4,
		treeChance: 0,
		code: 2,
		color: "rgb(150, 150, 150)",
	},
	GRASSLANDS: {
		baseHeight: 64,
		heightVariation: 12,
		surfaceBlock: (x, z, elevation) => BLOCKS.GRASS,
		subSurfaceBlock: BLOCKS.DIRT,
		tempCenter: 0.6,
		humidityCenter: 0.4,
		treeChance: 0.05,
		code: 3,
		color: "rgb(0, 150, 0)",
	},
	TAIGA: {
		baseHeight: 64,
		heightVariation: 12,
		surfaceBlock: (x, z, elevation) => BLOCKS.GRASS,
		subSurfaceBlock: BLOCKS.DIRT,
		tempCenter: 0.3,
		humidityCenter: 0.3,
		treeChance: 0.05,
		code: 4,
		color: "rgb(0, 50, 0)",
	},
	OCEAN: {
		baseHeight: 45,
		heightVariation: 5,
		surfaceBlock: (x, z, elevation) => BLOCKS.SAND,
		subSurfaceBlock: BLOCKS.STONE,
		code: 5,
		color: "rgb(0, 115, 255)",
	},
};

export const CHUNKSIZE = 16;
export const TERRAIN_NOISE_SCALE = 0.025;
export const TEMPERATURE_NOISE_SCALE = 0.005;
export const HUMIDITY_NOISE_SCALE = 0.01;
export const CAVE_NOISE_SCALE = 0.1;
export const ORE_NOISE_SCALE = 0.025;
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
};
