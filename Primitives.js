import { BLOCKS } from "./Globals/Constants.js";

// [LIGHT][BIOME][TEXTURE][DIRECTION][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 6 bits
// BIOME = 0-127 = 7 bits
// LIGHT = 0-15 = 4 bits
// TOTAL BITS = 36

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

/**
 *
 * @param {Uint32Array} out
 * @param {number} offset
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {{top?: number; base: number; bottom?: number}} tex
 * @param {number} culledFaces
 * @param {number} biome
 * @param {BLOCKS[]} blocks
 * @returns {number}
 */
export function Cube(
	out,
	offset,
	x,
	y,
	z,
	tex,
	culledFaces = 0b111111,
	biome = 0,
	light = [15, 0, 0, 0, 0, 0]
) {
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

	let v = 0;

	for (let dir = 0; dir < 6; dir++) {
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

		let vert = (biome << 25) | (tId << 19) | (dir << 16) | position;
		let upper = light[dir];

		out.set([upper >>> 0, vert >>> 0], offset + v);
		v += 2;
	}

	return v;
}

/**
 *
 * @param {Uint32Array} out
 * @param {number} offset
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} tex
 * @returns {Uint32Array}
 */
export function Water(out, offset, x, y, z, tex, light = 15) {
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

	// const directions = [
	// 	// TOP face normal
	// 	0,
	// ];

	// for (let [ix, dir] of directions.entries()) {
	// 	let tId;

	// switch (dir) {
	// 	case 0:
	let tId = tex.top ? tex.top : tex.base;
	// break;
	// }

	let vert = (tId << 19) | position;

	out.set([light >>> 0, vert], offset);
	// }

	return 2;
}
