import type { LayerManager } from './LayerManager';
import type { Theme } from '../types';
import { formatUTC, formatDate } from '../astro/timezones';

export class UILayer {
  private lm: LayerManager;
  private theme: Theme;
  private isDemoMode = false;
  private brandingLogo: HTMLImageElement | null = null;
  private brandingTitle = '';
  private showWatermark = true;

  constructor(lm: LayerManager, theme: Theme) {
    this.lm = lm;
    this.theme = theme;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  setDemoMode(active: boolean) {
    this.isDemoMode = active;
  }

  setBranding(logo: string | null, title: string) {
    this.brandingTitle = title;
    if (logo) {
      const img = new Image();
      img.onload = () => {
        this.brandingLogo = img;
      };
      img.onerror = () => {
        this.brandingLogo = null;
      };
      img.src = logo;
    } else {
      this.brandingLogo = null;
    }
  }

  setShowWatermark(show: boolean) {
    this.showWatermark = show;
  }

  draw(date: Date) {
    const { ctx } = this.lm.getLayer('ui');
    const { width, height } = this.lm;

    this.lm.clear('ui');

    this.drawClock(ctx, date, width, height);
    this.drawDateDisplay(ctx, date, width, height);

    if (this.isDemoMode) {
      this.drawDemoBadge(ctx, width);
    }

    if (this.brandingLogo || this.brandingTitle) {
      this.drawBranding(ctx, width, height);
    }

    if (this.showWatermark) {
      this.drawWatermark(ctx, width, height);
    }

    this.drawSettingsIcon(ctx, width);
  }

  private drawClock(ctx: CanvasRenderingContext2D, date: Date, width: number, _height: number) {
    const utcStr = formatUTC(date);
    const fontSize = Math.max(20, Math.min(36, width / 50));

    // UTC clock - top left
    ctx.save();

    // Background
    const padding = 12;
    const labelSize = fontSize * 0.4;
    const totalHeight = fontSize + labelSize + 8;
    const textWidth = ctx.measureText(utcStr).width || fontSize * 4;

    ctx.fillStyle = this.theme.uiBackground;
    this.roundRect(ctx, 12, 12, textWidth + padding * 2 + 20, totalHeight + padding * 2, 6);
    ctx.fill();

    // "UTC / ZULU" label
    ctx.font = `bold ${labelSize}px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = this.theme.textMuted;
    ctx.textAlign = 'left';
    ctx.fillText('UTC / ZULU', 12 + padding, 12 + padding + labelSize);

    // Time
    ctx.font = `bold ${fontSize}px 'Consolas', 'Courier New', monospace`;
    ctx.fillStyle = this.theme.textPrimary;
    ctx.fillText(utcStr, 12 + padding, 12 + padding + labelSize + 6 + fontSize * 0.85);

    ctx.restore();

    // Local time - below UTC
    const localStr = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const localFontSize = fontSize * 0.6;
    const localY = 12 + totalHeight + padding * 2 + 8;

    ctx.save();
    ctx.fillStyle = this.theme.uiBackground;
    const localWidth = localFontSize * 5 + padding * 2;
    this.roundRect(ctx, 12, localY, localWidth, localFontSize + labelSize + padding * 2 + 4, 6);
    ctx.fill();

    ctx.font = `bold ${labelSize}px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = this.theme.textMuted;
    ctx.textAlign = 'left';
    ctx.fillText('LOCAL', 12 + padding, localY + padding + labelSize);

    ctx.font = `bold ${localFontSize}px 'Consolas', 'Courier New', monospace`;
    ctx.fillStyle = this.theme.textSecondary;
    ctx.fillText(localStr, 12 + padding, localY + padding + labelSize + 4 + localFontSize * 0.85);
    ctx.restore();
  }

  private drawDateDisplay(ctx: CanvasRenderingContext2D, date: Date, width: number, _height: number) {
    const dateStr = formatDate(date);
    const fontSize = Math.max(12, Math.min(16, width / 100));

    ctx.save();
    ctx.font = `${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = this.theme.textSecondary;
    ctx.textAlign = 'right';

    // Top right area (leaving room for settings icon)
    ctx.fillStyle = this.theme.uiBackground;
    const textMetrics = ctx.measureText(dateStr);
    const padding = 8;
    this.roundRect(
      ctx,
      width - textMetrics.width - padding * 2 - 50,
      12,
      textMetrics.width + padding * 2,
      fontSize + padding * 2,
      4
    );
    ctx.fill();

    ctx.fillStyle = this.theme.textSecondary;
    ctx.fillText(dateStr, width - padding - 50, 12 + padding + fontSize * 0.85);
    ctx.restore();
  }

  private drawDemoBadge(ctx: CanvasRenderingContext2D, width: number) {
    const fontSize = 14;
    const text = 'DEMO MODE';
    const padding = 8;

    ctx.save();
    ctx.font = `bold ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    const tw = ctx.measureText(text).width;

    const x = (width - tw) / 2 - padding;
    const y = 12;

    ctx.fillStyle = 'rgba(200, 50, 50, 0.85)';
    this.roundRect(ctx, x, y, tw + padding * 2, fontSize + padding * 2, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, y + padding + fontSize * 0.85);
    ctx.restore();
  }

  private drawBranding(ctx: CanvasRenderingContext2D, _width: number, height: number) {
    ctx.save();
    const padding = 16;
    let x = padding;
    const y = height - padding;

    // Logo
    if (this.brandingLogo) {
      const logoHeight = 40;
      const logoWidth = (this.brandingLogo.naturalWidth / this.brandingLogo.naturalHeight) * logoHeight;
      ctx.drawImage(this.brandingLogo, x, y - logoHeight, logoWidth, logoHeight);
      x += logoWidth + 10;
    }

    // Title
    if (this.brandingTitle) {
      const fontSize = 16;
      ctx.font = `bold ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillStyle = this.theme.textPrimary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.brandingTitle, x, y);
    }

    ctx.restore();
  }

  private drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.font = `11px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = this.theme.textMuted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('ZuluGrid', width - 12, height - 8);
    ctx.restore();
  }

  private drawSettingsIcon(ctx: CanvasRenderingContext2D, width: number) {
    const x = width - 28;
    const y = 28;
    const r = 10;

    ctx.save();
    ctx.strokeStyle = this.theme.textMuted;
    ctx.lineWidth = 1.5;

    // Gear icon - outer circle with teeth
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Gear teeth (6 lines radiating outward)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (r - 2), y + Math.sin(angle) * (r - 2));
      ctx.lineTo(x + Math.cos(angle) * (r + 3), y + Math.sin(angle) * (r + 3));
      ctx.stroke();
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
