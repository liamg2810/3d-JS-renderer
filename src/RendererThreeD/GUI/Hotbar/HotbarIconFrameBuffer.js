import {
	GetBlock,
	HOTBAR_ICONS_ARRAY,
} from "../../../Globals/Blocks/Blocks.js";
import { GetShader, SHADERS } from "../../../Globals/Shaders";
import { canvas, gl } from "../../../Globals/Window";
import Player from "../../../Player/Player.js";
import { INFO_TYPES, ShaderProgram } from "../../ShaderProgram.js";

class HotbarIconFrameBuffer {
	FrameWidth = 128;
	FrameHeight = 128;

	/** @type {import('./ShaderProgram.js').ShaderProgram} */
	shaderProgram;

	ShadersInit = false;

	vBuffer;
	tBuffer;
	iBuffer;

	constructor() {
		this.InitShaders();

		this.vBuffer = gl.createBuffer();
		this.tBuffer = gl.createBuffer();
		this.iBuffer = gl.createBuffer();
	}

	async InitShaders() {
		const vs = await GetShader(SHADERS.HOTBAR_ICON_UI_VERT);
		const fs = await GetShader(SHADERS.HOTBAR_ICON_UI_FRAG);

		this.shaderProgram = new ShaderProgram(vs, fs, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aTextureCoord", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
			{ name: "uSelected", type: INFO_TYPES.UNIFORM },
		]);

		this.ShadersInit = true;
	}

	DrawFrame(blockId, xCenter, yCenter, selected) {
		if (!this.ShadersInit) return;

		gl.useProgram(this.shaderProgram.shaderProgram);

		const halfWidth = this.FrameWidth / canvas.width / 2;
		const halfHeight = this.FrameHeight / canvas.height / 2;

		// prettier-ignore
		const verts = [
			xCenter + halfWidth, yCenter - halfHeight, 0,
			xCenter + halfWidth, yCenter + halfHeight, 0,
			xCenter - halfWidth, yCenter + halfHeight, 0,
			xCenter - halfWidth, yCenter - halfHeight, 0, 
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
			this.shaderProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
			3,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.shaderProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(texCoords),
			gl.STATIC_DRAW
		);
		gl.vertexAttribPointer(
			this.shaderProgram.GetLocation(
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
			this.shaderProgram.GetLocation(
				"aTextureCoord",
				INFO_TYPES.ATTRIBUTE
			)
		);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, HOTBAR_ICONS_ARRAY[blockId].texture);
		gl.uniform1i(
			this.shaderProgram.GetLocation("uSampler", INFO_TYPES.UNIFORM),
			0
		);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			new Uint16Array(indices),
			gl.STATIC_DRAW
		);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);

		gl.uniform1ui(
			this.shaderProgram.GetLocation("uSelected", INFO_TYPES.UNIFORM),
			selected
		);

		gl.disable(gl.DEPTH_TEST);

		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

		gl.enable(gl.DEPTH_TEST);
	}
}

export default new HotbarIconFrameBuffer();
