import { BIOME_DATA } from "../Globals/Biomes/Biomes.js";
import { LoadBiomes } from "../Globals/Biomes/Initializer.js";
import { BLOCK_ARRAY } from "../Globals/Blocks/Blocks.js";
import {
	InitializeHotbarIcons,
	LoadBlocks,
} from "../Globals/Blocks/Initializer.js";
import { PARTICLES } from "../Globals/Constants.js";
import { GetShader, SHADERS } from "../Globals/Shaders.js";
import { canvas, gl, ROOT, TEXTURE_ROOT } from "../Globals/Window.js";
import Player from "../Player/Player.js";
import { InitWorkers } from "../Scene.js";
import ChunkManager from "../World/ChunkManager.js";
import Clouds from "./Clouds.js";
import { DebugRenderer } from "./Debug.js";
import { FrameBuffer } from "./FrameBuffer.js";
import HotbarIconFrameBuffer from "./GUI/Hotbar/HotbarIconFrameBuffer.js";
import HotbarIconShaderProgram from "./GUI/Hotbar/IconShaderProgram.js";
import ParticleManager from "./Particles/ParticleManager.js";
import { SetBlockProgramUniforms } from "./SetUniforms.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";
import { TextThreeD } from "./Text.js";
import { TextureManager } from "./TextureManager.js";
import TickCounter from "./TickCounter.js";

const fpsCounter = document.getElementById("fps-count");

class Renderer {
	deltaTime = 0;

	/** @type {import('./ShaderProgram.js').ShaderProgram} */
	blockProgram;

	/** @type {import('./ShaderProgram.js').ShaderProgram} */
	fluidsProgram;

	/** @type {number[]} */
	frameTimes = [];

	shadersInit = false;

	showChunkBorders = true;

	sceneInit = false;

	isTwoD = false;

	DebugRenderer;

	/** @type {import("./FrameBuffer.js").FrameBuffer} */
	frameBuffer;

	vao;

	Text = [];

	AnimatedParticle;

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

		this.InitShaders();

		this.DebugRenderer = new DebugRenderer();

		this.texture = new TextureManager(
			TEXTURE_ROOT + "/blocks/textures.png"
		);
	}

	Start() {
		if (!this.shadersInit) {
			requestAnimationFrame(() => {
				this.Start();
			});
			return;
		}
		InitializeHotbarIcons();

		this.InitScene();
		requestAnimationFrame(() => {
			this.Update();
		});
	}

	async InitShaders() {
		await LoadBlocks();
		await LoadBiomes();
		await HotbarIconShaderProgram.InitShaders();
		InitWorkers();

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

		const fluidsVS = await GetShader(SHADERS.FLUIDS_VERT);
		const fluidsFS = await GetShader(SHADERS.FLUIDS_FRAG);

		this.fluidsProgram = new ShaderProgram(fluidsVS, fluidsFS, [
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

		gl.enableVertexAttribArray(
			this.fluidsProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
		);
		gl.vertexAttribPointer(
			this.fluidsProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE), // location
			3, // size (num values to pull from buffer per iteration)
			gl.FLOAT, // type of data in buffer
			false, // normalize
			0, // stride (0 = compute from size and type above)
			0 // offset in buffer
		);
		gl.vertexAttribDivisor(
			this.fluidsProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
			0
		);

		gl.bindVertexArray(null);
	}

	InitScene() {
		ChunkManager.LoadChunks();

		this.AnimatedParticle = ParticleManager.AddParticle(
			8,
			80,
			-10,
			0.2,
			PARTICLES.ENCHANT,
			0,
			Infinity
		);
	}

	Update() {
		if (!this.shadersInit) {
			requestAnimationFrame(() => this.Update());
			return;
		}

		this.shadersInit = true;

		const frameStart = performance.now();

		Player.Update();

		TickCounter.Tick();

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
			if (chunk.vertCount === 0) {
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

		gl.useProgram(this.fluidsProgram.shaderProgram);
		SetBlockProgramUniforms(this.fluidsProgram, this.texture.texture);

		for (let i = 0; i < chunksWithWater.length; i++) {
			let chunk = chunksWithWater[i];

			gl.uniform2f(
				this.fluidsProgram.GetLocation("uChunkPos", INFO_TYPES.UNIFORM),
				(chunk.x - cx) * 16,
				(chunk.z - cz) * 16
			);

			gl.bindBuffer(gl.ARRAY_BUFFER, chunk.waterBuffer);
			gl.vertexAttribIPointer(
				this.fluidsProgram.GetLocation(
					"aVertexInstance",
					INFO_TYPES.ATTRIBUTE
				),
				2,
				gl.UNSIGNED_INT,
				0,
				0
			);
			gl.enableVertexAttribArray(
				this.fluidsProgram.GetLocation(
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
		this.AnimatedParticle.y += 0.1;

		if (this.AnimatedParticle.y >= 90) {
			this.AnimatedParticle.y = 80;
		}

		ParticleManager.Draw();

		this.DebugRenderer.draw();

		let skipAir = false;

		const gap = HotbarIconFrameBuffer.FrameWidth / canvas.width;

		HotbarIconFrameBuffer.DrawFrame(
			Player.selectedBlock,
			0 / 10,
			-0.9,
			true
		);

		for (let i = -3; i < 4; i++) {
			let ix =
				Player.selectedBlock + i > 0
					? Player.selectedBlock + i
					: Player.selectedBlock + i + BLOCK_ARRAY.length - 1;

			if (BLOCK_ARRAY[ix % BLOCK_ARRAY.length] === 0) skipAir = true;

			ix = ix + (skipAir && i > 0 ? 1 : 0);

			HotbarIconFrameBuffer.DrawFrame(
				ix % BLOCK_ARRAY.length,
				0 + gap * i,
				-0.9,
				false
			);
		}

		this.frameBuffer.DrawFrame();
	}
}

export default new Renderer();
