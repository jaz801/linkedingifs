'use client';

// 🛠️ EDIT LOG [2025-11-11-E]
// 🔍 WHAT WAS WRONG:
// The export rail still claimed PNG-only backgrounds and failed to confirm that downloads respect the canvas dimensions, causing confusion about JPEG support and output sizing.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers routinely upload JPG/JPEG references and need confidence that the exported GIF matches their configured width and height to avoid rework.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Updated the helper copy so the UI accurately lists the supported formats and reinforces that exports stay locked to the current canvas size.
// 🛠️ EDIT LOG [2025-11-11-D]
// 🔍 WHAT WAS WRONG:
// The right-hand panel still displayed legacy helper copy about preview scaling and exporting, which product asked to retire.
// 🤔 WHY IT HAD TO BE CHANGED:
// The extra sentences distracted users from the controls and caused confusion about current export behavior.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Removed the unused helper paragraphs so the menu stays focused on actionable settings without redundant instructions.
// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// The width control rejected any value below 1px, so designers could not create hairline strokes or taper lines to match reference art.
// 🤔 WHY IT HAD TO BE CHANGED:
// Exported annotations need to support very thin guides; clamping to 1px broke parity with competing tools and the underlying renderer already handles sub-pixel widths.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Lowered the minimum to 0.001 with matching precision so the UI, state, and exporters all honor fractional stroke widths without rounding back up.
// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// The “block” cap setting still rendered an extra rectangle, and the arrow head didn’t fully reach the line tip because stroke caps extended beyond the endpoint.
// 🤔 WHY IT HAD TO BE CHANGED:
// Users expect the default to be an unadorned line and any selected arrow to replace the tip cleanly without visible gaps.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Simplified the selector to a plain line versus arrow choice and left extra geometry to the renderers only when arrow mode is active.
// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// Line ends always rendered as rounded strokes and the control surface offered no way to switch between arrow or block heads.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a cap picker designers couldn't match brand guidelines, and exports ignored the requested terminal shapes.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added an end-cap selector with visual icons, defaulting to block heads, and wired it into line state so previews and GIFs stay consistent.

import type { ChangeEvent, RefObject } from 'react';
import { useMemo } from 'react';

import type { LineEndCap, LineShapeType } from '@/lib/canvas/types';

const MIN_LINE_WIDTH = 0.001;
const LINE_WIDTH_STEP = 0.001;

