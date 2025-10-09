/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

class Vector3 {
	x = 0;
	y = 0;
	z = 0;

	/** @type {(a: Vector3 | number, y: number | undefined, z: number | undefined): Vector3} */
	constructor(a, y, z) {
		if (a instanceof Vector3) {
			this.x = a.x;
			this.y = a.y;
			this.z = a.z;
			return;
		}

		if (
			typeof a !== "number" ||
			typeof y !== "number" ||
			typeof z !== "number"
		) {
			throw new Error("Invalid arguments for Vector3 constructor");
		}

		this.x = a;
		this.y = y;
		this.z = z;
	}

	/** @type {(a: Vector3): Vector3} */
	Add(a) {
		return new Vector3(this.x + a.x, this.y + a.y, this.z + a.z);
	}
}

class ThreeDObject {
	/** @type {Vector3[]} */
	vertices = [];
	/** @type {number[][]} */
	drawOrder = [];

	constructor(vertices, drawOrder) {
		this.vertices = vertices;
		this.drawOrder = drawOrder;
	}
}

class Renderer {
	/** @type {ThreeDObject[]} */
	objects = [];
	cam = new Vector3(125, 125, 100);

	constructor() {
		this.objects.push(
			new ThreeDObject(
				[
					new Vector3(50, 50, 50),
					new Vector3(100, 50, 50),
					new Vector3(100, 100, 50),
					new Vector3(50, 100, 50),
					new Vector3(50, 50, 0),
					new Vector3(100, 50, 0),
					new Vector3(100, 100, 0),
					new Vector3(50, 100, 0),
				],
				[
					[0, 1],
					[1, 2],
					[2, 3],
					[3, 0],

					[4, 5],
					[5, 6],
					[6, 7],
					[7, 4],

					[0, 4],
					[1, 5],
					[2, 6],
					[3, 7],
				]
			)
		);

		this.Draw();
	}

	Draw() {
		const focusPoint = 1;
		for (let obj of this.objects) {
			for (let draw of obj.drawOrder) {
				const v1 = obj.vertices[draw[0]];
				const v2 = obj.vertices[draw[1]];

				const x1Diff = v1.x - this.cam.x;
				const y1Diff = v1.y - this.cam.y;
				const z1Diff = v1.z - this.cam.z;

				const x2Diff = v2.x - this.cam.x;
				const y2Diff = v2.y - this.cam.y;
				const z2Diff = v2.z - this.cam.z;

				if (z1Diff === 0 || z2Diff === 0) continue;

				const projectedX1 = (x1Diff / z1Diff) * 100;
				const projectedY1 = (y1Diff / z1Diff) * 100;
				const projectedX2 = (x2Diff / z2Diff) * 100;
				const projectedY2 = (y2Diff / z2Diff) * 100;

				console.log(projectedX1, projectedY1);

				ctx.beginPath();
				ctx.moveTo(projectedX1, projectedY1);
				ctx.lineTo(projectedX2, projectedY2);
				ctx.stroke();
			}
		}
	}
}

const r = new Renderer();
