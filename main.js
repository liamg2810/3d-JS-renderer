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
function Cube(r, origin, sizeY, size, h, s, l) {
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
		Vector3.Zero(),
		h,
		s,
		l
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

/**
 * @param {Renderer} renderer
 * @param {Vector3} v
 * @returns {Vector3}
 */
function ApplyCameraRotation(renderer, v) {
	const local = v.Add(renderer.cam);

	let rotated = rotateY(local, -renderer.camRot.y * (Math.PI / 180));
	rotated = rotateX(rotated, -renderer.camRot.x * (Math.PI / 180));
	rotated = rotateZ(rotated, -renderer.camRot.z * (Math.PI / 180));
	return rotated;
}

/**
 * @param {Vector3} from
 * @param {Vector3} to
 * @param {number} percent
 * @returns {Vector3}
 */
function lerp(from, to, percent) {
	if (percent < 0) percent = 0;
	if (percent > 1) percent = 1;

	return new Vector3(
		from.x + (to.x - from.x) * percent,
		from.y + (to.y - from.y) * percent,
		from.z + (to.z - from.z) * percent
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

				const denom = on.z - v.z;

				if (denom === 0) return new Vector3(v.x, v.y, v.z);

				let percent = (near - v.z) / denom;

				const l = lerp(v, on, percent);

				l.z = near;

				return l;
			}),
		];
	}

	if (offScreen.length === 1 && verts.length === 3) {
		const on1 = onScreen[0];
		const on2 = onScreen[1];

		const v = offScreen[0];

		const denom1 = on1.z - v.z;

		let l1;

		if (denom1 === 0) {
			l1 = new Vector3(v.x, v.y, v.z);
		} else {
			let percent1 = (near - v.z) / denom1;
			l1 = lerp(v, on1, percent1);
			l1.z = near;
		}

		const denom2 = on2.z - v.z;
		let l2;

		if (denom2 === 0) {
			l2 = new Vector3(v.x, v.y, v.z);
		} else {
			let percent2 = (near - v.z) / denom2;
			l2 = lerp(v, on2, percent2);
			l2.z = near;
		}

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

	const normal = cross.Normalise();

	const viewDir = new Vector3(
		verts[0].x - comp.x,
		verts[0].y - comp.y,
		verts[0].z - comp.z
	).Normalise();

	const dot =
		normal.x * viewDir.x + normal.y * viewDir.y + normal.z * viewDir.z;

	return dot;
}

function CubeScene(renderer) {
	const scale = 25;
	for (let x = -scale * 5; x < scale * 5; x += scale) {
		for (let z = -scale * 5; z < scale * 5; z += scale) {
			renderer.objects.push(
				Cube(
					renderer,
					new Vector3(x, 50 - Math.random() * scale, z),
					scale,
					Math.round(Math.random() * 360),
					Math.round(Math.random() * 100),
					50
				)
			);
		}
	}
}

