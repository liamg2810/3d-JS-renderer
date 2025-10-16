import { perlin3D } from "./Perlin3D.js";
import { Cube, SquareBasedPyramid, ThreeDObject } from "./Primitives.js";
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

function IsSurrounded(x, y, z, noiseScale, chunkSize, chunkHeight) {
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
			nx < 0 ||
			nx >= chunkSize ||
			ny < 1 ||
			ny > chunkHeight ||
			nz < 0 ||
			nz >= chunkSize ||
			perlin3D(nx * noiseScale, ny * noiseScale, nz * noiseScale) >= 0.5
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
	const noiseScale = 0.05;
	const blockSize = 5;

	for (let y = chunkHeight; y > 0; y--) {
		for (
			let x = startX * chunkSize;
			x < chunkSize + startX * chunkSize;
			x++
		) {
			for (
				let z = startZ * chunkSize;
				z < chunkSize + startZ * chunkSize;
				z++
			) {
				if (IsSurrounded(x, y, z, noiseScale)) {
					// continue;
				}

				const noiseVal = perlin3D(
					x * noiseScale,
					y * noiseScale,
					z * noiseScale
				);
				let tex = textures.GRASS;

				if (noiseVal < 0.4) {
					continue;
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
						tex
					)
				);
			}
		}
	}
}

export function VoxelTerrainScene(renderer) {
	renderer.objects = [];

	const scale = 5;
	const yScale = 10;
	const grid = 50;
	const noiseScale = 0.05;
	const chunks = 5;

	for (let i = 0; i < chunks; i++) {
		GenerateChunk(renderer, i, 0);
	}
}
