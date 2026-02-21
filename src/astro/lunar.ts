import { toJulianDate, julianCentury } from './solar';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Compute the sub-lunar point — the point on Earth directly beneath the moon.
 *
 * Uses simplified lunar orbital elements to compute ecliptic coordinates,
 * then converts to equatorial (RA, declination) via obliquity.
 * Declination -> sub-lunar latitude
 * Greenwich Sidereal Time minus RA -> sub-lunar longitude
 */
export function getSubLunarPoint(date: Date): { lat: number; lng: number } {
  const jd = toJulianDate(date);
  const T = julianCentury(jd);

  // Moon's mean longitude (degrees)
  const L = (218.3165 + 481267.8813 * T) % 360;

  // Moon's mean anomaly (degrees)
  const M = (134.9634 + 477198.8676 * T) % 360;

  // Moon's mean elongation (degrees)
  const D = (297.8502 + 445267.1115 * T) % 360;

  // Moon's argument of latitude (degrees)
  const F = (93.2720 + 483202.0175 * T) % 360;

  // Sun's mean anomaly (degrees)
  const Ms = (357.5291 + 35999.0503 * T) % 360;

  const Mrad = M * RAD;
  const Drad = D * RAD;
  const Frad = F * RAD;
  const Msrad = Ms * RAD;

  // Ecliptic longitude (degrees)
  const eclLng = L
    + 6.289 * Math.sin(Mrad)
    + 1.274 * Math.sin(2 * Drad - Mrad)
    + 0.658 * Math.sin(2 * Drad)
    + 0.214 * Math.sin(2 * Mrad)
    - 0.186 * Math.sin(Msrad)
    - 0.114 * Math.sin(2 * Frad);

  // Ecliptic latitude (degrees)
  const eclLat = 5.128 * Math.sin(Frad)
    + 0.281 * Math.sin(Mrad + Frad)
    + 0.278 * Math.sin(Mrad - Frad)
    + 0.173 * Math.sin(2 * Drad - Frad);

  // Obliquity of the ecliptic
  const obliquity = (23.439291 - 0.0130042 * T) * RAD;

  const eclLngRad = eclLng * RAD;
  const eclLatRad = eclLat * RAD;

  // Convert ecliptic to equatorial coordinates
  const sinDec = Math.sin(eclLatRad) * Math.cos(obliquity)
    + Math.cos(eclLatRad) * Math.sin(obliquity) * Math.sin(eclLngRad);
  const declination = Math.asin(sinDec) * DEG;

  const raY = Math.sin(eclLngRad) * Math.cos(obliquity) - Math.tan(eclLatRad) * Math.sin(obliquity);
  const raX = Math.cos(eclLngRad);
  let ra = Math.atan2(raY, raX) * DEG; // right ascension in degrees
  if (ra < 0) ra += 360;

  // Greenwich Mean Sidereal Time (degrees)
  const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360;

  // Sub-lunar longitude
  let lng = gmst - ra;
  // Normalize to [-180, 180]
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;

  return { lat: declination, lng };
}

/**
 * Get the moon's phase and illumination fraction.
 *
 * Returns:
 * - fraction: 0 to 1 (how much of the disc is lit)
 * - phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
 */
export function getMoonPhase(date: Date): { fraction: number; phase: number } {
  const jd = toJulianDate(date);
  const T = julianCentury(jd);

  // Moon's mean elongation (degrees)
  const D = ((297.8502 + 445267.1115 * T) % 360) * RAD;

  // Sun's mean anomaly
  const Ms = ((357.5291 + 35999.0503 * T) % 360) * RAD;

  // Moon's mean anomaly
  const M = ((134.9634 + 477198.8676 * T) % 360) * RAD;

  // Phase angle (elongation of moon from sun as seen from Earth)
  const phaseAngle = D
    - 6.289 * RAD * Math.sin(M)
    + 2.100 * RAD * Math.sin(Ms)
    - 1.274 * RAD * Math.sin(2 * D - M)
    - 0.658 * RAD * Math.sin(2 * D)
    - 0.214 * RAD * Math.sin(2 * M)
    - 0.110 * RAD * Math.sin(D);

  // Illumination fraction: (1 - cos(phaseAngle)) / 2
  const fraction = (1 - Math.cos(phaseAngle)) / 2;

  // Normalize phase angle to [0, 2π]
  let normalizedAngle = phaseAngle % (2 * Math.PI);
  if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

  // Phase: 0 to 1 corresponding to the lunar cycle
  const phase = normalizedAngle / (2 * Math.PI);

  return { fraction, phase };
}
