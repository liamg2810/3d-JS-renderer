export const canvas: HTMLCanvasElement = document.getElementById(
	"canvas"
) as HTMLCanvasElement;

if (canvas === null) {
	alert("Canvas not found.");
}

export const gl: WebGL2RenderingContext = canvas.getContext("webgl2");

if (gl === null) {
	alert("Unable to initialize WebGL.");
}

export const ROOT = window.location.href;
export const TEXTURE_ROOT = ROOT + "static/textures/";
