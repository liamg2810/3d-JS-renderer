import ChunkManager from "../Chunks/ChunkManager.js";
import { canvas, gl } from "../Globals/Canvas.js";
import Player from "../Player/Player.js";
import { isQueueing } from "../Scene.js";
import { DebugRenderer } from "./Debug.js";
import { SetBlockProgramUniforms } from "./SetUniforms.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";
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

	constructor() {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		this.InitShaders();

		this.DebugRenderer = new DebugRenderer();

		this.texture = new TextureManager("/textures.png");
	}

	Start() {
		this.InitScene();
		requestAnimationFrame(() => {
			this.Update();
		});
	}

	async InitShaders() {
		const vsSource = await (await fetch("./shaders/vs.vert")).text();
		const fsSource = await (await fetch("./shaders/fs.frag")).text();
		const debugVSource = await (await fetch("./shaders/debug.vert")).text();
		const debugFSource = await (await fetch("./shaders/debug.frag")).text();

		this.blockProgram = new ShaderProgram(vsSource, fsSource, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uNormalMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
			{ name: "uChunkPos", type: INFO_TYPES.UNIFORM },
			{ name: "uTime", type: INFO_TYPES.UNIFORM },
		]);

		this.debugProgram = new ShaderProgram(debugVSource, debugFSource, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aColor", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
		]);

		this.shadersInit = true;
	}

	InitScene() {
		ChunkManager.LoadChunks();
	}

	Update() {
		if (!this.sceneInit && isQueueing()) {
			requestAnimationFrame(() => {
				this.Update();
			});

			return;
		}

		this.sceneInit = true;

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

		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.3, 0.5, 0.8, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);

		gl.useProgram(this.blockProgram.shaderProgram);

		SetBlockProgramUniforms(this.blockProgram, this.texture.texture);

		let chunksWithWater = [];

		for (let chunk of ChunkManager.chunks) {
			if (!chunk.builtVerts) {
				continue;
			}

			gl.uniform2f(
				this.blockProgram.GetLocation("uChunkPos", INFO_TYPES.UNIFORM),
				chunk.x * 16,
				chunk.z * 16
			);

			gl.bindBuffer(gl.ARRAY_BUFFER, chunk.blockBuffer);
			gl.vertexAttribIPointer(
				this.blockProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
				2,
				gl.UNSIGNED_INT,
				0,
				0
			);
			gl.enableVertexAttribArray(
				this.blockProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
			);

			gl.drawArrays(gl.TRIANGLES, 0, chunk.vertCount / 2);

			if (chunk.waterVertCount > 0) {
				chunksWithWater.push(chunk);
			}
		}

		for (const chunk of chunksWithWater) {
			gl.uniform2f(
				this.blockProgram.GetLocation("uChunkPos", INFO_TYPES.UNIFORM),
				chunk.x * 16,
				chunk.z * 16
			);

			gl.bindBuffer(gl.ARRAY_BUFFER, chunk.waterBuffer);
			gl.vertexAttribIPointer(
				this.blockProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
				2,
				gl.UNSIGNED_INT,
				0,
				0
			);
			gl.enableVertexAttribArray(
				this.blockProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
			);

			gl.drawArrays(gl.TRIANGLES, 0, chunk.waterVertCount / 2);
		}

		this.DebugRenderer.draw();
	}
}

export default new Renderer();
