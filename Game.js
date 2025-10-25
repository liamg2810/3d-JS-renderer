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

	blocks = new Uint32Array();

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
	 * @param {Uint32Array} blocks
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

		for (let block of this.blocks) {
			const type = (block >>> 16) & 0xff;

			if (type === BLOCKS.AIR) {
				continue;
			}

			const x = (block >>> 12) & 0xf;
			const y = (block >>> 4) & 0xff;
			const z = block & 0xf;

			if (type === BLOCKS.WATER) {
				v.push(...Water(x, y, z, textures.WATER));
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

				if (
					ny < 0 ||
					ny >= 255 ||
					nx < 0 ||
					nx >= 16 ||
					nz < 0 ||
					nz >= 16
				) {
					culled.push(ix);
					continue;
				}

				if (nx >= 16) {
					const nextChunk = this.r.GetChunkAtPos(this.x, this.z + 1);

					if (nextChunk === undefined) {
						console.warn("Next chunk not found, drawing face!");
						continue;
					}
				}

				const b = this.blocks[nx + nz * 15 + ny * 255];

				const t = (b >>> 16) & 0xff;

				if (t !== BLOCKS.AIR && t !== BLOCKS.WATER) {
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
			};

			tex = blockTextureMap[type] ?? tex;

			const c = Cube(x, y, z, tex, culled);

			v.push(...c);
		}

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
