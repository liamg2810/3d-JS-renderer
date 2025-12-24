import { canvas } from "../Globals/Canvas.js";
import Player from "../Player/Player.js";

let mat4 =
	(typeof window !== "undefined" &&
		(window.mat4 || (window.glMatrix && window.glMatrix.mat4))) ||
	null;
if (!mat4) {
	const gm = await import(
		"https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js"
	);
	mat4 = gm.mat4;
}

export function CreateProjectectionMatrix() {
	const projectionMatrix = mat4.create();
	mat4.perspective(
		projectionMatrix,
		(Player.fov * Math.PI) / 180,
		canvas.width / canvas.height,
		Player.near,
		Player.far
	);

	return projectionMatrix;
}

export function CreateViewMatrix() {
	const viewMatrix = mat4.create();
	mat4.rotateX(viewMatrix, viewMatrix, (-Player.view.pitch * Math.PI) / 180);
	mat4.rotateY(viewMatrix, viewMatrix, (-Player.view.yaw * Math.PI) / 180);
	mat4.translate(viewMatrix, viewMatrix, [
		-Player.position.x,
		-Player.position.y,
		-Player.position.z,
	]);

	return viewMatrix;
}

export function CreateModelViewMatrix() {
	const viewMatrix = CreateViewMatrix();

	const modelMatrix = mat4.create();
	const modelViewMatrix = mat4.create();
	mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

	return modelViewMatrix;
}

export function CreateNormalMatrix(modelViewMatrix) {
	const normalMatrix = mat4.create();
	mat4.invert(normalMatrix, modelViewMatrix);
	mat4.transpose(normalMatrix, normalMatrix);

	return normalMatrix;
}
