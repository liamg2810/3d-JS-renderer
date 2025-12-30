import { PARTICLES } from "./Globals/Constants.js";
import { canvas } from "./Globals/Window.js";
import Player from "./Player/Player.js";
import { Particle } from "./RendererThreeD/Particle.js";
import Renderer from "./RendererThreeD/Renderer.js";

/** @type {HTMLInputElement} */
const renderDistanceInput = document.getElementById("render-d");

document.addEventListener("keydown", (ev) => {
	if (ev.key === "F11" || ev.key === "F5") {
		return;
	}

	ev.preventDefault();

	Player.keyMap.add(ev.key.toLowerCase());
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
	if (document.pointerLockElement) {
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

	if (!Renderer.isTwoD) {
		Player.view.yaw -= ev.movementX * 0.3;
		Player.view.pitch -= ev.movementY * 0.2;
		Player.view.pitch = Math.max(Math.min(Player.view.pitch, 90), -90);
	}
});

window.addEventListener("resize", () => {
	ResizeCanvas();
});

renderDistanceInput.addEventListener("change", (ev) => {
	console.log(ev.target.value, typeof ev.target.value);
	Player.renderDistance = parseInt(ev.target.value);
});

function ResizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

ResizeCanvas();

Renderer.Start();
