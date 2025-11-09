// 🛠️ EDIT LOG [Cursor Rule #1]
// 🔍 WHAT WAS WRONG:
// The frontend called `/api/render-gif`, but no backend handler existed, so every export attempt failed with “Unable to render GIF at this time.”
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a rendering endpoint, users could not download animated GIFs, blocking a core workflow.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Implemented a Next.js route that rasterizes the canvas background, animates line-following objects per frame, and streams the frames through `gif-encoder`, keeping everything inside the existing dev server.
// 🔍 WHAT WAS WRONG (2025-11-08-G):
// Switching to `@pencil.js/canvas-gif-encoder` removed the streaming API, but the route still relied on `createReadStream`, causing every export to throw at runtime.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-08-G):
// With the encoder returning in-memory buffers only, the stream listeners never fired, so the handler crashed and the client could not download GIFs.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-08-G):
// Refactored the encoder usage to the library’s buffer-based API and now return the binary payload directly from the route with explicit headers, keeping the render pipeline unchanged otherwise.
// 🔍 WHAT WAS WRONG (2025-11-09-A):
// The dependency on `@pencil.js/canvas-gif-encoder` was never added to package.json, so production builds failed with “Module not found.”
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-09-A):
// Without the encoder at runtime the route could not execute, blocking all GIF exports after the background animation update shipped.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-09-A):
// Declared the dependency explicitly and wrapped the handler in structured logging so future crashes surface request metadata and error identifiers automatically.
// 🔍 WHAT WAS WRONG (2025-11-09-B):
// After switching to `@pencil.js/canvas-gif-encoder`, the handler still called legacy `gif-encoder` APIs (`setRepeat`, `setDelay`, `setQuality`, `finish`), causing every request to fail with “encoder.setRepeat is not a function.”
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-09-B):
// The test harness and frontend could no longer export GIFs, blocking validation of rendering changes.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-09-B):
// Updated the route to use the library’s builder-style workflow (per-frame delays via `addFrame` and `end()` for output) and convert the returned `Uint8Array` to a Buffer, restoring compatibility without reintroducing streaming complexity.
// 🔍 WHAT WAS WRONG (2025-11-09-C):
// `@pencil.js/canvas-gif-encoder` does not implement the legacy `setRepeat`/`setDelay`/`setQuality` API, so downstream code still invoking those methods crashed every request even after the handler refactor.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-09-C):
// Clients remained unable to download GIFs; the server continued to throw “encoder.setRepeat is not a function,” blocking validation and demos.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-09-C):
// Switched the handler to `gif-encoder-2`, which supports the streaming-style API we rely on, and now collect the finished buffer directly from the encoder, restoring compatibility with existing rendering logic.
// 🔍 WHAT WAS WRONG (2025-11-09-D):
// TypeScript compared the DOM `ImageData` type (with a required `colorSpace` field) to the `canvas` package’s `ImageData`, so the build crashed even though runtime behaviour was correct.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-09-D):
// Production deploys cannot progress while the compiler rejects the route, and the mismatch will reappear every time we run `next build`.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-09-D):
// Narrowed the `addFrame` input to the encoder’s actual parameter type and cast the Node-canvas image data accordingly, unblocking builds without altering rendering logic.

// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Missing backend counterpart for frontend feature
// 📂 FILE: app/api/render-gif/route.ts
// 🧾 HISTORY: This issue has now occurred 2 times in this project.
//   - #1 on 2025-11-08 [Handled by adding GIF rendering route]
//   - #2 on 2025-11-09 [Resolved by switching server encoder to gif-encoder-2]
// 🚨 Next steps:
// Add regression tests that call the API route with sample payloads to ensure future refactors keep exports working.

import { NextResponse } from 'next/server';
import { performance } from 'node:perf_hooks';
import GIFEncoder from 'gif-encoder-2';
import { createCanvas, loadImage } from 'canvas';
import type { CanvasRenderingContext2D } from 'canvas';

import type { RenderGifPayload, RenderLineInput, RenderObjectInput } from '@/lib/render/schema';
import {
  createServerEventId,
  logServerMessage,
  reportServerError,
} from '@/lib/monitoring/serverLogger';

export const runtime = 'nodejs';

/**
 * Next.js runs the frontend and backend together when you execute `npm run dev`;
 * this route lives inside the same dev server, so no separate backend process is required.
 */
export async function POST(request: Request) {
  const requestId = createServerEventId('render_gif');
  const startedAt = performance.now();
  let payloadSummary: Record<string, unknown> | null = null;

  try {
    const payload = (await request.json()) as RenderGifPayload;

    validatePayload(payload);

    const summary = summarizePayload(payload);
    payloadSummary = summary;

    const buffer = await renderGif(payload);
    const responseBody = toArrayBuffer(buffer);

    logServerMessage('info', 'render-gif:success', {
      requestId,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      ...summary,
    });

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': 'attachment; filename="animation.gif"',
        'Cache-Control': 'no-store',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    const { errorId, message } = reportServerError(error, {
      hint: 'render-gif:failure',
      context: {
        requestId,
        payload: payloadSummary,
      },
    });
    return NextResponse.json(
      {
        message,
        errorId,
        requestId,
      },
      { status: 400 },
    );
  }
}

