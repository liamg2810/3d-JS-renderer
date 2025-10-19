import { Chunk } from "./Game.js";
import { Cube, ThreeDObject } from "./Primitives.js";
import { enqueueChunk, VoxelTerrainScene } from "./Scene.js";
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

// [TEXTURE][DIRECTION][CID][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// CID = 0-7 = 3 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 8 bits
// TOTAL BITS = 30

// CORNER IDS = [TOP LEFT BACK, TOP RIGHT BACK, TOP LEFT FRONT, TOP RIGHT FRONT,
// 				BOTTOM LEFT BACK, BOTTOM RIGHT BACK, BOTTOM LEFT FRONT, BOTTOM RIGHT FRONT]

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

const vsSource = `#version 300 es

    in uint aVertex;
    
	uniform vec2 uChunkPos;
	uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
	
	const vec3 offsets[8] = vec3[](vec3(-0.5,0.5,-0.5), vec3(0.5,0.5,-0.5), vec3(-0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5),
		vec3(-0.5,-0.5,-0.5), vec3(0.5,-0.5,-0.5), vec3(-0.5, -0.5, 0.5), vec3(0.5, -0.5, 0.5));

	// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]
	const vec3 normals[6] = vec3[](
		vec3(0.0, 1.0, 0.0),  // UP
		vec3(0.0, -1.0, 0.0), // DOWN
		vec3(-1.0, 0.0, 0.0), // LEFT
		vec3(1.0, 0.0, 0.0),  // RIGHT
		vec3(0.0, 0.0, 1.0),  // FRONT
		vec3(0.0, 0.0, -1.0)  // BACK
	);

    out highp vec2 vTextureCoord;
	out highp vec3 vLighting;

	vec2 getFaceUV(uint cID, uint dir) {
		// Base UVs for the corners of a face
		vec2 baseUVs[4];
		baseUVs[0] = vec2(0.0, 0.0); // bottom-left
		baseUVs[1] = vec2(1.0, 0.0); // bottom-right
		baseUVs[2] = vec2(0.0, 1.0); // top-left
		baseUVs[3] = vec2(1.0, 1.0); // top-right

		// Map corner ID to the face's UV index
		// Corner IDs: [0..7] = [TLB, TRB, TLF, TRF, BLB, BRB, BLF, BRF]
		// Each face uses 4 corners:
		// UP(0): 0,1,2,3
		// DOWN(1): 4,5,6,7
		// LEFT(2): 0,2,4,6
		// RIGHT(3): 1,3,5,7
		// FRONT(4): 2,3,6,7
		// BACK(5): 0,1,4,5

		uint idx = 0u;

		if (dir == 0u) { // UP
			if (cID == 0u) idx = 2u;
			else if (cID == 1u) idx = 3u;
			else if (cID == 2u) idx = 0u;
			else if (cID == 3u) idx = 1u;
		} else if (dir == 1u) { // DOWN
			if (cID == 4u) idx = 2u;
			else if (cID == 5u) idx = 3u;
			else if (cID == 6u) idx = 0u;
			else if (cID == 7u) idx = 1u;
		} else if (dir == 2u) { // LEFT
			if (cID == 0u) idx = 1u;
			else if (cID == 2u) idx = 0u;
			else if (cID == 4u) idx = 3u;
			else if (cID == 6u) idx = 2u;
		} else if (dir == 3u) { // RIGHT
			if (cID == 1u) idx = 1u;
			else if (cID == 3u) idx = 0u;
			else if (cID == 5u) idx = 3u;
			else if (cID == 7u) idx = 2u;
		} else if (dir == 4u) { // FRONT
			if (cID == 2u) idx = 1u;
			else if (cID == 3u) idx = 0u;
			else if (cID == 6u) idx = 3u;
			else if (cID == 7u) idx = 2u;
		} else if (dir == 5u) { // BACK
			if (cID == 0u) idx = 1u;
			else if (cID == 1u) idx = 0u;
			else if (cID == 4u) idx = 3u;
			else if (cID == 5u) idx = 2u;
		}

		return baseUVs[idx];
	}

    void main() {
		uint vertZ = aVertex & uint(0xF);
		uint vertY = (aVertex >> 4) & uint(0xFF);
		uint vertX = (aVertex >> 12) & uint(0xF);

		uint cID = (aVertex >> 16) & uint(0x7);
		uint dir = (aVertex >> 19) & uint(0x7);
		uint texture = (aVertex >> 22) & uint(0xFF);

		vec3 pos = vec3(float(vertX) + uChunkPos.x, float(vertY), float(vertZ) + uChunkPos.y) + offsets[cID];
		
		// Water
		if (texture == 6u) {
			pos = vec3(pos.x, pos.y - 0.2, pos.z);
		}

		vec4 vertexPos = vec4(pos, 1.0);

        vec4 mvPosition = uModelViewMatrix * vertexPos;
        gl_Position = uProjectionMatrix * mvPosition;

		uint atlasCols = 7u;
		uint atlasRows = 32u;

		uint col = texture % uint(atlasCols);
		uint row = texture / uint(atlasCols);

		vec2 tileOffset = vec2(float(col) / float(atlasCols), float(row) / float(atlasRows));
		vec2 tileScale = vec2(1.0 / float(atlasCols), 1.0 / float(atlasRows));

		vTextureCoord = tileOffset + getFaceUV(cID, dir) * tileScale;

		// Apply lighting effect

		vec3 normal = normals[dir];

		highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
		highp vec3 directionalLightColor = vec3(1, 1, 1);
		highp vec3 directionalVector = normalize(vec3(100, 100, 100));

		highp vec4 transformedNormal = uNormalMatrix * vec4(normal, 1.0);

		highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
		vLighting = ambientLight + (directionalLightColor * directional);
    }
`;
const fsSource = `#version 300 es

    precision mediump float;
	in highp vec4 vColor;
    in highp vec2 vTextureCoord;
    in highp vec3 vLighting;

    uniform sampler2D uSampler;

	out vec4 fragColor;

    void main(void) {
      	highp vec4 texelColor = texture(uSampler, vTextureCoord);

			if (texelColor.a <= 0.0) { discard; }
     	fragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
	}
  `;

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

	renderDistance = 16;

	seed = Math.random() * 25564235;

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

		this.shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);

		let end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to init shaders`
		);

		start = Date.now();

		VoxelTerrainScene(this);

		end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to initialize scene`
		);

		this.programInfo = {
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
		};

		this.texture = loadTexture(this.gl, "textures.png");

		requestAnimationFrame(() => {
			this.Update();
		});
	}

	GetChunkAtPos(x, z) {
		return this.chunks.find((c) => c.x === x && c.z === z);
	}

	Update() {
		const frameStart = Date.now();

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

		const frameEnd = Date.now();

		this.deltaTime = frameEnd - frameStart;

		const fps = 1000 / this.deltaTime;

		fpsCounter.innerText = `FPS: ${fps}`;

		setTimeout(() => {
			this.Update();
		}, 1000 / 60);
	}

	Draw() {
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
			this.programInfo.uniformLocations.projectionMatrix,
			false,
			projectionMatrix
		);
		this.gl.uniformMatrix4fv(
			this.programInfo.uniformLocations.modelViewMatrix,
			false,
			modelViewMatrix
		);

		this.gl.uniformMatrix4fv(
			this.programInfo.uniformLocations.normalMatrix,
			false,
			normalMatrix
		);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);

		for (let chunk of this.chunks) {
			this.gl.uniform2f(
				this.programInfo.uniformLocations.uChunkPos,
				chunk.x * 16,
				chunk.z * 16
			);

			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, chunk.blockBuffer);
			this.gl.vertexAttribIPointer(
				this.programInfo.attribLocations.vertexPosition,
				1,
				this.gl.UNSIGNED_INT,
				0,
				0
			);
			this.gl.enableVertexAttribArray(
				this.programInfo.attribLocations.vertexPosition
			);

			this.gl.drawArrays(this.gl.TRIANGLES, 0, chunk.vertCount);
		}
	}
}
