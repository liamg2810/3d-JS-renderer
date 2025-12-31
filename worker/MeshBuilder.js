import { DecodeRLE } from "../Chunks/RLE.js";
// import { TEX_ARRAY, TRANSPARENT_ARRAY } from "../Globals/Blocks.js";
import { BLOCKS, TEXTURES } from "../Globals/Constants.js";
import init, { mesh_gen } from "../rust/renderer-wasm/pkg/renderer_wasm.js";

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
const CHUNKSIZE = 16 * 16 * 256;
let empty = new Uint16Array(CHUNKSIZE);

export async function BuildVerts(
	b,
	neighborChunks,
	lM,
	TEX_ARRAY,
	TRANSPARENT_ARRAY
) {
	const blocks = new Uint32Array(DecodeRLE(b));

	let lightMap = new Uint8Array(DecodeRLE(lM));

	let neigbours = new Uint16Array(CHUNKSIZE * 4);
	neigbours.set(neighborChunks.nx || empty, 0);
	neigbours.set(neighborChunks.px || empty, CHUNKSIZE);
	neigbours.set(neighborChunks.nz || empty, CHUNKSIZE * 2);
	neigbours.set(neighborChunks.pz || empty, CHUNKSIZE * 3);

	const nxLight = neighborChunks.nxl
		? new Uint32Array(DecodeRLE(neighborChunks.nxl))
		: empty;
	const pxLight = neighborChunks.pxl
		? new Uint32Array(DecodeRLE(neighborChunks.pxl))
		: empty;
	const nzLight = neighborChunks.nzl
		? new Uint32Array(DecodeRLE(neighborChunks.nzl))
		: empty;
	const pzLight = neighborChunks.pzl
		? new Uint32Array(DecodeRLE(neighborChunks.pzl))
		: empty;

	let immediateNeighbourLights = new Uint16Array(16 * 256 * 4);

	for (let i = 0; i < 16 * 256; i++) {
		// nx
		immediateNeighbourLights[i] =
			nxLight[15 + (i % 16) * 16 + Math.floor(i / 16) * 256];
		// px
		immediateNeighbourLights[i + 16 * 256] =
			pxLight[(i % 16) * 16 + Math.floor(i / 16) * 256];
		// nz
		immediateNeighbourLights[i + 16 * 256 * 2] =
			nzLight[(i % 16) + 15 * 16 + Math.floor(i / 16) * 256];
		// pz
		immediateNeighbourLights[i + 16 * 256 * 3] =
			pzLight[(i % 16) + Math.floor(i / 16) * 256];
	}

	let viA = new Uint32Array([0, 0]);

	const estimatedMaxVerts = 16 * 16 * 256 * 3;
	const verts = new Uint32Array(estimatedMaxVerts);

	const waterVerts = new Uint32Array(estimatedMaxVerts / 6);

	await init();

	const texs = new Uint8Array(TEX_ARRAY);
	const ta = new Uint8Array(TRANSPARENT_ARRAY);

	mesh_gen(
		blocks,
		lightMap,
		neigbours,
		immediateNeighbourLights,
		texs,
		ta,
		verts,
		waterVerts,
		viA
	);

	let vi = viA[0];
	let waterVi = viA[1];

	return {
		blockVerts: verts.subarray(0, vi),
		waterVerts: waterVerts.subarray(0, waterVi),
	};
}
