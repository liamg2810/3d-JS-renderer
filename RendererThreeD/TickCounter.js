class TickCounter {
	lastTick = 0;
	tickInterval = 1000 / 20; // 20 ticks per second
	ticks = 0;

	Tick() {
		const now = Date.now();

		if (now - this.lastTick < this.tickInterval) return;

		this.ticks++;
		this.lastTick = now;
	}
}

export default new TickCounter();
