import ChunkManager from "../Chunks/ChunkManager.js";
import { canvas, gl } from "../Globals/Canvas.js";
import { BLOCKS } from "../Globals/Constants.js";
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
	/** @type {import('./ShaderProgram.js').ShaderProgram} */
	frameBufferProgram;

	/** @type {number[]} */
	frameTimes = [];

	seed = Math.random() * 25564235;

	shadersInit = false;

	showChunkBorders = true;

	sceneInit = false;

	isTwoD = false;

	DebugRenderer;

	FrameBuffer;
	FrameTexture;
	RenderBuffer;

	FrameWidth = 1920;
	FrameHeight = 1080;

	constructor() {
		this.FrameBuffer = gl.createFramebuffer();

		this.FrameTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.FrameTexture);
		gl.texStorage2D(
			gl.TEXTURE_2D,
			1,
			gl.RGBA8,
			this.FrameWidth,
			this.FrameHeight
		);

		this.RenderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.RenderBuffer);
		gl.renderbufferStorage(
			gl.RENDERBUFFER,
			gl.DEPTH_COMPONENT16,
			this.FrameWidth,
			this.FrameHeight
		);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);

		gl.bindTexture(gl.TEXTURE_2D, null);

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
		const frameBufferVSource = await (
			await fetch("./shaders/frameBuffer.vert")
		).text();
		const frameBufferFSource = await (
			await fetch("./shaders/frameBuffer.frag")
		).text();

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

		this.frameBufferProgram = new ShaderProgram(
			frameBufferVSource,
			frameBufferFSource,
			[
				// Attributes
				{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
				{ name: "aTextureCoord", type: INFO_TYPES.ATTRIBUTE },
				// Uniforms
				{ name: "uSampler", type: INFO_TYPES.UNIFORM },
				{ name: "uUnderWater", type: INFO_TYPES.UNIFORM },
			]
		);

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

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.FrameBuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.FrameTexture,
			0
		);
		gl.framebufferRenderbuffer(
			gl.FRAMEBUFFER,
			gl.DEPTH_ATTACHMENT,
			gl.RENDERBUFFER,
			this.RenderBuffer
		);

		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

		gl.viewport(0, 0, this.FrameWidth, this.FrameHeight);
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
		gl.useProgram(this.frameBufferProgram.shaderProgram);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.3, 0.5, 0.8, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.disable(gl.DEPTH_TEST);
		// gl.disable(gl.CULL_FACE);

		// prettier-ignore
		const verts = [
			1, -1, 0,
			1, 1, 0,
			-1, 1, 0,
			-1, -1, 0, 
		];

		// prettier-ignore
		const texCoords = [
			1,0,
			1,1,
			0,1,
			0,0,
		]

		const indices = [0, 1, 2, 2, 3, 0];

		const vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
		gl.vertexAttribPointer(
			this.frameBufferProgram.GetLocation(
				"aVertex",
				INFO_TYPES.ATTRIBUTE
			),
			3,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.frameBufferProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
		);

		const tBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(texCoords),
			gl.STATIC_DRAW
		);
		gl.vertexAttribPointer(
			this.frameBufferProgram.GetLocation(
				"aTextureCoord",
				INFO_TYPES.ATTRIBUTE
			),
			2,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.frameBufferProgram.GetLocation(
				"aTextureCoord",
				INFO_TYPES.ATTRIBUTE
			)
		);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.FrameTexture);
		gl.uniform1i(
			this.frameBufferProgram.GetLocation("uSampler", INFO_TYPES.UNIFORM),
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

		const cx = Math.floor(Player.position.x / 16);
		const cz = Math.floor(Player.position.z / 16);

		const chunk = ChunkManager.GetChunkAtPos(cx, cz);

		const by = Math.floor(Player.position.y);
		const bx = ((Math.floor(Player.position.x) % 16) + 16) % 16;
		const bz = ((Math.floor(Player.position.z) % 16) + 16) % 16;

		const block = chunk.BlockAt(bx, by, bz, {});

		gl.uniform1ui(
			this.frameBufferProgram.GetLocation(
				"uUnderWater",
				INFO_TYPES.UNIFORM
			),
			block === BLOCKS.WATER ? 1 : 0
		);

		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
	}
}

export default new Renderer();
