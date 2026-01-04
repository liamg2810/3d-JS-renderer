import { RLE } from "../Chunks/RLE.js";
import { BIOME_DATA, GetBiome } from "../Globals/Biomes/Biomes.js";
import {
	BLOCK_DATA,
	ILLUMINATION_ARRAY,
	TRANSPARENT_ARRAY,
} from "../Globals/Blocks/Blocks.js";
import {
	CAVE_NOISE_SCALE,
	CHUNKSIZE,
	CONTINENTIAL_NOISE_SCALE,
	HUMIDITY_NOISE_SCALE,
	MAX_HEIGHT,
	ORE_NOISE_SCALE,
	SPAGHETTI_CAVE_RANGE,
	SPAGHETTI_CAVE_VALUE,
	TEMPERATURE_NOISE_SCALE,
	TERRAIN_NOISE_SCALE,
	WATER_LEVEL,
	WEIRDNESS_NOISE_SCALE,
} from "../Globals/Constants.js";
import noise from "../Noise/perlin.js";
import { voronoi } from "../Noise/voronoi.js";

let lightSources = new Set();

export function BuildChunk(chunkX, chunkZ, seed) {
	let blocks = new Uint16Array(CHUNKSIZE * CHUNKSIZE * MAX_HEIGHT);

	let solidHeightmap = new Uint8Array(CHUNKSIZE * CHUNKSIZE);
	let transparentHeightmap = new Uint8Array(CHUNKSIZE * CHUNKSIZE);
	lightSources = new Set();

	noise.seed(seed);

	const step = 4;
	const size = CHUNKSIZE / step;
	const strideXZ = size;
	const strideY = size * size;

	const caveNoise = new Float32Array(size * size * (128 / step));

	for (let cx = 0, x = 0; cx < size; cx++, x += step) {
		const worldX = x + chunkX * CHUNKSIZE;
		const scaledX = worldX * CAVE_NOISE_SCALE;

		for (let cz = 0, z = 0; cz < size; cz++, z += step) {
			const worldZ = z + chunkZ * CHUNKSIZE;
			const scaledZ = worldZ * CAVE_NOISE_SCALE;

			let scaledY = 0;

			for (let cy = 0, y = 0; cy < 32; cy++, y += step) {
				let nVal = voronoi({ x: scaledX, y: scaledY, z: scaledZ });
				caveNoise[cx + cz * strideXZ + cy * strideY] = nVal[0];
				scaledY += step * CAVE_NOISE_SCALE;
			}
		}
	}

	for (let x = 0; x < CHUNKSIZE; x++) {
		const worldX = x + chunkX * CHUNKSIZE;
		for (let z = 0; z < CHUNKSIZE; z++) {
			const worldZ = z + chunkZ * CHUNKSIZE;

			let temp = noise.perlin2(
				worldX * TEMPERATURE_NOISE_SCALE,
				worldZ * TEMPERATURE_NOISE_SCALE
			);
			let humidity = noise.perlin2(
				worldX * HUMIDITY_NOISE_SCALE,
				worldZ * HUMIDITY_NOISE_SCALE
			);

			// temp = (temp + 1) / 2;
			// humidity = (humidity + 1) / 2;

			let continential =
				noise.perlin2(
					worldX * CONTINENTIAL_NOISE_SCALE,
					worldZ * CONTINENTIAL_NOISE_SCALE
				) +
				0.5 *
					noise.perlin2(
						worldX * CONTINENTIAL_NOISE_SCALE,
						worldZ * CONTINENTIAL_NOISE_SCALE
					) +
				0.25 *
					noise.perlin2(
						worldX * CONTINENTIAL_NOISE_SCALE,
						worldZ * CONTINENTIAL_NOISE_SCALE
					);

			continential = continential / (1 + 0.5 + 0.25);

			let weirdness =
				noise.perlin2(
					worldX * WEIRDNESS_NOISE_SCALE,
					worldZ * WEIRDNESS_NOISE_SCALE
				) +
				0.5 *
					noise.perlin2(
						worldX * WEIRDNESS_NOISE_SCALE,
						worldZ * WEIRDNESS_NOISE_SCALE
					) +
				0.25 *
					noise.perlin2(
						worldX * WEIRDNESS_NOISE_SCALE,
						worldZ * WEIRDNESS_NOISE_SCALE
					) +
				noise.perlin2(
					worldX * WEIRDNESS_NOISE_SCALE,
					worldZ * WEIRDNESS_NOISE_SCALE
				);

			weirdness = weirdness / (1 + 0.5 + 0.25);

			// let biomes = Biome(temp, humidity);

			let biomes = [];

			if (continential > -0.1) {
				biomes = Biome((temp + 1) / 2, (humidity + 1) / 2);
			} else if (continential > -0.2) {
				const blend = (continential + 0.2) * 10;

				const land = blend;

				const desert = Math.abs(0.5 - blend);

				const total = land + desert;

				biomes = [
					{
						biome: GetBiome("desert"),
						weight: desert / total,
					},
					{
						biome: GetBiome("plains"),
						weight: land / total,
					},
				];
			} else if (continential > -0.3) {
				const blend = (continential + 0.3) * 10;

				const desert = blend;

				const ocean = 1 - blend;

				const total = ocean + desert;

				biomes = [
					{
						biome: GetBiome("desert"),
						weight: desert / total,
					},
					{
						biome: GetBiome("ocean"),
						weight: ocean / total,
					},
				];
			} else {
				const blend = Math.abs(continential);

				const desert = 0.3 - blend;
				const ocean = blend;

				const total = desert + ocean;

				biomes = [
					{ biome: GetBiome("ocean"), weight: ocean / total },
					{
						biome: GetBiome("desert"),
						weight: desert / total,
					},
				];
			}

			let chosenBiome = GetBiome("plains");

			let height = 0;
			let heightVariation = 0;
			let maxWeight = 0;

			for (const b of biomes) {
				if (maxWeight < b.weight) {
					chosenBiome = b.biome;
					maxWeight = b.weight;
				}

				height += b.biome.base_height * b.weight;
				heightVariation += b.biome.height_variation * b.weight;
			}

			let elevation =
				height +
				(noise.perlin2(
					worldX * TERRAIN_NOISE_SCALE,
					worldZ * TERRAIN_NOISE_SCALE
				) +
					1) *
					heightVariation;

			elevation = Math.round(elevation);

			let block = chosenBiome.surface_block;

			if (elevation < WATER_LEVEL) {
				let b = BLOCK_DATA["water"].code;

				if (chosenBiome === GetBiome("ocean") && temp < -0.45) {
					b = BLOCK_DATA["ice"].code;
				}
				elevation -= 1;

				blocks[x + z * CHUNKSIZE + WATER_LEVEL * MAX_HEIGHT] = b;

				for (let y = WATER_LEVEL - 1; y > elevation + 1; y--) {
					blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] =
						BLOCK_DATA["water"].code;
				}

				block = BLOCK_DATA["sand"].code;

				if (
					chosenBiome === GetBiome("ocean") &&
					noise.perlin2(worldX * 0.2, worldZ * 0.2) < -0.3
				) {
					block = BLOCK_DATA["stone"].code;
				}
			}

			BuildUnderground(
				x,
				z,
				elevation,
				chosenBiome,
				caveNoise,
				blocks,
				worldX,
				worldZ
			);

			if (CarveCave(x, elevation, z, caveNoise, SPAGHETTI_CAVE_VALUE)) {
				continue;
			}

			if (ILLUMINATION_ARRAY[block] > 0) {
				lightSources.add(x + z * CHUNKSIZE + elevation * MAX_HEIGHT);
			}

			blocks[x + z * CHUNKSIZE + elevation * MAX_HEIGHT] =
				(chosenBiome.code << 8) | block;

			const treeNoise = Math.random();

			if (
				elevation > 64 &&
				block === BLOCK_DATA["grass"].code &&
				treeNoise > 1 - chosenBiome.tree_chance
			) {
				let tree = [];

				if (
					chosenBiome === GetBiome("plains") ||
					chosenBiome === GetBiome("grasslands")
				) {
					tree = DrawPlainsTree(x, elevation, z);
				}

				if (chosenBiome === GetBiome("taiga")) {
					tree = DrawTaigaTree(x, elevation, z);
				}

				tree.forEach((b) => {
					if (
						blocks[b.x + b.z * CHUNKSIZE + b.y * MAX_HEIGHT] !==
						BLOCK_DATA["air"].code
					) {
						return;
					}

					blocks[b.x + b.z * CHUNKSIZE + b.y * MAX_HEIGHT] = b.block;
				});
			} else if (
				block === BLOCK_DATA["grass"].code &&
				elevation > 64 &&
				treeNoise < 0.05
			) {
				blocks[x + z * CHUNKSIZE + (elevation + 1) * MAX_HEIGHT] =
					BLOCK_DATA["poppy"].code;
			}
		}
	}

	for (let xz = 0; xz < 16 * 16; xz++) {
		let foundTransparent = false;

		for (let y = 255; y >= 0; y--) {
			const data = blocks[xz + y * 256];
			const block = data & 0xff;

			if (
				!foundTransparent &&
				block !== BLOCK_DATA["air"].code &&
				TRANSPARENT_ARRAY[block]
			) {
				foundTransparent = true;

				transparentHeightmap[xz] = y;
			}

			if (!TRANSPARENT_ARRAY[block]) {
				if (!foundTransparent) {
					transparentHeightmap[xz] = y;
				}

				solidHeightmap[xz] = y;

				break;
			}
		}
	}

	return {
		blocks: RLE(blocks),
		transparentHeightmap,
		solidHeightmap,
		lightSources,
	};
}

