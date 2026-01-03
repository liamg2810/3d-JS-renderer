import { GetShader, SHADERS } from "../Globals/Shaders.js";
import { gl, ROOT, TEXTURE_ROOT } from "../Globals/Window.js";
import Player from "../Player/Player.js";
import {
	CreateModelViewMatrix,
	CreateProjectectionMatrix,
} from "./Matrices.js";
import { Particle } from "./Particle.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";
import { TextureManager } from "./TextureManager.js";

const CELLS_PER_ROW = 128 / 8;
const CELLS_PER_COL = 128 / 8;

class ParticleManager {
	/** @type {TextureManager} */
	Texture;
	/** @type {ShaderProgram} */
	Shader;
	/** @type {WebGLVertexArrayObject} */
	vao;

	/** @type {Particle[]} */
	Particles = [];

	TexCoordBuffer = gl.createBuffer();
	TexOffsetsBuffer = gl.createBuffer();
	OriginsBuffer = gl.createBuffer();
	SizesBuffer = gl.createBuffer();

	shadersInit = false;

	constructor() {
		this.Texture = new TextureManager(TEXTURE_ROOT + "particles.png");

		this.InitShaders();
	}

	async InitShaders() {
		const vs = await GetShader(SHADERS.PARTICLE_VERT);
		const fs = await GetShader(SHADERS.PARTICLE_FRAG);

		this.Shader = new ShaderProgram(vs, fs, [
			// ATTRIBUTES
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aTexCoord", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aParticleOrigin", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aTexOffsets", type: INFO_TYPES.ATTRIBUTE },
			// UNIFORMS
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
		]);

		this.shadersInit = true;

		this.ShaderConstants();
	}

	ShaderConstants() {
		if (!this.shadersInit) throw new Error("Shaders are not initialized.");

		gl.useProgram(this.Shader.shaderProgram);

		// prettier-ignore
		const verts = [
			-1, 1, 0,
			-1, -1, 0,
			1, 1, 0,
			1, -1, 0,
		];

		// prettier-ignore
		const texCoords = [
            0, 0,
            0, 1,
            1, 0,
            1, 1,
        ];

		this.vao = gl.createVertexArray();

		gl.bindVertexArray(this.vao);

		const InstanceVertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, InstanceVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

		gl.enableVertexAttribArray(
			this.Shader.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
		);
		gl.vertexAttribPointer(
			this.Shader.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE), // location
			3, // size (num values to pull from buffer per iteration)
			gl.FLOAT, // type of data in buffer
			false, // normalize
			0, // stride (0 = compute from size and type above)
			0 // offset in buffer
		);
		gl.vertexAttribDivisor(
			this.Shader.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
			0
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.TexCoordBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(texCoords),
			gl.STATIC_DRAW
		);

		gl.enableVertexAttribArray(
			this.Shader.GetLocation("aTexCoord", INFO_TYPES.ATTRIBUTE)
		);
		gl.vertexAttribPointer(
			this.Shader.GetLocation("aTexCoord", INFO_TYPES.ATTRIBUTE),
			2,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.vertexAttribDivisor(
			this.Shader.GetLocation("aTexCoord", INFO_TYPES.ATTRIBUTE),
			0
		);

		gl.bindVertexArray(null);
	}

	Draw() {
		gl.useProgram(this.Shader.shaderProgram);

		const texOffsets = new Float32Array(4 * this.Particles.length);
		const origins = new Float32Array(4 * this.Particles.length);

		for (let i = 0; i < this.Particles.length; i++) {
			const p = this.Particles[i];

			p.AdvanceKeyframe();

			const k = p.particle.KEYFRAMES[p.CurrentKeyframe];

			// prettier-ignore
			texOffsets.set([
				k.x / CELLS_PER_COL,
				k.y / CELLS_PER_ROW,
				1 / CELLS_PER_COL,
				1 / CELLS_PER_ROW,
			], i * 4);

			const xOff = Player.position.x < 0 ? 16 : 0;
			const zOff = Player.position.z < 0 ? 16 : 0;

			origins.set(
				[
					p.x - Math.floor((Player.position.x + xOff) / 16) * 16,
					p.y,
					p.z - Math.floor((Player.position.z + zOff) / 16) * 16,
					p.size,
				],
				i * 4
			);
		}

		gl.bindVertexArray(this.vao);

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

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.Texture.texture);
		gl.uniform1i(
			this.Shader.GetLocation("uSampler", INFO_TYPES.UNIFORM),
			0
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.TexOffsetsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, texOffsets, gl.STATIC_DRAW);
		gl.vertexAttribPointer(
			this.Shader.GetLocation("aTexOffsets", INFO_TYPES.ATTRIBUTE),
			4,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.Shader.GetLocation("aTexOffsets", INFO_TYPES.ATTRIBUTE)
		);
		gl.vertexAttribDivisor(
			this.Shader.GetLocation("aTexOffsets", INFO_TYPES.ATTRIBUTE),
			1
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.OriginsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, origins, gl.STATIC_DRAW);
		gl.vertexAttribPointer(
			this.Shader.GetLocation("aParticleOrigin", INFO_TYPES.ATTRIBUTE),
			4,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.Shader.GetLocation("aParticleOrigin", INFO_TYPES.ATTRIBUTE)
		);
		gl.vertexAttribDivisor(
			this.Shader.GetLocation("aParticleOrigin", INFO_TYPES.ATTRIBUTE),
			1
		);

		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.Particles.length);

		gl.bindVertexArray(null);
	}

	/**
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} size
	 * @param {import("../Globals/Constants").PARTICLE} particle
	 * @param {number} [startKeyframe=0]
	 */
	AddParticle(x, y, z, size, particle, startKeyframe = 0) {
		const p = new Particle(x, y, z, size, particle, startKeyframe);

		this.Particles.push(p);

		return p;
	}
}

export default new ParticleManager();
