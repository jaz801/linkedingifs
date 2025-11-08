'use client';

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
// Added a sanitized file picker that accepts JPG, PNG, or PDF files, stores them in memory, and passes the rendered source into the canvas so uploads instantly appear underneath drawn lines.
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

// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Shape state drift across UI layers
// 📂 FILE: app/page.tsx
// 🧾 HISTORY: This issue has now occurred 2 times in this project.
//   - #1 on 2025-11-08 [Refactored into hooks/components in app/page.tsx]
//   - #2 on 2025-11-08 [Propagated stale shape UI state; fixed with line-owned metadata]
// 🚨 Next steps:
// Add component-level tests to lock in the new boundaries and prevent future regressions.

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CanvasStage } from '@/components/CanvasStage';
import { LayerList } from '@/components/LayerList';
import { ShapeControls } from '@/components/ShapeControls';
import { ToolSelector } from '@/components/ToolSelector';
import { useLinesManager } from '@/hooks/useLinesManager';
import type { LineSegment, LineShapeType } from '@/lib/canvas/types';
import { renderPdfPageToDataUrl } from '@/lib/pdf/renderPdfPageToDataUrl';
import { downloadGIF } from '@/lib/export/downloadGif';
import { bindGlobalErrorListeners, reportClientError } from '@/lib/monitoring/errorReporter';
import type { RenderGifPayload, RenderObjectInput } from '@/lib/render/schema';

type CanvasBackground =
  | {
      kind: 'image';
      src: string;
    }
  | {
      kind: 'pdf-image';
      src: string;
    };

const supportedImageMimeTypes = new Set(['image/jpeg', 'image/png']);

const DEFAULT_EXPORT_DURATION_SECONDS = 2.8;
const DEFAULT_EXPORT_FPS = 30;
const FALLBACK_BACKGROUND_COLOR = '#0C0A09';

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
  if (typeof source === 'string' && source.startsWith('data:image/png')) {
    return source;
  }

  if (typeof source === 'string' && source.startsWith('data:image/')) {
    try {
      return await convertDataUrlToPng(source, width, height);
    } catch (error) {
      console.warn('Unable to convert background to PNG, falling back to solid color.', error);
    }
  }

  return createSolidBackgroundPng(width, height, FALLBACK_BACKGROUND_COLOR);
}

