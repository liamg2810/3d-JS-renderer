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

	Multiply(a) {
		return new Vector3(this.x * a, this.y * a, this.z * a);
	}
}

class Vector2 {
	x = 0;
	y = 0;
	/** @type {(a: Vector2 | number, y: number | undefined): Vector2} */
	constructor(a, y) {
		if (a instanceof Vector2) {
			this.x = a.x;
			this.y = a.y;
			return;
		}

		if (typeof a !== "number" || typeof y !== "number") {
			throw new Error("Invalid arguments for Vector2 constructor");
		}

		this.x = a;
		this.y = y;
	}

	/** @type {(a: Vector2): Vector2} */
	Add(a) {
		return new Vector2(this.x + a.x, this.y + a.y);
	}
}

class ThreeDObject {
	/** @type {Vector3[]} */
	vertices = [];
	/** @type {number[][]} */
	drawOrder = [];
	origin = new Vector3(0, 0, 0);
	rotation = new Vector3(0, 20, 30);
	fillCol = "rgb(0,0,0)";

	constructor(vertices, drawOrder, origin, rotation, fillCol) {
		this.vertices = vertices;
		this.drawOrder = drawOrder;
		this.origin = origin;
		this.rotation = rotation;
		this.fillCol = fillCol;
	}
}

/** @type {(origin: Vector3, size: number): ThreeDObject} */
function Cube(origin, size) {
	const hS = size / 2;

	return new ThreeDObject(
		[
			new Vector3(origin.x - hS, origin.y - hS, origin.z - hS),
			new Vector3(origin.x + hS, origin.y - hS, origin.z - hS),
			new Vector3(origin.x + hS, origin.y + hS, origin.z - hS),
			new Vector3(origin.x - hS, origin.y + hS, origin.z - hS),
			new Vector3(origin.x - hS, origin.y - hS, origin.z + hS),
			new Vector3(origin.x + hS, origin.y - hS, origin.z + hS),
			new Vector3(origin.x + hS, origin.y + hS, origin.z + hS),
			new Vector3(origin.x - hS, origin.y + hS, origin.z + hS),
		],
		[
			[0, 1, 2],
			[0, 2, 3],

			[4, 5, 6],
			[4, 6, 7],

			[0, 4],
			[1, 5],
			[2, 6],
			[3, 7],
		],
		origin,
		new Vector3(Math.random() * 90, Math.random() * 90, Math.random() * 90),
		"rgb(255, 0, 0)"
	);
}

function SquareBasedPyramid(origin, size) {
	const hS = size / 2;

	return new ThreeDObject(
		[
			new Vector3(origin.x - hS, origin.y - hS, origin.z - hS),
			new Vector3(origin.x - hS, origin.y - hS, origin.z + hS),
			new Vector3(origin.x + hS, origin.y - hS, origin.z + hS),
			new Vector3(origin.x + hS, origin.y - hS, origin.z - hS),

			new Vector3(origin.x, origin.y + hS, origin.z),
		],

		[
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 0],

			[0, 4],
			[1, 4],
			[2, 4],
			[3, 4, 2],
		],
		origin,
		new Vector3(Math.random() * 90, Math.random() * 90, Math.random() * 90),
		"rgb(0,0,255)"
	);
}

/** @type {(pos: Vector3, theta: number): Vector3} */
function rotateX(pos, theta) {
	const x = pos.x;
	const y = Math.cos(theta) * pos.y - Math.sin(theta) * pos.z;
	const z = Math.sin(theta) * pos.y + Math.cos(theta) * pos.z;

	return new Vector3(x, y, z);
}

/** @type {(pos: Vector3, theta: number): Vector3} */
function rotateY(pos, theta) {
	const x = Math.cos(theta) * pos.x + Math.sin(theta) * pos.z;
	const y = pos.y;
	const z = -Math.sin(theta) * pos.x + Math.cos(theta) * pos.z;

	return new Vector3(x, y, z);
}

/** @type {(pos: Vector3, theta: number): Vector3} */
function rotateZ(pos, theta) {
	const x = Math.cos(theta) * pos.x + -Math.sin(theta) * pos.y;
	const y = Math.sin(theta) * pos.x + Math.cos(theta) * pos.y;
	const z = pos.z;

	return new Vector3(x, y, z);
}

/** @type {(obj: ThreeDObject, v: Vector3): Vector3} */
function ApplyLocalRotation(obj, v) {
	const local = v.Add(obj.origin.Multiply(-1));

	const rotatedX = rotateX(local, obj.rotation.x * (Math.PI / 180));
	const rotatedY = rotateY(rotatedX, obj.rotation.y * (Math.PI / 180));
	const rotatedZ = rotateZ(rotatedY, obj.rotation.z * (Math.PI / 180));

	return rotatedZ.Add(obj.origin);
}

/** @type {(renderer: Renderer, rot: Vector3, v: Vector3): Vector3} */
function ApplyCameraRotation(renderer, v) {
	const local = v.Add(renderer.cam.Multiply(-1));

	const rotatedX = rotateX(local, renderer.camRot.x * (Math.PI / 180));
	const rotatedY = rotateY(rotatedX, renderer.camRot.y * (Math.PI / 180));
	return rotatedY.Add(renderer.cam);
}

