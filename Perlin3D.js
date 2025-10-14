function fade(t) {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
	return a + t * (b - a);
}

function grad(hash, x, y) {
	switch (hash & 3) {
		case 0:
			return x + y;
		case 1:
			return -x + y;
		case 2:
			return x - y;
		case 3:
			return -x - y;
	}
}

const perm = new Uint8Array(512);

for (let i = 0; i < 256; i++) perm[i] = i;
for (let i = 0; i < 256; i++) {
	const j = Math.floor(Math.random() * 256);
	[perm[i], perm[j]] = [perm[j], perm[i]];
}
for (let i = 0; i < 256; i++) {
	perm[i + 256] = perm[i];
}

export function perlin3D(x, y, z) {
	const X = Math.floor(x) & 255;
	const Y = Math.floor(y) & 255;
	const Z = Math.floor(z) & 255;

	const xf = x - Math.floor(x);
	const yf = y - Math.floor(y);
	const zf = z - Math.floor(z);

	const u = fade(xf);
	const v = fade(yf);
	const w = fade(zf);

	function grad3(hash, x, y, z) {
		switch (hash & 15) {
			case 0:
				return x + y;
			case 1:
				return -x + y;
			case 2:
				return x - y;
			case 3:
				return -x - y;
			case 4:
				return x + z;
			case 5:
				return -x + z;
			case 6:
				return x - z;
			case 7:
				return -x - z;
			case 8:
				return y + z;
			case 9:
				return -y + z;
			case 10:
				return y - z;
			case 11:
				return -y - z;
			case 12:
				return x + y;
			case 13:
				return -x + y;
			case 14:
				return x - y;
			case 15:
				return -x - y;
			default:
				return 0;
		}
	}

	const aaa = perm[perm[perm[X] + Y] + Z];
	const aba = perm[perm[perm[X] + Y + 1] + Z];
	const aab = perm[perm[perm[X] + Y] + Z + 1];
	const abb = perm[perm[perm[X] + Y + 1] + Z + 1];
	const baa = perm[perm[perm[X + 1] + Y] + Z];
	const bba = perm[perm[perm[X + 1] + Y + 1] + Z];
	const bab = perm[perm[perm[X + 1] + Y] + Z + 1];
	const bbb = perm[perm[perm[X + 1] + Y + 1] + Z + 1];

	const x1 = lerp(grad3(aaa, xf, yf, zf), grad3(baa, xf - 1, yf, zf), u);
	const x2 = lerp(
		grad3(aba, xf, yf - 1, zf),
		grad3(bba, xf - 1, yf - 1, zf),
		u
	);
	const y1 = lerp(x1, x2, v);

	const x3 = lerp(
		grad3(aab, xf, yf, zf - 1),
		grad3(bab, xf - 1, yf, zf - 1),
		u
	);
	const x4 = lerp(
		grad3(abb, xf, yf - 1, zf - 1),
		grad3(bbb, xf - 1, yf - 1, zf - 1),
		u
	);
	const y2 = lerp(x3, x4, v);

	return (lerp(y1, y2, w) + 1) / 2; // Normalize to [0,1]
}
