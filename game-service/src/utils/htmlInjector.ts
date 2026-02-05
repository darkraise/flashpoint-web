/**
 * HTML Injector - Injects polyfills and shims into HTML files
 * for better compatibility with Unity WebGL and other game engines
 */

/**
 * Unity WebGL polyfills
 * These are minimal stubs to prevent errors when Unity games load
 */
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

/**
 * General game polyfills
 * These help with compatibility for various game engines
 */
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

/**
 * Check if HTML content needs Unity polyfills
 */
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

/**
 * Inject polyfills into HTML content
 * Adds necessary polyfills in the <head> section before other scripts load
 */
export function injectPolyfills(html: Buffer | string): Buffer {
  let htmlString = Buffer.isBuffer(html) ? html.toString('utf-8') : html;

  // Check if this is actually HTML
  if (!htmlString.includes('<html') && !htmlString.includes('<head')) {
    // Not an HTML file, return as-is
    return Buffer.from(htmlString);
  }

  let polyfillsToInject = '';

  // Add Unity polyfills if needed
  if (needsUnityPolyfills(htmlString)) {
    polyfillsToInject += UNITY_POLYFILLS;
    console.log('[HTMLInjector] Injecting Unity WebGL polyfills');
  }

  // Always add general polyfills for compatibility
  polyfillsToInject += GENERAL_POLYFILLS;

  // If no polyfills needed, return original
  if (!polyfillsToInject) {
    return Buffer.from(htmlString);
  }

  // Try to inject into <head> tag
  const headMatch = htmlString.match(/<head[^>]*>/i);
  if (headMatch) {
    const headOpenTag = headMatch[0];
    const insertPosition = htmlString.indexOf(headOpenTag) + headOpenTag.length;
    htmlString =
      htmlString.slice(0, insertPosition) + polyfillsToInject + htmlString.slice(insertPosition);
  } else {
    // No <head> tag, try to inject after <html>
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
      // No <html> or <head> tag, prepend to entire content
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
