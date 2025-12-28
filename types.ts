
export interface ArchiveFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dateAdded: number;
  data: Blob;
  password?: string; // Saved password for auto-unlock
}

export interface ArchiveImage {
  name: string;
  url: string;
  size: number;
}

export enum ViewMode {
  GRID = 'GRID',
  LIST = 'LIST'
}

export interface AppState {
  currentArchive: ArchiveFile | null;
  extractedImages: ArchiveImage[];
  isExtracting: boolean;
  viewMode: ViewMode;
  selectedImageIndex: number | null;
  vaultFiles: ArchiveFile[];
}
