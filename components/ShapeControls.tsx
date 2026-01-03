'use client';

// 🛠️ EDIT LOG [2025-12-XX-A]
// 🔍 WHAT WAS WRONG:
// Export controls showed separate "Export MP4" and "Export GIF" buttons, and MP4 export had no loop options.
// 🤔 WHY IT HAD TO BE CHANGED:
// Users needed a cleaner export interface with options to control MP4 loops and see video duration before exporting.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Replaced separate buttons with a "Generate" button that opens a dropdown menu with export options. Added loop count control for MP4 exports with real-time duration display.

// 🛠️ EDIT LOG [2025-11-12-E]
// 🔍 WHAT WAS WRONG:
// The export status badge still shouted “GIF READY” in the right rail, contradicting product’s request to retire that copy.
// 🤔 WHY IT HAD TO BE CHANGED:
// The lingering label confused reviewers because other surfaces already dropped the phrase, making the rail feel inconsistent.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Swap the badge text to a neutral “READY” string and refresh the screen-reader label so we keep status coverage without the banned copy.

// 🛠️ EDIT LOG [2025-11-12-D]
// 🔍 WHAT WAS WRONG:
// The cached GIF callout still repeated “Cached GIF ready” copy in the export rail, cluttering the sidebar and distracting from the actual controls.
// 🤔 WHY IT HAD TO BE CHANGED:
// Product wants the cache indicator to feel ambient—just a status badge—so the menu stays focused on actionable settings while background renders stay invisible.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Strip the redundant headline/description, leave the badge as the sole visible cue, and add a subtle status dot plus screen-reader text so we keep accessibility without on-screen narration.

// 🛠️ EDIT LOG [2025-11-12-C]
// 🔍 WHAT WAS WRONG:
// Disabling the download button while snapshots rendered made exports feel unavailable even though live rendering fallback still works.
// 🤔 WHY IT HAD TO BE CHANGED:
// Users assumed downloads were blocked during caching and reported the control as missing, stalling their workflow.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Keep the download button enabled, clarify the tooltip, and trim the redundant caching helper text so background renders stay invisible to the user.
// 🛠️ EDIT LOG [2025-11-12-B]
// 🔍 WHAT WAS WRONG:
// The download button stayed clickable while the snapshot cache was still rendering, so users kept triggering slow direct encodes.
// 🤔 WHY IT HAD TO BE CHANGED:
// Letting downloads jump the queue defeated the background encoder and broke the “instant” promise when the cache wasn’t ready.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Disable the download button until the snapshot state reports ready and surface clearer button text so users understand when caching is still in flight.
// 🛠️ EDIT LOG [2025-11-12-A]
// 🔍 WHAT WAS WRONG:
// Export controls gave no signal when the cached GIF was ready, so users guessed whether downloads would be instant.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without visual feedback designers kept re-rendering unnecessarily, undermining the background encoder improvements.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Render a cached-status banner that highlights when the latest snapshot is ready and explains when auto-rendering is still running.

// 🛠️ EDIT LOG [2025-11-11-I]
// 🔍 WHAT WAS WRONG:
// The stepper still jumped in whole numbers and allowed over-precise entries, so aiming for widths like 0.5 required retyping and often snapped back to 1.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers primarily need tenths under 1; without predictable 0.1 increments, thin strokes remained out of reach.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Tightened the minimum and step to 0.1 so the arrows land on 0.1–0.9 reliably while still blocking zero and negative widths.
// 🛠️ EDIT LOG [2025-11-11-H]
// 🔍 WHAT WAS WRONG:
// The number field ignored localized decimals, so typing “0,5” or using the spin buttons failed to update the line width.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers in comma locales rely on those controls to enter sub-pixel strokes; blocking them left fractional widths unusable.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Let the input surface any locale-friendly text while the parent sanitizes it, and hint decimal input so the spinner and keyboard paths both work.
// 🛠️ EDIT LOG [2025-11-11-G]
// 🔍 WHAT WAS WRONG:
// The export rail showed a determinate bar, but it still idled at “Wrapping up…” while the browser streamed the GIF, so the UI lied about completion.
// 🤔 WHY IT HAD TO BE CHANGED:
// Progress must cover both encoding and download phases; otherwise designers can’t tell when it’s safe to leave the tab.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Drive the bar with streaming updates from the client so the percentage and countdown land exactly when the file finishes downloading.
// 🛠️ EDIT LOG [2025-11-11-F]
// 🔍 WHAT WAS WRONG:
// The export panel only showed an indeterminate bar while renders were in flight, so designers had no guidance on how long GIF generation would take.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a determinate progress indicator and ETA, longer renders felt broken and users kept retrying downloads unnecessarily.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Thread the new progress percentage and remaining time into the panel and render a determinate bar with countdown messaging while exports run.
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

// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2 — Line Width Controls]
// 🧠 ERROR TYPE: Line width UI regressions
// 📂 FILE: components/ShapeControls.tsx
// 🧾 HISTORY: This issue has now occurred 3 times in this project.
//   - #1 on 2025-11-11 [Line width control rejected values below 1px; lowered the minimum to 0.001]
//   - #2 on 2025-11-11 [Localized decimals were ignored; hinted decimal input so commas pass through]
//   - #3 on 2025-11-11 [Stepper jumped by integers; tightened step to 0.1 for reliable thin widths]
// 🚨 Next steps:
// Cover locale-specific inputs in component tests to prevent future regressions.
// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2 — Export Badge Copy]
// 🧠 ERROR TYPE: Cached export badge copy regressions
// 📂 FILE: components/ShapeControls.tsx
// 🧾 HISTORY: This issue has now occurred 2 times in this project.
//   - #1 on 2025-11-12 [Removed “Cached GIF ready” headline but badge copy remained elsewhere in the rail]
//   - #2 on 2025-11-12 [Replaced lingering “GIF READY” badge label with neutral “READY”]
// 🚨 Next steps:
// Add visual regression coverage to flag disallowed “GIF READY” copy in the export sidebar.

import type { ChangeEvent, RefObject } from 'react';
import { useMemo, useState, useRef, useEffect } from 'react';

import type { LineEndCap, LineShapeType } from '@/lib/canvas/types';

