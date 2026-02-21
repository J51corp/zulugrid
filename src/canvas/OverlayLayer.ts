import { geoPath, geoCentroid, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import type { LayerManager } from './LayerManager';
import type { Theme } from '../types';
import { getTimezoneOffsets, getTimeForOffset } from '../astro/timezones';

// Bundled Natural Earth timezone TopoJSON (120 polygons, ~185KB)
import timezonesUrl from '../data/timezones.json?url';

interface TimezoneProperties {
  name: string;       // e.g. "+3", "-5"
  zone: number;       // UTC offset number
  utc_format: string; // e.g. "UTC+03:00"
  places: string;     // countries in this zone
  tz_name1st: string; // primary IANA name
}

export class OverlayLayer {
  private lm: LayerManager;
  private theme: Theme;
  private projection: GeoProjection;
  private showGrid: boolean;
  private showLabels: boolean;
  private showTimezoneBoundaries = false;
  private showCountryLabels = false;
  private timezoneBoundaries: FeatureCollection | null = null;
  private timezoneBoundariesLoading = false;
  private countries: FeatureCollection<Polygon | MultiPolygon, { name: string }> | null = null;

  constructor(lm: LayerManager, theme: Theme, projection: GeoProjection, showGrid = true, showLabels = true) {
    this.lm = lm;
    this.theme = theme;
    this.projection = projection;
    this.showGrid = showGrid;
    this.showLabels = showLabels;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  setProjection(projection: GeoProjection) {
    this.projection = projection;
  }

  setShowGrid(show: boolean) {
    this.showGrid = show;
  }

  setShowLabels(show: boolean) {
    this.showLabels = show;
  }

  setShowTimezoneBoundaries(show: boolean) {
    this.showTimezoneBoundaries = show;
    if (show && !this.timezoneBoundaries && !this.timezoneBoundariesLoading) {
      this.loadTimezoneBoundaries();
    }
  }

  setShowCountryLabels(show: boolean) {
    this.showCountryLabels = show;
  }

  setCountries(countries: FeatureCollection<Polygon | MultiPolygon, { name: string }>) {
    this.countries = countries;
  }

  private async loadTimezoneBoundaries() {
    this.timezoneBoundariesLoading = true;
    try {
      // Load bundled Natural Earth timezone TopoJSON (same pattern as country data)
      const resp = await fetch(timezonesUrl);
      if (!resp.ok) throw new Error(`Failed to load timezone data: ${resp.status}`);
      const topo = (await resp.json()) as Topology<{
        ne_10m_time_zones: GeometryCollection<TimezoneProperties>;
      }>;
      this.timezoneBoundaries = feature(
        topo,
        topo.objects.ne_10m_time_zones
      ) as unknown as FeatureCollection;
      // Trigger a redraw now that data is available
      this.draw(new Date());
    } catch {
      // Silently fail — timezone boundaries are optional
      this.timezoneBoundaries = null;
    }
    this.timezoneBoundariesLoading = false;
  }

  draw(date: Date) {
    const { ctx } = this.lm.getLayer('overlays');
    const { width, height } = this.lm;

    this.lm.clear('overlays');

    // Draw timezone boundaries first (behind grid lines)
    if (this.showTimezoneBoundaries && this.timezoneBoundaries) {
      this.drawTimezoneBoundaries(ctx, width, height);
    }

    const zones = getTimezoneOffsets();

    if (this.showGrid) {
      this.drawTimezoneLines(ctx, zones, height);
    }

    // Draw country labels (behind timezone labels)
    if (this.showCountryLabels && this.countries) {
      this.drawCountryLabels(ctx, width, height);
    }

    if (this.showLabels) {
      this.drawTimezoneLabels(ctx, zones, date, width, height);
    }
  }

  private drawTimezoneBoundaries(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number
  ) {
    if (!this.timezoneBoundaries) return;

    ctx.save();
    ctx.strokeStyle = this.theme.timezoneBorder;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    const mapWidth = 2 * Math.PI * (this.projection.scale?.() ?? width / (2 * Math.PI));
    for (const dx of [-mapWidth, 0, mapWidth]) {
      ctx.save();
      ctx.translate(dx, 0);

      const path = geoPath(this.projection, ctx);

      for (const feature of this.timezoneBoundaries.features) {
        ctx.beginPath();
        path(feature);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private drawCountryLabels(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    if (!this.countries) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const placedLabels: Array<{ x: number; y: number; w: number; h: number }> = [];

    // Sort countries by approximate area (larger first) so they get priority
    const sorted = [...this.countries.features].sort((a, b) => {
      const areaA = this.approxArea(a);
      const areaB = this.approxArea(b);
      return areaB - areaA;
    });

    for (const feature of sorted) {
      const name = feature.properties?.name;
      if (!name) continue;

      const centroid = geoCentroid(feature);
      const projected = this.projection(centroid);
      if (!projected) continue;

      const [x, y] = projected;
      if (x < 0 || x > width || y < 0 || y > height) continue;

      // Scale font by approximate country area
      const area = this.approxArea(feature);
      const fontSize = Math.max(8, Math.min(14, Math.sqrt(area) * width / 2000));

      ctx.font = `${fontSize}px 'Segoe UI', system-ui, sans-serif`;
      const textWidth = ctx.measureText(name).width;
      const textHeight = fontSize;

      // Check overlap with already placed labels
      const labelRect = {
        x: x - textWidth / 2 - 2,
        y: y - textHeight / 2 - 2,
        w: textWidth + 4,
        h: textHeight + 4,
      };

      const overlaps = placedLabels.some(r =>
        labelRect.x < r.x + r.w &&
        labelRect.x + labelRect.w > r.x &&
        labelRect.y < r.y + r.h &&
        labelRect.y + labelRect.h > r.y
      );

      if (overlaps) continue;

      // Skip labels that are too small to read
      if (fontSize < 8) continue;

      placedLabels.push(labelRect);

      // Draw text with outline for readability
      ctx.strokeStyle = this.theme.ocean;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.strokeText(name, x, y);

      ctx.fillStyle = this.theme.textPrimary;
      ctx.globalAlpha = 0.7;
      ctx.fillText(name, x, y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private approxArea(feature: Feature<Polygon | MultiPolygon>): number {
    // Quick bounding-box area approximation
    const coords = feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates[0]?.[0] ?? [];

    if (coords.length === 0) return 0;

    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return (maxLng - minLng) * (maxLat - minLat);
  }

  private drawTimezoneLines(
    ctx: CanvasRenderingContext2D,
    zones: Array<{ offset: number; lng: number; label: string }>,
    height: number
  ) {
    ctx.save();
    ctx.strokeStyle = this.theme.gridLine;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);

    for (const zone of zones) {
      const projected = this.projection([zone.lng, 0]);
      if (!projected) continue;
      const x = projected[0];

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawTimezoneLabels(
    ctx: CanvasRenderingContext2D,
    zones: Array<{ offset: number; lng: number; label: string }>,
    date: Date,
    width: number,
    height: number
  ) {
    const fontSize = Math.max(10, Math.min(13, width / 160));
    ctx.save();
    ctx.font = `${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';

    // Track placed pill extents to avoid overlaps at edges
    const placed: Array<{ left: number; right: number }> = [];

    for (const zone of zones) {
      const projected = this.projection([zone.lng, 0]);
      if (!projected) continue;
      const x = projected[0];

      // Skip labels outside visible area (with small margin)
      if (x < -10 || x > width + 10) continue;

      const time = getTimeForOffset(date, zone.offset);
      const isUTC = zone.offset === 0;

      const label1 = zone.label;
      const label2 = time;
      const pillWidth = Math.max(ctx.measureText(label1).width, ctx.measureText(label2).width) + 10;
      const pillHeight = fontSize * 2 + 8;
      const pillY = height - pillHeight - 4;

      // Clamp so the pill stays fully within the canvas
      const halfPill = pillWidth / 2;
      const clampedX = Math.max(halfPill, Math.min(width - halfPill, x));

      // Skip if this pill would overlap a previously placed one
      const myLeft = clampedX - halfPill;
      const myRight = clampedX + halfPill;
      const overlaps = placed.some(p => myLeft < p.right + 2 && myRight > p.left - 2);
      if (overlaps) continue;

      placed.push({ left: myLeft, right: myRight });

      // Background pill
      ctx.fillStyle = isUTC ? this.theme.tzHighlight : this.theme.uiBackground;
      ctx.globalAlpha = isUTC ? 0.9 : 0.7;
      this.roundRect(ctx, myLeft, pillY, pillWidth, pillHeight, 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Text
      ctx.fillStyle = isUTC ? '#000000' : this.theme.textPrimary;
      ctx.font = `bold ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillText(label1, clampedX, pillY + fontSize + 2);

      ctx.font = `${fontSize}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillStyle = isUTC ? '#333333' : this.theme.textSecondary;
      ctx.fillText(label2, clampedX, pillY + fontSize * 2 + 4);
    }

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
