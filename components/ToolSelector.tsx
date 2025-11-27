'use client';

type ToolSelectorProps = {
  activeTool: 'arrow' | 'line' | 'pen';
  onSelect: (tool: 'arrow' | 'line' | 'pen') => void;
};

export function ToolSelector({ activeTool, onSelect }: ToolSelectorProps) {
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
      </div>
    </div>
  );
}

