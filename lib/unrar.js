/**
 * Adapter for unrar-js to replace node-unrar-js.
 * Maps the unrar-js API to the interface expected by archiveService.ts.
 */

import * as unrarModule from 'unrar-js';

// Robustly resolve the factory function to handle esm.sh export variations
const getFactory = () => {
  // Try named export
  if (typeof unrarModule.createExtractorFromData === 'function') {
    return unrarModule.createExtractorFromData;
  }
  // Try default export property (common in CJS/ESM interop)
  if (unrarModule.default && typeof unrarModule.default.createExtractorFromData === 'function') {
    return unrarModule.default.createExtractorFromData;
  }
  // Try default export as the function itself
  if (typeof unrarModule.default === 'function') {
    return unrarModule.default;
  }
  return null;
};

const createExtractorFactory = getFactory();

export default {
  createExtractorFromData: async ({ data, password = undefined }) => {
    if (!createExtractorFactory) {
      console.error("unrar-js module exports:", unrarModule);
      throw new Error("RAR library failed to load: createExtractorFromData not found in exports.");
    }

    try {
      // unrar-js expects a Uint8Array or ArrayBuffer
      const buffer = data.buffer || data;
      
      // Initialize the extractor
      const extractor = await createExtractorFactory({ 
        data: buffer, 
        password: password 
      });

      return {
        // Mock getFileList for encryption check compatibility.
        // unrar-js 0.2.3's high-level API is focused on extraction.
        // We return a safe default here, relying on extractAll below to throw "ENCRYPTED"
        // if the password is missing or incorrect, which App.tsx handles.
        getFileList: () => {
           return { arcHeader: { encryption: false } };
        },
        extractAll: async () => {
          // extractAll returns [state, result]
          const [state, result] = extractor.extractAll();

          // Check if encryption bit (0x04) is set in any file header
          const filesRaw = result && result.files ? result.files : [];
          
          // RAR 4.x/5.0 encryption check
          const hasEncryptedFile = filesRaw.some(f => f.fileHeader.flags & 0x04);
          
          // Throw specific error for App.tsx to catch and show password dialog
          if (hasEncryptedFile && !password) {
             throw new Error("ENCRYPTED");
          }
          
          // Map unrar-js structure to what our app expects
          const files = filesRaw.map(f => {
            return {
              file: {
                name: f.fileHeader.name,
                directory: f.fileHeader.isDirectory
              },
              extraction: f.extraction // Uint8Array
            };
          });

          return { files };
        }
      };

    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("password") || msg.toLowerCase().includes("encrypted")) {
        throw new Error("ENCRYPTED");
      }
      throw e;
    }
  }
};