function TestScene(renderer) {
	const scale = 25;
	renderer.objects.push(
		Cube(renderer, new Vector3(0, 25, 50), scale, 90, 50, 100)
	);

	renderer.objects.push(
		SquareBasedPyramid(renderer, new Vector3(-25, 0, 10), 25)
	);

	renderer.objects.push(
		new ThreeDObject(
			renderer,
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
}

function Sphere(renderer) {
	let verts = [];

	const scale = 10;

	for (let y = 0; y < scale; y++) {
		for (let z = 0; z < grid + 1; z++) {
			verts.push(
				new Vector3(
					x * scale,
					Math.random() * scale - scale / 2,
					z * scale
				)
			);
		}
	}

	let draw = [];

	for (let i = 0; i < verts.length; i += 1) {
		if (i + grid + 2 >= verts.length) {
			continue;
		}

		if (i % (grid + 1) === grid) {
			continue;
		}

		draw.push([i + grid + 2, i + grid + 1, i]);
		draw.push([i, i + 1, i + grid + 2]);
	}

	renderer.objects.push(
		new ThreeDObject(
			renderer,
			verts,
			draw,
			Vector3.Zero(),
			Vector3.Zero(),
			90,
			100,
			50
		)
	);

	// renderer.objects.push(
	// 	new ThreeDObject(
	// 		renderer,
	// 		[
	// 			new Vector3(0, 0, 0),
	// 			new Vector3(scale * grid, 0, 0),
	// 			new Vector3(scale * grid, 0, scale * grid),
	// 			new Vector3(0, 0, scale * grid),
	// 		],
	// 		[
	// 			[0, 2, 1],
	// 			[0, 3, 2],
	// 		],
	// 		new Vector3(0, 0, 0),
	// 		new Vector3(0, 0, 0),
	// 		180,
	// 		100,
	// 		100
	// 	)
	// );
}

const noise = {
	permutation: (() => {
		const p = [];
		for (let i = 0; i < 256; i++) p[i] = i;
		for (let i = 255; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[p[i], p[j]] = [p[j], p[i]];
		}
		return [...p, ...p];
	})(),
	grad: [
		[1, 1],
		[-1, 1],
		[1, -1],
		[-1, -1],
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	],
	fade: function (t) {
		return t * t * t * (t * (t * 6 - 15) + 10);
	},
	lerp: function (a, b, t) {
		return a + t * (b - a);
	},
	grad2: function (hash, x, y) {
		const g = this.grad[hash & 7];
		return g[0] * x + g[1] * y;
	},
	perlin2: function (x, y) {
		const X = Math.floor(x) & 255;
		const Y = Math.floor(y) & 255;
		const xf = x - Math.floor(x);
		const yf = y - Math.floor(y);

		const topRight = this.permutation[X + 1 + this.permutation[Y + 1]];
		const topLeft = this.permutation[X + this.permutation[Y + 1]];
		const bottomRight = this.permutation[X + 1 + this.permutation[Y]];
		const bottomLeft = this.permutation[X + this.permutation[Y]];

		const u = this.fade(xf);
		const v = this.fade(yf);

		const bl = this.grad2(bottomLeft, xf, yf);
		const br = this.grad2(bottomRight, xf - 1, yf);
		const tl = this.grad2(topLeft, xf, yf - 1);
		const tr = this.grad2(topRight, xf - 1, yf - 1);

		const x1 = this.lerp(bl, br, u);
		const x2 = this.lerp(tl, tr, u);

		return this.lerp(x1, x2, v);
	},
};

function TerrainScene(renderer) {
	let verts = [];

	const scale = 5;
	const grid = 50;

	for (let x = 0; x < grid + 1; x++) {
		for (let z = 0; z < grid + 1; z++) {
			let val = noise.perlin2(x / 10, z / 10);

			verts.push(
				new Vector3(
					x * scale,
					Math.abs(val) * scale * 2 - scale,
					z * scale
				)
			);
		}
	}

	let draw = [];

	for (let i = 0; i < verts.length; i += 1) {
		if (i + grid + 2 >= verts.length) {
			continue;
		}

		if (i % (grid + 1) === grid) {
			continue;
		}

		draw.push([i + grid + 2, i + grid + 1, i]);
		draw.push([i, i + 1, i + grid + 2]);
	}

	renderer.objects.push(
		new ThreeDObject(
			renderer,
			verts,
			draw,
			Vector3.Zero(),
			Vector3.Zero(),
			90,
			100,
			50
		)
	);

	// renderer.objects.push(
	// 	new ThreeDObject(
	// 		renderer,
	// 		[
	// 			new Vector3(0, 0, 0),
	// 			new Vector3(scale * grid, 0, 0),
	// 			new Vector3(scale * grid, 0, scale * grid),
	// 			new Vector3(0, 0, scale * grid),
	// 		],
	// 		[
	// 			[0, 2, 1],
	// 			[0, 3, 2],
	// 		],
	// 		new Vector3(0, 0, 0),
	// 		new Vector3(0, 0, 0),
	// 		180,
	// 		100,
	// 		100
	// 	)
	// );
}

function VoxelTerrainScene(renderer) {
	const scale = 10;
	const grid = 16;

	for (let x = 0; x < grid; x++) {
		for (let z = 0; z < grid; z++) {
			let val = noise.perlin2(x / 10, z / 10);

			val = Math.round(val * 10) / 10;

			let hue = 90;

			if (val < 0.1) {
				hue = 45;
			}

			if (val < 0) {
				val = -0.02;
				hue = 180;
			}

			renderer.objects.push(
				Cube(
					renderer,
					new Vector3(x * scale, -val * scale * 10, z * scale),
					scale,
					scale,
					hue,
					50,
					100
				)
			);
		}
	}
}

class Renderer {
	/** @type {ThreeDObject[]} */
	objects = [];
	cam = new Vector3(-100, 50, 50);
	camRot = new Vector3(0, 0, 0);
	keyMap = new Set();
	light = new Vector3(50, -50, 50);

	focalLength = 300;
	near = 0.1;
	far = 1000;

	constructor() {
		// TestScene(this);
		// TerrainScene(this);
		VoxelTerrainScene(this);

		this.Update();
	}

	lightDir = new Vector3(1, 0, 0);

	Update() {
		// this.objects[0].rotation = this.objects[0].rotation.Add(
		// 	new Vector3(0, 0, 1)
		// );

		this.light = this.light.Add(this.lightDir);

		if (this.light.x > 200) {
			this.lightDir.x = -1;
		}

		if (this.light.x < 50) {
			this.lightDir.x = 1;
		}

		if (this.keyMap.has("w")) {
			this.cam = this.cam.Add(
				new Vector3(
					-Math.sin((this.camRot.y * Math.PI) / 180),
					Math.sin((this.camRot.x * Math.PI) / 180),
					-Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("s")) {
			this.cam = this.cam.Add(
				new Vector3(
					Math.sin((this.camRot.y * Math.PI) / 180),
					-Math.sin((this.camRot.x * Math.PI) / 180),
					Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("a")) {
			this.cam = this.cam.Add(
				new Vector3(
					Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					-Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("d")) {
			this.cam = this.cam.Add(
				new Vector3(
					-Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("e")) {
			this.cam.y += 1;
		}

		if (this.keyMap.has("q")) {
			this.cam.y -= 1;
		}
		if (this.keyMap.has("ArrowRight")) {
			this.camRot.y += 1;

			if (this.camRot.y > 360) this.camRot.y = 0;
		}

		if (this.keyMap.has("ArrowLeft")) {
			this.camRot.y -= 1;

			if (this.camRot.y < 0) this.camRot.y = 360;
		}

		if (this.keyMap.has("ArrowUp")) {
			this.camRot.x += 1;

			this.camRot.x = Math.max(Math.min(this.camRot.x, 45), -45);
		}

		if (this.keyMap.has("ArrowDown")) {
			this.camRot.x -= 1;

			this.camRot.x = Math.max(Math.min(this.camRot.x, 45), -45);
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

		/** @type {{obj: ThreeDObject; face: Vector3[]; drawOrder: [number, number, number]}[]} */
		let faces = [];

		for (let obj of this.objects) {
			obj.CalculateFrameVerts();

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

				faces.push({ obj: obj, face: verts, drawOrder: draw });
			}
		}

		faces = faces.sort((a, b) => {
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

		for (let face of faces) {
			const dot = GetDotProduct(face.face, Vector3.Zero());

			if (dot < 0) {
				continue;
			}

			const lightDot = GetDotProduct(face.face, lightPos);

			ctx.fillStyle = `hsl(${face.obj.hue} ${face.obj.saturation}% ${
				face.obj.lightness * (0.3 + 0.7 * lightDot)
			}%)`;

			const f = lerpVerts(face.face, this.near);

			ctx.strokeStyle = ctx.fillStyle;
			ctx.beginPath();

			for (let [ix, v] of f.entries()) {
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
		this.DrawLight();
	}
}

const r = new Renderer();

document.addEventListener("keydown", (ev) => {
	// ev.preventDefault();

	r.keyMap.add(ev.key);
});

document.addEventListener("keyup", (ev) => {
	ev.preventDefault();

	if (r.keyMap.has(ev.key)) {
		r.keyMap.delete(ev.key);
	}
});
