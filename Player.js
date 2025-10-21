import { enqueueChunk } from "./Scene.js";

export class Player {
	HEIGHT = 2;

	position = {
		x: 0,
		y: 0,
		z: 0,
	};

	view = {
		yaw: 0,
		pitch: 0,
	};

	focalLength = 300;
	near = 0.1;
	far = 10000;

	yVel = 0;

	renderDistance = 4;

	keyMap = new Set();

	jump = 0;

	/** @type {import("./Renderer.js").Renderer} */
	renderer;

	constructor(x, y, z) {
		this.position.x = x;
		this.position.y = y;
		this.position.z = z;
	}

	SetRenderer(r) {
		this.renderer = r;
	}

	Update() {
		const speed = 0.1;

		const dx = speed * Math.sin((this.view.yaw * Math.PI) / 180);
		const dz = speed * Math.cos((this.view.yaw * Math.PI) / 180);

		if (this.keyMap.has("w")) {
			this.position.x -= dx;
			this.position.z -= dz;
		}

		if (this.keyMap.has("s")) {
			this.position.x += dx;
			this.position.z += dz;
		}

		if (this.keyMap.has("a")) {
			this.position.x -= dz;
			this.position.z += dx;
		}

		if (this.keyMap.has("d")) {
			this.position.x += dz;
			this.position.z -= dx;
		}

		if (this.keyMap.has("ArrowRight")) {
			this.view.yaw -= 0.5;

			if (this.view.yaw < 0) this.view.yaw = 360;
		}

		if (this.keyMap.has("ArrowLeft")) {
			this.view.yaw += 0.5;

			if (this.view.yaw > 360) this.view.yaw = 0;
		}

		const camX = Math.floor(this.position.x / 16);
		const camZ = Math.floor(this.position.z / 16);

		for (
			let x = camX - this.renderDistance;
			x < camX + this.renderDistance;
			x++
		) {
			for (
				let z = camZ - this.renderDistance;
				z < camZ + this.renderDistance;
				z++
			) {
				const chunk = this.renderer.GetChunkAtPos(x, z);

				if (chunk === undefined) {
					enqueueChunk(x, z, this.renderer);
				}
			}
		}

		if (this.jump <= 0) {
			if (!this.IsGrounded()) {
				this.yVel -= 0.001 * this.renderer.deltaTime;
			} else if (this.keyMap.has(" ")) {
				this.jump = 0.1;
				this.position.y = Math.ceil(this.position.y) - this.HEIGHT / 4;
			} else {
				this.yVel = 0;
				this.position.y = Math.ceil(this.position.y) - this.HEIGHT / 4;
			}
		} else {
			const j = Math.max(this.jump / 2, 0.005);

			this.jump -= j;
			this.yVel += j;
		}

		this.yVel = Math.min(2, Math.max(-10, this.yVel));

		this.position.y += this.yVel;
	}

	IsGrounded() {
		// Camera chunk coordinates
		const camChunkX = Math.floor(this.position.x / 16);
		const camChunkZ = Math.floor(this.position.z / 16);
		const camBlockX = Math.floor(Math.abs(this.position.x)) % 16;
		const camBlockZ = Math.floor(Math.abs(this.position.z)) % 16;
		const camY = this.position.y - this.HEIGHT;

		const chunk = this.renderer.GetChunkAtPos(camChunkX, camChunkZ);

		if (!chunk) return true;

		for (let block of chunk.blocks) {
			const vertZ = block & 0xf;
			const vertY = (block >>> 4) & 0xff;
			const vertX = (block >>> 12) & 0xf;

			const x0 = vertX - 0.5;
			const x1 = vertX + 0.5;
			const y0 = vertY - 0.5;
			const y1 = vertY + 0.5;
			const z0 = vertZ - 0.5;
			const z1 = vertZ + 0.5;

			if (
				camBlockX >= x0 &&
				camBlockX <= x1 &&
				camY >= y0 &&
				camY <= y1 &&
				camBlockZ >= z0 &&
				camBlockZ <= z1
			) {
				// console.log(this.cam.x, x0, x1);
				// console.log(camY, y0, y1);
				// console.log(this.cam.z, x0, x1);
				// console.log(camY, y1);
				return true;
			}
		}

		return false;
	}
}
