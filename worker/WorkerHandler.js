import { CalculateLight } from "./LightBuilder.js";
import { BuildVerts } from "./MeshBuilder.js";
import { BuildChunk } from "./TerrainBuilder.js";

self.onmessage = async function (event) {
	const { type, data } = event.data;

	if (type === "Terrain") {
		const { chunkX, chunkZ, seed } = data;

		let blocks = BuildChunk(chunkX, chunkZ, seed);

		self.postMessage({ type, chunkX, chunkZ, blocks });
		blocks = null;
	} else if (type === "Mesh") {
		const {
			chunk,
			chunkX,
			chunkZ,
			neighborChunks,
			lightMap,
			TEX_ARRAY,
			TRANSPARENT_ARRAY,
		} = data;

		let { blockVerts, waterVerts } = await BuildVerts(
			chunk,
			neighborChunks,
			lightMap,
			TEX_ARRAY,
			TRANSPARENT_ARRAY
		);

		self.postMessage({ type, chunkX, chunkZ, blockVerts, waterVerts }, [
			blockVerts.buffer,
			waterVerts.buffer,
		]);
	} else if (type === "Light") {
		const { blocks, chunkX, chunkZ, neighbours, neighbourBlocks } = data;

		let { lightMap, recalculates } = await CalculateLight(
			blocks,
			neighbours,
			neighbourBlocks
		);

		self.postMessage({ type, lightMap, recalculates, chunkX, chunkZ });
	}
};
