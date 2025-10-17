import { Vector3 } from "./Vectors.js";

const tileMapWidth = 7;
const tileMapHeight = 32;

export class ThreeDObject {
	/** @type {Vector3[]} */
	vertices = [];
	/** @type {number[]} */
	drawOrder = [];
	/** @type {Vector3[]} */
	frameVerts = [];

	origin = new Vector3(0, 0, 0);
	rotation = new Vector3(0, 20, 30);

	r = 0;
	g = 0;
	b = 0;
	opcaity = 0;

	constructor(vertices, drawOrder, origin, rotation, r, g, b, opcaity = 1) {
		this.vertices = vertices;
		this.drawOrder = drawOrder;
		this.origin = origin;
		this.rotation = rotation;
		this.r = r;
		this.g = g;
		this.b = b;
		this.opcaity = opcaity;

		// Default texture coordinates - should be overridden by specific shapes
		this.textureCoordinates = [];
	}
}

// [TEXTURE][DIRECTION][CID][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// CID = 0-7 = 3 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 8 bits
// TOTAL BITS = 30

// CORNER IDS = [TOP LEFT BACK, TOP RIGHT BACK, TOP LEFT FRONT, TOP RIGHT FRONT,
// 				BOTTOM LEFT BACK, BOTTOM RIGHT BACK, BOTTOM LEFT FRONT, BOTTOM RIGHT FRONT]

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

/**
 *
 * @param {Vector3} origin bottom left corner
 * @param {number} texId
 * @returns {Uint32Array}
 */
export function Cube(origin, texId) {
	if (origin.x < 0 || origin.x > 15) {
		throw new Error("Out of bounds X position on new cube.");
	}
	if (origin.z < 0 || origin.z > 15) {
		throw new Error("Out of bounds Z position on new cube.");
	}
	if (origin.y < 0 || origin.y > 255) {
		throw new Error("Out of bounds Y position on new cube.");
	}

	if (texId < 0 || texId > 63) {
		throw new Error("Out of bounds texture id on new cube.");
	}

	const position = (origin.x << 12) | (origin.y << 4) | origin.z;
	const tId = texId << 22;

	// prettier-ignore
	const corners =[
			// FRONT
			6, 2, 3,
			3, 7, 6,
			// BACK
			4, 0, 1,
			1, 5, 4,
			// LEFT
			4, 6, 2,
			2, 0, 4,
			// RIGHT
			1, 3, 7,
			7, 5, 1,
			// TOP
			0, 2, 3,
			3, 1, 0,
			// BOTTOM
			4, 5, 7,
			7, 6, 4,
		]

	const directions = [
		// FRONT face normal
		4,
		// BACK face normal
		5,
		// RIGHT face normal
		3,
		// LEFT face normal
		2,
		// TOP face normal
		0,
		// BOTTOM face normal
		1,
	];
	const verts = new Uint32Array(corners.length);

	for (let [ix, cID] of corners.entries()) {
		const dir = directions[Math.floor(ix / 6)];

		let vert = tId | (dir << 19) | (cID << 16) | position;

		verts[ix] = vert;
	}

	return verts;
}

/**
 *
 * @param {Vector3} origin
 * @param {number} size
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {ThreeDObject}
 */
export function Water(origin, size, tex, red, g, b) {
	const hS = size / 2;

	const water = new ThreeDObject(
		[
			// TOP face (4 vertices)
			new Vector3(origin.x - hS, origin.y + hS, origin.z - hS), // 0
			new Vector3(origin.x + hS, origin.y + hS, origin.z - hS), // 1
			new Vector3(origin.x + hS, origin.y + hS, origin.z + hS), // 2
			new Vector3(origin.x - hS, origin.y + hS, origin.z + hS), // 3
		],
		// prettier-ignore
		[
			// TOP
			2, 1, 0,
			3, 2, 0,
		],
		origin,
		Vector3.Zero(),
		red,
		g,
		b,
		0
	);

	// Set proper vertex normals for each face
	water.vertexNormals = [
		// TOP face normals (4 vertices)
		0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
	];

	// Set proper texture coordinates - each face gets full 0,0 to 1,1 mapping
	water.textureCoordinates = [
		// TOP face UVs
		tex.base.x / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		tex.base.y / tileMapHeight,
		tex.base.x / tileMapWidth,
		tex.base.y / tileMapHeight,
	];

	return water;
}

export function SquareBasedPyramid(r, origin, size) {
	const hS = size / 2;

	return new ThreeDObject(
		r,
		[
			new Vector3(origin.x - hS, origin.y + hS, origin.z - hS),
			new Vector3(origin.x - hS, origin.y + hS, origin.z + hS),
			new Vector3(origin.x + hS, origin.y + hS, origin.z + hS),
			new Vector3(origin.x + hS, origin.y + hS, origin.z - hS),

			new Vector3(origin.x, origin.y - hS, origin.z),
		],

		[
			// Bottom
			[2, 1, 0],
			[3, 2, 0],
			// Left
			[2, 3, 4],
			// Right
			[1, 4, 0],
			//Front
			[2, 4, 1],
			//Back
			[0, 4, 3],
		],
		origin,
		Vector3.Zero(),
		180,
		100,
		30
	);
}
