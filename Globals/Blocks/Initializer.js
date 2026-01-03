import { ROOT } from "../Window.js";
import { InputBlocks } from "./Blocks.js";

export async function LoadBlocks() {
	let json = await (await fetch(ROOT + "static/blocks.json")).json();

	InputBlocks(json);
}
