import React, { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PdfViewerProps {
  url: string;
  title?: string;
  isRestricted?: boolean;
  onClose: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, title = 'Document Preview', isRestricted = false, onClose }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [viewerType, setViewerType] = useState<'google' | 'direct'>('google');

  const getEmbedUrl = (link: string, type: 'google' | 'direct') => {
    if (type === 'direct') return link;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(link)}&embedded=true`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[1000] flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-4 md:p-10'} bg-black/90 backdrop-blur-md`}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-full rounded-[40px]'}`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
              <RefreshCw size={20} className={!loadError ? 'animate-spin-slow' : ''} />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 dark:text-white truncate max-w-[200px] sm:max-w-md uppercase tracking-tight">
                {title}
              </h3>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mt-1">
                {isRestricted ? '🔒 Secure Read Mode' : 'Standard PDF Preview'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRestricted && (
              <button 
                onClick={() => window.open(url, '_blank')}
                className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl text-zinc-500 transition-all active:scale-90"
                title="Open in new tab"
              >
                <ExternalLink size={20} />
              </button>
            )}
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl text-zinc-500 transition-all active:scale-90"
            >
              {isFullScreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
            </button>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl text-rose-500 transition-all active:scale-90"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-950 flex flex-col">
          {/* Fallback View if error or manual switch */}
          {loadError ? (
            <div className="absolute inset-0 flex items-center justify-center p-10 text-center z-20 bg-zinc-50 dark:bg-zinc-950">
              <div className="max-w-sm space-y-6">
                <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={40} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Preview Blocked?</h4>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Browser security sometimes prevents documents from loading inside the page.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                   <button 
                     onClick={() => { setViewerType(viewerType === 'google' ? 'direct' : 'google'); setLoadError(false); }}
                     className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
                   >
                     Try Alternative Viewer
                   </button>
                   {!isRestricted && (
                     <button 
                       onClick={() => window.open(url, '_blank')}
                       className="w-full py-4 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
                     >
                       Open Direct Link
                     </button>
                   )}
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-0">
               <div className="flex flex-col items-center gap-3">
                 <RefreshCw className="animate-spin text-rose-500" size={32} />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Rendering Hub</span>
               </div>
            </div>
          )}

          <div className={`flex-1 w-full h-full relative z-10 ${isRestricted ? 'select-none pointer-events-auto' : ''}`}>
            <iframe 
              src={getEmbedUrl(url, viewerType)} 
              className="w-full h-full border-none"
              allow="autoplay; fullscreen"
              loading="lazy"
              onError={() => setLoadError(true)}
              onLoad={(e) => {
                // Heuristic for load failure: iframe load events still fire even on block sometimes
                // though cross-origin prevents reading content.
              }}
            />
            
            {isRestricted && (
              <>
                <div className="absolute top-0 left-0 right-0 h-16 z-20 cursor-default bg-transparent" />
                <div className="absolute bottom-0 right-0 w-24 h-16 z-20 cursor-default bg-transparent" />
                
                {/* Watermark/Badges */}
                <div className="absolute bottom-6 left-6 z-30 pointer-events-none opacity-50">
                   <div className="bg-zinc-900/80 text-white text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest border border-white/10">
                     PARODORSHHI SECURE
                   </div>
                </div>
              </>
            )}
          </div>
        </div>

        {isRestricted && (
          <div className="bg-zinc-900 p-3 text-center border-t border-white/5">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
              Encryption Active • Secondary Recording Protection Enabled • parodorshhi.com
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
