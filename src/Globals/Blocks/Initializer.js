import { HotbarIcon } from "../../RendererThreeD/GUI/Hotbar/Icon.js";
import { ROOT } from "../Window";
import { BLOCK_ARRAY, HOTBAR_ICONS_ARRAY, InputBlocks } from "./Blocks.js";

export async function LoadBlocks() {
	let json = await (await fetch(ROOT + "static/blocks.json")).json();

	InputBlocks(json);
}

export function InitializeHotbarIcons() {
	for (let b of BLOCK_ARRAY) {
		HOTBAR_ICONS_ARRAY.push(new HotbarIcon(b));
	}
	for (let h of HOTBAR_ICONS_ARRAY) {
		h.CreateTexture();
	}
}
