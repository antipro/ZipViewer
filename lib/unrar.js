/**
 * Adapter for node-unrar-js (WASM) to replace unrar-js.
 * Maps the node-unrar-js API to the interface expected by archiveService.ts.
 */

import * as unrarModule from 'node-unrar-js';

// Robustly resolve the factory function to handle esm.sh export variations
const getFactory = () => {
  if (typeof unrarModule.createExtractorFromData === 'function') {
    return unrarModule.createExtractorFromData;
  }
  if (unrarModule.default && typeof unrarModule.default.createExtractorFromData === 'function') {
    return unrarModule.default.createExtractorFromData;
  }
  if (typeof unrarModule.default === 'function') {
    return unrarModule.default;
  }
  // Try named export on default object
  if (unrarModule.default && unrarModule.default.default && typeof unrarModule.default.default.createExtractorFromData === 'function') {
      return unrarModule.default.default.createExtractorFromData;
  }
  return null;
};

const createExtractorFactory = getFactory();

export default {
  createExtractorFromData: async ({ data, password = undefined }) => {
    if (!createExtractorFactory) {
      console.error("node-unrar-js module exports:", unrarModule);
      throw new Error("RAR library failed to load: createExtractorFromData not found.");
    }

    try {
      // node-unrar-js expects ArrayBuffer or Uint8Array
      const buffer = data.buffer || data;
      
      // Initialize the extractor
      const extractor = await createExtractorFactory({ 
        data: buffer, 
        password: password 
      });

      return {
        getFileList: () => {
          try {
            // .getFileList() returns a generator
            const list = [...extractor.getFileList()];
            const hasEncrypted = list.some(f => f.flags && f.flags.encrypted);
            return { arcHeader: { encryption: hasEncrypted } };
          } catch (e) {
            return { arcHeader: { encryption: true } };
          }
        },
        extractAll: async () => {
          const list = [...extractor.getFileList()];
          const hasEncryptedFile = list.some(f => f.flags && f.flags.encrypted);
          
          if (hasEncryptedFile && !password) {
             throw new Error("ENCRYPTED");
          }

          const result = extractor.extract({ files: list.map(f => f.name) });
          
          const files = [];
          for (const extractedFile of result.files) {
             files.push({
               file: {
                 name: extractedFile.fileHeader.name,
                 directory: extractedFile.fileHeader.flags.directory
               },
               extraction: extractedFile.extraction
             });
          }

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