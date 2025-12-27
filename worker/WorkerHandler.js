import { BuildVerts } from "./MeshBuilder.js";
import { BuildChunk } from "./TerrainBuilder.js";

self.onmessage = function (event) {
	const { type, data } = event.data;

	if (type === "Terrain") {
		const { chunkX, chunkZ, seed } = data;

		let blocks = BuildChunk(chunkX, chunkZ, seed);

		self.postMessage({ type, chunkX, chunkZ, blocks });
		blocks = null;
	} else if (type === "Mesh") {
		const { chunk, chunkX, chunkZ, neighborChunks } = data;

		let { blockVerts, waterVerts } = BuildVerts(chunk, neighborChunks);

		self.postMessage({ type, chunkX, chunkZ, blockVerts, waterVerts }, [
			blockVerts.buffer,
			waterVerts.buffer,
		]);
	}
};
