import { BLOCKS } from "./constants.js";

export class Chunk {
	vertCount = 0;
	waterVertCount = 0;

	x = 0;
	z = 0;

	blockBuffer;
	waterBuffer;

	/** @type {Uint16Array} */
	blocks;

	/** @type {import('./Renderer.js').Renderer} */
	r;

	/** @type {WebGL2RenderingContext} */
	gl;

	/** @type {boolean} */
	twoDRenderer = false;

	/**
	 *
	 * @param {WebGL2RenderingContext} gl
	 * @param {import('./Renderer.js').Renderer} r
	 * @param {number} x
	 * @param {number} z
	 * @param {Uint16Array} blocks
	 */
	constructor(gl, r, x, z, blocks, twoD) {
		this.r = r;

		this.twoDRenderer = twoD;

		this.x = x;
		this.z = z;
		this.blocks = blocks;

		this.builtVerts = false;

		if (!twoD) {
			this.gl = gl;

			this.blockBuffer = gl.createBuffer();
			this.waterBuffer = gl.createBuffer();
		}
	}

	/**
	 * @param {Uint32Array} blockVerts
	 * @param {Uint32Array} waterVerts
	 */
	PostVerts(blockVerts, waterVerts) {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.blockBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			blockVerts,
			this.gl.STATIC_DRAW
		);

		this.vertCount = blockVerts.length;

		if (waterVerts.length > 0) {
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.waterBuffer);
			this.gl.bufferData(
				this.gl.ARRAY_BUFFER,
				waterVerts,
				this.gl.STATIC_DRAW
			);

			this.waterVertCount = waterVerts.length;
		}

		this.builtVerts = true;
	}

	ClearMesh() {
		this.blockBuffer = this.gl.createBuffer();
		this.waterBuffer = this.gl.createBuffer();
		this.builtVerts = false;
	}

	BlockAt(nx, ny, nz, neighborChunks) {
		if (ny < 0 || ny >= 256) return BLOCKS.AIR;
		if (nx < 0)
			return (
				neighborChunks.nx?.blocks[15 + nz * 16 + ny * 256] ?? BLOCKS.AIR
			);
		if (nx >= 16)
			return neighborChunks.px?.blocks[nz * 16 + ny * 256] ?? BLOCKS.AIR;
		if (nz < 0)
			return (
				neighborChunks.nz?.blocks[nx + 15 * 16 + ny * 256] ?? BLOCKS.AIR
			);
		if (nz >= 16)
			return neighborChunks.pz?.blocks[nx + ny * 256] ?? BLOCKS.AIR;
		return this.blocks[nx + nz * 16 + ny * 256];
	}
}
