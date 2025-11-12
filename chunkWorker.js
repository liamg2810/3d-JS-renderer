import * as perlin2D from "./Perlin2D.js";
import * as perlin3D from "./Perlin3D.js";

const BLOCKS = {
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
const BIOMES = {
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
		tempCenter: 0.2,
		humidityCenter: 0.2,
		treeChance: 0.05,
	},
};

const CHUNKSIZE = 16;
const TERRAIN_NOISE_SCALE = 0.025;
const TEMPERATURE_NOISE_SCALE = 0.001;
const HUMIDITY_NOISE_SCALE = 0.002;
const CAVE_NOISE_SCALE = TERRAIN_NOISE_SCALE * 5;
const ORE_NOISE_SCALE = TERRAIN_NOISE_SCALE * 3;

const MAX_HEIGHT = 256;

function BuildChunk(chunkX, chunkZ, seed) {
	let blocks = new Uint8Array(CHUNKSIZE * CHUNKSIZE * MAX_HEIGHT);

	for (let x = 0; x < CHUNKSIZE; x++) {
		for (let z = 0; z < CHUNKSIZE; z++) {
			for (let y = 0; y < MAX_HEIGHT; y++) {
				blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] = BLOCKS.AIR;
			}
		}
	}

	let water = [];

	perlin2D.SetSeed(seed);
	perlin3D.SetSeed(seed);

	let caveNoise = new Float32Array((CHUNKSIZE / 4) * (CHUNKSIZE / 4) * 32);

	for (let x = 0; x < CHUNKSIZE; x += 4) {
		const cx = x / 4;
		const worldX = x + chunkX * CHUNKSIZE;
		for (let z = 0; z < CHUNKSIZE; z += 4) {
			const cz = z / 4;
			const worldZ = z + chunkZ * CHUNKSIZE;
			for (let y = 0; y < 128; y += 4) {
				const cy = y / 4;
				const nVal = perlin3D.perlin3D(
					worldX * CAVE_NOISE_SCALE,
					y * CAVE_NOISE_SCALE,
					worldZ * CAVE_NOISE_SCALE
				);

				caveNoise[
					cx +
						cz * (CHUNKSIZE / 4) +
						cy * (CHUNKSIZE / 4) * (CHUNKSIZE / 4)
				] = nVal;
			}
		}
	}

	for (let x = 0; x < CHUNKSIZE; x++) {
		const worldX = x + chunkX * CHUNKSIZE;
		for (let z = 0; z < CHUNKSIZE; z++) {
			const worldZ = z + chunkZ * CHUNKSIZE;

			let temp = perlin2D.perlin2D(
				worldX * TEMPERATURE_NOISE_SCALE,
				worldZ * TEMPERATURE_NOISE_SCALE
			);
			let humidity = perlin2D.perlin2D(
				worldX * HUMIDITY_NOISE_SCALE,
				worldZ * HUMIDITY_NOISE_SCALE
			);

			temp = (temp + 1) / 2;
			humidity = (humidity + 1) / 2;

			let biomes = Biome(temp, humidity);

			let chosenBiome = BIOMES.PLAINS;

			let height = 0;
			let terrainScale = 0;
			let heightVariation = 0;
			let maxWeight = 0;

			for (const b of biomes) {
				if (maxWeight < b.weight) {
					chosenBiome = b.biome;
				}

				height += b.biome.baseHeight * b.weight;
				terrainScale += b.biome.terrainScale * b.weight;
				heightVariation += b.biome.heightVariation * b.weight;
			}

			let block = chosenBiome.surfaceBlock;

			let elevation =
				height +
				(perlin2D.perlin2D(
					worldX * terrainScale,
					worldZ * terrainScale
				) +
					1) *
					heightVariation;

			elevation = Math.round(elevation);

			if (elevation < 64) {
				const b = BLOCKS.WATER;
				blocks[x + z * CHUNKSIZE + 64 * MAX_HEIGHT] = b;

				elevation -= 1;
				block = BLOCKS.SAND;
			}

			const b = block;

			blocks[x + z * CHUNKSIZE + elevation * MAX_HEIGHT] = b;

			const treeNoise = Math.random();

			// no trees <#-#>
			if (elevation > 64 && treeNoise > 1 - chosenBiome.treeChance) {
				let tree = [];

				if (
					chosenBiome === BIOMES.PLAINS ||
					chosenBiome === BIOMES.GRASSLANDS
				) {
					tree = DrawPlainsTree(x, elevation, z);
				}

				if (chosenBiome === BIOMES.TAIGA) {
					tree = DrawTaigaTree(x, elevation, z);
				}

				tree.forEach((b) => {
					blocks[b.x + b.z * CHUNKSIZE + b.y * MAX_HEIGHT] = b.block;
				});
			}

			for (let y = elevation - 1; y > 2; y--) {
				let caveVal = 0.35;

				if (y < elevation / 1.5) {
					caveVal = 0.425;
				}

				if (y < elevation / 2) {
					caveVal = 0.5;
				}

				let belowB = BLOCKS.STONE;

				const oreNoise = perlin3D.perlin3D(
					x * ORE_NOISE_SCALE,
					y * ORE_NOISE_SCALE,
					z * ORE_NOISE_SCALE
				);

				if (oreNoise < 0.2) {
					belowB = BLOCKS.COAL;
				}

				if (y >= elevation - 3) {
					belowB = BLOCKS.DIRT;
				}

				if (y < elevation - 3) {
					const nVal = GetCaveNoiseValAtPoint(x, y, z, caveNoise);

					if (nVal < caveVal) {
						belowB = BLOCKS.AIR;
					}
				}

				blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] = belowB;
			}

			for (let y = 2; y > 0; y--) {
				// Bedrock
				blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] = BLOCKS.BEDROCK;
			}
		}
	}

	return blocks;
}