function BuildUnderground(
	x,
	z,
	elevation,
	chosenBiome,
	caveNoise,
	blocks,
	worldX,
	worldZ
) {
	for (let y = elevation - 1; y > 1; y--) {
		let caveVal = -0.4;

		if (y < elevation / 1.5) {
			caveVal = -0.3;
		}

		if (y < elevation / 2) {
			caveVal = -0.2;
		}

		if (y < elevation / 3) {
			caveVal = -0.4;
		}

		let belowB = BLOCK_DATA["stone"].code;

		let oreNoise = noise.perlin3(
			worldX * ORE_NOISE_SCALE,
			y * ORE_NOISE_SCALE,
			worldZ * ORE_NOISE_SCALE
		);

		if (oreNoise < -0.7) {
			belowB = BLOCK_DATA["coal"].code;
		}

		if (y >= elevation - 3) {
			belowB = chosenBiome.subsurface_block;
		}

		if (CarveCave(x, y, z, caveNoise)) {
			belowB = BLOCK_DATA["air"].code;
		}

		if (ILLUMINATION_ARRAY[belowB] > 0) {
			lightSources.add(x + z * CHUNKSIZE + y * MAX_HEIGHT);
		}
		blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] = belowB;
	}

	for (let y = 1; y >= 0; y--) {
		// Bedrock
		blocks[x + z * CHUNKSIZE + y * MAX_HEIGHT] = BLOCK_DATA["bedrock"].code;
	}
}

