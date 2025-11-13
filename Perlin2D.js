const perm = new Uint8Array(512);

const grad = [
	[1, 1],
	[-1, 1],
	[1, -1],
	[-1, -1],
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
];

function fade(t) {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
	return a + t * (b - a);
}

function grad2(hash, x, y) {
	const g = grad[hash & 7];
	return g[0] * x + g[1] * y;
}

export function perlin2D(x, y) {
	const xi = Math.floor(x) % 256;
	const yi = Math.floor(y) % 256;
	const xf = x - Math.floor(x);
	const yf = y - Math.floor(y);

	const X = ((xi % 256) + 256) % 256;
	const Y = ((yi % 256) + 256) % 256;

	const topRight = perm[(X + 1 + perm[(Y + 1) & 255]) & 255];
	const topLeft = perm[(X + perm[(Y + 1) & 255]) & 255];
	const bottomRight = perm[(X + 1 + perm[Y & 255]) & 255];
	const bottomLeft = perm[(X + perm[Y & 255]) & 255];

	const u = fade(xf);
	const v = fade(yf);

	const bl = grad2(bottomLeft, xf, yf);
	const br = grad2(bottomRight, xf - 1, yf);
	const tl = grad2(topLeft, xf, yf - 1);
	const tr = grad2(topRight, xf - 1, yf - 1);

	const x1 = lerp(bl, br, u);
	const x2 = lerp(tl, tr, u);

	return lerp(x1, x2, v);
}

export function SetSeed(seed) {
	let rng = (function (s) {
		return function () {
			s = (s * 1664525 + 1013904223) % 4294967296;
			return s / 4294967296;
		};
	})(seed * 4294967296);

	for (let i = 0; i < 256; i++) perm[i] = i;
	for (let i = 0; i < 256; i++) {
		const j = Math.floor(rng() * 256);
		[perm[i], perm[j]] = [perm[j], perm[i]];
	}
	for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
}
