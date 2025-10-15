import { ApplyCameraRotation, ApplyLocalRotation } from "./Math.js";
import { Vector3 } from "./Vectors.js";

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
export function Cube(r, origin, sizeY, size, h, s, l, a = 1) {
	const hS = size / 2;
	const hSY = sizeY / 2;

	const cube = new ThreeDObject(
		r,
		[
			new Vector3(origin.x - hS, origin.y + hSY, origin.z - hS),
			new Vector3(origin.x + hS, origin.y + hSY, origin.z - hS),
			new Vector3(origin.x + hS, origin.y - hSY, origin.z - hS),
			new Vector3(origin.x - hS, origin.y - hSY, origin.z - hS),
			new Vector3(origin.x - hS, origin.y + hSY, origin.z + hS),
			new Vector3(origin.x + hS, origin.y + hSY, origin.z + hS),
			new Vector3(origin.x + hS, origin.y - hSY, origin.z + hS),
			new Vector3(origin.x - hS, origin.y - hSY, origin.z + hS),
		],
		// prettier-ignore
		[
			// FRONT
			6, 5, 4,
			7, 6, 4,
			// BACK
			2, 0, 1,
			3, 0, 2,
			// TOP
			1, 0, 4,
			1, 4, 5,
			// BOTTOM
			3, 2, 6,
			3, 6, 7,
			// RIGHT
			6, 2, 5,
			1, 5, 2,
			// LEFT
			7, 0, 3,
			0, 7, 4,
		],
		origin,
		Vector3.Zero(),
		h,
		s,
		l,
		a
	);

	// Set proper vertex normals for each of the 8 vertices

	cube.vertexNormals = [];
	for (let v of cube.vertices) {
		const n = v.Sub(cube.origin).Normalise();
		cube.vertexNormals.push(-n.x, -n.y, -n.z);
	}

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
