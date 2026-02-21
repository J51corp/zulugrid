import type { SubSolarPoint } from '../types';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Julian date from a JS Date.
 */
export function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Julian century from J2000.0 epoch.
 */
export function julianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Solar declination in degrees.
 * Accurate to ~0.01° for dates within a few centuries of J2000.
 */
export function solarDeclination(date: Date): number {
  const jd = toJulianDate(date);
  const T = julianCentury(jd);

  // Geometric mean longitude of the sun (degrees)
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

  // Mean anomaly of the sun (degrees)
  const M = (357.52911 + T * (35999.05029 - T * 0.0001537)) % 360;
  const Mrad = M * RAD;

  // Equation of center (degrees)
  const C = (1.914602 - T * (0.004817 + T * 0.000014)) * Math.sin(Mrad)
    + (0.019993 - T * 0.000101) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);

  // Sun's true longitude
  const sunLng = L0 + C;

  // Obliquity of the ecliptic (degrees)
  const obliquity = 23.439291 - T * 0.0130042;

  // Declination
  const decl = Math.asin(
    Math.sin(obliquity * RAD) * Math.sin(sunLng * RAD)
  ) * DEG;

  return decl;
}

/**
 * Equation of time in minutes.
 * Positive means sundial is ahead of clock.
 */
export function equationOfTime(date: Date): number {
  const jd = toJulianDate(date);
  const T = julianCentury(jd);

  const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360) * RAD;
  const M = ((357.52911 + T * (35999.05029 - T * 0.0001537)) % 360) * RAD;
  const e = 0.016708634 - T * (0.000042037 + T * 0.0000001267);
  const obliq = (23.439291 - T * 0.0130042) * RAD;

  const y = Math.tan(obliq / 2) ** 2;

  const eot = y * Math.sin(2 * L0)
    - 2 * e * Math.sin(M)
    + 4 * e * y * Math.sin(M) * Math.cos(2 * L0)
    - 0.5 * y * y * Math.sin(4 * L0)
    - 1.25 * e * e * Math.sin(2 * M);

  return eot * 4 * DEG; // convert radians to minutes (4 min per degree)
}

/**
 * Get the sub-solar point — the point on Earth directly beneath the sun.
 *
 * lat = solar declination
 * lng = based on UTC time + equation of time correction
 */
export function getSubSolarPoint(date: Date): SubSolarPoint {
  const lat = solarDeclination(date);

  const utcHours = date.getUTCHours()
    + date.getUTCMinutes() / 60
    + date.getUTCSeconds() / 3600;

  // The sun is at local solar noon when hour angle = 0.
  // lng = -(UTC hours * 15) + (eot correction in degrees)
  const eot = equationOfTime(date);
  let lng = -(utcHours - 12) * 15 + eot * 0.25;

  // Normalize to [-180, 180]
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;

  return { lat, lng };
}

/**
 * Antipodal point (opposite side of Earth from sub-solar point = center of night)
 */
export function getAntipode(point: SubSolarPoint): SubSolarPoint {
  return {
    lat: -point.lat,
    lng: point.lng > 0 ? point.lng - 180 : point.lng + 180,
  };
}
