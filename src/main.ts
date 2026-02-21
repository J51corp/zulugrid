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
import { getSubSolarPoint } from './astro/solar';

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

  // Pass country data to overlay for country labels
  const countries = baseMap.getCountries();
  if (countries) {
    overlay.setCountries(countries);
  }

  // Initialize timezone boundaries and country labels from settings
  overlay.setShowTimezoneBoundaries(settings.get('showTimezoneBoundaries'));
  overlay.setShowCountryLabels(settings.get('showCountryLabels'));

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

    if (partial.centerSun !== undefined) {
      if (partial.centerSun) {
        startCenterSun();
      } else {
        stopCenterSun();
      }
    }

    if (partial.showTimezoneBoundaries !== undefined) {
      overlay.setShowTimezoneBoundaries(partial.showTimezoneBoundaries);
      overlay.draw(now());
    }

    if (partial.showCountryLabels !== undefined) {
      overlay.setShowCountryLabels(partial.showCountryLabels);
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

  // Scroll events (from ScrollController auto-scroll)
  bus.on('scroll:update', () => {
    // ScrollController offset is read via scroll.getOffset() inside syncView
    syncView();
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
      case '0':
        // Reset zoom and position
        zoomLevel = 1;
        currentLatOffset = 0;
        currentDragOffset = 0;
        syncView();
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

  // --- Drag-to-scroll + Zoom ---
  const container = document.getElementById('canvas-container')!;
  container.classList.add('draggable');

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartLngOffset = 0;
  let dragStartLatOffset = 0;
  let currentDragOffset = 0; // accumulated longitude drag offset in degrees
  let currentLatOffset = 0;  // accumulated latitude drag offset in degrees
  let zoomLevel = 1;

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 12;

  /** Sync all layers after a view change (zoom, lat, or lng) */
  function syncView() {
    const totalLngOffset = scroll.isActive()
      ? scroll.getOffset() + currentDragOffset
      : currentDragOffset;
    baseMap.setView(totalLngOffset, currentLatOffset, zoomLevel);
    const proj = baseMap.getProjection();
    terminator.setProjection(proj);
    overlay.setProjection(proj);
    pinLayer.setProjection(proj);
    const t = now();
    terminator.draw(t);
    overlay.draw(t);
    pinLayer.draw(t);
  }

  function clampLat(lat: number): number {
    // At zoom 1, full range is visible so no need to pan vertically.
    // At higher zoom, allow panning but keep the viewport on the globe.
    const maxLat = Math.max(0, 90 - (90 / zoomLevel));
    return Math.max(-maxLat, Math.min(maxLat, lat));
  }

  function startDrag(clientX: number, clientY: number) {
    isDragging = true;
    dragStartX = clientX;
    dragStartY = clientY;
    dragStartLngOffset = currentDragOffset;
    dragStartLatOffset = currentLatOffset;
    container.classList.add('dragging');
    container.classList.remove('draggable');

    // If centerSun is active, disable it on drag
    if (settings.get('centerSun')) {
      settings.set('centerSun', false);
    }
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!isDragging) return;
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;
    // Degrees per pixel depends on zoom level
    const degreesPerPixel = 360 / (lm.width * zoomLevel);

    // Negate deltaX: dragging right -> content moves right -> center lng decreases
    currentDragOffset = dragStartLngOffset - deltaX * degreesPerPixel;
    // Normalize to [-180, 180]
    currentDragOffset = ((currentDragOffset % 360) + 360) % 360;
    if (currentDragOffset > 180) currentDragOffset -= 360;

    // Vertical drag: dragging down -> content moves down -> center lat increases
    // (latitude increases upward on globe, but screen Y increases downward)
    currentLatOffset = clampLat(dragStartLatOffset + deltaY * degreesPerPixel);

    syncView();
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove('dragging');
    container.classList.add('draggable');
  }

  uiCanvas.addEventListener('mousedown', (e) => {
    // Don't start drag on settings gear
    const rect = uiCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x > lm.width - 50 && y < 50) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    }
  });

  window.addEventListener('mouseup', () => endDrag());

  // --- Wheel zoom ---
  uiCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel * zoomFactor));

    // Clamp latitude when zooming out
    currentLatOffset = clampLat(currentLatOffset);

    syncView();
  }, { passive: false });

  // --- Touch: drag + pinch-to-zoom ---
  let lastTouchDist = 0;
  let lastPinchZoom = 1;

  function getTouchDist(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  uiCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      // Start pinch zoom
      isDragging = false;
      lastTouchDist = getTouchDist(e.touches[0], e.touches[1]);
      lastPinchZoom = zoomLevel;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      if (lastTouchDist > 0) {
        const scale = dist / lastTouchDist;
        zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, lastPinchZoom * scale));
        currentLatOffset = clampLat(currentLatOffset);
        syncView();
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      lastTouchDist = 0;
    }
    if (e.touches.length === 0) {
      endDrag();
    }
  });

  // --- Double-click to reset zoom ---
  uiCanvas.addEventListener('dblclick', (e) => {
    // Don't reset on settings gear
    const rect = uiCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x > lm.width - 50 && y < 50) return;

    e.preventDefault();
    zoomLevel = 1;
    currentLatOffset = 0;
    syncView();
  });

  // --- Center Sun ---
  let centerSunInterval: ReturnType<typeof setInterval> | null = null;

  function updateCenterSun() {
    const subSolar = getSubSolarPoint(now());
    currentDragOffset = subSolar.lng;
    syncView();
  }

  function startCenterSun() {
    updateCenterSun();
    centerSunInterval = setInterval(updateCenterSun, 1000);
  }

  function stopCenterSun() {
    if (centerSunInterval !== null) {
      clearInterval(centerSunInterval);
      centerSunInterval = null;
    }
  }

  // Initialize scrolling if set
  if (settings.get('mapMode') === 'scrolling') {
    scroll.start();
  }

  // Initialize center sun if set
  if (settings.get('centerSun')) {
    startCenterSun();
  }

  // Initialize demo if set
  if (settings.get('demoMode')) {
    demo.setSpeed(settings.get('demoSpeed'));
    demo.start();
    ui.setDemoMode(true);
  }
}

main().catch(console.error);
