import { Chunk } from "./Game.js";

const poolSize = navigator.hardwareConcurrency || 4;

const workers = [];
const busy = [];

for (let i = 0; i < poolSize; i++) {
	const worker = new Worker("./worker/WorkerHandler.js", { type: "module" });
	workers.push(worker);
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
 * @param {import('Renderer.js').Renderer} renderer
 */
export function enqueueChunk(chunkX, chunkZ, renderer) {
	const key = `${chunkX}, ${chunkZ}`;

	if (activeChunks.has(key) || completedChunks.has(key)) {
		return;
	}

	activeChunks.add(key);
	chunkQueue.push({ chunkX, chunkZ, seed: renderer.seed });
	processQueue(renderer);
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

/**
 *
 * @param {import('./Renderer.js').Renderer | import('./2D-Renderer.js').TwoDRenderer} renderer
 */
function processQueue(renderer) {
	for (let i = 0; i < workers.length; i++) {
		if (!busy[i] && chunkQueue.length > 0) {
			const task = chunkQueue.shift();

			busy[i] = true;

			workers[i].onmessage = (ev) => {
				const { chunkX, chunkZ, blocks } = ev.data;
				const key = `${chunkX}, ${chunkZ}`;
				renderer.chunks.push(
					new Chunk(
						renderer.gl,
						renderer,
						chunkX,
						chunkZ,
						blocks,
						renderer.isTwoD
					)
				);

				activeChunks.delete(key);
				completedChunks.add(key);

				busy[i] = false;
				processQueue(renderer); // check for next task
			};

			workers[i].postMessage({ type: "Terrain", data: task });
		}
	}

	for (let i = 0; i < workers.length; i++) {
		if (!busy[i] && meshQueue.length > 0) {
			const chunk = meshQueue.shift();

			const neighborChunks = {
				px: renderer.GetChunkAtPos(chunk.x + 1, chunk.z)?.blocks,
				nx: renderer.GetChunkAtPos(chunk.x - 1, chunk.z)?.blocks,
				pz: renderer.GetChunkAtPos(chunk.x, chunk.z + 1)?.blocks,
				nz: renderer.GetChunkAtPos(chunk.x, chunk.z - 1)?.blocks,
			};

			busy[i] = true;

			workers[i].onmessage = (ev) => {
				const { blockVerts, waterVerts } = ev.data;
				const key = `${chunk.x}, ${chunk.z}`;

				chunk.PostVerts(blockVerts, waterVerts);

				busy[i] = false;

				activeMeshes.delete(key);
				processQueue(renderer); // check for next task
			};

			workers[i].postMessage({
				type: "Mesh",
				data: {
					chunk: chunk.blocks,
					neighborChunks: neighborChunks,
				},
			});
		}
	}
}

/**
 *
 * @param {import('./Renderer.js').Renderer} renderer
 */
export function VoxelTerrainScene(renderer) {
	renderer.chunks = [];

	const chunks = 4;

	for (let x = 0; x < chunks; x++) {
		for (let z = 0; z < chunks; z++) {
			enqueueChunk(x, z, renderer);
		}
	}
}
