import { db } from "../Globals/DB/db.js";
import Player from "../Player/Player.js";
import {
	CreateChunk,
	enqueueChunk,
	enqueueLight,
	enqueueMesh,
	removeLoadedChunk,
} from "../Scene.js";
import { settings } from "../ui/exports.svelte.js";
import { Chunk } from "./Chunk.js";

class ChunkManager {
	/** @type {Chunk[]} */
	chunks = [];

	lastLoad = 0;
	loadInteval = 100;

	lastSave = 0;
	saveInterval = 5000;
	pendingSaves = new Map();

	GetChunkAtPos(x, z) {
		return this.chunks.find((c) => c.x === x && c.z === z);
	}

	async LoadChunks() {
		const now = Date.now();

		if (now - this.lastLoad < this.loadInteval) return;

		this.lastLoad = now;

		const remainingChunks = [];

		for (const c of this.chunks) {
			const inRenderDistance =
				Math.abs(c.x - Player.chunkX) <= settings.renderDistance &&
				Math.abs(c.z - Player.chunkZ) <= settings.renderDistance;

			if (!inRenderDistance && c.builtVerts) {
				c.ClearMesh();
			}

			const unload =
				Math.abs(c.x - Player.chunkX) > settings.renderDistance + 2 ||
				Math.abs(c.z - Player.chunkZ) > settings.renderDistance + 2;

			if (unload) {
				this.pendingSaves.set(`${c.x},${c.z}`, {
					chunkX: c.x,
					chunkZ: c.z,
					blocks: c.blocks,
					solidHeightmap: c.solidHeightmap,
					transparentHeightmap: c.transparentHeightmap,
					lightSources: Array.from(c.lightSourcesCache || []),
				});
				removeLoadedChunk(c.x, c.z);
			} else {
				remainingChunks.push(c);
			}
		}

		this.chunks = remainingChunks;

		if (
			now - this.lastSave > this.saveInterval &&
			this.pendingSaves.size > 0
		) {
			this.saveChunksAsync().catch(console.error);
			this.lastSave = now;
		}

		const missedChunks = new Set();

		for (let r = 0; r < settings.renderDistance + 2; r++) {
			for (let x = -r; x <= r; x++) {
				for (let z = -r; z <= r; z++) {
					if (Math.max(Math.abs(x), Math.abs(z)) !== r) continue;

					const cx = Player.chunkX + x;
					const cz = Player.chunkZ + z;

					const chunk = this.GetChunkAtPos(cx, cz);

					if (chunk === undefined) {
						missedChunks.add(`${cx},${cz}`);
					} else if (
						!chunk.calculatedLight &&
						r <= settings.renderDistance
					) {
						enqueueLight(chunk);
					} else if (
						!chunk.builtVerts &&
						r <= settings.renderDistance
					) {
						enqueueMesh(chunk);
					}
				}
			}
		}

		if (missedChunks.size === 0) return;

		try {
			const loadPromises = Array.from(missedChunks).map(async (key) => {
				const [cx, cz] = key.split(",").map(Number);

				try {
					const chunk = await db.chunks
						.where("[chunkX+chunkZ]")
						.equals([cx, cz])
						.first();

					if (chunk) {
						CreateChunk(
							chunk.chunkX,
							chunk.chunkZ,
							chunk.blocks,
							chunk.solidHeightmap,
							chunk.transparentHeightmap,
							new Set(chunk.lightSources)
						);
						return key;
					}
					return null;
				} catch (err) {
					console.error(`Failed to load chunk ${cx},${cz}:`, err);
					return null;
				}
			});

			const loaded = await Promise.all(loadPromises);

			for (const key of missedChunks) {
				if (!loaded.includes(key)) {
					const [cx, cz] = key.split(",").map(Number);
					enqueueChunk(cx, cz);
				}
			}
		} catch (err) {
			console.error("Chunk loading error:", err);
		}
	}

	async saveChunksAsync() {
		if (this.pendingSaves.size === 0) return;

		console.log("saving game");

		const chunksToSave = Array.from(this.pendingSaves.values());
		this.pendingSaves.clear();

		try {
			await db.chunks.bulkPut(
				chunksToSave.map((c) => ({
					...c,
					"[chunkX+chunkZ]": [c.chunkX, c.chunkZ],
				}))
			);
		} catch (err) {
			console.error("Failed to save chunks:", err);
		}
	}

	// TODO: implement save on exit / 5 minute full autosave
	async saveAll() {
		for (const c of this.chunks) {
			this.pendingSaves.set(`${c.x},${c.z}`, {
				chunkX: c.x,
				chunkZ: c.z,
				blocks: c.blocks,
				solidHeightmap: c.solidHeightmap,
				transparentHeightmap: c.transparentHeightmap,
				lightSources: Array.from(c.lightSourcesCache || []),
			});
		}
		await this.saveChunksAsync();
	}
}

export default new ChunkManager();
