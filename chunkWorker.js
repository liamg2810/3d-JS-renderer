import * as perlin2D from "./Perlin2D.js";
import * as perlin3D from "./Perlin3D.js";
import { Cube, Water } from "./Primitives.js";

const textures = {
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
};

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

const CHUNKSIZE = 15;
const TERRAIN_NOISE_SCALE = 0.025;
const TEMPERATURE_NOISE_SCALE = 0.005;
const HUMIDITY_NOISE_SCALE = 0.02;
const CAVE_NOISE_SCALE = TERRAIN_NOISE_SCALE * 5;
const ORE_NOISE_SCALE = TERRAIN_NOISE_SCALE * 3;

const MAX_HEIGHT = 255;

function BuildChunk(chunkX, chunkZ, seed) {
	let blocks = new Uint32Array(CHUNKSIZE * CHUNKSIZE * MAX_HEIGHT);

	for (let x = 0; x <= CHUNKSIZE; x++) {
		for (let z = 0; z <= CHUNKSIZE; z++) {
			for (let y = 0; y < MAX_HEIGHT; y++) {
				blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] =
					(x << 12) | (y << 4) | z;
			}
		}
	}

	let water = [];

	perlin2D.SetSeed(seed);
	perlin3D.SetSeed(seed);

	let caveNoise = new Float32Array(
		((CHUNKSIZE + 1) / 4) * ((CHUNKSIZE + 1) / 4) * 32
	);

	for (let x = 0; x < CHUNKSIZE + 1; x += 4) {
		const cx = x / 4;
		const worldX = x + chunkX * (CHUNKSIZE + 1);
		for (let z = 0; z < CHUNKSIZE + 1; z += 4) {
			const cz = z / 4;
			const worldZ = z + chunkZ * (CHUNKSIZE + 1);
			for (let y = 0; y < 128; y += 4) {
				const cy = y / 4;
				const nVal = perlin3D.perlin3D(
					worldX * CAVE_NOISE_SCALE,
					y * CAVE_NOISE_SCALE,
					worldZ * CAVE_NOISE_SCALE
				);

				caveNoise[
					cx +
						cz * ((CHUNKSIZE + 1) / 4) +
						cy * ((CHUNKSIZE + 1) / 4) * ((CHUNKSIZE + 1) / 4)
				] = nVal;
			}
		}
	}

	for (let x = 0; x <= CHUNKSIZE; x++) {
		const worldX = x + chunkX * CHUNKSIZE;
		for (let z = 0; z <= CHUNKSIZE; z++) {
			const worldZ = z + chunkZ * CHUNKSIZE;

			let elevation =
				perlin2D.perlin2D(
					worldX * TERRAIN_NOISE_SCALE,
					worldZ * TERRAIN_NOISE_SCALE
				) +
				0.5 *
					perlin2D.perlin2D(
						2 * worldX * TERRAIN_NOISE_SCALE,
						2 * worldZ * TERRAIN_NOISE_SCALE
					) +
				0.25 *
					perlin2D.perlin2D(
						4 * worldX * TERRAIN_NOISE_SCALE,
						4 * worldZ * TERRAIN_NOISE_SCALE
					) +
				1;

			// elevation = elevation / (1 + 0.5 + 0.25);

			const temp =
				perlin2D.perlin2D(
					worldX * TEMPERATURE_NOISE_SCALE,
					worldZ * TEMPERATURE_NOISE_SCALE
				) + 0.5;
			const humidity =
				perlin2D.perlin2D(
					worldX * HUMIDITY_NOISE_SCALE,
					worldZ * HUMIDITY_NOISE_SCALE
				) + 0.5;

			const block = Biome(elevation, temp, humidity);

			if (elevation < 0.4) {
				const b = (BLOCKS.WATER << 16) | (x << 12) | (68 << 4) | z;
				blocks[x + z * CHUNKSIZE + 68 * MAX_HEIGHT] = b;

				elevation -= 0.1;
			}

			const height = Math.round(elevation * 10) + 64;

			const b = (block << 16) | (x << 12) | (height << 4) | z;

			blocks[x + z * CHUNKSIZE + height * MAX_HEIGHT] = b;

			const treeNoise = Math.random();

			// no trees <#-#>
			// if (elevation > 0.4 && tex === textures.GRASS && treeNoise > 0.99) {
			// 	const tree = DrawTree(x, height, z);

			// 	verts.push(...tree);
			// }

			for (let y = height - 1; y > 2; y--) {
				let caveVal = 0.35;

				if (y < height / 1.5) {
					caveVal = 0.425;
				}

				if (y < height / 2) {
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

				if (y >= height - 3) {
					belowB = BLOCKS.DIRT;
				}

				if (y < height - 3) {
					const nVal = GetCaveNoiseValAtPoint(x, y, z, caveNoise);

					if (nVal < caveVal) {
						belowB = BLOCKS.AIR;
					}
				}

				const b = (belowB << 16) | (x << 12) | (y << 4) | z;

				blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] = b;
			}

			for (let y = 2; y > 0; y--) {
				// Bedrock
				const b = (BLOCKS.BEDROCK << 16) | (x << 12) | (y << 4) | z;

				blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] = b;
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
 * @returns {number[]}
 */
function DrawTree(grassX, grassY, grassZ) {
	let verts = [];

	const treeTop = Math.round(Math.random() * 1 + 2);

	for (let y = grassY + 1; y < grassY + treeTop + 2; y++) {
		verts.push(...Cube(grassX, y, grassZ, textures.LOG));
	}

	for (let y = treeTop + grassY; y <= treeTop + grassY + 2; y++) {
		for (let x = grassX - 1; x <= grassX + 1; x++) {
			for (let z = grassZ - 1; z <= grassZ + 1; z++) {
				if (x < 0 || z < 0 || x >= CHUNKSIZE || z >= CHUNKSIZE)
					continue;

				if (y === treeTop + grassY + 2) {
					if (x === grassX - 1 && z === grassZ - 1) continue;
					if (x === grassX - 1 && z === grassZ + 1) continue;
					if (x === grassX + 1 && z === grassZ - 1) continue;
					if (x === grassX + 1 && z === grassZ + 1) continue;
				}

				if (y === treeTop + grassY + 1 && x === grassX && z === grassZ)
					continue;

				verts.push(...Cube(x, y, z, textures.LEAVES));
			}
		}
	}
	return verts;
}

/**
 *
 * @param {number} e
 * @param {number} temp
 * @param {number} humidity
 */
function Biome(e, temp, humidity) {
	if (e < 0.45 && e > 0.4) return BLOCKS.SAND;
	if (e > 1.4 && temp <= 0.6) return BLOCKS.STONE;
	if (temp > 0.6 && humidity < 0.4) return BLOCKS.SAND;
	// if (temp < 0.3 && e > 1.0) return textures.STONE;
	return BLOCKS.GRASS;
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

	const size4 = (CHUNKSIZE + 1) / 4;

	const cx1 = Math.min(cx0 + 1, size4);
	const cy1 = Math.min(cy0 + 1, 32 - 1); // 32 is y divisions
	const cz1 = Math.min(cz0 + 1, size4);

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
