import { DecodeRLE, LastNonAirIndex } from "../Chunks/RLE.js";
import {
	BLOCK_DATA,
	TEX_ARRAY,
	TRANSPARENT_ARRAY,
} from "../Globals/Blocks/Blocks.js";
import { Cube, Water } from "../Primitives.js";

const NEIGH = [0, 1, 0, 0, -1, 0, -1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1];

export function BuildVerts(b, neighborChunks, lM) {
	const blocks = DecodeRLE(b);

	const air = BLOCK_DATA["air"];

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

	let lightLevels = new Uint8Array([0, 0, 0, 0, 0, 0]);

	const waterVerts = new Uint32Array(estimatedMaxVerts / 6);
	let waterVi = 0;
	for (let i = 0; i <= lastNonAirIndex; i++) {
		const block = blocks[i];

		const x = i % 16;
		const z = (i >>> 4) % 16;
		const y = i >>> 8;

		const b = block & 0xff;
		const isTransparent = TRANSPARENT_ARRAY[b];

		if (b === air.code) {
			continue;
		}

		if (b === BLOCK_DATA["water"].code) {
			const above = blocks[x + z * 16 + (y + 1) * 256] & 0xff;

			if (
				above !== BLOCK_DATA["water"].code &&
				above !== BLOCK_DATA["ice"].code
			) {
				waterVi += Water(waterVerts, waterVi, x, y, z, b);
			}
			continue;
		}

		const biome = block >>> 8;
		let culled = 0b111111;
		// let lightLevels = [0, 0, 0, 0, 0, 0];

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
				nb = air;
			} else if (nx < 0) {
				nb = nxBlocks ? nxBlocks[15 + nz * 16 + ny * 256] & 0xff : air;

				if (TRANSPARENT_ARRAY[nb]) {
					light = nxLight ? nxLight[15 + nz * 16 + ny * 256] : 0;
				}
			} else if (nx >= 16) {
				nb = pxBlocks ? pxBlocks[nz * 16 + ny * 256] & 0xff : air;

				if (TRANSPARENT_ARRAY[nb]) {
					light = pxLight ? pxLight[nz * 16 + ny * 256] : 0;
				}
			} else if (nz < 0) {
				nb = nzBlocks ? nzBlocks[nx + 15 * 16 + ny * 256] & 0xff : air;

				if (TRANSPARENT_ARRAY[nb]) {
					light = nzLight ? nzLight[nx + 15 * 16 + ny * 256] : 0;
				}
			} else if (nz >= 16) {
				nb = pzBlocks ? pzBlocks[nx + ny * 256] & 0xff : air;

				if (TRANSPARENT_ARRAY[nb]) {
					light = pzLight ? pzLight[nx + ny * 256] : 0;
				}
			} else {
				nb = blocks[nx + nz * 16 + ny * 256];

				nb = blocks[nx + nz * 16 + ny * 256] & 0xff;

				if (TRANSPARENT_ARRAY[nb]) {
					light = lightMap[nx + nz * 16 + ny * 256];
				}
			}

			lightLevels[dir] = light;

			if (!TRANSPARENT_ARRAY[nb]) {
				culled &= ~(1 << dir);
			}
		}

		if (b === BLOCK_DATA["poppy"].code) {
			culled = 0b111100;
		}

		if (culled === 0) continue;

		if (b === BLOCK_DATA["ice"].code) {
			waterVi += Cube(
				waterVerts,
				waterVi,
				x,
				y,
				z,
				b,
				culled,
				biome,
				lightLevels
			);
		} else {
			vi += Cube(verts, vi, x, y, z, b, culled, biome, lightLevels);
		}
	}

	return {
		blockVerts: verts.subarray(0, vi),
		waterVerts: waterVerts.subarray(0, waterVi),
	};
}
