import { perlin3D } from "./Perlin3D.js";
import { Cube, SquareBasedPyramid, ThreeDObject } from "./Primitives.js";
import { Vector3 } from "./Vectors.js";

const textures = {
	GRASS: {
		top: {
			x: 1,
			y: 0,
		},
		base: {
			x: 0,
			y: 0,
		},
	},
	LOG: {
		top: {
			x: 4,
			y: 0,
		},
		base: {
			x: 3,
			y: 0,
		},
	},
	SAND: {
		base: {
			x: 5,
			y: 0,
		},
	},
	WATER: {
		base: {
			x: 6,
			y: 0,
		},
	},
	LEAVES: {
		base: {
			x: 2,
			y: 0,
		},
	},
	STONE: {
		base: {
			x: 0,
			y: 1,
		},
	},
};

export function CubeScene(renderer) {
	const scale = 25;
	for (let x = -scale * 5; x < scale * 5; x += scale) {
		for (let z = -scale * 5; z < scale * 5; z += scale) {
			renderer.objects.push(
				Cube(
					renderer,
					new Vector3(x, 50 - Math.random() * scale, z),
					scale,
					scale,
					Math.round(Math.random() * 360),
					Math.round(Math.random() * 100),
					50
				)
			);
		}
	}
}

export function TestScene(renderer) {
	const scale = 25;
	renderer.objects.push(
		Cube(renderer, new Vector3(0, 0, 0), scale, scale, 90, 50, 50)
	);

	// renderer.objects.push(
	// 	SquareBasedPyramid(renderer, new Vector3(-25, 0, 10), 25)
	// );

	// renderer.objects.push(
	// 	new ThreeDObject(
	// 		renderer,
	// 		[
	// 			new Vector3(100, 100, -100),
	// 			new Vector3(100, 100, 100),
	// 			new Vector3(-100, 100, 100),
	// 			new Vector3(-100, 100, -100),
	// 		],
	// 		[
	// 			[2, 1, 0],
	// 			[3, 2, 0],
	// 		],
	// 		new Vector3(0, 0, 0),
	// 		new Vector3(0, 0, 0),
	// 		90,
	// 		100,
	// 		50
	// 	)
	// );
}

export function TerrainScene(renderer) {
	let verts = [];

	const scale = 5;
	const grid = 50;

	for (let x = 0; x < grid + 1; x++) {
		for (let z = 0; z < grid + 1; z++) {
			// let val = perlin2D(x / 10, z / 10);
			// verts.push(
			// 	new Vector3(
			// 		x * scale,
			// 		Math.abs(val) * scale * 2 - scale,
			// 		z * scale
			// 	)
			// );
		}
	}

	let draw = [];

	for (let i = 0; i < verts.length; i += 1) {
		if (i + grid + 2 >= verts.length) {
			continue;
		}

		if (i % (grid + 1) === grid) {
			continue;
		}

		draw.push([i + grid + 2, i + grid + 1, i]);
		draw.push([i, i + 1, i + grid + 2]);
	}

	renderer.objects.push(
		new ThreeDObject(
			renderer,
			verts,
			draw,
			Vector3.Zero(),
			Vector3.Zero(),
			90,
			100,
			50
		)
	);

	// renderer.objects.push(
	// 	new ThreeDObject(
	// 		renderer,
	// 		[
	// 			new Vector3(0, 0, 0),
	// 			new Vector3(scale * grid, 0, 0),
	// 			new Vector3(scale * grid, 0, scale * grid),
	// 			new Vector3(0, 0, scale * grid),
	// 		],
	// 		[
	// 			[0, 2, 1],
	// 			[0, 3, 2],
	// 		],
	// 		new Vector3(0, 0, 0),
	// 		new Vector3(0, 0, 0),
	// 		180,
	// 		100,
	// 		100
	// 	)
	// );
}

export function VoxelTerrainScene(renderer) {
	renderer.objects = [];

	const scale = 5;
	const grid = 32;
	const noiseScale = 0.05;

	// For now lets just render grass

	for (let y = 10; y > 0; y--) {
		for (let x = 0; x < grid; x++) {
			for (let z = 0; z < grid; z++) {
				let tex = textures.GRASS;

				let noiseVal = perlin3D(
					x * noiseScale,
					y * noiseScale,
					z * noiseScale
				);

				if (y < 5 && noiseVal > 0.55) {
					if (
						y !== 4 &&
						y !== 0 &&
						x !== 0 &&
						z !== 0 &&
						x !== grid - 1 &&
						z !== grid - 1
					)
						continue;

					renderer.objects.push(
						Cube(
							renderer,
							new Vector3(
								x * scale,
								y * scale - (y === 4 ? 0.5 : 0),
								z * scale
							),
							scale - (y === 4 ? 1 : 0),
							scale,
							textures.WATER
						)
					);

					continue;
				}

				if (noiseVal > 0.5 && y < 6) {
					tex = textures.SAND;

					if (noiseVal > 0.55) {
						continue;
					}
				}

				if (noiseVal > 0.5 && y >= 6) {
					continue;
				}

				if (y === 10 && Math.random() < 0.025 && noiseVal < 0.4) {
					const yTop = Math.round(Math.random() * 6) + 12;

					for (let yy = 10; yy < yTop; yy++) {
						renderer.objects.push(
							Cube(
								renderer,
								new Vector3(
									x * scale,
									yy * scale + scale,
									z * scale
								),
								scale,
								scale,
								textures.LOG
							)
						);
					}

					for (let yy = yTop; yy < yTop + 2; yy++) {
						for (let xx = x - 1; xx <= x + 1; xx++) {
							for (let zz = z - 1; zz <= z + 1; zz++) {
								renderer.objects.push(
									Cube(
										renderer,
										new Vector3(
											xx * scale,
											yy * scale + scale,
											zz * scale
										),
										scale,
										scale,
										textures.LEAVES
									)
								);
							}
						}
					}
				}

				if (y !== 10 && y >= 6) {
					let noiseValAbove = perlin3D(
						x * noiseScale,
						(y + 1) * noiseScale,
						z * noiseScale
					);

					if (noiseValAbove < 0.5) {
						tex = textures.GRASS;
					}

					if (y < 8 && noiseValAbove < 0.5) {
						tex = textures.STONE;
					}
				}

				renderer.objects.push(
					Cube(
						renderer,
						new Vector3(x * scale, y * scale, z * scale),
						scale,
						scale,
						tex
					)
				);
			}
		}
	}
}
