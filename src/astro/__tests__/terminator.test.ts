import { describe, it, expect } from 'vitest';
import { getNightGeoJSON, getTwilightGeoJSON } from '../terminator';

describe('getNightGeoJSON', () => {
  it('should return a valid GeoJSON Polygon', () => {
    const date = new Date('2024-03-20T12:00:00Z');
    const geo = getNightGeoJSON(date);
    expect(geo.type).toBe('Polygon');
    expect(geo.coordinates.length).toBeGreaterThan(0);
    expect(geo.coordinates[0].length).toBeGreaterThan(10);
  });

  it('should produce different night regions at equinox vs solstice', () => {
    const equinox = getNightGeoJSON(new Date('2024-03-20T12:00:00Z'));
    const solstice = getNightGeoJSON(new Date('2024-06-21T12:00:00Z'));

    const eq0 = equinox.coordinates[0][0];
    const sol0 = solstice.coordinates[0][0];
    expect(eq0[0]).not.toBeCloseTo(sol0[0], 1);
  });

  it('should produce different night regions at different times of day', () => {
    const morning = getNightGeoJSON(new Date('2024-06-21T06:00:00Z'));
    const evening = getNightGeoJSON(new Date('2024-06-21T18:00:00Z'));

    const m0 = morning.coordinates[0][0];
    const e0 = evening.coordinates[0][0];
    expect(m0[0]).not.toBeCloseTo(e0[0], 0);
  });
});

describe('getTwilightGeoJSON', () => {
  it('should return valid Polygon geometry for all twilight types', () => {
    const date = new Date('2024-06-21T12:00:00Z');
    for (const type of ['civil', 'nautical', 'astronomical'] as const) {
      const geo = getTwilightGeoJSON(date, type);
      expect(geo.type).toBe('Polygon');
      expect(geo.coordinates[0].length).toBeGreaterThan(0);
    }
  });

  it('should return valid GeoJSON at solstice midnight', () => {
    const date = new Date('2024-12-21T00:00:00Z');
    for (const type of ['civil', 'nautical', 'astronomical'] as const) {
      const geo = getTwilightGeoJSON(date, type);
      expect(geo.type).toBe('Polygon');
    }
  });
});
