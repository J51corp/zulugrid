import { bus } from '../events';
import { DEFAULT_SETTINGS, type Settings } from '../types';

const STORAGE_KEY = 'zulugrid_settings';

export class SettingsStore {
  private settings: Settings;

  constructor() {
    this.settings = this.load();
  }

  private static readonly ALLOWED_KEYS: ReadonlySet<string> = new Set<keyof Settings>([
    'theme', 'mapMode', 'brightness', 'demoMode', 'demoSpeed',
    'brandingLogo', 'brandingTitle', 'showWatermark',
    'selectedPinTemplate', 'showTwilightBands', 'showGridLines', 'showTimezoneLabels',
  ]);

  private load(): Settings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return { ...DEFAULT_SETTINGS };
        }
        const sanitized: Record<string, unknown> = {};
        for (const key of SettingsStore.ALLOWED_KEYS) {
          if (Object.prototype.hasOwnProperty.call(parsed, key)) {
            sanitized[key] = parsed[key];
          }
        }
        return { ...DEFAULT_SETTINGS, ...sanitized } as Settings;
      }
    } catch {
      // Ignore parse errors, use defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // localStorage might be full or disabled
    }
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key];
  }

  getAll(): Readonly<Settings> {
    return { ...this.settings };
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (this.settings[key] === value) return;

    this.settings[key] = value;
    this.save();

    const partial: Partial<Settings> = { [key]: value };
    bus.emit('settings:changed', partial);

    if (key === 'theme') {
      bus.emit('theme:changed', value as string);
    }
  }

  update(partial: Partial<Settings>) {
    let changed = false;
    for (const [key, value] of Object.entries(partial)) {
      if (!SettingsStore.ALLOWED_KEYS.has(key)) continue;
      const k = key as keyof Settings;
      if (this.settings[k] !== value) {
        (this.settings as unknown as Record<string, unknown>)[k] = value;
        changed = true;
      }
    }

    if (changed) {
      this.save();
      bus.emit('settings:changed', partial);

      if (partial.theme !== undefined) {
        bus.emit('theme:changed', partial.theme);
      }
    }
  }

  /** Check if this is the first run (no settings saved) */
  isFirstRun(): boolean {
    return localStorage.getItem(STORAGE_KEY) === null;
  }
}
