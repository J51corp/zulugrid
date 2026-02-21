import { geoCircle } from 'd3-geo';
import type { Polygon } from 'geojson';
import { getSubSolarPoint, getAntipode } from './solar';

/**
 * Generate a GeoJSON Polygon representing the night side of Earth.
 * This is a geoCircle centered on the antipodal point with 90° radius.
 */
export function getNightGeoJSON(date: Date): Polygon {
  const sub = getSubSolarPoint(date);
  const anti = getAntipode(sub);

  const circle = geoCircle()
    .center([anti.lng, anti.lat])
    .radius(90)
    .precision(1);

  return circle() as unknown as Polygon;
}

/**
 * Twilight types and their angular radius from the antipodal point.
 * Civil:        96° (sun 0–6° below horizon)
 * Nautical:    102° (sun 6–12° below horizon)
 * Astronomical: 108° (sun 12–18° below horizon)
 */
export type TwilightType = 'civil' | 'nautical' | 'astronomical';

const TWILIGHT_RADIUS: Record<TwilightType, number> = {
  civil: 96,
  nautical: 102,
  astronomical: 108,
};

/**
 * Generate GeoJSON for a twilight zone boundary.
 * The polygon covers the area from the twilight boundary inward to
 * the center of night (antipodal point).
 */
export function getTwilightGeoJSON(date: Date, type: TwilightType): Polygon {
  const sub = getSubSolarPoint(date);
  const anti = getAntipode(sub);

  const circle = geoCircle()
    .center([anti.lng, anti.lat])
    .radius(TWILIGHT_RADIUS[type])
    .precision(1);

  return circle() as unknown as Polygon;
}

/**
 * Get the sub-solar point for rendering the sun marker.
 */
export { getSubSolarPoint } from './solar';
