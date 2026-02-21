import { geoPath, type GeoProjection } from 'd3-geo';
import type { LayerManager } from './LayerManager';
import type { Theme } from '../types';
import { getNightGeoJSON, getTwilightGeoJSON, getSubSolarPoint } from '../astro/terminator';

export class TerminatorLayer {
  private lm: LayerManager;
  private theme: Theme;
  private projection: GeoProjection;
  private showTwilight: boolean;

  constructor(lm: LayerManager, theme: Theme, projection: GeoProjection, showTwilight = true) {
    this.lm = lm;
    this.theme = theme;
    this.projection = projection;
    this.showTwilight = showTwilight;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  setProjection(projection: GeoProjection) {
    this.projection = projection;
  }

  setShowTwilight(show: boolean) {
    this.showTwilight = show;
  }

  draw(date: Date) {
    const { ctx } = this.lm.getLayer('terminator');
    const { width, height } = this.lm;

    this.lm.clear('terminator');

    const path = geoPath(this.projection, ctx);

    // Draw twilight bands (outermost first, so inner layers paint over)
    if (this.showTwilight) {
      // Astronomical twilight (outermost, lightest)
      const astroGeo = getTwilightGeoJSON(date, 'astronomical');
      ctx.beginPath();
      path(astroGeo);
      ctx.fillStyle = this.theme.twilightAstro;
      ctx.fill();

      // Nautical twilight
      const nautGeo = getTwilightGeoJSON(date, 'nautical');
      ctx.beginPath();
      path(nautGeo);
      ctx.fillStyle = this.theme.twilightNautical;
      ctx.fill();

      // Civil twilight
      const civilGeo = getTwilightGeoJSON(date, 'civil');
      ctx.beginPath();
      path(civilGeo);
      ctx.fillStyle = this.theme.twilightCivil;
      ctx.fill();
    }

    // Draw night overlay
    const nightGeo = getNightGeoJSON(date);
    ctx.beginPath();
    path(nightGeo);
    ctx.fillStyle = this.theme.nightOverlay;
    ctx.fill();

    // Draw sub-solar point marker
    const subSolar = getSubSolarPoint(date);
    const projected = this.projection([subSolar.lng, subSolar.lat]);
    if (projected) {
      const [x, y] = projected;
      // Only draw if within visible bounds
      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        this.drawSunMarker(ctx, x, y);
      }
    }
  }

  private drawSunMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const r = 6;

    // Glow
    ctx.save();
    ctx.shadowColor = this.theme.sunMarker;
    ctx.shadowBlur = 12;

    // Sun disc
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.theme.sunMarker;
    ctx.fill();

    // Rays
    ctx.strokeStyle = this.theme.sunMarker;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (r + 3), y + Math.sin(angle) * (r + 3));
      ctx.lineTo(x + Math.cos(angle) * (r + 8), y + Math.sin(angle) * (r + 8));
      ctx.stroke();
    }

    ctx.restore();
  }
}
