import React, { useState } from 'react';
import { ZoomIn, X, Play, Image as ImageIcon } from 'lucide-react';

export interface ParsedQuestionText {
  text: string;
  image?: string;
}

export function parseQuestionText(raw: any): ParsedQuestionText {
  if (!raw) return { text: "" };
  const rawStr = typeof raw === 'string' ? raw : String(raw);
  const trimmed = rawStr.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj === 'object' && obj !== null && ('text' in obj || 'image' in obj)) {
        return { text: obj.text || "", image: obj.image };
      }
    } catch (e) {
      // Fallback
    }
  }
  return { text: rawStr };
}

export interface ParsedOption {
  text: string;
  image?: string;
}

export function parseOption(raw: any): ParsedOption {
  if (!raw) return { text: "" };
  if (typeof raw === 'object' && raw !== null) {
    return { text: raw.text || "", image: raw.image };
  }
  const rawStr = String(raw).trim();
  if (rawStr.startsWith('{') && rawStr.endsWith('}')) {
    try {
      const obj = JSON.parse(rawStr);
      if (typeof obj === 'object' && obj !== null && ('text' in obj || 'image' in obj)) {
        return { text: obj.text || "", image: obj.image };
      }
    } catch (e) {
      // Fallback
    }
  }
  return { text: rawStr };
}

export function serializeQuestionText(text: string, image?: string): string {
  if (image) {
    return JSON.stringify({ text, image });
  }
  return text;
}

// Fullscreen Zoom Overlay Modal
interface ZoomModalProps {
  url: string;
  onClose: () => void;
  title?: string;
}

export function ImageZoomModal({ url, onClose, title }: ZoomModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-zinc-950/95 z-50 flex flex-col items-center justify-center p-4 select-none cursor-zoom-out animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-3 z-55">
        {title && (
          <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl font-mono hidden sm:inline-block">
            {title}
          </span>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white flex items-center justify-center rounded-xl transition-all shadow-lg"
        >
          <X size={20} />
        </button>
      </div>
      <img 
        src={url} 
        alt={title || "Zoomed math content"}
        className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-zinc-900/40 select-text animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        referrerPolicy="no-referrer"
      />
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-4">
        Click anywhere outside to close zoom view
      </p>
    </div>
  );
}

// Question Content rendering component
interface MathQuestionContentProps {
  questionText: string;
  questionImage?: string;
  className?: string;
}

export function MathQuestionContent({ questionText, questionImage, className = "" }: MathQuestionContentProps) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const parsed = parseQuestionText(questionText);
  const finalImage = questionImage || parsed.image;

  return (
    <div className={`space-y-4 text-left ${className}`}>
      {parsed.text && (
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight break-words">
          {parsed.text}
        </h3>
      )}
      
      {finalImage && (
        <div className="relative group inline-block max-w-full">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40 max-h-[350px] sm:max-h-[450px]">
            <img 
              src={finalImage} 
              alt="Question math context" 
              loading="lazy"
              className="max-w-full max-h-[350px] sm:max-h-[450px] h-auto object-contain p-2 rounded-2xl transition-all group-hover:opacity-90 cursor-zoom-in"
              onClick={() => setZoomUrl(finalImage)}
              referrerPolicy="no-referrer"
            />
            <button 
              type="button"
              onClick={() => setZoomUrl(finalImage)}
              className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all bg-black/70 hover:bg-black text-white p-2 rounded-xl flex items-center gap-1.5 text-xs font-black shadow-lg"
            >
              <ZoomIn size={14} />
              <span>Zoom</span>
            </button>
          </div>
        </div>
      )}

      {zoomUrl && (
        <ImageZoomModal url={zoomUrl} onClose={() => setZoomUrl(null)} title="Question Image" />
      )}
    </div>
  );
}

// Option content rendering component
interface MathOptionContentProps {
  optionText: string;
  idx: number;
  isSelected: boolean;
  onClick: () => void;
  correctAnswer?: number | string;
  correctAnswerStatus?: 'correct' | 'incorrect' | 'neutral';
}

export function MathOptionContent({ 
  optionText, 
  idx, 
  isSelected, 
  onClick,
  correctAnswerStatus = 'neutral' 
}: MathOptionContentProps) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const parsed = parseOption(optionText);

  // Styling based on selection/result state
  let cardClass = "";
  let badgeClass = "";
  let textClass = "";

  if (correctAnswerStatus === 'correct') {
    cardClass = "border-green-500 bg-green-50/50 dark:bg-green-500/10 shadow-lg shadow-green-500/5";
    badgeClass = "bg-green-600 text-white";
    textClass = "text-green-700 dark:text-green-400";
  } else if (correctAnswerStatus === 'incorrect' && isSelected) {
    cardClass = "border-red-500 bg-red-50/50 dark:bg-red-500/10 shadow-lg shadow-red-500/5";
    badgeClass = "bg-red-600 text-white";
    textClass = "text-red-700 dark:text-red-400";
  } else if (isSelected) {
    cardClass = "border-blue-600 bg-blue-50/50 dark:bg-blue-600/10 shadow-lg shadow-blue-500/5 scale-[1.01]";
    badgeClass = "bg-blue-600 text-white";
    textClass = "text-blue-600 dark:text-blue-400";
  } else {
    cardClass = "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-200 dark:hover:border-blue-800";
    badgeClass = "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30";
    textClass = "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200";
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        onClick={onClick}
        className={`p-4 rounded-[20px] border-2 text-left transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer ${cardClass}`}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black transition-colors ${badgeClass}`}>
            {String.fromCharCode(65 + idx)}
          </div>
          {parsed.text && (
            <span className={`text-base font-bold transition-colors ${textClass}`}>
              {parsed.text}
            </span>
          )}
        </div>

        {parsed.image && (
          <div className="relative group/opt-img inline-block max-w-[200px] shrink-0 self-start sm:self-center ml-12 sm:ml-0">
            <div className="relative overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/60">
              <img 
                src={parsed.image} 
                alt={`Option ${String.fromCharCode(65 + idx)} math content`}
                loading="lazy"
                className="max-w-[150px] max-h-[100px] object-contain p-1 rounded-xl cursor-zoom-in"
                onClick={(e) => {
                  e.stopPropagation(); // Avoid selecting/clicking option row
                  setZoomUrl(parsed.image!);
                }}
                referrerPolicy="no-referrer"
              />
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomUrl(parsed.image!);
                }}
                className="absolute inset-0 bg-black/10 group-hover/opt-img:bg-black/20 flex items-center justify-center opacity-0 group-hover/opt-img:opacity-100 transition-opacity"
              >
                <ZoomIn size={14} className="text-white drop-shadow-md" />
              </div>
            </div>
          </div>
        )}
      </button>

      {zoomUrl && (
        <ImageZoomModal 
          url={zoomUrl} 
          onClose={() => setZoomUrl(null)} 
          title={`Option ${String.fromCharCode(65 + idx)} Image`} 
        />
      )}
    </div>
  );
}
