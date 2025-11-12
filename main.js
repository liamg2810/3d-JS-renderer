import { Player } from "./Player.js";
import { Renderer } from "./Renderer.js";

const canvas = document.getElementById("canvas");

const p = new Player(8, 90, 8);
const r = new Renderer(p);
r.Start();

document.addEventListener("keydown", (ev) => {
	ev.preventDefault();

	p.keyMap.add(ev.key.toLowerCase());
});

document.addEventListener("keyup", (ev) => {
	ev.preventDefault();

	if (p.keyMap.has(ev.key.toLowerCase())) {
		p.keyMap.delete(ev.key.toLowerCase());
	}

	if (ev.key === "g" && ev.altKey) {
		r.showChunkBorders = !r.showChunkBorders;
	}
});

canvas.addEventListener("click", (ev) => {
	canvas.requestPointerLock();
});

canvas.addEventListener("mousemove", (ev) => {
	if (!document.pointerLockElement) {
		return;
	}

	p.view.yaw -= ev.movementX * 0.3;
	p.view.pitch -= ev.movementY * 0.2;
	p.view.pitch = Math.max(Math.min(p.view.pitch, 45), -45);
});
