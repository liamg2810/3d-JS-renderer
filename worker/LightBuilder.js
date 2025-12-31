import { DecodeRLE, RLE } from "../Chunks/RLE.js";
import { LIGHT_SOURCES, TRANSPARENT } from "../Globals/Constants.js";
import init, {
	calculate_light,
} from "../rust/renderer-wasm/pkg/renderer_wasm.js";

export async function CalculateLight(b, neighbourLight, neighbourBlocks) {
	let lightMap = new Uint8Array(16 * 16 * 256);

	let blocks = DecodeRLE(b);

	neighbourLight.nx = neighbourLight.nx
		? DecodeRLE(neighbourLight.nx)
		: undefined;
	neighbourLight.px = neighbourLight.px
		? DecodeRLE(neighbourLight.px)
		: undefined;
	neighbourLight.nz = neighbourLight.nz
		? DecodeRLE(neighbourLight.nz)
		: undefined;
	neighbourLight.pz = neighbourLight.pz
		? DecodeRLE(neighbourLight.pz)
		: undefined;

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

	const CHUNK_SIZE = 16 * 16 * 256;

	let empty = new Uint16Array(CHUNK_SIZE);

	blocks = new Uint16Array(blocks);

	let neigbours = new Uint16Array(CHUNK_SIZE * 8);
	neigbours.set(neighbourLight.nx || empty, 0);
	neigbours.set(neighbourLight.px || empty, CHUNK_SIZE);
	neigbours.set(neighbourLight.nz || empty, CHUNK_SIZE * 2);
	neigbours.set(neighbourLight.pz || empty, CHUNK_SIZE * 3);
	let transparent = new Uint16Array(TRANSPARENT);
	let sources = new Uint16Array(LIGHT_SOURCES);

	await init();

	// TODO: lighting sometimes works but mostly just goes from 15 to 0
	calculate_light(lightMap, blocks, neigbours, transparent, sources);
	// Final pass to check for neighbour updates

	for (let y = 0; y < 255; y++) {
		const [nx, px, nz, pz] = recalculates;

		if (nx && px && nz && pz) break;

		if (!nx && neighbourLight.nx && neighbourBlocks.nx) {
			for (let z = 0; z < 16; z++) {
				const data = blocks[z * 16 + y * 256];

				const block = data & 0xff;

				if (!TRANSPARENT.has(block)) continue;

				const nb = neighbourBlocks.nx[15 + z * 16 + y * 256] & 0xff;

				if (!TRANSPARENT.has(nb)) continue;

				const l = neighbourLight.nx[15 + z * 16 + y * 256];

				if (l < lightMap[z * 16 + y * 256] - 1) {
					recalculates[0] = true;
					break;
				}
			}
		}

		if (!px && neighbourLight.px && neighbourBlocks.px) {
			for (let z = 0; z < 16; z++) {
				const data = blocks[15 + z * 16 + y * 256];

				const block = data & 0xff;

				if (!TRANSPARENT.has(block)) continue;

				const nb = neighbourBlocks.px[z * 16 + y * 256] & 0xff;

				if (!TRANSPARENT.has(nb)) continue;

				const l = neighbourLight.px[z * 16 + y * 256];

				if (l < lightMap[15 + z * 16 + y * 256] - 1) {
					recalculates[1] = true;
					break;
				}
			}
		}

		if (!nz && neighbourLight.nz && neighbourBlocks.nz) {
			for (let x = 0; x < 16; x++) {
				const data = blocks[x + y * 256];

				const block = data & 0xff;

				if (!TRANSPARENT.has(block)) continue;

				const nb = neighbourBlocks.nz[x + 15 * 16 + y * 256] & 0xff;

				if (!TRANSPARENT.has(nb)) continue;

				const l = neighbourLight.nz[x + 15 * 16 + y * 256];

				if (l < lightMap[x + y * 256] - 1) {
					recalculates[2] = true;
					break;
				}
			}
		}

		if (!pz && neighbourLight.pz && neighbourBlocks.pz) {
			for (let x = 0; x < 16; x++) {
				const data = blocks[x + 15 * 16 + y * 256];

				const block = data & 0xff;

				if (!TRANSPARENT.has(block)) continue;

				const nb = neighbourBlocks.pz[x + y * 256] & 0xff;

				if (!TRANSPARENT.has(nb)) continue;

				const l = neighbourLight.pz[x + y * 256];

				if (l < lightMap[x + 15 * 16 + y * 256] - 1) {
					recalculates[3] = true;
					break;
				}
			}
		}
	}

	return { lightMap: RLE(lightMap), recalculates };
}