/**
 *
 * @param {number} grassX
 * @param {number} grassY
 * @param {number} grassZ
 * @returns {{x: number, y: number, z: number, block: BLOCKS}[]}
 */
function DrawPlainsTree(grassX, grassY, grassZ) {
	let blocks = [];

	const treeTop = Math.round(Math.random() * 1 + 2);

	for (let y = grassY + 1; y < grassY + treeTop + 2; y++) {
		blocks.push({ x: grassX, y: y, z: grassZ, block: BLOCKS.LOG });
	}

	for (let y = treeTop + grassY; y <= treeTop + grassY + 2; y++) {
		for (let x = grassX - 1; x <= grassX + 1; x++) {
			for (let z = grassZ - 1; z <= grassZ + 1; z++) {
				if (x < 0 || z < 0 || x >= CHUNKSIZE || z >= CHUNKSIZE)
					continue;

				if (x === grassX && z === grassZ && y < treeTop + grassY + 2) {
					continue;
				}

				if (y === treeTop + grassY + 2) {
					if (x === grassX - 1 && z === grassZ - 1) continue;
					if (x === grassX - 1 && z === grassZ + 1) continue;
					if (x === grassX + 1 && z === grassZ - 1) continue;
					if (x === grassX + 1 && z === grassZ + 1) continue;
				}

				if (y === treeTop + grassY + 1 && x === grassX && z === grassZ)
					continue;

				blocks.push({ x, y, z, block: BLOCKS.LEAVES });
			}
		}
	}
	return blocks;
}

/**
 *
 * @param {number} grassX
 * @param {number} grassY
 * @param {number} grassZ
 * @returns {{x: number, y: number, z: number, block: BLOCKS}[]}
 */
function DrawTaigaTree(grassX, grassY, grassZ) {
	let blocks = [];

	const treeTop = Math.round(Math.random() * 1 + 5);

	for (let y = grassY + 1; y < grassY + treeTop + 2; y++) {
		blocks.push({ x: grassX, y: y, z: grassZ, block: BLOCKS.LOG });
	}

	for (let y = treeTop + grassY; y <= treeTop + grassY + 2; y++) {
		for (let x = grassX - 1; x <= grassX + 1; x++) {
			for (let z = grassZ - 1; z <= grassZ + 1; z++) {
				if (x < 0 || z < 0 || x >= CHUNKSIZE || z >= CHUNKSIZE)
					continue;

				if (x === grassX && z === grassZ && y < treeTop + grassY + 2) {
					continue;
				}

				if (y === treeTop + grassY + 2) {
					if (x === grassX - 1 && z === grassZ - 1) continue;
					if (x === grassX - 1 && z === grassZ + 1) continue;
					if (x === grassX + 1 && z === grassZ - 1) continue;
					if (x === grassX + 1 && z === grassZ + 1) continue;
				}

				if (y === treeTop + grassY + 1 && x === grassX && z === grassZ)
					continue;

				blocks.push({ x, y, z, block: BLOCKS.LEAVES });
			}
		}
	}
	return blocks;
}

