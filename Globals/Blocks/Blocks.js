export let TEX_ARRAY = [];
export let BLOCK_ARRAY = [];
export let TRANSPARENT_ARRAY = [];
export let ILLUMINATION_ARRAY = [];
export let LIGHT_DECAY_ARRAY = [];
export let BLOCK_NAMES_ARRAY = [];

/** @typedef {{code: number, texture: { top: number, bottom: number, front: number, back: number, left: number, right: number }, transparent: bool, illumination: number, lightDecay: number}} BLOCK */

/** @type {{name: BLOCK}} */
export let BLOCK_DATA = {};

/**
 *
 * @param {string} name
 * @returns {BLOCK}
 */
export function GetBlock(name) {
	if (BLOCK_DATA[name] !== undefined) {
		return BLOCK_DATA[name];
	}

	throw new Error(`Block not found: ${name}`);
}

export function GetBlockByCode(code) {
	for (let b of Object.values(BLOCK_DATA)) {
		if (b.code === code) return b;
	}

	throw new Error(`Block code not found: ${code}`);
}

export function InputBlocks(json) {
	Object.assign(BLOCK_DATA, json);

	for (let [k, o] of Object.entries(json)) {
		TEX_ARRAY.push(o["texture"]["top"]);
		TEX_ARRAY.push(o["texture"]["bottom"]);
		TEX_ARRAY.push(o["texture"]["left"]);
		TEX_ARRAY.push(o["texture"]["right"]);
		TEX_ARRAY.push(o["texture"]["front"]);
		TEX_ARRAY.push(o["texture"]["back"]);

		BLOCK_ARRAY.push(o["code"]);
		TRANSPARENT_ARRAY.push(o["transparent"]);
		ILLUMINATION_ARRAY.push(o["illumination"]);
		LIGHT_DECAY_ARRAY.push(o["lightDecay"] || 0);
		BLOCK_NAMES_ARRAY.push(k);
	}
}
