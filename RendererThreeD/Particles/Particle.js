export class Particle {
	CurrentKeyframe = 0;
	LastKeyFrameUpdate = 0;

	x;
	y;
	z;

	size;

	lifespan;

	toDelete = false;
	updates = 0;

	/**
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} size
	 * @param {import("../../Globals/Constants").PARTICLE} particle
	 * @param {number} [startKeyframe=0]
	 * @param {number | undefined} [lifespan=undefined]
	 */
	constructor(
		x,
		y,
		z,
		size,
		particle,
		startKeyframe = 0,
		lifespan = undefined
	) {
		this.x = x;
		this.y = y;
		this.z = z;

		this.size = size;

		this.particle = particle;

		this.lifespan =
			lifespan === undefined ? particle.KEYFRAMES.length : lifespan;

		this.CurrentKeyframe = startKeyframe;
		this.LastKeyFrameUpdate = Date.now();
	}

	AdvanceKeyframe() {
		if (Date.now() - this.LastKeyFrameUpdate < this.particle.DURATION)
			return;

		this.CurrentKeyframe++;
		this.updates++;

		if (this.updates >= this.lifespan) this.toDelete = true;

		if (this.CurrentKeyframe >= this.particle.KEYFRAMES.length)
			this.CurrentKeyframe = 0;

		this.LastKeyFrameUpdate = Date.now();
	}
}
