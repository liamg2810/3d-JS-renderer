// Implementation from https://github.com/franky-adl/perlin-noise-3d/blob/main/src/shaders/voronoi3d.glsl

function fract(x) {
	return x - Math.floor(x);
}

/**
 *
 * @param {{x: number; y: number; z: number}} p Vector 3
 * @param {{x: number; y: number; z: number}} pp Vector 3
 * @returns {number}
 */
function dot(p, pp) {
	return p.x * pp.x + p.y * pp.y + p.z * pp.z;
}

/**
 *
 * @param {{x: number; y: number; z: number}} p Vector 3
 * @returns {{x: number; y: number; z: number}}
 */
function hash3d(p) {
	const x = Math.sin(dot(p, { x: 1, y: 57, z: 113 })) * 43758.5453;
	const y = Math.sin(dot(p, { x: 57, y: 113, z: 1 })) * 43758.5453;
	const z = Math.sin(dot(p, { x: 113, y: 1, z: 57 })) * 43758.5453;

	return { x: fract(x), y: fract(y), z: fract(z) };
}

/**
 *
 * @param {{x: number; y: number; z: number}} x Vector 3
 * @returns {[number, number]}
 */
export function voronoi(x) {
	const n = { x: Math.floor(x.x), y: Math.floor(x.y), z: Math.floor(x.z) };
	const f = { x: fract(x.x), y: fract(x.y), z: fract(x.z) };

	let m = { x: 8, y: 8, z: 8, w: 8 };

	for (let k = -1; k <= 1; k++) {
		for (let j = -1; j <= 1; j++) {
			for (let i = -1; i <= 1; i++) {
				const g = { x: i, y: j, z: k };
				const o = hash3d({ x: n.x + g.x, y: n.y + g.y, z: n.z + g.z });

				// calculate distance vector between... idk what im doing here
				const r1 = {
					x: 0.5 + 0.5 * Math.sin(6.2831 * o.x),
					y: 0.5 + 0.5 * Math.sin(6.2831 * o.y),
					z: 0.5 + 0.5 * Math.sin(6.2831 * o.z),
				};
				const r = {
					x: g.x + r1.x - f.x,
					y: g.y + r1.y - f.y,
					z: g.z + r1.z - f.z,
				};

				const d = dot(r, r);

				if (d < m.x) {
					m = { x: d, y: o.x, z: o.y, w: o.z };
				}
			}
		}
	}

	return [m.x, m.y + m.z + m.w];
}
