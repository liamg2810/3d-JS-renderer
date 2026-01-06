// [LIGHT][BIOME][TEXTURE][DIRECTION][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 6 bits
// BIOME = 0-127 = 7 bits
// LIGHT = 0-15 = 4 bits
// TOTAL BITS = 36
// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

import { BLOCK_DATA, TEX_ARRAY } from "./Globals/Blocks/Blocks.js";

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

	if (blockCode === BLOCK_DATA["poppy"].code) {
		culledFaces = 0b111100;
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

// [HEIGHT][LIGHT]-[TEXTURE][DIRECTION][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 6 bits
// -- High bits
// LIGHT = 0-15 = 4 bits
// HEIGHT = 0-7 * 4 verts = 12 bits
// TOTAL BITS = 37

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

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
export function Water(
	out,
	offset,
	x,
	y,
	z,
	blockCode,
	culledFaces = 0b111111,
	light = [0, 0, 0, 0],
	heights = [6, 6, 6, 6]
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

	let tId = TEX_ARRAY[blockCode * 6];

	let v = 0;

	for (let dir = 0; dir < 6; dir++) {
		if (!((culledFaces >> dir) & 0b1)) continue;
		let vert = (tId << 19) | (dir << 16) | position;
		let high =
			(heights[3] << 13) |
			(heights[2] << 10) |
			(heights[1] << 7) |
			(heights[0] << 4) |
			light[dir];

		out.set([high, vert], offset + v);
		v += 2;
	}

	return v;
}
