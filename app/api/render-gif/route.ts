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

// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Missing backend counterpart for frontend feature
// 📂 FILE: app/api/render-gif/route.ts
// 🧾 HISTORY: This issue has now occurred 1 time in this project.
//   - #1 on 2025-11-08 [Handled by adding GIF rendering route]
// 🚨 Next steps:
// Add regression tests that call the API route with sample payloads to ensure future refactors keep exports working.

import { NextResponse } from 'next/server';
import CanvasGifEncoder from '@pencil.js/canvas-gif-encoder';
import { createCanvas, loadImage } from 'canvas';
import type { CanvasRenderingContext2D } from 'canvas';

import type { RenderGifPayload, RenderLineInput, RenderObjectInput } from '@/lib/render/schema';

export const runtime = 'nodejs';

/**
 * Next.js runs the frontend and backend together when you execute `npm run dev`;
 * this route lives inside the same dev server, so no separate backend process is required.
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RenderGifPayload;

    validatePayload(payload);

    const buffer = await renderGif(payload);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': 'attachment; filename="animation.gif"',
        'Cache-Control': 'no-store',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to render GIF:', error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to render GIF at this time.',
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

  const encoder = new CanvasGifEncoder(width, height);
  encoder.setRepeat(0);
  encoder.setDelay(delayMs);
  encoder.setQuality(10);
  encoder.start();

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    context.clearRect(0, 0, width, height);
    context.drawImage(backgroundImage, 0, 0, width, height);

    drawLines(context, lines);
    drawObjects(context, objects, lines, frameIndex, totalFrames);

    encoder.addFrame(context, delayMs);
  }

  encoder.finish();

  return resolveEncoderBuffer(encoder);
}

function resolveEncoderBuffer(
  encoder: CanvasGifEncoder & { streamInfo?: { data?: unknown } },
): Buffer {
  const data = encoder.streamInfo?.data;
  if (!data) {
    throw new Error('GIF encoder returned empty output.');
  }

  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }

  if (Array.isArray(data)) {
    return Buffer.from(data);
  }

  if (typeof data === 'string') {
    return Buffer.from(data, 'binary');
  }

  throw new Error('Unsupported GIF encoder output type.');
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

