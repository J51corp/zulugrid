import { bus } from '../events';

/**
 * Continuously scrolls the map's center longitude to simulate Earth's rotation.
 * Completes 360° in 24 hours (0.25°/min or ~0.00417°/sec).
 */
export class ScrollController {
  private active = false;
  private offset = 0; // current longitude offset in degrees
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;

  /** Degrees per millisecond: 360° / 24h = 360 / 86400000 */
  private static RATE = 360 / 86_400_000;

  start() {
    if (this.active) return;
    this.active = true;
    this.lastTimestamp = null;
    this.tick(performance.now());
  }

  stop() {
    this.active = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.offset = 0;
    this.lastTimestamp = null;
    bus.emit('scroll:update', 0);
  }

  isActive(): boolean {
    return this.active;
  }

  getOffset(): number {
    return this.offset;
  }

  private tick = (timestamp: number) => {
    if (!this.active) return;

    if (this.lastTimestamp !== null) {
      const dt = timestamp - this.lastTimestamp;
      this.offset = (this.offset - dt * ScrollController.RATE) % 360;
      bus.emit('scroll:update', this.offset);
    }

    this.lastTimestamp = timestamp;
    this.rafId = requestAnimationFrame(this.tick);
  };
}
