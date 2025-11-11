// 🛠️ EDIT LOG [2025-11-11-E]
// 🔍 WHAT WAS WRONG:
// Static exports kept encoding 80+ duplicate frames even when no helper shapes animated, so users waited seconds for GIFs that never changed after the first frame.
// 🤔 WHY IT HAD TO BE CHANGED:
// Exporting still scenes should feel instant; redundant quantization work slowed handoffs and made the UI feel sluggish.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Detect when no shapes animate and collapse the render to a single frame while keeping animated exports untouched, reusing the existing duration math so timings stay consistent.
// 🛠️ EDIT LOG [2025-11-11-D]
// 🔍 WHAT WAS WRONG:
// Arrow heads still sat shy of the line endpoint because round caps extended the stroke, and the default option continued to render a block head.
// 🤔 WHY IT HAD TO BE CHANGED:
// Exports must leave plain lines untouched and only snap an arrow on when explicitly requested.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Use butt caps whenever arrow heads are active and skip drawing extra geometry for plain lines so the tip meets flush.
// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// Exported GIFs ignored the new arrow/block head selection and always showed rounded caps.
// 🤔 WHY IT HAD TO BE CHANGED:
// Mismatched terminals break trust with clients reviewing handoff animations.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Render end-cap geometry in the exporter using line metadata so downloads mirror the canvas preview.
// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// The GIF exporter called `quadraticCurveTo` blindly, which the pureimage shim ignores, so bent strokes disappeared from downloaded animations.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without visible curves the exported GIF diverges from the canvas preview, confusing clients reviewing annotations.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Route every curved stroke through the shared quadratic fallback so canvases without native support approximate the curve with line segments.
// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// The GIF exporter replayed lines as straight segments and animated helpers with fixed tangents, so curved arrow-mode edits flattened in exports.
// 🤔 WHY IT HAD TO BE CHANGED:
// Once designers bend a stroke, the exported animation must preserve both the curve and object motion along it to stay faithful to the canvas preview.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added quadratic Bézier evaluation for drawing and helper positions, reusing the new control point to keep curvature and tangent-aligned animations intact.

import type { LineSegment } from '@/lib/canvas/types';
import type { QuadraticContext } from '@/lib/render/drawLine';
import { strokeQuadraticCurve } from '@/lib/render/drawLine';
import {
  approximateLineLength,
  computeArrowHeadDimensions,
  type ArrowHeadDimensions,
} from '@/lib/render/arrowGeometry';
type GIFConstructor = typeof import('gif.js/optimized')['default'];

type ExportStageOptions = {
  width: number;
  height: number;
  backgroundSrc: string | null;
  lines: LineSegment[];
  durationMs?: number;
  fps?: number;
};

const FALLBACK_BACKGROUND_COLOR = '#0C0A09';
const DEFAULT_DURATION_MS = 2800;
const DEFAULT_FPS = 20;

let gifLoaderPromise: Promise<{ GIF: GIFConstructor; workerSrc: string }> | null = null;

async function loadGifJs() {
  if (!gifLoaderPromise) {
    gifLoaderPromise = Promise.all([
      import('gif.js/dist/gif.js'),
      import('gif.js/dist/gif.worker.js?url'),
    ]).then(([gifModule, workerModule]) => {
      const workerSrcCandidate =
        typeof workerModule === 'string'
          ? workerModule
          : 'default' in workerModule
            ? workerModule.default
            : undefined;

      const workerSrc =
        typeof workerSrcCandidate === 'string'
          ? workerSrcCandidate
          : workerSrcCandidate !== undefined
            ? String(workerSrcCandidate)
            : undefined;

      if (!workerSrc) {
        throw new Error('Unable to resolve gif.js worker source URL');
      }

      return {
        GIF: gifModule.default,
        workerSrc,
      };
    });
  }

  return gifLoaderPromise;
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load background image'));
    image.src = src;
  });
}

type PreparedLine = LineSegment & {
  shapeSizePx: number;
};

