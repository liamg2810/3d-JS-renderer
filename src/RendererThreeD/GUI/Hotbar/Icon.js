import { gl, TEXTURE_ROOT } from "../../../Globals/Window.js";
import { Cube } from "../../../Primitives.js";
import { SetHotbarIconUniforms } from "../../SetUniforms.js";
import { INFO_TYPES } from "../../ShaderProgram.js";
import { TextureManager } from "../../TextureManager.js";
import IconShaderProgram from "./IconShaderProgram.js";

// { blockId: 4, texture: "ui/icon_water_bucket.png" }
const CUSTOM_ICONS = [];

const ICON_SIZE = 128;

export class HotbarIcon {
	/** @type {WebGLTexture} */
	texture;
	blockId;

	isCustom = false;

	frameBuffer;
	renderBuffer;

	// TODO: For now create the VAO in renderer and hotbar icon but extract into a default export;
	vao;

	constructor(blockId) {
		this.blockId = blockId;

		const customIcon = CUSTOM_ICONS.find((i) => i.blockId === blockId);

		if (customIcon !== undefined) {
			this.isCustom = true;

			const textureManager = new TextureManager(
				TEXTURE_ROOT + `${customIcon.texture}`
			);

			this.texture = textureManager.texture;

			return;
		}

		this.frameBuffer = gl.createFramebuffer();

		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		const level = 0;
		const internalFormat = gl.RGBA8;
		const width = ICON_SIZE;
		const height = ICON_SIZE;
		const border = 0;
		const srcFormat = gl.RGBA;
		const srcType = gl.UNSIGNED_BYTE;
		const pixel = new Uint8Array(ICON_SIZE * ICON_SIZE * 4).fill(255); // white
		gl.texImage2D(
			gl.TEXTURE_2D,
			level,
			internalFormat,
			width,
			height,
			border,
			srcFormat,
			srcType,
			pixel
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		// gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, ICON_SIZE, ICON_SIZE);
		gl.bindTexture(gl.TEXTURE_2D, null);

		this.renderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
		gl.renderbufferStorage(
			gl.RENDERBUFFER,
			gl.DEPTH_COMPONENT16,
			ICON_SIZE,
			ICON_SIZE
		);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);

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
			IconShaderProgram.shaderProgram.GetLocation(
				"aVertex",
				INFO_TYPES.ATTRIBUTE
			)
		);
		gl.vertexAttribPointer(
			IconShaderProgram.shaderProgram.GetLocation(
				"aVertex",
				INFO_TYPES.ATTRIBUTE
			), // location
			3, // size (num values to pull from buffer per iteration)
			gl.FLOAT, // type of data in buffer
			false, // normalize
			0, // stride (0 = compute from size and type above)
			0 // offset in buffer
		);
		gl.vertexAttribDivisor(
			IconShaderProgram.shaderProgram.GetLocation(
				"aVertex",
				INFO_TYPES.ATTRIBUTE
			),
			0
		);

		gl.bindVertexArray(null);
	}

	CreateTexture() {
		if (this.isCustom) {
			// Todo: render quad w/ texture
			return;
		}

		gl.useProgram(IconShaderProgram.shaderProgram.shaderProgram);

		SetHotbarIconUniforms(
			IconShaderProgram.shaderProgram,
			IconShaderProgram.atlasTextureManager.texture,
			ICON_SIZE
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.texture,
			0
		);
		gl.framebufferRenderbuffer(
			gl.FRAMEBUFFER,
			gl.DEPTH_ATTACHMENT,
			gl.RENDERBUFFER,
			this.renderBuffer
		);

		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

		gl.viewport(0, 0, ICON_SIZE, ICON_SIZE);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);

		let verts = new Uint32Array(6 * 2);

		const vi = Cube(
			verts,
			0,
			0,
			0,
			0,
			this.blockId,
			0b111111,
			0,
			[15, 15, 15, 15, 15, 15]
		);

		verts = verts.subarray(0, vi);

		gl.bindVertexArray(this.vao);

		gl.uniform2f(
			IconShaderProgram.shaderProgram.GetLocation(
				"uChunkPos",
				INFO_TYPES.UNIFORM
			),
			0,
			-2
		);

		const vertBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
		gl.vertexAttribIPointer(
			IconShaderProgram.shaderProgram.GetLocation(
				"aVertexInstance",
				INFO_TYPES.ATTRIBUTE
			),
			2,
			gl.UNSIGNED_INT,
			0,
			0
		);
		gl.enableVertexAttribArray(
			IconShaderProgram.shaderProgram.GetLocation(
				"aVertexInstance",
				INFO_TYPES.ATTRIBUTE
			)
		);
		gl.vertexAttribDivisor(
			IconShaderProgram.shaderProgram.GetLocation(
				"aVertexInstance",
				INFO_TYPES.ATTRIBUTE
			),
			1
		);

		gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, vi / 2);

		gl.bindVertexArray(null);
	}
}