function CarveCave(x, y, z, caveNoise, caveVal = SPAGHETTI_CAVE_VALUE) {
	const nVal = GetCaveNoiseValAtPoint(x, y, z, caveNoise);

	return Math.abs(nVal - caveVal) < SPAGHETTI_CAVE_RANGE;
}

/**
 *
 * @param {number} grassX
 * @param {number} grassY
 * @param {number} grassZ
 * @returns {{x: number, y: number, z: number, block: number}[]}
 */
function DrawPlainsTree(grassX, grassY, grassZ) {
	let blocks = [];

	const treeTop = Math.round(Math.random() * 1 + 2);

	for (let y = grassY + 1; y < grassY + treeTop + 2; y++) {
		blocks.push({
			x: grassX,
			y: y,
			z: grassZ,
			block: BLOCK_DATA["log"].code,
		});
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

				blocks.push({ x, y, z, block: BLOCK_DATA["leaves"].code });
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
 * @returns {{x: number, y: number, z: number, block: number}[]}
 */
function DrawTaigaTree(grassX, grassY, grassZ) {
	let blocks = [];

	const treeTop = Math.round(Math.random() * 1 + 10);

	for (let y = grassY + 1; y < grassY + treeTop + 2; y++) {
		blocks.push({
			x: grassX,
			y: y,
			z: grassZ,
			block: BLOCK_DATA["spruce_log"].code,
		});
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

				blocks.push({
					x,
					y,
					z,
					block: BLOCK_DATA["spruce_leaves"].code,
				});
			}
		}
	}

	for (let y = treeTop + grassY - 2; y > treeTop + grassY - 8; y -= 2) {
		for (let x = grassX - 2; x <= grassX + 2; x++) {
			for (let z = grassZ - 2; z <= grassZ + 2; z++) {
				if (x < 0 || z < 0 || x >= CHUNKSIZE || z >= CHUNKSIZE)
					continue;

				if (x === grassX && z === grassZ) {
					continue;
				}

				if (x === grassX - 2 && z === grassZ - 2) continue;
				if (x === grassX - 2 && z === grassZ + 2) continue;
				if (x === grassX + 2 && z === grassZ - 2) continue;
				if (x === grassX + 2 && z === grassZ + 2) continue;

				blocks.push({
					x,
					y,
					z,
					block: BLOCK_DATA["spruce_leaves"].code,
				});
			}
		}
	}

	return blocks;
}

/**
 *
 * @param {number} temp
 * @param {number} humidity
 * @returns {{biome: number, weight: number}[]}
 */
function Biome(temp, humidity) {
	/** @type {{biome: number, weight: number}[]} */
	let biomes = [];

	const biome_radius = 0.2;

	for (const [key, value] of Object.entries(BIOME_DATA)) {
		if (isNaN(temp) || isNaN(humidity)) console.warn(temp, humidity);

		const dx = temp - value.temp_center;
		const dy = humidity - value.humidity_center;

		if (!isFinite(dx) || !isFinite(dy)) {
			// console.warn("INFINITE DISTANCE:");
			// console.warn(temp, value.tempCenter);
			// console.warn(humidity, value.humidityCenter);
			continue;
		}

		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > biome_radius) continue;

		const weight = Math.pow(1 - distance / biome_radius, 2);

		biomes.push({ biome: value, weight: weight });
	}

	if (biomes.length === 0) {
		// console.warn(
		// 	`No valid biomes for ${temp}, ${humidity}. Defaulting to PLAINS`
		// );
		return [{ biome: GetBiome("plains"), weight: 1 }];
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
