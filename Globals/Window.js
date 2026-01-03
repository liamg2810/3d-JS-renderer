/**
 * @type {HTMLCanvasElement}
 */
export const canvas = document.getElementById("canvas");

if (canvas === null) {
	alert("Canvas not found.");
}

/** @type {WebGL2RenderingContext} */
export const gl = canvas.getContext("webgl2");

if (gl === null) {
	alert("Unable to initialize WebGL.");
}

export const ROOT = window.location.href;
export const TEXTURE_ROOT = ROOT + "static/textures/";
