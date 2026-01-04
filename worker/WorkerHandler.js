import { BIOME_DATA } from "../Globals/Biomes/Biomes.js";
import { BLOCK_DATA, InputBlocks } from "../Globals/Blocks/Blocks.js";
import { CalculateLight } from "./LightBuilder.js";
import { BuildVerts } from "./MeshBuilder.js";
import { BuildChunk } from "./TerrainBuilder.js";

self.onmessage = function (event) {
	const { type, data } = event.data;

	if (type === "Terrain") {
		const { chunkX, chunkZ, seed } = data;

		let { blocks, solidHeightmap, transparentHeightmap, lightSources } =
			BuildChunk(chunkX, chunkZ, seed);

		self.postMessage({
			type,
			chunkX,
			chunkZ,
			blocks,
			solidHeightmap,
			transparentHeightmap,
			lightSources,
		});
	} else if (type === "Mesh") {
		const { chunk, chunkX, chunkZ, neighborChunks, lightMap } = data;

		let { blockVerts, waterVerts } = BuildVerts(
			chunk,
			neighborChunks,
			lightMap
		);

		self.postMessage({ type, chunkX, chunkZ, blockVerts, waterVerts }, [
			blockVerts.buffer,
			waterVerts.buffer,
		]);
	} else if (type === "Light") {
		const {
			blocks,
			chunkX,
			chunkZ,
			neighbours,
			neighbourBlocks,
			initial,
			lightSourcesCache,
			solidHeightmap,
			transparentHeightmap,
		} = data;

		let { lightMap, recalculates } = CalculateLight(
			blocks,
			neighbours,
			neighbourBlocks,
			initial,
			lightSourcesCache,
			solidHeightmap,
			transparentHeightmap
		);

		self.postMessage({ type, lightMap, recalculates, chunkX, chunkZ });
	} else if (type === "Init") {
		const { blocks, biomes } = data;

		Object.assign(BIOME_DATA, biomes);

		InputBlocks(blocks);
	}
};
