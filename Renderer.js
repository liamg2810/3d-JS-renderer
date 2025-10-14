import { ApplyCameraRotation, GetDotProduct, lerp, lerpVerts } from "./Math.js";
import { ThreeDObject } from "./Primitives.js";
import { CubeScene, TestScene, VoxelTerrainScene } from "./Scene.js";
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
attribute vec4 aVertexColor;      // add color attribute
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
varying vec4 vColor;              // pass to fragment shader

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vColor = aVertexColor;        // forward color
}
  `;

const fsSource = `
    precision mediump float;           // needed in WebGL
varying vec4 vColor;               // receive from vertex shader

void main() {
    gl_FragColor = vColor;        // use per-vertex color
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

export class Renderer {
	/** @type {ThreeDObject[]} */
	objects = [];
	cam = new Vector3(-10, 200, -10);
	camRot = new Vector3(-20, 225, 0);
	keyMap = new Set();
	light = new Vector3(50, -50, 50);

	focalLength = 300;
	near = 0.1;
	far = 10000;

	deltaTime = 0;

	shaderProgram;

	canvas;
	gl;

	vertexBuffer;
	indexBuffer;
	colorBuffer;

	constructor() {
		/** @type {HTMLCanvasElement} */
		this.canvas = document.getElementById("canvas");

		if (this.canvas === null) {
			alert("Canvas not found.");
			return;
		}

		/** @type {WebGLRenderingContext} */
		this.gl = this.canvas.getContext("webgl2");

		if (this.gl === null) {
			alert("Unable to initialize WebGL.");
			return;
		}

		// TestScene(this);
		// TerrainScene(this);
		VoxelTerrainScene(this);
		// CubeScene(this);
		this.shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);

		this.LoadBuffers();

		this.Update();
	}

	lightDir = new Vector3(1, 0, 0);

	Update() {
		const frameStart = Date.now();

		this.light = this.light.Add(this.lightDir);

		if (this.light.x > 200) {
			this.lightDir.x = -1;
		}

		if (this.light.x < 50) {
			this.lightDir.x = 1;
		}

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
		let colors = [];

		for (let obj of this.objects) {
			for (let v of obj.vertices) {
				verts.push(v.x, v.y, v.z);

				colors.push(obj.r / 255, obj.g / 255, obj.b / 255, 1.0);
			}

			for (let o of obj.drawOrder) {
				indices.push(o + vertsOff);
			}

			vertsOff += obj.vertices.length;
		}

		// Vertex buffer
		this.vertexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array(verts),
			this.gl.STATIC_DRAW
		);

		// Color buffer
		this.colorBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array(colors),
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

		// --- Use program & uniforms ---
		this.gl.useProgram(this.shaderProgram);

		const uProj = this.gl.getUniformLocation(
			this.shaderProgram,
			"uProjectionMatrix"
		);
		const uView = this.gl.getUniformLocation(
			this.shaderProgram,
			"uModelViewMatrix"
		);
		this.gl.uniformMatrix4fv(uProj, false, projectionMatrix);
		this.gl.uniformMatrix4fv(uView, false, viewMatrix);

		// --- Bind attributes ---
		const posLoc = this.gl.getAttribLocation(
			this.shaderProgram,
			"aVertexPosition"
		);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
		this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(posLoc);

		const colorLoc = this.gl.getAttribLocation(
			this.shaderProgram,
			"aVertexColor"
		);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
		this.gl.vertexAttribPointer(colorLoc, 4, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(colorLoc);

		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

		this.gl.drawElements(
			this.gl.TRIANGLES,
			this.indicesLength,
			this.gl.UNSIGNED_INT,
			0
		);
	}
}
