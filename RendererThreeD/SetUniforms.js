import { gl } from "../Globals/Window.js";
import {
	CreateHotbarIconsModelViewMatrix,
	CreateHotbarIconsProjectionMatrix,
	CreateModelViewMatrix,
	CreateNormalMatrix,
	CreateProjectectionMatrix,
	CreateViewMatrix,
} from "./Matrices.js";
import { INFO_TYPES } from "./ShaderProgram.js";

/**
 *
 * @param {import('./ShaderProgram').ShaderProgram} blockProgram
 * @param {WebGLTexture} texture
 */
export function SetBlockProgramUniforms(blockProgram, texture) {
	const projectionMatrix = CreateProjectectionMatrix();
	const modelViewMatrix = CreateModelViewMatrix();

	gl.uniformMatrix4fv(
		blockProgram.GetLocation("uProjectionMatrix", INFO_TYPES.UNIFORM),
		false,
		projectionMatrix
	);
	gl.uniformMatrix4fv(
		blockProgram.GetLocation("uModelViewMatrix", INFO_TYPES.UNIFORM),
		false,
		modelViewMatrix
	);

	gl.uniform1f(
		blockProgram.GetLocation("uTime", INFO_TYPES.UNIFORM),
		performance.now()
	);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(blockProgram.GetLocation("uSampler", INFO_TYPES.UNIFORM), 0);
}

export function SetDebugProgramUniforms(debugProgram) {
	const projectionMatrix = CreateProjectectionMatrix();
	const modelViewMatrix = CreateModelViewMatrix();

	gl.uniformMatrix4fv(
		debugProgram.GetLocation("uProjectionMatrix", INFO_TYPES.UNIFORM),
		false,
		projectionMatrix
	);
	gl.uniformMatrix4fv(
		debugProgram.GetLocation("uModelViewMatrix", INFO_TYPES.UNIFORM),
		false,
		modelViewMatrix
	);
}

/**
 *
 * @param {import('./ShaderProgram').ShaderProgram} program
 * @param {WebGLTexture} texture
 * @param {number} size
 */
export function SetHotbarIconUniforms(program, texture, size) {
	const projectionMatrix = CreateHotbarIconsProjectionMatrix(size);
	const modelViewMatrix = CreateHotbarIconsModelViewMatrix();

	gl.uniformMatrix4fv(
		program.GetLocation("uProjectionMatrix", INFO_TYPES.UNIFORM),
		false,
		projectionMatrix
	);
	gl.uniformMatrix4fv(
		program.GetLocation("uModelViewMatrix", INFO_TYPES.UNIFORM),
		false,
		modelViewMatrix
	);

	gl.uniform1f(program.GetLocation("uTime", INFO_TYPES.UNIFORM), 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(program.GetLocation("uSampler", INFO_TYPES.UNIFORM), 0);
}
