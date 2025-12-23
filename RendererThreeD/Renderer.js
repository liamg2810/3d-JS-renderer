import { Chunk } from "../Chunks/Chunk.js";
import ChunkManager from "../Chunks/ChunkManager.js";
import { canvas, gl } from "../Globals/Canvas.js";
import { TEXTURES } from "../Globals/Constants.js";
import Player from "../Player/Player.js";
import { Cube } from "../Primitives.js";
import { isQueueing } from "../Scene.js";
import { INFO_TYPES, ShaderProgram } from "./ShaderProgram.js";

let mat4 =
	(typeof window !== "undefined" &&
		(window.mat4 || (window.glMatrix && window.glMatrix.mat4))) ||
	null;
if (!mat4) {
	const gm = await import(
		"https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js"
	);
	mat4 = gm.mat4;
}

const fpsCounter = document.getElementById("fps-count");

/**
 * @param {WebGL2RenderingContext} gl
 */
function loadTexture(gl, url) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Because images have to be downloaded over the internet
	// they might take a moment until they are ready.
	// Until then put a single pixel in the texture so we can
	// use it immediately. When the image has finished downloading
	// we'll update the texture with the contents of the image.
	const level = 0;
	const internalFormat = gl.RGBA;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;
	const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
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

	const image = new Image();
	image.onload = () => {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			level,
			internalFormat,
			srcFormat,
			srcType,
			image
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	};
	image.src = url;

	return texture;
}

function BuildTextureAtlas() {
	const blocks = "/textures/blocks.json";
}

function isPowerOf2(value) {
	return (value & (value - 1)) === 0;
}

export class Renderer {
	deltaTime = 0;

	/** @type {import('./ShaderProgram.js').ShaderProgram} */
	blockProgram;

	/** @type {number[]} */
	frameTimes = [];

	seed = Math.random() * 25564235;

	shadersInit = false;

	showChunkBorders = true;

	vertexBuffer;
	indexBuffer;
	normalBuffer;

	sceneInit = false;

	isTwoD = false;

	constructor() {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		this.InitShaders();

		this.texture = loadTexture(gl, "textures.png");
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
		const colVSource = await (await fetch("./shaders/colored.vert")).text();
		const colFSource = await (await fetch("./shaders/colored.frag")).text();

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

		this.colorShaderProgram = new ShaderProgram(colVSource, colFSource, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uChunkPos", type: INFO_TYPES.UNIFORM },
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

	lastLog = 0;

	Draw() {
		if (!this.shadersInit) return;

		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.3, 0.5, 0.8, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);

		// Projection matrix
		const projectionMatrix = mat4.create();
		mat4.perspective(
			projectionMatrix,
			(Player.fov * Math.PI) / 180,
			canvas.width / canvas.height,
			Player.near,
			Player.far
		);

		// View matrix (camera)
		const viewMatrix = mat4.create();
		mat4.rotateX(
			viewMatrix,
			viewMatrix,
			(-Player.view.pitch * Math.PI) / 180
		);
		mat4.rotateY(
			viewMatrix,
			viewMatrix,
			(-Player.view.yaw * Math.PI) / 180
		);
		mat4.translate(viewMatrix, viewMatrix, [
			-Player.position.x,
			-Player.position.y,
			-Player.position.z,
		]);

		const modelMatrix = mat4.create();

		// Model-view matrix
		const modelViewMatrix = mat4.create();
		mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

		const normalMatrix = mat4.create();
		mat4.invert(normalMatrix, modelViewMatrix);
		mat4.transpose(normalMatrix, normalMatrix);

		// --- Use program & uniforms ---
		gl.useProgram(this.blockProgram.shaderProgram);

		gl.uniformMatrix4fv(
			this.blockProgram.GetLocation(
				"uProjectionMatrix",
				INFO_TYPES.UNIFORM
			),
			false,
			projectionMatrix
		);
		gl.uniformMatrix4fv(
			this.blockProgram.GetLocation(
				"uModelViewMatrix",
				INFO_TYPES.UNIFORM
			),
			false,
			modelViewMatrix
		);

		gl.uniformMatrix4fv(
			this.blockProgram.GetLocation("uNormalMatrix", INFO_TYPES.UNIFORM),
			false,
			normalMatrix
		);

		gl.uniform1f(
			this.blockProgram.GetLocation("uTime", INFO_TYPES.UNIFORM),
			performance.now()
		);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(
			this.blockProgram.GetLocation("uSampler", INFO_TYPES.UNIFORM),
			0
		);

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

			// TODO: Figure out why / 2 fixes my issues
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

		// this.DrawChunkBorders();
		// this.DrawTargetedBlock();
	}

	DrawChunkBorders() {
		// Projection matrix
		const projectionMatrix = mat4.create();
		mat4.perspective(
			projectionMatrix,
			(Player.fov * Math.PI) / 180,
			canvas.width / canvas.height,
			Player.near,
			Player.far
		);

		// View matrix (camera)
		const viewMatrix = mat4.create();
		mat4.rotateX(
			viewMatrix,
			viewMatrix,
			(-Player.view.pitch * Math.PI) / 180
		);
		mat4.rotateY(
			viewMatrix,
			viewMatrix,
			(-Player.view.yaw * Math.PI) / 180
		);
		mat4.translate(viewMatrix, viewMatrix, [
			-Player.position.x,
			-Player.position.y,
			-Player.position.z,
		]);

		const modelMatrix = mat4.create();

		// Model-view matrix
		const modelViewMatrix = mat4.create();
		mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

		const normalMatrix = mat4.create();
		mat4.invert(normalMatrix, modelViewMatrix);
		mat4.transpose(normalMatrix, normalMatrix);

		const camX = Math.floor(Player.position.x / 16);
		const camZ = Math.floor(Player.position.z / 16);

		const chunk = this.GetChunkAtPos(camX, camZ);

		if (chunk === undefined || !this.showChunkBorders) {
			return;
		}
		gl.useProgram(this.colorShaderProgram);

		gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.projectionMatrix,
			false,
			projectionMatrix
		);
		gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.modelViewMatrix,
			false,
			modelViewMatrix
		);

		gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.normalMatrix,
			false,
			normalMatrix
		);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.programInfo.color.uniformLocations.uSampler, 0);

		gl.uniform2f(
			this.programInfo.color.uniformLocations.uChunkPos,
			chunk.x * 16,
			chunk.z * 16
		);

		const borderBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, borderBuffer);

		const C_RED = 1 << 22;
		const C_BLUE = 3 << 22;
		const C_YELLOW = 5 << 22;

		const TLB = 0 << 16;
		const TRB = 1 << 16;
		const TLF = 2 << 16;
		const TRF = 3 << 16;

		let verts = [];

		for (let i = 0; i < 255; i += 3) {
			const Y = i << 4;

			// Draw horizontal rectangle at this Y level
			// Back edge (z=0): left to right
			const v = [
				0,
				C_YELLOW + TLB + (0 << 12) + Y + 0,
				0,
				C_YELLOW + TRB + (15 << 12) + Y + 0,
				// Right edge (x=15): back to front
				0,
				C_YELLOW + TRB + (15 << 12) + Y + 0,
				0,
				C_YELLOW + TRF + (15 << 12) + Y + 15,
				// Front edge (z=15): right to left
				0,
				C_YELLOW + TRF + (15 << 12) + Y + 15,
				0,
				C_YELLOW + TLF + (0 << 12) + Y + 15,
				// Left edge (x=0): front to back
				0,
				C_YELLOW + TLF + (0 << 12) + Y + 15,
				0,
				C_YELLOW + TLB + (0 << 12) + Y + 0,
			];

			verts.push(...v);

			// Add vertical lines connecting this Y slice to the next one
			if (i + 3 <= 255) {
				const nextY = (i + 3) << 4;
				const step = 3;

				// Vertical lines along edges at regular intervals
				// Back edge (z=0): along x from 0 to 15
				for (let xPos = 0; xPos <= 15; xPos += step) {
					let col = xPos === 0 || xPos === 15 ? C_BLUE : C_YELLOW;
					// Use TLB for x=0, TRB for x=15, interpolate corner between them
					let corner = xPos === 0 ? TLB : TRB;
					verts.push(
						0,
						col + corner + (xPos << 12) + Y + 0,
						0,
						col + corner + (xPos << 12) + nextY + 0
					);
				}

				// Right edge (x=15): along z from 0 to 15
				for (let zPos = 0; zPos <= 15; zPos += step) {
					let col = zPos === 0 || zPos === 15 ? C_BLUE : C_YELLOW;
					// Use TRB for z=0, TRF for z=15
					let corner = zPos === 0 ? TRB : TRF;
					verts.push(
						0,
						col + corner + (15 << 12) + Y + zPos,
						0,
						col + corner + (15 << 12) + nextY + zPos
					);
				}

				// Front edge (z=15): along x from 0 to 15
				for (let xPos = 0; xPos <= 15; xPos += step) {
					let col = xPos === 0 || xPos === 15 ? C_BLUE : C_YELLOW;
					// Use TLF for x=0, TRF for x=15
					let corner = xPos === 0 ? TLF : TRF;
					verts.push(
						0,
						col + corner + (xPos << 12) + Y + 15,
						0,
						col + corner + (xPos << 12) + nextY + 15
					);
				}

				// Left edge (x=0): along z from 0 to 15
				for (let zPos = 0; zPos <= 15; zPos += step) {
					let col = zPos === 0 || zPos === 15 ? C_BLUE : C_YELLOW;
					// Use TLB for z=0, TLF for z=15
					let corner = zPos === 0 ? TLB : TLF;
					verts.push(
						0,
						col + corner + (0 << 12) + Y + zPos,
						0,
						col + corner + (0 << 12) + nextY + zPos
					);
				}
			}
		}

		gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(verts), gl.STATIC_DRAW);

		gl.vertexAttribIPointer(
			this.programInfo.color.attribLocations.vertexPosition,
			2,
			gl.UNSIGNED_INT,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.programInfo.color.attribLocations.vertexPosition
		);

		gl.drawArrays(gl.LINES, 0, verts.length / 2);

		for (let x = -1; x <= 1; x++) {
			if (x == 0) continue;

			for (let z = -1; z <= 1; z++) {
				if (z == 0) continue;

				verts = [];

				for (let i = 0; i < 255; i += 3) {
					const Y = i << 4;

					if (i + 15 <= 255) {
						const nextY = (i + 15) << 4;

						const corners = [
							{ code: TLB, lx: 0, lz: 0 },
							{ code: TRB, lx: 15, lz: 0 },
							{ code: TRF, lx: 15, lz: 15 },
							{ code: TLF, lx: 0, lz: 15 },
						];

						for (const c of corners) {
							const skipLX = x === 1 ? 0 : 15;
							const skipLZ = z === 1 ? 0 : 15;
							if (c.lx === skipLX && c.lz === skipLZ) {
								continue;
							}

							verts.push(
								0,
								C_RED + c.code + (c.lx << 12) + Y + c.lz,
								0,
								C_RED + c.code + (c.lx << 12) + nextY + c.lz
							);
						}
					}
				}

				if (verts.length === 0) continue;

				gl.uniform2f(
					this.programInfo.color.uniformLocations.uChunkPos,
					(chunk.x + x) * 16,
					(chunk.z + z) * 16
				);
				gl.bufferData(
					gl.ARRAY_BUFFER,
					new Uint32Array(verts),
					gl.STATIC_DRAW
				);

				gl.vertexAttribIPointer(
					this.programInfo.color.attribLocations.vertexPosition,
					1,
					gl.UNSIGNED_INT,
					0,
					0
				);
				gl.enableVertexAttribArray(
					this.programInfo.color.attribLocations.vertexPosition
				);

				gl.drawArrays(gl.LINES, 0, verts.length);
			}
		}
	}

	DrawTargetedBlock() {
		if (Player.targetedBlock === undefined) return; // Projection matrix
		// Projection matrix
		const projectionMatrix = mat4.create();
		mat4.perspective(
			projectionMatrix,
			(Player.fov * Math.PI) / 180,
			canvas.width / canvas.height,
			Player.near,
			Player.far
		);

		// View matrix (camera)
		const viewMatrix = mat4.create();
		mat4.rotateX(
			viewMatrix,
			viewMatrix,
			(-Player.view.pitch * Math.PI) / 180
		);
		mat4.rotateY(
			viewMatrix,
			viewMatrix,
			(-Player.view.yaw * Math.PI) / 180
		);
		mat4.translate(viewMatrix, viewMatrix, [
			-Player.position.x,
			-Player.position.y,
			-Player.position.z,
		]);

		const modelMatrix = mat4.create();

		// Model-view matrix
		const modelViewMatrix = mat4.create();
		mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

		const normalMatrix = mat4.create();
		mat4.invert(normalMatrix, modelViewMatrix);
		mat4.transpose(normalMatrix, normalMatrix);

		// --- Use program & uniforms ---
		gl.useProgram(this.colorShaderProgram);

		gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.projectionMatrix,
			false,
			projectionMatrix
		);
		gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.modelViewMatrix,
			false,
			modelViewMatrix
		);

		gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.normalMatrix,
			false,
			normalMatrix
		);

		const by = Math.floor(Player.targetedBlock.y);
		const bx = ((Math.floor(Player.targetedBlock.x) % 16) + 16) % 16;
		const bz = ((Math.floor(Player.targetedBlock.z) % 16) + 16) % 16;

		// console.log(Player.targetedBlock);

		const cx = Math.floor(Player.targetedBlock.x / 16);
		const cz = Math.floor(Player.targetedBlock.z / 16);

		let cube = Cube(bx, by, bz, TEXTURES.BEDROCK);

		cube = cube.map((v) => {
			const a = (6 << 22) | (v & 0x3fffff);
			return a;
		});

		gl.uniform2f(
			this.programInfo.color.uniformLocations.uChunkPos,
			cx * 16,
			cz * 16
		);
		gl.bufferData(gl.ARRAY_BUFFER, cube, gl.STATIC_DRAW);

		gl.vertexAttribIPointer(
			this.programInfo.color.attribLocations.vertexPosition,
			2,
			gl.UNSIGNED_INT,
			0,
			0
		);
		gl.enableVertexAttribArray(
			this.programInfo.color.attribLocations.vertexPosition
		);

		gl.drawArrays(gl.LINES, 0, cube.length / 2);
	}
}
