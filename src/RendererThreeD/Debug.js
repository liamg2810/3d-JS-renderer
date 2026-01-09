import { GetShader, SHADERS } from "../Globals/Shaders";
import { gl } from "../Globals/Window.js";
import Player from "../Player/Player.js";
import ChunkManager from "../World/ChunkManager.js";
import Renderer from "./Renderer.js";
import { SetDebugProgramUniforms } from "./SetUniforms.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";

const yellow = [1, 1, 0];
const blue = [0, 0, 1];
const red = [1, 0, 0];

export class DebugRenderer {
	/** @type {WebGLBuffer} */
	VertBuffer;
	/** @type {WebGLBuffer} */
	ColorBuffer;
	/** @type {WebGLBuffer} */
	IndicesBuffer;

	LastChunkPos = { x: Infinity, z: Infinity };

	ChunkBorderVerts = [];
	ChunkBorderColors = [];
	ChunkBorderIndices = [];

	LastTargetedBlock = { x: Infinity, y: Infinity, z: Infinity };

	TargetedBlockVerts = [];
	TargetedBlockColors = [];
	TargetedBlockIndices = [];

	/** @type {import("./ShaderProgram.js").ShaderProgram} */
	DebugProgram;

	ShadersInit = false;

	constructor() {
		this.VertBuffer = gl.createBuffer();
		this.ColorBuffer = gl.createBuffer();
		this.IndicesBuffer = gl.createBuffer();

		this.InitShaders();
	}

	async InitShaders() {
		const vs = await GetShader(SHADERS.DEBUG_VERT);
		const fs = await GetShader(SHADERS.DEBUG_FRAG);

		this.DebugProgram = new ShaderProgram(vs, fs, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aColor", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
		]);

