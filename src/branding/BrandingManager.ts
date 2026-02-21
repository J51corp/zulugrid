import { bus } from '../events';
import type { UILayer } from '../canvas/UILayer';

export class BrandingManager {
  private uiLayer: UILayer;
  private logo: string | null = null;
  private title = '';

  constructor(uiLayer: UILayer) {
    this.uiLayer = uiLayer;

    bus.on('settings:changed', (partial) => {
      let changed = false;
      if (partial.brandingLogo !== undefined) {
        this.logo = partial.brandingLogo ?? null;
        changed = true;
      }
      if (partial.brandingTitle !== undefined) {
        this.title = partial.brandingTitle ?? '';
        changed = true;
      }
      if (partial.showWatermark !== undefined) {
        this.uiLayer.setShowWatermark(partial.showWatermark);
        changed = true;
      }
      if (changed) {
        this.uiLayer.setBranding(this.logo, this.title);
      }
    });
  }

  init(logo: string | null, title: string, showWatermark: boolean) {
    this.logo = logo;
    this.title = title;
    this.uiLayer.setBranding(this.logo, this.title);
    this.uiLayer.setShowWatermark(showWatermark);
  }
}
