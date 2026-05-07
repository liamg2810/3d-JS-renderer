import { GetShader, SHADERS } from "../../../Globals/Shaders";
import { TEXTURE_ROOT } from "../../../Globals/Window";
import { INFO_TYPES, ShaderProgram } from "../../ShaderProgram.js";
import { TextureManager } from "../../TextureManager.js";

class HotbarIconShaderProgram {
	/** @type {ShaderProgram} */
	shaderProgram;

	/** @type {TextureManager} */
	atlasTextureManager;

	async InitShaders() {
		console.log("a");

		const vs = await GetShader(SHADERS.CHUNK_VERT);
		const fs = await GetShader(SHADERS.CHUNK_FRAG);
		console.log("b");

		this.shaderProgram = new ShaderProgram(vs, fs, [
			// Attributes
			{ name: "aVertex", type: INFO_TYPES.ATTRIBUTE },
			{ name: "aVertexInstance", type: INFO_TYPES.ATTRIBUTE },
			// Uniforms
			{ name: "uProjectionMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uModelViewMatrix", type: INFO_TYPES.UNIFORM },
			{ name: "uSampler", type: INFO_TYPES.UNIFORM },
			{ name: "uChunkPos", type: INFO_TYPES.UNIFORM },
			{ name: "uTime", type: INFO_TYPES.UNIFORM },
		]);

		this.atlasTextureManager = new TextureManager(
			TEXTURE_ROOT + "blocks/textures.png",
			false,
			false,
		);

		console.log("c");

		await this.atlasTextureManager.LoadTex();

		console.log("d");
	}
}

export default new HotbarIconShaderProgram();
