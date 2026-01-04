// [LIGHT][BIOME][TEXTURE][DIRECTION][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 6 bits
// BIOME = 0-127 = 7 bits
// LIGHT = 0-15 = 4 bits
// TOTAL BITS = 36

import { TEX_ARRAY } from "./Globals/Blocks/Blocks.js";

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

const faces = ["top", "bottom", "front", "back", "left", "right"];

/**
 *
 * @param {Uint32Array} out
 * @param {number} offset
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} blockCode
 * @param {number} culledFaces
 * @param {number} biome
 * @returns {number}
 */
export function Cube(
	out,
	offset,
	x,
	y,
	z,
	blockCode,
	culledFaces = 0b111111,
	biome = 0,
	light = [0, 0, 0, 0, 0, 0]
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
		let tId = TEX_ARRAY[blockCode * 6 + dir];

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
 * @param {number} blockCode
 * @returns {Uint32Array}
 */
export function Water(out, offset, x, y, z, blockCode, light = 15) {
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

	let tId = TEX_ARRAY[blockCode * 6];

	let vert = (tId << 19) | position;

	out.set([light >>> 0, vert], offset);

	return 2;
}
