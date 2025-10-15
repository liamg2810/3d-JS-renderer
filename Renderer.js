import { ApplyCameraRotation, GetDotProduct, lerp, lerpVerts } from "./Math.js";
import { ThreeDObject } from "./Primitives.js";
import { CubeScene, TestScene, VoxelTerrainScene } from "./Scene.js";
import { Vector3 } from "./Vectors.js";

let mat4 =
	(typeof window !== "undefined" &&
		(window.mat4 || (window.glMatrix && window.glMatrix.mat4))) ||
	null;
let mat3 =
	(typeof window !== "undefined" &&
		(window.mat3 || (window.glMatrix && window.glMatrix.mat3))) ||
	null;
if (!mat4 || !mat3) {
	const gm = await import(
		"https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js"
	);
	mat4 = mat4 || gm.mat4;
	mat3 = mat3 || gm.mat3;
}

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    attribute vec3 aVertexNormal;
    
    uniform vec3 uLightPos;
    uniform mat3 uNormalMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying vec4 vColor;
    varying vec3 vLighting;

    void main() {
        vec4 mvPosition = uModelViewMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * mvPosition;

        vec3 transformedNormal = normalize(uNormalMatrix * aVertexNormal);
        vec3 lightDir = normalize(uLightPos);

        highp vec3 ambientLight = vec3(0.7, 0.7, 0.7);
        highp vec3 directionalLightColor = vec3(1.0, 1.0, 1.0);

        highp float directional = max(dot(transformedNormal, lightDir), 0.0);

        vColor = aVertexColor;
        vLighting = ambientLight + (directionalLightColor * directional);
    }
`;
const fsSource = `
    precision mediump float;           // needed in WebGL
    varying vec4 vColor;               // receive from vertex shader
    varying highp vec3 vLighting;

    void main() {
      gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
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
	cam = new Vector3(0, 0, 60);
	camRot = new Vector3(0, 0, 0);
	keyMap = new Set();
	light = new Vector3(50, 100, 50);

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
	normalBuffer;

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

		this.gl.enable(this.gl.CULL_FACE);
		this.gl.cullFace(this.gl.BACK);

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
				vertexColor: this.gl.getAttribLocation(
					this.shaderProgram,
					"aVertexColor"
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
				lightPosition: this.gl.getUniformLocation(
					this.shaderProgram,
					"uLightPos"
				),
			},
		};

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
		let normals = [];

		let s = Date.now();

		for (let obj of this.objects) {
			for (let v of obj.vertices) {
				verts.push(v.x, v.y, v.z);

				colors.push(obj.r / 255, obj.g / 255, obj.b / 255, 1.0);
			}

			normals.push(...obj.vertexNormals);

			for (let o of obj.drawOrder) {
				indices.push(o + vertsOff);
			}

			vertsOff += obj.vertices.length;
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

		// Normal buffer
		this.normalBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array(normals),
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

		const modelMatrix = mat4.create();

		// Model-view matrix
		const modelViewMatrix = mat4.create();
		mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

		const normalMatrix = mat4.create();
		mat4.invert(normalMatrix, modelViewMatrix);
		mat4.transpose(normalMatrix, normalMatrix);

		// convert to mat3 normal matrix (inverse-transpose of modelView)
		const normalMatrix3 = mat3.create();
		mat3.fromMat4(normalMatrix3, normalMatrix);

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

		this.gl.uniformMatrix3fv(
			this.programInfo.uniformLocations.normalMatrix,
			false,
			normalMatrix3
		);

		const lightPos4 = [this.light.x, this.light.y, this.light.z, 1];
		const lightInView = mat4.create();
		mat4.multiply(lightInView, viewMatrix, lightPos4);

		// Pass light position, not normalized direction
		this.gl.uniform3f(
			this.programInfo.uniformLocations.lightPosition,
			lightInView[0],
			lightInView[1],
			lightInView[2]
		);

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

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
		this.gl.vertexAttribPointer(
			this.programInfo.attribLocations.vertexColor,
			4,
			this.gl.FLOAT,
			false,
			0,
			0
		);
		this.gl.enableVertexAttribArray(
			this.programInfo.attribLocations.vertexColor
		);

		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

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

		this.gl.drawElements(
			this.gl.TRIANGLES,
			this.indicesLength,
			this.gl.UNSIGNED_INT,
			0
		);
	}
}
