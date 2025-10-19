import { Renderer } from "./Renderer.js";

const r = new Renderer();

document.addEventListener("keydown", (ev) => {
	// ev.preventDefault();

	r.keyMap.add(ev.key);
});

document.addEventListener("keyup", (ev) => {
	ev.preventDefault();

	if (r.keyMap.has(ev.key)) {
		r.keyMap.delete(ev.key);
	}

	if (ev.key === "g" && ev.altKey) {
		r.showChunkBorders = !r.showChunkBorders;
	}
});
