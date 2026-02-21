import { describe, it, expect } from 'vitest';
import { solarDeclination, equationOfTime, getSubSolarPoint } from '../solar';

describe('solarDeclination', () => {
  it('should be near 0° at March equinox 2024', () => {
    // March 20, 2024 ~03:06 UTC
    const date = new Date('2024-03-20T03:06:00Z');
    const decl = solarDeclination(date);
    expect(Math.abs(decl)).toBeLessThan(0.5);
  });

  it('should be near +23.44° at June solstice 2024', () => {
    // June 20, 2024 ~20:51 UTC
    const date = new Date('2024-06-20T20:51:00Z');
    const decl = solarDeclination(date);
    expect(decl).toBeGreaterThan(23.0);
    expect(decl).toBeLessThan(23.5);
  });

  it('should be near -23.44° at December solstice 2024', () => {
    // December 21, 2024 ~09:20 UTC
    const date = new Date('2024-12-21T09:20:00Z');
    const decl = solarDeclination(date);
    expect(decl).toBeLessThan(-23.0);
    expect(decl).toBeGreaterThan(-23.5);
  });

  it('should be near 0° at September equinox 2024', () => {
    // September 22, 2024 ~12:44 UTC
    const date = new Date('2024-09-22T12:44:00Z');
    const decl = solarDeclination(date);
    expect(Math.abs(decl)).toBeLessThan(0.5);
  });
});

describe('equationOfTime', () => {
  it('should be near 0 minutes around April 15', () => {
    const date = new Date('2024-04-15T12:00:00Z');
    const eot = equationOfTime(date);
    // EoT crosses zero around April 15, should be small
    expect(Math.abs(eot)).toBeLessThan(1.5);
  });

  it('should be near -14 minutes around Feb 12 (max negative)', () => {
    const date = new Date('2024-02-12T12:00:00Z');
    const eot = equationOfTime(date);
    expect(eot).toBeLessThan(-12);
    expect(eot).toBeGreaterThan(-16);
  });

  it('should be near +16 minutes around Nov 3 (max positive)', () => {
    const date = new Date('2024-11-03T12:00:00Z');
    const eot = equationOfTime(date);
    expect(eot).toBeGreaterThan(14);
    expect(eot).toBeLessThan(18);
  });
});

describe('getSubSolarPoint', () => {
  it('should return sub-solar point near (0°, 0°) at equinox local noon on prime meridian', () => {
    // March equinox, UTC noon => sun should be roughly over 0° longitude
    const date = new Date('2024-03-20T12:00:00Z');
    const ssp = getSubSolarPoint(date);
    expect(Math.abs(ssp.lat)).toBeLessThan(1);
    expect(Math.abs(ssp.lng)).toBeLessThan(5); // EoT can shift a few degrees
  });

  it('should have latitude matching declination', () => {
    const date = new Date('2024-06-21T12:00:00Z');
    const ssp = getSubSolarPoint(date);
    const decl = solarDeclination(date);
    expect(Math.abs(ssp.lat - decl)).toBeLessThan(0.01);
  });

  it('should place sun at midnight longitude at UTC midnight', () => {
    // At UTC 00:00, the sun should be near 180° (opposite side from prime meridian)
    const date = new Date('2024-06-21T00:00:00Z');
    const ssp = getSubSolarPoint(date);
    expect(Math.abs(Math.abs(ssp.lng) - 180)).toBeLessThan(10);
  });

  it('sub-solar lng should be in [-180, 180]', () => {
    for (let h = 0; h < 24; h++) {
      const date = new Date(`2024-01-15T${h.toString().padStart(2, '0')}:00:00Z`);
      const ssp = getSubSolarPoint(date);
      expect(ssp.lng).toBeGreaterThanOrEqual(-180);
      expect(ssp.lng).toBeLessThanOrEqual(180);
    }
  });
});
