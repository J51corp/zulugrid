import type { Theme } from '../types';

export const classicTheme: Theme = {
  id: 'classic',
  name: 'Classic Geochron',
  ocean: '#4a7fb5',
  land: [
    '#d4c5a0', '#c9b88a', '#ddd0b0', '#c4b68a', '#d9cca0',
    '#cfbf95', '#d1c49c', '#c7ba88', '#dccfa8', '#cec098',
    '#d6c99e', '#c8bb8c', '#d3c6a2', '#ccbf94', '#dbd0a8',
    '#d0c39a', '#c6b986', '#d8cba4', '#cdbf92', '#d5c8a0',
  ],
  border: '#ffffff',
  borderWidth: 0.5,
  nightOverlay: 'rgba(0, 0, 20, 0.55)',
  twilightCivil: 'rgba(0, 0, 20, 0.35)',
  twilightNautical: 'rgba(0, 0, 20, 0.22)',
  twilightAstro: 'rgba(0, 0, 20, 0.10)',
  textPrimary: '#ffffff',
  textSecondary: '#e0d8c0',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  uiBackground: 'rgba(40, 35, 25, 0.75)',
  sunMarker: '#ffd700',
  pinColor: '#ff4444',
  pinLabelColor: '#ffffff',
  gridLine: 'rgba(255, 255, 255, 0.15)',
  tzHighlight: '#ffd700',
};
