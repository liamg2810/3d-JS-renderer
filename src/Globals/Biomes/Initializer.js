import biomes from "../../../public/biomes.json";
import { GetBlock } from "../Blocks/Blocks.js";
import { ROOT } from "../Window";
import { BIOME_DATA } from "./Biomes.js";

export async function LoadBiomes() {
	for (let [key, value] of Object.entries(biomes)) {
		biomes[key]["surface_block"] = GetBlock(value["surface_block"]).code;
		biomes[key]["subsurface_block"] = GetBlock(
			value["subsurface_block"],
		).code;
	}

	Object.assign(BIOME_DATA, biomes);
}
