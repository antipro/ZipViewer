/**
 * Adapter for unrar-js (Pure JS) v0.2.3.
 * Uses a bundled build and robust detection to handle CDN-specific ESM wrapping.
 */
import * as unrarModule from 'https://esm.sh/unrar-js@0.2.3?bundle';

function getUnrarConstructor() {
  if (!unrarModule) return null;
  
  // Try named export first (standard ESM)
  if (unrarModule.Unrar) return unrarModule.Unrar;
  
  // Try default export if it's the class itself
  if (typeof unrarModule.default === 'function') return unrarModule.default;
  
  // Try default export if it's an object containing the class (CommonJS interop)
  if (unrarModule.default && unrarModule.default.Unrar) return unrarModule.default.Unrar;

  return null;
}

const UnrarClass = getUnrarConstructor();

export default {
  /**
   * Creates an extractor compatible with the existing archiveService API.
   */
  createExtractorFromData: async ({ data, password = undefined }) => {
    if (!UnrarClass) {
      throw new Error("unrar_lib_missing: Could not resolve Unrar constructor from module.");
    }

    try {
      const buffer = data instanceof Uint8Array ? data.buffer : data;
      // Explicitly use the new keyword on the resolved constructor
      const extractor = new UnrarClass(buffer);

      return {
        getFileList: () => {
          try {
            const list = extractor.getFileList();
            return {
              arcHeader: {
                encryption: list?.arcHeader?.encryption || false
              },
              files: list?.names || []
            };
          } catch (e) {
            return { arcHeader: { encryption: true }, files: [] };
          }
        },

        extractAll: async () => {
          const list = extractor.getFileList();
          const fileNames = list?.names || [];
          const files = [];

          for (const name of fileNames) {
            try {
              const extracted = extractor.extract(name, password);
              if (extracted && (extracted.state === 'SUCCESS' || extracted.state === 0)) {
                files.push({
                  file: { name, directory: false },
                  extraction: extracted.data
                });
              } else if (extracted && extracted.state === 'FAIL') {
                throw new Error("ENCRYPTED");
              }
            } catch (err) {
              const msg = (err.message || "").toLowerCase();
              if (msg.includes("password") || msg.includes("encrypted")) {
                throw new Error("ENCRYPTED");
              }
              console.warn(`Extraction skip: ${name}`, err);
            }
          }
          return { files };
        }
      };
    } catch (e) {
      const msg = (e.message || "").toLowerCase();
      if (msg.includes("password") || msg.includes("encrypted") || msg.includes("fail to open")) {
        throw new Error("ENCRYPTED");
      }
      throw new Error(`RAR Library Error: ${e.message}`);
    }
  }
};
