import {
	enqueueChunk,
	enqueueMesh,
	isQueueing,
	removeLoadedChunk,
} from "./Scene.js";
import { BLOCKS } from "./constants.js";

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
		yaw: 0,
		pitch: 0,
	};

	focalLength = 300;
	near = 0.1;
	far = 10000;
	fov = 60;

	chunkX = 0;
	chunkZ = 0;

	yVel = 0;

	renderDistance = 4;

	keyMap = new Set();

	jumpPower = 0.1;
	gravity = 0.05;

	flight = true;

	/** @type {import("./Renderer.js").Renderer | import('./2D-Renderer.js').TwoDRenderer} */
	renderer;

	freezeChunks = false;

	constructor(x, y, z) {
		this.position.x = x;
		this.position.y = y;
		this.position.z = z;

		this.chunkX = (x + 1) >> 4;
		this.chunkZ = (z + 1) >> 4;
	}

	SetRenderer(r) {
		this.renderer = r;

		this.LoadChunks();
	}

	Update() {
		let speed = 0.2;

		if (!this.flight) {
			speed = 0.025;
		}

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

		this.chunkX = (this.position.x + 1) >> 4;
		this.chunkZ = (this.position.z + 1) >> 4;

		if (this.IsColliding() && !this.flight) {
			this.position.z = oldZ;
		}

		if (this.flight) {
			if (this.keyMap.has("e")) {
				this.position.y += 1;
			}

			if (this.keyMap.has("q")) {
				this.position.y -= 1;
			}
		}

		if (this.keyMap.has("f")) {
			const ray = this.Raycast();

			if (ray !== undefined) {
				const by = Math.floor(ray.y);
				const bx = ((Math.floor(ray.x) % 16) + 16) % 16;
				const bz = ((Math.floor(ray.z) % 16) + 16) % 16;

				const cx = Math.floor(ray.x / 16);
				const cz = Math.floor(ray.z / 16);

				console.log(by, bx, bz);

				const chunk = this.renderer.GetChunkAtPos(cx, cz);

				console.log(chunk);

				const b = chunk.blocks[bx + bz * 16 + by * 256];

				console.log(b);

				if (b !== BLOCKS.BEDROCK) {
					chunk.blocks[bx + bz * 16 + by * 256] = BLOCKS.AIR;

					enqueueMesh(chunk);
				}
			}
		}

		if (this.freezeChunks) {
			this.chunkX = 0;
			this.chunkZ = 0;
		}

		if (!this.freezeChunks) {
			this.LoadChunks();
		}

		const visibleChunks = this.renderer.chunks.filter((c) => {
			const unload =
				c.x >= this.chunkX - this.renderDistance &&
				c.x <= this.chunkX + this.renderDistance &&
				c.z >= this.chunkZ - this.renderDistance &&
				c.z <= this.chunkZ + this.renderDistance;

			return unload;
		});

		if (!this.renderer.isTwoD) {
			for (const c of visibleChunks) {
				if (!c.builtVerts) {
					enqueueMesh(c);
				}
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

		const bx = ((Math.floor(this.position.x) % 16) + 16) % 16;
		const bz = ((Math.floor(this.position.z) % 16) + 16) % 16;

		blockPosDebug.innerText = `Block: ${bx} ${Math.round(
			this.position.y
		)} ${bz}`;
		chunkPosDebug.innerText = `Chunk: ${this.chunkX} ${this.chunkZ}`;
	}

	LoadChunks() {
		this.renderer.chunks = this.renderer.chunks.filter((c) => {
			const unloadMesh =
				c.x >= this.chunkX - this.renderDistance &&
				c.x <= this.chunkX + this.renderDistance &&
				c.z >= this.chunkZ - this.renderDistance &&
				c.z <= this.chunkZ + this.renderDistance;

			if (!unloadMesh) {
				c.builtVerts = false;
			}

			const unload =
				c.x >= this.chunkX - this.renderDistance - 2 &&
				c.x <= this.chunkX + this.renderDistance + 2 &&
				c.z >= this.chunkZ - this.renderDistance - 2 &&
				c.z <= this.chunkZ + this.renderDistance + 2;

			if (unload) {
				removeLoadedChunk(c.x, c.z);
			}

			return unload;
		});

		for (
			let x = this.chunkX - this.renderDistance - 2;
			x <= this.chunkX + this.renderDistance + 2;
			x++
		) {
			for (
				let z = this.chunkZ - this.renderDistance - 2;
				z <= this.chunkZ + this.renderDistance + 2;
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
		let camBlockX = Math.round(Math.abs(this.position.x)) % 16;
		let camBlockZ = Math.round(Math.abs(this.position.z)) % 16;

		if (this.position.x < 0) {
			camBlockX = 15 - camBlockX;
		}

		if (this.position.z < 0) {
			camBlockZ = 15 - camBlockZ;
		}

		const camY = this.position.y - this.HEIGHT;

		const chunk = this.renderer.GetChunkAtPos(this.chunkX, this.chunkZ);

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
		const chunk = this.renderer.GetChunkAtPos(this.chunkX, this.chunkZ);

		if (!chunk) return false;

		let bx = Math.round(Math.abs(x)) % 16;
		const fy = Math.round(y);
		let bz = Math.round(Math.abs(z)) % 16;

		if (this.chunkX < 0) {
			bx = 16 - bx;
		}

		if (this.chunkZ < 0) {
			bz = 16 - bz;
		}

		const block = chunk.blocks[bx + bz * 16 + fy * 256];

		return block !== 0;
	}

	GetBlockAtPos(x, y, z) {
		const cx = Math.floor(x / 16);
		const cz = Math.floor(z / 16);

		const chunk = this.renderer.GetChunkAtPos(cx, cz);
		if (!chunk) return BLOCKS.AIR;

		let bx = ((Math.floor(x) % 16) + 16) % 16;
		let by = Math.floor(y);
		let bz = ((Math.floor(z) % 16) + 16) % 16;

		if (by < 0 || by >= 256) return BLOCKS.AIR;

		return chunk.blocks[bx + bz * 16 + by * 256] & 0xff;
	}

	Raycast(maxDistance = 6) {
		let yaw = (this.view.yaw * Math.PI) / 180;
		let pitch = (this.view.pitch * Math.PI) / 180;

		let dx = -Math.cos(pitch) * Math.sin(yaw);
		let dy = Math.sin(pitch);
		let dz = -Math.cos(pitch) * Math.cos(yaw);

		let x = this.position.x + 0.5;
		let y = this.position.y + 0.5;
		let z = this.position.z + 0.5;

		let ix = x;
		let iy = y;
		let iz = z;

		const stepX = dx;
		const stepY = dy;
		const stepZ = dz;

		for (let i = 0; i < maxDistance; i++) {
			const block = this.GetBlockAtPos(ix, iy, iz);

			if (block !== BLOCKS.AIR) {
				return { block, x: ix, y: iy, z: iz };
			}
			ix += stepX;
			iy += stepY;
			iz += stepZ;
		}

		return undefined;
	}
}
