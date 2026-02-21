import { bus } from '../events';
import { getAllThemes } from '../themes/index';
import { escapeHtml } from '../utils';
import type { SettingsStore } from './SettingsStore';
import type { PinManager } from '../pins/PinManager';

export class SettingsPanel {
  private panel: HTMLDivElement;
  private store: SettingsStore;
  private pinManager: PinManager;
  private isOpen = false;

  constructor(store: SettingsStore, pinManager: PinManager) {
    this.store = store;
    this.pinManager = pinManager;
    this.panel = document.getElementById('settings-panel') as HTMLDivElement;
    this.buildUI();

    bus.on('settings:toggle', () => this.toggle());
    bus.on('pins:changed', () => this.refreshPinList());

    // Sync UI when settings change externally (keyboard shortcuts, etc.)
    bus.on('settings:changed', (partial) => {
      if (partial.brightness !== undefined) {
        const el = this.panel.querySelector('#setting-brightness') as HTMLSelectElement | null;
        if (el) el.value = partial.brightness;
      }
      if (partial.demoMode !== undefined) {
        const el = this.panel.querySelector('#setting-demoMode') as HTMLInputElement | null;
        if (el) el.checked = partial.demoMode;
      }
      if (partial.theme !== undefined) {
        const el = this.panel.querySelector('#setting-theme') as HTMLSelectElement | null;
        if (el) el.value = partial.theme;
      }
      if (partial.centerSun !== undefined) {
        const el = this.panel.querySelector('#setting-centerSun') as HTMLInputElement | null;
        if (el) el.checked = partial.centerSun;
      }
    });
  }

