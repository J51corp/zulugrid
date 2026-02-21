import type { GeoProjection } from 'd3-geo';
import type { LayerManager } from './LayerManager';
import type { Theme } from '../types';
import { getTimezoneOffsets, getTimeForOffset } from '../astro/timezones';

export class OverlayLayer {
  private lm: LayerManager;
  private theme: Theme;
  private projection: GeoProjection;
  private showGrid: boolean;
  private showLabels: boolean;

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

  draw(date: Date) {
    const { ctx } = this.lm.getLayer('overlays');
    const { width, height } = this.lm;

    this.lm.clear('overlays');

    const zones = getTimezoneOffsets();

    if (this.showGrid) {
      this.drawTimezoneLines(ctx, zones, height);
    }

    if (this.showLabels) {
      this.drawTimezoneLabels(ctx, zones, date, width, height);
    }
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

    for (const zone of zones) {
      const projected = this.projection([zone.lng, 0]);
      if (!projected) continue;
      const x = projected[0];

      // Skip labels far outside visible area
      if (x < -30 || x > width + 30) continue;
      // Clamp position so labels don't overflow the viewport
      const clampedX = Math.max(25, Math.min(width - 25, x));

      const time = getTimeForOffset(date, zone.offset);
      const isUTC = zone.offset === 0;

      // Background pill
      const label1 = zone.label;
      const label2 = time;
      const pillWidth = Math.max(ctx.measureText(label1).width, ctx.measureText(label2).width) + 10;
      const pillHeight = fontSize * 2 + 8;
      const pillY = height - pillHeight - 4;

      ctx.fillStyle = isUTC ? this.theme.tzHighlight : this.theme.uiBackground;
      ctx.globalAlpha = isUTC ? 0.9 : 0.7;
      this.roundRect(ctx, clampedX - pillWidth / 2, pillY, pillWidth, pillHeight, 3);
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
