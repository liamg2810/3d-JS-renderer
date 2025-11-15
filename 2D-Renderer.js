import {
	BIOMES,
	BLOCKS,
	HUMIDITY_NOISE_SCALE,
	TEMPERATURE_NOISE_SCALE,
} from "./constants.js";
import { Chunk } from "./Game.js";
import noise from "./perlin.js";
import { Player } from "./Player.js";
import { isQueueing } from "./Scene.js";
import { Vector3 } from "./Vectors.js";

const fpsCounter = document.getElementById("fps-count");
/** @type {HTMLInputElement} */
const heightmapToggle = document.getElementById("heightmap");
/** @type {HTMLInputElement} */
const temperatureToggle = document.getElementById("temp");
/** @type {HTMLInputElement} */
const humidityToggle = document.getElementById("humidity");

const surfaceBlocks = [BLOCKS.GRASS, BLOCKS.SAND, BLOCKS.STONE];

export class TwoDRenderer {
	/** @type {Chunk[]} */
	chunks = [];

	light = new Vector3(50, 100, 50);

	deltaTime = 0;

	/** @type {number[]} */
	frameTimes = [];

	seed = Math.random() * 25564235;

	canvas;
	/** @type {CanvasRenderingContext2D} */
	ctx;

	sceneInit = false;

	isTwoD = true;

	/**  @type {import("./Player.js").Player}*/
	player;

	/**
	 *
	 * @param {import("./Player.js").Player} player
	 */
	constructor(player) {
		if (!(player instanceof Player)) {
			throw new Error("Cannot initialize renderer without a player");
		}

		this.player = player;
		player.SetRenderer(this);

		/** @type {HTMLCanvasElement} */
		this.canvas = document.getElementById("canvas");

		if (this.canvas === null) {
			alert("Canvas not found.");
			return;
		}

		this.ctx = this.canvas.getContext("2d");

		console.log("Starting engine");

		let start = Date.now();

		this.InitScene();

		let end = Date.now();

		console.log(
			`Took ${Math.round((end - start) / 10) / 100}s to initialize scene`
		);

		noise.seed(this.seed);
	}

	Start() {
		requestAnimationFrame(() => {
			this.Update();
		});
	}

	GetChunkAtPos(x, z) {
		return this.chunks.find((c) => c.x === x && c.z === z);
	}

	InitScene() {
		this.player.LoadChunks();
	}

	Update() {
		if (!this.sceneInit && isQueueing()) {
			requestAnimationFrame(() => {
				this.Update();
			});

			return;
		}

		this.sceneInit = true;

		const frameStart = performance.now();

		this.player.Update();

		this.Draw();

		const frameEnd = performance.now();

		this.deltaTime = frameEnd - frameStart;

		this.frameTimes.push(this.deltaTime);

		if (this.frameTimes.length > 60) {
			this.frameTimes.shift();
		}

		let totalFrameTimes = 0;

		for (let f of this.frameTimes) {
			totalFrameTimes += f;
		}

		const fps = Math.round(
			1000 / (totalFrameTimes / this.frameTimes.length)
		);

		fpsCounter.innerText = `FPS: ${fps}`;

		requestAnimationFrame(() => {
			this.Update();
		});
	}

	Draw() {
		this.ctx.fillStyle = "rgb(0, 0, 0)";

		this.ctx.clearRect(
			0,
			0,
			this.canvas.clientWidth,
			this.canvas.clientHeight
		);

		const size = 5;

		for (const chunk of this.chunks) {
			let block = BLOCKS.AIR;

			for (let x = 0; x < 16; x++) {
				for (let z = 0; z < 16; z++) {
					let blockY = 0;

					for (let y = 256; y > 0; y--) {
						block = chunk.BlockAt(x, y, z, {});
						const b = block & 0xff;

						if (surfaceBlocks.includes(b)) {
							blockY = y;
							break;
						}
					}

					const biomeCode = block >>> 8;
					const b = block & 0xff;

					if (!surfaceBlocks.includes(b)) {
						continue;
					}

					let biome;

					for (const [key, value] of Object.entries(BIOMES)) {
						if (value.code === biomeCode) {
							biome = value;
							break;
						}
					}

					if (biome === undefined) {
						console.warn(`undefined biome ${biomeCode}`);
						continue;
					}

					let globalX = chunk.x * 16 + x;
					let globalZ = chunk.z * 16 + z;

					if (heightmapToggle.checked) {
						this.ctx.fillStyle = `rgb(${blockY * 2},${blockY * 2},${
							blockY * 2
						})`;
					} else if (temperatureToggle.checked) {
						let temp = noise.perlin2(
							globalX * TEMPERATURE_NOISE_SCALE,
							globalZ * TEMPERATURE_NOISE_SCALE
						);

						temp = (temp + 1) / 2;
						this.ctx.fillStyle = `rgb(${temp * 255},${temp * 255},${
							temp * 255
						})`;
					} else if (humidityToggle.checked) {
						let humidity = noise.perlin2(
							globalX * HUMIDITY_NOISE_SCALE,
							globalZ * HUMIDITY_NOISE_SCALE
						);

						humidity = (humidity + 1) / 2;
						this.ctx.fillStyle = `rgb(${humidity * 255},${
							humidity * 255
						},${humidity * 255})`;
					} else {
						this.ctx.fillStyle = biome.color;
					}

					let xScreen =
						(globalX - this.player.position.x) * size +
						this.canvas.clientWidth / 2;
					let zScreen =
						(globalZ - this.player.position.z) * size +
						this.canvas.clientHeight / 2;

					this.ctx.fillRect(xScreen, zScreen, size, size);
				}
			}
		}
	}
}