  private buildUI() {
    const settings = this.store.getAll();
    const themes = getAllThemes();
    const templates = this.pinManager.getTemplates();

    this.panel.innerHTML = `
      <button class="settings-close" id="settings-close">&times;</button>
      <h2>Settings</h2>

      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-row">
          <label>Theme</label>
          <select id="setting-theme">
            ${themes.map(t => `<option value="${escapeHtml(t.id)}" ${t.id === settings.theme ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
          </select>
        </div>
        <div class="settings-row">
          <label>Brightness</label>
          <select id="setting-brightness">
            <option value="bright" ${settings.brightness === 'bright' ? 'selected' : ''}>Bright</option>
            <option value="dim" ${settings.brightness === 'dim' ? 'selected' : ''}>Dim</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>Map</h3>
        <div class="settings-row">
          <label>Map Mode</label>
          <select id="setting-mapMode">
            <option value="static" ${settings.mapMode === 'static' ? 'selected' : ''}>Static</option>
            <option value="scrolling" ${settings.mapMode === 'scrolling' ? 'selected' : ''}>Scrolling</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Grid Lines</label>
          <label class="toggle">
            <input type="checkbox" id="setting-showGridLines" ${settings.showGridLines ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <label>Timezone Labels</label>
          <label class="toggle">
            <input type="checkbox" id="setting-showTimezoneLabels" ${settings.showTimezoneLabels ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <label>Twilight Bands</label>
          <label class="toggle">
            <input type="checkbox" id="setting-showTwilightBands" ${settings.showTwilightBands ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <label>Center on Sun</label>
          <label class="toggle">
            <input type="checkbox" id="setting-centerSun" ${settings.centerSun ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <label>Timezone Boundaries</label>
          <label class="toggle">
            <input type="checkbox" id="setting-showTimezoneBoundaries" ${settings.showTimezoneBoundaries ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <label>Country Labels</label>
          <label class="toggle">
            <input type="checkbox" id="setting-showCountryLabels" ${settings.showCountryLabels ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h3>Locations</h3>
        <div class="settings-row">
          <label>Load Template</label>
          <select id="setting-pinTemplate">
            <option value="">— Choose —</option>
            ${templates.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} (${t.pins.length})</option>`).join('')}
          </select>
        </div>
        <div id="pin-list" class="pin-list"></div>
        <div class="pin-add-form" id="pin-add-form">
          <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
            <input type="text" id="pin-add-name" placeholder="City name" class="pin-input" style="flex:1; min-width:80px;">
            <input type="number" id="pin-add-lat" placeholder="Lat" class="pin-input" style="width:60px;" step="any">
            <input type="number" id="pin-add-lng" placeholder="Lng" class="pin-input" style="width:60px;" step="any">
            <input type="text" id="pin-add-tz" placeholder="Timezone" class="pin-input" style="flex:1; min-width:100px;" list="tz-suggestions">
            <button class="btn btn-primary" id="pin-add-btn" style="padding:4px 10px; font-size:12px;">Add</button>
          </div>
          <datalist id="tz-suggestions">
            <option value="America/New_York">
            <option value="America/Chicago">
            <option value="America/Denver">
            <option value="America/Los_Angeles">
            <option value="America/Toronto">
            <option value="America/Mexico_City">
            <option value="America/Sao_Paulo">
            <option value="Europe/London">
            <option value="Europe/Paris">
            <option value="Europe/Berlin">
            <option value="Europe/Moscow">
            <option value="Asia/Tokyo">
            <option value="Asia/Shanghai">
            <option value="Asia/Kolkata">
            <option value="Asia/Dubai">
            <option value="Asia/Singapore">
            <option value="Australia/Sydney">
            <option value="Pacific/Auckland">
            <option value="Africa/Cairo">
            <option value="Africa/Nairobi">
          </datalist>
        </div>
      </div>

      <div class="settings-section">
        <h3>Demo Mode</h3>
        <div class="settings-row">
          <label>Enable</label>
          <label class="toggle">
            <input type="checkbox" id="setting-demoMode" ${settings.demoMode ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <label>Speed</label>
          <select id="setting-demoSpeed">
            <option value="60" ${settings.demoSpeed === 60 ? 'selected' : ''}>1 min/sec</option>
            <option value="3600" ${settings.demoSpeed === 3600 ? 'selected' : ''}>1 hr/sec</option>
            <option value="86400" ${settings.demoSpeed === 86400 ? 'selected' : ''}>1 day/sec</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>Branding</h3>
        <div class="settings-row">
          <label>Title</label>
          <input type="text" id="setting-brandingTitle"
                 value="${escapeHtml(settings.brandingTitle)}"
                 placeholder="Company Name"
                 class="pin-input" style="width:140px;">
        </div>
        <div class="settings-row">
          <label>Logo</label>
          <input type="file" id="setting-brandingLogo" accept="image/*"
                 style="width:140px; font-size:12px; color:#888;">
        </div>
        <div class="settings-row">
          <label>Show Watermark</label>
          <label class="toggle">
            <input type="checkbox" id="setting-showWatermark" ${settings.showWatermark ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-section" style="margin-top:20px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">
        <p style="color:#666; font-size:11px;">
          Keyboard: <strong>S</strong> Settings &middot; <strong>B</strong> Brightness &middot; <strong>D</strong> Demo
        </p>
      </div>
    `;

    this.refreshPinList();
    this.bindEvents();
  }

  private refreshPinList() {
    const container = this.panel.querySelector('#pin-list');
    if (!container) return;

    const pins = this.pinManager.getPins();
    if (pins.length === 0) {
      container.innerHTML = '<p style="color:#666; font-size:12px; padding:4px 0;">No pins loaded. Select a template or add manually.</p>';
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin:6px 0 4px;">
        <span style="font-size:12px; color:#888;">${pins.length} location${pins.length !== 1 ? 's' : ''}</span>
        <button class="btn" id="pin-clear-all" style="padding:2px 8px; font-size:11px;">Clear All</button>
      </div>
      <div class="pin-scroll-list">
        ${pins.map(p => `
          <div class="pin-item" data-id="${escapeHtml(p.id)}">
            <span class="pin-item-name">${escapeHtml(p.name)}</span>
            <span class="pin-item-coords">${p.lat.toFixed(1)}, ${p.lng.toFixed(1)}</span>
            <button class="pin-item-remove" data-id="${escapeHtml(p.id)}">&times;</button>
          </div>
        `).join('')}
      </div>
    `;

    // Bind clear all
    container.querySelector('#pin-clear-all')?.addEventListener('click', () => {
      this.pinManager.clearAll();
    });

    // Bind individual remove buttons
    container.querySelectorAll('.pin-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id) this.pinManager.removePin(id);
      });
    });
  }

  private bindEvents() {
    // Close button
    this.panel.querySelector('#settings-close')?.addEventListener('click', () => this.close());

    // Theme
    this.bindSelect('setting-theme', 'theme');

    // Brightness
    this.bindSelect('setting-brightness', 'brightness');

    // Map mode
    this.bindSelect('setting-mapMode', 'mapMode');

    // Demo speed
    const demoSpeedEl = this.panel.querySelector('#setting-demoSpeed') as HTMLSelectElement;
    demoSpeedEl?.addEventListener('change', () => {
      this.store.set('demoSpeed', parseInt(demoSpeedEl.value, 10));
    });

    // Toggles
    this.bindToggle('setting-showGridLines', 'showGridLines');
    this.bindToggle('setting-showTimezoneLabels', 'showTimezoneLabels');
    this.bindToggle('setting-showTwilightBands', 'showTwilightBands');
    this.bindToggle('setting-centerSun', 'centerSun');
    this.bindToggle('setting-showTimezoneBoundaries', 'showTimezoneBoundaries');
    this.bindToggle('setting-showCountryLabels', 'showCountryLabels');
    this.bindToggle('setting-demoMode', 'demoMode');
    this.bindToggle('setting-showWatermark', 'showWatermark');

    // Pin template selector
    const templateEl = this.panel.querySelector('#setting-pinTemplate') as HTMLSelectElement;
    templateEl?.addEventListener('change', () => {
      if (templateEl.value) {
        this.pinManager.loadTemplate(templateEl.value);
        templateEl.value = ''; // Reset to "Choose" so they can re-select
      }
    });

    // Add pin form
    const addBtn = this.panel.querySelector('#pin-add-btn');
    addBtn?.addEventListener('click', () => this.handleAddPin());

    // Branding title
    const titleEl = this.panel.querySelector('#setting-brandingTitle') as HTMLInputElement;
    titleEl?.addEventListener('input', () => {
      this.store.set('brandingTitle', titleEl.value);
    });

    // Branding logo upload
    const logoEl = this.panel.querySelector('#setting-brandingLogo') as HTMLInputElement;
    logoEl?.addEventListener('change', () => {
      const file = logoEl.files?.[0];
      if (file) {
        if (file.size > 512 * 1024) { // 512 KB limit
          logoEl.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          this.store.set('brandingLogo', reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  private handleAddPin() {
    const nameEl = this.panel.querySelector('#pin-add-name') as HTMLInputElement;
    const latEl = this.panel.querySelector('#pin-add-lat') as HTMLInputElement;
    const lngEl = this.panel.querySelector('#pin-add-lng') as HTMLInputElement;
    const tzEl = this.panel.querySelector('#pin-add-tz') as HTMLInputElement;

    const name = nameEl.value.trim();
    const lat = parseFloat(latEl.value);
    const lng = parseFloat(lngEl.value);
    const timezone = tzEl.value.trim();

    if (!name || isNaN(lat) || isNaN(lng) || !timezone) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    this.pinManager.addPin({ name, lat, lng, timezone });

    // Clear form
    nameEl.value = '';
    latEl.value = '';
    lngEl.value = '';
    tzEl.value = '';
  }

  private bindSelect(elementId: string, settingKey: keyof import('../types').Settings) {
    const el = this.panel.querySelector(`#${elementId}`) as HTMLSelectElement;
    el?.addEventListener('change', () => {
      this.store.set(settingKey, el.value as never);
    });
  }

  private bindToggle(elementId: string, settingKey: keyof import('../types').Settings) {
    const el = this.panel.querySelector(`#${elementId}`) as HTMLInputElement;
    el?.addEventListener('change', () => {
      this.store.set(settingKey, el.checked as never);
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.panel.classList.remove('hidden');
  }

  close() {
    this.isOpen = false;
    this.panel.classList.add('hidden');
  }
}
