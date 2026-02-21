import { bus } from '../events';

export class BrightnessManager {
  private container: HTMLDivElement;
  private mode: 'bright' | 'dim' = 'bright';

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLDivElement;

    bus.on('brightness:toggle', () => this.toggle());
    bus.on('settings:changed', (partial) => {
      if (partial.brightness !== undefined) {
        this.setMode(partial.brightness as 'bright' | 'dim');
      }
    });
  }

  setMode(mode: 'bright' | 'dim') {
    this.mode = mode;
    if (mode === 'dim') {
      this.container.classList.add('dim');
    } else {
      this.container.classList.remove('dim');
    }
  }

  toggle() {
    this.setMode(this.mode === 'bright' ? 'dim' : 'bright');
    bus.emit('settings:changed', { brightness: this.mode });
  }

  getMode(): 'bright' | 'dim' {
    return this.mode;
  }
}