function prepareLines(lines: LineSegment[], width: number, height: number): PreparedLine[] {
  const pxPerUnitX = width / 100;
  const pxPerUnitY = height / 100;
  const averagePxPerUnit = (Math.abs(pxPerUnitX) + Math.abs(pxPerUnitY)) / 2;

  return [...lines]
    .sort((a, b) => a.stackOrder - b.stackOrder)
    .map((line) => {
      const baseShapeSize = Math.max(1.5, line.strokeWidth * 1.5);

      return {
        ...line,
        shapeSizePx: baseShapeSize * averagePxPerUnit,
      };
    });
}

function hasControlPoint(line: LineSegment): line is LineSegment & {
  controlPoint: NonNullable<LineSegment['controlPoint']>;
} {
  return Boolean(line.controlPoint && Number.isFinite(line.controlPoint.x) && Number.isFinite(line.controlPoint.y));
}

function evaluateLinePoint(line: LineSegment, t: number) {
  const clampedT = Math.max(0, Math.min(1, t));

  if (hasControlPoint(line)) {
    const control = line.controlPoint;
    const oneMinusT = 1 - clampedT;
    const x =
      oneMinusT * oneMinusT * line.start.x +
      2 * oneMinusT * clampedT * control.x +
      clampedT * clampedT * line.end.x;
    const y =
      oneMinusT * oneMinusT * line.start.y +
      2 * oneMinusT * clampedT * control.y +
      clampedT * clampedT * line.end.y;

    return { x, y };
  }

  return {
    x: line.start.x + (line.end.x - line.start.x) * clampedT,
    y: line.start.y + (line.end.y - line.start.y) * clampedT,
  };
}

function evaluateLineTangent(line: LineSegment, t: number) {
  const clampedT = Math.max(0, Math.min(1, t));

  if (hasControlPoint(line)) {
    const control = line.controlPoint;
    const oneMinusT = 1 - clampedT;
    const dx = 2 * oneMinusT * (control.x - line.start.x) + 2 * clampedT * (line.end.x - control.x);
    const dy = 2 * oneMinusT * (control.y - line.start.y) + 2 * clampedT * (line.end.y - control.y);
    return { dx, dy };
  }

  return {
    dx: line.end.x - line.start.x,
    dy: line.end.y - line.start.y,
  };
}

function drawArrowHead(
  context: CanvasRenderingContext2D,
  strokeColor: string,
  endPoint: { x: number; y: number },
  angle: number,
  dimensions: ArrowHeadDimensions,
) {
  context.save();
  context.translate(endPoint.x, endPoint.y);
  context.rotate(angle);
  context.fillStyle = strokeColor;
  context.beginPath();
  context.moveTo(0, dimensions.halfWidth);
  context.lineTo(0, -dimensions.halfWidth);
  context.lineTo(dimensions.headLength, 0);
  context.closePath();
  context.fill();
  context.restore();
}

function toCanvasX(value: number, width: number) {
  return (value / 100) * width;
}

function toCanvasY(value: number, height: number) {
  return (value / 100) * height;
}

function calculateShapeOpacity(progress: number) {
  if (progress < 0.1) {
    return progress / 0.1;
  }
  if (progress > 0.9) {
    return (1 - progress) / 0.1;
  }
  return 1;
}

