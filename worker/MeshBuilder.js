import {
	DecodeRLE,
	GetFromPositionInRLE,
	LastNonAirIndex,
} from "../Chunks/RLE.js";
import { BLOCKS, TEXTURES, TRANSPARENT } from "../Globals/Constants.js";
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
TEXMAP[BLOCKS.GLOWSTONE] = TEXTURES.GLOWSTONE;

const CHUNK = 16;
const LAYER = CHUNK * CHUNK;

export function BuildVerts(b, neighborChunks, lM) {
	const blocks = DecodeRLE(b);

	let lightMap;

	if (lM) {
		lightMap = DecodeRLE(lM);
	}

	const lastNonAirIndex = LastNonAirIndex(b);

	const nxBlocks = neighborChunks.nx ? DecodeRLE(neighborChunks.nx) : null;
	const pxBlocks = neighborChunks.px ? DecodeRLE(neighborChunks.px) : null;
	const nzBlocks = neighborChunks.nz ? DecodeRLE(neighborChunks.nz) : null;
	const pzBlocks = neighborChunks.pz ? DecodeRLE(neighborChunks.pz) : null;
	const nxLight = neighborChunks.nxl ? DecodeRLE(neighborChunks.nxl) : null;
	const pxLight = neighborChunks.pxl ? DecodeRLE(neighborChunks.pxl) : null;
	const nzLight = neighborChunks.nzl ? DecodeRLE(neighborChunks.nzl) : null;
	const pzLight = neighborChunks.pzl ? DecodeRLE(neighborChunks.pzl) : null;

	const estimatedMaxVerts = 16 * 16 * 256 * 3;
	const verts = new Uint32Array(estimatedMaxVerts);
	let vi = 0;

	const waterVerts = new Uint32Array(estimatedMaxVerts / 6);
	let waterVi = 0;

	let x = -1,
		y = 0,
		z = 0;

	for (let i = 0; i <= lastNonAirIndex; i++) {
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
		const b = block & 0xff;

		if (b === BLOCKS.AIR) {
			continue;
		}

		if (b === BLOCKS.WATER) {
			const above = blocks[x + z * 16 + (y + 1) * 256];

			if (above !== BLOCKS.WATER && above !== BLOCKS.ICE) {
				waterVi += Water(waterVerts, waterVi, x, y, z, TEXTURES.WATER);
			}
			continue;
		}

		const biome = block >>> 8;
		let culled = 0b111111;
		let lightLevels = [0, 0, 0, 0, 0, 0];

		let isTransparent = TRANSPARENT.has(block);

		if (isTransparent && lightMap) {
			lightLevels = lightLevels.fill(lightMap[x + z * 16 + y * 256]);
		}

		for (let dir = 0; dir < 6 && !isTransparent; dir++) {
			const dx = NEIGH[dir * 3];
			const dy = NEIGH[dir * 3 + 1];
			const dz = NEIGH[dir * 3 + 2];

			const nx = x + dx;
			const ny = y + dy;
			const nz = z + dz;

			let nb;
			let light = 0;

			if (ny < 0 || ny >= 256) {
				nb = BLOCKS.AIR;
			} else if (nx < 0) {
				nb = nxBlocks ? nxBlocks[15 + nz * 16 + ny * 256] : BLOCKS.AIR;

				if (TRANSPARENT.has(nb & 0xff)) {
					light = nxLight ? nxLight[15 + nz * 16 + ny * 256] : 0;
				}
			} else if (nx >= 16) {
				nb = pxBlocks ? pxBlocks[nz * 16 + ny * 256] : BLOCKS.AIR;

				if (TRANSPARENT.has(nb & 0xff)) {
					light = pxLight ? pxLight[nz * 16 + ny * 256] : 0;
				}
			} else if (nz < 0) {
				nb = nzBlocks ? nzBlocks[nx + 15 * 16 + ny * 256] : BLOCKS.AIR;

				if (TRANSPARENT.has(nb & 0xff)) {
					light = nzLight ? nzLight[nx + 15 * 16 + ny * 256] : 0;
				}
			} else if (nz >= 16) {
				nb = pzBlocks ? pzBlocks[nx + ny * 256] : BLOCKS.AIR;

				if (TRANSPARENT.has(nb & 0xff)) {
					light = pzLight ? pzLight[nx + ny * 256] : 0;
				}
			} else {
				nb = blocks[nx + nz * 16 + ny * 256];

				if (TRANSPARENT.has(nb & 0xff)) {
					light = lightMap[nx + nz * 16 + ny * 256];
				}
			}

			lightLevels[dir] = light;

			const nbd = nb & 0xff;

			// opaque logic (no leaves, water, etc.)
			if (!TRANSPARENT.has(nbd)) {
				culled &= ~(1 << dir);
			}
		}

		if (b === BLOCKS.POPPY) {
			culled = 0b111100;
		}

		const tex = TEXMAP[b] || TEXTURES.GRASS;

		if (tex === TEXTURES.ICE) {
			waterVi += Cube(waterVerts, waterVi, x, y, z, tex, culled, biome);
		} else {
			vi += Cube(verts, vi, x, y, z, tex, culled, biome, lightLevels);
		}
	}

	return {
		blockVerts: verts.subarray(0, vi),
		waterVerts: waterVerts.subarray(0, waterVi),
	};
}
