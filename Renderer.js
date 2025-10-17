import { ApplyCameraRotation, GetDotProduct, lerp, lerpVerts } from "./Math.js";
import { ThreeDObject } from "./Primitives.js";
import { VoxelTerrainScene } from "./Scene.js";
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

const vsSource = `
    attribute vec4 aVertexPosition;
	attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;
    
	uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
	
    varying highp vec2 vTextureCoord;
	varying highp vec3 vLighting;

    void main() {
        vec4 mvPosition = uModelViewMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * mvPosition;

		vTextureCoord = aTextureCoord;

		// Apply lighting effect

		highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
		highp vec3 directionalLightColor = vec3(1, 1, 1);
		highp vec3 directionalVector = normalize(vec3(100, 100, 100));

		highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

		highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
		vLighting = ambientLight + (directionalLightColor * directional);
    }
`;
const fsSource = `
    precision mediump float;
    varying highp vec2 vTextureCoord;
    varying highp vec3 vLighting;

    uniform sampler2D uSampler;

    void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);

      gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
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
	/** @type {ThreeDObject[]} */
	objects = [];
	/** @type {ThreeDObject[]} */
	water = [];
	cam = new Vector3(-50, 200, 300);
	camRot = new Vector3(-25, 225, 0);
	keyMap = new Set();
	light = new Vector3(50, 100, 50);

	focalLength = 300;
	near = 0.1;
	far = 10000;

	deltaTime = 0;

	shaderProgram;

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

		// TestScene(this);
		// TerrainScene(this);
		VoxelTerrainScene(this);
		let end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to initialize scene`
		);

		start = Date.now();
		// CubeScene(this);
		this.shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);
		end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to init shaders`
		);

		start = Date.now();
		this.LoadBuffers();
		end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to load buffers`
		);

		this.programInfo = {
			program: this.shaderProgram,
			attribLocations: {
				vertexPosition: this.gl.getAttribLocation(
					this.shaderProgram,
					"aVertexPosition"
				),
				vertexNormal: this.gl.getAttribLocation(
					this.shaderProgram,
					"aVertexNormal"
				),
				textureCoord: this.gl.getAttribLocation(
					this.shaderProgram,
					"aTextureCoord"
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
			},
		};

		this.texture = loadTexture(this.gl, "textures.png");

		requestAnimationFrame(() => {
			this.Update();
		});
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

		this.Draw();

		const frameEnd = Date.now();

		this.deltaTime = frameEnd - frameStart;

		setTimeout(() => {
			this.Update();
		}, 1000 / 60);
	}

	LoadBuffers() {
		let verts = [];
		let vertsOff = 0;
		let indices = [];
		let normals = [];
		let textureCoords = [];

		let s = Date.now();

		for (let obj of this.objects) {
			for (let v of obj.vertices) {
				verts.push(v.x, v.y, v.z);
			}

			for (let o of obj.drawOrder) {
				indices.push(o + vertsOff);
			}

			vertsOff += obj.vertices.length;
		}

		for (let water of this.water) {
			for (let v of water.vertices) {
				verts.push(v.x, v.y, v.z);
			}

			for (let o of water.drawOrder) {
				indices.push(o + vertsOff);
			}

			vertsOff += water.vertices.length;
		}

		let e = Date.now();

		console.log(
			`Took ${Math.round((e - s) / 10) / 100}s to build buffer arrays`
		);

		// Vertex buffer
		this.vertexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array(verts),
			this.gl.STATIC_DRAW
		);

		// Index buffer
		this.indexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		this.gl.bufferData(
			this.gl.ELEMENT_ARRAY_BUFFER,
			new Uint32Array(indices),
			this.gl.STATIC_DRAW
		);

		this.indicesLength = indices.length;

		verts = null;
		indices = null;

		for (let obj of this.objects) {
			normals.push(...obj.vertexNormals);
			textureCoords.push(...obj.textureCoordinates);
		}

		for (let water of this.water) {
			normals.push(...water.vertexNormals);
			textureCoords.push(...water.textureCoordinates);
		}

		// Tex-coord buffer
		this.textureCoordBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array(textureCoords),
			this.gl.STATIC_DRAW
		);

		// Normal buffer
		this.normalBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array(normals),
			this.gl.STATIC_DRAW
		);
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

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);

		// --- Bind attributes ---
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
		this.gl.vertexAttribPointer(
			this.programInfo.attribLocations.vertexPosition,
			3,
			this.gl.FLOAT,
			false,
			0,
			0
		);
		this.gl.enableVertexAttribArray(
			this.programInfo.attribLocations.vertexPosition
		);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
		this.gl.vertexAttribPointer(
			this.programInfo.attribLocations.vertexNormal,
			3,
			this.gl.FLOAT,
			false,
			0,
			0
		);
		this.gl.enableVertexAttribArray(
			this.programInfo.attribLocations.vertexNormal
		);

		this.gl.uniformMatrix4fv(
			this.programInfo.uniformLocations.normalMatrix,
			false,
			normalMatrix
		);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
		this.gl.vertexAttribPointer(
			this.programInfo.attribLocations.textureCoord,
			2,
			this.gl.FLOAT,
			false,
			0,
			0
		);
		this.gl.enableVertexAttribArray(
			this.programInfo.attribLocations.textureCoord
		);

		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

		this.gl.drawElements(
			this.gl.TRIANGLES,
			this.indicesLength,
			this.gl.UNSIGNED_INT,
			0
		);
	}
}
