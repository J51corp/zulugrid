import { bus } from '../events';
import type { LayerName } from '../types';

export interface LayerContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/**
 * Manages the 5 stacked canvas layers. Handles initialization and
 * responsive resizing via ResizeObserver.
 */
export class LayerManager {
  readonly layers: Record<LayerName, LayerContext>;
  private container: HTMLDivElement;
  private resizeObserver: ResizeObserver;
  private _width = 0;
  private _height = 0;

  get width() { return this._width; }
  get height() { return this._height; }

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLDivElement;

    const names: LayerName[] = ['baseMap', 'terminator', 'overlays', 'pins', 'ui'];
    this.layers = {} as Record<LayerName, LayerContext>;

    for (const name of names) {
      const canvas = document.getElementById(name) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
      this.layers[name] = { canvas, ctx };
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.resize(width, height);
      }
    });
    this.resizeObserver.observe(this.container);

    // Initial size
    const rect = this.container.getBoundingClientRect();
    this.resize(rect.width, rect.height);
  }

  private resize(width: number, height: number) {
    // Use device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(width);
    const h = Math.floor(height);

    if (w === this._width && h === this._height) return;

    this._width = w;
    this._height = h;

    for (const layer of Object.values(this.layers)) {
      layer.canvas.width = w * dpr;
      layer.canvas.height = h * dpr;
      layer.canvas.style.width = `${w}px`;
      layer.canvas.style.height = `${h}px`;
      layer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    bus.emit('resize', { width: w, height: h });
  }

  getLayer(name: LayerName): LayerContext {
    return this.layers[name];
  }

  clear(name: LayerName) {
    const { ctx } = this.layers[name];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.layers[name].canvas.width, this.layers[name].canvas.height);
    ctx.restore();
  }

  destroy() {
    this.resizeObserver.disconnect();
  }
}
