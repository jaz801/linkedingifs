import type { LineSegment } from '@/lib/canvas/types';
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
  angle: number;
  shapeSizePx: number;
};

function prepareLines(lines: LineSegment[], width: number, height: number): PreparedLine[] {
  const pxPerUnitX = width / 100;
  const pxPerUnitY = height / 100;
  const averagePxPerUnit = (Math.abs(pxPerUnitX) + Math.abs(pxPerUnitY)) / 2;

  return [...lines]
    .sort((a, b) => a.stackOrder - b.stackOrder)
    .map((line) => {
      const startPX = (line.start.x / 100) * width;
      const startPY = (line.start.y / 100) * height;
      const endPX = (line.end.x / 100) * width;
      const endPY = (line.end.y / 100) * height;
      const deltaXPx = endPX - startPX;
      const deltaYPx = endPY - startPY;
      const angle = Math.atan2(deltaYPx, deltaXPx || 0);
      const baseShapeSize = Math.max(1.5, line.strokeWidth * 1.5);

      return {
        ...line,
        angle,
        shapeSizePx: baseShapeSize * averagePxPerUnit,
      };
    });
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
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
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
      context.lineWidth = line.strokeWidth;
      context.strokeStyle = line.strokeColor;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(line.start.x, line.start.y);
      context.lineTo(line.end.x, line.end.y);
      context.stroke();
    });
    context.restore();

    preparedLines.forEach((line) => {
      if (!line.shapeType || line.shapeCount <= 0 || !line.animateShapes) {
        return;
      }

      const count = Math.max(1, line.shapeCount);

      for (let index = 0; index < count; index += 1) {
        const shapeProgress = (progress + index / count) % 1;
        const opacity =
          shapeProgress < 0.1
            ? shapeProgress / 0.1
            : shapeProgress > 0.9
              ? (1 - shapeProgress) / 0.1
              : 1;
        const positionX = line.start.x + (line.end.x - line.start.x) * shapeProgress;
        const positionY = line.start.y + (line.end.y - line.start.y) * shapeProgress;

        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, opacity));
        context.translate((positionX / 100) * canvas.width, (positionY / 100) * canvas.height);
        context.rotate(line.angle);
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


