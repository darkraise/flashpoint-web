declare module '@ruffle-rs/ruffle' {
  export interface RufflePlayer extends HTMLElement {
    load(url: string | URLLoadOptions): Promise<void>;
    destroy(): void;
    config: {
      autoplay?: 'auto' | 'on' | 'off';
      backgroundColor?: string;
      letterbox?: 'on' | 'off' | 'fullscreen';
      unmuteOverlay?: 'visible' | 'hidden';
      contextMenu?: boolean | 'on' | 'off' | 'rightClickOnly';
      showSwfDownload?: boolean;
      upgradeToHttps?: boolean;
      warnOnUnsupportedContent?: boolean;
      logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
      scale?: 'exactfit' | 'noborder' | 'showall' | 'noscale';
      forceScale?: boolean;
      publicPath?: string;
      quality?: 'low' | 'medium' | 'high' | 'best';
      allowScriptAccess?: 'always' | 'sameDomain' | 'never';
      salign?: string;
      wmode?: 'window' | 'direct' | 'opaque' | 'transparent' | 'gpu';
    };
  }

  export interface URLLoadOptions {
    url: string;
    parameters?: string;
    base?: string;
  }

  export interface RuffleBuilder {
    createPlayer(): RufflePlayer;
  }

  export interface SourceAPI {
    newest(): RuffleBuilder | null;
  }

  export const SourceAPI: SourceAPI;
}
