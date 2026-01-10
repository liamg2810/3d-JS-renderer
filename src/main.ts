import { canvas } from "./Globals/Window";
import Player from "./Player/Player.js";
import Renderer from "./RendererThreeD/Renderer.js";
import { debug } from "./ui/exports.svelte.js";

/** @type {HTMLInputElement} */
const renderDistanceInput = document.getElementById("render-d");

document.addEventListener("keydown", (ev) => {
	if (ev.key === "F11" || ev.key === "F5") {
		return;
	}

	if (ev.key === "p") {
		debug.paused = true;

		document.exitPointerLock();
	}

	ev.preventDefault();

	Player.keyMap.add(ev.key.toLowerCase());
});

document.addEventListener("pointerlockchange", () => {
	if (!document.pointerLockElement) {
		debug.paused = true;
	}
});

document.addEventListener("keyup", (ev) => {
	ev.preventDefault();

	if (Player.keyMap.has(ev.key.toLowerCase())) {
		Player.keyMap.delete(ev.key.toLowerCase());
	}

	if (ev.key === "g" && ev.altKey) {
		Renderer.showChunkBorders = !Renderer.showChunkBorders;
	}
});

canvas.addEventListener("click", (ev) => {
	if (document.pointerLockElement && ev.button === 0) {
		Player.Break();
	}

	canvas.requestPointerLock();
});

canvas.addEventListener("mousedown", (ev) => {
	if (!document.pointerLockElement) {
		return;
	}

	if (ev.button === 2) {
		ev.preventDefault();

		Player.Place();
	}
});

canvas.addEventListener("mousemove", (ev) => {
	if (!document.pointerLockElement) {
		return;
	}

	Player.view.yaw -= ev.movementX * 0.3;
	Player.view.pitch -= ev.movementY * 0.2;
});

window.addEventListener("resize", () => {
	ResizeCanvas();
});

canvas.addEventListener("wheel", (ev) => {
	Player.SwitchBlock(ev.deltaY < 0 ? 1 : -1);
});

renderDistanceInput.addEventListener("change", (ev: any) => {
	Player.renderDistance = parseInt(ev.target.value ?? 4);
});

function ResizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

ResizeCanvas();

Renderer.Start();
