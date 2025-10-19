import { Chunk } from "./Game.js";
import { enqueueChunk } from "./Scene.js";
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

		// WebGL1 has different requirements for power of 2 images
		// vs. non power of 2 images so check if the image is a
		// power of 2 in both dimensions.
		if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
			// Yes, it's a power of 2. Generate mips.
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			// No, it's not a power of 2. Turn off mips and set
			// wrapping to clamp to edge
			gl.texParameteri(
				gl.TEXTURE_2D,
				gl.TEXTURE_WRAP_S,
				gl.CLAMP_TO_EDGE
			);
			gl.texParameteri(
				gl.TEXTURE_2D,
				gl.TEXTURE_WRAP_T,
				gl.CLAMP_TO_EDGE
			);
		}
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
	cam = new Vector3(0, 100, 0);
	camRot = new Vector3(-25, 225, 0);
	keyMap = new Set();
	light = new Vector3(50, 100, 50);

	focalLength = 300;
	near = 0.1;
	far = 10000;

	deltaTime = 0;

	shaderProgram;

	renderDistance = 4;

	/** @type {number[]} */
	frameTimes = [];

	seed = Math.random() * 25564235;

	shadersInit = false;

	canvas;
	/** @type {WebGL2RenderingContext} */
	gl;

	vertexBuffer;
	indexBuffer;
	normalBuffer;

	constructor() {
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

		// VoxelTerrainScene(this);

		end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to initialize scene`
		);

		this.texture = loadTexture(this.gl, "textures.png");

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

	Update() {
		const frameStart = performance.now();

		const speed = 1;

		if (this.keyMap.has("w")) {
			this.cam = this.cam.Add(
				new Vector3(
					speed * -Math.sin((this.camRot.y * Math.PI) / 180),
					speed * Math.sin((this.camRot.x * Math.PI) / 180),
					speed * -Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("s")) {
			this.cam = this.cam.Add(
				new Vector3(
					speed * Math.sin((this.camRot.y * Math.PI) / 180),
					speed * -Math.sin((this.camRot.x * Math.PI) / 180),
					speed * Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("a")) {
			this.cam = this.cam.Add(
				new Vector3(
					speed * -Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					speed * Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("d")) {
			this.cam = this.cam.Add(
				new Vector3(
					speed * Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					speed * -Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("e")) {
			this.cam.y += speed;
		}

		if (this.keyMap.has("q")) {
			this.cam.y -= speed;
		}
		if (this.keyMap.has("ArrowRight")) {
			this.camRot.y -= speed / 2;

			if (this.camRot.y < 0) this.camRot.y = 360;
		}

		if (this.keyMap.has("ArrowLeft")) {
			this.camRot.y += speed / 2;

			if (this.camRot.y > 360) this.camRot.y = 0;
		}

		if (this.keyMap.has("ArrowUp")) {
			this.camRot.x += speed / 2;

			this.camRot.x = Math.max(Math.min(this.camRot.x, 45), -45);
		}

		if (this.keyMap.has("ArrowDown")) {
			this.camRot.x -= speed / 2;

			this.camRot.x = Math.max(Math.min(this.camRot.x, 45), -45);
		}

		const camX = Math.floor(this.cam.x / 16);
		const camZ = Math.floor(this.cam.z / 16);

		for (
			let x = camX - this.renderDistance;
			x < camX + this.renderDistance;
			x++
		) {
			for (
				let z = camZ - this.renderDistance;
				z < camZ + this.renderDistance;
				z++
			) {
				const chunk = this.GetChunkAtPos(x, z);

				if (chunk === undefined) {
					enqueueChunk(x, z, this);
				}
			}
		}

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
		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.enable(this.gl.DEPTH_TEST);

		// Projection matrix
		const projectionMatrix = mat4.create();
		mat4.perspective(
			projectionMatrix,
			(45 * Math.PI) / 180,
			this.canvas.width / this.canvas.height,
			this.near,
			this.far
		);

		// View matrix (camera)
		const viewMatrix = mat4.create();
		mat4.rotateX(viewMatrix, viewMatrix, (-this.camRot.x * Math.PI) / 180);
		mat4.rotateY(viewMatrix, viewMatrix, (-this.camRot.y * Math.PI) / 180);
		mat4.translate(viewMatrix, viewMatrix, [
			-this.cam.x,
			-this.cam.y,
			-this.cam.z,
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

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.uniform1i(
			this.programInfo.default.uniformLocations.uSampler,
			0
		);

		for (let chunk of this.chunks) {
			this.gl.uniform2f(
				this.programInfo.default.uniformLocations.uChunkPos,
				chunk.x * 16,
				chunk.z * 16
			);

			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.blockBuffer);
			this.gl.vertexAttribIPointer(
				this.programInfo.default.attribLocations.vertexPosition,
				1,
				this.gl.UNSIGNED_INT,
				0,
				0
			);
			this.gl.enableVertexAttribArray(
				this.programInfo.default.attribLocations.vertexPosition
			);

			this.gl.drawArrays(this.gl.TRIANGLES, 0, chunk.vertCount);
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

		for (let chunk of this.chunks) {
			this.gl.uniform2f(
				this.programInfo.color.uniformLocations.uChunkPos,
				chunk.x * 16,
				chunk.z * 16
			);

			const borderBuffer = this.gl.createBuffer();
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, borderBuffer);

			// encode border on ground plane y=0; set color=1 (red)
			const C_RED = 0 << 22;

			let verts = [];

			for (let i = 0; i < Math.floor(255 / 4); i += 4) {
				const Y = i << 4;
				const v = [
					// (0,0) -> (15,0)
					C_RED + (0 << 12) + Y + 0,
					C_RED + (15 << 12) + Y + 0,
					// (15,0) -> (15,15)
					C_RED + (15 << 12) + Y + 0,
					C_RED + (15 << 12) + Y + 15,
					// (15,15) -> (0,15)
					C_RED + (15 << 12) + Y + 15,
					C_RED + (0 << 12) + Y + 15,
					// (0,15) -> (0,0)
					C_RED + (0 << 12) + Y + 15,
					C_RED + (0 << 12) + Y + 0,
				];

				verts.push(...v);
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
		}
	}
}
