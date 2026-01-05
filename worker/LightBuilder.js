import {
	BLOCK_DATA,
	ILLUMINATION_ARRAY,
	LIGHT_DECAY_ARRAY,
	TRANSPARENT_ARRAY,
} from "../Globals/Blocks/Blocks.js";
import { DecodeRLE, LastNonAirIndex, RLE } from "../World/RLE.js";

const NEIGH = [0, 1, 0, 0, -1, 0, -1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1];

/**
 *
 * @param {number[]} lightMap
 * @param {number[]} blocks
 * @param {[number, number, number, number]} queue
 */
function BFSLight(lightMap, blocks, queue) {
	while (queue.length > 0) {
		let [x, y, z, light] = queue.shift();

		if (light < 0) continue;

		if (x < 0 || x > 15) continue;
		if (y < 0 || y > 255) continue;
		if (z < 0 || z > 15) continue;

		const data = blocks[x + z * 16 + y * 256];
		const block = data & 0xff;

		// Only want to set light level on transparent blocks
		if (!TRANSPARENT_ARRAY[block]) continue;

		const lightLevel = lightMap[x + z * 16 + y * 256];

		// Not going to override a higher light level
		if (lightLevel >= light) continue;

		lightMap[x + z * 16 + y * 256] = light;

		for (let dir = 0; dir < 6; dir++) {
			const dx = NEIGH[dir * 3];
			const dy = NEIGH[dir * 3 + 1];
			const dz = NEIGH[dir * 3 + 2];

			const nx = x + dx;
			const ny = y + dy;
			const nz = z + dz;

			queue.push([nx, ny, nz, light - (1 + LIGHT_DECAY_ARRAY[block])]);
		}
	}
}

