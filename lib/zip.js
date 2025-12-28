/**
 * Adapter for @zip.js/zip.js to ensure full support for AES encryption (Method 99)
 * and all compression methods.
 */
import * as zip from "https://esm.sh/@zip.js/zip.js@2.7.53";

export default {
  ZipReader: class {
    constructor(reader, options = {}) {
      // The application passes a wrapper reader (BlobReader below), so we access the real instance
      this.reader = new zip.ZipReader(reader.instance, options);
    }
    
    async getEntries() {
      try {
        const entries = await this.reader.getEntries();
        return entries.map(entry => ({
          filename: entry.filename,
          directory: entry.directory,
          encrypted: entry.encrypted,
          // Adapter method to match the application's expected API
          getData: async () => {
            // The app expects a Uint8Array (which allows Blob creation)
            return await entry.getData(new zip.Uint8ArrayWriter());
          }
        }));
      } catch (e) {
        // Propagate errors so archiveService can handle 'Encrypted' or 'Password' checks
        throw e;
      }
    }
    
    async close() {
      await this.reader.close();
    }
  },
  
  BlobReader: class {
    constructor(blob) {
      this.instance = new zip.BlobReader(blob);
    }
  }
};