const MIN_LINE_WIDTH = 0.1;
const LINE_WIDTH_STEP = 0.1;

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
  onExportMp4: (loops?: number) => void;
  onExportGif: () => void;
  isExportingMp4: boolean;
  isExportingGif: boolean;
  exportFilename: string;
  onExportFilenameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadNotice: string | null;
  renderProgress: number;
  renderEtaSeconds: number | null;
  exportStatusLabel: string | null;
  isDotted: boolean;
  onToggleDotted: () => void;
  objectSize: string;
  onObjectSizeChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const shapeTypes: Array<LineShapeType> = ['circle', 'square'];
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
  onExportMp4,
  onExportGif,
  isExportingMp4,
  isExportingGif,
  exportFilename,
  onExportFilenameChange,
  uploadNotice,
  renderProgress,
  renderEtaSeconds,
  exportStatusLabel,
  isDotted,
  onToggleDotted,
  objectSize,
  onObjectSizeChange,
}: ShapeControlsProps) {
  const formattedObjectColor = useMemo(
    () => color.replace('#', '').toUpperCase(),
    [color],
  );
  const formattedShapeColor = useMemo(
    () => shapeColor.replace('#', '').toUpperCase(),
    [shapeColor],
  );

  const isAnyExporting = isExportingMp4 || isExportingGif;
  const progressPercentage = Math.max(0, Math.min(100, Math.round(renderProgress * 100)));
  const shouldShowProgress = isAnyExporting || (progressPercentage > 0 && progressPercentage < 100);
  const etaLabel = formatEtaLabel(renderEtaSeconds, progressPercentage);

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMp4Options, setShowMp4Options] = useState(false);
  const [mp4Loops, setMp4Loops] = useState(1);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Shape menu state
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const menuTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (menuTimerRef.current) {
        clearTimeout(menuTimerRef.current);
      }
    };
  }, []);

  const handleShapeMenuToggle = () => {
    setIsShapeMenuOpen((prev) => {
      const nextState = !prev;

      // Clear any existing timer
      if (menuTimerRef.current) {
        clearTimeout(menuTimerRef.current);
        menuTimerRef.current = null;
      }

      if (nextState) {
        // If opening, start 3s timer to auto-close
        menuTimerRef.current = setTimeout(() => {
          setIsShapeMenuOpen(false);
        }, 3000);
      }

      return nextState;
    });
  };

  const handleShapeSelect = (type: LineShapeType) => {
    onSelectShape(type);
    setIsShapeMenuOpen(false);

    if (menuTimerRef.current) {
      clearTimeout(menuTimerRef.current);
      menuTimerRef.current = null;
    }
  };

  // Default duration for calculating total video duration
  const DEFAULT_DURATION_SECONDS = 2.8;

  // Calculate total duration based on loops
  const totalDurationSeconds = useMemo(() => {
    return DEFAULT_DURATION_SECONDS * mp4Loops;
  }, [mp4Loops]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
        setShowMp4Options(false);
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showExportMenu]);

  // Close menu when export starts
  useEffect(() => {
    if (isAnyExporting) {
      setShowExportMenu(false);
      setShowMp4Options(false);
    }
  }, [isAnyExporting]);

  const handleGenerateClick = () => {
    if (isAnyExporting) return;
    setShowExportMenu(true);
  };

  const handleExportMp4Click = () => {
    if (showMp4Options) {
      // If options are already shown, proceed with export
      onExportMp4(mp4Loops);
      setShowExportMenu(false);
      setShowMp4Options(false);
    } else {
      // Show options first
      setShowMp4Options(true);
    }
  };

  const handleExportGifClick = () => {
    onExportGif();
    setShowExportMenu(false);
    setShowMp4Options(false);
  };

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
            className={`flex h-8 w-8 items-center justify-center rounded-2xl border border-white/20 bg-white/90 shadow-inner shadow-black/30 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isShapeColorDisabled
              ? 'cursor-not-allowed opacity-40 hover:scale-100'
              : ''
              }`}
            style={{ backgroundColor: shapeColor }}
          />
          <button
            type="button"
            onClick={onOpenShapeColorPicker}
            disabled={isShapeColorDisabled}
            className={`rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-medium tracking-[0.3em] text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isShapeColorDisabled ? 'cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-white/5' : ''
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
              inputMode="decimal"
              className="w-12 bg-transparent text-right text-sm font-semibold text-white outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onToggleDotted}
            aria-pressed={isDotted}
            disabled={isShapeControlsDisabled}
            className={`flex h-9 items-center justify-center rounded-2xl border px-3 text-[10px] font-semibold uppercase tracking-wider transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isDotted
              ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/40'
              : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
              } ${isShapeControlsDisabled ? 'cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-white/5 hover:text-white/60' : ''}`}
          >
            Dotted
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Shape</span>
        <div className="relative">
          {/* Main Active Shape Button */}
          <button
            type="button"
            onClick={handleShapeMenuToggle}
            aria-label="Toggle shape menu"
            aria-expanded={isShapeMenuOpen}
            className={`flex h-9 w-9 items-center justify-center rounded-2xl border bg-white/5 text-white shadow-lg transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isShapeControlsDisabled && !shape // If disabled AND no shape selected (wait, shape drives the icon. If no shape selected, what icon?)
              ? 'border-white/10 opacity-70' // Visual cue it's "inactive" but clickable
              : 'border-white/20 hover:border-white/40'
              }`}
          >
            {renderShapeIcon(shape || 'square')}
          </button>

          {/* Expanded Menu / Hover Effect */}
          {isShapeMenuOpen && (
            <div className="absolute left-0 bottom-full mb-2 flex flex-col gap-2 rounded-2xl border border-white/10 bg-stone-900/90 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 z-20">
              {shapeTypes
                .filter((type) => type !== shape)
                .map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleShapeSelect(type)}
                    aria-label={`Select ${type}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    {renderShapeIcon(type)}
                  </button>
                ))}
            </div>
          )}
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
          className={`w-full rounded-2xl border px-2.5 py-2 text-[11px] font-semibold tracking-[0.3em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isAnimationEnabled
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
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive
                    ? 'border-white bg-white text-stone-900 shadow-lg shadow-white/40'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
                    } ${isShapeControlsDisabled
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
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Object Size</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2">
            <input
              type="number"
              min={1}
              value={objectSize}
              onChange={onObjectSizeChange}
              disabled={isShapeControlsDisabled}
              className="w-12 bg-transparent text-center text-sm font-semibold text-white outline-none"
            />
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
            disabled={isAnyExporting}
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

          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={isAnyExporting}
              className={`rounded-2xl border border-white bg-white px-3 py-2 text-[11px] font-semibold text-stone-900 shadow-lg shadow-white/50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isAnyExporting
                ? 'cursor-wait opacity-70 hover:translate-y-0 hover:shadow-lg'
                : 'hover:translate-y-[-1px] hover:shadow-xl'
                }`}
            >
              Generate
            </button>

            {showExportMenu && !isAnyExporting && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-white/10 bg-stone-900/95 p-2 shadow-2xl backdrop-blur">
                {!showMp4Options ? (
                  <>
                    <button
                      type="button"
                      onClick={handleExportMp4Click}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-left text-[11px] font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      Export MP4
                    </button>
                    <button
                      type="button"
                      onClick={handleExportGifClick}
                      className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-left text-[11px] font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      Export GIF
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                        Loops
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={mp4Loops}
                            onChange={(e) => {
                              const value = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
                              setMp4Loops(value);
                            }}
                            className="w-12 bg-transparent text-center text-sm font-semibold text-white outline-none"
                          />
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setMp4Loops(Math.min(100, mp4Loops + 1))}
                              className="grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
                              aria-label="Increase loops"
                            >
                              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current">
                                <path d="M6 3 10 9H2z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMp4Loops(Math.max(1, mp4Loops - 1))}
                              className="grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
                              aria-label="Decrease loops"
                            >
                              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current">
                                <path d="M2 4h8L6 10z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[10px] text-white/60">
                        Duration: {totalDurationSeconds.toFixed(1)}s
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMp4Options(false);
                        }}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-white/10"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleExportMp4Click}
                        className="flex-1 rounded-xl border border-white bg-white px-3 py-2 text-[11px] font-semibold text-stone-900 shadow-lg shadow-white/50 transition hover:shadow-xl"
                      >
                        Export
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {shouldShowProgress ? (
          <div
            className="flex w-full flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>{exportStatusLabel ?? 'Processing...'}</span>
              <span className="text-white/80">{etaLabel}</span>
            </div>
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercentage}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white transition-[width] duration-200 ease-out"
                style={{ width: `${Math.max(4, Math.min(100, progressPercentage))}%` }}
              />
            </div>
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
          Supports PNG, JPG, or JPEG backgrounds. MP4 export is fast; GIF export uses high-quality conversion.
        </p>
      </section>
    </aside>
  );
}

function formatEtaLabel(etaSeconds: number | null, progressPercentage: number) {
  if (etaSeconds === null) {
    return progressPercentage >= 99 ? 'Wrapping up' : 'Calculating…';
  }

  if (etaSeconds <= 0.2 || progressPercentage >= 99) {
    return 'Wrapping up';
  }

  if (etaSeconds < 10) {
    return `~${etaSeconds.toFixed(1)}s remaining`;
  }

  return `~${Math.round(etaSeconds)}s remaining`;
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