		this.ShadersInit = true;
	}

	SetAttributes(verts, colors, indices) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.VertBuffer);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

		gl.vertexAttribPointer(
			this.DebugProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE),
			3,
			gl.FLOAT,
			false,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.DebugProgram.GetLocation("aVertex", INFO_TYPES.ATTRIBUTE)
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.ColorBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(colors),
			gl.STATIC_DRAW
		);

		gl.vertexAttribPointer(
			this.DebugProgram.GetLocation("aColor", INFO_TYPES.ATTRIBUTE),
			3,
			gl.FLOAT,
			false,
			0,
			0
		);

		gl.enableVertexAttribArray(
			this.DebugProgram.GetLocation("aColor", INFO_TYPES.ATTRIBUTE)
		);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndicesBuffer);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			new Uint16Array(indices),
			gl.STATIC_DRAW
		);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndicesBuffer);
	}

	CalculateChunkBorders() {
		let chunk = ChunkManager.GetChunkAtPos(
			Math.floor(Player.position.x / 16),
			Math.floor(Player.position.z / 16)
		);

		if (!chunk) return;

		if (chunk.x === this.LastChunkPos.x && chunk.z === this.LastChunkPos.z)
			return;

		this.ChunkBorderVerts = [];
		this.ChunkBorderColors = [];
		this.ChunkBorderIndices = [];

		this.LastChunkPos.x = chunk.x;
		this.LastChunkPos.z = chunk.z;

		const xOff = Player.position.x < 0 ? 16 : 0;
		const zOff = Player.position.z < 0 ? 16 : 0;

		const cx = Math.floor((Player.position.x + xOff) / 16);
		const cz = Math.floor((Player.position.z + zOff) / 16);

		const baseX = (chunk.x - cx) * 16 - 1;
		const baseZ = (chunk.z - cz) * 16 - 1;

		for (let x = baseX; x <= baseX + 16; x += 4) {
			this.ChunkBorderVerts.push(x, 0, baseZ, x, 255, baseZ);
			this.ChunkBorderVerts.push(x, 0, baseZ + 16, x, 255, baseZ + 16);

			if (x === baseX || x === baseX + 16) {
				this.ChunkBorderColors.push(...blue, ...blue, ...blue, ...blue);
			} else {
				this.ChunkBorderColors.push(
					...yellow,
					...yellow,
					...yellow,
					...yellow
				);
			}
		}

		for (let z = baseZ; z <= baseZ + 16; z += 4) {
			this.ChunkBorderVerts.push(baseX, 0, z, baseX, 255, z);
			this.ChunkBorderVerts.push(baseX + 16, 0, z, baseX + 16, 255, z);

			if (z === baseZ || z === baseZ + 16) {
				this.ChunkBorderColors.push(...blue, ...blue, ...blue, ...blue);
			} else {
				this.ChunkBorderColors.push(
					...yellow,
					...yellow,
					...yellow,
					...yellow
				);
			}
		}

		for (let y = 0; y <= 255; y += 4) {
			this.ChunkBorderVerts.push(baseX, y, baseZ, baseX + 16, y, baseZ);
			this.ChunkBorderVerts.push(
				baseX + 16,
				y,
				baseZ,
				baseX + 16,
				y,
				baseZ + 16
			);
			this.ChunkBorderVerts.push(
				baseX + 16,
				y,
				baseZ + 16,
				baseX,
				y,
				baseZ + 16
			);
			this.ChunkBorderVerts.push(baseX, y, baseZ + 16, baseX, y, baseZ);

			this.ChunkBorderColors.push(
				...yellow,
				...yellow,
				...yellow,
				...yellow
			);
			this.ChunkBorderColors.push(
				...yellow,
				...yellow,
				...yellow,
				...yellow
			);
		}

		for (let x = baseX - 16; x <= baseX + 32; x += 16) {
			this.ChunkBorderVerts.push(x, 0, baseZ - 16, x, 255, baseZ - 16);
			this.ChunkBorderVerts.push(x, 0, baseZ + 32, x, 255, baseZ + 32);
			this.ChunkBorderColors.push(...red, ...red, ...red, ...red);
		}

		for (let z = baseZ - 16; z <= baseZ + 32; z += 16) {
			this.ChunkBorderVerts.push(baseX - 16, 0, z, baseX - 16, 255, z);
			this.ChunkBorderVerts.push(baseX + 32, 0, z, baseX + 32, 255, z);
			this.ChunkBorderColors.push(...red, ...red, ...red, ...red);
		}

		for (let i = 0; i < this.ChunkBorderVerts.length / 3; i += 2) {
			this.ChunkBorderIndices.push(i, i + 1);
		}
	}

	DrawChunkBorders() {
		this.CalculateChunkBorders();

		this.SetAttributes(
			this.ChunkBorderVerts,
			this.ChunkBorderColors,
			this.ChunkBorderIndices
		);

		gl.drawElements(
			gl.LINES,
			this.ChunkBorderIndices.length,
			gl.UNSIGNED_SHORT,
			0
		);
	}

	CaclulateTargetedBlock() {
		const cx = Math.floor(Player.targetedBlock.x / 16);
		const cz = Math.floor(Player.targetedBlock.z / 16);

		const xOff = Player.position.x < 0 ? 16 : 0;
		const zOff = Player.position.z < 0 ? 16 : 0;

		const pcx = Math.floor((Player.position.x + xOff) / 16);
		const pcz = Math.floor((Player.position.z + zOff) / 16);

		const by = Math.floor(Player.targetedBlock.y);
		const bx =
			(((Math.floor(Player.targetedBlock.x) % 16) + 16) % 16) +
			(cx - pcx) * 16;
		const bz =
			(((Math.floor(Player.targetedBlock.z) % 16) + 16) % 16) +
			(cz - pcz) * 16;

		if (
			this.LastTargetedBlock.x === bx &&
			this.LastTargetedBlock.y === by &&
			this.LastTargetedBlock.z === bz
		)
			return;

		this.LastTargetedBlock.x = bx;
		this.LastTargetedBlock.y = by;
		this.LastTargetedBlock.z = bz;

		// prettier-ignore
		this.TargetedBlockVerts = [
			// Top-face
			bx - 1, by, bz - 1, 
			bx, by, bz - 1,
			bx - 1, by, bz,
			bx, by, bz,
			// Bottom-face
			bx - 1, by - 1, bz - 1,
			bx, by - 1, bz - 1,
			bx - 1, by - 1, bz,
			bx, by - 1, bz,
		];

		// prettier-ignore
		this.TargetedBlockIndices = [
			0, 2, 3, 1, 0,
			4, 0, 4,
			6, 2, 6,
			7, 3, 7,
			5, 1, 5, 4
		]

		this.TargetedBlockColors = [];
		for (let i = 0; i < this.TargetedBlockVerts.length / 3; i++) {
			this.TargetedBlockColors.push(0, 0, 1);
		}
	}

	DrawTargetedBlock() {
		if (Player.targetedBlock === undefined) return;

		this.CaclulateTargetedBlock();

		this.SetAttributes(
			this.TargetedBlockVerts,
			this.TargetedBlockColors,
			this.TargetedBlockIndices
		);

		gl.drawElements(
			gl.LINE_STRIP,
			this.TargetedBlockIndices.length,
			gl.UNSIGNED_SHORT,
			0
		);
	}

	draw() {
		if (!this.ShadersInit) {
			return;
		}

		gl.useProgram(this.DebugProgram.shaderProgram);

		SetDebugProgramUniforms(this.DebugProgram);

		if (Renderer.showChunkBorders) {
			this.DrawChunkBorders();
		}
		this.DrawTargetedBlock();
	}
}
