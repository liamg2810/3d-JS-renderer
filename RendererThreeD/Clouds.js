import { gl } from "../Globals/Canvas.js";
import Player from "../Player/Player.js";
import {
	CreateModelViewMatrix,
	CreateProjectectionMatrix,
} from "./Matrices.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";
import { TextureManager } from "./TextureManager.js";

class Clouds {
	/** @type {import("./TextureManager.js").TextureManager} */
	CloudTexture;

	/** @type {import('./ShaderProgram.js').ShaderProgram} */
	Shader;

	ShadersInit = false;

	constructor() {
		this.CloudTexture = new TextureManager("/clouds.png");

		this.InitShaders();
	}

	async InitShaders() {
		const vs = await (await fetch("./shaders/clouds.vert")).text();
		const fs = await (await fetch("./shaders/clouds.frag")).text();

		this.Shader = new ShaderProgram(vs, fs, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aTextureCoord", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
		]);

		this.ShadersInit = true;
	}

	Draw() {
		gl.useProgram(this.Shader.shaderProgram);

		const planeScale = 2000;
		const planeY = 300;

		// prettier-ignore
		const verts = [
				Player.position.x + planeScale, planeY, Player.position.z + planeScale,
				Player.position.x + planeScale, planeY, Player.position.z - planeScale,
				Player.position.x - planeScale, planeY, Player.position.z + planeScale,
				Player.position.x - planeScale, planeY, Player.position.z - planeScale, 
			];

		const t = (performance.now() / 800000) % 1;

		// prettier-ignore
		const texCoords = [
				1, t + 1,
				1,t,
				0,t + 1,
				0,t,
			]

		const indices = [3, 1, 2, 2, 1, 0];

		const projectionMatrix = CreateProjectectionMatrix();
		const modelViewMatrix = CreateModelViewMatrix();

		gl.uniformMatrix4fv(
			this.Shader.GetLocation("uProjectionMatrix", INFO_TYPES.UNIFORM),
			false,
			projectionMatrix
		);
		gl.uniformMatrix4fv(
			this.Shader.GetLocation("uModelViewMatrix", INFO_TYPES.UNIFORM),
			false,
			modelViewMatrix
		);

		const vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
		gl.vertexAttribPointer(
			this.Shader.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
			3,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.Shader.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
		);

		const tBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(texCoords),
			gl.STATIC_DRAW
		);
		gl.vertexAttribPointer(
			this.Shader.GetLocation("aTextureCoord", INFO_TYPES.ATTRIBUTE),
			2,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.Shader.GetLocation("aTextureCoord", INFO_TYPES.ATTRIBUTE)
		);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.CloudTexture.texture);
		gl.uniform1i(
			this.Shader.GetLocation("uSampler", INFO_TYPES.UNIFORM),
			0
		);

		const iBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			new Uint16Array(indices),
			gl.STATIC_DRAW
		);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);

		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
	}
}

export default new Clouds();
