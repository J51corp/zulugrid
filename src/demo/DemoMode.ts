import { bus } from '../events';

/**
 * Demo / time-lapse mode. Advances a virtual clock faster than real time.
 * All time-dependent layers use getCurrentTime() instead of new Date().
 */
export class DemoMode {
  private active = false;
  private speed = 3600; // multiplier: 3600 = 1 hour/sec
  private virtualTime: Date = new Date();
  private lastReal: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  isActive(): boolean {
    return this.active;
  }

  getSpeed(): number {
    return this.speed;
  }

  setSpeed(speed: number) {
    this.speed = Math.max(1, Math.min(86400, speed));
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.virtualTime = new Date();
    this.lastReal = Date.now();

    bus.emit('demo:started', undefined);

    // Tick at 30fps for smooth animation
    this.intervalId = setInterval(() => this.tick(), 33);
  }

  stop() {
    if (!this.active) return;
    this.active = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    bus.emit('demo:stopped', undefined);
  }

  /** Returns the current effective time (virtual if demo, real otherwise) */
  getCurrentTime(): Date {
    if (!this.active) return new Date();
    return new Date(this.virtualTime.getTime());
  }

  private tick() {
    const now = Date.now();
    const realDelta = now - this.lastReal;
    this.lastReal = now;

    // Advance virtual time by (realDelta * speed)
    const virtualDelta = realDelta * this.speed;
    this.virtualTime = new Date(this.virtualTime.getTime() + virtualDelta);

    bus.emit('demo:tick', this.getCurrentTime());
  }
}
