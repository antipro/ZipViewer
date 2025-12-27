
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FolderLock, 
  FileArchive, 
  LayoutGrid, 
  List, 
  Trash2, 
  Eye, 
  Shield, 
  MoreVertical, 
  Download,
  Search,
  Lock,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { ArchiveFile, ArchiveImage, ViewMode } from './types';
import { saveArchive, getAllArchives, deleteArchive } from './services/dbService';
import { extractImagesFromZip, getArchiveType, checkEncryption } from './services/archiveService';
import ImageViewer from './components/ImageViewer';

const App: React.FC = () => {
  const [vaultFiles, setVaultFiles] = useState<ArchiveFile[]>([]);
  const [currentImages, setCurrentImages] = useState<ArchiveImage[]>([]);
  const [activeFile, setActiveFile] = useState<ArchiveFile | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    const files = await getAllArchives();
    setVaultFiles(files.sort((a, b) => b.dateAdded - a.dateAdded));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const newArchive: ArchiveFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: getArchiveType(file.name),
      dateAdded: Date.now(),
      data: arrayBuffer
    };

    await saveArchive(newArchive);
    loadVault();
  };

  const openArchive = async (archive: ArchiveFile) => {
    setIsExtracting(true);
    setActiveFile(archive);
    
    try {
      // Real check for encryption
      const isEncrypted = await checkEncryption(archive.data);
      if (isEncrypted) {
        setShowPasswordDialog(true);
        setIsExtracting(false);
        return;
      }

      const images = await extractImagesFromZip(archive.data);
      setCurrentImages(images);
    } catch (error: any) {
      if (error.message === "ENCRYPTED") {
        setShowPasswordDialog(true);
      } else {
        console.error('Failed to extract images', error);
        alert('Error extracting archive. This format might be unsupported or corrupted.');
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
      setCurrentImages(images);
      setPassword(''); // Clear password on success
    } catch (e: any) {
      if (e.message === "ENCRYPTED") {
        alert("Incorrect password. Please try again.");
        setShowPasswordDialog(true);
      } else {
        alert("Extraction error or incorrect password.");
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Permanently delete this archive from private storage?')) {
      await deleteArchive(id);
      loadVault();
      if (activeFile?.id === id) {
        setActiveFile(null);
        setCurrentImages([]);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredVault = vaultFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeFile ? (
            <button 
              onClick={() => { setActiveFile(null); setCurrentImages([]); }} 
              className="p-2 -ml-2 hover:bg-white/5 rounded-full"
            >
              <ArrowLeft size={24} />
            </button>
          ) : (
            <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
              <Shield size={24} className="text-white" />
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight">
            {activeFile ? activeFile.name : 'ZipViewer'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!activeFile && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Archive</span>
            </button>
          )}
          {activeFile && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setViewMode(ViewMode.GRID)}
                className={`p-2 rounded-lg ${viewMode === ViewMode.GRID ? 'bg-white/10 text-white' : 'text-slate-400'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.LIST)}
                className={`p-2 rounded-lg ${viewMode === ViewMode.LIST ? 'bg-white/10 text-white' : 'text-slate-400'}`}
              >
                <List size={20} />
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
        accept=".zip,.rar,.7z"
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar">
        {!activeFile ? (
          /* Vault View */
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-400" size={20} />
              <input 
                type="text" 
                placeholder="Search your private archives..."
                className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500/50 transition-all text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredVault.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 text-slate-600">
                  <FolderLock size={48} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-slate-300">Archives Empty</h2>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Your images remain encrypted in internal storage. Add a ZIP, RAR or 7Z file to start viewing.
                  </p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-medium transition-colors"
                >
                  Import File
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVault.map(file => (
                  <div 
                    key={file.id} 
                    onClick={() => openArchive(file)}
                    className="group bg-slate-900/50 border border-white/5 p-4 rounded-2xl hover:bg-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer flex items-center gap-4 relative"
                  >
                    <div className="w-14 h-14 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <FileArchive size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-200 truncate pr-8">{file.name}</h3>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{file.type} • {formatSize(file.size)}</p>
                    </div>
                    <button 
                      onClick={(e) => deleteFile(file.id, e)}
                      className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Archive Content View */
          <div className="max-w-7xl mx-auto">
            {isExtracting ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <Loader2 size={48} className="text-indigo-500 animate-spin" />
                <div className="text-center">
                  <h2 className="text-xl font-medium text-slate-300">Unpacking images...</h2>
                  <p className="text-slate-500">Decrypting and loading previews from {activeFile.name}</p>
                </div>
              </div>
            ) : (
              <>
                {currentImages.length === 0 ? (
                  <div className="text-center py-24 space-y-4">
                    <p className="text-slate-500 text-lg">No supported image files found in this archive.</p>
                  </div>
                ) : (
                  <>
                    {viewMode === ViewMode.GRID ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {currentImages.map((img, idx) => (
                          <div 
                            key={img.url} 
                            onClick={() => setSelectedImageIdx(idx)}
                            className="aspect-square bg-slate-900 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all group"
                          >
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <p className="text-[10px] text-white truncate w-full">{img.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentImages.map((img, idx) => (
                          <div 
                            key={img.url} 
                            onClick={() => setSelectedImageIdx(idx)}
                            className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
                          >
                            <img src={img.url} className="w-16 h-16 rounded-lg object-cover bg-black" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-300 truncate">{img.name}</p>
                              <p className="text-xs text-slate-500">{formatSize(img.size)}</p>
                            </div>
                            <Eye size={20} className="text-slate-600" />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Password Modal */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
              <Lock size={32} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Encrypted File</h2>
              <p className="text-slate-400 text-sm">Enter the password to decrypt and view the images inside this archive.</p>
            </div>
            <input 
              type="password"
              placeholder="Archive Password"
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setShowPasswordDialog(false); setActiveFile(null); setPassword(''); }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePasswordSubmit}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-600/20"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      {selectedImageIdx !== null && (
        <ImageViewer 
          images={currentImages.map(img => img.url)} 
          initialIndex={selectedImageIdx}
          onClose={() => setSelectedImageIdx(null)}
        />
      )}

      {/* Privacy Tip Footer */}
      {!activeFile && (
        <footer className="p-4 text-center text-[10px] text-slate-600 border-t border-white/5 bg-slate-900/40">
          ZipViewer stores files locally in your device's protected internal storage. No data is uploaded to any server.
        </footer>
      )}
    </div>
  );
};

export default App;
