'use client';

// 🛠️ EDIT LOG [Cursor Rule #1]
// 🔍 WHAT WAS WRONG:
// The shape picker only supported two static shapes and a fixed count label, limiting user control.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without distinct buttons and an editable count, users couldn't choose a triangle or adjust the number of shapes.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Introducing state-driven buttons with equal spacing and hover incrementers keeps the UI consistent while adding flexibility.

// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Duplicate UI controls
// 📂 FILE: app/page.tsx
// 🧾 HISTORY: This issue has now occurred 1 time in this project.
//   - #1 on 2025-11-08 [Fixed in app/page.tsx]
// 🚨 Next steps:
// Periodically audit toolbar interactions to avoid redundant affordances.

import { ChangeEvent, useRef, useState } from 'react';

export default function Home() {
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(1);
  const [shape, setShape] = useState<'circle' | 'square' | 'triangle'>('circle');
  const [shapeCount, setShapeCount] = useState('1');
  const colorInputRef = useRef<HTMLInputElement>(null);

  const openColorPicker = () => {
    const input = colorInputRef.current;
    if (!input) return;

    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }

    input.click();
  };

  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    setColor(event.target.value.toUpperCase());
  };

  const handleLineWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    setLineWidth(value <= 0 ? 1 : Math.floor(value));
  };

  const normalizeLineWidth = () => {
    setLineWidth((prev) => (prev <= 0 ? 1 : prev));
  };

  const handleShapeCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setShapeCount(event.target.value);
  };

  const clampShapeCount = () => {
    const nextValue = Number(shapeCount);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setShapeCount('1');
      return;
    }

    setShapeCount(String(Math.floor(nextValue)));
  };

  const adjustShapeCount = (delta: number) => {
    const current = Number(shapeCount);
    const base = Number.isFinite(current) && current > 0 ? current : 1;
    const next = Math.max(1, base + delta);
    setShapeCount(String(next));
  };

  const renderShapeIcon = (type: 'circle' | 'square' | 'triangle') => {
    if (type === 'circle') {
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    }

    if (type === 'square') {
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <rect x="4" y="4" width="16" height="16" rx="1" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <polygon points="12 4 20 20 4 20" />
      </svg>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 font-sans text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:gap-14 lg:px-8">
        <section
          aria-label="Preview"
          className="flex flex-1 items-center justify-center"
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-stone-900/70 shadow-2xl shadow-black/30">
            <img
              className="aspect-[4/3] w-full object-cover"
              src="https://placehold.co/896x774"
              alt="Preview"
            />

            <div className="pointer-events-none absolute inset-x-6 bottom-6 hidden select-none justify-between gap-4 rounded-2xl bg-stone-900/80 px-6 py-4 text-xs font-medium uppercase tracking-widest text-white/70 shadow-lg shadow-black/30 sm:flex">
              <span className="flex items-center gap-2">
                <span className="h-[2px] w-12 origin-top-left -rotate-6 bg-white/70" />
                Align
              </span>
              <span className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-white/60">
                  <span className="block h-3 w-3 rotate-45 border-2 border-white/60 border-b-0 border-r-0" />
                </span>
                Export
              </span>
            </div>
          </div>
        </section>

        <aside className="flex w-full max-w-md flex-col gap-8 rounded-3xl bg-stone-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <header>
            <h1 className="text-lg font-semibold text-white">
              Shape Controls
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Tweak the stroke, color, and layout for your exported GIF frames.
            </p>
          </header>

          <section className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Color
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openColorPicker}
                aria-label="Open color picker"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/90 shadow-inner shadow-black/30 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ backgroundColor: color }}
              />
              <button
                type="button"
                onClick={openColorPicker}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium tracking-widest text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {color.replace('#', '').toUpperCase()}
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={handleColorChange}
                className="sr-only"
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Line Width
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                <div className="flex h-8 w-8 flex-col justify-between">
                  <span className="h-px w-full bg-white/60" />
                  <span className="h-[3px] w-full bg-white/80" />
                  <span className="h-[3px] w-full bg-white/80" />
                </div>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={lineWidth}
                  onChange={handleLineWidthChange}
                  onBlur={normalizeLineWidth}
                  className="w-16 bg-transparent text-right text-base font-semibold text-white outline-none"
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Shape
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {(['circle', 'square', 'triangle'] as const).map((type) => {
                const isActive = shape === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setShape(type)}
                    aria-label={`Select ${type}`}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      isActive
                        ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/40'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {renderShapeIcon(type)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Shape Count
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input
                  type="number"
                  min={1}
                  value={shapeCount}
                  onChange={handleShapeCountChange}
                  onBlur={clampShapeCount}
                  className="w-16 bg-transparent text-center text-base font-semibold text-white outline-none"
                />
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustShapeCount(1)}
                    className="grid h-6 w-6 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-label="Increase shape count"
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                      <path d="M6 3 10 9H2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustShapeCount(-1)}
                    className="grid h-6 w-6 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-label="Decrease shape count"
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                      <path d="M2 4h8L6 10z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </main>

      <footer className="border-t border-white/10 bg-stone-900/60 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10" />
            <div>
              <p className="text-sm font-semibold text-white">
                Ready to export?
              </p>
              <p className="text-xs text-white/60">
                Save to your GIF library or download locally.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Upload GIF
            </button>
            <button
              type="button"
              className="rounded-2xl border border-white bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-lg shadow-white/50 transition hover:translate-y-[-1px] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Download
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
