import ChunkManager from "../Chunks/ChunkManager.js";
import { PARTICLES } from "../Globals/Constants.js";
import { GetShader, SHADERS } from "../Globals/Shaders.js";
import { gl, ROOT } from "../Globals/Window.js";
import Player from "../Player/Player.js";
import Clouds from "./Clouds.js";
import { DebugRenderer } from "./Debug.js";
import { FrameBuffer } from "./FrameBuffer.js";
import { Particle } from "./Particle.js";
import { SetBlockProgramUniforms } from "./SetUniforms.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";
import { TextThreeD } from "./Text.js";
import { TextureManager } from "./TextureManager.js";

const fpsCounter = document.getElementById("fps-count");

class Renderer {
	deltaTime = 0;

	/** @type {import('./ShaderProgram.js').ShaderProgram} */
	blockProgram;

	/** @type {number[]} */
	frameTimes = [];

	seed = Math.random() * 25564235;

	shadersInit = false;

	showChunkBorders = true;

	sceneInit = false;

	isTwoD = false;

	DebugRenderer;

	/** @type {import("./FrameBuffer.js").FrameBuffer} */
	frameBuffer;

	vao;

	Text = [];
	Particles = [];

	constructor() {
		this.frameBuffer = new FrameBuffer();

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		this.Text.push(
			new TextThreeD(
				"Hello world this is some text being rendered\nin the little project im working on for fun\n\nAs you can see the text also supports multi-line functionality.\nFun fact this text is in 3d space and you will\nalways be able to see the characters.\n\ndinnerbone",
				8,
				100,
				1,
				100
			)
		);

		this.Text.push(new TextThreeD("Introducing particles!", 8, 81, 0));

		for (let x = 4; x <= 12; x++) {
			this.Particles.push(
				new Particle(
					x,
					80,
					0,
					0.5,
					PARTICLES.ENCHANT,
					Math.floor(
						Math.random() * PARTICLES.ENCHANT.KEYFRAMES.length
					)
				)
			);
		}

		this.InitShaders();

		this.DebugRenderer = new DebugRenderer();

		this.texture = new TextureManager(ROOT + "textures.png");
	}

	Start() {
		this.InitScene();
		requestAnimationFrame(() => {
			this.Update();
		});
	}

	async InitShaders() {
		const vs = await GetShader(SHADERS.CHUNK_VERT);
		const fs = await GetShader(SHADERS.CHUNK_FRAG);

		this.blockProgram = new ShaderProgram(vs, fs, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aVertexInstance", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
			{ name: "uChunkPos", type: INFO_TYPES.UNIFORM },
			{ name: "uTime", type: INFO_TYPES.UNIFORM },
		]);
		this.shadersInit = true;
		//prettier-ignore
		const verts = [
			-1, 0, -1,
			-1, 0, 0,
			0, 0, -1,
			-1, 0, 0,
			0, 0, 0,
			0, 0, -1,
		];

		this.vao = gl.createVertexArray();

		gl.bindVertexArray(this.vao);

		const InstanceVertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, InstanceVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

