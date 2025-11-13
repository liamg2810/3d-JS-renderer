// [TEXTURE][DIRECTION][CID][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// CID = 0-7 = 3 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 6 bits
// TOTAL BITS = 28

// CORNER IDS = [TOP LEFT BACK, TOP RIGHT BACK, TOP LEFT FRONT, TOP RIGHT FRONT,
// 				BOTTOM LEFT BACK, BOTTOM RIGHT BACK, BOTTOM LEFT FRONT, BOTTOM RIGHT FRONT]

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {{top?: number; base: number; bottom?: number}} tex
 * @param {number} culledFaces
 * @returns {Uint32Array}
 */
export function Cube(x, y, z, tex, culledFaces = 0b111111) {
	if (x < 0 || x > 15) {
		throw new Error("Out of bounds X position on new cube.");
	}
	if (z < 0 || z > 15) {
		throw new Error("Out of bounds Z position on new cube.");
	}
	if (y < 0 || y > 255) {
		throw new Error("Out of bounds Y position on new cube.");
	}

	const position = (x << 12) | (y << 4) | z;

	// prettier-ignore
	const corners =[
			// TOP
			0, 2, 3,
			3, 1, 0,
			// BOTTOM
			4, 5, 7,
			7, 6, 4,
			// LEFT
			4, 6, 2,
			2, 0, 4,
			// RIGHT
			1, 3, 7,
			7, 5, 1,
			// FRONT
			3, 2, 6,
			6, 7, 3,
			// BACK
			4, 0, 1,
			1, 5, 4,
		]

	const directions = [
		// TOP face normal
		0,
		// BOTTOM face normal
		1,
		// LEFT face normal
		2,
		// RIGHT face normal
		3,
		// FRONT face normal
		4,
		// BACK face normal
		5,
	];

	let out = [];

	for (let [ix, cID] of corners.entries()) {
		const dir = directions[Math.floor(ix / 6)];
		if (!((culledFaces >> dir) & 0b1)) continue;
		let tId;

		switch (dir) {
			case 0:
				tId = tex.top ? tex.top : tex.base;
				break;
			case 1:
				tId = tex.bottom ? tex.bottom : tex.base;
				break;
			case 2:
				tId = tex.left ? tex.left : tex.base;
				break;
			case 3:
				tId = tex.right ? tex.right : tex.base;
				break;
			case 4:
				tId = tex.front ? tex.front : tex.base;
				break;
			case 5:
				tId = tex.back ? tex.back : tex.base;
				break;
		}

		let vert = (tId << 22) | (dir << 19) | (cID << 16) | position;

		out.push(vert >>> 0);
	}

	return new Uint32Array(out);
}

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} tex
 * @returns {Uint32Array}
 */
export function Water(x, y, z, tex) {
	if (x < 0 || x > 15) {
		throw new Error("Out of bounds X position on new cube.");
	}
	if (z < 0 || z > 15) {
		throw new Error("Out of bounds Z position on new cube.");
	}
	if (y < 0 || y > 255) {
		throw new Error("Out of bounds Y position on new cube.");
	}

	const position = (x << 12) | (y << 4) | z;

	// prettier-ignore
	const corners =[
			// TOP
			0, 2, 3,
			3, 1, 0,
		]

	const directions = [
		// TOP face normal
		0,
	];
	const verts = new Uint32Array(corners.length);

	for (let [ix, cID] of corners.entries()) {
		const dir = directions[Math.floor(ix / 6)];

		let tId;

		switch (dir) {
			case 0:
				tId = tex.top ? tex.top : tex.base;
				break;
		}

		let vert = (tId << 22) | (dir << 19) | (cID << 16) | position;

		verts[ix] = vert;
	}

	return verts;
}
