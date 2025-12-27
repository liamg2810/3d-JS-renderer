import { Chunk } from "./Chunks/Chunk.js";
import ChunkManager from "./Chunks/ChunkManager.js";
import { gl } from "./Globals/Canvas.js";
import Player from "./Player/Player.js";
import Renderer from "./RendererThreeD/Renderer.js";

const poolSize = navigator.hardwareConcurrency || 4;

const workers = [];
const busy = [];

for (let i = 0; i < poolSize; i++) {
	const worker = new Worker("./worker/WorkerHandler.js", { type: "module" });
	workers.push(worker);

	worker.onmessage = (ev) => {
		if (ev.data.type === "Mesh") ProcessMeshFinish(i, ev);
		else if (ev.data.type === "Terrain") ProcessTerrainFinish(i, ev);
	};

	busy.push(false);
}

/** @type {{chunkX: number, chunkZ: number, seed: number}[]} */
const chunkQueue = [];
/** @type {Chunk[]} */
const meshQueue = [];
const activeMeshes = new Set();
const activeChunks = new Set();
const completedChunks = new Set();

/**
 * @param {number} chunkX
 * @param {number} chunkZ
 */
export function enqueueChunk(chunkX, chunkZ) {
	const key = `${chunkX}, ${chunkZ}`;

	if (activeChunks.has(key) || completedChunks.has(key)) {
		return;
	}

	activeChunks.add(key);
	chunkQueue.push({ chunkX, chunkZ, seed: Renderer.seed });

	processQueue();
}

/** @param {Chunk} chunk  */
export function enqueueMesh(chunk) {
	const key = `${chunk.x}, ${chunk.z}`;

	if (activeMeshes.has(key)) {
		return;
	}

	activeMeshes.add(key);

	meshQueue.push(chunk);

	processQueue(chunk.r);
}

export function isQueueing() {
	return chunkQueue.length > 0;
}

export function removeLoadedChunk(chunkX, chunkZ) {
	completedChunks.delete(`${chunkX}, ${chunkZ}`);
}

function ProcessTerrainFinish(i, ev) {
	const { chunkX, chunkZ, blocks } = ev.data;
	const key = `${chunkX}, ${chunkZ}`;
	ChunkManager.chunks.push(new Chunk(gl, chunkX, chunkZ, blocks));

	activeChunks.delete(key);
	completedChunks.add(key);

	busy[i] = false;
	processQueue();
}

function ProcessMeshFinish(i, ev) {
	const { chunkX, chunkZ, blockVerts, waterVerts } = ev.data;
	const key = `${chunkX}, ${chunkZ}`;

	const chunk = ChunkManager.GetChunkAtPos(chunkX, chunkZ);

	chunk.PostVerts(blockVerts, waterVerts);

	busy[i] = false;

	activeMeshes.delete(key);
	processQueue();
}

function processQueue() {
	for (let i = 0; i < workers.length; i++) {
		if (!busy[i] && chunkQueue.length > 0) {
			const task = chunkQueue.shift();

			busy[i] = true;

			workers[i].postMessage({ type: "Terrain", data: task });
		}

		if (!busy[i] && meshQueue.length > 0) {
			const chunk = meshQueue.shift();

			const neighborChunks = {
				px: ChunkManager.GetChunkAtPos(chunk.x + 1, chunk.z)?.blocks,
				nx: ChunkManager.GetChunkAtPos(chunk.x - 1, chunk.z)?.blocks,
				pz: ChunkManager.GetChunkAtPos(chunk.x, chunk.z + 1)?.blocks,
				nz: ChunkManager.GetChunkAtPos(chunk.x, chunk.z - 1)?.blocks,
			};

			busy[i] = true;

			workers[i].postMessage({
				type: "Mesh",
				data: {
					chunkX: chunk.x,
					chunkZ: chunk.z,
					chunk: chunk.blocks,
					neighborChunks: neighborChunks,
				},
			});
		}
	}
}