type ShapeControlsProps = {
  color: string;
  shapeColor: string;
  lineWidthValue: string;
  shape: LineShapeType | null;
  shapeCount: string;
  canvasWidth: string;
  canvasHeight: string;
  lineEndCap: LineEndCap;
  colorInputRef: RefObject<HTMLInputElement | null>;
  shapeColorInputRef: RefObject<HTMLInputElement | null>;
  onOpenColorPicker: () => void;
  onOpenShapeColorPicker: () => void;
  onColorChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onShapeColorChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLineWidthChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLineWidthBlur: () => void;
  onSelectShape: (shape: LineShapeType) => void;
  onShapeCountChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClampShapeCount: () => void;
  onAdjustShapeCount: (delta: number) => void;
  onCanvasDimensionChange: (
    dimension: 'width' | 'height',
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  onClampCanvasDimension: (dimension: 'width' | 'height') => () => void;
  isShapeControlsDisabled: boolean;
  isShapeColorDisabled: boolean;
  isAnimationEnabled: boolean;
  onToggleAnimation: () => void;
  onSelectLineEndCap: (endCap: LineEndCap) => void;
  onRequestUpload: () => void;
  onRequestDownload: () => void;
  isDownloadInProgress: boolean;
  exportFilename: string;
  onExportFilenameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadNotice: string | null;
};

const shapeTypes: Array<LineShapeType> = ['circle', 'square', 'triangle'];
const endCapOptions: Array<LineEndCap> = ['line', 'arrow'];

export function ShapeControls({
  color,
  shapeColor,
  lineWidthValue,
  shape,
  shapeCount,
  canvasWidth,
  canvasHeight,
  lineEndCap,
  colorInputRef,
  shapeColorInputRef,
  onOpenColorPicker,
  onOpenShapeColorPicker,
  onColorChange,
  onShapeColorChange,
  onLineWidthChange,
  onLineWidthBlur,
  onSelectShape,
  onShapeCountChange,
  onClampShapeCount,
  onAdjustShapeCount,
  onCanvasDimensionChange,
  onClampCanvasDimension,
  isShapeControlsDisabled,
  isShapeColorDisabled,
  isAnimationEnabled,
  onToggleAnimation,
  onSelectLineEndCap,
  onRequestUpload,
  onRequestDownload,
  isDownloadInProgress,
  exportFilename,
  onExportFilenameChange,
  uploadNotice,
}: ShapeControlsProps) {
  const formattedObjectColor = useMemo(
    () => color.replace('#', '').toUpperCase(),
    [color],
  );
  const formattedShapeColor = useMemo(
    () => shapeColor.replace('#', '').toUpperCase(),
    [shapeColor],
  );

  return (
    <aside className="order-3 flex w-full flex-col gap-5 rounded-3xl border border-white/10 bg-stone-900/70 p-4 text-xs shadow-2xl shadow-black/30 backdrop-blur lg:order-3 lg:min-w-[260px] lg:max-w-[320px] lg:h-full lg:self-start lg:overflow-y-auto">
      <header>
        <h1 className="text-base font-semibold text-white">Shape Controls</h1>
        <p className="mt-1 text-[11px] text-white/60">
          Tweak the stroke, color, and layout for your exported GIF frames.
        </p>
      </header>

      <section className="flex flex-col gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Object Color
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenColorPicker}
            aria-label="Open color picker"
            className="flex h-8 w-8 items-center justify-center rounded-2xl border border-white/20 bg-white/90 shadow-inner shadow-black/30 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ backgroundColor: color }}
          />
          <button
            type="button"
            onClick={onOpenColorPicker}
            className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-medium tracking-[0.3em] text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {formattedObjectColor}
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={color}
            onChange={onColorChange}
            className="sr-only"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Shape Color
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenShapeColorPicker}
            aria-label="Open shape color picker"
            disabled={isShapeColorDisabled}
            className={`flex h-8 w-8 items-center justify-center rounded-2xl border border-white/20 bg-white/90 shadow-inner shadow-black/30 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              isShapeColorDisabled
                ? 'cursor-not-allowed opacity-40 hover:scale-100'
                : ''
            }`}
            style={{ backgroundColor: shapeColor }}
          />
          <button
            type="button"
            onClick={onOpenShapeColorPicker}
            disabled={isShapeColorDisabled}
            className={`rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-medium tracking-[0.3em] text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              isShapeColorDisabled ? 'cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-white/5' : ''
            }`}
          >
            {formattedShapeColor}
          </button>
          <input
            ref={shapeColorInputRef}
            type="color"
            value={shapeColor}
            onChange={onShapeColorChange}
            className="sr-only"
            disabled={isShapeColorDisabled}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Line Width</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/70">
            <div className="flex h-6 w-6 flex-col justify-between">
              <span className="h-px w-full bg-white/60" />
              <span className="h-[3px] w-full bg-white/80" />
              <span className="h-[3px] w-full bg-white/80" />
            </div>
            <input
              type="number"
              min={MIN_LINE_WIDTH}
              step={LINE_WIDTH_STEP}
              value={lineWidthValue}
              onChange={onLineWidthChange}
              onBlur={onLineWidthBlur}
              className="w-12 bg-transparent text-right text-sm font-semibold text-white outline-none"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Shape</span>
        <div className="flex flex-wrap items-center gap-2">
          {shapeTypes.map((type) => {
            const isActive = shape === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectShape(type)}
                aria-label={`Select ${type}`}
                disabled={isShapeControlsDisabled}
                className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  isActive
                    ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/40'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
                } ${isShapeControlsDisabled ? 'cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-white/5 hover:text-white/60' : ''}`}
              >
                {renderShapeIcon(type)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Shape Animation
        </span>
        <button
          type="button"
          onClick={onToggleAnimation}
          aria-pressed={!isAnimationEnabled}
          disabled={isShapeControlsDisabled}
          className={`w-full rounded-2xl border px-2.5 py-2 text-[11px] font-semibold tracking-[0.3em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            isAnimationEnabled
              ? 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
              : 'border-white bg-white text-stone-900 shadow-lg shadow-white/40'
          } ${isShapeControlsDisabled ? 'cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-white/5 hover:text-white/60' : ''}`}
        >
          Animation Off
        </button>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Line End
          </span>
          <div className="flex items-center gap-2">
            {endCapOptions.map((option) => {
              const isActive = lineEndCap === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSelectLineEndCap(option)}
                  aria-label={
                    option === 'arrow' ? 'Use arrow head' : 'Use plain line end'
                  }
                  disabled={isShapeControlsDisabled}
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    isActive
                      ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/40'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
                  } ${
                    isShapeControlsDisabled
                      ? 'cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-white/5 hover:text-white/60'
                      : ''
                  }`}
                >
                  {renderLineEndCapIcon(option)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Shape Count</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2">
            <input
              type="number"
              min={1}
              value={shapeCount}
              onChange={onShapeCountChange}
              onBlur={onClampShapeCount}
              disabled={isShapeControlsDisabled}
              className="w-12 bg-transparent text-center text-sm font-semibold text-white outline-none"
            />
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => onAdjustShapeCount(1)}
                disabled={isShapeControlsDisabled}
                className="grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Increase shape count"
              >
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current">
                  <path d="M6 3 10 9H2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onAdjustShapeCount(-1)}
                disabled={isShapeControlsDisabled}
                className="grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Decrease shape count"
              >
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current">
                  <path d="M2 4h8L6 10z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Canvas Size</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/70">
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">W</span>
              <input
                type="number"
                min={1}
                value={canvasWidth}
                onChange={onCanvasDimensionChange('width')}
                onBlur={onClampCanvasDimension('width')}
                className="w-14 bg-transparent text-right text-sm font-semibold text-white outline-none"
              />
            </label>
            <span className="text-sm font-semibold text-white/40">×</span>
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">H</span>
              <input
                type="number"
                min={1}
                value={canvasHeight}
                onChange={onCanvasDimensionChange('height')}
                onBlur={onClampCanvasDimension('height')}
                className="w-14 bg-transparent text-right text-sm font-semibold text-white outline-none"
              />
            </label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">px</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
        <label className="flex w-full flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">File Name</span>
          <input
            type="text"
            value={exportFilename}
            onChange={onExportFilenameChange}
            placeholder="animation"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-white/40 focus:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            spellCheck={false}
            disabled={isDownloadInProgress}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRequestUpload}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-white transition hover:border-white/30 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={onRequestDownload}
            disabled={isDownloadInProgress}
            className={`rounded-2xl border border-white bg-white px-3 py-2 text-[11px] font-semibold text-stone-900 shadow-lg shadow-white/50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              isDownloadInProgress
                ? 'cursor-wait opacity-70 hover:translate-y-0 hover:shadow-lg'
                : 'hover:translate-y-[-1px] hover:shadow-xl'
            }`}
          >
            {isDownloadInProgress ? 'Preparing…' : 'Download'}
          </button>
        </div>
        {isDownloadInProgress ? (
          <div
            className="flex w-full flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>Rendering GIF…</span>
              <span className="animate-pulse text-white/80">Working</span>
            </div>
            <progress className="h-1.5 w-full overflow-hidden rounded-full accent-white" />
          </div>
        ) : null}
        {uploadNotice ? (
          <p
            className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] font-medium text-amber-100/90"
            role="status"
            aria-live="polite"
          >
            {uploadNotice}
          </p>
        ) : null}
        <p className="text-[11px] text-white/40">
          Supports PNG, JPG, or JPEG backgrounds. GIF exports match your current canvas dimensions.
        </p>
      </section>
    </aside>
  );
}

function renderShapeIcon(type: LineShapeType) {
  if (type === 'circle') {
    return (
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }

  if (type === 'square') {
    return (
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
        <rect x="4" y="4" width="16" height="16" rx="1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
      <polygon points="12 4 20 20 4 20" />
    </svg>
  );
}

function renderLineEndCapIcon(option: LineEndCap) {
  if (option === 'arrow') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M4 12h9l-2-4 9 4-9 4 2-4H4z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