export async function exportStageToGif(options: ExportStageOptions) {
  const { width, height, backgroundSrc, lines, durationMs = DEFAULT_DURATION_MS, fps = DEFAULT_FPS } = options;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid canvas dimensions provided for GIF export');
  }

  const [{ GIF, workerSrc }, backgroundImage] = await Promise.all([
    loadGifJs(),
    backgroundSrc ? loadImageElement(backgroundSrc) : Promise.resolve<HTMLImageElement | null>(null),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('Unable to access drawing context for GIF export');
  }

  const preparedLines = prepareLines(lines, width, height);
  const hasAnimatedShapes = preparedLines.some(
    (line) => line.animateShapes && line.shapeType && line.shapeCount > 0,
  );
  const totalFrames = hasAnimatedShapes ? Math.max(1, Math.round((durationMs / 1000) * fps)) : 1;
  const frameDelay = Math.max(20, Math.round(durationMs / totalFrames));

  const gif = new GIF({
    workers: 2,
    workerScript: workerSrc,
    quality: 12,
    width: canvas.width,
    height: canvas.height,
  });

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    const progress = (frameIndex / totalFrames) % 1;

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) {
      context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
      context.fillStyle = FALLBACK_BACKGROUND_COLOR;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.save();
    context.scale(canvas.width / 100, canvas.height / 100);
    preparedLines.forEach((line) => {
      const approxLength = approximateLineLength(line);
      const arrowDimensions =
        line.endCap === 'arrow'
          ? computeArrowHeadDimensions(line.strokeWidth, approxLength)
          : null;
      const tangent = evaluateLineTangent(line, 1);
      const tangentMagnitude = Math.hypot(tangent.dx, tangent.dy);
      const endPoint = evaluateLinePoint(line, 1);

      context.lineWidth = line.strokeWidth;
      context.strokeStyle = line.strokeColor;
      context.lineCap = arrowDimensions ? 'butt' : 'round';
      context.lineJoin = arrowDimensions ? 'miter' : 'round';
      context.beginPath();
      context.moveTo(line.start.x, line.start.y);
      if (hasControlPoint(line)) {
        const control = line.controlPoint;
        strokeQuadraticCurve(
          context as unknown as QuadraticContext,
          line.start.x,
          line.start.y,
          control.x,
          control.y,
          line.end.x,
          line.end.y,
        );
      } else {
        context.lineTo(line.end.x, line.end.y);
      }
      context.stroke();

      if (arrowDimensions && tangentMagnitude > 0) {
        const angle = Math.atan2(tangent.dy, tangent.dx);
        drawArrowHead(context, line.strokeColor, endPoint, angle, arrowDimensions);
      }
    });
    context.restore();

    preparedLines.forEach((line) => {
      if (!line.shapeType || line.shapeCount <= 0 || !line.animateShapes) {
        return;
      }

      const count = Math.max(1, line.shapeCount);

      for (let index = 0; index < count; index += 1) {
        const shapeProgress = (progress + index / count) % 1;
        const opacity = calculateShapeOpacity(shapeProgress);
        const position = evaluateLinePoint(line, shapeProgress);
        const tangent = evaluateLineTangent(line, shapeProgress);
        const angle =
          Math.abs(tangent.dx) + Math.abs(tangent.dy) === 0
            ? 0
            : Math.atan2(tangent.dy, tangent.dx);

        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, opacity));
        context.translate(toCanvasX(position.x, canvas.width), toCanvasY(position.y, canvas.height));
        context.rotate(angle);
        context.fillStyle = line.shapeColor;

        if (line.shapeType === 'circle') {
          const radius = line.shapeSizePx / 2;
          context.beginPath();
          context.arc(0, 0, radius, 0, Math.PI * 2);
          context.fill();
        } else if (line.shapeType === 'square') {
          const half = line.shapeSizePx / 2;
          context.fillRect(-half, -half, line.shapeSizePx, line.shapeSizePx);
        } else {
          const widthPx = line.shapeSizePx;
          const heightPx = widthPx * 0.9;
          context.beginPath();
          context.moveTo(-widthPx / 2, heightPx / 2);
          context.lineTo(widthPx / 2, 0);
          context.lineTo(-widthPx / 2, -heightPx / 2);
          context.closePath();
          context.fill();
        }
        context.restore();
      }
    });

    gif.addFrame(context, { delay: frameDelay, copy: true });
  }

  return new Promise<Blob>((resolve, reject) => {
    gif.on('finished', (blob: Blob) => resolve(blob));
    gif.on('abort', () => reject(new Error('GIF export was aborted')));
    try {
      gif.render();
    } catch (error) {
      reject(error as Error);
    }
  });
}


