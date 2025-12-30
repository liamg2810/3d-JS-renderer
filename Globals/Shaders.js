import { ROOT } from "./Window.js";

const shaderMap = {};

export async function GetShader(path) {
	if (shaderMap[path]) {
		return shaderMap[path];
	}

	shaderMap[path] = await (await fetch(path)).text();

	return shaderMap[path];
}

export const SHADERS = {
	CHUNK_FRAG: ROOT + "shaders/chunk.frag",
	CHUNK_VERT: ROOT + "shaders/chunk.vert",
	CLOUDS_FRAG: ROOT + "shaders/clouds.frag",
	CLOUDS_VERT: ROOT + "shaders/clouds.vert",
	DEBUG_FRAG: ROOT + "shaders/debug.frag",
	DEBUG_VERT: ROOT + "shaders/debug.vert",
	FRAMEBUFFER_FRAG: ROOT + "shaders/frameBuffer.frag",
	FRAMEBUFFER_VERT: ROOT + "shaders/frameBuffer.vert",
	PARTICLE_FRAG: ROOT + "shaders/particle.frag",
	PARTICLE_VERT: ROOT + "shaders/particle.vert",
	TEXT_FRAG: ROOT + "shaders/text.frag",
	TEXT_VERT: ROOT + "shaders/text.vert",
};
