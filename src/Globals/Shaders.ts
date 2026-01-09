const shaderMap: Record<string, string> = {};

export async function GetShader(path: string) {
	if (shaderMap[path]) {
		return shaderMap[path];
	}

	const shader = (await import(`../shaders/${path}?raw`)).default;

	shaderMap[path] = shader;

	return shader;
}

export const SHADERS = {
	CHUNK_FRAG: "chunk.frag",
	CHUNK_VERT: "chunk.vert",
	CLOUDS_FRAG: "clouds.frag",
	CLOUDS_VERT: "clouds.vert",
	DEBUG_FRAG: "debug.frag",
	DEBUG_VERT: "debug.vert",
	FRAMEBUFFER_FRAG: "frameBuffer.frag",
	FRAMEBUFFER_VERT: "frameBuffer.vert",
	PARTICLE_FRAG: "particle.frag",
	PARTICLE_VERT: "particle.vert",
	TEXT_FRAG: "text.frag",
	TEXT_VERT: "text.vert",
	FLUIDS_FRAG: "fluids.frag",
	FLUIDS_VERT: "fluids.vert",
	HOTBAR_ICON_UI_FRAG: "hotbarIconUI.frag",
	HOTBAR_ICON_UI_VERT: "hotbarIconUI.vert",
};
