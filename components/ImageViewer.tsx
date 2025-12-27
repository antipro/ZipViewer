
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, X, Maximize2, Minimize2, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction state
  const touchState = useRef({
    initialDistance: 0,
    initialScale: 1,
    isPanning: false,
    startTouch: { x: 0, y: 0 },
    lastTouch: { x: 0, y: 0 },
    lastTap: 0,
  });

  const resetTransform = useCallback(() => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    resetTransform();
  }, [images.length, resetTransform]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    resetTransform();
  }, [images.length, resetTransform]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 8));
  };

  const handleRotate = (deg: number) => {
    setRotation(prev => prev + deg);
  };

  // Double Tap Detection
  const handleDoubleTap = (e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - touchState.current.lastTap < DOUBLE_TAP_DELAY) {
      if (scale !== 1) {
        resetTransform();
      } else {
        setScale(2.5);
      }
    }
    touchState.current.lastTap = now;
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      touchState.current.initialDistance = dist;
      touchState.current.initialScale = scale;
    } else if (e.touches.length === 1) {
      touchState.current.isPanning = true;
      touchState.current.startTouch = { x: e.touches[0].pageX, y: e.touches[0].pageY };
      touchState.current.lastTouch = { x: e.touches[0].pageX, y: e.touches[0].pageY };
      handleDoubleTap(e);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Prevent browser zoom/scroll
    if (e.cancelable) e.preventDefault();

    if (e.touches.length === 2 && touchState.current.initialDistance > 0) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const ratio = dist / touchState.current.initialDistance;
      const newScale = Math.min(Math.max(0.5, touchState.current.initialScale * ratio), 8);
      setScale(newScale);
    } else if (e.touches.length === 1 && touchState.current.isPanning) {
      const dx = e.touches[0].pageX - touchState.current.lastTouch.x;
      const dy = e.touches[0].pageY - touchState.current.lastTouch.y;
      
      // Only allow panning if zoomed in
      if (scale > 1.05) {
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      touchState.current.lastTouch = { x: e.touches[0].pageX, y: e.touches[0].pageY };
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    // Swipe detection (only if not zoomed in and not a pinch)
    if (scale <= 1.1 && !touchState.current.initialDistance) {
      const deltaX = e.changedTouches[0].pageX - touchState.current.startTouch.x;
      const deltaY = e.changedTouches[0].pageY - touchState.current.startTouch.y;
      
      // Horizontal swipe threshold: 50px
      if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 100) {
        if (deltaX > 0) handlePrev();
        else handleNext();
      }
    }
    touchState.current.initialDistance = 0;
    touchState.current.isPanning = false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center select-none overflow-hidden touch-none"
    >
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-center z-[110]">
        <div className="flex items-center gap-3 text-white">
          <button 
            onClick={onClose} 
            className="p-2.5 bg-black/40 active:bg-white/20 rounded-full transition-colors border border-white/10"
          >
            <X size={24} />
          </button>
          <span className="text-sm font-medium bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
        
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-full border border-white/10 backdrop-blur-md">
          <button onClick={() => handleRotate(-90)} className="p-2 hover:bg-white/10 active:scale-90 rounded-full text-white">
            <RotateCcw size={20} />
          </button>
          <button onClick={() => handleRotate(90)} className="p-2 hover:bg-white/10 active:scale-90 rounded-full text-white">
            <RotateCw size={20} />
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button onClick={() => handleZoom(0.25)} className="p-2 hover:bg-white/10 active:scale-90 rounded-full text-white">
            <ZoomIn size={20} />
          </button>
          <button onClick={() => handleZoom(-0.25)} className="p-2 hover:bg-white/10 active:scale-90 rounded-full text-white">
            <ZoomOut size={20} />
          </button>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 active:scale-90 rounded-full text-white hidden sm:block">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* Main viewport */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={(e) => {
          touchState.current.isPanning = true;
          touchState.current.startTouch = { x: e.pageX, y: e.pageY };
          touchState.current.lastTouch = { x: e.pageX, y: e.pageY };
          handleDoubleTap(e);
        }}
        onMouseMove={(e) => {
          if (touchState.current.isPanning && scale > 1.05) {
            const dx = e.pageX - touchState.current.lastTouch.x;
            const dy = e.pageY - touchState.current.lastTouch.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            touchState.current.lastTouch = { x: e.pageX, y: e.pageY };
          }
        }}
        onMouseUp={(e) => {
          if (touchState.current.isPanning && scale <= 1.1) {
            const deltaX = e.pageX - touchState.current.startTouch.x;
            if (Math.abs(deltaX) > 100) {
              if (deltaX > 0) handlePrev();
              else handleNext();
            }
          }
          touchState.current.isPanning = false;
        }}
        onMouseLeave={() => touchState.current.isPanning = false}
      >
        {/* Navigation Arrows */}
        {scale <= 1.1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-3 sm:left-6 z-[105] p-3 sm:p-4 bg-black/40 hover:bg-black/60 active:scale-90 rounded-full text-white transition-all backdrop-blur-md border border-white/10"
              aria-label="Previous image"
            >
              <ChevronLeft size={28} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-3 sm:right-6 z-[105] p-3 sm:p-4 bg-black/40 hover:bg-black/60 active:scale-90 rounded-full text-white transition-all backdrop-blur-md border border-white/10"
              aria-label="Next image"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* The Image Wrapper */}
        <div
          className="relative transition-transform duration-100 ease-out will-change-transform"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? 'move' : 'default'
          }}
        >
          <img 
            src={images[currentIndex]} 
            alt={`Private view ${currentIndex}`} 
            className="max-w-screen max-h-screen object-contain pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Reset Control */}
      {(scale !== 1 || offset.x !== 0 || offset.y !== 0) && (
        <button 
          onClick={resetTransform}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600/90 text-white rounded-full flex items-center gap-2 text-sm font-semibold shadow-xl backdrop-blur-md active:scale-95 transition-all z-[110]"
        >
          <RefreshCcw size={16} /> Reset View
        </button>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-none z-[110]">
        <div className="px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-white/60 border border-white/5 uppercase tracking-widest font-bold">
          {scale > 1.05 ? 'Pinch to Zoom • Drag to Pan' : 'Swipe or use Buttons to Navigate'}
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
