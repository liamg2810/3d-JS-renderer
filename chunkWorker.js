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

const CHUNKSIZE = 16;
const TERRAIN_NOISE_SCALE = 0.025;
const TEMPERATURE_NOISE_SCALE = 0.005;
const HUMIDITY_NOISE_SCALE = 0.02;
const CAVE_NOISE_SCALE = TERRAIN_NOISE_SCALE * 5;
const ORE_NOISE_SCALE = TERRAIN_NOISE_SCALE * 3;

const MAX_HEIGHT = 255;

function BuildChunk(chunkX, chunkZ, seed) {
	/** @type {number[] } */
	let blocks = [];
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

			const tex = Biome(elevation, temp, humidity);

			if (elevation < 0.4) {
				blocks.push(
					...Water(x, Math.round(0.4 * 10) + 64, z, textures.WATER)
				);

				elevation -= 0.1;
			}

			const height = Math.round(elevation * 10) + 64;

			blocks.push(...Cube(x, height, z, tex));

			const treeNoise = Math.random();

			if (elevation > 0.4 && tex === textures.GRASS && treeNoise > 0.99) {
				const tree = DrawTree(x, height, z);

				blocks.push(...tree);
			}

			for (let y = height - 1; y > 2; y--) {
				let caveVal = 0.35;

				if (y < height / 1.5) {
					caveVal = 0.425;
				}

				if (y < height / 2) {
					caveVal = 0.5;
				}

				const culled = GetCulledFaces(x, y, z, caveVal, caveNoise);

				if (culled.length === 6)
					// All faces
					continue;

				let belowT = textures.STONE;
				const oreNoise = perlin3D.perlin3D(
					x * ORE_NOISE_SCALE,
					y * ORE_NOISE_SCALE,
					z * ORE_NOISE_SCALE
				);

				if (oreNoise < 0.2) {
					belowT = textures.COAL;
				}

				if (y >= height - 3) {
					belowT = textures.DIRT;
				}

				if (y < height - 3) {
					const nVal = GetCaveNoiseValAtPoint(x, y, z, caveNoise);

					if (nVal < caveVal) {
						continue;
					}
				}

				blocks.push(...Cube(x, y, z, belowT, culled));
			}

			for (let y = 2; y > 0; y--) {
				// Bedrock
				blocks.push(...Cube(x, y, z, textures.BEDROCK));
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
 * @returns {ThreeDObject[]}
 */
function DrawTree(grassX, grassY, grassZ) {
	let blocks = [];

	const treeTop = Math.round(Math.random() * 1 + 2);

	for (let y = grassY + 1; y < grassY + treeTop + 2; y++) {
		blocks.push(...Cube(grassX, y, grassZ, textures.LOG));
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

				blocks.push(...Cube(x, y, z, textures.LEAVES));
			}
		}
	}
	return blocks;
}

/**
 *
 * @param {number} e
 * @param {number} temp
 * @param {number} humidity
 */
function Biome(e, temp, humidity) {
	if (e < 0.45 && e > 0.4) return textures.SAND;
	if (e > 1.4 && temp <= 0.6) return textures.STONE;
	if (temp > 0.6 && humidity < 0.4) return textures.SAND;
	// if (temp < 0.3 && e > 1.0) return textures.STONE;
	return textures.GRASS;
}

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} caveVal
 * @param {Float32Array} caveNoise
 * @returns {number[]}
 */
function GetCulledFaces(x, y, z, caveVal, caveNoise) {
	let toCull = [];

	const neighbors = [
		[x, y + 1, z],
		[x, y - 1, z],
		[x - 1, y, z],
		[x + 1, y, z],
		[x, y, z + 1],
		[x, y, z - 1],
	];

	for (let i = 0; i < neighbors.length; i++) {
		const [nx, ny, nz] = neighbors[i];

		if (
			nx < 0 ||
			nx >= CHUNKSIZE ||
			nz < 0 ||
			nz >= CHUNKSIZE ||
			ny < 1 ||
			ny > MAX_HEIGHT
		) {
			continue;
		}

		const nVal = GetCaveNoiseValAtPoint(nx, ny, nz, caveNoise);

		if (nVal >= caveVal) {
			toCull.push(i);
		}
	}

	return toCull;
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

	let typedBlocks = new Uint32Array(blocks);

	self.postMessage({ chunkX, chunkZ, blocks: typedBlocks }, [
		typedBlocks.buffer,
	]);

	blocks = null;
	typedBlocks = null;
};
