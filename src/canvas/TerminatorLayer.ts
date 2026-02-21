import { geoPath, type GeoProjection } from 'd3-geo';
import type { LayerManager } from './LayerManager';
import type { Theme } from '../types';
import { getNightGeoJSON, getTwilightGeoJSON, getSubSolarPoint } from '../astro/terminator';
import { getSubLunarPoint, getMoonPhase } from '../astro/lunar';

export class TerminatorLayer {
  private lm: LayerManager;
  private theme: Theme;
  private projection: GeoProjection;
  private showTwilight: boolean;
  private showMoon = true;

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

  setShowMoon(show: boolean) {
    this.showMoon = show;
  }

  draw(date: Date) {
    const { ctx } = this.lm.getLayer('terminator');
    const { width, height } = this.lm;

    this.lm.clear('terminator');

    // Pre-compute GeoJSON once, then draw with wrapping offsets
    const nightGeo = getNightGeoJSON(date);
    const twilightGeos = this.showTwilight ? {
      astro: getTwilightGeoJSON(date, 'astronomical'),
      naut: getTwilightGeoJSON(date, 'nautical'),
      civil: getTwilightGeoJSON(date, 'civil'),
    } : null;

    // Draw with wrapping: three copies offset by the full 360° map width.
    // 2π * scale gives the pixel width of 360° at the current zoom.
    const mapWidth = 2 * Math.PI * (this.projection.scale?.() ?? width / (2 * Math.PI));
    for (const dx of [-mapWidth, 0, mapWidth]) {
      ctx.save();
      ctx.translate(dx, 0);

      const path = geoPath(this.projection, ctx);

      // Draw twilight bands (outermost first, so inner layers paint over)
      if (twilightGeos) {
        ctx.beginPath();
        path(twilightGeos.astro);
        ctx.fillStyle = this.theme.twilightAstro;
        ctx.fill();

        ctx.beginPath();
        path(twilightGeos.naut);
        ctx.fillStyle = this.theme.twilightNautical;
        ctx.fill();

        ctx.beginPath();
        path(twilightGeos.civil);
        ctx.fillStyle = this.theme.twilightCivil;
        ctx.fill();
      }

      // Draw night overlay
      ctx.beginPath();
      path(nightGeo);
      ctx.fillStyle = this.theme.nightOverlay;
      ctx.fill();

      ctx.restore();
    }

    // Draw sub-solar point marker (no wrapping needed for single point)
    const subSolar = getSubSolarPoint(date);
    const projected = this.projection([subSolar.lng, subSolar.lat]);
    if (projected) {
      const [x, y] = projected;
      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        this.drawSunMarker(ctx, x, y);
      }
    }

    // Draw moon marker
    if (this.showMoon) {
      const subLunar = getSubLunarPoint(date);
      const moonProjected = this.projection([subLunar.lng, subLunar.lat]);
      if (moonProjected) {
        const [mx, my] = moonProjected;
        if (mx >= 0 && mx <= width && my >= 0 && my <= height) {
          const { fraction, phase } = getMoonPhase(date);
          this.drawMoonMarker(ctx, mx, my, fraction, phase);
        }
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

  private drawMoonMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fraction: number,
    phase: number
  ) {
    const r = 6;

    ctx.save();

    // Subtle glow
    ctx.shadowColor = this.theme.moonMarker;
    ctx.shadowBlur = 8;

    // Draw full disc in dark color (shadow side)
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#555555';
    ctx.fill();

    ctx.shadowBlur = 0;

    // Draw the lit portion using two arcs to create crescent effect
    // phase 0 = new (no lit), 0.25 = first quarter (right half lit),
    // 0.5 = full (all lit), 0.75 = last quarter (left half lit)
    ctx.beginPath();

    if (fraction < 0.01) {
      // New moon — no lit portion to draw
      ctx.restore();
      return;
    }

    if (fraction > 0.99) {
      // Full moon — entire disc is lit
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = this.theme.moonMarker;
      ctx.fill();
      ctx.restore();
      return;
    }

    // Determine which side is lit based on phase
    // phase 0-0.5: right side lit (waxing)
    // phase 0.5-1: left side lit (waning)
    const waxing = phase < 0.5;

    // The terminator curve is an ellipse whose x-radius varies with illumination
    // At quarter (fraction=0.5), terminator is a straight line (x-radius = 0)
    // At new/full, x-radius = r (full circle)
    const terminatorX = r * Math.abs(2 * fraction - 1) * (fraction > 0.5 ? 1 : -1);

    if (waxing) {
      // Right half semicircle (always lit when waxing)
      ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false);
      // Terminator curve back (ellipse from bottom to top)
      ctx.ellipse(x, y, Math.abs(terminatorX), r, 0, Math.PI / 2, -Math.PI / 2, fraction < 0.5);
    } else {
      // Left half semicircle (always lit when waning)
      ctx.arc(x, y, r, Math.PI / 2, -Math.PI / 2, false);
      // Terminator curve back
      ctx.ellipse(x, y, Math.abs(terminatorX), r, 0, -Math.PI / 2, Math.PI / 2, fraction < 0.5);
    }

    ctx.closePath();
    ctx.fillStyle = this.theme.moonMarker;
    ctx.fill();

    ctx.restore();
  }
}
