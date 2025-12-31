import { ArchiveImage } from '../types.ts';
// @ts-ignore - Local module
import * as zipImport from '../lib/zip.js';

// Fix: Cast the zip library import to any to resolve property access errors in TypeScript
const zip = zipImport as any;

const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;

/**
 * Checks if a ZIP archive is encrypted.
 */
export const checkEncryption = async (data: Blob, filename: string): Promise<boolean> => {
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
          const rawData = await entry.getData(new zip.Uint8ArrayWriter());
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
 * Utility to detect file format.
 */
export const getArchiveType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'zip': return 'ZIP Archive';
    default: return 'Archive';
  }
};