const en = {
  // Settings panel
  settings: 'Settings',
  appearance: 'Appearance',
  theme: 'Theme',
  brightness: 'Brightness',
  bright: 'Bright',
  dim: 'Dim',

  // Map
  map: 'Map',
  mapMode: 'Map Mode',
  static: 'Static',
  scrolling: 'Scrolling',
  gridLines: 'Grid Lines',
  timezoneLabels: 'Timezone Labels',
  twilightBands: 'Twilight Bands',

  // Demo
  demoMode: 'Demo Mode',
  enable: 'Enable',
  speed: 'Speed',
  demoIndicator: 'DEMO MODE',

  // Branding
  branding: 'Branding',
  title: 'Title',
  logo: 'Logo',
  showWatermark: 'Show Watermark',

  // Time
  utcZulu: 'UTC / ZULU',
  local: 'LOCAL',

  // Pin templates
  welcomeTitle: 'Welcome to ZuluGrid',
  welcomeMessage: 'Choose a pin template to get started, or skip to add your own later.',
  skipForNow: 'Skip for now',
  addPinsLater: 'Add pins manually later via Settings',
  locations: 'locations',

  // Keyboard shortcuts
  keyboardShortcuts: 'Keyboard',
  settingsKey: 'S',
  brightnessKey: 'B',
  demoKey: 'D',
} as const;

export type Translations = typeof en;
export default en;
