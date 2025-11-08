'use client';

import type { LineSegment } from '@/lib/canvas/types';

type LayerListProps = {
  orderedLines: LineSegment[];
  selectedLineId: string | null;
  onSelectLine: (lineId: string) => void;
};

export function LayerList({ orderedLines, selectedLineId, onSelectLine }: LayerListProps) {
  return (
    <aside
      aria-label="Layer list"
      className="order-2 flex w-full max-w-full flex-col gap-4 rounded-3xl border border-white/10 bg-stone-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur lg:order-1 lg:min-w-[220px] lg:max-w-[300px] lg:self-start"
    >
      <header className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Layers</span>
        <span className="text-xs text-white/40">
          {orderedLines.length} {orderedLines.length === 1 ? 'item' : 'items'}
        </span>
      </header>
      <div className="flex flex-wrap gap-2">
        {orderedLines.length === 0 && (
          <span className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-2 text-xs text-white/40">
            Draw a line to populate the layer list.
          </span>
        )}
        {orderedLines.map((line) => {
          const isSelected = line.id === selectedLineId;
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => onSelectLine(line.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] transition ${
                isSelected
                  ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/30'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="grid h-5 w-5 place-items-center rounded-md border border-current text-[10px]">#</span>
              {line.name}
            </button>
          );
        })}
      </div>
      {selectedLineId && (
        <span className="text-[11px] text-white/40">Tap Delete to remove the selected layer.</span>
      )}
    </aside>
  );
}

