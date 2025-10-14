import { ApplyCameraRotation, GetDotProduct, lerp, lerpVerts } from "./Math.js";
import { ThreeDObject } from "./Primitives.js";
import { CubeScene, TestScene, VoxelTerrainScene } from "./Scene.js";
import { Vector3 } from "./Vectors.js";

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");
/** @type {ImageData} */
const imageData = ctx.createImageData(canvas.width, canvas.height, {
	pixelFormat: "rgba-unorm8",
});

function interpolate(vStart, vEnd, y) {
	const t = (y - vStart.y) / (vEnd.y - vStart.y);
	return {
		x: vStart.x + (vEnd.x - vStart.x) * t,
		z: vStart.z + (vEnd.z - vStart.z) * t,
	};
}

export class Renderer {
	/** @type {ThreeDObject[]} */
	objects = [];
	cam = new Vector3(-100, 50, 50);
	camRot = new Vector3(0, 0, 0);
	keyMap = new Set();
	light = new Vector3(50, -50, 50);

	focalLength = 300;
	near = 0.1;
	far = 1000;

	zBuffer = new Array(canvas.width * canvas.height);
	deltaTime = 0;

	constructor() {
		// TestScene(this);
		// TerrainScene(this);
		VoxelTerrainScene(this);
		// CubeScene(this);

		this.Update();
	}

	lightDir = new Vector3(1, 0, 0);

	Update() {
		const frameStart = Date.now();

		this.light = this.light.Add(this.lightDir);

		if (this.light.x > 200) {
			this.lightDir.x = -1;
		}

		if (this.light.x < 50) {
			this.lightDir.x = 1;
		}

		const speed = this.deltaTime / 10;

		if (this.keyMap.has("w")) {
			this.cam = this.cam.Add(
				new Vector3(
					speed * -Math.sin((this.camRot.y * Math.PI) / 180),
					speed * Math.sin((this.camRot.x * Math.PI) / 180),
					speed * -Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("s")) {
			this.cam = this.cam.Add(
				new Vector3(
					speed * Math.sin((this.camRot.y * Math.PI) / 180),
					speed * -Math.sin((this.camRot.x * Math.PI) / 180),
					speed * Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("a")) {
			this.cam = this.cam.Add(
				new Vector3(
					speed * Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					speed * -Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("d")) {
			this.cam = this.cam.Add(
				new Vector3(
					speed * -Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					speed * Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("e")) {
			this.cam.y += speed;
		}

		if (this.keyMap.has("q")) {
			this.cam.y -= speed;
		}
		if (this.keyMap.has("ArrowRight")) {
			this.camRot.y += speed / 2;

			if (this.camRot.y > 360) this.camRot.y = 0;
		}

		if (this.keyMap.has("ArrowLeft")) {
			this.camRot.y -= speed / 2;

			if (this.camRot.y < 0) this.camRot.y = 360;
		}

		if (this.keyMap.has("ArrowUp")) {
			this.camRot.x += speed / 2;

			this.camRot.x = Math.max(Math.min(this.camRot.x, 45), -45);
		}

		if (this.keyMap.has("ArrowDown")) {
			this.camRot.x -= speed / 2;

			this.camRot.x = Math.max(Math.min(this.camRot.x, 45), -45);
		}

		this.Draw();

		const frameEnd = Date.now();

		this.deltaTime = frameEnd - frameStart;

		setTimeout(() => {
			this.Update();
		}, 1000 / 60);
	}

	DrawLight() {
		const lightPos = ApplyCameraRotation(this, this.light);

		if (lightPos.z < this.near || lightPos.z > this.far) return;

		const projectedX =
			(lightPos.x / lightPos.z) * this.focalLength + canvas.width / 2;
		const projectedY =
			(lightPos.y / lightPos.z) * this.focalLength + canvas.height / 2;

		ctx.fillStyle = "rgb(0, 0, 255)";
		ctx.fillRect(projectedX, projectedY, 10, 10);
	}

	Draw() {
		const lightPos = ApplyCameraRotation(this, this.light);

		this.zBuffer.fill(Infinity);

		imageData.data.fill(255);

		/** @type {{obj: ThreeDObject; face: Vector3[]; drawOrder: [number, number, number]}[]} */
		let faces = [];

		for (let obj of this.objects) {
			obj.CalculateFrameVerts();

			for (let draw of obj.drawOrder) {
				if (draw.length > 3) {
					console.error(
						"Cannot have a drawOrder length greater than 3."
					);
					continue;
				}

				let verts = draw.map((o) => {
					return obj.frameVerts[o];
				});

				faces.push({ obj: obj, face: verts, drawOrder: draw });
			}
		}

		for (let face of faces) {
			const dot = GetDotProduct(face.face, Vector3.Zero());

			if (dot < 0) {
				continue;
			}

			const lightDot = GetDotProduct(face.face, lightPos);

			const projected = face.face.map((v) => {
				if (v.z <= this.near) return null;
				const sx = (v.x / v.z) * this.focalLength + canvas.width / 2;
				const sy = (v.y / v.z) * this.focalLength + canvas.height / 2;
				return { x: sx, y: sy, z: v.z };
			});

			if (projected.includes(null)) continue;

			const [p0, p1, p2] = projected.sort((a, b) => a.y - b.y);

			if (p0.y === p2.y) continue;

			const minY = Math.max(0, Math.ceil(p0.y));
			const maxY = Math.min(canvas.height - 1, Math.floor(p2.y));

			for (let py = minY; py <= maxY; py++) {
				let xA, zA, xB, zB;

				if (py < p1.y) {
					const tA = (py - p0.y) / (p1.y - p0.y);
					const tB = (py - p0.y) / (p2.y - p0.y);
					xA = p0.x + (p1.x - p0.x) * tA;
					zA = p0.z + (p1.z - p0.z) * tA;
					xB = p0.x + (p2.x - p0.x) * tB;
					zB = p0.z + (p2.z - p0.z) * tB;
				} else {
					const tA = (py - p1.y) / (p2.y - p1.y);
					const tB = (py - p0.y) / (p2.y - p0.y);
					xA = p1.x + (p2.x - p1.x) * tA;
					zA = p1.z + (p2.z - p1.z) * tA;
					xB = p0.x + (p2.x - p0.x) * tB;
					zB = p0.z + (p2.z - p0.z) * tB;
				}

				if (xA > xB) {
					[xA, xB] = [xB, xA];
					[zA, zB] = [zB, zA];
				}

				const minX = Math.max(0, Math.ceil(xA));
				const maxX = Math.min(canvas.width - 1, Math.floor(xB));

				for (let px = minX; px <= maxX; px++) {
					const t = xB - xA === 0 ? 0 : (px - xA) / (xB - xA);
					const z = zA + (zB - zA) * t;

					if (z < this.near || z > this.far) continue;

					const index = (py * canvas.width + px) * 4;

					if (this.zBuffer[index / 4] < z) {
						continue;
					}

					this.zBuffer[index / 4] = z;

					imageData.data[index] = face.obj.r + lightDot * 20;
					imageData.data[index + 1] = face.obj.g + lightDot * 20;
					imageData.data[index + 2] = face.obj.b + lightDot * 20;
					// imageData.data[index + 3] = face.obj.opcaity;
				}
			}
		}

		ctx.putImageData(imageData, 0, 0);
		// this.DrawLight();
	}
}
