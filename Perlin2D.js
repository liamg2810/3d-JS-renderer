const perm = new Uint8Array(512);

for (let i = 0; i < 256; i++) perm[i] = i;
for (let i = 0; i < 256; i++) {
	const j = Math.floor(Math.random() * 256);
	[perm[i], perm[j]] = [perm[j], perm[i]];
}
for (let i = 0; i < 256; i++) {
	perm[i + 256] = perm[i];
}

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
	const X = Math.floor(x) & 255;
	const Y = Math.floor(y) & 255;
	const xf = x - Math.floor(x);
	const yf = y - Math.floor(y);

	const topRight = perm[X + 1 + perm[Y + 1]];
	const topLeft = perm[X + perm[Y + 1]];
	const bottomRight = perm[X + 1 + perm[Y]];
	const bottomLeft = perm[X + perm[Y]];

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
