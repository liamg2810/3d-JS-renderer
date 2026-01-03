/**
 * @typedef {{base_height: number,height_variation: number, surface_block: number, subsurface_block: number, temp_center: number, humidity_center: number, tree_chance: number, code: number, color: string} BIOME}
 */

/** @type {{name: BIOME}} */
export let BIOME_DATA = {};

/**
 *
 * @param {string} name
 * @returns {BIOME}
 */
export function GetBiome(name) {
	if (BIOME_DATA[name] !== undefined) {
		return BIOME_DATA[name];
	}

	throw new Error(`Biome not found: ${name}`);
}
