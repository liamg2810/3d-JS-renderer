import { enqueueChunk, isQueueing, removeLoadedChunk } from "./Scene.js";

const worldPosDebug = document.getElementById("world-pos");
const blockPosDebug = document.getElementById("block-pos");
const chunkPosDebug = document.getElementById("chunk-pos");

export class Player {
	HEIGHT = 1.8;

	position = {
		x: 0,
		y: 0,
		z: 0,
	};

	view = {
		yaw: 45,
		pitch: -45,
	};

	focalLength = 300;
	near = 0.1;
	far = 10000;
	fov = 60;

	yVel = 0;

	renderDistance = 1;

	keyMap = new Set();

	jumpPower = 0.5;
	gravity = 0.5;

	flight = true;

	/** @type {import("./Renderer.js").Renderer} */
	renderer;

	freezeChunks = false;

	constructor(x, y, z) {
		this.position.x = x;
		this.position.y = y;
		this.position.z = z;
	}

	SetRenderer(r) {
		this.renderer = r;

		this.LoadChunks();
	}

	Update() {
		let speed = 0.2;

		if (this.keyMap.has("shift")) {
			speed *= 2;

			this.fov += 3;
		} else {
			this.fov -= 3;
		}

		this.fov = Math.max(Math.min(this.fov, 75), 60);

		const dx = speed * Math.sin((this.view.yaw * Math.PI) / 180);
		const dz = speed * Math.cos((this.view.yaw * Math.PI) / 180);

		let newX = this.position.x;
		let newZ = this.position.z;

		if (this.keyMap.has("w")) {
			newX -= dx;
			newZ -= dz;
		}

		if (this.keyMap.has("s")) {
			newX += dx;
			newZ += dz;
		}

		if (this.keyMap.has("a")) {
			newX -= dz;
			newZ += dx;
		}

		if (this.keyMap.has("d")) {
			newX += dz;
			newZ -= dx;
		}

		const oldX = this.position.x;

		this.position.x = newX;

		if (this.IsColliding() && !this.flight) {
			this.position.x = oldX;
		}

		const oldZ = this.position.z;

		this.position.z = newZ;

		if (this.IsColliding() && !this.flight) {
			this.position.z = oldZ;
		}

		if (this.keyMap.has("ArrowRight")) {
			this.view.yaw -= 0.5;

			if (this.view.yaw < 0) this.view.yaw = 360;
		}

		if (this.keyMap.has("ArrowLeft")) {
			this.view.yaw += 0.5;

			if (this.view.yaw > 360) this.view.yaw = 0;
		}

		if (this.flight) {
			if (this.keyMap.has("e")) {
				this.position.y += 1;
			}

			if (this.keyMap.has("q")) {
				this.position.y -= 1;
			}
		}

		let camX = Math.floor(this.position.x / 16);
		let camZ = Math.floor(this.position.z / 16);

		if (this.freezeChunks) {
			camX = 0;
			camZ = 0;
		}

		if (!this.freezeChunks) {
			this.LoadChunks();
		}

		const visibleChunks = this.renderer.chunks.filter((c) => {
			const unload =
				c.x >= camX - this.renderDistance &&
				c.x <= camX + this.renderDistance &&
				c.z >= camZ - this.renderDistance &&
				c.z <= camZ + this.renderDistance;

			return unload;
		});

		for (const c of visibleChunks) {
			if (!c.builtVerts) {
				c.BuildVerts();
			}
		}

		let lastY = this.position.y;

		if (!this.flight) {
			this.DoGravity();

			if (this.IsColliding()) {
				this.position.y = lastY;
				this.yVel = 0;
			}
		}

		this.yVel = Math.min(2, Math.max(-10, this.yVel));

		this.SetDebugs();
	}

	SetDebugs() {
		worldPosDebug.innerText = `Position: ${
			Math.round(this.position.x * 10) / 10
		} ${Math.round(this.position.y * 10) / 10} ${
			Math.round(this.position.z * 10) / 10
		}`;

		const bx = Math.floor(Math.abs(this.position.x)) % 16;
		const bz = Math.floor(Math.abs(this.position.z)) % 16;

		blockPosDebug.innerText = `Block: ${
			this.position.x > 0 ? bx : 15 - bx
		} ${Math.round(this.position.y)} ${this.position.z > 0 ? bz : 15 - bz}`;
		chunkPosDebug.innerText = `Chunk: ${Math.floor(
			this.position.x / 16
		)} ${Math.floor(this.position.z / 16)}`;
	}

