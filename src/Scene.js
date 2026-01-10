import { BIOME_DATA, GetBiome } from "./Globals/Biomes/Biomes.js";
import { BLOCK_DATA } from "./Globals/Blocks/Blocks.js";
import { gl } from "./Globals/Window.js";
import Player from "./Player/Player.js";
import Renderer from "./RendererThreeD/Renderer.js";
import { Chunk } from "./World/Chunk.js";
import ChunkManager from "./World/ChunkManager.js";
import World from "./World/World.js";

const poolSize = navigator.hardwareConcurrency || 4;

const workers = [];
const busy = [];

/** @type {{chunkX: number, chunkZ: number, priority: number, queueTime: number}[]} */
const chunkQueue = [];
/** @type {{chunk: Chunk, priority: number, queueTime: number}[]} */
const meshQueue = [];
/** @type {{chunk: Chunk, priority: number, queueTime: number}[]} */

const lightQueue = [];
const activeMeshes = new Set();
const activeChunks = new Set();
const activeLight = new Set();
const completedChunks = new Set();

/**
 * Calculate priority based on distance to player
 * @param {number} chunkX
 * @param {number} chunkZ
 * @returns {number} Lower is higher priority
 */
function calculatePriority(chunkX, chunkZ) {
	const playerChunkX = Math.floor(Player.position.x / 16);
	const playerChunkZ = Math.floor(Player.position.z / 16);

	const dx = chunkX - playerChunkX;
	const dz = chunkZ - playerChunkZ;

	return dx * dx + dz * dz; // Squared distance (cheaper than sqrt)
}

function GenerateKey(chunkX, chunkZ) {
	return `${chunkX}, ${chunkZ}`;
}

/**
 * @param {number} chunkX
 * @param {number} chunkZ
 */
export async function enqueueChunk(chunkX, chunkZ) {
	const key = `${chunkX}, ${chunkZ}`;

	if (activeChunks.has(key) || completedChunks.has(key)) {
		return;
	}

	console.log(`queue chunk ${key}`);

	activeChunks.add(key);
	chunkQueue.push({
		chunkX,
		chunkZ,
		priority: calculatePriority(chunkX, chunkZ),
		queueTime: Date.now(),
	});

	// Sort by priority (lower = higher priority)
	chunkQueue.sort((a, b) => a.priority - b.priority);

	processQueue();
}

/** @param {Chunk} chunk  */
export function enqueueMesh(chunk) {
	const key = `${chunk.x}, ${chunk.z}`;

	if (activeMeshes.has(key)) {
		return;
	}

	activeMeshes.add(key);
	meshQueue.push({
		chunk,
		priority: calculatePriority(chunk.x, chunk.z),
		queueTime: Date.now(),
	});

	meshQueue.sort((a, b) => a.priority - b.priority);

	processQueue();
}

export function enqueueLight(chunk) {
	if (!chunk) return;

	const key = GenerateKey(chunk.x, chunk.z);

	if (activeLight.has(key)) {
		return;
	}

	activeLight.add(key);
	lightQueue.push({
		chunk,
		priority: calculatePriority(chunk.x, chunk.z),
		queueTime: Date.now(),
	});

	lightQueue.sort((a, b) => a.priority - b.priority);

	processQueue();
}

export function isQueueing() {
	return (
		chunkQueue.length > 0 || meshQueue.length > 0 || lightQueue.length > 0
	);
}

export function removeLoadedChunk(chunkX, chunkZ) {
	completedChunks.delete(`${chunkX}, ${chunkZ}`);
}

export function CreateChunk(
	chunkX,
	chunkZ,
	blocks,
	solidHeightmap,
	transparentHeightmap,
	lightSources
) {
	const key = `${chunkX}, ${chunkZ}`;
	const chunk = new Chunk(
		gl,
		chunkX,
		chunkZ,
		blocks,
		solidHeightmap,
		transparentHeightmap
	);
	activeChunks.delete(key);
	completedChunks.add(key);

	chunk.lightSourcesCache = lightSources;

	ChunkManager.chunks.push(chunk);

	return chunk;
}

function ProcessTerrainFinish(i, ev) {
	const {
		chunkX,
		chunkZ,
		blocks,
		solidHeightmap,
		transparentHeightmap,
		lightSources,
	} = ev.data;

	const chunk = CreateChunk(
		chunkX,
		chunkZ,
		blocks,
		solidHeightmap,
		transparentHeightmap,
		lightSources
	);

	busy[i] = false;

	enqueueLight(chunk);

	processQueue();
}

function ProcessMeshFinish(i, ev) {
	const { chunkX, chunkZ, blockVerts, waterVerts } = ev.data;
	const key = `${chunkX}, ${chunkZ}`;

	const chunk = ChunkManager.GetChunkAtPos(chunkX, chunkZ);
	activeMeshes.delete(key);
	busy[i] = false;

	if (!chunk) {
		return;
	}

	chunk.PostVerts(blockVerts, waterVerts);

	processQueue();
}

