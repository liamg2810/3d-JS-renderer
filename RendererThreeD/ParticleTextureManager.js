import { ROOT } from "../Globals/Window.js";
import { TextureManager } from "./TextureManager.js";

class ParticleTextureManager {
	texture;

	constructor() {
		this.texture = new TextureManager(ROOT + "particles.png");
	}
}

export default new ParticleTextureManager();
