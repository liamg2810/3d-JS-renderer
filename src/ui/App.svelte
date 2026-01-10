<script>
	import { debug } from "./exports.svelte";
	// const fps = 1;
</script>

<div class="ui-panel">
	<h2>Debug Info</h2>
	<span>FPS: {debug.fps}</span>
</div>

<style>
	.ui-panel {
		position: absolute;
		top: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 1rem;
		border-radius: 0.5rem;
	}
</style>
