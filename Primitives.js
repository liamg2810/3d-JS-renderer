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

	constructor(
		renderer,
		vertices,
		drawOrder,
		origin,
		rotation,
		r,
		g,
		b,
		opcaity = 1
	) {
		this.renderer = renderer;
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

		this.vertexNormals = [
			// Front
			0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,

			// Back
			0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,

			// Top
			0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,

			// Bottom
			0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,

			// Right
			1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,

			// Left
			-1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
		];
	}
}

/**
 *
 * @param {import("./Renderer.js").Renderer} r
 * @param {Vector3} origin
 * @param {number} sizeY
 * @param {number} size
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {ThreeDObject}
 */
export function Cube(r, origin, sizeY, size, tex, red, g, b) {
	const hS = size / 2;
	const hSY = sizeY / 2;

	const cube = new ThreeDObject(
		r,
		[
			// FRONT face (4 vertices)
			new Vector3(origin.x - hS, origin.y + hSY, origin.z + hS), // 0
			new Vector3(origin.x + hS, origin.y + hSY, origin.z + hS), // 1
			new Vector3(origin.x + hS, origin.y - hSY, origin.z + hS), // 2
			new Vector3(origin.x - hS, origin.y - hSY, origin.z + hS), // 3

			// BACK face (4 vertices)
			new Vector3(origin.x + hS, origin.y + hSY, origin.z - hS), // 4
			new Vector3(origin.x - hS, origin.y + hSY, origin.z - hS), // 5
			new Vector3(origin.x - hS, origin.y - hSY, origin.z - hS), // 6
			new Vector3(origin.x + hS, origin.y - hSY, origin.z - hS), // 7

			// TOP face (4 vertices)
			new Vector3(origin.x - hS, origin.y + hSY, origin.z - hS), // 8
			new Vector3(origin.x + hS, origin.y + hSY, origin.z - hS), // 9
			new Vector3(origin.x + hS, origin.y + hSY, origin.z + hS), // 10
			new Vector3(origin.x - hS, origin.y + hSY, origin.z + hS), // 11

			// BOTTOM face (4 vertices)
			new Vector3(origin.x - hS, origin.y - hSY, origin.z + hS), // 12
			new Vector3(origin.x + hS, origin.y - hSY, origin.z + hS), // 13
			new Vector3(origin.x + hS, origin.y - hSY, origin.z - hS), // 14
			new Vector3(origin.x - hS, origin.y - hSY, origin.z - hS), // 15

			// RIGHT face (4 vertices)
			new Vector3(origin.x + hS, origin.y + hSY, origin.z + hS), // 16
			new Vector3(origin.x + hS, origin.y + hSY, origin.z - hS), // 17
			new Vector3(origin.x + hS, origin.y - hSY, origin.z - hS), // 18
			new Vector3(origin.x + hS, origin.y - hSY, origin.z + hS), // 19

			// LEFT face (4 vertices)
			new Vector3(origin.x - hS, origin.y + hSY, origin.z - hS), // 20
			new Vector3(origin.x - hS, origin.y + hSY, origin.z + hS), // 21
			new Vector3(origin.x - hS, origin.y - hSY, origin.z + hS), // 22
			new Vector3(origin.x - hS, origin.y - hSY, origin.z - hS), // 23
		],
		// prettier-ignore
		[
			// FRONT
			2, 1, 0,
			3, 2, 0,
			// BACK
			6, 5, 4,
			7, 6, 4,
			// TOP
			10, 9, 8,
			11, 10, 8,
			// BOTTOM
			14, 13, 12,
			15, 14, 12,
			// RIGHT
			18, 17, 16,
			19, 18, 16,
			// LEFT
			22, 21, 20,
			23, 22, 20,
		],
		origin,
		Vector3.Zero(),
		red,
		g,
		b,
		0
	);

	// Set proper vertex normals for each face
	cube.vertexNormals = [
		// FRONT face normals (4 vertices)
		0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
		// BACK face normals (4 vertices)
		0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
		// TOP face normals (4 vertices)
		0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
		// BOTTOM face normals (4 vertices)
		0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
		// RIGHT face normals (4 vertices)
		1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
		// LEFT face normals (4 vertices)
		-1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
	];

	const topX = tex.top ? tex.top.x : tex.base.x;
	const topY = tex.top ? tex.top.y : tex.base.y;

	// Set proper texture coordinates - each face gets full 0,0 to 1,1 mapping
	cube.textureCoordinates = [
		// FRONT face UVs
		tex.base.x / tileMapWidth,
		tex.base.y / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		tex.base.y / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		tex.base.x / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		// BACK face UVs
		tex.base.x / tileMapWidth,
		tex.base.y / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		tex.base.y / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		tex.base.x / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		// TOP face UVs
		topX / tileMapWidth,
		(topY + 1) / tileMapHeight,
		(topX + 1) / tileMapWidth,
		(topY + 1) / tileMapHeight,
		(topX + 1) / tileMapWidth,
		topY / tileMapHeight,
		topX / tileMapWidth,
		topY / tileMapHeight,
		// BOTTOM face UVs
		tex.base.x / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		tex.base.y / tileMapHeight,
		tex.base.x / tileMapWidth,
		tex.base.y / tileMapHeight,
		// RIGHT face UVs
		tex.base.x / tileMapWidth,
		tex.base.y / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		tex.base.y / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		tex.base.x / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		// LEFT face UVs
		tex.base.x / tileMapWidth,
		tex.base.y / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		tex.base.y / tileMapHeight,
		(tex.base.x + 1) / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
		tex.base.x / tileMapWidth,
		(tex.base.y + 1) / tileMapHeight,
	];

	return cube;
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