	LoadChunks() {
		const camX = Math.floor(this.position.x / 16);
		const camZ = Math.floor(this.position.z / 16);

		this.renderer.chunks = this.renderer.chunks.filter((c) => {
			const unload =
				c.x >= camX - this.renderDistance - 2 &&
				c.x <= camX + this.renderDistance + 2 &&
				c.z >= camZ - this.renderDistance - 2 &&
				c.z <= camZ + this.renderDistance + 2;

			if (unload) {
				removeLoadedChunk(c.x, c.z);
			}

			return unload;
		});

		for (
			let x = camX - this.renderDistance - 2;
			x <= camX + this.renderDistance + 2;
			x++
		) {
			for (
				let z = camZ - this.renderDistance - 2;
				z <= camZ + this.renderDistance + 2;
				z++
			) {
				const chunk = this.renderer.GetChunkAtPos(x, z);

				if (chunk === undefined) {
					enqueueChunk(x, z, this.renderer);
				}
			}
		}
	}

	DoGravity() {
		const g =
			this.gravity *
			Math.min(Math.max(this.renderer.deltaTime, 0.05), 0.2);

		if (this.IsGrounded()) {
			if (this.keyMap.has(" ") && this.yVel <= 0) {
				console.log("jump");
				this.yVel = this.jumpPower;
			} else if (
				this.yVel <= 0 &&
				this.position.y - Math.floor(this.position.y) < 0.1
			) {
				this.yVel = 0;
				this.position.y = Math.floor(this.position.y);
			}
		} else {
			this.yVel -= g;
		}

		this.position.y += this.yVel;
	}

	IsGrounded() {
		// Camera chunk coordinates
		const camChunkX = Math.floor(this.position.x / 16);
		const camChunkZ = Math.floor(this.position.z / 16);
		let camBlockX = Math.floor(Math.abs(this.position.x)) % 16;
		let camBlockZ = Math.floor(Math.abs(this.position.z)) % 16;

		if (this.position.x < 0) {
			camBlockX = 15 - camBlockX;
		}

		if (this.position.z < 0) {
			camBlockZ = 15 - camBlockZ;
		}

		const camY = this.position.y - this.HEIGHT;

		const chunk = this.renderer.GetChunkAtPos(camChunkX, camChunkZ);

		if (!chunk) return false;

		const blockBelow =
			chunk.blocks[camBlockX + camBlockZ * 16 + Math.floor(camY) * 256];

		return blockBelow !== 0;
	}

	IsColliding() {
		const XZDist = 0.3;
		const corners = [
			[XZDist, this.HEIGHT / 4, XZDist],
			[XZDist, this.HEIGHT / 4, -XZDist],
			[-XZDist, this.HEIGHT / 4, -XZDist],
			[-XZDist, this.HEIGHT / 4, XZDist],
			[XZDist, (-3 / 4) * this.HEIGHT, XZDist],
			[XZDist, (-3 / 4) * this.HEIGHT, -XZDist],
			[-XZDist, (-3 / 4) * this.HEIGHT, -XZDist],
			[-XZDist, (-3 / 4) * this.HEIGHT, XZDist],
		];

		return corners.some((c) =>
			this.CornerCollision(
				this.position.x + c[0],
				this.position.y + c[1],
				this.position.z + c[2]
			)
		);
	}

	CornerCollision(x, y, z) {
		const cx = Math.floor(Math.round(x) / 16);
		const cz = Math.floor(Math.round(z) / 16);

		const chunk = this.renderer.GetChunkAtPos(cx, cz);

		if (!chunk) return false;

		let bx = Math.round(Math.abs(x)) % 16;
		const fy = Math.round(y);
		let bz = Math.round(Math.abs(z)) % 16;

		if (cx < 0) {
			bx = 16 - bx;
		}

		if (cz < 0) {
			bz = 16 - bz;
		}

		const block = chunk.blocks[bx + bz * 16 + fy * 256];

		return block !== 0;
	}
}
