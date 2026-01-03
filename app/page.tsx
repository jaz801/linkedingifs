'use client';

// 🛠️ EDIT LOG [2025-12-XX-A]
// 🔍 WHAT WAS WRONG:
// GIF exports sometimes downloaded empty files, and MP4 exports didn't support loop count configuration.
// 🤔 WHY IT HAD TO BE CHANGED:
// Empty GIF downloads frustrated users, and they needed to control how many times the animation repeats in MP4 exports.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added blob validation before downloading to catch empty files early. Updated MP4 export handler to accept loop count parameter and adjust video duration accordingly. Added validation for both MP4 and GIF blobs to ensure files aren't empty before download.

// 🛠️ EDIT LOG [2025-11-24-A]
// 🔍 WHAT WAS WRONG:
// Exported GIFs stretched uploaded backgrounds to the requested canvas size, but the on-canvas preview uses `object-fit: cover`, so annotations drawn against cropped previews shifted when downloaded.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers expect exported frames to match what the stage shows; distorting the background breaks alignment and makes the download unreliable.
// ✅ WHY THIS SOLUTION WAS PICKED:
// When preparing the background PNG we now crop the source image using the same object-cover math as the preview before scaling it to the canvas dimensions, keeping exports and the live stage in sync.

// 🛠️ EDIT LOG [2025-11-12-F]
// 🔍 WHAT WAS WRONG:
// Auto-render snapshots kept piling up whenever lines changed quickly, so the backend re-encoded every intermediate revision and “GIF ready” lagged by several seconds.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers expect cached downloads to land almost immediately after drawing; wasting time on stale renders makes the cache feel slower than the direct export path.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Abort in-flight snapshot requests before scheduling new ones, shorten the debounce, and keep the UI pending until the freshest revision stores so caching keeps up with fast edits.

// 🛠️ EDIT LOG [2025-11-12-E]
// 🔍 WHAT WAS WRONG:
// Export timings only lived in ephemeral refs, so we had no telemetry proving whether cached downloads hit the 3-second goal or when we fell back to direct renders.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without persisted metrics we cannot benchmark snapshot readiness, transfer speed, or fallback frequency across sessions.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Record each download attempt with canvas context and strategy metadata via the shared render metrics helper so we can analyse performance trends over time.
// 🛠️ EDIT LOG [2025-11-12-D]
// 🔍 WHAT WAS WRONG:
// The UI gave no confirmation when cached GIF snapshots finished rendering, so "instant" downloads felt inconsistent.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without readiness feedback designers kept clicking too early and assumed the background encoder wasn't helping.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Track snapshot state on the client, surface a "GIF ready" indicator, and treat cached downloads as complete immediately.

// 🛠️ EDIT LOG [2025-11-12-C]
// 🔍 WHAT WAS WRONG:
// Hotjar's bootstrap script still ran on HTTP localhost, so the remote content bundle re-executed during Fast Refresh and tried to redefine its sealed tracking property.
// 🤔 WHY IT HAD TO BE CHANGED:
// The duplicate bootstrap threw "Cannot redefine property" in the console, hiding real issues and making dev debugging harder.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Skip Hotjar when the origin is not HTTPS and guard against re-initializing the snippet so the tracker never double-registers during live reloads.

