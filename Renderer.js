import { Chunk } from "./Game.js";
import { Player } from "./Player.js";
import { enqueueChunk, isQueueing } from "./Scene.js";
import { Vector3 } from "./Vectors.js";

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

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	// Create the shader program

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert(
			`Unable to initialize the shader program: ${gl.getProgramInfoLog(
				shaderProgram
			)}`
		);
		return null;
	}

	return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
	const shader = gl.createShader(type);

	// Send the source to the shader object

	gl.shaderSource(shader, source);

	// Compile the shader program

	gl.compileShader(shader);

	// See if it compiled successfully

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(
			`An error occurred compiling the shaders: ${gl.getShaderInfoLog(
				shader
			)}`
		);
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

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

function isPowerOf2(value) {
	return (value & (value - 1)) === 0;
}

export class Renderer {
	/** @type {Chunk[]} */
	chunks = [];

	light = new Vector3(50, 100, 50);

	deltaTime = 0;

	shaderProgram;

	/** @type {number[]} */
	frameTimes = [];

	seed = Math.random() * 25564235;

	shadersInit = false;

	showChunkBorders = true;

	canvas;
	/** @type {WebGL2RenderingContext} */
	gl;

	vertexBuffer;
	indexBuffer;
	normalBuffer;

	sceneInit = false;

	isTwoD = false;

	/**  @type {import("./Player.js").Player}*/
	player;

	/**
	 *
	 * @param {import("./Player.js").Player} player
	 */
	constructor(player) {
		if (!(player instanceof Player)) {
			throw new Error("Cannot initialize renderer without a player");
		}

		this.player = player;
		player.SetRenderer(this);

		/** @type {HTMLCanvasElement} */
		this.canvas = document.getElementById("canvas");

		if (this.canvas === null) {
			alert("Canvas not found.");
			return;
		}

		this.gl = this.canvas.getContext("webgl2");

		if (this.gl === null) {
			alert("Unable to initialize WebGL.");
			return;
		}

		this.gl.enable(this.gl.CULL_FACE);
		this.gl.cullFace(this.gl.BACK);

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		console.log("Starting engine");

		let start = Date.now();

		this.InitShaders();

		let end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to init shaders`
		);

		start = Date.now();

		this.InitScene();

		end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to initialize scene`
		);

