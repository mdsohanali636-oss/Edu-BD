import React, { useState, useEffect } from 'react';
import { ExternalLink, Maximize2, Minimize2, X, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface PdfViewerProps {
  url: string;
  title?: string;
  isRestricted?: boolean;
  onClose: () => void;
}

// Automatically detect and convert various Google Drive / Docs share links
export const convertGoogleDriveUrl = (driveUrl: string): string => {
  if (!driveUrl) return '';
  const cleanedUrl = driveUrl.trim();

  // Pattern 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileDMatch = cleanedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/file/d/${fileDMatch[1]}/preview`;
  }

  // Pattern 2: https://drive.google.com/open?id=FILE_ID
  const idMatch = cleanedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (cleanedUrl.includes('drive.google.com/open') && idMatch && idMatch[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  }

  // Pattern 3: https://docs.google.com/document/d/FILE_ID/edit
  const docMatch = cleanedUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch && docMatch[1]) {
    return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  }

  // Pattern 4: https://docs.google.com/spreadsheets/d/FILE_ID/edit
  const sheetMatch = cleanedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch && sheetMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`;
  }

  // Pattern 5: https://docs.google.com/presentation/d/FILE_ID/edit
  const presentationMatch = cleanedUrl.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (presentationMatch && presentationMatch[1]) {
    return `https://docs.google.com/presentation/d/${presentationMatch[1]}/preview`;
  }

  return cleanedUrl;
};