// 🛠️ EDIT LOG [2025-11-12-B]
// 🔍 WHAT WAS WRONG:
// TypeScript failed the build because `parsedCanvasHeight` (and its width counterpart) appeared in a dependency array before either constant was declared.
// 🤔 WHY IT HAD TO BE CHANGED:
// The temporal dead zone crash blocked production builds and prevented the background prefetch effect from ever running.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Hoisted the parsed canvas dimension constants above their first usage so the effect and scheduler share the same values without TDZ issues.
// 🛠️ EDIT LOG [2025-11-12-A]
// 🔍 WHAT WAS WRONG:
// The download button still fired a fresh render and waited on the backend, so the new background encoder delivered no speed improvement.
// 🤔 WHY IT HAD TO BE CHANGED:
// To make downloads instant we need to pre-render after every canvas change, push snapshots to the backend, and fetch the cached GIF instead of re-encoding.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Introduced an auto-snapshot loop that debounces canvas edits into backend renders, updates duration estimates from snapshot metrics, and downloads the cached GIF by session ID.
// 🛠️ EDIT LOG [2025-11-11-K]
// 🔍 WHAT WAS WRONG:
// The line-width control reformatted inputs with commas, which broke the stepper arrows and kept values like “0,5” from sticking.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers need to nudge widths below 1 quickly; if the spinner can’t adjust by tenths and comma input fails, thin strokes stay stuck at 1px.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Keep the field in canonical dot notation so the stepper works, while still accepting commas by normalizing them before parsing and clamping to positive values.
// 🛠️ EDIT LOG [2025-11-11-J]
// 🔍 WHAT WAS WRONG:
// Localized browsers reported line widths like “0,5”, so our parser treated them as NaN, snapped the state back to 0.001, and the spinner stopped working.
// 🤔 WHY IT HAD TO BE CHANGED:
// Artists in comma locales couldn’t dial in hairline strokes; every attempt to drop below 1 reset the value and destabilized selected lines.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Normalize decimal separators before parsing, defer updates until the value is positive, and format the field with the user’s locale so any number above 0—except 0 itself—sticks.
// 🛠️ EDIT LOG [2025-11-11-I]
// 🔍 WHAT WAS WRONG:
// The progress bar hit 100% as soon as encoding finished, but the browser still needed a few seconds to download the GIF, leaving users staring at “Wrapping up…”.
// 🤔 WHY IT HAD TO BE CHANGED:
// If the bar completes before the file saves, designers can’t trust the ETA and may retry exports unnecessarily.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Stream download progress from the client, blend it with measured render timings, and map the loading bar to the entire request so it finishes exactly when the file is ready.
// 🛠️ EDIT LOG [2025-11-11-H]
// 🔍 WHAT WAS WRONG:
// The download button flipped to an indeterminate spinner during exports, so users had no clue if renders were still working or how long to wait.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a determinate progress bar and ETA the workflow felt unreliable, especially when heavy scenes took several seconds to encode.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Track recent render durations, start an animated progress timer when exports begin, and update it with server-reported timings so the UI can show a real loading bar and countdown.
// 🛠️ EDIT LOG [2025-11-11-G]
// 🔍 WHAT WAS WRONG:
// Export snapshots still shared references to line control points, so post-export edits bent both the saved payload and the live canvas.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers expect downloads to freeze the current geometry; leaking mutations into the snapshot reintroduced the shape drift we just addressed.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Deep-cloned optional control points alongside line endpoints so the export payload remains stable even if the canvas updates afterward.
// 🛠️ EDIT LOG [2025-11-11-F]
// 🔍 WHAT WAS WRONG:
// Product analytics never captured session heatmaps, so support tickets around mis-clicks and dead UI zones relied on guesswork.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without Hotjar injection, the team could not validate redesign decisions or monitor regression hotspots after feature launches.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added the official Hotjar tracker via `next/script` so the snippet loads after hydration without blocking rendering.
// 🛠️ EDIT LOG [2025-11-11-E]
// 🔍 WHAT WAS WRONG:
// Background uploads still rejected JPG/JPEG assets and helper copy implied GIF exports might resize, so teams kept round-tripping files to PNG and second-guessing deliverables.
// 🤔 WHY IT HAD TO BE CHANGED:
// Most stakeholder mockups ship as JPEGs, and product needs explicit confirmation that exports honor the canvas dimensions to prevent QA escalations.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Broadened the accepted MIME set and picker filters to cover common JPEG variants, retained PNG conversion during export, and updated notices so the UI matches the actual format support and size fidelity.
// 🛠️ EDIT LOG [2025-11-11-D]
// 🔍 WHAT WAS WRONG:
// Line widths were clamped to whole-pixel values of 1 or greater, so the UI snapped thin strokes back to 1px and exports ignored hairline guides.
// 🤔 WHY IT HAD TO BE CHANGED:
// Motion designers rely on sub-pixel strokes to match brand templates; losing those widths breaks parity between the canvas, exports, and competing tools.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Introduced a shared 0.001 minimum with three-decimal precision and propagated it through the controls, state normalizer, and render payload so fractional widths survive end to end.
// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// Arrow heads still looked detached because rounded caps extended the stroke past the tip, and the default “block” option added an extra shape instead of staying a plain line.
// 🤔 WHY IT HAD TO BE CHANGED:
// The canvas, exporter, and API must agree on when to add arrow geometry while keeping the baseline experience identical to today’s straight lines.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Normalize cap state to a true `line` default and only request arrow geometry when explicitly selected, letting renderers swap to square line caps when needed.
// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// The workflow introduced arrow/block line caps but the page never captured the selection, so previews and GIF exports always reverted to rounded tips.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without persisting the cap choice, designers lost their terminal markers and exported animations failed brand reviews.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added end-cap state with a default block setting, threaded it through the controls, renderer, and export payload so the chosen head survives every render target.
// 🛠️ EDIT LOG [Cursor Rule #1]
// 🔍 WHAT WAS WRONG:
// The workspace was capped at max-w-6xl and the side rails had generous fixed widths, so on desktop the canvas collapsed smaller than the menus surrounding it.
// 🤔 WHY IT HAD TO BE CHANGED:
// Artists lost focus on the drawing surface, limiting precision while the controls dominated the viewport, which is the opposite of the intended hierarchy.
// ✅ WHY THIS SOLUTION WAS PICKED:
// The layout now expands to max-w-screen-2xl, rebalances the grid fractions, and tightens the rail widths so the canvas column dominates the horizontal space without breaking responsiveness.
// 🔍 WHAT WAS WRONG (2025-11-08-B):
// The footer export banner duplicated the Upload/Download buttons and stole vertical space from the canvas on compact layouts.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-08-B):
// Consolidating export actions into the Shape Controls keeps related tools together and prevents the footer from covering content on small screens.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-08-B):
// The banner was removed and its buttons were nested into the Shape Controls "Export" section, reusing existing styling while preserving layout balance.
// 🔍 WHAT WAS WRONG (2025-11-08-C):
// Shape Controls typography and control sizes outgrew the canvas height, forcing vertical scroll and hiding actions on mid-sized screens.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-08-C):
// Designers need the full control panel visible alongside the canvas to quickly iterate without constantly scrolling the rail.
// 🔍 WHAT WAS WRONG (2025-11-08-D):
// The Upload button did not trigger any file selection, so there was no way to place custom artwork behind the canvas preview.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-08-D):
// Without a background import, designers had to rely on placeholder imagery and could not align drawings to client-provided assets.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-08-D):
// Added a sanitized file picker that accepts PNG, JPG, or JPEG files, stores them in memory, and passes the rendered source into the canvas so uploads instantly appear underneath drawn lines.
// 🔍 WHAT WAS WRONG (2025-11-08-E):
// PDF uploads embedded the entire viewer chrome, and the download button didn't export the actual canvas with animated helpers.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-08-E):
// Designers only need the artwork layer; the PDF controls blocked drawing, and there was no way to hand off an animated GIF that matched the stage.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-08-E):
// The PDF is rasterized into a flat image that slots under the canvas, and a reusable GIF exporter now renders the background plus animated overlays into a downloadable file.
// 🔍 WHAT WAS WRONG (2025-11-08-F):
// Critical canvas actions surfaced only console errors, making it impossible to trace failures or diagnose user issues in production.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-08-F):
// Without structured error reporting we had no signal when uploads, exports, or rendering failed, blocking backend triage.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-08-F):
// Added a client-side reporter with global listeners and server logging so we can capture actionable diagnostics with minimal performance overhead.
// 🔍 WHAT WAS WRONG (2025-11-09-A):
// Backend failures returned only “Unable to render GIF,” giving support no way to trace issues or tie them to server logs.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-09-A):
// Without a reference ID, neither QA nor developers could match user reports to server-side traces, dragging out triage.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-09-A):
// Expose the server-provided error ID in alerts and ship it alongside client telemetry so incidents can be correlated immediately.
// 🔍 WHAT WAS WRONG (2025-11-11-A):
// Arrow mode never exposed endpoint or midpoint handles, and curved lines collapsed back to straight segments during export.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-11-A):
// Designers need to stretch or bend existing strokes and see those adjustments preserved in rendered GIFs; losing curvature breaks the workflow.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-11-A):
// Threaded hover-aware handle state into the canvas stage and enriched the render payload with optional control points so curvature survives across the app.

// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Shape state drift across UI layers
// 📂 FILE: app/page.tsx
// 🧾 HISTORY: This issue has now occurred 3 times in this project.
//   - #1 on 2025-11-08 [Refactored into hooks/components in app/page.tsx]
//   - #2 on 2025-11-08 [Propagated stale shape UI state; fixed with line-owned metadata]
//   - #3 on 2025-11-11 [Export snapshots reused control-point references; fixed with deep clone]
// 🚨 Next steps:
// Add component-level tests to lock in the new boundaries and prevent future regressions.
// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2 — Line Width Controls]
// 🧠 ERROR TYPE: Line width UI regressions
// 📂 FILE: app/page.tsx
// 🧾 HISTORY: This issue has now occurred 3 times in this project.
//   - #1 on 2025-11-11 [Line widths were clamped to whole-pixel values of 1 or greater; enabled fractional support]
//   - #2 on 2025-11-11 [Locale decimal parsing reset fractional widths; normalized comma inputs]
//   - #3 on 2025-11-11 [Locale formatting broke steppers; reverted to dot syntax while still accepting commas]
// 🚨 Next steps:
// Add acceptance tests that cover both dot and comma decimal scenarios.

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';

import { CanvasStage } from '@/components/CanvasStage';
import { LayerList } from '@/components/LayerList';
import { ShapeControls } from '@/components/ShapeControls';
import { ToolSelector } from '@/components/ToolSelector';
import { useLinesManager } from '@/hooks/useLinesManager';
import { useRenderProgress } from '@/hooks/useRenderProgress';
import { useMp4Export } from '@/hooks/useMp4Export';
import type { LineEndCap, LineSegment, LineShapeType } from '@/lib/canvas/types';
import { bindGlobalErrorListeners, reportClientError } from '@/lib/monitoring/errorReporter';
import type { RenderGifPayload, RenderObjectInput } from '@/lib/render/schema';

type CanvasBackground = {
  kind: 'image';
  src: string;
};

const supportedImageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/pjpeg']);

const DEFAULT_EXPORT_DURATION_SECONDS = 2.8;
const DEFAULT_EXPORT_FPS = 24;
const FALLBACK_BACKGROUND_COLOR = '#0C0A09';
const MIN_LINE_WIDTH = 0.1;
const LINE_WIDTH_DECIMAL_PLACES = 1;

function clampLineWidth(rawValue: number): number {
  const baseValue = rawValue <= 0 ? MIN_LINE_WIDTH : rawValue;
  const precisionFactor = 10 ** LINE_WIDTH_DECIMAL_PLACES;
  return Math.round(baseValue * precisionFactor) / precisionFactor;
}

