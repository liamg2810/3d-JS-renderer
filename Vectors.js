export class Vector3 {
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

export class Vector2 {
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