// Global helper to background prefetch document preview URLs on user interaction
export const prefetchPdfUrl = (url: string) => {
  try {
    if (!url) return;
    const converted = convertGoogleDriveUrl(url);
    if (!converted) return;

    const safeHash = encodeURIComponent(converted).replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
    const prefetchId = `prefetch-${safeHash}`;
    if (document.getElementById(prefetchId)) return;

    const link = document.createElement('link');
    link.id = prefetchId;
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = converted;
    document.head.appendChild(link);
  } catch (err) {
    console.warn("Soft warning: pdf prefetch skipped:", err);
  }
};

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
  url, 
  title = 'Document Preview', 
  isRestricted = false, 
  onClose 
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isIframeMounted, setIsIframeMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showTimeoutBtn, setShowTimeoutBtn] = useState(false);
  const [viewerMode, setViewerMode] = useState<'direct' | 'google'>('google');

  // Convert URL once for high stability
  const convertedUrl = convertGoogleDriveUrl(url);

  // Derive final iframe source url
  const iframeUrl = viewerMode === 'google' && !url.includes('drive.google.com') && !url.includes('docs.google.com')
    ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`
    : convertedUrl;

  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
    setShowTimeoutBtn(false);
    setViewerMode('google');

    // Speed optimization: Mount the iframe strictly after the modal finishes popping
    // (decoupling the browser paint loop to achieve instant button-click responsiveness)
    const mountTimer = setTimeout(() => {
      setIsIframeMounted(true);
    }, 75);

    // Timeout loading feedback state after 4 seconds to offer interactive alternative
    const timer = setTimeout(() => {
      setShowTimeoutBtn(true);
    }, 4000);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(timer);
    };
  }, [url]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className={`fixed inset-0 z-[1000] flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-4 md:p-8'} bg-black/80 backdrop-blur-sm`}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className={`bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden will-change-transform ${
          isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-full rounded-[24px]'
        }`}
      >
        {/* Header (Fully interactive instantly) */}
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 z-10 shrink-0 select-none">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-zinc-900 dark:text-white truncate uppercase tracking-tight text-sm">
                {title}
              </h3>
              <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mt-1">
                {isRestricted ? '🔒 Secure Read Mode' : 'Standard PDF Preview'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!isRestricted && (
              <button 
                onClick={() => window.open(convertedUrl, '_blank')}
                className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors active:scale-95 duration-100"
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </button>
            )}
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors active:scale-95 duration-100"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-rose-500 transition-colors active:scale-95 duration-100"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
                    {/* Main Renderer Iframe (Lazy mounted post animation) */}
          {isIframeMounted && !loadError && (
            <div className={`flex-1 w-full h-full relative z-10 ${isRestricted ? 'select-none pointer-events-auto' : ''}`}>
              <iframe 
                src={iframeUrl} 
                className="w-full h-full border-none"
                allow="autoplay; fullscreen"
                loading="lazy"
                onError={() => {
                  setLoadError(true);
                  setIsLoading(false);
                }}
                onLoad={() => {
                  setIsLoading(false);
                }}
              />
              
              {isRestricted && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-16 z-20 cursor-default bg-transparent" />
                  <div className="absolute bottom-0 right-0 w-24 h-16 z-20 cursor-default bg-transparent" />
                  
                  {/* Secure Watermark */}
                  <div className="absolute bottom-6 left-6 z-30 pointer-events-none opacity-40">
                     <div className="bg-zinc-900/80 text-white text-[8px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest border border-white/10">
                       PARODORSHHI SECURE
                     </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Chrome Blocked Dynamic Toolbar Helper */}
          {!isRestricted && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-zinc-900/90 dark:bg-zinc-900/95 text-white py-2.5 px-4 rounded-2xl shadow-xl backdrop-blur-md border border-white/10 max-w-[95%] md:max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300 whitespace-nowrap">Chrome Blocking?</span>
              <div className="w-[1px] h-3.5 bg-white/20 shrink-0" />
              <button 
                onClick={() => window.open(convertedUrl, '_blank')}
                className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 transition-colors py-1 px-2.5 hover:bg-white/10 rounded-xl flex items-center gap-1 shrink-0"
              >
                <ExternalLink size={11} />
                Open in New Tab
              </button>
              {!url.includes('drive.google.com') && (
                <>
                  <div className="w-[1px] h-3.5 bg-white/20 shrink-0" />
                  <button 
                    onClick={() => {
                      setIsLoading(true);
                      setViewerMode(viewerMode === 'direct' ? 'google' : 'direct');
                    }}
                    className="text-[10px] font-black uppercase text-amber-400 hover:text-amber-300 transition-colors py-1 px-2.5 hover:bg-white/10 rounded-xl shrink-0"
                  >
                    {viewerMode === 'direct' ? '🔄 Google Web View' : '🔄 Direct View'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Quick, Native Skeleton UI + Loading spinner */}
          {(isLoading || !isIframeMounted) && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100/95 dark:bg-zinc-950/95 z-20 overflow-hidden">
              {/* Elegant Document Layout Skeleton to occupy visual gap immediately */}
              <div className="absolute inset-0 max-w-4xl mx-auto p-8 flex flex-col gap-6 opacity-30 select-none pointer-events-none">
                <div className="h-10 w-2/3 bg-zinc-300 dark:bg-zinc-800 rounded-lg animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse w-11/12" />
                </div>
                <div className="h-48 bg-zinc-300 dark:bg-zinc-800 rounded-xl animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse w-1/2" />
                </div>
              </div>

              {/* Suspended Light Spinner Overlay */}
              <div className="relative z-30 flex flex-col items-center gap-4 text-center max-w-xs px-6 py-8 bg-white/80 dark:bg-zinc-900/80 rounded-3xl shadow-sm backdrop-blur-md">
                 <div className="w-8 h-8 rounded-full border-[3px] border-rose-500/10 border-t-rose-500 animate-spin" />
                 <div className="space-y-1">
                   <p className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                     Document Opening
                   </p>
                   <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-normal">
                     Rendering page layouts.
                   </p>
                 </div>
                 
                 {/* Accelerated alternative access fallback */}
                 {showTimeoutBtn && !isRestricted && (
                   <button
                     onClick={() => {
                       window.open(convertedUrl, '_blank');
                       setIsLoading(false);
                     }}
                     className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-[12px] text-[11px] font-bold shadow-lg shadow-rose-500/15 hover:bg-rose-600 transition-all active:scale-95"
                   >
                     <ExternalLink size={12} />
                     Open PDF directly
                   </button>
                 )}
              </div>
            </div>
          )}

          {/* Fallback Screen */}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-35 bg-zinc-50 dark:bg-zinc-950">
              <div className="max-w-md space-y-5">
                <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <AlertTriangle size={28} />
                </div>
                <div className="space-y-1.5 animate-fade-in">
                  <h4 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">Direct Access Available</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">
                    Browser embed restrictions standard on mobile sometimes limit in-app preview.
                  </p>
                </div>
                <div>
                   {!isRestricted ? (
                     <button 
                       onClick={() => window.open(convertedUrl, '_blank')}
                       className="inline-flex items-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:bg-zinc-800 transition-transform active:scale-95"
                     >
                       <ExternalLink size={14} />
                       Open PDF in new tab
                     </button>
                   ) : (
                     <div className="inline-flex items-center justify-center p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                       <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                         🔒 Secure Offline View Only
                       </p>
                     </div>
                   )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Restricted warning */}
        {isRestricted && (
          <div className="bg-zinc-900 py-2.5 px-6 text-center border-t border-white/5 shrink-0 select-none">
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] leading-none">
              Encryption Active • Secondary Recording Protection Enabled • parodorshhi.com
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
