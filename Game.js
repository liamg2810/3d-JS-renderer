import { Cube, Water } from "./Primitives.js";
import { BLOCKS, TEXTURES } from "./constants.js";

const neighbors = [
	[0, 1, 0],
	[0, -1, 0],
	[-1, 0, 0],
	[1, 0, 0],
	[0, 0, 1],
	[0, 0, -1],
];

const blockTextureMap = {
	[BLOCKS.STONE]: TEXTURES.STONE,
	[BLOCKS.SAND]: TEXTURES.SAND,
	[BLOCKS.BEDROCK]: TEXTURES.BEDROCK,
	[BLOCKS.LOG]: TEXTURES.LOG,
	[BLOCKS.LEAVES]: TEXTURES.LEAVES,
	[BLOCKS.DIRT]: TEXTURES.DIRT,
	[BLOCKS.COAL]: TEXTURES.COAL,
	[BLOCKS.SPRUCE_LEAVES]: TEXTURES.SPRUCE_LEAVES,
	[BLOCKS.SPRUCE_LOG]: TEXTURES.SPRUCE_LOG,
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
		const estimatedMaxVerts = 16 * 16 * 256 * 6 * 6;
		const verts = new Uint32Array(estimatedMaxVerts);
		let vi = 0;

		const neighborChunks = {
			px: this.r.GetChunkAtPos(this.x + 1, this.z),
			nx: this.r.GetChunkAtPos(this.x - 1, this.z),
			pz: this.r.GetChunkAtPos(this.x, this.z + 1),
			nz: this.r.GetChunkAtPos(this.x, this.z - 1),
		};

		const blockAt = (nx, ny, nz) => {
			if (ny < 0 || ny >= 256) return BLOCKS.AIR;
			if (nx < 0)
				return (
					neighborChunks.nx?.blocks[15 + nz * 16 + ny * 256] ??
					BLOCKS.AIR
				);
			if (nx >= 16)
				return (
					neighborChunks.px?.blocks[nz * 16 + ny * 256] ?? BLOCKS.AIR
				);
			if (nz < 0)
				return (
					neighborChunks.nz?.blocks[nx + 15 * 16 + ny * 256] ??
					BLOCKS.AIR
				);
			if (nz >= 16)
				return neighborChunks.pz?.blocks[nx + ny * 256] ?? BLOCKS.AIR;
			return this.blocks[nx + nz * 16 + ny * 256];
		};

		for (let [i, block] of this.blocks.entries()) {
			if (block === BLOCKS.AIR) {
				continue;
			}

			const y = i >> 8;
			const z = (i >> 4) & 0xf;
			const x = i & 0xf;

			if (block === BLOCKS.WATER) {
				const w = Water(x, y, z, TEXTURES.WATER);
				verts.set(w, vi);
				vi += w.length;
				continue;
			}

			let culled = 0b111111;

			for (let dir = 0; dir < 6; dir++) {
				const [dx, dy, dz] = neighbors[dir];
				const b = blockAt(x + dx, y + dy, z + dz);
				if (
					b !== BLOCKS.AIR &&
					b !== BLOCKS.WATER &&
					b !== BLOCKS.LEAVES &&
					b !== BLOCKS.SPRUCE_LEAVES
				) {
					culled &= ~(1 << dir);
				}
			}

			let tex = TEXTURES.GRASS;

			tex = blockTextureMap[block] ?? tex;

			const c = Cube(x, y, z, tex, culled);

			verts.set(c, vi);

			vi += c.length;
		}

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.blockBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			verts.subarray(0, vi),
			this.gl.STATIC_DRAW
		);

		this.vertCount = vi;
		this.builtVerts = true;
	}
}
