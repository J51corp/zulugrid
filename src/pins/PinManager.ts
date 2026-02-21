import { bus } from '../events';
import type { Pin, PinTemplate } from '../types';
import { pinTemplates } from './templates';

const STORAGE_KEY = 'zulugrid_pins';

export class PinManager {
  private pins: Pin[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.pins = JSON.parse(raw);
      }
    } catch {
      this.pins = [];
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pins));
    } catch {
      // localStorage might be full
    }
  }

  hasPins(): boolean {
    return this.pins.length > 0;
  }

  isFirstRun(): boolean {
    return localStorage.getItem(STORAGE_KEY) === null;
  }

  getPins(): readonly Pin[] {
    return this.pins;
  }

  getTemplates(): PinTemplate[] {
    return pinTemplates;
  }

  loadTemplate(templateId: string) {
    const template = pinTemplates.find(t => t.id === templateId);
    if (!template) return;

    this.pins = template.pins.map(p => ({ ...p, id: crypto.randomUUID() }));
    this.save();
    bus.emit('pins:changed', [...this.pins]);
  }

  addPin(pin: Omit<Pin, 'id'>): Pin {
    const newPin: Pin = { ...pin, id: crypto.randomUUID() };
    this.pins.push(newPin);
    this.save();
    bus.emit('pins:changed', [...this.pins]);
    return newPin;
  }

  removePin(id: string) {
    this.pins = this.pins.filter(p => p.id !== id);
    this.save();
    bus.emit('pins:changed', [...this.pins]);
  }

  updatePin(id: string, updates: Partial<Omit<Pin, 'id'>>) {
    const pin = this.pins.find(p => p.id === id);
    if (pin) {
      Object.assign(pin, updates);
      this.save();
      bus.emit('pins:changed', [...this.pins]);
    }
  }

  clearAll() {
    this.pins = [];
    this.save();
    bus.emit('pins:changed', []);
  }

  /** Show the template selector overlay */
  showTemplateSelector(): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.getElementById('pin-template-overlay')!;
      const templates = this.getTemplates();

      overlay.innerHTML = `
        <div class="overlay-card">
          <h2>Welcome to ZuluGrid</h2>
          <p>Choose a pin template to get started, or skip to add your own later.</p>
          <div class="template-list">
            ${templates.map(t => `
              <div class="template-option" data-template="${t.id}">
                <div class="template-name">${t.name}</div>
                <div class="template-count">${t.pins.length} locations</div>
              </div>
            `).join('')}
            <div class="template-option" data-template="skip">
              <div class="template-name">Skip for now</div>
              <div class="template-count">Add pins manually later via Settings</div>
            </div>
          </div>
        </div>
      `;

      overlay.classList.remove('hidden');

      const handleClick = (e: Event) => {
        const target = (e.target as HTMLElement).closest('.template-option') as HTMLElement | null;
        if (!target) return;

        const templateId = target.dataset.template!;
        overlay.classList.add('hidden');
        overlay.removeEventListener('click', handleClick);

        if (templateId === 'skip') {
          // Mark as initialized even if skipped
          this.save();
          resolve(null);
        } else {
          this.loadTemplate(templateId);
          resolve(templateId);
        }
      };

      overlay.addEventListener('click', handleClick);
    });
  }
}
