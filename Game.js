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

export class Chunk {
	vertCount = 0;

	x = 0;
	z = 0;

	blockBuffer;
	waterBuffer;

	/** @type {Uint8Array} */
	blocks;

	/** @type {import('./Renderer.js').Renderer} */
	r;

	/** @type {WebGL2RenderingContext} */
	gl;

	/**
	 *
	 * @param {WebGL2RenderingContext} gl
	 * @param {import('./Renderer.js').Renderer} r
	 * @param {number} x
	 * @param {number} z
	 * @param {Uint8Array} blocks
	 */
	constructor(gl, r, x, z, blocks) {
		this.r = r;

		this.x = x;
		this.z = z;
		this.blocks = blocks;

		this.builtVerts = false;

		this.gl = gl;

		this.blockBuffer = gl.createBuffer();
	}

	BuildVerts() {
		let v = [];
		let water = [];

		for (let [i, block] of this.blocks.entries()) {
			if (block === BLOCKS.AIR) {
				continue;
			}

			const x = i % 16;
			const z = Math.floor(i / 16) % 16;
			const y = Math.floor(i / 256);

			if (block === BLOCKS.WATER) {
				water.push(...Water(x, y, z, textures.WATER));
				continue;
			}

			const neighbors = [
				[x, y + 1, z],
				[x, y - 1, z],
				[x - 1, y, z],
				[x + 1, y, z],
				[x, y, z + 1],
				[x, y, z - 1],
			];

			let culled = [];

			for (let [ix, pos] of neighbors.entries()) {
				const nx = pos[0];
				const ny = pos[1];
				const nz = pos[2];

				if (ny < 0 || ny >= 255) {
					culled.push(ix);
					continue;
				}

				if (nx >= 16) {
					const nextChunk = this.r.GetChunkAtPos(this.x + 1, this.z);

					if (nextChunk === undefined) {
						console.warn("Next chunk not found!");
						return;
					}

					// nx = 0
					const b = nextChunk.blocks[nz * 16 + ny * 256];

					if (b !== BLOCKS.AIR && b !== BLOCKS.WATER) {
						culled.push(ix);
					}
					continue;
				}

				if (nx < 0) {
					const nextChunk = this.r.GetChunkAtPos(this.x - 1, this.z);

					if (nextChunk === undefined) {
						console.warn("Next chunk not found, drawing face!");
						continue;
					}

					// nx = 15
					const b = nextChunk.blocks[15 + nz * 16 + ny * 256];

					if (b !== BLOCKS.AIR && b !== BLOCKS.WATER) {
						culled.push(ix);
					}
					continue;
				}

				if (nz >= 16) {
					const nextChunk = this.r.GetChunkAtPos(this.x, this.z + 1);

					if (nextChunk === undefined) {
						console.warn(
							"Next chunk not found on +z, drawing face!"
						);
						continue;
					}

					// nz = 0
					const b = nextChunk.blocks[nx + ny * 256];

					if (b !== BLOCKS.AIR && b !== BLOCKS.WATER) {
						culled.push(ix);
					}
					continue;
				}

				if (nz < 0) {
					const nextChunk = this.r.GetChunkAtPos(this.x, this.z - 1);

					if (nextChunk === undefined) {
						console.warn(
							"Next chunk not found on -z, drawing face!"
						);
						continue;
					}

					// nz = 15
					const b = nextChunk.blocks[nx + 15 * 16 + ny * 256];

					if (b !== BLOCKS.AIR && b !== BLOCKS.WATER) {
						culled.push(ix);
					}
					continue;
				}

				const b = this.blocks[nx + nz * 16 + ny * 256];

				if (
					b !== BLOCKS.AIR &&
					b !== BLOCKS.WATER &&
					b !== BLOCKS.LEAVES
				) {
					culled.push(ix);
				}
			}

			let tex = textures.GRASS;

			const blockTextureMap = {
				[BLOCKS.STONE]: textures.STONE,
				[BLOCKS.SAND]: textures.SAND,
				[BLOCKS.BEDROCK]: textures.BEDROCK,
				[BLOCKS.LOG]: textures.LOG,
				[BLOCKS.LEAVES]: textures.LEAVES,
				[BLOCKS.DIRT]: textures.DIRT,
				[BLOCKS.COAL]: textures.COAL,
			};

			tex = blockTextureMap[block] ?? tex;

			const c = Cube(x, y, z, tex, culled);

			v.push(...c);
		}

		v.push(...water);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.blockBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Uint32Array(v),
			this.gl.STATIC_DRAW
		);

		this.vertCount = v.length;
		this.builtVerts = true;
	}
}
