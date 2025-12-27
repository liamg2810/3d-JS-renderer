import { DecodeRLE, GetFromPositionInRLE } from "../Chunks/RLE.js";
import { BLOCKS, TEXTURES } from "../Globals/Constants.js";
import { Cube, Water } from "../Primitives.js";

const NEIGH = [0, 1, 0, 0, -1, 0, -1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1];

const TEXMAP = new Array(256);
TEXMAP[BLOCKS.STONE] = TEXTURES.STONE;
TEXMAP[BLOCKS.SAND] = TEXTURES.SAND;
TEXMAP[BLOCKS.BEDROCK] = TEXTURES.BEDROCK;
TEXMAP[BLOCKS.LOG] = TEXTURES.LOG;
TEXMAP[BLOCKS.LEAVES] = TEXTURES.LEAVES;
TEXMAP[BLOCKS.DIRT] = TEXTURES.DIRT;
TEXMAP[BLOCKS.COAL] = TEXTURES.COAL;
TEXMAP[BLOCKS.SPRUCE_LEAVES] = TEXTURES.SPRUCE_LEAVES;
TEXMAP[BLOCKS.SPRUCE_LOG] = TEXTURES.SPRUCE_LOG;
TEXMAP[BLOCKS.SANDSTONE] = TEXTURES.SANDSTONE;
TEXMAP[BLOCKS.ICE] = TEXTURES.ICE;
TEXMAP[BLOCKS.POPPY] = TEXTURES.POPPY;

const CHUNK = 16;
const LAYER = CHUNK * CHUNK;

export function BuildVerts(b, neighborChunks) {
	const blocks = DecodeRLE(b);

	const estimatedMaxVerts = 16 * 16 * 256;
	const verts = new Uint32Array(estimatedMaxVerts);
	let vi = 0;

	const waterVerts = new Uint32Array(estimatedMaxVerts / 6);
	let waterVi = 0;

	let x = -1,
		y = 0,
		z = 0;

	for (var i = 0, l = blocks.length; i < l; i++) {
		const block = blocks[i];
		x++;
		if (x === 16) {
			x = 0;
			z++;
		}
		if (z === 16) {
			z = 0;
			y++;
		}

		if (block === BLOCKS.AIR) {
			continue;
		}

		const biome = block >>> 8;
		const b = block & 0xff;

		if (b === BLOCKS.WATER) {
			const above = blocks[x + z * 16 + (y + 1) * 256];

			if (above !== BLOCKS.WATER && above !== BLOCKS.ICE) {
				const w = Water(x, y, z, TEXTURES.WATER);
				waterVerts.set(w, waterVi);
				waterVi += w.length;
			}
			continue;
		}

		let culled = 0b111111;

		for (var dir = 0; dir < 6; dir++) {
			const dx = NEIGH[dir * 3];
			const dy = NEIGH[dir * 3 + 1];
			const dz = NEIGH[dir * 3 + 2];

			const nx = x + dx;
			const ny = y + dy;
			const nz = z + dz;

			let nb;

			if (ny < 0 || ny >= 256) {
				nb = BLOCKS.AIR;
			} else if (nx < 0) {
				const arr = neighborChunks?.nx;
				nb = arr ? GetFromPositionInRLE(15, ny, nz, arr) : BLOCKS.AIR;
			} else if (nx >= 16) {
				const arr = neighborChunks?.px;
				nb = arr ? GetFromPositionInRLE(0, ny, nz, arr) : BLOCKS.AIR;
			} else if (nz < 0) {
				const arr = neighborChunks?.nz;
				nb = arr ? GetFromPositionInRLE(nx, ny, 15, arr) : BLOCKS.AIR;
			} else if (nz >= 16) {
				const arr = neighborChunks?.pz;
				nb = arr ? GetFromPositionInRLE(nx, ny, 0, arr) : BLOCKS.AIR;
			} else {
				nb = blocks[nx + nz * 16 + ny * 256];
			}

			// opaque logic (no leaves, water, etc.)
			if (
				nb !== BLOCKS.AIR &&
				nb !== BLOCKS.WATER &&
				nb !== BLOCKS.LEAVES &&
				nb !== BLOCKS.SPRUCE_LEAVES &&
				nb !== BLOCKS.POPPY &&
				(nb !== BLOCKS.ICE || b === BLOCKS.ICE)
			) {
				culled &= ~(1 << dir);
			}
		}

		if (b === BLOCKS.POPPY) {
			culled = 0b111100;
		}

		const tex = TEXMAP[b] || TEXTURES.GRASS;

		const c = Cube(x, y, z, tex, culled, biome);

		if (tex === TEXTURES.ICE) {
			waterVerts.set(c, waterVi);
			waterVi += c.length;
		} else {
			verts.set(c, vi);
			vi += c.length;
		}
	}

	return {
		blockVerts: verts.slice(0, vi),
		waterVerts: waterVerts.slice(0, waterVi),
	};
}
