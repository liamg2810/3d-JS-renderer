import { perlin2D } from "./Perlin2D.js";
import { perlin3D } from "./Perlin3D.js";
import { Cube, Water } from "./Primitives.js";
import { Vector3 } from "./Vectors.js";

const textures = {
	GRASS: {
		top: {
			x: 1,
			y: 0,
		},
		base: {
			x: 0,
			y: 0,
		},
		bottom: {
			x: 1,
			y: 1,
		},
	},
	LOG: {
		top: {
			x: 4,
			y: 0,
		},
		bottom: {
			x: 4,
			y: 0,
		},
		base: {
			x: 3,
			y: 0,
		},
	},
	SAND: {
		base: {
			x: 5,
			y: 0,
		},
	},
	WATER: {
		base: {
			x: 6,
			y: 0,
		},
	},
	LEAVES: {
		base: {
			x: 2,
			y: 0,
		},
	},
	STONE: {
		base: {
			x: 0,
			y: 1,
		},
	},
	DIRT: {
		base: {
			x: 1,
			y: 1,
		},
	},
	COAL: {
		base: { x: 2, y: 1 },
	},
	BEDROCK: {
		base: { x: 3, y: 1 },
	},
};

function DrawTree(renderer, grassX, grassY, grassZ, blockSize) {
	if (Math.random() > 0.005) {
		return;
	}

	const treeTop = Math.round(Math.random() * 1 + 2);

	for (let y = grassY + 1; y < grassY + treeTop + 2; y++) {
		renderer.objects.push(
			Cube(
				renderer,
				new Vector3(
					grassX * blockSize,
					y * blockSize,
					grassZ * blockSize
				),
				blockSize,
				blockSize,
				textures.LOG
			)
		);
	}

	for (let y = treeTop + grassY; y <= treeTop + grassY + 2; y++) {
		for (let x = grassX - 1; x <= grassX + 1; x++) {
			for (let z = grassZ - 1; z <= grassZ + 1; z++) {
				if (y === treeTop + grassY + 2) {
					if (x === grassX - 1 && z === grassZ - 1) continue;
					if (x === grassX - 1 && z === grassZ + 1) continue;
					if (x === grassX + 1 && z === grassZ - 1) continue;
					if (x === grassX + 1 && z === grassZ + 1) continue;
				}

				if (y === treeTop + grassY + 1 && x === grassX && z === grassZ)
					continue;

				renderer.objects.push(
					Cube(
						renderer,
						new Vector3(
							x * blockSize,
							y * blockSize,
							z * blockSize
						),
						blockSize,
						blockSize,
						textures.LEAVES
					)
				);
			}
		}
	}
}

function biome(e, temp, humidity) {
	if (e < 0.45 && e > 0.4) return textures.SAND;
	if (e > 1.2 && temp < 0.6 && humidity > 0.4) return textures.STONE;
	if (temp > 0.6 && humidity < 0.4) return textures.SAND;
	// if (temp < 0.3 && e > 1.0) return textures.STONE;
	return textures.GRASS;
}

function IsSurrounded(
	x,
	y,
	z,
	noiseScale,
	chunkSize,
	chunkHeight,
	chunkX,
	chunkZ,
	caveVal
) {
	let surrounded = true;
	const neighbors = [
		[x + 1, y, z],
		[x - 1, y, z],
		[x, y + 1, z],
		[x, y - 1, z],
		[x, y, z + 1],
		[x, y, z - 1],
	];
	for (const [nx, ny, nz] of neighbors) {
		if (
			nx < chunkX * chunkSize ||
			nx >= chunkSize + chunkX * chunkSize ||
			ny < 1 ||
			ny > chunkHeight ||
			nz < chunkZ * chunkSize ||
			nz >= chunkSize + chunkZ * chunkSize ||
			perlin3D(nx * noiseScale, ny * noiseScale, nz * noiseScale) <
				caveVal
		) {
			surrounded = false;
			break;
		}
	}
	return surrounded;
}

