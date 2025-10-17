import { perlin2D } from "./Perlin2D.js";
import { perlin3D } from "./Perlin3D.js";
import { Cube, ThreeDObject, Water } from "./Primitives.js";
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

export class Chunk {
	SIZE = 16;
	MAX_HEIGHT = 255;

	TERRAIN_NOISE_SCALE = 0.025;
	TEMPERATURE_NOISE_SCALE = 0.005;
	HUMIDITY_NOISE_SCALE = 0.02;
	CAVE_NOISE_SCALE = this.TERRAIN_NOISE_SCALE * 5;

	BLOCK_SIZE = 5;

	vertCount = 0;

	x = 0;
	z = 0;

	/** @type {WebGL2RenderingContext} */
	gl;

	blockBuffer;
	waterBuffer;

	/**
	 *
	 * @param {WebGL2RenderingContext} gl
	 * @param {number} x
	 * @param {number} z
	 */
	constructor(gl, x, z) {
		this.x = x;
		this.z = z;
		this.gl = gl;

		/** @type {number[] } */
		let blocks = [];
		let water = [];

		for (let x = 0; x < this.SIZE; x++) {
			for (let z = 0; z < this.SIZE; z++) {
				const worldX = x + this.x * this.SIZE;
				const worldZ = z + this.z * this.SIZE;

				let elevation =
					perlin2D(
						worldX * this.TERRAIN_NOISE_SCALE,
						worldZ * this.TERRAIN_NOISE_SCALE
					) +
					0.5 *
						perlin2D(
							2 * worldX * this.TERRAIN_NOISE_SCALE,
							2 * worldZ * this.TERRAIN_NOISE_SCALE
						) +
					0.25 *
						perlin2D(
							4 * worldX * this.TERRAIN_NOISE_SCALE,
							4 * worldZ * this.TERRAIN_NOISE_SCALE
						) +
					1;

				elevation = elevation / (1 + 0.25);

				// const temp =
				// 	perlin2D(
				// 		x * this.SIZE * this.TEMPERATURE_NOISE_SCALE,
				// 		z * this.SIZE * this.TEMPERATURE_NOISE_SCALE
				// 	) + 0.5;
				// const humidity =
				// 	perlin2D(
				// 		x * this.SIZE * this.HUMIDITY_NOISE_SCALE,
				// 		z * this.SIZE * this.HUMIDITY_NOISE_SCALE
				// 	) + 0.5;

				// const tex = this.Biome(elevation, temp, humidity);

				// if (elevation < 0.4) {
				// 	water.push(
				// 		Water(
				// 			new Vector3(
				// 				x * this.BLOCK_SIZE,
				// 				(Math.round(0.4 * 10) + 64) * this.BLOCK_SIZE -
				// 					0.2,
				// 				z * this.BLOCK_SIZE
				// 			),
				// 			this.BLOCK_SIZE,
				// 			textures.WATER
				// 		)
				// 	);

				// 	elevation -= 0.1;
				// }

				const height = Math.round(elevation * 10) + 64;

				blocks.push(...Cube(new Vector3(x, height, z), 0));

				if (elevation > 0.4) {
					const tree = this.DrawTree(x, height, z);

					blocks.push(...tree);
				}

				// const oreNoiseVal = this.TERRAIN_NOISE_SCALE * 3;

				for (let y = height - 1; y > 2; y--) {
					let caveVal = 0.35;

					if (y < height / 1.5) {
						caveVal = 0.425;
					}

					if (y < height / 2) {
						caveVal = 0.5;
					}

					if (this.IsSurrounded(x, y, z, caveVal)) continue;

					// let belowT = textures.STONE;
					// const oreNoise = perlin3D(
					// 	x * oreNoiseVal,
					// 	y * oreNoiseVal,
					// 	z * oreNoiseVal
					// );

					// if (oreNoise < 0.2) {
					// 	belowT = textures.COAL;
					// }

					// if (y >= height - 3) {
					// 	belowT = textures.DIRT;
					// }

					if (y < height - 3) {
						const nVal = perlin3D(
							worldX * this.CAVE_NOISE_SCALE,
							y * this.CAVE_NOISE_SCALE,
							worldZ * this.CAVE_NOISE_SCALE
						);

						if (nVal < caveVal) {
							continue;
						}
					}

					blocks.push(...Cube(new Vector3(x, y, z), 0));
				}

				for (let y = 2; y > 0; y--) {
					// Bedrock
					blocks.push(...Cube(new Vector3(x, y, z), 0));
				}
			}
		}

		this.blockBuffer = gl.createBuffer();
		this.gl.bindBuffer(gl.ARRAY_BUFFER, this.blockBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Uint32Array(blocks),
			this.gl.STATIC_DRAW
		);

		this.vertCount = blocks.length;
	}

	/**
	 *
	 * @param {number} grassX
	 * @param {number} grassY
	 * @param {number} grassZ
	 * @returns {ThreeDObject[]}
	 */
	DrawTree(grassX, grassY, grassZ) {
		let blocks = [];

		if (Math.random() > 0.005) {
			return [];
		}

		const treeTop = Math.round(Math.random() * 1 + 2);

		for (let y = grassY + 1; y < grassY + treeTop + 2; y++) {
			blocks.push(...Cube(new Vector3(grassX, y, grassZ), 0));
		}

		for (let y = treeTop + grassY; y <= treeTop + grassY + 2; y++) {
			for (let x = grassX - 1; x <= grassX + 1; x++) {
				for (let z = grassZ - 1; z <= grassZ + 1; z++) {
					if (x < 0 || z < 0 || x >= this.SIZE || z >= this.SIZE)
						continue;

					if (y === treeTop + grassY + 2) {
						if (x === grassX - 1 && z === grassZ - 1) continue;
						if (x === grassX - 1 && z === grassZ + 1) continue;
						if (x === grassX + 1 && z === grassZ - 1) continue;
						if (x === grassX + 1 && z === grassZ + 1) continue;
					}

					if (
						y === treeTop + grassY + 1 &&
						x === grassX &&
						z === grassZ
					)
						continue;

					blocks.push(...Cube(new Vector3(x, y, z), 0));
				}
			}
		}
		return blocks;
	}

	Biome(e, temp, humidity) {
		if (e < 0.45 && e > 0.4) return textures.SAND;
		if (e > 1.2 && temp < 0.6 && humidity > 0.4) return textures.STONE;
		if (temp > 0.6 && humidity < 0.4) return textures.SAND;
		// if (temp < 0.3 && e > 1.0) return textures.STONE;
		return textures.GRASS;
	}

	IsSurrounded(x, y, z, caveVal) {
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
				nx < this.x * this.SIZE ||
				nx >= this.SIZE + this.x * this.SIZE ||
				ny < 1 ||
				ny > this.MAX_HEIGHT ||
				nz < this.z * this.SIZE ||
				nz >= this.SIZE + this.z * this.SIZE ||
				perlin3D(
					nx * this.CAVE_NOISE_SCALE,
					ny * this.CAVE_NOISE_SCALE,
					nz * this.CAVE_NOISE_SCALE
				) < caveVal
			) {
				surrounded = false;
				break;
			}
		}
		return surrounded;
	}
}
