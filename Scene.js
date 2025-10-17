import { Chunk } from "./Game.js";

export function VoxelTerrainScene(renderer) {
	renderer.chunks = [];

	const chunks = 4;

	for (let x = 0; x < chunks; x++) {
		for (let z = 0; z < chunks; z++) {
			renderer.chunks.push(new Chunk(renderer.gl, x, z));
		}
	}
}
