import { GetShader, SHADERS } from "../Globals/Shaders";
import { gl, ROOT, TEXTURE_ROOT } from "../Globals/Window";
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

	vBuffer;
	tBuffer;
	iBuffer;

	constructor() {
		this.CloudTexture = new TextureManager(TEXTURE_ROOT + "clouds.png");

		this.InitShaders();

		this.vBuffer = gl.createBuffer();
		this.tBuffer = gl.createBuffer();
		this.iBuffer = gl.createBuffer();
	}

	async InitShaders() {
		const vs = await GetShader(SHADERS.CLOUDS_VERT);
		const fs = await GetShader(SHADERS.CLOUDS_FRAG);

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

		gl.disable(gl.CULL_FACE);

		const planeScale = 4096;
		const planeY = 300;

		const px = Player.position.x % 16;

		const pz = Player.position.z % 16;

		// prettier-ignore
		const verts = [
			px + planeScale, planeY, pz+planeScale,
			px + planeScale, planeY, pz-planeScale,
			px-planeScale, planeY, pz + planeScale,
			px-planeScale, planeY, pz-planeScale, 
		];

		const t = (performance.now() / 800000) % 1;

		// prettier-ignore
		const texCoords = [
				t / 2 + 1, t + 1,
				t / 2 + 1,t,
				t / 2,t + 1,
				t / 2,t,
			]

		const indices = [3, 1, 2, 0];

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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
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

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			new Uint16Array(indices),
			gl.STATIC_DRAW
		);

		gl.drawElements(
			gl.TRIANGLE_STRIP,
			indices.length,
			gl.UNSIGNED_SHORT,
			0
		);

		gl.enable(gl.CULL_FACE);
	}
}

export default new Clouds();
