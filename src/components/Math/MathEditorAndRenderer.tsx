import React, { useEffect, useState, useRef, useMemo } from 'react';
import { mathInputRegistry } from './MathKeyboard';

// Singletons for script/style promises to avoid multiple network duplicate requests
let katexPromise: Promise<any> | null = null;
let mathlivePromise: Promise<any> | null = null;

export function loadKaTeX(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).katex) {
    return Promise.resolve((window as any).katex);
  }
  if (!katexPromise) {
    katexPromise = new Promise((resolve, reject) => {
      // 1. Stylsheet Injection
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);

      // 2. Script Injection
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        resolve((window as any).katex);
      };
      script.onerror = (e) => {
        reject(e);
      };
      document.body.appendChild(script);
    });
  }
  return katexPromise;
}

export function loadMathLive(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).MathfieldElement) {
    return Promise.resolve();
  }
  if (!mathlivePromise) {
    mathlivePromise = new Promise<any>((resolve, reject) => {
      // Inject MathLive stylesheet
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/mathlive/0.98.5/mathlive-static.css';
      document.head.appendChild(link);

      // Inject MathLive JS CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathlive@0.98.5/dist/mathlive.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = (e) => {
        reject(e);
      };
      document.body.appendChild(script);
    });
  }
  return mathlivePromise;
}

export interface MathSegment {
  type: 'text' | 'inline' | 'block';
  content: string;
}

export function parseLaTeXSegments(text: string): MathSegment[] {
  if (!text) return [];
  const rawStr = typeof text === 'string' ? text : String(text);

  // If the whole string looks like raw/pure LaTeX (e.g., has fraction/roots, no $ signs)
  const isPureLaTeX = 
    !rawStr.includes('$') && 
    (rawStr.includes('\\frac') || 
     rawStr.includes('\\sqrt') || 
     rawStr.includes('\\int') || 
     rawStr.includes('\\lim') || 
     rawStr.includes('\\sum') ||
     rawStr.includes('^') || 
     rawStr.includes('_'));

  if (isPureLaTeX) {
    return [{ type: 'block', content: rawStr.trim() }];
  }

  const segments: MathSegment[] = [];
  let index = 0;

  while (index < rawStr.length) {
    // Check block math $$
    if (rawStr.startsWith('$$', index)) {
      const nextIndex = rawStr.indexOf('$$', index + 2);
      if (nextIndex !== -1) {
        segments.push({ type: 'block', content: rawStr.slice(index + 2, nextIndex) });
        index = nextIndex + 2;
        continue;
      }
    }
    // Check inline math $
    if (rawStr.startsWith('$', index)) {
      const nextIndex = rawStr.indexOf('$', index + 1);
      if (nextIndex !== -1 && nextIndex > index + 1) {
        segments.push({ type: 'inline', content: rawStr.slice(index + 1, nextIndex) });
        index = nextIndex + 1;
        continue;
      }
    }

    // Next dollar index
    const nextDollar = rawStr.indexOf('$', index);
    if (nextDollar === -1) {
      segments.push({ type: 'text', content: rawStr.slice(index) });
      break;
    } else {
      if (nextDollar > index) {
        segments.push({ type: 'text', content: rawStr.slice(index, nextDollar) });
      }
      index = nextDollar;
    }
  }

  return segments;
}

export function MathRenderer({ text, className = "" }: { text: string; className?: string }) {
  const [katexLoaded, setKatexLoaded] = useState(false);
  const segments = useMemo(() => parseLaTeXSegments(text), [text]);

  useEffect(() => {
    loadKaTeX()
      .then(() => setKatexLoaded(true))
      .catch((err) => console.error("Could not load KaTeX:", err));
  }, []);

  if (!text) return null;

  if (!katexLoaded) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline-block w-full text-left leading-normal ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i} className="whitespace-pre-line">{seg.content}</span>;
        } else {
          return <KaTeXElement key={i} content={seg.content} isBlock={seg.type === 'block'} />;
        }
      })}
    </span>
  );
}

function KaTeXElement({ content, isBlock }: { content: string; isBlock: boolean }) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current && (window as any).katex) {
      try {
        (window as any).katex.render(content, containerRef.current, {
          displayMode: isBlock,
          throwOnError: false,
          trust: true,
        });
      } catch (err) {
        console.error("KaTeX render error:", err);
        containerRef.current.textContent = content;
      }
    }
  }, [content, isBlock]);

  if (isBlock) {
    return (
      <span 
        ref={containerRef} 
        className="block my-3 text-center overflow-x-auto overflow-y-hidden max-w-full py-1" 
      />
    );
  }

  return (
    <span 
      ref={containerRef} 
      className="inline-block font-serif mx-0.5 align-middle select-text" 
    />
  );
}

