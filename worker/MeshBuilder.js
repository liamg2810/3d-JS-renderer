import {
	BLOCK_DATA,
	TEX_ARRAY,
	TRANSPARENT_ARRAY,
} from "../Globals/Blocks/Blocks.js";
import { Cube, Water } from "../Primitives.js";
import { DecodeRLE, LastNonAirIndex } from "../World/RLE.js";

const NEIGH = [0, 1, 0, 0, -1, 0, -1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1];

export function BuildVerts(b, neighborChunks, lM) {
	const blocks = DecodeRLE(b);

	const air = BLOCK_DATA["air"].code;

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

	const waterVerts = new Uint32Array(estimatedMaxVerts);
	let waterVi = 0;
	for (let i = 0; i <= lastNonAirIndex; i++) {
		const block = blocks[i];

		const x = i % 16;
		const z = (i >>> 4) % 16;
		const y = i >>> 8;

		const b = block & 0xff;
		const isTransparent = TRANSPARENT_ARRAY[b];

		if (b === air) {
			continue;
		}

		const biome = block >>> 8;
		let culled = 0b111111;
		// let lightLevels = [0, 0, 0, 0, 0, 0];

		if (isTransparent && lightMap) {
			lightLevels = lightLevels.fill(lightMap[x + z * 16 + y * 256]);
		}

		let waterLevels = [6, 6, 6, 6];

		for (
			let dir = 0;
			dir < 6 &&
			(!TRANSPARENT_ARRAY[b] || b === BLOCK_DATA["water"].code);
			dir++
		) {
			const dx = NEIGH[dir * 3];
			const dy = NEIGH[dir * 3 + 1];
			const dz = NEIGH[dir * 3 + 2];

			const nx = x + dx;
			const ny = y + dy;
			const nz = z + dz;

			let nb;
			let light = 0;

			let chosenLightMap = lightMap;
			let lightMapIndex = nx + nz * 16 + ny * 256;

			if (ny < 0 || ny >= 256) {
				nb = air;
			} else if (nx < 0) {
				nb = nxBlocks ? nxBlocks[15 + nz * 16 + ny * 256] & 0xff : air;

				// TODO: This will not work because i am not yet storing water levels in the block;
				if (b === BLOCK_DATA["water"].code && nb === b) {
					waterLevels[0] = 7;
					waterLevels[2] = 7;
				}

				lightMapIndex = 15 + nz * 16 + ny * 256;
				chosenLightMap = nxLight;
			} else if (nx >= 16) {
				nb = pxBlocks ? pxBlocks[nz * 16 + ny * 256] & 0xff : air;

				lightMapIndex = nz * 16 + ny * 256;
				chosenLightMap = pxLight;
			} else if (nz < 0) {
				nb = nzBlocks ? nzBlocks[nx + 15 * 16 + ny * 256] & 0xff : air;

				lightMapIndex = nx + 15 * 16 + ny * 256;
				chosenLightMap = nzLight;
			} else if (nz >= 16) {
				nb = pzBlocks ? pzBlocks[nx + ny * 256] & 0xff : air;

				lightMapIndex = nx + ny * 256;
				chosenLightMap = pzLight;
			} else {
				nb = blocks[nx + nz * 16 + ny * 256] & 0xff;
			}

			if (TRANSPARENT_ARRAY[nb]) {
				light = chosenLightMap ? chosenLightMap[lightMapIndex] : 0;
			}

			lightLevels[dir] = light;

			if (
				!TRANSPARENT_ARRAY[nb] ||
				(b === BLOCK_DATA["water"].code && nb === b)
			) {
				culled &= ~(1 << dir);
			}
		}

		if (b === BLOCK_DATA["poppy"].code) {
			culled = 0b111100;
		}

		if (culled === 0) continue;

		if (b === BLOCK_DATA["water"].code) {
			let above = blocks[x + z * 16 + (y + 1) * 256] & 0xff;

			console.log(`Water at: ${x} ${y} ${z}`);

			if (above === b) {
				waterLevels = [7, 7, 7, 7, 7, 7];
			}

			waterVi += Water(
				waterVerts,
				waterVi,
				x,
				y,
				z,
				b,
				culled,
				// biome,
				lightLevels,
				waterLevels
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