		this.texture = loadTexture(this.gl, "textures.png");
	}

	Start() {
		requestAnimationFrame(() => {
			this.Update();
		});
	}

	async InitShaders() {
		const vsSource = await (await fetch("./shaders/vs.vert")).text();
		const fsSource = await (await fetch("./shaders/fs.frag")).text();
		const colVSource = await (await fetch("./shaders/colored.vert")).text();
		const colFSource = await (await fetch("./shaders/colored.frag")).text();

		this.shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);
		this.colorShaderProgram = initShaderProgram(
			this.gl,
			colVSource,
			colFSource
		);

		this.programInfo = {
			default: {
				program: this.shaderProgram,
				attribLocations: {
					vertexPosition: this.gl.getAttribLocation(
						this.shaderProgram,
						"aVertex"
					),
				},
				uniformLocations: {
					projectionMatrix: this.gl.getUniformLocation(
						this.shaderProgram,
						"uProjectionMatrix"
					),
					modelViewMatrix: this.gl.getUniformLocation(
						this.shaderProgram,
						"uModelViewMatrix"
					),

					normalMatrix: this.gl.getUniformLocation(
						this.shaderProgram,
						"uNormalMatrix"
					),
					uSampler: this.gl.getUniformLocation(
						this.shaderProgram,
						"uSampler"
					),
					uChunkPos: this.gl.getUniformLocation(
						this.shaderProgram,
						"uChunkPos"
					),
					uTimePos: this.gl.getUniformLocation(
						this.shaderProgram,
						"uTime"
					),
				},
			},
			color: {
				program: this.colorShaderProgram,
				attribLocations: {
					vertexPosition: this.gl.getAttribLocation(
						this.colorShaderProgram,
						"aVertex"
					),
				},
				uniformLocations: {
					projectionMatrix: this.gl.getUniformLocation(
						this.colorShaderProgram,
						"uProjectionMatrix"
					),
					modelViewMatrix: this.gl.getUniformLocation(
						this.colorShaderProgram,
						"uModelViewMatrix"
					),

					normalMatrix: this.gl.getUniformLocation(
						this.colorShaderProgram,
						"uNormalMatrix"
					),
					uSampler: this.gl.getUniformLocation(
						this.colorShaderProgram,
						"uSampler"
					),
					uChunkPos: this.gl.getUniformLocation(
						this.colorShaderProgram,
						"uChunkPos"
					),
				},
			},
		};

		this.shadersInit = true;
	}

	GetChunkAtPos(x, z) {
		return this.chunks.find((c) => c.x === x && c.z === z);
	}

	InitScene() {
		this.player.LoadChunks();
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

		this.player.Update();

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

	Draw() {
		if (!this.shadersInit) return;

		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		this.gl.clearColor(0.3, 0.5, 0.8, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.enable(this.gl.DEPTH_TEST);

		// Projection matrix
		const projectionMatrix = mat4.create();
		mat4.perspective(
			projectionMatrix,
			(this.player.fov * Math.PI) / 180,
			this.canvas.width / this.canvas.height,
			this.player.near,
			this.player.far
		);

		// View matrix (camera)
		const viewMatrix = mat4.create();
		mat4.rotateX(
			viewMatrix,
			viewMatrix,
			(-this.player.view.pitch * Math.PI) / 180
		);
		mat4.rotateY(
			viewMatrix,
			viewMatrix,
			(-this.player.view.yaw * Math.PI) / 180
		);
		mat4.translate(viewMatrix, viewMatrix, [
			-this.player.position.x,
			-this.player.position.y,
			-this.player.position.z,
		]);

		const modelMatrix = mat4.create();

		// Model-view matrix
		const modelViewMatrix = mat4.create();
		mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

		const normalMatrix = mat4.create();
		mat4.invert(normalMatrix, modelViewMatrix);
		mat4.transpose(normalMatrix, normalMatrix);

		// --- Use program & uniforms ---
		this.gl.useProgram(this.shaderProgram);

		this.gl.uniformMatrix4fv(
			this.programInfo.default.uniformLocations.projectionMatrix,
			false,
			projectionMatrix
		);
		this.gl.uniformMatrix4fv(
			this.programInfo.default.uniformLocations.modelViewMatrix,
			false,
			modelViewMatrix
		);

		this.gl.uniformMatrix4fv(
			this.programInfo.default.uniformLocations.normalMatrix,
			false,
			normalMatrix
		);

		this.gl.uniform1f(
			this.programInfo.default.uniformLocations.uTimePos,
			performance.now()
		);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.uniform1i(
			this.programInfo.default.uniformLocations.uSampler,
			0
		);

		let chunksWithWater = [];

		for (let chunk of this.chunks) {
			this.gl.uniform2f(
				this.programInfo.default.uniformLocations.uChunkPos,
				chunk.x * 16,
				chunk.z * 16
			);

			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.blockBuffer);
			this.gl.vertexAttribIPointer(
				this.programInfo.default.attribLocations.vertexPosition,
				2,
				this.gl.UNSIGNED_INT,
				0,
				0
			);
			this.gl.enableVertexAttribArray(
				this.programInfo.default.attribLocations.vertexPosition
			);

			this.gl.drawArrays(this.gl.TRIANGLES, 0, chunk.vertCount);

			if (chunk.waterVertCount > 0) {
				chunksWithWater.push(chunk);
			}
		}

		for (const chunk of chunksWithWater) {
			this.gl.uniform2f(
				this.programInfo.default.uniformLocations.uChunkPos,
				chunk.x * 16,
				chunk.z * 16
			);

			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.waterBuffer);
			this.gl.vertexAttribIPointer(
				this.programInfo.default.attribLocations.vertexPosition,
				2,
				this.gl.UNSIGNED_INT,
				0,
				0
			);
			this.gl.enableVertexAttribArray(
				this.programInfo.default.attribLocations.vertexPosition
			);

			this.gl.drawArrays(this.gl.TRIANGLES, 0, chunk.waterVertCount);
		}

		this.DrawChunkBorders();
	}

	DrawChunkBorders() {
		// Projection matrix
		const projectionMatrix = mat4.create();
		mat4.perspective(
			projectionMatrix,
			(this.player.fov * Math.PI) / 180,
			this.canvas.width / this.canvas.height,
			this.player.near,
			this.player.far
		);

		// View matrix (camera)
		const viewMatrix = mat4.create();
		mat4.rotateX(
			viewMatrix,
			viewMatrix,
			(-this.player.view.pitch * Math.PI) / 180
		);
		mat4.rotateY(
			viewMatrix,
			viewMatrix,
			(-this.player.view.yaw * Math.PI) / 180
		);
		mat4.translate(viewMatrix, viewMatrix, [
			-this.player.position.x,
			-this.player.position.y,
			-this.player.position.z,
		]);

		const modelMatrix = mat4.create();

		// Model-view matrix
		const modelViewMatrix = mat4.create();
		mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

		const normalMatrix = mat4.create();
		mat4.invert(normalMatrix, modelViewMatrix);
		mat4.transpose(normalMatrix, normalMatrix);

		const camX = Math.floor(this.player.position.x / 16);
		const camZ = Math.floor(this.player.position.z / 16);

		const chunk = this.GetChunkAtPos(camX, camZ);

		if (chunk === undefined || !this.showChunkBorders) {
			return;
		}
		this.gl.useProgram(this.colorShaderProgram);

		this.gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.projectionMatrix,
			false,
			projectionMatrix
		);
		this.gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.modelViewMatrix,
			false,
			modelViewMatrix
		);

		this.gl.uniformMatrix4fv(
			this.programInfo.color.uniformLocations.normalMatrix,
			false,
			normalMatrix
		);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.uniform1i(this.programInfo.color.uniformLocations.uSampler, 0);

		this.gl.uniform2f(
			this.programInfo.color.uniformLocations.uChunkPos,
			chunk.x * 16,
			chunk.z * 16
		);

		const borderBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, borderBuffer);

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
				C_YELLOW + TLB + (0 << 12) + Y + 0,
				C_YELLOW + TRB + (15 << 12) + Y + 0,
				// Right edge (x=15): back to front
				C_YELLOW + TRB + (15 << 12) + Y + 0,
				C_YELLOW + TRF + (15 << 12) + Y + 15,
				// Front edge (z=15): right to left
				C_YELLOW + TRF + (15 << 12) + Y + 15,
				C_YELLOW + TLF + (0 << 12) + Y + 15,
				// Left edge (x=0): front to back
				C_YELLOW + TLF + (0 << 12) + Y + 15,
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
						col + corner + (xPos << 12) + Y + 0,
						col + corner + (xPos << 12) + nextY + 0
					);
				}

				// Right edge (x=15): along z from 0 to 15
				for (let zPos = 0; zPos <= 15; zPos += step) {
					let col = zPos === 0 || zPos === 15 ? C_BLUE : C_YELLOW;
					// Use TRB for z=0, TRF for z=15
					let corner = zPos === 0 ? TRB : TRF;
					verts.push(
						col + corner + (15 << 12) + Y + zPos,
						col + corner + (15 << 12) + nextY + zPos
					);
				}

				// Front edge (z=15): along x from 0 to 15
				for (let xPos = 0; xPos <= 15; xPos += step) {
					let col = xPos === 0 || xPos === 15 ? C_BLUE : C_YELLOW;
					// Use TLF for x=0, TRF for x=15
					let corner = xPos === 0 ? TLF : TRF;
					verts.push(
						col + corner + (xPos << 12) + Y + 15,
						col + corner + (xPos << 12) + nextY + 15
					);
				}

				// Left edge (x=0): along z from 0 to 15
				for (let zPos = 0; zPos <= 15; zPos += step) {
					let col = zPos === 0 || zPos === 15 ? C_BLUE : C_YELLOW;
					// Use TLB for z=0, TLF for z=15
					let corner = zPos === 0 ? TLB : TLF;
					verts.push(
						col + corner + (0 << 12) + Y + zPos,
						col + corner + (0 << 12) + nextY + zPos
					);
				}
			}
		}

		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Uint32Array(verts),
			this.gl.STATIC_DRAW
		);

		this.gl.vertexAttribIPointer(
			this.programInfo.color.attribLocations.vertexPosition,
			1,
			this.gl.UNSIGNED_INT,
			0,
			0
		);
		this.gl.enableVertexAttribArray(
			this.programInfo.color.attribLocations.vertexPosition
		);

		this.gl.drawArrays(this.gl.LINES, 0, verts.length);

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
								C_RED + c.code + (c.lx << 12) + Y + c.lz
							);
							verts.push(
								C_RED + c.code + (c.lx << 12) + nextY + c.lz
							);
						}
					}
				}

				if (verts.length === 0) continue;

				this.gl.uniform2f(
					this.programInfo.color.uniformLocations.uChunkPos,
					(chunk.x + x) * 16,
					(chunk.z + z) * 16
				);
				this.gl.bufferData(
					this.gl.ARRAY_BUFFER,
					new Uint32Array(verts),
					this.gl.STATIC_DRAW
				);

				this.gl.vertexAttribIPointer(
					this.programInfo.color.attribLocations.vertexPosition,
					1,
					this.gl.UNSIGNED_INT,
					0,
					0
				);
				this.gl.enableVertexAttribArray(
					this.programInfo.color.attribLocations.vertexPosition
				);

				this.gl.drawArrays(this.gl.LINES, 0, verts.length);
			}
		}
	}
}
