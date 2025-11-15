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
	[BLOCKS.SANDSTONE]: TEXTURES.SANDSTONE,
	[BLOCKS.ICE]: TEXTURES.ICE,
};

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

	BuildVerts() {
		const estimatedMaxVerts = 16 * 16 * 256 * 6 * 6 * 2;
		const verts = new Uint32Array(estimatedMaxVerts);
		let vi = 0;

		const blocks = [
			...Cube(7, 80, 7, TEXTURES.SAND),
			...Cube(8, 80, 7, TEXTURES.SAND),
			...Cube(9, 80, 7, TEXTURES.SAND),
			...Cube(7, 80, 8, TEXTURES.SAND),
			...Cube(8, 80, 8, TEXTURES.SAND),
			...Cube(9, 80, 8, TEXTURES.SAND),
			...Cube(7, 80, 9, TEXTURES.SAND),
			...Cube(8, 80, 9, TEXTURES.SAND),
			...Cube(9, 80, 9, TEXTURES.SAND),
		];

		verts.set(blocks, vi);
		vi += blocks.length;

		// const neighborChunks = {
		// 	px: this.r.GetChunkAtPos(this.x + 1, this.z),
		// 	nx: this.r.GetChunkAtPos(this.x - 1, this.z),
		// 	pz: this.r.GetChunkAtPos(this.x, this.z + 1),
		// 	nz: this.r.GetChunkAtPos(this.x, this.z - 1),
		// };

		const waterVerts = new Uint32Array(estimatedMaxVerts / (6 * 6));
		let waterVi = 0;

		// for (let [i, block] of this.blocks.entries()) {
		// 	if (block === BLOCKS.AIR) {
		// 		continue;
		// 	}

		// 	const biome = block >>> 8;
		// 	const b = block & 0xff;

		// 	const y = i >> 8;
		// 	const z = (i >> 4) & 0xf;
		// 	const x = i & 0xf;

		// 	if (b === BLOCKS.WATER) {
		// 		const w = Water(x, y, z, TEXTURES.WATER);
		// 		waterVerts.set(w, waterVi);
		// 		waterVi += w.length;
		// 		continue;
		// 	}

		// 	let culled = 0b111111;

		// 	for (let dir = 0; dir < 6; dir++) {
		// 		const [dx, dy, dz] = neighbors[dir];
		// 		const b2 = this.BlockAt(x + dx, y + dy, z + dz, neighborChunks);
		// 		if (
		// 			b2 !== BLOCKS.AIR &&
		// 			b2 !== BLOCKS.WATER &&
		// 			b2 !== BLOCKS.LEAVES &&
		// 			b2 !== BLOCKS.SPRUCE_LEAVES &&
		// 			(b2 !== BLOCKS.ICE || b === BLOCKS.ICE)
		// 		) {
		// 			culled &= ~(1 << dir);
		// 		}
		// 	}

		// 	let tex = TEXTURES.GRASS;

		// 	tex = blockTextureMap[b] ?? tex;

		// 	const c = Cube(x, y, z, tex, culled, biome);

		// 	if (tex === TEXTURES.ICE) {
		// 		waterVerts.set(c, waterVi);
		// 		waterVi += c.length;
		// 	} else {
		// 		verts.set(c, vi);

		// 		vi += c.length;
		// 	}
		// }

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.blockBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			verts.subarray(0, vi),
			this.gl.STATIC_DRAW
		);

		this.vertCount = vi;

		if (waterVi > 0) {
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.waterBuffer);
			this.gl.bufferData(
				this.gl.ARRAY_BUFFER,
				waterVerts.subarray(0, waterVi),
				this.gl.STATIC_DRAW
			);

			this.waterVertCount = waterVi;
		}

		this.builtVerts = true;
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
