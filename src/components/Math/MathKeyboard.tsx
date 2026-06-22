import React, { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Maximize2, Move, HelpCircle, ToggleLeft, ToggleRight, Keyboard } from 'lucide-react';

// Registry to record the focused input so the keyboard knows where to insert characters
interface ActiveInputState {
  selectorId: string | null;
  element: HTMLInputElement | HTMLTextAreaElement | null;
  value: string;
  onChange: (newValue: string) => void;
  mathfield?: any; // If inserting directly into MathLive math-field
}

type RegistrySubscriber = (state: ActiveInputState) => void;

class MathInputRegistry {
  private current: ActiveInputState = { selectorId: null, element: null, value: '', onChange: () => {} };
  private listeners = new Set<RegistrySubscriber>();

  register(
    selectorId: string,
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string,
    onChange: (v: string) => void
  ) {
    this.current = { selectorId, element, value, onChange };
    this.notify();
  }

  registerMathField(
    selectorId: string,
    mfield: any,
    value: string,
    onChange: (v: string) => void
  ) {
    this.current = { selectorId, element: null, value, onChange, mathfield: mfield };
    this.notify();
  }

  get() {
    return this.current;
  }

  clear(selectorId?: string) {
    if (!selectorId || this.current.selectorId === selectorId) {
      this.current = { selectorId: null, element: null, value: '', onChange: () => {} };
      this.notify();
    }
  }

  notify() {
    this.listeners.forEach(cb => cb(this.current));
  }

  subscribe(cb: RegistrySubscriber) {
    this.listeners.add(cb);
    cb(this.current);
    return () => {
      this.listeners.delete(cb);
    };
  }
}

export const mathInputRegistry = new MathInputRegistry();

// Define keyboard tabs and their symbols
type TabName = 'Structures' | 'Basic' | 'Algebra' | 'Geometry' | 'Trigonometry' | 'Calculus' | 'Physics' | 'Chemistry' | 'Greek' | 'Symbols';

interface SymbolItem {
  display: string;   // Label on keyboard button
  latex: string;     // LaTeX command or text inserted
  offset?: number;   // Cursor offset back from the end of inserted text (for putting cursor inside brackets)
  isStructure?: boolean; // Label represents a visual math structure
}

