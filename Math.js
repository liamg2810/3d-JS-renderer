import { Vector3 } from "./Vectors.js";

/** @type {(pos: Vector3, theta: number): Vector3} */
export function rotateX(pos, theta) {
	const x = pos.x;
	const y = Math.cos(theta) * pos.y - Math.sin(theta) * pos.z;
	const z = Math.sin(theta) * pos.y + Math.cos(theta) * pos.z;

	return new Vector3(x, y, z);
}

/** @type {(pos: Vector3, theta: number): Vector3} */
export function rotateY(pos, theta) {
	const x = Math.cos(theta) * pos.x + Math.sin(theta) * pos.z;
	const y = pos.y;
	const z = -Math.sin(theta) * pos.x + Math.cos(theta) * pos.z;

	return new Vector3(x, y, z);
}

/** @type {(pos: Vector3, theta: number): Vector3} */
export function rotateZ(pos, theta) {
	const x = Math.cos(theta) * pos.x + -Math.sin(theta) * pos.y;
	const y = Math.sin(theta) * pos.x + Math.cos(theta) * pos.y;
	const z = pos.z;

	return new Vector3(x, y, z);
}

/**
 * @param {import("./Primitives.js").ThreeDObject} obj
 * @param {Vector3} v
 * @returns {Vector3}
 */
export function ApplyLocalRotation(obj, v) {
	const local = v.Add(obj.origin.Multiply(-1));

	const rotatedX = rotateX(local, obj.rotation.x * (Math.PI / 180));
	const rotatedY = rotateY(rotatedX, obj.rotation.y * (Math.PI / 180));
	const rotatedZ = rotateZ(rotatedY, obj.rotation.z * (Math.PI / 180));

	return rotatedZ.Add(obj.origin);
}

/**
 * @param {import("./Renderer.js").Renderer} renderer
 * @param {Vector3} v
 * @returns {Vector3}
 */
export function ApplyCameraRotation(renderer, v) {
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
export function lerp(from, to, percent) {
	if (percent < 0) percent = 0;
	if (percent > 1) percent = 1;

	return new Vector3(
		from.x + (to.x - from.x) * percent,
		from.y + (to.y - from.y) * percent,
		from.z + (to.z - from.z) * percent
	);
}

/** @type {(verts: Vector3[], near: number): Vector3[]} */
export function lerpVerts(verts, near) {
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
export function GetDotProduct(verts, comp) {
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
