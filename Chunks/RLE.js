import { CHUNKSIZE, MAX_HEIGHT } from "../Globals/Constants.js";

const RLE_DATA = 0x7fff;
const RLE_FLAG = 0x8000;
const EXTRACT_COUNT = ~RLE_FLAG;

export function RLE(arr) {
	let count = 0;
	let currentData = 0;

	let newArr = [];

	for (let i = 0; i < arr.length; i++) {
		const blockData = arr[i] & RLE_DATA;

		if (count === 0) {
			currentData = blockData;
		}

		if (blockData === currentData) {
			count++;

			if (count === RLE_DATA) {
				newArr.push(count | RLE_FLAG, currentData);
				count = 0;
			}
		} else {
			if (count === 1) {
				newArr.push(currentData);
			} else {
				newArr.push(count | RLE_FLAG, currentData);
			}

			currentData = blockData;
			count = 1;
		}
	}

	if (count === 1) {
		newArr.push(currentData);
	} else if (count !== 0) {
		newArr.push(count | RLE_FLAG, currentData);
	}

	return newArr;
}

export function DecodeRLE(rle) {
	let newArr = [];
	let repeatCount = 1;

	for (let i = 0; i < rle.length; i++) {
		if ((rle[i] & RLE_FLAG) >>> 15) {
			repeatCount = rle[i] & EXTRACT_COUNT;
			continue;
		}

		newArr.push(...new Array(repeatCount).fill(rle[i] & RLE_DATA));

		repeatCount = 1;
	}

	return newArr;
}

export function GetFromPositionInRLE(x, y, z, rle) {
	const flatPos = x + z * CHUNKSIZE + y * MAX_HEIGHT;

	let currentPos = -1;

	// if (flatPos === currentPos) return rle[currentPos] & RLE_DATA;

	for (let i = 0; i < rle.length; i++) {
		if ((rle[i] & RLE_FLAG) >>> 15) {
			let old = currentPos;
			currentPos += rle[i] & RLE_DATA;

			if (old <= flatPos && flatPos <= currentPos) {
				return rle[i + 1] & RLE_DATA;
			}

			// Reduce currentPos so we dont need another flag to skip next iteration
			currentPos--;
			continue;
		}

		currentPos++;
		if (flatPos === currentPos) return rle[i] & RLE_DATA;
	}

	throw new Error("Position not found");
}
