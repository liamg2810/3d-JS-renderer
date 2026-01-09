import { gl } from "../Globals/Window.js";

/**
 * @param {WebGL2RenderingContext} gl
 * @param {boolean} mipmaps
 */
async function loadTexture(url, mipmaps) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Because images have to be downloaded over the internet
	// they might take a moment until they are ready.
	// Until then put a single pixel in the texture so we can
	// use it immediately. When the image has finished downloading
	// we'll update the texture with the contents of the image.
	const level = 0;
	const internalFormat = gl.RGBA8;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;
	const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
	gl.texImage2D(
		gl.TEXTURE_2D,
		level,
		internalFormat,
		width,
		height,
		border,
		srcFormat,
		srcType,
		pixel
	);

	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(
				gl.TEXTURE_2D,
				level,
				internalFormat,
				srcFormat,
				srcType,
				image
			);

			if (mipmaps) {
				gl.generateMipmap(gl.TEXTURE_2D);

				gl.texParameteri(
					gl.TEXTURE_2D,
					gl.TEXTURE_MIN_FILTER,
					gl.LINEAR_MIPMAP_NEAREST
				);
				gl.texParameteri(
					gl.TEXTURE_2D,
					gl.TEXTURE_MAG_FILTER,
					gl.NEAREST
				);
			} else {
				gl.texParameteri(
					gl.TEXTURE_2D,
					gl.TEXTURE_MIN_FILTER,
					gl.NEAREST
				);
				gl.texParameteri(
					gl.TEXTURE_2D,
					gl.TEXTURE_MAG_FILTER,
					gl.NEAREST
				);
			}
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

			resolve(texture);
		};
		image.src = url;
	});
}

export class TextureManager {
	/** @type {WebGLTexture} */
	texture;

	TextureLoaded = false;

	src;
	mipmaps = false;

	constructor(src, mipmaps = false, autoInit = true) {
		this.src = src;
		this.mipmaps = mipmaps;

		// Allow external sources to manually await for the texture
		if (autoInit) {
			this.LoadTex();
		}
	}

	async LoadTex() {
		this.texture = await loadTexture(this.src, this.mipmaps);

		this.TextureLoaded = true;
	}
}
