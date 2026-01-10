<script>
	import { canvas } from "../Globals/Window";
	import Player from "../Player/Player";
	import ChunkManager from "../World/ChunkManager";
	import Button from "./components/Button.svelte";
	import { debug } from "./exports.svelte";
	// const fps = 1;

	let bx = $derived(((Math.floor(debug.position.x) % 16) + 16) % 16);
	let by = $derived(Math.floor(debug.position.y));
	let bz = $derived(((Math.floor(debug.position.z) % 16) + 16) % 16);

	function Play() {
		debug.paused = false;

		canvas.requestPointerLock();
	}

	function Save() {
		ChunkManager.saveAll();
	}
</script>

<div
	class="absolute top-2 left-2 p-2 text-white flex flex-col *:bg-stone-800/80 *:p-2 *:w-fit gap-2"
>
	<span>FPS: {debug.fps}</span>
	<span
		>Position: {debug.position.x}
		{debug.position.y}
		{debug.position.z}</span
	>
	<span>Block: {bx} {by} {bz}</span>
	<span>Chunk: {debug.position.cx} {debug.position.cz}</span>
</div>

{#if debug.paused}
	<div
		class="absolute flex-col gap-6 bg-stone-500/30 w-screen h-screen top-0 left-0 flex items-center justify-center"
	>
		<span class="text-6xl font-bold mb-10!">Minceraft</span>

		<Button onclick={Play} text="Play"></Button>
		<Button text="Save" onclick={Save}></Button>

		<span class="text-sm bottom-1 absolute"
			>(Not affiliated with Microsoft)</span
		>
	</div>
{/if}
