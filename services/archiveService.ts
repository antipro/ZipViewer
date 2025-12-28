
import { ArchiveImage } from '../types.ts';
// @ts-ignore - Local module
import zip from '../lib/zip.js';
// @ts-ignore - Local module
import unrar from '../lib/unrar.js';

const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;

/**
 * Checks if an archive is encrypted.
 */
export const checkEncryption = async (data: Blob, filename: string): Promise<boolean> => {
  const isRar = filename.toLowerCase().endsWith('.rar');
  
  if (isRar) {
    try {
      const buffer = await data.arrayBuffer();
      // Dynamically load the extractor. If the network is down or lib fails, this throws.
      const extractor = await unrar.createExtractorFromData({ data: new Uint8Array(buffer) });
      const list = extractor.getFileList();
      return !!list.arcHeader?.encryption;
    } catch (e: any) {
      // If we can't load the library, we can't check encryption.
      // We return false to allow the process to continue to 'extractImagesFromRar',
      // which will attempt to load the lib again and throw the specific 'Missing Dependency' error to the user.
      console.warn("RAR checkEncryption skipped due to load error:", e);
      return false;
    }
  } else {
    try {
      const reader = new zip.ZipReader(new zip.BlobReader(data));
      const entries = await reader.getEntries();
      const hasEncrypted = entries.some((e: any) => e.encrypted);
      await reader.close();
      return hasEncrypted;
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      return msg.includes('password') || msg.includes('encrypted');
    }
  }
};

/**
 * Extraction for ZIP archives.
 */
export const extractImagesFromZip = async (
  data: Blob,
  password?: string
): Promise<ArchiveImage[]> => {
  try {
    const reader = new zip.ZipReader(new zip.BlobReader(data), { password });
    const images: ArchiveImage[] = [];
    const entries = await reader.getEntries();

    if (!entries || entries.length === 0) {
      throw new Error("Archive is empty");
    }

    for (const entry of entries) {
      const filename = entry.filename;
      const isMacMetadata = filename.includes('__MACOSX/') || filename.split('/').pop()?.startsWith('._');

      if (!entry.directory && IMAGE_REGEX.test(filename) && !isMacMetadata) {
        try {
          const rawData = await entry.getData();
          if (rawData) {
            const blob = new Blob([rawData]);
            images.push({
              name: filename,
              url: URL.createObjectURL(blob),
              size: blob.size,
            });
          }
        } catch (e) {
          console.warn(`Skipping corrupted file: ${filename}`);
        }
      }
    }
    await reader.close();
    return images;
  } catch (error: any) {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('password') || msg.includes('encrypted')) throw new Error("ENCRYPTED");
    if (msg.includes('not_a_zip')) throw new Error("NOT_A_ZIP");
    throw new Error(`Archive Error: ${error.message}`);
  }
};

/**
 * Extraction for RAR archives.
 */
export const extractImagesFromRar = async (
  data: Blob,
  password?: string
): Promise<ArchiveImage[]> => {
  try {
    const buffer = await data.arrayBuffer();
    const extractor = await unrar.createExtractorFromData({ 
      data: new Uint8Array(buffer), 
      password 
    });
    
    const result = await extractor.extractAll();
    const images: ArchiveImage[] = [];
    
    if (result && result.files) {
      for (const file of result.files) {
        if (file.file && !file.file.directory && IMAGE_REGEX.test(file.file.name)) {
          const blob = new Blob([file.extraction]);
          images.push({
            name: file.file.name,
            url: URL.createObjectURL(blob),
            size: blob.size,
          });
        }
      }
    }
    return images;
  } catch (error: any) {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('rar_lib_load_failed') || msg.includes('network error')) {
      throw new Error("Missing Dependency: Could not load RAR library. Please check your internet connection.");
    }
    if (msg.includes('password') || msg.includes('encrypted')) throw new Error("ENCRYPTED");
    throw new Error(`RAR Extraction Failed: ${error.message}`);
  }
};

/**
 * Utility to detect file format.
 */
export const getArchiveType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'zip': return 'ZIP Archive';
    case 'rar': return 'RAR Archive';
    default: return 'Archive';
  }
};
