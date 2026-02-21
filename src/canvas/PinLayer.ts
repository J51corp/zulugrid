import type { GeoProjection } from 'd3-geo';
import type { LayerManager } from './LayerManager';
import type { Theme, Pin } from '../types';
import { formatTimeInZone } from '../astro/timezones';

export class PinLayer {
  private lm: LayerManager;
  private theme: Theme;
  private projection: GeoProjection;
  private pins: readonly Pin[] = [];

  constructor(lm: LayerManager, theme: Theme, projection: GeoProjection) {
    this.lm = lm;
    this.theme = theme;
    this.projection = projection;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  setProjection(projection: GeoProjection) {
    this.projection = projection;
  }

  setPins(pins: readonly Pin[]) {
    this.pins = pins;
  }

  draw(date: Date) {
    const { ctx } = this.lm.getLayer('pins');
    const { width, height } = this.lm;

    this.lm.clear('pins');

    for (const pin of this.pins) {
      const projected = this.projection([pin.lng, pin.lat]);
      if (!projected) continue;

      const [x, y] = projected;

      // Skip if outside visible bounds
      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;

      this.drawPin(ctx, x, y, pin, date);
    }
  }

  private drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, pin: Pin, date: Date) {
    const localTime = formatTimeInZone(date, pin.timezone);

    ctx.save();

    // Pin marker - teardrop shape
    const r = 4;
    ctx.fillStyle = this.theme.pinColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(x, y - r * 1.5, r, Math.PI * 0.8, Math.PI * 0.2);
    ctx.lineTo(x, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y - r * 1.5, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Label background
    const fontSize = 10;
    const timeSize = 9;
    ctx.font = `bold ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    const nameWidth = ctx.measureText(pin.name).width;
    ctx.font = `${timeSize}px 'Consolas', monospace`;
    const timeWidth = ctx.measureText(localTime).width;
    const labelWidth = Math.max(nameWidth, timeWidth) + 8;
    const labelHeight = fontSize + timeSize + 8;
    const labelX = x + 8;
    const labelY = y - r * 2 - labelHeight / 2;

    // Background
    ctx.fillStyle = this.theme.uiBackground;
    ctx.globalAlpha = 0.85;
    this.roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Name
    ctx.font = `bold ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = this.theme.pinLabelColor;
    ctx.textAlign = 'left';
    ctx.fillText(pin.name, labelX + 4, labelY + fontSize + 2);

    // Local time
    ctx.font = `${timeSize}px 'Consolas', monospace`;
    ctx.fillStyle = this.theme.textSecondary;
    ctx.fillText(localTime, labelX + 4, labelY + fontSize + timeSize + 5);

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
