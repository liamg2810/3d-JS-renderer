import { GetBlock } from "../Globals/Blocks/Blocks.js";
import { GetShader, SHADERS } from "../Globals/Shaders.js";
import { canvas, gl } from "../Globals/Window.js";
import Player from "../Player/Player.js";
import ChunkManager from "../World/ChunkManager.js";
import { GetFromPositionInRLE } from "../World/RLE.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";

export class FrameBuffer {
	FrameBuffer;
	FrameTexture;
	RenderBuffer;

	FrameWidth = 1920;
	FrameHeight = 1080;

	/** @type {import('./ShaderProgram.js').ShaderProgram} */
	frameBufferProgram;

	ShadersInit = false;

	vBuffer;
	tBuffer;
	iBuffer;

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

		this.InitShaders();

		this.vBuffer = gl.createBuffer();
		this.tBuffer = gl.createBuffer();
		this.iBuffer = gl.createBuffer();
	}

	async InitShaders() {
		const vs = await GetShader(SHADERS.FRAMEBUFFER_VERT);
		const fs = await GetShader(SHADERS.FRAMEBUFFER_FRAG);

		this.frameBufferProgram = new ShaderProgram(vs, fs, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aTextureCoord", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
			{ name: "uUnderWater", type: INFO_TYPES.UNIFORM },
		]);

		this.ShadersInit = true;
	}

	StartFrame() {
		if (!this.ShadersInit) {
			return false;
		}

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
		gl.clearColor(0.3, 0.5, 0.9, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);

		return true;
	}

	DrawFrame() {
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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
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

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			new Uint16Array(indices),
			gl.STATIC_DRAW
		);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);

		const cx = Math.floor(Player.position.x / 16);
		const cz = Math.floor(Player.position.z / 16);

		const chunk = ChunkManager.GetChunkAtPos(cx, cz);

		let underwater = false;

		if (chunk && Player.position.y < 256 && Player.position.y >= 0) {
			const by = Math.floor(Player.position.y);
			const bx = ((Math.floor(Player.position.x) % 16) + 16) % 16;
			const bz = ((Math.floor(Player.position.z) % 16) + 16) % 16;

			const block = GetFromPositionInRLE(bx, by, bz, chunk.blocks);

			underwater = block === GetBlock("water").code;
		}

		gl.uniform1ui(
			this.frameBufferProgram.GetLocation(
				"uUnderWater",
				INFO_TYPES.UNIFORM
			),
			underwater ? 1 : 0
		);

		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
	}
}