function formatLineWidthDisplay(value: number): string {
  const normalized = clampLineWidth(value);
  return normalized.toFixed(LINE_WIDTH_DECIMAL_PLACES).replace(/\.?0+$/, '');
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

type BuildRenderPayloadParams = {
  width: number;
  height: number;
  background: string;
  lines: LineSegment[];
};

async function ensureBackgroundForExport({
  source,
  width,
  height,
}: {
  source: string | null;
  width: number;
  height: number;
}): Promise<string> {


  if (typeof source === 'string' && source.startsWith('data:image/')) {
    try {
      return await convertDataUrlToPng(source, width, height);
    } catch (error) {
      console.warn('Unable to convert background to PNG, falling back to solid color.', error);
    }
  }

  return createSolidBackgroundPng(width, height, FALLBACK_BACKGROUND_COLOR);
}

// 🎨 CRITICAL DESIGN PRINCIPLE: Pixel-Perfect Coordinate Matching
// The interface stores coordinates as percentages (0-100) and displays them in SVG viewBox="0 0 100 100"
// The export MUST render at EXACTLY the same positions - no offsets, no rounding errors
// We convert percentage to pixels here for backend rendering, using exact floating-point math
// The backend draws directly in pixels, matching the scaled SVG coordinates exactly
function buildRenderPayload({ width, height, background, lines }: BuildRenderPayloadParams): RenderGifPayload {
  // Use exact same coordinate system as interface: percentage (0-100) scaled to pixels
  // The interface uses SVG viewBox="0 0 100 100" which scales percentage coordinates
  // We convert to pixels here for backend, but must ensure exact precision - no rounding
  const scaleX = width / 100;
  const scaleY = height / 100;
  const averageScale = (scaleX + scaleY) / 2;

  const renderLines = lines.map((line) => {
    // Convert percentage coordinates (0-100) to pixel coordinates with exact precision
    // No rounding - use exact floating point to match SVG rendering
    const x1 = line.start.x * scaleX;
    const y1 = line.start.y * scaleY;
    const x2 = line.end.x * scaleX;
    const y2 = line.end.y * scaleY;
    const controlX = line.controlPoint ? line.controlPoint.x * scaleX : null;
    const controlY = line.controlPoint ? line.controlPoint.y * scaleY : null;

    const normalizedStrokeWidth = Math.max(MIN_LINE_WIDTH, line.strokeWidth);
    const strokeWidthPx = normalizedStrokeWidth * averageScale;

    // Pen, Square, Circle tools: convert all points with exact precision
    const points = (line.tool === 'pen' || line.tool === 'square' || line.tool === 'circle') ? line.points.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
      controlX: p.controlPoint ? p.controlPoint.x * scaleX : undefined,
      controlY: p.controlPoint ? p.controlPoint.y * scaleY : undefined,
    })) : undefined;

    // Pass shape properties directly to the line payload
    // We handle object rendering intrinsically now to match UI perfectly
    const shapeType = line.shapeType;
    const shapeCount = line.shapeCount;
    const animateShapes = line.animateShapes;
    const shapeColor = line.shapeColor;

    // Scale object size just like stroke width
    const baseObjectSize = line.objectSize ? line.objectSize : Math.max(1.5, line.strokeWidth * 1.5);
    const objectSizePx = Math.max(1, baseObjectSize * averageScale);

    return {
      x1,
      y1,
      x2,
      y2,
      controlX,
      controlY,
      points,
      strokeColor: line.strokeColor,
      strokeWidth: strokeWidthPx,
      endCap: line.endCap ?? 'line',
      isDotted: line.isDotted,
      isClosed: line.isClosed,
      shapeType,
      shapeCount,
      animateShapes,
      objectSize: objectSizePx,
      shapeColor,
    };
  });

  const objects: RenderObjectInput[] = [];

  // LEGACY: We no longer populate 'objects' for intrinsic shape animation.
  // The rendering logic in useMp4Export (and backend) now handles this via line properties.
  // We keep the array empty or strictly for non-intrinsic objects if we add them later.

  return {
    width,
    height,
    background,
    duration: DEFAULT_EXPORT_DURATION_SECONDS,
    fps: DEFAULT_EXPORT_FPS,
    lines: renderLines,
    objects,
  };
}

function cloneLineSegments(lines: LineSegment[]) {
  return lines.map((line) => ({
    ...line,
    start: { ...line.start },
    end: { ...line.end },
    controlPoint: line.controlPoint ? { ...line.controlPoint } : null,
  }));
}



function buildExportFilename(input: string): string {
  const trimmed = input.trim();
  const withoutIllegalChars = trimmed.replace(/[\\/:*?"<>|]/g, '');
  const collapsedWhitespace = withoutIllegalChars.replace(/\s+/g, '-');
  const withoutTrailingDots = collapsedWhitespace.replace(/\.+$/, '');
  const base = withoutTrailingDots.length > 0 ? withoutTrailingDots : 'animation';
  return base.toLowerCase().endsWith('.gif') ? base : `${base}.gif`;
}

async function convertDataUrlToPng(dataUrl: string, width: number, height: number) {
  const image = await loadImageElement(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to prepare background conversion canvas.');
  }

  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 0);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 0);
  const targetWidth = Math.max(1, width);
  const targetHeight = Math.max(1, height);

  const imageAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (Number.isFinite(imageAspect) && Number.isFinite(targetAspect) && sourceWidth > 0 && sourceHeight > 0) {
    if (imageAspect > targetAspect) {
      sw = sourceHeight * targetAspect;
      sx = (sourceWidth - sw) / 2;
    } else if (imageAspect < targetAspect) {
      sh = sourceWidth / targetAspect;
      sy = (sourceHeight - sh) / 2;
    }
  }

  context.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/png');
}

function createSolidBackgroundPng(width: number, height: number, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create fallback background canvas.');
  }

  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return canvas.toDataURL('image/png');
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load background image'));
    image.src = src;
  });
}

