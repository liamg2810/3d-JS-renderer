import { GetBlock } from "../Blocks/Blocks.js";
import { ROOT } from "../Window";
import { BIOME_DATA } from "./Biomes.js";

export async function LoadBiomes() {
	let json = await (await fetch(ROOT + "static/biomes.json")).json();

	for (let [key, value] of Object.entries(json)) {
		json[key]["surface_block"] = GetBlock(value["surface_block"]).code;
		json[key]["subsurface_block"] = GetBlock(
			value["subsurface_block"]
		).code;
	}

	Object.assign(BIOME_DATA, json);
}
