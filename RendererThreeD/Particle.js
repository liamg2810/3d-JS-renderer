import { GetShader, SHADERS } from "../Globals/Shaders.js";
import { gl, ROOT } from "../Globals/Window.js";
import Player from "../Player/Player.js";
import {
	CreateModelViewMatrix,
	CreateProjectectionMatrix,
} from "./Matrices.js";
import ParticleTextureManager from "./ParticleTextureManager.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";

const CELLS_PER_ROW = 128 / 8;
const CELLS_PER_COL = 128 / 8;

export class Particle {
	/** @type {import("../Globals/Constants").PARTICLE} */
	particle;

	/** @type {import("./ShaderProgram").ShaderProgram} */
	shader;

	vertBuff;

	shadersInit = false;

	CurrentKeyframe = 0;

	LastKeyframeUpdate = 0;

	x;
	y;
	z;

	/**
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} size
	 * @param {import("../Globals/Constants").PARTICLE} particle
	 * @param {number} [startKeyframe=0]
	 */
	constructor(x, y, z, size, particle, startKeyframe = 0) {
		this.x = x;
		this.y = y;
		this.z = z;

		this.particle = particle;

		this.CurrentKeyframe = startKeyframe;
		this.LastKeyframeUpdate = Date.now();

		this.InitShaders(size);
	}

	/**
	 *
	 * @param {number} size
	 */
	async InitShaders(size) {
		const vs = await GetShader(SHADERS.PARTICLE_VERT);
		const fs = await GetShader(SHADERS.PARTICLE_FRAG);

		this.shader = new ShaderProgram(vs, fs, [
			// ATTRIBUTES
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aTexCoord", type: INFO_TYPES.ATTRIBUTE },
			// UNIFORMS
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uParticleOrigin", type: INFO_TYPES.UNIFORM },
			{ name: "uSize", type: INFO_TYPES.UNIFORM },
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
		]);

		this.shadersInit = true;

		this.ShaderConstants(size);
	}

	/**
	 *
	 * @param {number} size
	 */
	ShaderConstants(size) {
		if (!this.shadersInit) throw new Error("Shaders are not initialized.");

		gl.useProgram(this.shader.shaderProgram);

		// prettier-ignore
		const verts = [
			-1, -1, 0,
			-1, 1, 0,
			1, -1, 0,
			1, 1, 0,
		]

		this.vertBuff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuff);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
		gl.vertexAttribPointer(
			this.shader.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
			3,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.shader.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
		);

		gl.uniform1f(
			this.shader.GetLocation("uSize", INFO_TYPES.UNIFORM),
			size
		);
	}

	Draw() {
		if (!this.shadersInit) return;

		gl.useProgram(this.shader.shaderProgram);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, ParticleTextureManager.texture.texture);
		gl.uniform1i(
			this.shader.GetLocation("uSampler", INFO_TYPES.UNIFORM),
			0
		);

		const projectionMatrix = CreateProjectectionMatrix();
		const modelViewMatrix = CreateModelViewMatrix();

		gl.uniformMatrix4fv(
			this.shader.GetLocation("uProjectionMatrix", INFO_TYPES.UNIFORM),
			false,
			projectionMatrix
		);
		gl.uniformMatrix4fv(
			this.shader.GetLocation("uModelViewMatrix", INFO_TYPES.UNIFORM),
			false,
			modelViewMatrix
		);
		const xOff = Player.position.x < 0 ? 16 : 0;
		const zOff = Player.position.z < 0 ? 16 : 0;

		gl.uniform3fv(
			this.shader.GetLocation("uParticleOrigin", INFO_TYPES.UNIFORM),
			new Float32Array([
				this.x - Math.floor((Player.position.x + xOff) / 16) * 16,
				this.y,
				this.z - Math.floor((Player.position.z + zOff) / 16) * 16,
			])
		);

		const k = this.particle.KEYFRAMES[this.CurrentKeyframe];

		if (Date.now() - this.particle.DURATION > this.LastKeyframeUpdate) {
			this.CurrentKeyframe++;
			this.LastKeyframeUpdate = Date.now();
		}

		if (this.CurrentKeyframe >= this.particle.KEYFRAMES.length)
			this.CurrentKeyframe = 0;

		// prettier-ignore
		const texCoords = [
			k.x / CELLS_PER_COL, k.y / CELLS_PER_ROW,
			k.x / CELLS_PER_COL, (k.y + 1) / CELLS_PER_ROW,
			(k.x + 1) / CELLS_PER_COL, k.y / CELLS_PER_ROW,
			(k.x + 1) / CELLS_PER_COL, (k.y + 1) / CELLS_PER_ROW,
		];

		const tBuff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, tBuff);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(texCoords),
			gl.STATIC_DRAW
		);
		gl.vertexAttribPointer(
			this.shader.GetLocation("aTexCoord", INFO_TYPES.ATTRIBUTE),
			2,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.shader.GetLocation("aTexCoord", INFO_TYPES.ATTRIBUTE)
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuff);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
}
