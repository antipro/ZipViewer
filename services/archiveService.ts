
import * as zip from '@zip.js/zip.js';
import { ArchiveImage } from '../types';

/**
 * Checks if a ZIP archive is encrypted without extracting it.
 */
export const checkEncryption = async (data: ArrayBuffer): Promise<boolean> => {
  const reader = new zip.ZipReader(new zip.Uint8ArrayReader(new Uint8Array(data)));
  try {
    const entries = await reader.getEntries();
    // Check if any entry has the encrypted flag set
    return entries.some(entry => entry.encrypted);
  } catch (error: any) {
    // Some libraries throw if they can't even read the directory without a password
    if (error.message?.toLowerCase().includes('password') || error.message?.toLowerCase().includes('encrypted')) {
      return true;
    }
    return false;
  } finally {
    await reader.close();
  }
};

export const extractImagesFromZip = async (
  data: ArrayBuffer,
  password?: string
): Promise<ArchiveImage[]> => {
  const reader = new zip.ZipReader(new zip.Uint8ArrayReader(new Uint8Array(data)), { password });
  const images: ArchiveImage[] = [];
  const imageRegex = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;

  try {
    const entries = await reader.getEntries();

    for (const entry of entries) {
      const filename = entry.filename;
      
      // macOS metadata check: Ignore files in __MACOSX folders or files starting with ._
      const isMacMetadata = filename.includes('__MACOSX/') || 
                            filename.split('/').pop()?.startsWith('._');

      if (!entry.directory && imageRegex.test(filename) && !isMacMetadata) {
        if (entry.getData) {
          try {
            const blob = await entry.getData(new zip.BlobWriter());
            images.push({
              name: filename,
              url: URL.createObjectURL(blob),
              size: blob.size,
            });
          } catch (e: any) {
            // Handle incorrect password or decryption error for specific files
            if (e.message?.toLowerCase().includes('password')) {
              throw new Error("ENCRYPTED");
            }
            console.error(`Error extracting ${filename}:`, e);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.message?.toLowerCase().includes('password') || error.message?.toLowerCase().includes('encrypted')) {
      throw new Error("ENCRYPTED");
    }
    throw error;
  } finally {
    await reader.close();
  }

  return images;
};

/**
 * Utility to detect file format.
 */
export const getArchiveType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'zip': return 'ZIP Archive';
    case 'rar': return 'RAR Archive';
    case '7z': return '7-Zip Archive';
    default: return 'Archive';
  }
};
