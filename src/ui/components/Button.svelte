<script lang="ts">
	let { text, onclick }: { text: string; onclick: () => {} } = $props();
</script>

<button
	{onclick}
	class="bg-[url(/static/textures/ui/button_background.png)] rounded-lg overflow-hidden text-2xl text-center w-75 border-2 border-stone-800 after:w-full after:h-full after:bg-stone-500 after:absolute after:hidden hover:after:inline hover:cursor-pointer relative after:left-0 after:opacity-50"
>
	{text}
</button>