/** @type {(offScreenV: Vector3, onScreenV: Vector3, planeZ?: number): Vector3} */
function LinearInterp(offScreenV, onScreenV, planeZ = 0) {
	const denom = onScreenV.z - offScreenV.z;

	if (denom === 0)
		return new Vector3(offScreenV.x, offScreenV.y, offScreenV.z);

	let percent = (planeZ - offScreenV.z) / denom;

	if (percent < 0) percent = 0;
	if (percent > 1) percent = 1;

	return new Vector3(
		offScreenV.x + (onScreenV.x - offScreenV.x) * percent,
		offScreenV.y + (onScreenV.y - offScreenV.y) * percent,
		offScreenV.z + (onScreenV.z - offScreenV.z) * percent
	);
}

class Renderer {
	/** @type {ThreeDObject[]} */
	objects = [];
	cam = new Vector3(0, 0, 0);
	camRot = new Vector2(0, 0);

	constructor() {
		this.objects.push(Cube(new Vector3(0, 10, -50), 25));

		this.objects.push(SquareBasedPyramid(new Vector3(25, 0, 0), 25));

		this.objects.push(
			new ThreeDObject(
				[
					new Vector3(100, -100, -100),
					new Vector3(100, -100, 100),
					new Vector3(-100, -100, 100),
					new Vector3(-100, -100, -100),
				],
				[
					[0, 1, 2],
					// [0, 2, 3],
				],
				new Vector3(0, 0, 0),
				new Vector3(0, 0, 0),
				"rgb(0,0,0)"
			)
		);

		this.Draw();
	}

	Draw() {
		const focalLength = 300;
		const near = 0.1;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (let obj of this.objects) {
			ctx.fillStyle = obj.fillCol;
			ctx.strokeStyle = obj.fillCol;
			for (let draw of obj.drawOrder) {
				if (draw.length > 3) {
					console.error(
						"Cannot have a drawOrder length greater than 3."
					);
					continue;
				}

				/** @type {Vector3[]} */
				let verts = draw.map((m) => {
					const v = obj.vertices[m];
					const localPos = ApplyLocalRotation(obj, v);
					return ApplyCameraRotation(this, localPos);
				});

				const offScreen = verts.filter((v) => v.z - this.cam.z >= near);

				const onScreen = verts.filter((v) => v.z - this.cam.z < near);

				if (offScreen.length === 3) continue;

				if (offScreen.length === 2 && draw.length === 2) continue;

				if (offScreen.length === 2 && draw.length === 3) {
					console.log(offScreen);

					verts = [
						...onScreen,
						...offScreen.map((v) => {
							const on = onScreen[0];

							console.log(on, v, LinearInterp(v, on, this.cam.z));

							return LinearInterp(v, on, 0);
						}),
					];
					console.log(verts, this.cam.z);
				}

				if (offScreen.length === 1 && draw.length === 3) {
					verts = [
						...onScreen,
						LinearInterp(offScreen[0], onScreen[0], 0),
						LinearInterp(offScreen[0], onScreen[1], 0),
					];
				}

				ctx.beginPath();

				for (let [ix, v] of verts.entries()) {
					const xDiff = v.x - this.cam.x;
					const yDiff = v.y - this.cam.y;
					let zDiff = v.z - this.cam.z;

					if (zDiff == 0) continue;

					const projectedX =
						(xDiff / zDiff) * focalLength + canvas.width / 2;
					const projectedY =
						(yDiff / zDiff) * focalLength + canvas.height / 2;

					console.log(zDiff);

					if (ix === 0) {
						ctx.moveTo(projectedX, projectedY);
					} else {
						ctx.lineTo(projectedX, projectedY);
					}
				}
				ctx.closePath();
				ctx.stroke();
				ctx.fill();
			}
		}
	}
}

const r = new Renderer();

document.addEventListener("keydown", (ev) => {
	if (ev.key === "w") {
		r.cam = r.cam.Add(new Vector3(0, 0, -1));
		console.log(r.cam);
	}

	if (ev.key === "s") {
		r.cam = r.cam.Add(new Vector3(0, 0, 1));
	}

	if (ev.key === "a") {
		r.cam = r.cam.Add(new Vector3(1, 0, 0));
	}

	if (ev.key === "d") {
		r.cam = r.cam.Add(new Vector3(-1, 0, 0));
	}

	if (ev.key === "e") {
		r.cam = r.cam.Add(new Vector3(0, 1, 0));
	}

	if (ev.key === "q") {
		r.cam = r.cam.Add(new Vector3(0, -1, 0));
	}

	if (ev.key === "ArrowRight") {
		r.camRot = r.camRot.Add(new Vector2(0, -1));
	}

	if (ev.key === "ArrowLeft") {
		r.camRot = r.camRot.Add(new Vector2(0, 1));
	}

	if (ev.key === "ArrowUp") {
		r.camRot = r.camRot.Add(new Vector2(1, 0));
	}

	if (ev.key === "ArrowDown") {
		r.camRot = r.camRot.Add(new Vector2(-1, 0));
	}

	r.Draw();
});
