import { logger } from '../../utils/logger';

/** Minimal stubs to prevent errors when Unity games load */
const UNITY_POLYFILLS = `
<script>
// Unity WebGL Polyfills
// Prevent errors when UnityProgress is called but not defined

window.UnityProgress = window.UnityProgress || function(gameInstance, progress) {
  // Stub function - Unity games expect this to exist
  // Progress is a number between 0 and 1
  if (!gameInstance.Module) return;
  if (!gameInstance.progress) {
    gameInstance.progress = { loaded: 0, total: 1 };
  }
  gameInstance.progress.loaded = progress;
  if (progress === 1) {
    console.log('[Unity] Game loaded successfully');
  }
};

// Unity 2020+ expects this function
window.createUnityInstance = window.createUnityInstance || function(canvas, config) {
  return new Promise((resolve) => {
    console.log('[Unity] createUnityInstance called - using polyfill');
    resolve({
      Module: {},
      SetFullscreen: function() {},
      SendMessage: function() {},
      Quit: function() { return Promise.resolve(); }
    });
  });
};

// Suppress Unity warning about missing unityFramework.js
if (typeof UnityLoader2020 === 'undefined') {
  window.UnityLoader2020 = {
    Error: {
      handler: function(message, filename, lineno) {
        console.warn('[Unity] Error:', message, 'at', filename + ':' + lineno);
        return true; // Prevent default error handling
      }
    }
  };
}
</script>
`;

/** Compatibility polyfills for various game engines */
const GENERAL_POLYFILLS = `
<script>
// General game compatibility polyfills

// Prevent errors from missing window.external
if (typeof window.external === 'undefined') {
  window.external = {};
}

// Polyfill for browsers without Web Audio API
if (typeof AudioContext === 'undefined' && typeof webkitAudioContext !== 'undefined') {
  window.AudioContext = webkitAudioContext;
}
</script>
`;

function needsUnityPolyfills(html: string): boolean {
  const unityIndicators = [
    /UnityProgress/i,
    /UnityLoader/i,
    /createUnityInstance/i,
    /unityFramework\.js/i,
    /Build\/.*\.loader\.js/i,
    /UnityEngine/i,
  ];

  return unityIndicators.some((pattern) => pattern.test(html));
}

/** Injects polyfills into the <head> section before other scripts load */
export function injectPolyfills(html: Buffer | string): Buffer {
  let htmlString = Buffer.isBuffer(html) ? html.toString('utf-8') : html;

  if (!htmlString.includes('<html') && !htmlString.includes('<head')) {
    return Buffer.from(htmlString);
  }

  let polyfillsToInject = '';

  if (needsUnityPolyfills(htmlString)) {
    polyfillsToInject += UNITY_POLYFILLS;
    logger.debug('[HTMLInjector] Injecting Unity WebGL polyfills');
  }

  polyfillsToInject += GENERAL_POLYFILLS;

  const headMatch = htmlString.match(/<head[^>]*>/i);
  if (headMatch) {
    const headOpenTag = headMatch[0];
    const insertPosition = htmlString.indexOf(headOpenTag) + headOpenTag.length;
    htmlString =
      htmlString.slice(0, insertPosition) + polyfillsToInject + htmlString.slice(insertPosition);
  } else {
    const htmlMatch = htmlString.match(/<html[^>]*>/i);
    if (htmlMatch) {
      const htmlOpenTag = htmlMatch[0];
      const insertPosition = htmlString.indexOf(htmlOpenTag) + htmlOpenTag.length;
      htmlString =
        htmlString.slice(0, insertPosition) +
        '<head>' +
        polyfillsToInject +
        '</head>' +
        htmlString.slice(insertPosition);
    } else {
      htmlString =
        '<!DOCTYPE html><html><head>' +
        polyfillsToInject +
        '</head><body>' +
        htmlString +
        '</body></html>';
    }
  }

  return Buffer.from(htmlString, 'utf-8');
}