export function CalculateLight(
	b,
	neighbours,
	neighbourBlocks,
	initial,
	lightSourcesCache,
	solidHeightmap,
	transparentHeightmap
) {
	let lightMap = new Uint8Array(16 * 16 * 256);

	let blocks = DecodeRLE(b);

	neighbours.nx = neighbours.nx ? DecodeRLE(neighbours.nx) : undefined;
	neighbours.px = neighbours.px ? DecodeRLE(neighbours.px) : undefined;
	neighbours.nz = neighbours.nz ? DecodeRLE(neighbours.nz) : undefined;
	neighbours.pz = neighbours.pz ? DecodeRLE(neighbours.pz) : undefined;

	neighbourBlocks.nx = neighbourBlocks.nx
		? DecodeRLE(neighbourBlocks.nx)
		: undefined;
	neighbourBlocks.px = neighbourBlocks.px
		? DecodeRLE(neighbourBlocks.px)
		: undefined;
	neighbourBlocks.nz = neighbourBlocks.nz
		? DecodeRLE(neighbourBlocks.nz)
		: undefined;
	neighbourBlocks.pz = neighbourBlocks.pz
		? DecodeRLE(neighbourBlocks.pz)
		: undefined;

	let recalculates = [false, false, false, false];

	let sources = [];

	// Light sources pass
	for (let i = 0; i < lightSourcesCache.length; i++) {
		const blockIndex = lightSourcesCache[i];

		const data = blocks[blockIndex];

		const block = data & 0xff;

		const x = blockIndex % 16;
		const z = Math.floor(blockIndex / 16) % 16;
		const y = Math.floor(blockIndex / 256);

		sources.push([x, y, z, ILLUMINATION_ARRAY[block]]);
	}

	// Heightmap pass
	for (let i = 0; i < 16 * 16; i++) {
		const x = i % 16;
		const z = Math.floor(i / 16);

		let skyLight = 15;

		for (let y = transparentHeightmap[i]; y >= solidHeightmap[i]; y--) {
			const data = blocks[i + y * 256];
			const block = data & 0xff;

			sources.push([x, y + 1, z, skyLight]);

			skyLight -= LIGHT_DECAY_ARRAY[block];
		}

		skyLight = 15;

		// Crawl up heightmap to add sources against flat walls
		if (x !== 0 && x !== 15 && z !== 0 && z !== 15) {
			const nx = solidHeightmap[x - 1 + z * 16];
			const px = solidHeightmap[x + 1 + z * 16];
			const nz = solidHeightmap[x + (z - 1) * 16];
			const pz = solidHeightmap[x + (z + 1) * 16];

			const maxNeighbourHeight = Math.max(nx, px, nz, pz);

			for (let y = maxNeighbourHeight; y >= solidHeightmap[i]; y--) {
				const data = blocks[i + y * 256];
				const block = data & 0xff;

				sources.push([x, y + 1, z, skyLight]);

				skyLight -= LIGHT_DECAY_ARRAY[block];
			}
		}
	}

	// Add the neighbours light as sources

	for (let y = 0; y < 256; y++) {
		for (let a = 0; a < 16; a++) {
			// nx (x = 0)
			if (
				neighbourBlocks.nx &&
				neighbours.nx &&
				y < solidHeightmap[a * 16]
			) {
				const block = blocks[a * 16 + y * 256] & 0xff;
				const nb = neighbourBlocks.nx[15 + a * 16 + y * 256] & 0xff;

				if (
					block === BLOCK_DATA["air"].code &&
					nb === BLOCK_DATA["air"].code
				)
					sources.push([
						0,
						y,
						a,
						neighbours.nx[15 + a * 16 + y * 256] - 1,
					]);
			}

			// px (x = 15)
			if (
				neighbourBlocks.px &&
				neighbours.px &&
				y < solidHeightmap[15 + a * 16]
			) {
				const block = blocks[15 + a * 16 + y * 256] & 0xff;
				const nb = neighbourBlocks.px[a * 16 + y * 256] & 0xff;

				if (
					block === BLOCK_DATA["air"].code &&
					nb === BLOCK_DATA["air"].code
				)
					sources.push([
						15,
						y,
						a,
						neighbours.px[a * 16 + y * 256] - 1,
					]);
			}

			// nz (z = 0)
			if (neighbourBlocks.nz && neighbours.nz && y < solidHeightmap[a]) {
				const block = blocks[a + y * 256] & 0xff;
				const nb = neighbourBlocks.nz[a + 15 * 16 + y * 256] & 0xff;

				if (
					block === BLOCK_DATA["air"].code &&
					nb === BLOCK_DATA["air"].code
				)
					sources.push([
						a,
						y,
						0,
						neighbours.nz[a + 15 * 16 + y * 256] - 1,
					]);
			}

			// pz (z = 15)
			if (
				neighbourBlocks.pz &&
				neighbours.pz &&
				y < solidHeightmap[a + 15 * 16]
			) {
				const block = blocks[a + 15 * 16 + y * 256] & 0xff;
				const nb = neighbourBlocks.pz[a + y * 256] & 0xff;

				if (
					block === BLOCK_DATA["air"].code &&
					nb === BLOCK_DATA["air"].code
				)
					sources.push([a, y, 15, neighbours.pz[a + y * 256] - 1]);
			}
		}
	}

	BFSLight(lightMap, blocks, sources);

	// Final heightmap pass to fill in full skylight
	for (let i = 0; i < 16 * 16; i++) {
		for (let y = 255; y > transparentHeightmap[i]; y--) {
			lightMap[i + (y + 1) * 256] = 15;
		}
	}

	if (initial === undefined) {
		return {
			lightMap: RLE(lightMap),
			recalculates: [true, true, true, true],
		};
	}
	let initLightMap = DecodeRLE(initial);

	// Final pass to check for neighbour updates

	for (let a = 0; a < 16; a++) {
		const [nx, px, nz, pz] = recalculates;
		if (nx && px && nz && pz) break;

		for (let y = 0; y < 255; y++) {
			// nx (x = 0)
			if (!nx) {
				const i = a * 16 + y * 256;

				if (lightMap[i] !== initLightMap[i]) recalculates[0] = true;
			}

			// px (x = 15)
			if (!px) {
				const i = 15 + a * 16 + y * 256;

				if (lightMap[i] !== initLightMap[i]) recalculates[1] = true;
			}

			// nz (z = 0)
			if (!nz) {
				const i = a + y * 256;

				if (lightMap[i] !== initLightMap[i]) recalculates[2] = true;
			}

			// pz (z = 15)
			if (!pz) {
				const i = a + 15 * 16 + y * 256;

				if (lightMap[i] !== initLightMap[i]) recalculates[3] = true;
			}
		}
	}

	return { lightMap: RLE(lightMap), recalculates };
}
