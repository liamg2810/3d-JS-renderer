import { BLOCK_DATA } from "../Globals/Blocks/Blocks.js";
import { gl } from "../Globals/Window.js";
import { DecodeRLE, RLE } from "./RLE.js";

export class Chunk {
	vertCount = 0;
	waterVertCount = 0;

	x = 0;
	z = 0;

	blockBuffer;
	waterBuffer;

	/** @type {Uint16Array} */
	blocks;

	lightMap;
	calculatedLight = false;

	/**
	 *
	 * @param {WebGL2RenderingContext} gl
	 * @param {number} x
	 * @param {number} z
	 * @param {Uint16Array} blocks
	 */
	constructor(gl, x, z, blocks) {
		this.x = x;
		this.z = z;
		this.blocks = blocks;

		this.builtVerts = false;

		this.blockBuffer = gl.createBuffer();
		this.waterBuffer = gl.createBuffer();
	}

	/**
	 * @param {Uint32Array} blockVerts
	 * @param {Uint32Array} waterVerts
	 */
	PostVerts(blockVerts, waterVerts) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.blockBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, blockVerts, gl.STATIC_DRAW);

		this.vertCount = blockVerts.length;

		if (waterVerts.length > 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.waterBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, waterVerts, gl.STATIC_DRAW);

			this.waterVertCount = waterVerts.length;
		}

		this.builtVerts = true;
	}

	ClearMesh() {
		gl.deleteBuffer(this.blockBuffer);
		gl.deleteBuffer(this.waterBuffer);
		this.blockBuffer = gl.createBuffer();
		this.waterBuffer = gl.createBuffer();
		this.builtVerts = false;
		this.vertCount = 0;
		this.waterVertCount = 0;
	}

	BlockAt(nx, ny, nz, neighborChunks) {
		if (ny < 0 || ny >= 256) return BLOCK_DATA["air"];
		if (nx < 0)
			return (
				neighborChunks.nx?.blocks[15 + nz * 16 + ny * 256] ??
				BLOCK_DATA["air"]
			);
		if (nx >= 16)
			return (
				neighborChunks.px?.blocks[nz * 16 + ny * 256] ??
				BLOCK_DATA["air"]
			);
		if (nz < 0)
			return (
				neighborChunks.nz?.blocks[nx + 15 * 16 + ny * 256] ??
				BLOCK_DATA["air"]
			);
		if (nz >= 16)
			return (
				neighborChunks.pz?.blocks[nx + ny * 256] ?? BLOCK_DATA["air"]
			);
		return this.blocks[nx + nz * 16 + ny * 256];
	}

	SetBlock(x, y, z, block) {
		const decoded = DecodeRLE(this.blocks);

		decoded[x + z * 16 + y * 256] = block;

		this.blocks = RLE(decoded);

		this.calculatedLight = false;
		this.builtVerts = false;
	}

	PostLight(lightMap) {
		this.lightMap = lightMap;
		this.calculatedLight = true;
	}
}