function mapShapeTypeToObjectType(shape: LineShapeType | null): RenderObjectInput['type'] | null {
  switch (shape) {
    case 'circle':
      return 'dot';
    case 'square':
      return 'cube';
    case 'triangle':
      return 'arrow';
    default:
      return null;
  }
}





export default function Home() {
  const [color, setColor] = useState('#ffffff');
  const [shapeColor, setShapeColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(() => clampLineWidth(1));
  const [lineWidthInputValue, setLineWidthInputValue] = useState(() =>
    formatLineWidthDisplay(1),
  );
  const [shape, setShape] = useState<LineShapeType | null>(null);
  const [shapeCount, setShapeCount] = useState('1');
  const [objectSize, setObjectSize] = useState('2.5'); // Default size 2.5
  const [isShapeAnimationEnabled, setIsShapeAnimationEnabled] = useState(true);
  const [lineEndCap, setLineEndCap] = useState<LineEndCap>('line');
  const [isDotted, setIsDotted] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState('1080');
  const [canvasHeight, setCanvasHeight] = useState('1080');
  const colorInputRef = useRef<HTMLInputElement>(null);
  const shapeColorInputRef = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<'arrow' | 'line' | 'pen' | 'square' | 'circle'>('arrow');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground | null>(null);
  const [exportFilename, setExportFilename] = useState('animation');
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const uploadNoticeTimeoutRef = useRef<number | null>(null);
  const [preparedBackground, setPreparedBackground] = useState<string | null>(null);
  const [isObjectSizeManuallySet, setIsObjectSizeManuallySet] = useState(false);

  const handleToolSelect = (nextTool: 'arrow' | 'line' | 'pen' | 'square' | 'circle') => {
    setTool(nextTool);
    if (nextTool === 'arrow') {
      updateDraftLine(null);
    }
  };

  const {
    renderProgress,
    setRenderProgress,
    renderEtaSeconds,
  } = useRenderProgress();



  const parseLineWidthInput = useCallback((rawValue: string): number | null => {
    if (rawValue.trim() === '') {
      return null;
    }

    const sanitized = rawValue.replace(/\s+/g, '').replace(/,/g, '.');
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const {
    drawingSurfaceRef,
    lines,
    orderedLines,
    draftLine,
    selectedLine,
    selectedLineId,
    hoveredLineId,
    setSelectedLineId,
    handleSurfacePointerDown,
    handleSurfacePointerMove,
    handleSurfacePointerUp,
    handleSurfacePointerLeave,
    handleLinePointerDown,
    handleLinePointerMove,
    handleLinePointerUp,
    handleLinePointerCancel,
    handleLinePointerEnter,
    handleLinePointerLeave,
    undoLastLine,
    updateSelectedLineProperties,
    updateDraftLine,
  } = useLinesManager({
    color,
    lineWidth,
    shapeColor,
    tool,
    objectSize: parseFloat(objectSize) || 2.5,
  });

  useEffect(() => {
    if (!selectedLine) {
      return;
    }

    setColor(selectedLine.strokeColor.toUpperCase());
    setShapeColor(selectedLine.shapeColor.toUpperCase());
    const normalizedWidth = clampLineWidth(selectedLine.strokeWidth);
    setLineWidth(normalizedWidth);
    setLineWidthInputValue(formatLineWidthDisplay(normalizedWidth));
    setLineEndCap(selectedLine.endCap ?? 'line');
    setIsDotted(selectedLine.isDotted ?? false);
  }, [selectedLine]);

  useEffect(() => {
    const removeListeners = bindGlobalErrorListeners();
    return () => removeListeners?.();
  }, []);

  useEffect(() => {
    return () => {
      if (uploadNoticeTimeoutRef.current !== null) {
        window.clearTimeout(uploadNoticeTimeoutRef.current);
        uploadNoticeTimeoutRef.current = null;
      }
    };
  }, []);











  const parsedCanvasWidth = (() => {
    const parsed = Number(canvasWidth);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1080;
  })();

  const parsedCanvasHeight = (() => {
    const parsed = Number(canvasHeight);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1080;
  })();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextBackground = await ensureBackgroundForExport({
          source: canvasBackground?.src ?? null,
          width: parsedCanvasWidth,
          height: parsedCanvasHeight,
        });
        if (!cancelled) {
          setPreparedBackground(nextBackground);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to prepare background for snapshot', error);
          setPreparedBackground(null);
        }
        reportClientError(error, {
          hint: 'prepareBackgroundForSnapshot',
          context: {
            canvasWidth: parsedCanvasWidth,
            canvasHeight: parsedCanvasHeight,
          },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canvasBackground, parsedCanvasHeight, parsedCanvasWidth]);



  useEffect(() => {
    if (!selectedLine) {
      setShape(null);
      setShapeCount('1');
      setObjectSize('2.5');
      setIsObjectSizeManuallySet(false);
      setIsShapeAnimationEnabled(true);
      setLineEndCap('line');
      setIsDotted(false);
      return;
    }

    setShape(selectedLine.shapeType);
    setShapeCount(String(selectedLine.shapeCount));
    setObjectSize(String(selectedLine.objectSize ?? 2.5));
    // If we're loading a selected line, we assume the size matters as is, so we treat it as "set"
    // to prevent accidental overwrite by changing line width immediately? 
    // Or should reset manual flag? If it's a new selection, we should probably set manual to true 
    // to preserve its specific size against line width changes.
    setIsObjectSizeManuallySet(true);
    setIsShapeAnimationEnabled(selectedLine.animateShapes);
    setShapeColor(selectedLine.shapeColor.toUpperCase());
    setLineEndCap(selectedLine.endCap ?? 'line');
    setIsDotted(selectedLine.isDotted ?? false);
  }, [selectedLine]);

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
    const nextColor = event.target.value.toUpperCase();
    setColor(nextColor);
    updateSelectedLineProperties({ strokeColor: nextColor });
  };

  const openShapeColorPicker = () => {
    const input = shapeColorInputRef.current;
    if (!input) return;

    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }

    input.click();
  };

  const handleShapeColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextColor = event.target.value.toUpperCase();
    setShapeColor(nextColor);
    updateSelectedLineProperties({ shapeColor: nextColor });
  };

  const syncLineWidthState = useCallback((value: number) => {
    const normalized = clampLineWidth(value);
    setLineWidth(normalized);
    setLineWidthInputValue(formatLineWidthDisplay(normalized));
    return normalized;
  }, []);

  const commitLineWidth = useCallback(
    (value: number) => {
      const normalized = syncLineWidthState(value);
      updateSelectedLineProperties({ strokeWidth: normalized });
    },
    [syncLineWidthState, updateSelectedLineProperties],
  );

  const handleLineWidthChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      const sanitizedForDisplay = nextValue.replace(/,/g, '.');
      setLineWidthInputValue(sanitizedForDisplay);

      const parsed = parseLineWidthInput(nextValue);
      if (parsed === null) {
        return;
      }

      const candidate = parsed <= 0 ? MIN_LINE_WIDTH : parsed;
      const normalized = clampLineWidth(candidate);
      setLineWidth(normalized);

      if (!isObjectSizeManuallySet) {
        const proportionalSize = Math.max(0.1, normalized * 2.5);
        setObjectSize(String(proportionalSize));
        updateSelectedLineProperties({ strokeWidth: normalized, objectSize: proportionalSize });
      } else {
        updateSelectedLineProperties({ strokeWidth: normalized });
      }
    },
    [parseLineWidthInput, updateSelectedLineProperties, isObjectSizeManuallySet],
  );

  const normalizeLineWidth = () => {
    const parsed = parseLineWidthInput(lineWidthInputValue);
    if (parsed === null || parsed <= 0) {
      commitLineWidth(MIN_LINE_WIDTH);
      return;
    }

    commitLineWidth(parsed);
  };

  const handleShapeCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setShapeCount(nextValue);

    const parsed = Number(nextValue);
    if (!selectedLine || !Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    updateSelectedLineProperties({ shapeCount: Math.floor(parsed) });
  };

  const handleObjectSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setObjectSize(value); // Allow typing freely
    setIsObjectSizeManuallySet(true);

    const size = parseFloat(value);
    if (!selectedLine || isNaN(size) || size <= 0) {
      return;
    }

    updateSelectedLineProperties({ objectSize: size });
  };

  const clampShapeCount = () => {
    const nextValue = Number(shapeCount);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setShapeCount('1');
      if (selectedLine) {
        updateSelectedLineProperties({ shapeCount: 1 });
      }
      return;
    }

    const normalized = Math.floor(nextValue);
    setShapeCount(String(normalized));
    if (selectedLine) {
      updateSelectedLineProperties({ shapeCount: normalized });
    }
  };

  const adjustShapeCount = (delta: number) => {
    const current = Number(shapeCount);
    const base = Number.isFinite(current) && current > 0 ? current : 1;
    const next = Math.max(1, base + delta);
    setShapeCount(String(next));
    if (selectedLine) {
      updateSelectedLineProperties({ shapeCount: next });
    }
  };

  const handleCanvasDimensionChange =
    (dimension: 'width' | 'height') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      if (dimension === 'width') {
        setCanvasWidth(nextValue);
        return;
      }
      setCanvasHeight(nextValue);
    };

  const clampCanvasDimension = (dimension: 'width' | 'height') => () => {
    const rawValue = dimension === 'width' ? canvasWidth : canvasHeight;
    const parsed = Number(rawValue);
    const next = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1080;
    if (dimension === 'width') {
      setCanvasWidth(String(next));
      return;
    }
    setCanvasHeight(String(next));
  };

  useEffect(() => {
    const handleUndoKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key.toLowerCase() !== 'z' || event.shiftKey || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      const didUndo = undoLastLine();
      if (didUndo) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleUndoKey);
    return () => window.removeEventListener('keydown', handleUndoKey);
  }, [undoLastLine]);



  const handleSelectShape = (nextShape: LineShapeType) => {
    // If no line is selected, or we want to switch drawing modes:
    // Set the global tool state to the shape name
    if (nextShape === 'square' || nextShape === 'circle') {
      setTool(nextShape);
      setShape(nextShape); // Update UI icon
      updateDraftLine(null);
    }

    // If a line is selected, ALSO update its property
    if (selectedLine) {
      const resolvedShape = shape === nextShape ? null : nextShape;
      setShape(resolvedShape);
      updateSelectedLineProperties({ shapeType: resolvedShape });
    }
  };

  const handleSelectLineEndCap = (nextEndCap: LineEndCap) => {
    if (!selectedLine) {
      return;
    }

    setLineEndCap(nextEndCap);
    updateSelectedLineProperties({ endCap: nextEndCap });
  };

  const handleToggleShapeAnimation = () => {
    if (!selectedLine) {
      return;
    }

    const nextValue = !isShapeAnimationEnabled;
    setIsShapeAnimationEnabled(nextValue);
    updateSelectedLineProperties({ animateShapes: nextValue });
  };

  const handleToggleDotted = () => {
    if (!selectedLine) {
      return;
    }

    const nextValue = !isDotted;
    setIsDotted(nextValue);
    updateSelectedLineProperties({ isDotted: nextValue });
  };

  const showUploadNotice = useCallback((message: string) => {
    if (uploadNoticeTimeoutRef.current !== null) {
      window.clearTimeout(uploadNoticeTimeoutRef.current);
    }

    setUploadNotice(message);
    uploadNoticeTimeoutRef.current = window.setTimeout(() => {
      setUploadNotice(null);
      uploadNoticeTimeoutRef.current = null;
    }, 3200);
  }, []);

  const handleRequestUpload = () => {
    showUploadNotice('Background uploads accept PNG, JPG, or JPEG images.');
    uploadInputRef.current?.click();
  };

  const handleBackgroundUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      input.value = '';
      return;
    }

    try {
      if (supportedImageMimeTypes.has(file.type.toLowerCase())) {
        const dataUrl = await readFileAsDataUrl(file);

        // 🛠️ EDIT LOG [2025-11-27-A]
        // 🔍 WHAT WAS WRONG:
        // The canvas dimensions remained static when uploading a new background, so users had to manually resize the stage to fit their image.
        // 🤔 WHY IT HAD TO BE CHANGED:
        // Users expect the workspace to adapt to their content immediately; manual resizing is tedious and prone to aspect ratio errors.
        // ✅ WHY THIS SOLUTION WAS PICKED:
        // Load the image to extract its natural dimensions and update the canvas state to match, ensuring a perfect fit automatically.
        const image = await loadImageElement(dataUrl);
        setCanvasWidth(String(image.naturalWidth));
        setCanvasHeight(String(image.naturalHeight));

        setCanvasBackground({ kind: 'image', src: dataUrl });
      } else {
        showUploadNotice('Only PNG, JPG, or JPEG backgrounds are supported right now.');
        setCanvasBackground(null);
      }
    } catch (error) {
      console.error('Failed to process background upload', error);
      reportClientError(error, {
        hint: 'handleBackgroundUpload',
        context: {
          fileType: file.type,
          canvasWidth: parsedCanvasWidth,
          canvasHeight: parsedCanvasHeight,
        },
      });
      setCanvasBackground(null);
    } finally {
      input.value = '';
    }
  };

  const handleExportFilenameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setExportFilename(event.target.value);
  };

  const { exportMp4, isExporting: isExportingMp4 } = useMp4Export();
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [exportStatusLabel, setExportStatusLabel] = useState<string | null>(null);

  const handleExportMp4 = useCallback(async (loops: number = 1) => {
    if (isExportingMp4 || isExportingGif) return;

    const resolvedFilename = buildExportFilename(exportFilename);
    setExportStatusLabel('Generating MP4...');

    try {
      const payload = buildRenderPayload({
        width: parsedCanvasWidth,
        height: parsedCanvasHeight,
        background: preparedBackground || '#000000', // Fallback
        lines: cloneLineSegments(lines),
      });

      // Adjust duration based on loops
      const adjustedPayload = {
        ...payload,
        duration: payload.duration * loops,
      };

      const blob = await exportMp4(adjustedPayload, {
        onProgress: (p) => setRenderProgress(p),
      });

      if (!blob || blob.size === 0) {
        throw new Error('Generated MP4 blob is empty');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resolvedFilename.replace(/\.(gif|mp4)$/i, '')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('MP4 Export failed', error);
      alert('Failed to export MP4. See console for details.');
    } finally {
      setExportStatusLabel(null);
      setRenderProgress(0);
    }
  }, [isExportingMp4, isExportingGif, exportFilename, preparedBackground, parsedCanvasWidth, parsedCanvasHeight, lines, exportMp4, setRenderProgress]);

  const handleExportGif = useCallback(async () => {
    if (isExportingMp4 || isExportingGif) return;

    const resolvedFilename = buildExportFilename(exportFilename);
    setIsExportingGif(true);

    try {
      // Step 1: Generate MP4 (fast, hardware-accelerated)
      setExportStatusLabel('Generating MP4...');
      setRenderProgress(0);

      const payload = buildRenderPayload({
        width: parsedCanvasWidth,
        height: parsedCanvasHeight,
        background: preparedBackground || '#000000',
        lines: cloneLineSegments(lines),
      });

      const mp4Blob = await exportMp4(payload, {
        onProgress: (p) => setRenderProgress(p * 0.6), // MP4 generation is 60% of total
      });

      // Step 2: Convert MP4 to GIF using ffmpeg.wasm
      setExportStatusLabel('Converting to GIF...');
      setRenderProgress(0.6);

      // Dynamically import the conversion utility to avoid loading ffmpeg.wasm until needed
      const { convertMp4ToGif } = await import('@/lib/export/mp4ToGif');

      if (!mp4Blob || mp4Blob.size === 0) {
        throw new Error('Generated MP4 blob is empty, cannot convert to GIF');
      }

      const gifBlob = await convertMp4ToGif(mp4Blob, {
        fps: payload.fps,
        onProgress: (p) => setRenderProgress(0.6 + (p * 0.4)), // Conversion is 40% of total
      });

      if (!gifBlob || gifBlob.size === 0) {
        throw new Error('Generated GIF blob is empty');
      }

      setRenderProgress(1);

      // Download the GIF
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resolvedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);

    } catch (error) {
      console.error('GIF Export failed', error);
      alert('Failed to export GIF. See console for details.');
    } finally {
      setIsExportingGif(false);
      setExportStatusLabel(null);
      setRenderProgress(0);
    }
  }, [isExportingMp4, isExportingGif, exportFilename, preparedBackground, parsedCanvasWidth, parsedCanvasHeight, lines, exportMp4, setRenderProgress]);
  return (
    <div className="flex min-h-screen flex-col bg-stone-950 font-sans text-white">
      {/* Hotjar Tracking Code for https://peaceful-spence-5e8b7b.netlify.app/ */}
      <Script id="hotjar-tracking" strategy="afterInteractive">
        {`(function(h,o,t,j,a,r){
          if(!h||h.location&&h.location.protocol!=='https:'){
            if(h&&!h.__hjSkippedLog){
              h.__hjSkippedLog=true;
              console.info('[Hotjar] Skipped initialization on non-HTTPS origin.',h.location&&h.location.origin);
            }
            return;
          }
          if(h.hj||h._hjSettings){
            return;
          }
          h.hj=function(){(h.hj.q=h.hj.q||[]).push(arguments)};
          h._hjSettings={hjid:1831859,hjsv:6};
          a=o.getElementsByTagName('head')[0];
          r=o.createElement('script');r.async=1;
          r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
          a.appendChild(r);
        })(typeof window!=='undefined'?window:null,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`}
      </Script>
      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,3.2fr)_minmax(280px,0.95fr)] lg:items-stretch lg:gap-10 lg:px-8 xl:gap-12">
        <LayerList
          orderedLines={orderedLines}
          selectedLineId={selectedLineId}
          onSelectLine={setSelectedLineId}
        />

        <CanvasStage
          tool={tool}
          canvasWidth={parsedCanvasWidth}
          canvasHeight={parsedCanvasHeight}
          color={color}
          lineWidth={lineWidth}
          lines={lines}
          draftLine={draftLine}
          selectedLineId={selectedLineId}
          hoveredLineId={hoveredLineId}
          drawingSurfaceRef={drawingSurfaceRef}
          onSurfacePointerDown={handleSurfacePointerDown}
          onSurfacePointerMove={handleSurfacePointerMove}
          onSurfacePointerUp={handleSurfacePointerUp}
          onSurfacePointerLeave={handleSurfacePointerLeave}
          onLinePointerDown={handleLinePointerDown}
          onLinePointerMove={handleLinePointerMove}
          onLinePointerUp={handleLinePointerUp}
          onLinePointerCancel={handleLinePointerCancel}
          onLinePointerEnter={handleLinePointerEnter}
          onLinePointerLeave={handleLinePointerLeave}
          background={canvasBackground}
        >
          <ToolSelector activeTool={tool} onSelect={handleToolSelect} />
        </CanvasStage>

        <ShapeControls
          color={color}
          shapeColor={shapeColor}
          lineWidthValue={lineWidthInputValue}
          shape={shape}
          shapeCount={shapeCount}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          lineEndCap={lineEndCap}
          colorInputRef={colorInputRef}
          shapeColorInputRef={shapeColorInputRef}
          onOpenColorPicker={openColorPicker}
          onOpenShapeColorPicker={openShapeColorPicker}
          onColorChange={handleColorChange}
          onShapeColorChange={handleShapeColorChange}
          onLineWidthChange={handleLineWidthChange}
          onLineWidthBlur={normalizeLineWidth}
          onSelectShape={handleSelectShape}
          onShapeCountChange={handleShapeCountChange}
          onClampShapeCount={clampShapeCount}
          onAdjustShapeCount={adjustShapeCount}
          onCanvasDimensionChange={handleCanvasDimensionChange}
          onClampCanvasDimension={clampCanvasDimension}
          isShapeControlsDisabled={!selectedLine}
          isShapeColorDisabled={!selectedLine || !shape}
          isAnimationEnabled={isShapeAnimationEnabled}
          onToggleAnimation={handleToggleShapeAnimation}
          onSelectLineEndCap={handleSelectLineEndCap}
          objectSize={objectSize}
          onObjectSizeChange={handleObjectSizeChange}
          onRequestUpload={handleRequestUpload}
          onExportMp4={handleExportMp4}
          onExportGif={handleExportGif}
          isExportingMp4={isExportingMp4}
          isExportingGif={isExportingGif}
          exportFilename={exportFilename}
          onExportFilenameChange={handleExportFilenameChange}
          uploadNotice={uploadNotice}
          renderProgress={renderProgress}
          renderEtaSeconds={renderEtaSeconds}
          exportStatusLabel={exportStatusLabel}
          isDotted={isDotted}
          onToggleDotted={handleToggleDotted}
        />
      </main>
      <input
        ref={uploadInputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        className="sr-only"
        onChange={handleBackgroundUpload}
      />
    </div>
  );
}
