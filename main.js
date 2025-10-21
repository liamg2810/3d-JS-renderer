import { Player } from "./Player.js";
import { Renderer } from "./Renderer.js";

const canvas = document.getElementById("canvas");

const p = new Player(0, 50, 0);
const r = new Renderer(p);

document.addEventListener("keydown", (ev) => {
	// ev.preventDefault();

	p.keyMap.add(ev.key);
});

document.addEventListener("keyup", (ev) => {
	ev.preventDefault();

	if (p.keyMap.has(ev.key)) {
		p.keyMap.delete(ev.key);
	}

	if (ev.key === "g" && ev.altKey) {
		r.showChunkBorders = !r.showChunkBorders;
	}
});

canvas.addEventListener("click", (ev) => {
	canvas.requestPointerLock();
});

canvas.addEventListener("mousemove", (ev) => {
	p.view.pitch -= ev.movementX * 0.5;
	p.view.yaw -= ev.movementY * 0.5;
	p.view.yaw = Math.max(Math.min(p.view.yaw, 45), -45);
});
