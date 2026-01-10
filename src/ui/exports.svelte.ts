export let debug = $state({
	fps: 0,
});

export function SetFPS(f: number) {
	debug.fps = f;
}
