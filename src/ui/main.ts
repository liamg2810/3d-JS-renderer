import { mount, unmount } from "svelte";
import App from "./App.svelte";

export function mountUI(container: HTMLElement, props: any = {}) {
	const app = mount(App, { target: container });
	// unmount(app);
}
