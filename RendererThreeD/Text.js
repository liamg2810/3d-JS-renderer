import { gl } from "../Globals/Canvas.js";
import Player from "../Player/Player.js";
import {
	CreateModelViewMatrix,
	CreateProjectectionMatrix,
} from "./Matrices.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";
import { TextureManager } from "./TextureManager.js";

const CHARSET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!\"£$%^&*()-_=+[{]};:'@#~,<.>/?\\|¬";

const ATLAS_WIDTH = 512;
const ATLAS_HEIGHT = 128;
const CELLS_PER_ROW = 32;
const CELLS_PER_COLUMN = 4;
const CELL_WIDTH = 16;
const CELL_HEIGHT = 32;

function normalize(a) {
	const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
	return [a[0] / l, a[1] / l, a[2] / l];
}

function cross(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	];
}

export class TextThreeD {
	/** @type {import("./TextureManager").TextureManager} */
	Texture;
	/** @type {import("./ShaderProgram").ShaderProgram} */
	Shader;

	/** @type {string} */
	text;

	/** @type {number} */
	x;
	/** @type {number} */
	y;
	/** @type {number} */
	z;
	/** @type {number} */
	MaxWidth;

	VertexBuffer;
	TextureCoordsBuffer;
	IndicesBuffer;
	CharOriginsBuffer;

	IndicesLength;

	constructor(text, x, y, z, maxWidth = 100) {
		this.Texture = new TextureManager("../text.png", true);
		this.InitShaders();

		this.text = text;
		this.x = x;
		this.y = y;
		this.z = z;
		this.MaxWidth = maxWidth;

		this.BuildBuffers();
	}

	async InitShaders() {
		const vs = await (await fetch("./shaders/text.vert")).text();
		const fs = await (await fetch("./shaders/text.frag")).text();

		this.Shader = new ShaderProgram(vs, fs, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aTextureCoord", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aCharOrigin", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uCameraRight", type: INFO_TYPES.UNIFORM },
			{ name: "uCameraUp", type: INFO_TYPES.UNIFORM },
			{ name: "uTextOrigin", type: INFO_TYPES.UNIFORM },
		]);

		this.ShadersInit = true;
	}

	BuildBuffers() {
		let verts = [];
		let tex = [];
		let indices = [];
		let origins = [];

		/** @type {{x: number; text: string}[]} */
		let lines = [];

		let line = "";
		let lineStart = 0;
		let lineWidth = 0;

		this.text.split("").forEach((t) => {
			if (t === "\n") {
				lines.push({ x: lineStart, text: line });
				lineStart = 0;
				lineWidth = 0;
				line = "";
				return;
			}

			line = line + t;

			lineWidth++;

			if (lineWidth % 2 === 1) {
				lineStart--;
			}

			if (lineWidth >= this.MaxWidth) {
				lines.push({ x: lineStart, text: line });
				lineStart = 0;
				lineWidth = 0;
				line = "";
			}
		});

		lines.push({ x: lineStart, text: line });

		let z = 0;
		let i = 0;

		for (let y = 0; y > -lines.length; y--) {
			let x = lines[-y].x;
			if (lines[-y].text.trim() === "") continue;

			lines[-y].text.split("").forEach((t) => {
				console.log(t);
				// if t is a " " then it wraps to the final cell of the atlas which is currently an empty glyph
				const index = CHARSET.indexOf(t);

				const atlasRow = Math.floor(index / CELLS_PER_ROW);
				const atlasCol = index - atlasRow * CELLS_PER_ROW;

				const startU = (atlasCol * CELL_WIDTH) / ATLAS_WIDTH;
				const startV = (atlasRow * CELL_HEIGHT) / ATLAS_HEIGHT;
				const endU = startU + CELL_WIDTH / ATLAS_WIDTH;
				const endV = startV + CELL_HEIGHT / ATLAS_HEIGHT;

				const textWidth = (CELL_WIDTH * 16) / ATLAS_WIDTH;

				// prettier-ignore
				verts.push(
					-textWidth, 0.5, 0,
					-textWidth, -0.5, 0,
					textWidth, 0.5, 0,
					textWidth, -0.5, 0,
				);

				const o = [x, y + lines.length / 2, z];

				origins.push(...o, ...o, ...o, ...o);

				indices.push(0 + i, 1 + i, 2 + i, 1 + i, 3 + i, 2 + i);

				// prettier-ignore
				tex.push(
					startU, startV,
					startU, endV,
					endU, startV,
					endU, endV
				);
				x += 1;
				i += 4;
			});
		}

		this.VertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

		this.TextureCoordsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.TextureCoordsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tex), gl.STATIC_DRAW);

		this.CharOriginsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.CharOriginsBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(origins),
			gl.STATIC_DRAW
		);

		this.IndicesBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndicesBuffer);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			new Uint16Array(indices),
			gl.STATIC_DRAW
		);

		this.IndicesLength = indices.length;
	}

	Draw() {
		gl.useProgram(this.Shader.shaderProgram);

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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexBuffer);
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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.TextureCoordsBuffer);
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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.CharOriginsBuffer);
		gl.vertexAttribPointer(
			this.Shader.GetLocation("aCharOrigin", INFO_TYPES.ATTRIBUTE),
			3,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.Shader.GetLocation("aCharOrigin", INFO_TYPES.ATTRIBUTE)
		);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.Texture.texture);
		gl.uniform1i(
			this.Shader.GetLocation("uSampler", INFO_TYPES.UNIFORM),
			0
		);
		let yaw = (Player.view.yaw * Math.PI) / 180;
		let pitch = (Player.view.pitch * Math.PI) / 180;

		const fx = -Math.cos(pitch) * Math.sin(yaw);
		const fy = Math.sin(pitch);
		const fz = -Math.cos(pitch) * Math.cos(yaw);

		const F = normalize([fx, fy, fz]);
		let worldUp = [0, 1, 0];
		const R = normalize(cross(F, worldUp));

		const U = cross(R, F);

		gl.uniform3fv(
			this.Shader.GetLocation("uCameraRight", INFO_TYPES.UNIFORM),
			new Float32Array(R)
		);
		gl.uniform3fv(
			this.Shader.GetLocation("uCameraUp", INFO_TYPES.UNIFORM),
			new Float32Array(U)
		);

		const xOff = Player.position.x < 0 ? 16 : 0;
		const zOff = Player.position.z < 0 ? 16 : 0;

		gl.uniform3fv(
			this.Shader.GetLocation("uTextOrigin", INFO_TYPES.UNIFORM),
			new Float32Array([
				this.x - Math.floor((Player.position.x + xOff) / 16) * 16,
				this.y,
				this.z - Math.floor((Player.position.z + zOff) / 16) * 16,
			])
		);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndicesBuffer);

		gl.drawElements(gl.TRIANGLES, this.IndicesLength, gl.UNSIGNED_SHORT, 0);
	}
}
