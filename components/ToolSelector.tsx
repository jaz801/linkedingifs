import { useRef, useState, useEffect } from 'react';

type ToolSelectorProps = {
  activeTool: 'arrow' | 'line' | 'pen' | 'square' | 'circle';
  onSelect: (tool: 'arrow' | 'line' | 'pen' | 'square' | 'circle') => void;
};

export function ToolSelector({ activeTool, onSelect }: ToolSelectorProps) {
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const menuTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (menuTimerRef.current) {
        clearTimeout(menuTimerRef.current);
      }
    };
  }, []);

  const handleShapeButtonClick = () => {
    // If not already on a shape tool, select square by default
    if (activeTool !== 'square' && activeTool !== 'circle') {
      onSelect('square');
    }

    // Toggle menu or refresh timer
    setIsShapeMenuOpen(true);

    if (menuTimerRef.current) {
      clearTimeout(menuTimerRef.current);
    }

    menuTimerRef.current = setTimeout(() => {
      setIsShapeMenuOpen(false);
    }, 3000);
  };

  const handleOptionSelect = (tool: 'square' | 'circle') => {
    onSelect(tool);
    setIsShapeMenuOpen(false);
    if (menuTimerRef.current) {
      clearTimeout(menuTimerRef.current);
    }
  };

  const isShapeActive = activeTool === 'square' || activeTool === 'circle';
  // If circle is active, we show square option. Otherwise (square or other), we show circle option.
  const showCircleOption = activeTool === 'square' || !isShapeActive;
  // actually if !isShapeActive, we default to square on click, effectively 'square' becomes active.
  // Wait, if I am on 'arrow' and click 'Shape', I switch to 'square'. 
  // Then the menu should show 'Circle' as the alternative.
  // So 'showCircleOption' is true if activeTool is 'square' OR 'arrow'/'line' etc (effectively defaulting to square).
  // AND 'showSquareOption' is true if activeTool is 'circle'.

  const renderShapeIcon = (type: 'square' | 'circle') => {
    if (type === 'circle') {
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    );
  };

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-stone-900/70 px-5 py-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        <button
          type="button"
          onClick={() => onSelect('line')}
          aria-pressed={activeTool === 'line'}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition ${activeTool === 'line'
            ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/30'
            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
            }`}
        >
          <span className="grid h-6 w-6 place-items-center rounded-md border border-current">
            <span className="block h-[2px] w-4 bg-current" />
          </span>
          Line
        </button>
        <button
          type="button"
          onClick={() => onSelect('arrow')}
          aria-pressed={activeTool === 'arrow'}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition ${activeTool === 'arrow'
            ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/30'
            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
            }`}
        >
          <span className="grid h-6 w-6 place-items-center">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="m6 4 12 8-12 8z" />
            </svg>
          </span>
          Arrow
        </button>
        <button
          type="button"
          onClick={() => onSelect('pen')}
          aria-pressed={activeTool === 'pen'}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition ${activeTool === 'pen'
            ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/30'
            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
            }`}
        >
          <span className="grid h-6 w-6 place-items-center">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M19.07 4.93L17.07 2.93C16.68 2.54 16.05 2.54 15.66 2.93L3 15.59V19H6.41L19.07 6.34C19.46 5.95 19.46 5.32 19.07 4.93ZM5 17V16.41L15.66 5.75L16.25 6.34L5.59 17H5Z" />
              <path d="M16.5 13.5V19H12" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </span>
          Pen
        </button>

        <div className="relative group">
          <button
            type="button"
            onClick={handleShapeButtonClick}
            aria-pressed={isShapeActive}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition ${isShapeActive
              ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/30'
              : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
              }`}
          >
            <span className="grid h-6 w-6 place-items-center">
              {activeTool === 'circle' ? renderShapeIcon('circle') : renderShapeIcon('square')}
            </span>
            Shape
          </button>

          {/* Pop-up Option for Alternative Shape */}
          {isShapeMenuOpen && (
            <div className="absolute left-0 top-full z-10 mt-2 flex w-32 flex-col gap-1 rounded-xl border border-white/10 bg-stone-900/95 p-1 shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-2">
              {activeTool === 'circle' ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleOptionSelect('square'); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
                >
                  <span className="grid h-4 w-4 place-items-center">
                    {renderShapeIcon('square')}
                  </span>
                  Square
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleOptionSelect('circle'); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
                >
                  <span className="grid h-4 w-4 place-items-center">
                    {renderShapeIcon('circle')}
                  </span>
                  Circle
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

