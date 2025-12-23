import { gl } from "../Globals/Canvas.js";

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

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(vsSource, fsSource) {
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

const GL_LOCATION_METHODS = {
	ATTRIB: "getAttribLocation",
	UNIFORM: "getUniformLocation",
};

/**
 *
 * @param {GL_LOCATION_METHODS} methodName The name of the gl getLocation to call
 * @param {WebGLProgram} shaderProgram The shader program to search in
 * @param {string} name The name of the location to get
 * @returns {number | WebGLUniformLocation}
 */
function GetLocationFromWebGL(methodName, shaderProgram, name) {
	if (!Object.values(GL_LOCATION_METHODS).includes(methodName)) {
		throw new Error(`GL getLocation method name not found ${methodName}`);
	}

	const loc = gl[methodName](shaderProgram, name);

	if (loc === null || loc === -1) {
		throw new Error(
			`Location not found for name: ${name}, method: ${methodName}`
		);
	}

	return loc;
}

export const INFO_TYPES = {
	ATTRIBUTE: 0,
	UNIFORM: 1,
};

export class ShaderProgram {
	programInfo = { attribLocations: {}, uniformLocations: {} };
	shaderProgram;

	/**
	 *
	 * @param {string} vertexShader Vertex shader source
	 * @param {string} fragmentShader Fragment shader source
	 * @param {{name: string; type: INFO_TYPES}[]} info List of program information to load
	 */
	constructor(vertexShader, fragmentShader, info) {
		this.shaderProgram = initShaderProgram(vertexShader, fragmentShader);

		if (this.shaderProgram === null) {
			throw new Error("Failed to initialize shader program.");
		}

		for (let i of info) {
			switch (i.type) {
				case INFO_TYPES.ATTRIBUTE:
					this.programInfo.attribLocations[i.name] =
						GetLocationFromWebGL(
							GL_LOCATION_METHODS.ATTRIB,
							this.shaderProgram,
							i.name
						);
					break;
				case INFO_TYPES.UNIFORM:
					this.programInfo.uniformLocations[i.name] =
						GetLocationFromWebGL(
							GL_LOCATION_METHODS.UNIFORM,
							this.shaderProgram,
							i.name
						);
					break;
				default:
					throw new Error("Unknown progam info type.");
			}
		}
	}

	/**
	 *
	 * @param {string} loc
	 * @param {INFO_TYPES} type
	 * @returns {number | WebGLUniformLocation}
	 */
	GetLocation(name, type) {
		switch (type) {
			case INFO_TYPES.ATTRIBUTE:
				if (this.programInfo.attribLocations[name] === undefined) {
					throw new Error("Attribute not found.");
				}
				return this.programInfo.attribLocations[name];
			case INFO_TYPES.UNIFORM:
				if (this.programInfo.uniformLocations[name] === undefined) {
					throw new Error("Uniform not found.");
				}
				return this.programInfo.uniformLocations[name];
			default:
				throw new Error("Unknown progam info type.");
		}
	}
}
