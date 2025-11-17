import { BLOCKS, TEXTURES } from "../constants.js";
import { Cube, Water } from "../Primitives.js";

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

export function BuildVerts(blocks, neighborChunks) {
	const estimatedMaxVerts = 16 * 16 * 256 * 6 * 6 * 2;
	const verts = new Uint32Array(estimatedMaxVerts);
	let vi = 0;

	const waterVerts = new Uint32Array(estimatedMaxVerts / (6 * 6));
	let waterVi = 0;

	for (let [i, block] of blocks.entries()) {
		if (block === BLOCKS.AIR) {
			continue;
		}

		const biome = block >>> 8;
		const b = block & 0xff;

		const y = i >> 8;
		const z = (i >> 4) & 0xf;
		const x = i & 0xf;

		if (b === BLOCKS.WATER) {
			const w = Water(x, y, z, TEXTURES.WATER);
			waterVerts.set(w, waterVi);
			waterVi += w.length;
			continue;
		}

		let culled = 0b111111;

		for (let dir = 0; dir < 6; dir++) {
			const [dx, dy, dz] = neighbors[dir];
			const b2 = BlockAt(x + dx, y + dy, z + dz, neighborChunks, blocks);
			if (
				b2 !== BLOCKS.AIR &&
				b2 !== BLOCKS.WATER &&
				b2 !== BLOCKS.LEAVES &&
				b2 !== BLOCKS.SPRUCE_LEAVES &&
				(b2 !== BLOCKS.ICE || b === BLOCKS.ICE)
			) {
				culled &= ~(1 << dir);
			}
		}

		let tex = TEXTURES.GRASS;

		tex = blockTextureMap[b] ?? tex;

		const c = Cube(x, y, z, tex, culled, biome, blocks);

		if (tex === TEXTURES.ICE) {
			waterVerts.set(c, waterVi);
			waterVi += c.length;
		} else {
			verts.set(c, vi);

			vi += c.length;
		}
	}

	return {
		blockVerts: verts.subarray(0, vi),
		waterVerts: waterVerts.subarray(0, waterVi),
	};
}

function BlockAt(nx, ny, nz, neighborChunks, blocks) {
	if (ny < 0 || ny >= 256) return BLOCKS.AIR;

	const CHUNK = 16;
	const LAYER = CHUNK * CHUNK;

	const safeGet = (arr, idx) => {
		if (!arr) return BLOCKS.AIR;
		const v = arr[idx];
		return v === undefined ? BLOCKS.AIR : v;
	};

	if (nx < 0) {
		const arr = neighborChunks && neighborChunks.nx;
		const idx = 15 + nz * CHUNK + ny * LAYER;
		return safeGet(arr, idx);
	}
	if (nx >= CHUNK) {
		const arr = neighborChunks && neighborChunks.px;
		const idx = 0 + nz * CHUNK + ny * LAYER;
		return safeGet(arr, idx);
	}
	if (nz < 0) {
		const arr = neighborChunks && neighborChunks.nz;
		const idx = nx + 15 * CHUNK + ny * LAYER;
		return safeGet(arr, idx);
	}
	if (nz >= CHUNK) {
		const arr = neighborChunks && neighborChunks.pz;
		const idx = nx + 0 * CHUNK + ny * LAYER;
		return safeGet(arr, idx);
	}

	return blocks[nx + nz * CHUNK + ny * LAYER];
}