export function MathEditor({
  value,
  onChange,
  placeholder = "Write or edit formula here...",
  label = "Math Input"
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [isLiveLoaded, setIsLiveLoaded] = useState(false);
  const mathfieldRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMathLive()
      .then(() => setIsLiveLoaded(true))
      .catch((err) => console.error("Could not load MathLive:", err));
  }, []);

  useEffect(() => {
    if (mathfieldRef.current && mathfieldRef.current.value !== value) {
      mathfieldRef.current.value = value || "";
    }
  }, [value]);

  useEffect(() => {
    if (!isLiveLoaded || !containerRef.current) return;

    // Use Web Component directly
    const mField = document.createElement('math-field') as any;
    mField.style.width = '100%';
    mField.style.minHeight = '3.5rem';
    mField.style.padding = '14px';
    mField.style.fontSize = '1.15rem';
    mField.style.border = 'none';
    mField.style.outline = 'none';
    mField.style.background = 'transparent';
    mField.style.color = 'inherit';
    mField.setAttribute('placeholder', placeholder);
    mField.value = value || "";

    mField.setAttribute('menu-delimiters', 'none');

    const handleInput = (e: any) => {
      onChange(e.target.value);
      mathInputRegistry.registerMathField(label || placeholder || 'Math Editor', mField, e.target.value, onChange);
    };

    const handleFocus = () => {
      mathInputRegistry.registerMathField(label || placeholder || 'Math Editor', mField, mField.value, onChange);
    };

    mField.addEventListener('input', handleInput);
    mField.addEventListener('focus', handleFocus);
    containerRef.current.appendChild(mField);
    mathfieldRef.current = mField;

    return () => {
      mField.removeEventListener('input', handleInput);
      mField.removeEventListener('focus', handleFocus);
      mathInputRegistry.clear();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isLiveLoaded]);

  const insertFormula = (latex: string) => {
    if (mathfieldRef.current) {
      mathfieldRef.current.insert(latex, { focus: true });
      onChange(mathfieldRef.current.value);
    } else {
      let cleanVal = latex.replace(/#\?/g, '');
      onChange((value || "") + cleanVal);
    }
  };

  const formulaShortcuts = [
    { label: "Fraction", icon: "a/b", latex: "\\frac{#?}{#?}" },
    { label: "Square Root", icon: "√x", latex: "\\sqrt{#?}" },
    { label: "Cube Root", icon: "³√x", latex: "\\sqrt[3]{#?}" },
    { label: "Power", icon: "x²", latex: "#?^{#?}" },
    { label: "Subscript", icon: "x_n", latex: "#?_{#?}" },
    { label: "Sigma Sum", icon: "∑", latex: "\\sum_{{#?}}^{{#?}} {#?}" },
    { label: "Integral", icon: "∫", latex: "\\int_{#?}^{#?} {#?} dx" },
    { label: "Limit", icon: "lim", latex: "\\lim_{{#?} \\to {#?}} {#?}" },
    { label: "Pi Product", icon: "∏", latex: "\\prod_{{#?}}^{{#?}} {#?}" },
    { label: "θ (Theta)", icon: "θ", latex: "\\theta" },
    { label: "π (Pi)", icon: "π", latex: "\\pi" },
    { label: "α (Alpha)", icon: "α", latex: "\\alpha" },
    { label: "β (Beta)", icon: "β", latex: "\\beta" },
    { label: "Δ (Delta)", icon: "Δ", latex: "\\Delta" },
    { label: "λ (Lambda)", icon: "λ", latex: "\\lambda" },
    { label: "Matrix 2x2", icon: "[⊞]", latex: "\\begin{pmatrix} {#?} & {#?} \\\\ {#?} & {#?} \\end{pmatrix}" },
    { label: "α = b", icon: "≠", latex: "\\neq" },
    { label: "Infinity", icon: "∞", latex: "\\infty" },
    { label: "Therefore", icon: "∴", latex: "\\therefore" },
    { label: "Square", icon: "■", latex: "\\square" },
  ];

  return (
    <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col">
      {/* Visual Button Tray */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-100 dark:border-zinc-800 max-h-32 overflow-y-auto select-none">
        <button
          type="button"
          onClick={() => {
            if (mathfieldRef.current) {
              mathfieldRef.current.focus();
              mathInputRegistry.registerMathField(
                label || placeholder || 'Math Editor',
                mathfieldRef.current,
                mathfieldRef.current.value,
                onChange
              );
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-[11px] text-white font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 shrink-0"
          title="Open large visuals keyboard panel"
        >
          <span>📐</span>
          <span>Open Math Keyboard</span>
        </button>

        {formulaShortcuts.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => insertFormula(item.latex)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-700/80 text-[11px] text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 font-mono font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
            title={item.label}
          >
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans tracking-tight">{item.label}:</span>
            <span className="text-zinc-800 dark:text-zinc-200">{item.icon}</span>
          </button>
        ))}
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 flex flex-col p-2 text-zinc-900 dark:text-white">
        {isLiveLoaded ? (
          <div 
            ref={containerRef} 
            className="w-full bg-zinc-50 dark:bg-zinc-950/20 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl transition-all focus-within:border-blue-500/30"
          />
        ) : (
          <div className="w-full py-8 flex items-center justify-center text-zinc-400 gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-zinc-400 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Initializing Mathematical Engine...</span>
          </div>
        )}
      </div>

      {/* Real-time preview */}
      {value && (
        <div className="p-3 bg-blue-500/[0.02] dark:bg-blue-500/[0.05] border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Mathematic LaTeX Preview</span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono select-all truncate max-w-sm">{value}</span>
          </div>
          <div className="py-3 px-4 bg-white dark:bg-zinc-950/60 rounded-xl border border-blue-500/10 min-h-[44px] flex items-center justify-center text-zinc-900 dark:text-white">
            <MathRenderer text={value} />
          </div>
        </div>
      )}
    </div>
  );
}
