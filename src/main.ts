import { bus } from './events';
import { LayerManager } from './canvas/LayerManager';
import { BaseMapLayer } from './canvas/BaseMapLayer';
import { TerminatorLayer } from './canvas/TerminatorLayer';
import { OverlayLayer } from './canvas/OverlayLayer';
import { PinLayer } from './canvas/PinLayer';
import { UILayer } from './canvas/UILayer';
import { SettingsStore } from './settings/SettingsStore';
import { SettingsPanel } from './settings/SettingsPanel';
import { ScrollController } from './scroll/ScrollController';
import { DemoMode } from './demo/DemoMode';
import { BrightnessManager } from './brightness/BrightnessManager';
import { BrandingManager } from './branding/BrandingManager';
import { PinManager } from './pins/PinManager';
import { getTheme } from './themes/index';

async function main() {
  // --- Core systems ---
  const settings = new SettingsStore();
  const lm = new LayerManager();
  const demo = new DemoMode();
  const scroll = new ScrollController();
  const pinManager = new PinManager();

  let theme = getTheme(settings.get('theme'));

  // --- Canvas layers ---
  const baseMap = new BaseMapLayer(lm, theme);
  const terminator = new TerminatorLayer(lm, theme, baseMap.getProjection(), settings.get('showTwilightBands'));
  const overlay = new OverlayLayer(lm, theme, baseMap.getProjection(), settings.get('showGridLines'), settings.get('showTimezoneLabels'));
  const pinLayer = new PinLayer(lm, theme, baseMap.getProjection());
  const ui = new UILayer(lm, theme);

  // --- Managers ---
  const brightness = new BrightnessManager();
  brightness.setMode(settings.get('brightness'));

  const branding = new BrandingManager(ui);
  branding.init(settings.get('brandingLogo'), settings.get('brandingTitle'), settings.get('showWatermark'));

  // --- Settings panel ---
  new SettingsPanel(settings, pinManager);

  // --- Load base map ---
  await baseMap.load();

  // --- First-run pin template ---
  if (pinManager.isFirstRun()) {
    await pinManager.showTemplateSelector();
  }
  pinLayer.setPins(pinManager.getPins());

  // --- Initial draw all layers ---
  const now = () => demo.getCurrentTime();

  function drawAll() {
    const t = now();
    terminator.draw(t);
    overlay.draw(t);
    pinLayer.draw(t);
    ui.draw(t);
  }

  drawAll();

  // --- Tick loops ---

  // UI + pins: update every second (clock tick + pin local times)
  setInterval(() => {
    const t = now();
    ui.draw(t);
    pinLayer.draw(t);
    overlay.draw(t);
  }, 1000);

  // Terminator: update every 60 seconds (slow-moving)
  let terminatorInterval = setInterval(() => {
    terminator.draw(now());
  }, 60_000);

  // --- Event handlers ---

  // Theme change
  bus.on('theme:changed', (themeId) => {
    theme = getTheme(themeId);
    baseMap.setTheme(theme);
    terminator.setTheme(theme);
    overlay.setTheme(theme);
    pinLayer.setTheme(theme);
    ui.setTheme(theme);
    drawAll();
  });

  // Settings changes
  bus.on('settings:changed', (partial) => {
    if (partial.mapMode !== undefined) {
      if (partial.mapMode === 'scrolling') {
        scroll.start();
      } else {
        scroll.stop();
      }
    }

    if (partial.showTwilightBands !== undefined) {
      terminator.setShowTwilight(partial.showTwilightBands);
      terminator.draw(now());
    }

    if (partial.showGridLines !== undefined) {
      overlay.setShowGrid(partial.showGridLines);
      overlay.draw(now());
    }

    if (partial.showTimezoneLabels !== undefined) {
      overlay.setShowLabels(partial.showTimezoneLabels);
      overlay.draw(now());
    }

    if (partial.demoMode !== undefined) {
      if (partial.demoMode) {
        demo.setSpeed(settings.get('demoSpeed'));
        demo.start();
      } else {
        demo.stop();
      }
    }

    if (partial.demoSpeed !== undefined) {
      demo.setSpeed(partial.demoSpeed);
    }
  });

  // Demo mode events
  bus.on('demo:started', () => {
    ui.setDemoMode(true);
    // Switch terminator to faster update rate during demo
    clearInterval(terminatorInterval);
    terminatorInterval = setInterval(() => {
      terminator.draw(now());
    }, 100); // 10 fps for demo
  });

  bus.on('demo:stopped', () => {
    ui.setDemoMode(false);
    // Restore normal terminator update rate
    clearInterval(terminatorInterval);
    terminatorInterval = setInterval(() => {
      terminator.draw(now());
    }, 60_000);
    drawAll();
  });

  bus.on('demo:tick', (date) => {
    terminator.draw(date);
    overlay.draw(date);
    pinLayer.draw(date);
    ui.draw(date);
  });

  // Scroll events
  bus.on('scroll:update', (offset) => {
    baseMap.setScrollOffset(offset);
    // Update projection references for all layers
    const proj = baseMap.getProjection();
    terminator.setProjection(proj);
    overlay.setProjection(proj);
    pinLayer.setProjection(proj);
    const t = now();
    terminator.draw(t);
    overlay.draw(t);
    pinLayer.draw(t);
  });

  // Pin changes
  bus.on('pins:changed', (pins) => {
    pinLayer.setPins(pins);
    pinLayer.draw(now());
  });

  // Resize
  bus.on('resize', () => {
    // Projection is rebuilt by BaseMapLayer on resize, which triggers redraw.
    // After base map redraws, we need to sync the projection to other layers.
    setTimeout(() => {
      const proj = baseMap.getProjection();
      terminator.setProjection(proj);
      overlay.setProjection(proj);
      pinLayer.setProjection(proj);
      drawAll();
    }, 50);
  });

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 's':
        bus.emit('settings:toggle', undefined);
        break;
      case 'b': {
        const newBrightness = settings.get('brightness') === 'bright' ? 'dim' : 'bright';
        settings.set('brightness', newBrightness);
        break;
      }
      case 'd':
        if (demo.isActive()) {
          demo.stop();
          settings.set('demoMode', false);
        } else {
          demo.setSpeed(settings.get('demoSpeed'));
          demo.start();
          settings.set('demoMode', true);
        }
        break;
    }
  });

  // --- Settings gear click area ---
  const uiCanvas = lm.getLayer('ui').canvas;
  uiCanvas.addEventListener('click', (e) => {
    const rect = uiCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is near the settings gear icon (top right)
    if (x > lm.width - 50 && y < 50) {
      bus.emit('settings:toggle', undefined);
    }
  });

  // Initialize scrolling if set
  if (settings.get('mapMode') === 'scrolling') {
    scroll.start();
  }

  // Initialize demo if set
  if (settings.get('demoMode')) {
    demo.setSpeed(settings.get('demoSpeed'));
    demo.start();
    ui.setDemoMode(true);
  }
}

main().catch(console.error);
