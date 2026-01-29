import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [svelte(), tailwindcss()],
	base: process.env.NODE_ENV === "production" ? "/3d-JS-renderer/" : "/",

	resolve: {
		extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
	},
});
