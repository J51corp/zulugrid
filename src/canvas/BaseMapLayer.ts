import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { LayerManager } from './LayerManager';
import type { Theme } from '../types';
import { bus } from '../events';

// We'll load TopoJSON via fetch (Vite resolves the import to a URL)
import countriesUrl from 'world-atlas/countries-110m.json?url';

interface CountryProperties {
  name: string;
}

export class BaseMapLayer {
  private lm: LayerManager;
  private theme: Theme;
  private projection!: GeoProjection;
  private countries: FeatureCollection<Polygon | MultiPolygon, CountryProperties> | null = null;
  private cachedBitmap: ImageBitmap | null = null;
  private scrollOffset = 0;

  constructor(lm: LayerManager, theme: Theme) {
    this.lm = lm;
    this.theme = theme;
    this.setupProjection();

    bus.on('resize', () => {
      this.cachedBitmap = null;
      this.setupProjection();
      this.draw();
    });
  }

  private setupProjection() {
    const { width, height } = this.lm;
    // Scale so that 360° of longitude fills the full canvas width.
    // Mercator: scale = width / (2π) maps 360° to width pixels.
    const scale = width / (2 * Math.PI);
    this.projection = geoMercator()
      .center([this.scrollOffset, 0])
      .scale(scale)
      .translate([width / 2, height / 2]);
  }

  async load() {
    const resp = await fetch(countriesUrl);
    const topo = (await resp.json()) as Topology<{ countries: GeometryCollection<CountryProperties> }>;
    this.countries = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Polygon | MultiPolygon, CountryProperties>;
    this.draw();
  }

  getProjection(): GeoProjection {
    return this.projection;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.cachedBitmap = null;
    this.draw();
  }

  setScrollOffset(offset: number) {
    this.scrollOffset = offset;
    this.cachedBitmap = null;
    this.setupProjection();
    this.draw();
  }

  draw() {
    if (!this.countries) return;

    const { ctx, canvas } = this.lm.getLayer('baseMap');
    const { width, height } = this.lm;

    this.lm.clear('baseMap');

    // Draw ocean
    ctx.fillStyle = this.theme.ocean;
    ctx.fillRect(0, 0, width, height);

    // Draw countries
    const path = geoPath(this.projection, ctx);

    this.countries.features.forEach((feat, i) => {
      ctx.beginPath();
      path(feat);
      ctx.fillStyle = this.theme.land[i % this.theme.land.length];
      ctx.fill();

      if (this.theme.borderWidth > 0) {
        ctx.strokeStyle = this.theme.border;
        ctx.lineWidth = this.theme.borderWidth;
        ctx.stroke();
      }
    });

    // Cache bitmap for fast redraws
    if (typeof createImageBitmap !== 'undefined') {
      createImageBitmap(canvas).then(bmp => {
        this.cachedBitmap = bmp;
      }).catch(() => { /* ignore */ });
    }
  }

  drawFromCache(): boolean {
    if (!this.cachedBitmap) return false;
    const { ctx } = this.lm.getLayer('baseMap');
    this.lm.clear('baseMap');
    ctx.drawImage(this.cachedBitmap, 0, 0, this.lm.width, this.lm.height);
    return true;
  }
}
