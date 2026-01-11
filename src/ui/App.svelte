<script>
	import { canvas } from "../Globals/Window";
	import Player from "../Player/Player";
	import ChunkManager from "../World/ChunkManager";
	import Button from "./components/Button.svelte";
	import { debug, settings } from "./exports.svelte";
	// const fps = 1;

	let bx = $derived(((Math.floor(debug.position.x) % 16) + 16) % 16);
	let by = $derived(Math.floor(debug.position.y));
	let bz = $derived(((Math.floor(debug.position.z) % 16) + 16) % 16);

	$effect(() => {
		Player.fov = settings.fov;

		console.log(Player.fov);
	});

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
		{#if !debug.settingsOpen}
			<span class="text-6xl font-bold mb-10!">Paused</span>

			<Button onclick={Play} text="Play"></Button>
			<Button
				text="Settings"
				onclick={() => {
					debug.settingsOpen = true;
				}}
			></Button>
			<Button text="Save" onclick={Save}></Button>

			<span class="text-sm bottom-1 absolute"
				>(Not affiliated with Microsoft)</span
			>
		{:else}
			<span class="text-6xl font-bold mb-10!">Settings</span>
			<div class="flex gap-4">
				<div class="flex flex-col bg-stone-500/80 px-4 rounded-lg">
					<span class="text-white font-bold">FOV</span>
					<div class="flex gap-2">
						<input
							type="range"
							name=""
							min="40"
							max="120"
							bind:value={settings.fov}
							id=""
						/>
						<span class="text-white px-4">{settings.fov}</span>
					</div>
				</div>
				<div class="flex flex-col bg-stone-500/80 px-4 rounded-lg">
					<span class="text-white font-bold">Render distance</span>
					<div class="flex gap-2">
						<input
							type="range"
							name=""
							min="2"
							max="32"
							bind:value={settings.renderDistance}
							id=""
						/>
						<span class="text-white px-4"
							>{settings.renderDistance}</span
						>
					</div>
				</div>
			</div>
			<Button
				text="Back"
				onclick={() => {
					debug.settingsOpen = false;
				}}
			></Button>
		{/if}
	</div>
{/if}
