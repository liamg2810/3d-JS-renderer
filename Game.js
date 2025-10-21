export class Chunk {
	vertCount = 0;

	x = 0;
	z = 0;

	blockBuffer;
	waterBuffer;

	/** @type {Uint32Array} */
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

		this.caveNoise = null;

		this.blockBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.blockBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, blocks, gl.STATIC_DRAW);

		this.vertCount = blocks.length;

		this.blocks = blocks;
	}
}
