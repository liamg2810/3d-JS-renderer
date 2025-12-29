import { DecodeRLE, RLE } from "../Chunks/RLE.js";
import { LIGHT_SOURCES, TRANSPARENT } from "../Globals/Constants.js";

const NEIGH = [0, 1, 0, 0, -1, 0, -1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1];

function BFSLight(lightMap, blocks, queue) {
	while (queue.length > 0) {
		let [x, y, z, light] = queue.shift();

		if (light < 0) continue;

		if (x < 0 || x > 15) continue;
		if (y < 0 || y > 255) continue;
		if (z < 0 || z > 15) continue;

		const data = blocks[x + z * 16 + y * 256];
		const block = data & 0xff;

		// Only want to set light level on non transparent blocks
		if (!TRANSPARENT.has(block)) continue;

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

			queue.push([nx, ny, nz, light - 1]);
		}
	}
}

export function CalculateLight(b, neighbours, neighbourBlocks) {
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

	for (let x = 0; x < 16; x++) {
		for (let z = 0; z < 16; z++) {
			let isSky = true;

			for (let y = 255; y > 0; y--) {
				const data = blocks[x + z * 16 + y * 256];

				const block = data & 0xff;

				// TODO: Fix artifacts caused by this not updating stuff surrounding it.
				if (isSky && TRANSPARENT.has(block)) {
					lightMap[x + z * 16 + y * 256] = 14;
				}

				if (LIGHT_SOURCES.has(block)) {
					sources.push([x, y, z, 15]);
				}

				if (!TRANSPARENT.has(block)) {
					if (isSky) {
						sources.push([x, y + 1, z, 15]);
					}

					isSky = false;
					continue;
				}

				if (!isSky) {
					if (x === 0 && neighbours.nx) {
						let l = neighbours.nx[15 + z * 16 + y * 256];

						if (l > 0) sources.push([x, y, z, l - 1]);
					} else if (x === 15 && neighbours.px) {
						let l = neighbours.px[z * 16 + y * 256];

						if (l > 0) sources.push([x, y, z, l - 1]);
					} else if (z === 0 && neighbours.nz) {
						let l = neighbours.nz[x + 15 * 16 + y * 256];
						if (l > 0) sources.push([x, y, z, l - 1]);
					} else if (z === 15 && neighbours.pz) {
						let l = neighbours.pz[x + y * 256];
						if (l > 0) sources.push([x, y, z, l - 1]);
					}
				}
			}
		}
	}

	BFSLight(lightMap, blocks, sources);

	// Final pass to check for neighbour updates

	for (let y = 0; y < 255; y++) {
		const [nx, px, nz, pz] = recalculates;

		if (nx && px && nz && pz) break;

		if (!nx && neighbours.nx && neighbourBlocks.nx) {
			for (let z = 0; z < 16; z++) {
				const data = blocks[z * 16 + y * 256];

				const block = data & 0xff;

				if (!TRANSPARENT.has(block)) continue;

				const nb = neighbourBlocks.nx[15 + z * 16 + y * 256] & 0xff;

				if (!TRANSPARENT.has(nb)) continue;

				const l = neighbours.nx[15 + z * 16 + y * 256];

				if (l < lightMap[z * 16 + y * 256] - 1) {
					recalculates[0] = true;
					break;
				}
			}
		}

		if (!px && neighbours.px && neighbourBlocks.px) {
			for (let z = 0; z < 16; z++) {
				const data = blocks[15 + z * 16 + y * 256];

				const block = data & 0xff;

				if (!TRANSPARENT.has(block)) continue;

				const nb = neighbourBlocks.px[z * 16 + y * 256] & 0xff;

				if (!TRANSPARENT.has(nb)) continue;

				const l = neighbours.px[z * 16 + y * 256];

				if (l < lightMap[15 + z * 16 + y * 256] - 1) {
					recalculates[1] = true;
					break;
				}
			}
		}

		if (!nz && neighbours.nz && neighbourBlocks.nz) {
			for (let x = 0; x < 16; x++) {
				const data = blocks[x + y * 256];

				const block = data & 0xff;

				if (!TRANSPARENT.has(block)) continue;

				const nb = neighbourBlocks.nz[x + 15 * 16 + y * 256] & 0xff;

				if (!TRANSPARENT.has(nb)) continue;

				const l = neighbours.nz[x + 15 * 16 + y * 256];

				if (l < lightMap[x + y * 256] - 1) {
					recalculates[2] = true;
					break;
				}
			}
		}

		if (!pz && neighbours.pz && neighbourBlocks.pz) {
			for (let x = 0; x < 16; x++) {
				const data = blocks[x + 15 * 16 + y * 256];

				const block = data & 0xff;

				if (!TRANSPARENT.has(block)) continue;

				const nb = neighbourBlocks.pz[x + y * 256] & 0xff;

				if (!TRANSPARENT.has(nb)) continue;

				const l = neighbours.pz[x + y * 256];

				if (l < lightMap[x + 15 * 16 + y * 256] - 1) {
					recalculates[3] = true;
					break;
				}
			}
		}
	}

	return { lightMap: RLE(lightMap), recalculates };
}
