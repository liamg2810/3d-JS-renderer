import { perlin3D } from "./Perlin3D.js";
import { Cube, SquareBasedPyramid, ThreeDObject } from "./Primitives.js";
import { Vector3 } from "./Vectors.js";

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
		Cube(renderer, new Vector3(0, 25, 50), scale, scale, 90, 50, 50)
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
	const grid = 100;
	const noiseScale = 0.05;

	for (let y = 10; y > 0; y--) {
		for (let x = 0; x < grid; x++) {
			for (let z = 0; z < grid; z++) {
				if (y < 3) {
					renderer.objects.push(
						Cube(
							renderer,
							new Vector3(x * scale, y * scale, z * scale),
							scale,
							scale,
							50,
							50,
							50
						)
					);

					continue;
				}

				let r = 0;
				let g = 150;
				let b = 0;

				let noiseVal = perlin3D(
					x * noiseScale,
					y * noiseScale,
					z * noiseScale
				);

				if (noiseVal < 0.4 && y >= 6) {
					continue;
				}

				if (noiseVal < 0.6 && y < 7) {
					r = 125;
					g = 125;
					b = 25;
				}

				if (noiseVal < 0.5 && y < 6) {
					r = 0;
					g = 0;
					b = 255;
				}

				renderer.objects.push(
					Cube(
						renderer,
						new Vector3(x * scale, y * scale, z * scale),
						b === 255 ? 2 : scale,
						scale,
						r,
						g,
						b
					)
				);

				if (b === 255) {
					continue;
				}
			}
		}
	}
}
