export let debug = $state({
	fps: 0,
	paused: false,
	settingsOpen: false,
	position: {
		x: 0,
		y: 0,
		z: 0,
		cx: 0,
		cz: 0,
	},
});

export let settings = $state({
	renderDistance: 4,
	fov: 60,
});

export function SetFPS(f: number) {
	debug.fps = f;
}

export function SetPosition(
	x: number,
	y: number,
	z: number,
	cx: number,
	cz: number
) {
	debug.position.x = Math.round(x * 10) / 10;
	debug.position.y = Math.round(y * 10) / 10;
	debug.position.z = Math.round(z * 10) / 10;
	debug.position.cx = cx;
	debug.position.cz = cz;
}
