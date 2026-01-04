import ChunkManager from "../Chunks/ChunkManager.js";
import { DecodeRLE, GetFromPositionInRLE, RLE } from "../Chunks/RLE.js";
import { GetBlock } from "../Globals/Blocks/Blocks.js";
import { PARTICLES } from "../Globals/Constants.js";
import { Particle } from "../RendererThreeD/Particle.js";
import ParticleManager from "../RendererThreeD/ParticleManager.js";
import Renderer from "../RendererThreeD/Renderer.js";
import { enqueueLight, enqueueMesh } from "../Scene.js";

const worldPosDebug = document.getElementById("world-pos");
const blockPosDebug = document.getElementById("block-pos");
const chunkPosDebug = document.getElementById("chunk-pos");

class Player {
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

	freezeChunks = false;

	/** @type {{block: number; x: number; y: number; z: number; normal: number} | undefined} */
	targetedBlock = undefined;

	constructor(x, y, z) {
		this.position.x = x;
		this.position.y = y;
		this.position.z = z;

		this.chunkX = (x + 1) >> 4;
		this.chunkZ = (z + 1) >> 4;
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

		newX = Math.min(2147483646, newX);
		newZ = Math.min(2147483646, newZ);

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

		this.targetedBlock = this.Raycast();

		if (!this.freezeChunks) {
			ChunkManager.LoadChunks();
		}

		let lastY = this.position.y;

		if (!this.flight) {
			this.DoGravity();

			if (this.IsColliding()) {
				this.position.y = lastY;
				this.yVel = 0;
			}
		}

		if (this.keyMap.has("f")) {
			ParticleManager.AddParticle(
				this.position.x,
				this.position.y,
				this.position.z,
				1,
				PARTICLES.EXPLOSION
			);
		}

		this.yVel = Math.min(2, Math.max(-10, this.yVel));

		this.SetDebugs();
	}

	Break() {
		if (this.targetedBlock !== undefined) {
			const by = Math.floor(this.targetedBlock.y);
			const bx = ((Math.floor(this.targetedBlock.x) % 16) + 16) % 16;
			const bz = ((Math.floor(this.targetedBlock.z) % 16) + 16) % 16;

			const cx = Math.floor(this.targetedBlock.x / 16);
			const cz = Math.floor(this.targetedBlock.z / 16);

			const chunk = ChunkManager.GetChunkAtPos(cx, cz);

			const b = GetFromPositionInRLE(bx, by, bz, chunk.blocks);

			if (b !== GetBlock("bedrock").code) {
				chunk.SetBlock(bx, by, bz, GetBlock("air").code);

				enqueueLight(chunk);

				if (bx === 0) {
					const c = ChunkManager.GetChunkAtPos(cx - 1, cz);

					c && enqueueLight(c);
				} else if (bx === 15) {
					const c = ChunkManager.GetChunkAtPos(cx + 1, cz);

					c && enqueueLight(c);
				}
				if (bz === 0) {
					const c = ChunkManager.GetChunkAtPos(cx, cz - 1);

					c && enqueueLight(c);
				} else if (bz === 15) {
					const c = ChunkManager.GetChunkAtPos(cx, cz + 1);

					c && enqueueLight(c);
				}
			}
		}
	}

	Place() {
		if (this.targetedBlock === undefined) return;

		let y = Math.floor(this.targetedBlock.y);
		let x = Math.floor(this.targetedBlock.x);
		let z = Math.floor(this.targetedBlock.z);

		if (this.targetedBlock.normal === 0) y += 1;
		if (this.targetedBlock.normal === 1) y -= 1;
		if (this.targetedBlock.normal === 2) x -= 1;
		if (this.targetedBlock.normal === 3) x += 1;
		if (this.targetedBlock.normal === 4) z -= 1;
		if (this.targetedBlock.normal === 5) z += 1;

		let by = Math.floor(y);
		let bx = ((Math.floor(x) % 16) + 16) % 16;
		let bz = ((Math.floor(z) % 16) + 16) % 16;

		const cx = Math.floor(x / 16);
		const cz = Math.floor(z / 16);

		const chunk = ChunkManager.GetChunkAtPos(cx, cz);

		const blocks = DecodeRLE(chunk.blocks);

		if (blocks[bx + bz * 16 + by * 256] !== GetBlock("air").code) return;

		chunk.SetBlock(bx, by, bz, GetBlock("glowstone").code);
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

	DoGravity() {
		const g =
			this.gravity * Math.min(Math.max(Renderer.deltaTime, 0.05), 0.2);

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

		const chunk = ChunkManager.GetChunkAtPos(this.chunkX, this.chunkZ);

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
		const chunk = ChunkManager.GetChunkAtPos(this.chunkX, this.chunkZ);

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

		const chunk = ChunkManager.GetChunkAtPos(cx, cz);
		if (!chunk) return GetBlock("air");

		let bx = ((Math.floor(x) % 16) + 16) % 16;
		let by = Math.floor(y);
		let bz = ((Math.floor(z) % 16) + 16) % 16;

		if (by < 0 || by >= 256) return GetBlock("air");

		return GetFromPositionInRLE(bx, by, bz, chunk.blocks) & 0xff;
	}

	Raycast(maxDistance = 6) {
		let yaw = (this.view.yaw * Math.PI) / 180;
		let pitch = (this.view.pitch * Math.PI) / 180;

		let dx = -Math.cos(pitch) * Math.sin(yaw);
		let dy = Math.sin(pitch);
		let dz = -Math.cos(pitch) * Math.cos(yaw);

		let x = this.position.x + 1;
		let y = this.position.y + 1;
		let z = this.position.z + 1;

		let ix = x;
		let iy = y;
		let iz = z;

		const stepX = dx;
		const stepY = dy;
		const stepZ = dz;

		let pcx = Math.floor(ix);
		let pcy = Math.floor(iy);
		let pcz = Math.floor(iz);
		let icx = Math.floor(ix);
		let icy = Math.floor(iy);
		let icz = Math.floor(iz);

		for (let i = 0; i < maxDistance; i++) {
			if (iy < 0 || iy > 255) return undefined;

			const block = this.GetBlockAtPos(ix, iy, iz);

			if (block !== GetBlock("air").code) {
				let normal = 0;

				if (icx > pcx) normal = 2;
				else if (icx < pcx) normal = 3;
				else if (icy > pcy) normal = 1;
				else if (icy < pcy) normal = 0;
				else if (icz > pcz) normal = 4;
				else if (icz < pcz) normal = 5;

				return { block, x: ix, y: iy, z: iz, normal };
			}

			pcx = Math.floor(ix);
			pcy = Math.floor(iy);
			pcz = Math.floor(iz);

			ix += stepX;
			iy += stepY;
			iz += stepZ;

			icx = Math.floor(ix);
			icy = Math.floor(iy);
			icz = Math.floor(iz);
		}

		return undefined;
	}
}

export default new Player(8, 80, 8);