export function FloatingMathKeyboard() {
  const [activeState, setActiveState] = useState<ActiveInputState>({
    selectorId: null,
    element: null,
    value: '',
    onChange: () => {}
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('Structures');
  const [autoWrapMath, setAutoWrapMath] = useState(true);
  
  // Custom drag position
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const keyboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to register events
    const unsubscribe = mathInputRegistry.subscribe((state) => {
      setActiveState(state);
      if (state.selectorId) {
        setIsOpen(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Position at bottom center on mount or when viewport changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPosition({ x: 0, y: 0 }); // Bottom docked on mobile
      } else {
        // Desktop default floated near bottom center
        setPosition({ x: window.innerWidth / 2 - 290, y: window.innerHeight - 340 });
      }
    }
  }, []);

  // Insert logic
  const handleInsert = (sym: SymbolItem) => {
    console.log("MathField Before Click:", activeState.mathfield);
    const isMathField = !!activeState.mathfield;
    let latexVal = sym.latex;

    // Clean any placeholder markers if they exist ONLY if they are NOT going into a MathLive mathfield!
    if (!isMathField) {
      latexVal = latexVal.replace(/#\?/g, '');
    }

    // Clicking symbol buttons like π, θ, α should insert the actual character directly for plain text areas
    if (!isMathField) {
      const directSymbols = [
        'π', 'θ', 'α', 'β', 'γ', 'Δ', 'λ', 'μ', 'ρ', 'ω',
        '≤', '≥', '≠', '±', '∞',
        '∠', '△', '⊥', '∥',
        '→', '⇌', '↑', '↓'
      ];
      if (directSymbols.includes(sym.display)) {
        latexVal = sym.display;
      }
    }

    // Help users who don't know LaTeX: if autoWrapMath is enabled, and we are working with standard textareas,
    // we wrap equations inside $ sign automatically!
    if (autoWrapMath && !isMathField && activeState.element) {
      const needsWrap = !latexVal.startsWith('$') && (
        latexVal.includes('\\') || 
        latexVal.includes('^') || 
        latexVal.includes('_') || 
        /[^{a-zA-Z0-9\s,.?!()\-+=]/.test(latexVal) // complex symbols page
      );
      if (needsWrap) {
        latexVal = `$${latexVal}$`;
      }
    }

    if (isMathField) {
      // In MathLive mathfield, we just call insert
      activeState.mathfield.insert(latexVal, { focus: true });
      if (activeState.onChange) {
        activeState.onChange(activeState.mathfield.value);
      }
    } else if (activeState.element) {
      const el = activeState.element;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const currentVal = el.value || '';
      
      const newVal = currentVal.substring(0, start) + latexVal + currentVal.substring(end);
      activeState.onChange(newVal);

      // Restore focus and position cursor elegantly
      setTimeout(() => {
        el.focus();
        let targetCursor = start + latexVal.length;
        if (sym.offset) {
          // If we wrapped with $...$, add the extra offset
          const cleanBaseLength = sym.latex.replace(/#\?/g, '').length;
          const addedLength = latexVal.length - cleanBaseLength;
          targetCursor = start + cleanBaseLength - sym.offset + addedLength;
        } else if (latexVal.endsWith('{}')) {
          targetCursor = targetCursor - 1; // Put caret inside braces
        }
        el.setSelectionRange(targetCursor, targetCursor);
      }, 50);
    }
    console.log("MathField After Click:", activeState.mathfield);
  };

  // Drag listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from header and if not on mobile
    if (window.innerWidth < 768) return;
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: position.x,
        posY: position.y
      };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    // Bounds check
    const newX = Math.max(10, Math.min(window.innerWidth - 300, dragRef.current.posX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 80, dragRef.current.posY + dy));
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const tabs: Record<TabName, SymbolItem[]> = {
    Structures: [
      { display: 'Fraction', latex: '\\frac{#?}{#?}', offset: 3, isStructure: true },
      { display: 'Square Root', latex: '\\sqrt{#?}', offset: 1, isStructure: true },
      { display: 'Power (Squared)', latex: '#?^{2}', offset: 0, isStructure: true },
      { display: 'General Power', latex: '#?^{#?}', offset: 1, isStructure: true },
      { display: 'Integral', latex: '\\int {#?}\\, dx', offset: 0, isStructure: true },
      { display: 'Definite Integral', latex: '\\int_{#?}^{#?} {#?}\\, dx', offset: 4, isStructure: true },
      { display: 'Summation', latex: '\\sum {#?}', offset: 0, isStructure: true },
      { display: 'Limit', latex: '\\lim_{{#?} \\to {#?}} {#?}', offset: 6, isStructure: true },
      { display: 'Matrix 2×2', latex: '\\begin{pmatrix} {#?} & {#?} \\\\ {#?} & {#?} \\end{pmatrix}', offset: 18, isStructure: true },
      { display: 'Matrix 3×3', latex: '\\begin{pmatrix} {#?} & {#?} & {#?} \\\\ {#?} & {#?} & {#?} \\\\ {#?} & {#?} & {#?} \\end{pmatrix}', offset: 32, isStructure: true },
      { display: 'Matrix 4×4', latex: '\\begin{pmatrix} {#?} & {#?} & {#?} & {#?} \\\\ {#?} & {#?} & {#?} & {#?} \\\\ {#?} & {#?} & {#?} & {#?} \\\\ {#?} & {#?} & {#?} & {#?} \\end{pmatrix}', offset: 50, isStructure: true },
    ],
    Basic: [
      { display: '0', latex: '0' },
      { display: '1', latex: '1' },
      { display: '2', latex: '2' },
      { display: '3', latex: '3' },
      { display: '4', latex: '4' },
      { display: '5', latex: '5' },
      { display: '6', latex: '6' },
      { display: '7', latex: '7' },
      { display: '8', latex: '8' },
      { display: '9', latex: '9' },
      { display: '+', latex: '+' },
      { display: '-', latex: '-' },
      { display: '×', latex: '\\times ' },
      { display: '÷', latex: '\\div ' },
      { display: '=', latex: '=' },
      { display: '≠', latex: '\\neq ' },
      { display: '<', latex: '<' },
      { display: '>', latex: '>' },
      { display: '≤', latex: '\\leq ' },
      { display: '≥', latex: '\\geq ' },
      { display: '±', latex: '\\pm ' },
      { display: '%', latex: '\\% ' },
      { display: '∞', latex: '\\infty ' },
      { display: 'π', latex: '\\pi ' },
      { display: '°', latex: '^{\\circ}' },
      { display: '( )', latex: '(#?)', offset: 2 },
      { display: '[ ]', latex: '[#?]', offset: 2 },
      { display: '{ }', latex: '\\{#?\\}', offset: 2 },
    ],
    Algebra: [
      { display: 'x²', latex: 'x^{2}' },
      { display: 'x³', latex: 'x^{3}' },
      { display: 'xⁿ', latex: 'x^{n}' },
      { display: '√a', latex: '\\sqrt{a}' },
      { display: '∛a', latex: '\\sqrt[3]{a}' },
      { display: 'ⁿ√a', latex: '\\sqrt[n]{a}' },
      { display: 'Fraction(a/b)', latex: '\\frac{a}{b}' },
      { display: 'log(x)', latex: '\\log(x)' },
      { display: 'ln(x)', latex: '\\ln(x)' },
      { display: '|x|', latex: '|x|' },
      { display: '(a+b)²', latex: '(a+b)^{2}' },
      { display: '(a-b)²', latex: '(a-b)^{2}' },
      { display: 'a²-b²', latex: 'a^{2}-b^{2}' },
    ],
    Geometry: [
      { display: '∠', latex: '\\angle ' },
      { display: '△', latex: '\\triangle ' },
      { display: '⊥', latex: '\\perp ' },
      { display: '∥', latex: '\\parallel ' },
      { display: '° (Degree)', latex: '^{\\circ}' },
      { display: 'π (Pi)', latex: '\\pi ' },
      { display: '≅', latex: '\\cong ' },
      { display: '≈', latex: '\\approx ' },
      { display: '∴', latex: '\\therefore ' },
      { display: '∵', latex: '\\because ' },
    ],
    Trigonometry: [
      { display: 'sin', latex: '\\sin(#?)', offset: 2 },
      { display: 'cos', latex: '\\cos(#?)', offset: 2 },
      { display: 'tan', latex: '\\tan(#?)', offset: 2 },
      { display: 'cot', latex: '\\cot(#?)', offset: 2 },
      { display: 'sec', latex: '\\sec(#?)', offset: 2 },
      { display: 'cosec', latex: '\\csc(#?)', offset: 2 },
      { display: 'sin⁻¹', latex: '\\sin^{-1}(#?)', offset: 2 },
      { display: 'cos⁻¹', latex: '\\cos^{-1}(#?)', offset: 2 },
      { display: 'tan⁻¹', latex: '\\tan^{-1}(#?)', offset: 2 },
    ],
    Calculus: [
      { display: '∫ dx', latex: '\\int #?\\, dx', offset: 4 },
      { display: '∬', latex: '\\iint ' },
      { display: '∭', latex: '\\iiint ' },
      { display: 'Σ (sum)', latex: '\\sum_{i=1}^{n}' },
      { display: 'Π (prod)', latex: '\\prod_{i=1}^{n}' },
      { display: 'lim', latex: '\\lim_{x \\to 0}' },
      { display: '∂', latex: '\\partial ' },
      { display: '∇', latex: '\\nabla ' },
      { display: '∞', latex: '\\infty ' },
    ],
    Physics: [
      { display: 'Δ (Delta)', latex: '\\Delta ' },
      { display: 'λ (Lambda)', latex: '\\lambda ' },
      { display: 'μ (Mu)', latex: '\\mu ' },
      { display: 'ρ (Rho)', latex: '\\rho ' },
      { display: 'ω (Omega)', latex: '\\omega ' },
      { display: 'α (Alpha)', latex: '\\alpha ' },
      { display: 'β (Beta)', latex: '\\beta ' },
      { display: 'γ (Gamma)', latex: '\\gamma ' },
      { display: 'θ (Theta)', latex: '\\theta ' },
      { display: 'm/s', latex: '\\text{m/s}' },
      { display: 'm/s²', latex: '\\text{m/s}^{2}' },
      { display: 'N (Newton)', latex: '\\text{N}' },
      { display: 'J (Joule)', latex: '\\text{J}' },
      { display: 'W (Watt)', latex: '\\text{W}' },
      { display: 'V (Volt)', latex: '\\text{V}' },
      { display: 'A (Ampere)', latex: '\\text{A}' },
      { display: 'Ω (Ohm)', latex: '\\Omega ' },
    ],
    Chemistry: [
      { display: '→', latex: '\\rightarrow ' },
      { display: '←', latex: '\\leftarrow ' },
      { display: '⇌', latex: '\\rightleftharpoons ' },
      { display: '↑', latex: '\\uparrow ' },
      { display: '↓', latex: '\\downarrow ' },
      { display: 'Δ (Heat)', latex: '\\Delta ' },
      { display: 'H₂O', latex: '\\text{H}_2\\text{O}' },
      { display: 'CO₂', latex: '\\text{CO}_2' },
      { display: 'O₂', latex: '\\text{O}_2' },
      { display: 'H₂', latex: '\\text{H}_2' },
      { display: 'NaOH', latex: '\\text{NaOH}' },
      { display: 'HCl', latex: '\\text{HCl}' },
      { display: 'H₂SO₄', latex: '\\text{H}_2\\text{SO}_4' },
      { display: 'mol', latex: '\\text{mol}' },
      { display: 'M (Molar)', latex: '\\text{M}' },
      { display: 'N (Normal)', latex: '\\text{N}' },
    ],
    Greek: [
      { display: 'α', latex: '\\alpha ' },
      { display: 'β', latex: '\\beta ' },
      { display: 'γ', latex: '\\gamma ' },
      { display: 'δ', latex: '\\delta ' },
      { display: 'θ', latex: '\\theta ' },
      { display: 'λ', latex: '\\lambda ' },
      { display: 'μ', latex: '\\mu ' },
      { display: 'π', latex: '\\pi ' },
      { display: 'ρ', latex: '\\rho ' },
      { display: 'σ', latex: '\\sigma ' },
      { display: 'τ', latex: '\\tau ' },
      { display: 'ω', latex: '\\omega ' },
      { display: 'Ω', latex: '\\Omega ' },
    ],
    Symbols: [
      { display: '∈', latex: '\\in ' },
      { display: '∉', latex: '\\notin ' },
      { display: '⊂', latex: '\\subset ' },
      { display: '⊃', latex: '\\supset ' },
      { display: '∪', latex: '\\cup ' },
      { display: '∩', latex: '\\cap ' },
      { display: '∀', latex: '\\forall ' },
      { display: '∃', latex: '\\exists ' },
      { display: '⇒', latex: '\\implies ' },
      { display: '⇔', latex: '\\iff ' },
      { display: '≡', latex: '\\equiv ' },
      { display: '≈', latex: '\\approx ' },
    ],
  };

  const currentTabSymbols = tabs[activeTab] || [];

  if (!isOpen) return null;

  return (
    <div
      ref={keyboardRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: window.innerWidth < 768 ? 0 : `${position.x}px`,
        top: window.innerWidth < 768 ? 'auto' : `${position.y}px`,
        bottom: window.innerWidth < 768 ? 0 : 'auto',
        zIndex: 99999,
        width: window.innerWidth < 768 ? '100%' : '560px',
      }}
      className={`bg-white dark:bg-zinc-950 border-t md:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all overflow-hidden flex flex-col ${
        isDragging ? 'opacity-90 scale-[1.01]' : ''
      }`}
    >
      {/* Header Panel */}
      <div className="drag-handle px-4 py-3 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between cursor-move select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Keyboard size={14} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none">
              পারদর্শী MATHEMATICAL KEYBOARD
            </h4>
            <p className="text-[9px] text-zinc-500 font-bold tracking-tight">Click to visually insert formulas directly at your cursor</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Auto wrap switcher */}
          {activeState.element && (
            <button
              onClick={() => setAutoWrapMath(!autoWrapMath)}
              onMouseDown={(e) => e.preventDefault()}
              className="text-[9px] font-bold flex items-center gap-1 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-blue-500 transition-all cursor-pointer"
              title="Wrap non-text equations automatically in $ signs so KaTeX renders them perfectly on student side."
            >
              <span>Auto-wrap $..$</span>
              {autoWrapMath ? (
                <ToggleRight size={16} className="text-blue-600" />
              ) : (
                <ToggleLeft size={16} className="text-zinc-400" />
              )}
            </button>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            title={isMinimized ? "Expand Keyboard" : "Minimize Keyboard"}
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              mathInputRegistry.clear();
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
            title="Close Keyboard"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main Keyboard Body */}
      {!isMinimized && (
        <div className="flex flex-col">
          {/* Tab Selection */}
          <div className="flex items-center gap-0.5 px-3 py-2 bg-zinc-100/50 dark:bg-zinc-950/60 overflow-x-auto select-none border-b border-zinc-100 dark:border-zinc-900 scrollbar-none">
            {(Object.keys(tabs) as TabName[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                onMouseDown={(e) => e.preventDefault()}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm font-black'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Symbol Keys Grid */}
          <div className="p-3 bg-white dark:bg-zinc-950 max-h-[220px] overflow-y-auto min-h-[120px]">
            {activeTab === 'Structures' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 select-none animate-fadeIn">
                {currentTabSymbols.map((sym, idx) => {
                  // Tactile inline Microsoft Equation Editor layout preview generators
                  const renderVisualStructure = (s: SymbolItem) => {
                    if (s.display === 'Fraction') {
                      return (
                        <div className="flex flex-col items-center justify-center scale-90 leading-none">
                          <div className="w-3.5 h-3 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-850" />
                          <div className="w-6 h-[1.5px] bg-zinc-700 dark:bg-zinc-300 my-1" />
                          <div className="w-3.5 h-3 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-850" />
                        </div>
                      );
                    }
                    if (s.display === 'Square Root') {
                      return (
                        <div className="flex items-center gap-0.5 scale-90 font-bold font-serif text-[13px] text-zinc-800 dark:text-zinc-200">
                          <span className="text-zinc-500 font-sans text-sm">√</span>
                          <div className="border border-dashed border-zinc-400 dark:border-zinc-500 w-4 h-3.5 rounded-sm bg-zinc-100/40 dark:bg-zinc-850" />
                        </div>
                      );
                    }
                    if (s.display === 'Power (Squared)') {
                      return (
                        <div className="flex items-center gap-0.5 scale-90">
                          <div className="w-4 h-4 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-850" />
                          <span className="text-[10px] font-bold text-zinc-500 font-mono -translate-y-1">2</span>
                        </div>
                      );
                    }
                    if (s.display === 'General Power') {
                      return (
                        <div className="flex items-center gap-0.5 scale-90">
                          <div className="w-4 h-4 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-850" />
                          <div className="w-2.5 h-2.5 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-850 -translate-y-1.5" />
                        </div>
                      );
                    }
                    if (s.display === 'Integral') {
                      return (
                        <div className="flex items-center gap-1 scale-[0.9] text-zinc-900 dark:text-zinc-200 font-serif">
                          <span className="text-sm font-bold text-zinc-500">∫</span>
                          <div className="w-3.5 h-3.5 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-850" />
                          <span className="font-sans text-[9px] text-zinc-400 dark:text-zinc-550 ml-0.5">dx</span>
                        </div>
                      );
                    }
                    if (s.display === 'Definite Integral') {
                      return (
                        <div className="flex items-center gap-1 scale-[0.8] text-zinc-900 dark:text-zinc-200 font-serif relative">
                          <span className="text-base font-bold text-zinc-500">∫</span>
                          <div className="absolute -top-1 left-2.5 w-2 h-2 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/45 dark:bg-zinc-850 scale-90" />
                          <div className="absolute -bottom-1 left-1.5 w-2 h-2 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/45 dark:bg-zinc-850 scale-90" />
                          <div className="w-3.5 h-3.5 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-840 ml-3" />
                          <span className="font-sans text-[8px] text-zinc-400 dark:text-zinc-550 ml-0.5">dx</span>
                        </div>
                      );
                    }
                    if (s.display === 'Summation') {
                      return (
                        <div className="flex flex-col items-center scale-[0.85] leading-none select-none">
                          <div className="w-3 h-1.5 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-[1px] bg-zinc-100/45 dark:bg-zinc-850 mb-0.5 scale-90" />
                          <div className="flex items-center gap-1">
                            <span className="font-serif text-[13px] text-zinc-500 font-bold leading-none">∑</span>
                            <div className="w-3.5 h-3.5 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-850" />
                          </div>
                          <div className="w-3 h-1.5 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-[1px] bg-zinc-100/45 dark:bg-zinc-850 mt-0.5 scale-90" />
                        </div>
                      );
                    }
                    if (s.display === 'Limit') {
                      return (
                        <div className="flex flex-col items-center scale-[0.85] select-none font-bold">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-zinc-500 font-sans tracking-tight">lim</span>
                            <div className="w-3.5 h-3.5 border border-dashed border-zinc-400 dark:border-zinc-500 rounded-sm bg-zinc-100/40 dark:bg-zinc-850" />
                          </div>
                          <div className="flex items-center gap-0.5 text-[8px] text-zinc-400 dark:text-zinc-500 -mt-0.5">
                            <div className="w-2 h-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-[1px]" />
                            <span>→</span>
                            <div className="w-2 h-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-[1px]" />
                          </div>
                        </div>
                      );
                    }
                    if (s.display.startsWith('Matrix')) {
                      const dim = s.display.split(' ')[1]; // 2×2, 3×3, 4×4
                      const cells = dim === '2×2' ? 4 : dim === '3×3' ? 9 : 16;
                      const cols = dim === '2×2' ? 'grid-cols-2' : dim === '3×3' ? 'grid-cols-3' : 'grid-cols-4';
                      return (
                        <div className="flex items-center scale-[0.85] select-none text-zinc-400">
                          <span className="text-zinc-400 dark:text-zinc-650 font-sans font-light text-[15px] mr-1">[</span>
                          <div className={`grid ${cols} gap-[2px] px-0.5`}>
                            {Array.from({ length: cells }).map((_, i) => (
                              <div key={i} className="w-1.5 h-1.5 border border-dashed border-zinc-400 dark:border-zinc-550 bg-zinc-100/40 dark:bg-zinc-850 rounded-[1px]" />
                            ))}
                          </div>
                          <span className="text-zinc-400 dark:text-zinc-650 font-sans font-light text-[15px] ml-1">]</span>
                        </div>
                      );
                    }
                    return <span className="font-sans text-[10px] uppercase font-bold tracking-tight text-zinc-500">{s.display}</span>;
                  };

                  return (
                    <button
                      key={idx}
                      onClick={() => handleInsert(sym)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="p-2 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-blue-500/5 hover:text-blue-600 hover:border-blue-500/20 dark:hover:bg-blue-550/10 transition-all cursor-pointer shadow-sm active:scale-95 flex flex-col items-center justify-between min-h-[72px]"
                      title={`Insert visual structure`}
                    >
                      {renderVisualStructure(sym)}
                      <span className="text-[10px] font-sans font-black text-zinc-500 dark:text-zinc-400 mt-2 leading-none">{sym.display}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-7 md:grid-cols-8 gap-1.5 select-none animate-fadeIn">
                {currentTabSymbols.map((sym, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleInsert(sym)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="px-2 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 text-xs text-zinc-800 dark:text-zinc-200 font-mono font-bold hover:bg-blue-500 hover:text-white hover:border-blue-550 dark:hover:bg-blue-600 transition-all cursor-pointer shadow-sm active:scale-95 flex flex-col items-center justify-center min-h-[38px]"
                    title={`Insert LaTeX: ${sym.latex}`}
                  >
                    <span className="truncate max-w-full text-center leading-none tracking-tight">{sym.display}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick instructions bar in base footer */}
          <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-90 w-full border-t border-zinc-100 dark:border-zinc-900 text-[9px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between select-none">
            <span className="flex items-center gap-1">
              <HelpCircle size={10} className="text-blue-500" />
              <span>Target: <span className="font-mono text-zinc-800 dark:text-zinc-200">{activeState.selectorId || 'No active field'}</span></span>
            </span>
            <span>Made with ❤ for Parodorshhi Teachers</span>
          </div>
        </div>
      )}
    </div>
  );
}