/**
 *
 * @param {number} temp
 * @param {number} humidity
 * @returns {{biome: BIOMES, weight: number}[]}
 */
function Biome(temp, humidity) {
	/** @type {{biome: BIOMES, weight: number}[]} */
	let biomes = [];

	const biome_radius = 0.4;

	for (const [key, value] of Object.entries(BIOMES)) {
		if (isNaN(temp) || isNaN(humidity)) console.warn(temp, humidity);

		const dx = temp - value.tempCenter;
		const dy = humidity - value.humidityCenter;

		if (!isFinite(dx) || !isFinite(dy)) {
			console.warn("INFINITE DISTANCE:");
			console.warn(temp, value.tempCenter);
			console.warn(humidity, value.humidityCenter);
			continue;
		}

		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > biome_radius) continue;

		const weight = Math.pow(1 - distance / biome_radius, 2);

		biomes.push({ biome: value, weight: weight });
	}

	if (biomes.length === 0) {
		console.warn(
			`No valid biomes for ${temp}, ${humidity}. Defaulting to PLAINS`
		);
		return [{ biome: BIOMES.PLAINS, weight: 1 }];
	}

	let weightSum = 0;

	for (const b of biomes) {
		weightSum += b.weight;
	}

	for (const b of biomes) {
		b.weight = b.weight / weightSum;
	}

	return biomes;
}

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {Float32Array} caveNoise
 * @returns {number}
 */
function GetCaveNoiseValAtPoint(x, y, z, caveNoise) {
	const cx0 = Math.floor(x / 4);
	const cy0 = Math.floor(y / 4);
	const cz0 = Math.floor(z / 4);

	const fx = (x % 4) / 4;
	const fy = (y % 4) / 4;
	const fz = (z % 4) / 4;

	const size4 = CHUNKSIZE / 4;

	const cx1 = Math.min(cx0 + 1, size4 - 1);
	const cy1 = Math.min(cy0 + 1, 32 - 1); // 32 is y divisions
	const cz1 = Math.min(cz0 + 1, size4 - 1);

	const n000 = caveNoise[cx0 + cz0 * size4 + cy0 * size4 * size4];
	const n100 = caveNoise[cx1 + cz0 * size4 + cy0 * size4 * size4];
	const n010 = caveNoise[cx0 + cz0 * size4 + cy1 * size4 * size4];
	const n110 = caveNoise[cx1 + cz0 * size4 + cy1 * size4 * size4];
	const n001 = caveNoise[cx0 + cz1 * size4 + cy0 * size4 * size4];
	const n101 = caveNoise[cx1 + cz1 * size4 + cy0 * size4 * size4];
	const n011 = caveNoise[cx0 + cz1 * size4 + cy1 * size4 * size4];
	const n111 = caveNoise[cx1 + cz1 * size4 + cy1 * size4 * size4];

	const nx00 = n000 * (1 - fx) + n100 * fx;
	const nx10 = n010 * (1 - fx) + n110 * fx;
	const nx01 = n001 * (1 - fx) + n101 * fx;
	const nx11 = n011 * (1 - fx) + n111 * fx;

	const nxy0 = nx00 * (1 - fy) + nx10 * fy;
	const nxy1 = nx01 * (1 - fy) + nx11 * fy;

	return nxy0 * (1 - fz) + nxy1 * fz;
}

self.onmessage = function (event) {
	const { chunkX, chunkZ, seed } = event.data;

	let blocks = BuildChunk(chunkX, chunkZ, seed);

	self.postMessage({ chunkX, chunkZ, blocks }, [blocks.buffer]);

	blocks = null;
};