function GenerateChunk(renderer, startX, startZ) {
	const chunkSize = 16;
	const chunkHeight = 20;

	const baseNoiseScale = 0.025;
	const tempNoiseScale = 0.005;
	const humidityNoiseScale = 0.02;

	const blockSize = 5;

	for (let x = startX * chunkSize; x < chunkSize + startX * chunkSize; x++) {
		for (
			let z = startZ * chunkSize;
			z < chunkSize + startZ * chunkSize;
			z++
		) {
			let elevation =
				perlin2D(x * baseNoiseScale, z * baseNoiseScale) +
				0.5 * perlin2D(2 * x * baseNoiseScale, 2 * z * baseNoiseScale) +
				0.25 *
					perlin2D(4 * x * baseNoiseScale, 4 * z * baseNoiseScale) +
				1;

			elevation = elevation / (1 + 0.25);

			const temp = perlin2D(x * tempNoiseScale, z * tempNoiseScale) + 0.5;
			const humidity =
				perlin2D(x * humidityNoiseScale, z * humidityNoiseScale) + 0.5;

			const tex = biome(elevation, temp, humidity);

			if (elevation < 0.4) {
				renderer.water.push(
					Water(
						renderer,
						new Vector3(
							x * blockSize,
							(Math.round(0.4 * 10) + 64) * blockSize - 0.2,
							z * blockSize
						),
						blockSize,
						textures.WATER
					)
				);

				elevation -= 0.1;
			}
			const height = Math.round(elevation * 10) + 64;

			if (tex === textures.GRASS && elevation > 0.4) {
				DrawTree(renderer, x, height, z, blockSize);
			}

			const caveNoiseScale = baseNoiseScale * 5;

			const oreNoiseVal = baseNoiseScale * 3;

			for (let y = height - 1; y > 2; y--) {
				let caveVal = 0.35;

				if (y < height / 1.5) {
					caveVal = 0.425;
				}

				if (y < height / 2) {
					caveVal = 0.5;
				}

				if (
					IsSurrounded(
						x,
						y,
						z,
						caveNoiseScale,
						chunkSize,
						height,
						startX,
						startZ,
						caveVal
					)
				)
					continue;

				let belowT = textures.STONE;
				const oreNoise = perlin3D(
					x * oreNoiseVal,
					y * oreNoiseVal,
					z * oreNoiseVal
				);

				if (oreNoise < 0.2) {
					belowT = textures.COAL;
				}

				if (y >= height - 3) {
					belowT = textures.DIRT;
				}

				if (y < height - 3) {
					const nVal = perlin3D(
						x * caveNoiseScale,
						y * caveNoiseScale,
						z * caveNoiseScale
					);

					if (nVal < caveVal) {
						continue;
					}
				}

				renderer.objects.push(
					Cube(
						renderer,
						new Vector3(
							x * blockSize,
							y * blockSize,
							z * blockSize
						),
						blockSize,
						blockSize,
						belowT
					)
				);
			}

			for (let y = 2; y > 0; y--) {
				renderer.objects.push(
					Cube(
						renderer,
						new Vector3(
							x * blockSize,
							y * blockSize,
							z * blockSize
						),
						blockSize,
						blockSize,
						textures.BEDROCK
					)
				);
			}

			renderer.objects.push(
				Cube(
					renderer,
					new Vector3(
						x * blockSize,
						height * blockSize,
						z * blockSize
					),
					blockSize,
					blockSize,
					tex
				)
			);
		}
	}
}

export function VoxelTerrainScene(renderer) {
	renderer.objects = [];
	renderer.water = [];

	const chunks = 4;

	for (let x = 0; x < chunks; x++) {
		for (let z = 0; z < chunks; z++) {
			GenerateChunk(renderer, x, z);
		}
	}
}
