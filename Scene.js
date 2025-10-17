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
	},
	LOG: {
		top: {
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
};

function biome(e, temp, humidity) {
	if (e < 0.45 && e > 0.4) return textures.SAND;
	if (e > 1.2 && temp < 0.6 && humidity > 0.4) return textures.STONE;
	if (temp > 0.6 && humidity < 0.4) return textures.SAND;
	// if (temp < 0.3 && e > 1.0) return textures.STONE;
	return textures.GRASS;
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
							Math.round(0.4 * 10) * blockSize - 0.2,
							z * blockSize
						),
						blockSize,
						textures.WATER
					)
				);

				elevation -= 0.1;
			}

			renderer.objects.push(
				Cube(
					renderer,
					new Vector3(
						x * blockSize,
						Math.round(elevation * 10) * blockSize,
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

	const scale = 5;
	const yScale = 10;
	const grid = 50;
	const noiseScale = 0.05;
	const chunks = 15;

	for (let x = 0; x < chunks; x++) {
		for (let z = 0; z < chunks; z++) {
			GenerateChunk(renderer, x, z);
		}
	}
}
