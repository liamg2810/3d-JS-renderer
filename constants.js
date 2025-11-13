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
};

/**
 * @type {{
 *   [key: string]: {
 *     	baseHeight: number;
 *     	heightVariation: number;
 *     	terrainScale: number;
 *     	tempCenter: number;
 *     	humidityCenter: number;
 * 		surfaceBlock: BLOCKS;
 * 		treeChance: number
 *   }
 * }}
 */
export const BIOMES = {
	PLAINS: {
		baseHeight: 68,
		terrainScale: 0.02,
		heightVariation: 6,
		surfaceBlock: BLOCKS.GRASS,
		tempCenter: 0.5,
		humidityCenter: 0.5,
		treeChance: 0.01,
	},
	DESERT: {
		baseHeight: 70,
		terrainScale: 0.03,
		heightVariation: 3,
		surfaceBlock: BLOCKS.SAND,
		tempCenter: 0.7,
		humidityCenter: 0.3,
		treeChance: 0,
	},
	MOUNTAINS: {
		baseHeight: 72,
		terrainScale: 0.05,
		heightVariation: 32,
		surfaceBlock: BLOCKS.STONE,
		tempCenter: 0.3,
		humidityCenter: 0.7,
		treeChance: 0,
	},
	GRASSLANDS: {
		baseHeight: 64,
		terrainScale: 0.025,
		heightVariation: 12,
		surfaceBlock: BLOCKS.GRASS,
		tempCenter: 0.6,
		humidityCenter: 0.5,
		treeChance: 0.05,
	},
	TAIGA: {
		baseHeight: 64,
		terrainScale: 0.025,
		heightVariation: 12,
		surfaceBlock: BLOCKS.GRASS,
		tempCenter: 0.3,
		humidityCenter: 0.3,
		treeChance: 0.05,
	},
};

export const CHUNKSIZE = 16;
export const TERRAIN_NOISE_SCALE = 0.025;
export const TEMPERATURE_NOISE_SCALE = 0.005;
export const HUMIDITY_NOISE_SCALE = 0.001;
export const CAVE_NOISE_SCALE = TERRAIN_NOISE_SCALE * 5;
export const ORE_NOISE_SCALE = TERRAIN_NOISE_SCALE * 3;
export const WATER_LEVEL = 72;

export const MAX_HEIGHT = 256;