		gl.enableVertexAttribArray(
			this.blockProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
		);
		gl.vertexAttribPointer(
			this.blockProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE), // location
			3, // size (num values to pull from buffer per iteration)
			gl.FLOAT, // type of data in buffer
			false, // normalize
			0, // stride (0 = compute from size and type above)
			0 // offset in buffer
		);
		gl.vertexAttribDivisor(
			this.blockProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
			0
		);
		gl.bindVertexArray(null);
	}

	InitScene() {
		ChunkManager.LoadChunks();
	}

	Update() {
		if (!this.shadersInit) {
			requestAnimationFrame(() => this.Update());
			return;
		}

		this.shadersInit = true;

		const frameStart = performance.now();

		Player.Update();

		this.Draw();

		const frameEnd = performance.now();

		this.deltaTime = frameEnd - frameStart;

		this.frameTimes.push(this.deltaTime);

		if (this.frameTimes.length > 60) {
			this.frameTimes.shift();
		}

		let totalFrameTimes = 0;

		for (let f of this.frameTimes) {
			totalFrameTimes += f;
		}

		const fps = Math.round(
			1000 / (totalFrameTimes / this.frameTimes.length)
		);

		fpsCounter.innerText = `FPS: ${fps}`;

		requestAnimationFrame(() => {
			this.Update();
		});
	}

	InFOV(dX, dZ) {
		let theta = (Math.atan2(dX, dZ) * 180) / Math.PI;
		theta += 180;
		const diff = ((Player.view.yaw - theta + 180 + 360) % 360) - 180;
		return Math.abs(diff) < Player.fov;
	}

	Draw() {
		if (!this.shadersInit) return;

		if (!this.frameBuffer.StartFrame()) return;

		gl.useProgram(this.blockProgram.shaderProgram);

		SetBlockProgramUniforms(this.blockProgram, this.texture.texture);

		let chunksWithWater = [];

		const xOff = Player.position.x < 0 ? 16 : 0;
		const zOff = Player.position.z < 0 ? 16 : 0;

		const cx = Math.floor((Player.position.x + xOff) / 16);
		const cz = Math.floor((Player.position.z + zOff) / 16);
		gl.bindVertexArray(this.vao);

		for (let i = 0; i < ChunkManager.chunks.length; i++) {
			let chunk = ChunkManager.chunks[i];
			if (!chunk.builtVerts) {
				continue;
			}

			gl.uniform2f(
				this.blockProgram.GetLocation("uChunkPos", INFO_TYPES.UNIFORM),
				(chunk.x - cx) * 16,
				(chunk.z - cz) * 16
			);

			gl.bindBuffer(gl.ARRAY_BUFFER, chunk.blockBuffer);
			gl.vertexAttribIPointer(
				this.blockProgram.GetLocation(
					"aVertexInstance",
					INFO_TYPES.ATTRIBUTE
				),
				2,
				gl.UNSIGNED_INT,
				0,
				0
			);
			gl.enableVertexAttribArray(
				this.blockProgram.GetLocation(
					"aVertexInstance",
					INFO_TYPES.ATTRIBUTE
				)
			);
			gl.vertexAttribDivisor(
				this.blockProgram.GetLocation(
					"aVertexInstance",
					INFO_TYPES.ATTRIBUTE
				),
				1
			);

			// 4 is a placeholder for the amount of verts in a face
			gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, chunk.vertCount / 2);

			if (chunk.waterVertCount > 0) {
				chunksWithWater.push(chunk);
			}

			// chunk = null;
		}

		for (let i = 0; i < chunksWithWater.length; i++) {
			let chunk = chunksWithWater[i];

			gl.uniform2f(
				this.blockProgram.GetLocation("uChunkPos", INFO_TYPES.UNIFORM),
				(chunk.x - cx) * 16,
				(chunk.z - cz) * 16
			);

			gl.bindBuffer(gl.ARRAY_BUFFER, chunk.waterBuffer);
			gl.vertexAttribIPointer(
				this.blockProgram.GetLocation(
					"aVertexInstance",
					INFO_TYPES.ATTRIBUTE
				),
				2,
				gl.UNSIGNED_INT,
				0,
				0
			);
			gl.enableVertexAttribArray(
				this.blockProgram.GetLocation(
					"aVertexInstance",
					INFO_TYPES.ATTRIBUTE
				)
			);
			gl.vertexAttribDivisor(
				this.blockProgram.GetLocation(
					"aVertexInstance",
					INFO_TYPES.ATTRIBUTE
				),
				1
			);

			gl.drawArraysInstanced(
				gl.TRIANGLES,
				0,
				6,
				chunk.waterVertCount / 2
			);
		}

		gl.bindVertexArray(null);

		Clouds.Draw();
		for (let i = 0; i < this.Text.length; i++) {
			this.Text[i].Draw();
		}

		for (let i = 0; i < this.Particles.length; i++) {
			this.Particles[i].Draw();
		}

		this.DebugRenderer.draw();

		this.frameBuffer.DrawFrame();
	}
}

export default new Renderer();