function validatePayload(payload: RenderGifPayload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid render payload.');
  }

  const { width, height, background, duration } = payload;

  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('GIF width must be a positive number.');
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error('GIF height must be a positive number.');
  }
  if (!background || typeof background !== 'string') {
    throw new Error('GIF background must be a PNG data URL string.');
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('GIF duration must be a positive number.');
  }
}

async function renderGif(payload: RenderGifPayload): Promise<Buffer> {
  const { width, height, background, duration, lines, objects } = payload;
  const fps = sanitizeFps(payload.fps);
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const delayMs = Math.max(1, Math.round(1000 / fps));

  const backgroundImage = await loadImage(background);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to acquire 2D rendering context.');
  }

  const encoder = createGifEncoder(width, height, totalFrames, delayMs);

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    context.clearRect(0, 0, width, height);
    context.drawImage(backgroundImage, 0, 0, width, height);

    drawLines(context, lines);
    drawObjects(context, objects, lines, frameIndex, totalFrames);

    const frame = context.getImageData(0, 0, width, height);
    encoder.addFrame(Buffer.from(frame.data));
  }

  encoder.finish();

  return getEncoderBuffer(encoder);
}

function createGifEncoder(
  width: number,
  height: number,
  totalFrames: number,
  delayMs: number,
): GIFEncoder & { out: { getData: () => Buffer } } {
  const encoder = new GIFEncoder(
    width,
    height,
    'neuquant',
    false,
    totalFrames,
  ) as GIFEncoder & { out: { getData: () => Buffer } };
  encoder.setRepeat(0);
  encoder.setDelay(delayMs);
  encoder.setQuality(10);
  encoder.start();

  return encoder;
}

function sanitizeFps(fps: RenderGifPayload['fps']) {
  const fallback = 24;
  if (!Number.isFinite(fps)) {
    return fallback;
  }
  const parsed = Number(fps);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(60, Math.max(1, Math.round(parsed)));
}

function drawLines(context: CanvasRenderingContext2D, lines: RenderLineInput[]) {
  if (!Array.isArray(lines)) {
    return;
  }

  lines.forEach((line) => {
    context.save();
    context.beginPath();
    context.moveTo(line.x1, line.y1);
    context.lineTo(line.x2, line.y2);
    context.strokeStyle = line.strokeColor ?? '#FFFFFF';
    context.lineWidth = Math.max(1, line.strokeWidth ?? 1);
    context.lineCap = 'round';
    context.stroke();
    context.restore();
  });
}

function drawObjects(
  context: CanvasRenderingContext2D,
  objects: RenderObjectInput[],
  lines: RenderLineInput[],
  frameIndex: number,
  totalFrames: number,
) {
  if (!Array.isArray(objects) || objects.length === 0) {
    return;
  }

  objects.forEach((object) => {
    const line = lines[object.lineIndex];
    if (!line) {
      return;
    }

    const position = calculateObjectPosition(object, line, frameIndex, totalFrames);
    if (!position) {
      return;
    }

    context.save();
    context.translate(position.x, position.y);
    context.rotate(position.angle);
    context.fillStyle = object.color ?? '#FFFFFF';

    const size = Math.max(1, object.size ?? 6);

    switch (object.type) {
      case 'dot':
        drawDot(context, size);
        break;
      case 'cube':
        drawCube(context, size);
        break;
      case 'arrow':
        drawArrow(context, size);
        break;
      default:
        drawDot(context, size);
        break;
    }

    context.restore();
  });
}

function calculateObjectPosition(
  object: RenderObjectInput,
  line: RenderLineInput,
  frameIndex: number,
  totalFrames: number,
) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return null;
  }

  const baseOffset = typeof object.offset === 'number' ? object.offset : 0;
  const speed = typeof object.speed === 'number' ? object.speed : 1;
  const direction = object.direction === 'backwards' ? -1 : 1;

  const progress = normalizeProgress(baseOffset + direction * speed * (frameIndex / totalFrames));

  const distanceAlongLine = progress * length;
  const x = line.x1 + (dx / length) * distanceAlongLine;
  const y = line.y1 + (dy / length) * distanceAlongLine;
  const angle = Math.atan2(dy, dx);

  return { x, y, angle };
}

function normalizeProgress(value: number) {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function drawDot(context: CanvasRenderingContext2D, size: number) {
  const radius = size / 2;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
}

function drawCube(context: CanvasRenderingContext2D, size: number) {
  const half = size / 2;
  context.fillRect(-half, -half, size, size);
}

function drawArrow(context: CanvasRenderingContext2D, size: number) {
  const half = size / 2;
  context.beginPath();
  context.moveTo(-half, half);
  context.lineTo(-half, -half);
  context.lineTo(half, 0);
  context.closePath();
  context.fill();
}

function summarizePayload(payload: RenderGifPayload) {
  return {
    width: payload.width,
    height: payload.height,
    duration: payload.duration,
    fps: sanitizeFps(payload.fps),
    lineCount: Array.isArray(payload.lines) ? payload.lines.length : 0,
    objectCount: Array.isArray(payload.objects) ? payload.objects.length : 0,
  };
}

function getEncoderBuffer(encoder: GIFEncoder & { out?: { getData?: () => Buffer } }) {
  const data = encoder.out?.getData?.();
  if (!data || data.length === 0) {
    throw new Error('GIF encoder returned empty output.');
  }

  return data;
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

