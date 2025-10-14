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

	CalculateFrameVerts() {
		this.frameVerts = this.vertices.map((v) => {
			const localPos = ApplyLocalRotation(this, v);

			return ApplyCameraRotation(this.renderer, localPos);
		});
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

	return new ThreeDObject(
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
			// BACK
			2, 1, 0,
			3, 2, 0,
			// FRONT
			4, 5, 6,
			4, 6, 7,
			// BOTTOM
			1, 4, 0,
			1, 5, 4,
			// TOP
			3, 6, 2,
			3, 7, 6,
			// RIGHT
			7, 3, 0,
			0, 4, 7,
			// LEFT
			6, 5, 2,
			1, 2, 5,
		],
		origin,
		Vector3.Zero(),
		h,
		s,
		l,
		a
	);
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
