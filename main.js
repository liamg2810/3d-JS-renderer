/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

class Vector3 {
	x = 0;
	y = 0;
	z = 0;

	/**
	 * @param {Vector3 | number} a
	 * @param {number | undefined} y
	 * @param {number | undefined} z
	 * */
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

	/** @type {(a: Vector3): Vector3} */
	Sub(a) {
		return new Vector3(this.x - a.x, this.y - a.y, this.z - a.z);
	}

	Multiply(a) {
		return new Vector3(this.x * a, this.y * a, this.z * a);
	}

	Divide(a) {
		return new Vector3(this.x / a, this.y / a, this.z / a);
	}

	Normalise() {
		const l = Math.sqrt(
			this.x * this.x + this.y * this.y + this.z * this.z
		);

		if (l === 0) return new Vector3(0, 0, 0);

		return new Vector3(this.x / l, this.y / l, this.z / l);
	}

	static Zero() {
		return new Vector3(0, 0, 0);
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
	/** @type {Vector3[]} */
	frameVerts = [];

	origin = new Vector3(0, 0, 0);
	rotation = new Vector3(0, 20, 30);

	hue = 0;
	saturation = 0;
	lightness = 0;

	constructor(
		renderer,
		vertices,
		drawOrder,
		origin,
		rotation,
		hue,
		saturation,
		lightness
	) {
		this.renderer = renderer;
		this.vertices = vertices;
		this.drawOrder = drawOrder;
		this.origin = origin;
		this.rotation = rotation;
		this.hue = hue;
		this.saturation = saturation;
		this.lightness = lightness;
	}

	CalculateFrameVerts() {
		this.frameVerts = this.vertices.map((v) => {
			const localPos = ApplyLocalRotation(this, v);

			return ApplyCameraRotation(this.renderer, localPos);
		});
	}
}

/** @type {(r: Renderer; origin: Vector3, size: number): ThreeDObject} */
function Cube(r, origin, size) {
	const hS = size / 2;

	return new ThreeDObject(
		r,
		[
			new Vector3(origin.x - hS, origin.y + hS, origin.z - hS),
			new Vector3(origin.x + hS, origin.y + hS, origin.z - hS),
			new Vector3(origin.x + hS, origin.y - hS, origin.z - hS),
			new Vector3(origin.x - hS, origin.y - hS, origin.z - hS),
			new Vector3(origin.x - hS, origin.y + hS, origin.z + hS),
			new Vector3(origin.x + hS, origin.y + hS, origin.z + hS),
			new Vector3(origin.x + hS, origin.y - hS, origin.z + hS),
			new Vector3(origin.x - hS, origin.y - hS, origin.z + hS),
		],
		[
			// BACK
			[2, 1, 0],
			[3, 2, 0],
			// FRONT
			[4, 5, 6],
			[4, 6, 7],
			// BOTTOM
			[1, 4, 0],
			[1, 5, 4],
			// TOP
			[3, 6, 2],
			[3, 7, 6],
			// RIGHT
			[7, 3, 0],
			[0, 4, 7],
			// LEFT
			[6, 5, 2],
			[1, 2, 5],
		],
		origin,
		new Vector3(0, 25, 0),
		50,
		80,
		40
	);
}

function SquareBasedPyramid(r, origin, size) {
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

/** @type {(renderer: Renderer, v: Vector3): Vector3} */
function ApplyCameraRotation(renderer, v) {
	const local = v.Add(renderer.cam);

	const rotatedX = rotateX(local, renderer.camRot.x * (Math.PI / 180));
	const rotatedY = rotateY(rotatedX, renderer.camRot.y * (Math.PI / 180));
	return rotateZ(rotatedY, renderer.camRot.z * (Math.PI / 180));
	// return rotatedZ.Add(renderer.cam.Multiply(-1));
}

/** @type {(offScreenV: Vector3, onScreenV: Vector3, planeZ?: number): Vector3} */
function lerp(offScreenV, onScreenV, planeZ = 0.1) {
	const denom = onScreenV.z - offScreenV.z;

	if (denom === 0)
		return new Vector3(offScreenV.x, offScreenV.y, offScreenV.z);

	let percent = (planeZ - offScreenV.z) / denom;

	if (percent < 0) percent = 0;
	if (percent > 1) percent = 1;

	return new Vector3(
		offScreenV.x + (onScreenV.x - offScreenV.x) * percent,
		offScreenV.y + (onScreenV.y - offScreenV.y) * percent,
		planeZ
	);
}

/** @type {(verts: Vector3[], near: number): Vector3[]} */
function lerpVerts(verts, near) {
	const offScreen = verts.filter((v) => v.z < near);
	const onScreen = verts.filter((v) => v.z >= near);

	if (offScreen.length === 3) return [];

	if (offScreen.length === 2 && verts.length === 2) return [];

	let r = verts;

	if (offScreen.length === 2 && verts.length === 3) {
		r = [
			...onScreen,
			...offScreen.map((v) => {
				const on = onScreen[0];

				const l = lerp(v, on, near);

				if (on.z < near) {
					l.z = near;
				}

				return l;
			}),
		];
	}

	if (offScreen.length === 1 && verts.length === 3) {
		const on1 = onScreen[0];
		const on2 = onScreen[1];

		const v = offScreen[0];

		const l1 = lerp(v, on1, near);
		const l2 = lerp(v, on2, near);

		if (l1.x < l2.x) {
			r = [...onScreen, l2, l1];
		} else {
			r = [l1, ...onScreen, l2];
		}
	}

	return r;
}

/** @type {(verts: Vector3[], comp: Vector3): number} */
function GetDotProduct(verts, comp) {
	const a = verts[1].Sub(verts[0]);
	const b = verts[2].Sub(verts[0]);

	const cross = new Vector3(
		a.y * b.z - a.z * b.y,
		a.z * b.x - a.x * b.z,
		a.x * b.y - a.y * b.x
	);

	const mag = Math.sqrt(
		cross.x * cross.x + cross.y * cross.y + cross.z * cross.z
	);

	const normal = new Vector3(cross.x / mag, cross.y / mag, cross.z / mag);

	const viewDir = new Vector3(
		comp.x - verts[0].x,
		comp.y - verts[0].y,
		comp.z - verts[0].z
	).Normalise();

	const dot =
		normal.x * viewDir.x + normal.y * viewDir.y + normal.z * viewDir.z;

	return dot;
}

class Renderer {
	/** @type {ThreeDObject[]} */
	objects = [];
	cam = new Vector3(0, 0, 0);
	camRot = new Vector3(0, 180, 0);
	keyMap = new Set();
	light = new Vector3(50, 50, 50);

	focalLength = 300;
	near = 0.1;
	far = 1000;

	constructor() {
		this.objects.push(Cube(this, new Vector3(0, 0, -50), 25));

		this.objects.push(SquareBasedPyramid(this, new Vector3(25, 0, 0), 25));

		this.objects.push(
			new ThreeDObject(
				this,
				[
					new Vector3(100, 100, -100),
					new Vector3(100, 100, 100),
					new Vector3(-100, 100, 100),
					new Vector3(-100, 100, -100),
				],
				[
					[2, 1, 0],
					[3, 2, 0],
				],
				new Vector3(0, 0, 0),
				new Vector3(0, 0, 0),
				90,
				100,
				100
			)
		);

		this.Update();
	}

	Update() {
		// this.objects[0].rotation = this.objects[0].rotation.Add(
		// 	new Vector3(0, 1, 0)
		// );

		if (this.keyMap.has("w")) {
			this.cam = this.cam.Add(
				new Vector3(
					Math.sin((this.camRot.y * Math.PI) / 180),
					-Math.sin((this.camRot.x * Math.PI) / 180),
					-Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("s")) {
			this.cam = this.cam.Add(
				new Vector3(
					-Math.sin((this.camRot.y * Math.PI) / 180),
					Math.sin((this.camRot.x * Math.PI) / 180),
					Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("a")) {
			this.cam = this.cam.Add(
				new Vector3(
					Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("d")) {
			this.cam = this.cam.Add(
				new Vector3(
					-Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					-Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("e")) {
			this.cam = this.cam.Add(new Vector3(0, 1, 0));
		}

		if (this.keyMap.has("q")) {
			this.cam = this.cam.Add(new Vector3(0, -1, 0));
		}

		if (this.keyMap.has("ArrowRight")) {
			this.camRot = this.camRot.Add(new Vector3(0, -1, 0));
		}

		if (this.keyMap.has("ArrowLeft")) {
			this.camRot = this.camRot.Add(new Vector3(0, 1, 0));
		}

		if (this.keyMap.has("ArrowUp")) {
			this.camRot = this.camRot.Add(new Vector3(1, 0, 0));
		}

		if (this.keyMap.has("ArrowDown")) {
			this.camRot = this.camRot.Add(new Vector3(-1, 0, 0));
		}

		this.Draw();

		setTimeout(() => {
			this.Update();
		}, 1000 / 60);
	}

	DrawLight() {
		const lightPos = ApplyCameraRotation(this, this.light);

		if (lightPos.z < this.near || lightPos.z > this.far) return;

		const projectedX =
			(lightPos.x / lightPos.z) * this.focalLength + canvas.width / 2;
		const projectedY =
			(lightPos.y / lightPos.z) * this.focalLength + canvas.height / 2;

		ctx.fillStyle = "rgb(0, 0, 255)";
		ctx.fillRect(projectedX, projectedY, 10, 10);
	}

	Draw() {
		const lightPos = ApplyCameraRotation(this, this.light);

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (let obj of this.objects) {
			obj.CalculateFrameVerts();
		}

		/** @type {{obj: ThreeDObject; face: Vector3[]}[]} */
		let orderedFaces = [];

		for (let obj of this.objects) {
			for (let draw of obj.drawOrder) {
				if (draw.length > 3) {
					console.error(
						"Cannot have a drawOrder length greater than 3."
					);
					continue;
				}

				let verts = draw.map((o) => {
					return obj.frameVerts[o];
				});

				orderedFaces.push({ obj: obj, face: verts });
			}
		}

		orderedFaces = orderedFaces.sort((a, b) => {
			let aSum = Vector3.Zero();

			a.face.forEach((face) => {
				aSum = aSum.Add(face);
			});

			const averageA = aSum.Divide(a.face.length);

			const aMag = Math.sqrt(
				averageA.x * averageA.x +
					averageA.y * averageA.y +
					averageA.z * averageA.z
			);

			let bSum = Vector3.Zero();

			b.face.forEach((face) => {
				bSum = bSum.Add(face);
			});

			const averageB = bSum.Divide(b.face.length);

			const bMag = Math.sqrt(
				averageB.x * averageB.x +
					averageB.y * averageB.y +
					averageB.z * averageB.z
			);

			return bMag - aMag;
		});

		// this.DrawLight();
		for (let face of orderedFaces) {
			const dot = GetDotProduct(face.face, Vector3.Zero());

			if (dot > 0) {
				continue;
			}

			const lightDot = GetDotProduct(face.face, lightPos);

			ctx.fillStyle = `hsl(${face.obj.hue} ${face.obj.saturation}% ${
				face.obj.lightness * (0.3 + 0.7 * (lightDot > 0))
			}%)`;
			ctx.strokeStyle = ctx.fillStyle;

			face = lerpVerts(face.face, this.near);

			if (face.length === 0) {
				return;
			}

			ctx.beginPath();

			for (let [ix, v] of face.entries()) {
				if (v.z == 0) continue;

				if (v.z < this.near || v.z > this.far) continue;

				const projectedX =
					(v.x / v.z) * this.focalLength + canvas.width / 2;
				const projectedY =
					(v.y / v.z) * this.focalLength + canvas.height / 2;

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

		ctx.fillStyle = "hsl(0 0% 0%)";
	}
}

const r = new Renderer();

document.addEventListener("keydown", (ev) => {
	ev.preventDefault();

	r.keyMap.add(ev.key);
});

document.addEventListener("keyup", (ev) => {
	ev.preventDefault();

	if (r.keyMap.has(ev.key)) {
		r.keyMap.delete(ev.key);
	}
});
