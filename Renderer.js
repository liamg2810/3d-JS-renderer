import { ApplyCameraRotation, GetDotProduct, lerp, lerpVerts } from "./Math.js";
import { ThreeDObject } from "./Primitives.js";
import { TestScene, VoxelTerrainScene } from "./Scene.js";
import { Vector3 } from "./Vectors.js";

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

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

	constructor() {
		// TestScene(this);
		// TerrainScene(this);
		VoxelTerrainScene(this);

		this.Update();
	}

	lightDir = new Vector3(1, 0, 0);

	Update() {
		// this.objects[0].rotation = this.objects[0].rotation.Add(
		// 	new Vector3(0, 0, 1)
		// );

		this.light = this.light.Add(this.lightDir);

		if (this.light.x > 200) {
			this.lightDir.x = -1;
		}

		if (this.light.x < 50) {
			this.lightDir.x = 1;
		}

		if (this.keyMap.has("w")) {
			this.cam = this.cam.Add(
				new Vector3(
					-Math.sin((this.camRot.y * Math.PI) / 180),
					Math.sin((this.camRot.x * Math.PI) / 180),
					-Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("s")) {
			this.cam = this.cam.Add(
				new Vector3(
					Math.sin((this.camRot.y * Math.PI) / 180),
					-Math.sin((this.camRot.x * Math.PI) / 180),
					Math.cos((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("a")) {
			this.cam = this.cam.Add(
				new Vector3(
					Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					-Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("d")) {
			this.cam = this.cam.Add(
				new Vector3(
					-Math.cos((this.camRot.y * Math.PI) / 180),
					0,
					Math.sin((this.camRot.y * Math.PI) / 180)
				)
			);
		}

		if (this.keyMap.has("e")) {
			this.cam.y += 1;
		}

		if (this.keyMap.has("q")) {
			this.cam.y -= 1;
		}
		if (this.keyMap.has("ArrowRight")) {
			this.camRot.y += 1;

			if (this.camRot.y > 360) this.camRot.y = 0;
		}

		if (this.keyMap.has("ArrowLeft")) {
			this.camRot.y -= 1;

			if (this.camRot.y < 0) this.camRot.y = 360;
		}

		if (this.keyMap.has("ArrowUp")) {
			this.camRot.x += 1;

			this.camRot.x = Math.max(Math.min(this.camRot.x, 45), -45);
		}

		if (this.keyMap.has("ArrowDown")) {
			this.camRot.x -= 1;

			this.camRot.x = Math.max(Math.min(this.camRot.x, 45), -45);
		}

		this.Draw();

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

		ctx.clearRect(0, 0, canvas.width, canvas.height);

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

		faces = faces.sort((a, b) => {
			let aSum = Vector3.Zero();

			a.face.forEach((face) => {
				aSum = aSum.Add(face);
			});

			const averageA = aSum.Divide(a.face.length);

			const aMag = Math.sqrt(
				averageA.x * averageA.x +
					averageA.y * averageA.y +
					averageA.z * averageA.z
			);

			let bSum = Vector3.Zero();

			b.face.forEach((face) => {
				bSum = bSum.Add(face);
			});

			const averageB = bSum.Divide(b.face.length);

			const bMag = Math.sqrt(
				averageB.x * averageB.x +
					averageB.y * averageB.y +
					averageB.z * averageB.z
			);

			return bMag - aMag;
		});

		for (let face of faces) {
			const dot = GetDotProduct(face.face, Vector3.Zero());

			if (dot < 0) {
				continue;
			}

			const lightDot = GetDotProduct(face.face, lightPos);

			const [v0, v1, v2] = [...face.face].sort((a, b) => a.y - b.y);

			if (v0.y === v2.y) continue;

			let lastX = 0;
			let lastY = 0;
			let setScreen = false;

			for (let y = Math.ceil(v0.y); y <= Math.floor(v2.y); y++) {
				let xA, zA, xB, zB;

				if (y < v1.y) {
					const a = interpolate(v0, v1, y);
					const b = interpolate(v0, v2, y);
					xA = a.x;
					zA = a.z;
					xB = b.x;
					zB = b.z;
				} else {
					const a = interpolate(v1, v2, y);
					const b = interpolate(v0, v2, y);
					xA = a.x;
					zA = a.z;
					xB = b.x;
					zB = b.z;
				}

				if (xA > xB) {
					[xA, xB] = [xB, xA];
					[zA, zB] = [zB, zA];
				}

				for (let x = Math.ceil(xA); x <= Math.floor(xB); x++) {
					const t = xB - xA === 0 ? 0 : (x - xA) / (xB - xA);
					const z = zA + (zB - zA) * t;

					if (z < this.near || z > this.far) continue;

					const sX = (x / z) * this.focalLength + canvas.width / 2;
					const sY = (y / z) * this.focalLength + canvas.height / 2;
					if (!setScreen) {
						lastX = sX;
						lastY = sY;
						setScreen = true;
					}

					ctx.fillStyle = `hsla(${face.obj.hue}, ${
						face.obj.saturation
					}%, ${face.obj.lightness * (0.3 + 0.7 * lightDot)}%, ${
						face.obj.opcaity
					})`;
					const rectWidth = Math.max(1, Math.abs(sX - lastX));
					const rectHeight = Math.max(1, Math.abs(sY - lastY));
					ctx.fillRect(
						Math.min(sX, lastX),
						Math.min(sY, lastY),
						rectWidth,
						rectHeight
					);
					lastX = sX;
					lastY = sY;
				}
			}
		}

		ctx.fillStyle = "hsl(0 0% 0%)";
		// this.DrawLight();
	}
}
