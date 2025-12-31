import { ROOT } from "./Window.js";

export const TEX_ARRAY = [];
export const BLOCK_ARRAY = [];
export const TRANSPARENT_ARRAY = [];
export const ILLUMINATION_ARRAY = [];

export async function LoadBlocks() {
	let json = await (await fetch(ROOT + "static/blocks.json")).json();

	for (let o of Object.values(json)) {
		TEX_ARRAY.push(o["texture"]["top"]);
		TEX_ARRAY.push(o["texture"]["bottom"]);
		TEX_ARRAY.push(o["texture"]["left"]);
		TEX_ARRAY.push(o["texture"]["right"]);
		TEX_ARRAY.push(o["texture"]["front"]);
		TEX_ARRAY.push(o["texture"]["back"]);

		BLOCK_ARRAY.push(o["code"]);
		TRANSPARENT_ARRAY.push(o["transparent"]);
		ILLUMINATION_ARRAY.push(o["illumination"]);
	}
}
