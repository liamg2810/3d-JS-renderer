import Player from "../Player/Player.js";
import {
	enqueueChunk,
	enqueueLight,
	enqueueMesh,
	removeLoadedChunk,
} from "../Scene.js";
import { Chunk } from "./Chunk.js";

class ChunkManager {
	/** @type {Chunk[]} */
	chunks = [];

	GetChunkAtPos(x, z) {
		return this.chunks.find((c) => c.x === x && c.z === z);
	}

	LoadChunks() {
		this.chunks = this.chunks.filter((c) => {
			const unloadMesh =
				c.x >= Player.chunkX - Player.renderDistance &&
				c.x <= Player.chunkX + Player.renderDistance &&
				c.z >= Player.chunkZ - Player.renderDistance &&
				c.z <= Player.chunkZ + Player.renderDistance;

			if (!unloadMesh) {
				c.builtVerts = false;
			}

			const unload =
				c.x >= Player.chunkX - Player.renderDistance - 2 &&
				c.x <= Player.chunkX + Player.renderDistance + 2 &&
				c.z >= Player.chunkZ - Player.renderDistance - 2 &&
				c.z <= Player.chunkZ + Player.renderDistance + 2;

			if (unload) {
				removeLoadedChunk(c.x, c.z);
			}

			return unload;
		});

		for (let r = 0; r < Player.renderDistance + 2; r++) {
			for (let x = -r; x <= r; x++) {
				for (let z = -r; z <= r; z++) {
					if (Math.max(Math.abs(x), Math.abs(z)) !== r) continue;

					const cx = Player.chunkX + x;
					const cz = Player.chunkZ + z;

					const chunk = this.GetChunkAtPos(cx, cz);

					if (chunk === undefined) {
						enqueueChunk(cx, cz);
					} else if (!chunk.calculatedLight) {
						enqueueLight(chunk);
					} else if (
						!chunk.builtVerts &&
						r <= Player.renderDistance
					) {
						enqueueMesh(chunk);
					}
				}
			}
		}
	}
}

export default new ChunkManager();
