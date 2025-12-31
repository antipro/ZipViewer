import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FolderLock, 
  FileArchive, 
  LayoutGrid, 
  List as ListIcon, 
  Trash2, 
  Eye, 
  Shield, 
  Search,
  Lock,
  Loader2,
  ArrowLeft,
  AlertCircle,
  History,
  Key,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArchiveFile, ArchiveImage, ViewMode } from './types.ts';
import { saveArchive, getAllArchives, deleteArchive } from './services/dbService.ts';
import { extractImagesFromZip, getArchiveType, checkEncryption } from './services/archiveService.ts';
import ImageViewer from './components/ImageViewer.tsx';

const App: React.FC = () => {
  const [vaultFiles, setVaultFiles] = useState<ArchiveFile[]>([]);
  const [currentImages, setCurrentImages] = useState<ArchiveImage[]>([]);
  const [activeFile, setActiveFile] = useState<ArchiveFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [initError, setInitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setInitError("Database initialization is taking longer than expected...");
      }
    }, 5000);

    loadVault();
    return () => clearTimeout(timeout);
  }, []);

  const loadVault = async () => {
    try {
      setIsLoading(true);
      const files = await getAllArchives();
      setVaultFiles(files.sort((a, b) => b.dateAdded - a.dateAdded));
    } catch (err) {
      console.error("Failed to load vault:", err);
      setInitError("Access Denied: Could not connect to private browser storage.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newArchive: ArchiveFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: getArchiveType(file.name),
      dateAdded: Date.now(),
      data: file 
    };

    try {
      await saveArchive(newArchive);
      await loadVault();
    } catch (err) {
      alert("Storage error: Could not save the file to private storage.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openArchive = async (archive: ArchiveFile) => {
    const lowerName = archive.name.toLowerCase();
    const isZip = lowerName.endsWith('.zip');
    
    if (!isZip) {
      alert(`Unsupported Format: ${archive.name}. Currently only ZIP viewing is supported.`);
      return;
    }

    setIsExtracting(true);
    setActiveFile(archive);
    
    try {
      const isEncrypted = await checkEncryption(archive.data, archive.name);
      
      // If encrypted and we have a saved password, try it immediately
      if (isEncrypted && archive.password) {
        try {
          const images = await extractImagesFromZip(archive.data, archive.password);
          setCurrentImages(images);
          setIsExtracting(false);
          return;
        } catch (e) {
          // If saved password fails, proceed to dialog
          console.warn("Saved password failed, prompting for new one.");
        }
      }

      if (isEncrypted) {
        setShowPasswordDialog(true);
        setIsExtracting(false);
        return;
      }

      const images = await extractImagesFromZip(archive.data);
      setCurrentImages(images);
    } catch (error: any) {
      console.error("Extraction error:", error);
      if (error.message === "ENCRYPTED") {
        setShowPasswordDialog(true);
      } else if (error.message === "NOT_A_ZIP") {
        alert('Format Error: This file structure is invalid or not a supported ZIP archive.');
        setActiveFile(null);
      } else {
        alert(`Extraction failed: ${error.message || 'The file might be corrupted.'}`);
        setActiveFile(null);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!activeFile) return;
    setIsExtracting(true);
    setShowPasswordDialog(false);
    try {
      const images = await extractImagesFromZip(activeFile.data, password);
      
      // Save password for future use
      const updatedFile = { ...activeFile, password };
      await saveArchive(updatedFile);
      setActiveFile(updatedFile);
      
      setCurrentImages(images);
      setPassword(''); 
      // Refresh vault in background to show the key
      loadVault();
    } catch (e: any) {
      alert(`Unlock Failed: ${e.message === 'ENCRYPTED' ? 'Incorrect Password' : e.message}`);
      setShowPasswordDialog(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const requestDelete = (id: string, e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteArchive(deleteId);
      if (activeFile?.id === deleteId) {
        setActiveFile(null);
        setCurrentImages([]);
      }
      await loadVault();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete file from storage.");
    } finally {
      setDeleteId(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredVault = vaultFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <Shield className="w-12 h-12 text-indigo-500 animate-pulse" />
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin absolute inset-0 opacity-20" />
        </motion.div>
        <p className="text-slate-400 font-medium tracking-widest text-xs uppercase">Initializing Vault</p>
        {initError && <p className="text-red-400/60 text-[10px] mt-4 max-w-xs text-center">{initError}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {activeFile ? (
              <motion.button 
                key="back"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => { setActiveFile(null); setCurrentImages([]); }} 
                className="p-2 -ml-2 hover:bg-white/5 rounded-xl transition-all active:scale-90"
              >
                <ArrowLeft size={22} />
              </motion.button>
            ) : (
              <motion.div 
                key="logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-xl shadow-indigo-500/20"
              >
                <Shield size={22} className="text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-none tracking-tight">
              {activeFile ? activeFile.name : 'ZipViewer'}
            </h1>
            {!activeFile && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Private Gallery</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!activeFile ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center gap-2 px-4 py-2 bg-white text-slate-950 hover:bg-slate-200 rounded-full font-bold text-sm transition-all active:scale-95"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              <span className="hidden xs:inline">Import</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode(ViewMode.GRID)}
                className={`p-2 rounded-lg transition-all ${viewMode === ViewMode.GRID ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.LIST)}
                className={`p-2 rounded-lg transition-all ${viewMode === ViewMode.LIST ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <ListIcon size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".zip"
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 no-scrollbar">
        <AnimatePresence mode="wait">
          {!activeFile ? (
            <motion.div 
              key="vault"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto space-y-10"
            >
              {vaultFiles.length > 0 && (
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-indigo-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search archives..."
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500/50 transition-all text-base placeholder:text-slate-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}

              {filteredVault.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center py-24 px-6 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-slate-900/20 hover:bg-slate-900/40 hover:border-indigo-500/30 transition-all cursor-pointer group"
                >
                  <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center border border-white/5 text-slate-600 group-hover:text-indigo-400 group-hover:scale-110 transition-all mb-6">
                    <FolderLock size={40} />
                  </div>
                  <div className="text-center space-y-2 mb-8">
                    <h2 className="text-xl font-bold text-slate-200">The Vault is Empty</h2>
                    <p className="text-slate-500 text-sm max-w-[280px] mx-auto leading-relaxed">
                      Import ZIP files. Images are processed locally and never touch the cloud.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20">
                    <Plus size={18} /> Select ZIP Archive
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVault.map((file, idx) => (
                    <motion.div 
                      layoutId={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      key={file.id} 
                      onClick={() => openArchive(file)}
                      className="group relative flex flex-col bg-slate-900/40 border border-white/5 p-5 rounded-3xl hover:bg-slate-800/60 hover:border-white/10 transition-all cursor-pointer overflow-hidden shadow-lg shadow-black/20"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                          <FileArchive size={24} />
                        </div>
                        <button 
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => requestDelete(file.id, e)}
                          className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-colors bg-white/10 z-20"
                          title="Delete archive"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0 mb-3">
                        <div className="flex items-center gap-2 min-w-0 mb-1">
                          <h3 className="font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                            {file.name}
                          </h3>
                          {file.password && (
                            <div className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-mono border border-indigo-500/20" title={`Saved password: ${file.password}`}>
                              <Key size={10} className="text-indigo-400" />
                              <span className="truncate max-w-[80px]">{file.password}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-400 font-bold uppercase tracking-wider">
                            {file.type.split(' ')[0]}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatSize(file.size)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <History size={12} />
                          {new Date(file.dateAdded).toLocaleDateString()}
                        </div>
                        <Eye size={14} className="text-slate-600 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto"
            >
              {isExtracting ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 size={40} className="text-indigo-500" />
                  </motion.div>
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-slate-300">Unpacking Archive</h2>
                    <p className="text-slate-500 text-sm">Decrypting and loading previews...</p>
                  </div>
                </div>
              ) : (
                <>
                  {currentImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
                      <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 text-slate-600">
                        <AlertCircle size={32} />
                      </div>
                      <p className="text-slate-500 max-w-xs leading-relaxed">
                        No supported image formats (.jpg, .png, .webp, etc.) were found in this ZIP archive.
                      </p>
                    </div>
                  ) : (
                    <>
                      {viewMode === ViewMode.GRID ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                          {currentImages.map((img, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.02 }}
                              key={img.url} 
                              onClick={() => setSelectedImageIdx(idx)}
                              className="aspect-square bg-slate-900 rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all group relative"
                            >
                              <img 
                                src={img.url} 
                                alt={img.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                <p className="text-[10px] text-white/80 font-medium truncate w-full">{img.name}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2 max-w-4xl mx-auto">
                          {currentImages.map((img, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.01 }}
                              key={img.url} 
                              onClick={() => setSelectedImageIdx(idx)}
                              className="flex items-center gap-4 bg-slate-900/40 p-3 rounded-2xl hover:bg-slate-800/60 cursor-pointer transition-colors border border-white/5"
                            >
                              <img src={img.url} className="w-14 h-14 rounded-xl object-cover bg-black" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-300 truncate text-sm">{img.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{formatSize(img.size)}</p>
                              </div>
                              <Eye size={18} className="text-slate-600 mr-2" />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {/* Password Dialog */}
        {showPasswordDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                <Lock size={32} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Encrypted Archive</h2>
                <p className="text-slate-400 text-sm leading-relaxed">This ZIP file is password protected. Enter the key to view its contents.</p>
              </div>
              <input 
                type="password"
                placeholder="Archive Password"
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowPasswordDialog(false); setActiveFile(null); setPassword(''); }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePasswordSubmit}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-colors text-sm shadow-lg shadow-indigo-600/20"
                >
                  Unlock
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-400">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Delete Archive?</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  This action cannot be undone. The ZIP file will be permanently removed from your private vault.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-colors text-sm shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedImageIdx !== null && (
        <ImageViewer 
          images={currentImages.map(img => img.url)} 
          initialIndex={selectedImageIdx}
          onClose={() => setSelectedImageIdx(null)}
        />
      )}

      {!activeFile && (
        <footer className="px-8 py-6 border-t border-white/5 bg-slate-950/50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-2 text-slate-500">
               <Shield size={14} className="text-indigo-500" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">End-to-End Local Privacy</span>
             </div>
             <p className="text-[10px] text-slate-600 text-center sm:text-right max-w-xs leading-relaxed">
               All ZIP archives stay in your browser's internal storage. We never upload your data.
             </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;