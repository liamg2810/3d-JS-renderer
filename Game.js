import { Cube } from "./Primitives.js";

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

	/** @type {Uint32Array} */
	verts = new Uint32Array();

	blocks = new Uint32Array();

	/**
	 *
	 * @param {WebGL2RenderingContext} gl
	 * @param {number} x
	 * @param {number} z
	 * @param {Uint32Array} blocks
	 */
	constructor(gl, x, z, blocks) {
		this.x = x;
		this.z = z;
		this.blocks = blocks;

		this.BuildVerts();

		this.blockBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.blockBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW);

		this.vertCount = this.verts.length;
	}

	BuildVerts() {
		let v = [];

		for (let block of this.blocks) {
			const type = (block >>> 16) & 0xff;

			if (type !== BLOCKS.AIR) {
				continue;
			}

			const x = (block >>> 12) & 0xf;
			const y = (block >>> 4) & 0xff;
			const z = block & 0xf;

			const neighbors = [
				[x, y - 1, z],
				[x, y + 1, z],
				[x, y, z + 1],
				[x, y, z - 1],
				[x - 1, y, z],
				[x + 1, y, z],
			];

			let culled = [];

			for (let [ix, pos] of neighbors.entries()) {
				const nx = pos[0];
				const ny = pos[1];
				const nz = pos[2];

				if (
					ny < 0 ||
					ny > 255 ||
					nx < 0 ||
					nx >= 15 ||
					nz < 0 ||
					nz >= 15
				) {
					culled.push(ix);
					continue;
				}

				const b = this.blocks[nx + nz * 15 + ny * 255];

				const t = b >>> 16 && 0xff;

				if (t === BLOCKS.AIR) {
					culled.push(ix);
				}
			}

			const c = Cube(x, y, z, textures.GRASS, culled);

			v.push(...c);
		}

		this.verts = new Uint32Array(v);
	}
}
