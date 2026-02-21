/** Sub-solar point on Earth's surface directly beneath the sun */
export interface SubSolarPoint {
  lat: number;
  lng: number;
}

/** Geographic coordinate */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A location pin on the map */
export interface Pin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  timezone: string; // IANA timezone string (e.g. "America/New_York")
}

/** Pin template set */
export interface PinTemplate {
  id: string;
  name: string;
  pins: Pin[];
}

/** Theme color definitions */
export interface Theme {
  id: string;
  name: string;
  ocean: string;
  land: string[];        // array of colors cycled per country index
  border: string;
  borderWidth: number;
  nightOverlay: string;   // rgba for night fill
  twilightCivil: string;
  twilightNautical: string;
  twilightAstro: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  uiBackground: string;
  sunMarker: string;
  moonMarker: string;
  pinColor: string;
  pinLabelColor: string;
  gridLine: string;
  tzHighlight: string;    // UTC highlight color
  timezoneBorder: string;
}

/** Application settings persisted to localStorage */
export interface Settings {
  theme: string;
  mapMode: 'static' | 'scrolling';
  brightness: 'bright' | 'dim';
  demoMode: boolean;
  demoSpeed: number; // multiplier: 1 = realtime, 60 = 1min/sec, 3600 = 1hr/sec, 86400 = 1day/sec
  brandingLogo: string | null;   // base64 data URL or null
  brandingTitle: string;
  showWatermark: boolean;
  selectedPinTemplate: string | null;
  showTwilightBands: boolean;
  showGridLines: boolean;
  showTimezoneLabels: boolean;
  centerSun: boolean;
  showTimezoneBoundaries: boolean;
  showCountryLabels: boolean;
}

/** Default settings */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'classic',
  mapMode: 'static',
  brightness: 'bright',
  demoMode: false,
  demoSpeed: 3600,
  brandingLogo: null,
  brandingTitle: '',
  showWatermark: true,
  selectedPinTemplate: null,
  showTwilightBands: true,
  showGridLines: true,
  showTimezoneLabels: true,
  centerSun: false,
  showTimezoneBoundaries: false,
  showCountryLabels: false,
};

/** Typed event map for the application event bus */
export type AppEvents = {
  'settings:changed': Partial<Settings>;
  'theme:changed': string;
  'resize': { width: number; height: number };
  'time:tick': Date;
  'demo:tick': Date;
  'demo:started': void;
  'demo:stopped': void;
  'pins:changed': Pin[];
  'scroll:update': number; // current longitude offset
  'layer:dirty': string;   // layer name to redraw
  'settings:toggle': void;
  'brightness:toggle': void;
};

/** Canvas layer names */
export type LayerName = 'baseMap' | 'terminator' | 'overlays' | 'pins' | 'ui';