function ProcessLightFinish(i, ev) {
	const { lightMap, recalculates, chunkX, chunkZ } = ev.data;
	const key = GenerateKey(chunkX, chunkZ);

	const chunk = ChunkManager.GetChunkAtPos(chunkX, chunkZ);
	activeLight.delete(key);
	busy[i] = false;

	if (!chunk) {
		return;
	}

	chunk.PostLight(lightMap);
	const nx = ChunkManager.GetChunkAtPos(chunkX - 1, chunkZ);
	const px = ChunkManager.GetChunkAtPos(chunkX + 1, chunkZ);
	const nz = ChunkManager.GetChunkAtPos(chunkX, chunkZ - 1);
	const pz = ChunkManager.GetChunkAtPos(chunkX, chunkZ + 1);

	if (recalculates[0]) {
		nx && enqueueLight(nx);
	}
	if (recalculates[1]) {
		px && enqueueLight(px);
	}
	if (recalculates[2]) {
		nz && enqueueLight(nz);
	}
	if (recalculates[3]) {
		pz && enqueueLight(pz);
	}

	processQueue();
}

function ProcessChunk(i, task) {
	task.seed = World.seed;
	busy[i] = true;

	workers[i].postMessage({ type: "Terrain", data: task });
}

function ProcessLight(i, chunk) {
	busy[i] = true;

	const neighbourLight = {
		px: ChunkManager.GetChunkAtPos(chunk.x + 1, chunk.z)?.lightMap,
		nx: ChunkManager.GetChunkAtPos(chunk.x - 1, chunk.z)?.lightMap,
		pz: ChunkManager.GetChunkAtPos(chunk.x, chunk.z + 1)?.lightMap,
		nz: ChunkManager.GetChunkAtPos(chunk.x, chunk.z - 1)?.lightMap,
	};

	const neighbourBlocks = {
		px: ChunkManager.GetChunkAtPos(chunk.x + 1, chunk.z)?.blocks,
		nx: ChunkManager.GetChunkAtPos(chunk.x - 1, chunk.z)?.blocks,
		pz: ChunkManager.GetChunkAtPos(chunk.x, chunk.z + 1)?.blocks,
		nz: ChunkManager.GetChunkAtPos(chunk.x, chunk.z - 1)?.blocks,
	};

	workers[i].postMessage({
		type: "Light",
		data: {
			blocks: chunk.blocks,
			chunkX: chunk.x,
			chunkZ: chunk.z,
			neighbours: neighbourLight,
			neighbourBlocks,
			initial: chunk.lightMap,
			lightSourcesCache: chunk.lightSourcesCache
				? [...chunk.lightSourcesCache]
				: [],
			solidHeightmap: chunk.solidHeightmap,
			transparentHeightmap: chunk.transparentHeightmap,
		},
	});
}

/**
 *
 * @param {number} i
 * @param {Chunk} chunk
 */
function ProcessMesh(i, chunk) {
	const neighborChunks = {
		px: ChunkManager.GetChunkAtPos(chunk.x + 1, chunk.z)?.blocks,
		nx: ChunkManager.GetChunkAtPos(chunk.x - 1, chunk.z)?.blocks,
		pz: ChunkManager.GetChunkAtPos(chunk.x, chunk.z + 1)?.blocks,
		nz: ChunkManager.GetChunkAtPos(chunk.x, chunk.z - 1)?.blocks,
		pxl: ChunkManager.GetChunkAtPos(chunk.x + 1, chunk.z)?.lightMap,
		nxl: ChunkManager.GetChunkAtPos(chunk.x - 1, chunk.z)?.lightMap,
		pzl: ChunkManager.GetChunkAtPos(chunk.x, chunk.z + 1)?.lightMap,
		nzl: ChunkManager.GetChunkAtPos(chunk.x, chunk.z - 1)?.lightMap,
	};

	busy[i] = true;

	workers[i].postMessage({
		type: "Mesh",
		data: {
			chunkX: chunk.x,
			chunkZ: chunk.z,
			chunk: chunk.blocks,
			neighborChunks: neighborChunks,
			lightMap: chunk.lightMap,
		},
	});
}

function processQueue() {
	for (let i = 0; i < workers.length; i++) {
		if (!busy[i] && chunkQueue.length > 0) {
			const task = chunkQueue.shift();
			ProcessChunk(i, task);
		}
	}

	for (let i = 0; i < workers.length; i++) {
		if (!busy[i] && lightQueue.length > 0) {
			const item = lightQueue.shift();
			ProcessLight(i, item.chunk);
		}
	}

	for (let i = 0; i < workers.length; i++) {
		if (!busy[i] && meshQueue.length > 0) {
			const item = meshQueue.shift();
			ProcessMesh(i, item.chunk);
		}
	}
}

export function InitWorkers() {
	for (let i = 0; i < poolSize; i++) {
		const worker = new Worker("./src/worker/WorkerHandler.js", {
			type: "module",
		});
		workers.push(worker);

		worker.onmessage = (ev) => {
			if (ev.data.type === "Mesh") ProcessMeshFinish(i, ev);
			else if (ev.data.type === "Terrain") ProcessTerrainFinish(i, ev);
			else if (ev.data.type === "Light") ProcessLightFinish(i, ev);
		};

		worker.postMessage({
			type: "Init",
			data: {
				blocks: BLOCK_DATA,
				biomes: BIOME_DATA,
			},
		});

		busy.push(false);
	}
}
