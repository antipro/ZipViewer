/**
 * Adapter for node-unrar-js with dynamic import to handle network failures/offline capability
 * for the heavy RAR library.
 */

const CDNS = [
  // Primary: esm.sh (Bundled)
  "https://esm.sh/node-unrar-js@2.0.3?bundle",
  // Fallback 1: Skypack (Optimized ESM)
  "https://cdn.skypack.dev/node-unrar-js@2.0.3",
  // Fallback 2: JSPM (Universal Module Loader)
  "https://jspm.dev/node-unrar-js@2.0.3"
];

async function loadLibrary() {
  let lastError;
  for (const url of CDNS) {
    try {
      const mod = await import(url);
      
      // Check for named export
      if (mod && typeof mod.createExtractorFromData === 'function') {
        return mod;
      }
      
      // Check for default export (Common pattern in CDN bundles)
      if (mod && mod.default && typeof mod.default.createExtractorFromData === 'function') {
        return mod.default;
      }

      console.warn(`Loaded module from ${url} but could not find createExtractorFromData`);
    } catch (e) {
      console.warn(`Failed to load RAR lib from ${url}:`, e);
      lastError = e;
    }
  }
  throw lastError || new Error("All CDN attempts failed to load a valid RAR library");
}

export default {
  createExtractorFromData: async (options) => {
    try {
      const mod = await loadLibrary();
      return await mod.createExtractorFromData(options);
    } catch (e) {
      console.error("RAR Library Load Error:", e);
      throw new Error("RAR_LIB_LOAD_FAILED");
    }
  }
};