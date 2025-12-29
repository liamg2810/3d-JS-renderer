import Player from "../Player/Player.js";
import { enqueueChunk, enqueueLight, removeLoadedChunk } from "../Scene.js";
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

		for (
			let x = Player.chunkX - Player.renderDistance - 2;
			x <= Player.chunkX + Player.renderDistance + 2;
			x++
		) {
			for (
				let z = Player.chunkZ - Player.renderDistance - 2;
				z <= Player.chunkZ + Player.renderDistance + 2;
				z++
			) {
				const chunk = this.GetChunkAtPos(x, z);

				if (chunk === undefined) {
					enqueueChunk(x, z);
				} else if (!chunk.calculatedLight) {
					enqueueLight(chunk);
				}
			}
		}
	}
}

export default new ChunkManager();