function buildRenderPayload({ width, height, background, lines }: BuildRenderPayloadParams): RenderGifPayload {
  const scaleX = width / 100;
  const scaleY = height / 100;
  const averageScale = (scaleX + scaleY) / 2;

  const renderLines = lines.map((line) => {
    const x1 = (line.start.x / 100) * width;
    const y1 = (line.start.y / 100) * height;
    const x2 = (line.end.x / 100) * width;
    const y2 = (line.end.y / 100) * height;

    const strokeWidthPx = Math.max(1, line.strokeWidth * averageScale);

    return {
      x1,
      y1,
      x2,
      y2,
      strokeColor: line.strokeColor,
      strokeWidth: strokeWidthPx,
    };
  });

  const objects: RenderObjectInput[] = [];

  renderLines.forEach((_, index) => {
    const source = lines[index];
    if (!source) return;

    const objectType = mapShapeTypeToObjectType(source.shapeType);
    if (!objectType || !source.animateShapes || source.shapeCount <= 0) {
      return;
    }

    const count = Math.max(1, source.shapeCount);
    const baseSizeUnits = Math.max(1.5, source.strokeWidth * 1.5);
    const sizePx = Math.max(1, baseSizeUnits * averageScale);

    for (let offsetIndex = 0; offsetIndex < count; offsetIndex += 1) {
      objects.push({
        lineIndex: index,
        type: objectType,
        color: source.shapeColor,
        size: sizePx,
        speed: 1,
        direction: 'forward',
        offset: (offsetIndex / count) % 1,
      });
    }
  });

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

async function convertDataUrlToPng(dataUrl: string, width: number, height: number) {
  const image = await loadImageElement(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to prepare background conversion canvas.');
  }

  context.drawImage(image, 0, 0, width, height);
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
  const [lineWidth, setLineWidth] = useState(1);
  const [shape, setShape] = useState<LineShapeType | null>(null);
  const [shapeCount, setShapeCount] = useState('1');
  const [isShapeAnimationEnabled, setIsShapeAnimationEnabled] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState('1080');
  const [canvasHeight, setCanvasHeight] = useState('1080');
  const colorInputRef = useRef<HTMLInputElement>(null);
  const shapeColorInputRef = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<'arrow' | 'line'>('arrow');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const {
    drawingSurfaceRef,
    lines,
    orderedLines,
    draftLine,
    selectedLine,
    selectedLineId,
    setSelectedLineId,
    handleSurfacePointerDown,
    handleSurfacePointerMove,
    handleSurfacePointerUp,
    handleSurfacePointerLeave,
    handleLinePointerDown,
    handleLinePointerMove,
    handleLinePointerUp,
    handleLinePointerCancel,
    undoLastLine,
    updateSelectedLineProperties,
    updateDraftLine,
  } = useLinesManager({ color, lineWidth, shapeColor });

  useEffect(() => {
    if (!selectedLine) {
      return;
    }

    setColor(selectedLine.strokeColor.toUpperCase());
    setShapeColor(selectedLine.shapeColor.toUpperCase());
    setLineWidth(selectedLine.strokeWidth);
  }, [selectedLine]);

  useEffect(() => {
    const removeListeners = bindGlobalErrorListeners();
    return () => removeListeners?.();
  }, []);

  useEffect(() => {
    if (!selectedLine) {
      setShape(null);
      setShapeCount('1');
      setIsShapeAnimationEnabled(true);
      return;
    }

    setShape(selectedLine.shapeType);
    setShapeCount(String(selectedLine.shapeCount));
    setIsShapeAnimationEnabled(selectedLine.animateShapes);
    setShapeColor(selectedLine.shapeColor.toUpperCase());
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

  const applyLineWidth = useCallback(
    (rawValue: number) => {
      if (!Number.isFinite(rawValue)) return;
      const normalized = rawValue <= 0 ? 1 : Math.floor(rawValue);
      setLineWidth(normalized);
      updateSelectedLineProperties({ strokeWidth: normalized });
    },
    [updateSelectedLineProperties],
  );

  const handleLineWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyLineWidth(Number(event.target.value));
  };

  const normalizeLineWidth = () => {
    applyLineWidth(lineWidth);
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

  const parsedCanvasWidth = (() => {
    const parsed = Number(canvasWidth);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1080;
  })();

  const parsedCanvasHeight = (() => {
    const parsed = Number(canvasHeight);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1080;
  })();

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

  const handleToolSelect = (nextTool: 'arrow' | 'line') => {
    setTool(nextTool);
    if (nextTool === 'arrow') {
      updateDraftLine(null);
    }
  };

  const handleSelectShape = (nextShape: LineShapeType) => {
    if (!selectedLine) {
      return;
    }

    const resolvedShape = shape === nextShape ? null : nextShape;
    setShape(resolvedShape);
    updateSelectedLineProperties({ shapeType: resolvedShape });
  };

  const handleToggleShapeAnimation = () => {
    if (!selectedLine) {
      return;
    }

    const nextValue = !isShapeAnimationEnabled;
    setIsShapeAnimationEnabled(nextValue);
    updateSelectedLineProperties({ animateShapes: nextValue });
  };

  const handleRequestUpload = () => {
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
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const rasterized = await renderPdfPageToDataUrl({
          data: arrayBuffer,
          targetWidth: parsedCanvasWidth,
          targetHeight: parsedCanvasHeight,
        });
        setCanvasBackground({ kind: 'pdf-image', src: rasterized });
      } else if (supportedImageMimeTypes.has(file.type)) {
        const dataUrl = await readFileAsDataUrl(file);
        setCanvasBackground({ kind: 'image', src: dataUrl });
      } else {
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

  const handleRequestDownload = useCallback(async () => {
    if (isExporting) {
      return;
    }

    const lineSnapshot: LineSegment[] = lines.map((line) => ({
      ...line,
      start: { ...line.start },
      end: { ...line.end },
    }));

    setIsExporting(true);
    try {
      const background = await ensureBackgroundForExport({
        source: canvasBackground?.src ?? null,
        width: parsedCanvasWidth,
        height: parsedCanvasHeight,
      });

      const payload = buildRenderPayload({
        width: parsedCanvasWidth,
        height: parsedCanvasHeight,
        background,
        lines: lineSnapshot,
      });

      await downloadGIF(payload);
    } catch (error) {
      console.error('Failed to export GIF', error);
      reportClientError(error, {
        hint: 'handleRequestDownload',
        context: {
          lineCount: lineSnapshot.length,
          canvasWidth: parsedCanvasWidth,
          canvasHeight: parsedCanvasHeight,
        },
      });
      window.alert('Unable to export the GIF right now. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [canvasBackground, isExporting, lines, parsedCanvasHeight, parsedCanvasWidth]);

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 font-sans text-white">
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
          drawingSurfaceRef={drawingSurfaceRef}
          onSurfacePointerDown={handleSurfacePointerDown}
          onSurfacePointerMove={handleSurfacePointerMove}
          onSurfacePointerUp={handleSurfacePointerUp}
          onSurfacePointerLeave={handleSurfacePointerLeave}
          onLinePointerDown={handleLinePointerDown}
          onLinePointerMove={handleLinePointerMove}
          onLinePointerUp={handleLinePointerUp}
          onLinePointerCancel={handleLinePointerCancel}
          background={canvasBackground}
        >
          <ToolSelector activeTool={tool} onSelect={handleToolSelect} />
        </CanvasStage>

        <ShapeControls
          color={color}
          shapeColor={shapeColor}
          lineWidth={lineWidth}
          shape={shape}
          shapeCount={shapeCount}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
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
          onRequestUpload={handleRequestUpload}
          onRequestDownload={handleRequestDownload}
          isDownloadInProgress={isExporting}
        />
      </main>
      <input
        ref={uploadInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="sr-only"
        onChange={handleBackgroundUpload}
      />
    </div>
  );
}
