// 🛠️ EDIT LOG [2025-01-XX]
// 🔍 WHAT WAS WRONG:
// Lines were not rendering at exact positions where users placed them, and background clarity was degraded. Canvas dimensions were floating-point causing precision issues, and encoder quality was too low.
// 🤔 WHY IT HAD TO BE CHANGED:
// Users reported that lines appeared slightly offset from where they drew them, and backgrounds looked blurry in exported GIFs. Canvas requires integer dimensions, and floating-point coordinates need proper handling.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Round canvas dimensions to integers while preserving exact floating-point coordinates for sub-pixel precision. Improved encoder quality from 10 to 5 for better background clarity. This ensures pixel-perfect rendering that matches the interface exactly.
// 🛠️ EDIT LOG [2025-01-XX]
// 🔍 WHAT WAS WRONG:
// Frame delay was capped at minimum 20ms, limiting GIFs to 50fps max and causing frame rate drops. Users wanted higher frame rates without sacrificing quality.
// 🤔 WHY IT HAD TO BE CHANGED:
// The 20ms minimum delay prevented users from achieving smooth high-frame-rate animations, especially for fast-moving objects.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Remove the 20ms cap and use 1ms minimum instead, allowing frame rates up to 1000fps if needed. This maintains speed while enabling higher frame rates.
// 🎨 DESIGN PRINCIPLES TO PREVENT REGRESSIONS:
// 1. ALWAYS check `line.points && line.points.length > 0` before accessing pen tool points - pen tool has different data structure
// 2. ALWAYS handle both `line.points` (pen tool) and `line.x1`/`line.x2` (line/arrow tools) - they are mutually exclusive
// 3. ALWAYS convert percentage coordinates (0-100) to pixel coordinates in `buildRenderPayload` - backend expects pixels
// 4. ALWAYS update both `evaluateLinePoint` and `evaluateLineTangent` together when adding new line types - they must stay in sync
// 5. ALWAYS test pen tool exports after any line rendering changes - it's the most complex case
// 6. ALWAYS ensure backend and frontend export logic stay in sync - use same coordinate system and path building logic
// 🛠️ EDIT LOG [2025-11-12-B]
// 🔍 WHAT WAS WRONG:
// Every render decoded the background PNG and rebuilt line geometry from scratch, so identical snapshot revisions still spent milliseconds on setup.
// 🤔 WHY IT HAD TO BE CHANGED:
// Those redundant costs compounded across auto-renders and kept cached downloads from landing under the 3-second goal.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Memoize decoded backgrounds, reuse precomputed line geometry keyed by payload hashes, and tune the encoder for speed so repeat renders skip the heavy lifting.
// 🛠️ EDIT LOG [2025-11-12-A]
// 🔍 WHAT WAS WRONG:
// The route still rendered GIFs on demand, so the new auto-render pipeline had no way to reuse cached snapshots when downloading.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a GET handler tied to the snapshot store, every download repeated all rendering work, defeating the purpose of background encodes.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added a snapshot-aware GET endpoint while preserving the existing POST flow for direct renders, exposing revision metadata and cached timings to the client.
// 🛠️ EDIT LOG [2025-11-11-K]
// 🔍 WHAT WAS WRONG:
// The frontend had no reliable timing signal from the encoder, so progress indicators guessed blindly and users had no idea when renders would finish.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without surfaced processing times we could not calibrate a determinate loading bar, leaving designers unsure whether to wait or retry.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Return the measured processing duration and frame counts as response headers so the UI can learn from real timings and present an accurate progress bar.
// 🛠️ EDIT LOG [2025-11-11-J]
// 🔍 WHAT WAS WRONG:
// We lacked hard numbers for decode, draw, and encode timings, making it risky to optimise without a baseline and risking regressions in GIF fidelity.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without structured metrics we could not prove that new caching and dedupe strategies preserved performance expectations or spot new hotspots quickly.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Instrumented the render pipeline with timing metrics reported alongside success logs so every export surfaces decode/draw/encode durations without altering visual output.
// 🛠️ EDIT LOG [2025-11-11-I]
// 🔍 WHAT WAS WRONG:
// The route owned the encoder helper outright, so we still lacked reusable coverage and kept re-learning the frame contract.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a shareable module we could not test the conversion in isolation, and the helper stayed tightly coupled to the route.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Moved the frame conversion into `encoderUtils` and wrapped it with unit tests so future encoder swaps surface errors without touching the route.
// 🛠️ EDIT LOG [2025-11-11-G]
// 🔍 WHAT WAS WRONG:
// TypeScript collapsed the canvas frame data to `ArrayBuffer`, so passing it straight into `encoder.addFrame` triggered a compile-time type error and blocked builds.
// 🤔 WHY IT HAD TO BE CHANGED:
// Production exports must build cleanly; leaving the route red would keep `next build` from succeeding and prevent shipping other fixes.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Normalize each frame into a `Buffer` before enqueueing it, satisfying the encoder’s signature without touching the rendering loop or reallocating more than necessary.
// 🛠️ EDIT LOG [2025-11-11-F]
// 🔍 WHAT WAS WRONG:
// Backend renders still encoded dozens of identical frames when helper shapes were disabled, so even simple line exports took several seconds to finish.
// 🤔 WHY IT HAD TO BE CHANGED:
// Shipping static canvases should not bottleneck on GIF quantization; wasting time on duplicate frames delayed handoffs and cluttered the render queue.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Skip redundant frames whenever no objects animate, reuse the existing duration math for delay timings, and forward raw ImageData buffers to the encoder to cut per-frame copies.
// 🛠️ EDIT LOG [2025-11-11-E]
// 🔍 WHAT WAS WRONG:
// The renderer forced every stroke width to at least 1px, so the API ignored hairline lines that the UI now supports and exports came out thicker than intended.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers need sub-pixel guides to survive backend rendering; clamping at 1px broke parity with the canvas and GIF exporter.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Standardized on a 0.001 minimum stroke width and reused it when drawing lines and arrow heads so fractional values render faithfully.
// 🛠️ EDIT LOG [2025-11-11-D]
// 🔍 WHAT WAS WRONG:
// Arrow heads still stopped short of the line tip because round stroke caps extended past the endpoint, and the plain option continued to add a block head.
// 🤔 WHY IT HAD TO BE CHANGED:
// Server renders must leave straight lines untouched while snapping an arrow flush when requested.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Switch to butt caps when arrows are active and skip rendering extra geometry for the default line mode so both outputs stay aligned.
// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// The server renderer never drew the selected arrow/block end caps, so API exports shipped rounded tips regardless of UI state.
// 🤔 WHY IT HAD TO BE CHANGED:
// Backend renders must mirror the canvas or downloaded GIFs lose critical annotation context.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added end-cap metadata to the payload and render pipeline so the Node canvas draws the correct terminal geometry.
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
// 🔍 WHAT WAS WRONG (2025-11-09-E):
// Our polyfilled canvas context declared the `arc` signature with an explicit `counterclockwise` flag, but the helper omitted it, so `next build` failed with “Expected 6 arguments.”
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-09-E):
// The GIF renderer is part of the production build; the compiler error blocked deploys entirely.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-09-E):
// Passed `false` for the optional flag to match the type definition without altering runtime behaviour.
// 🔍 WHAT WAS WRONG (2025-11-11-A):
// Rounded helper shapes ignored the new curved lines from arrow mode, because the renderer only knew about straight segments.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-11-A):
// Flattening curvature in the exported GIF made the server output diverge from the canvas preview and broke animation alignment.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-11-A):
// Accept optional control points in the payload, draw quadratic curves when present, and drive helper positions from Bézier tangents so exports stay faithful.
// 🔍 WHAT WAS WRONG (2025-11-11-B):
// The PureImage shim powering server exports silently ignored `quadraticCurveTo`, so bent lines vanished even though helper objects kept animating.
// 🤔 WHY IT HAD TO BE CHANGED (2025-11-11-B):
// GIF handoffs must match the on-canvas preview; dropping the stroke makes curved annotations unusable for clients.
// ✅ WHY THIS SOLUTION WAS PICKED (2025-11-11-B):
// Reuse the shared quadratic fallback to approximate curves with short line segments whenever the context lacks native support.

// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Missing backend counterpart for frontend feature
// 📂 FILE: app/api/render-gif/route.ts
// 🧾 HISTORY: This issue has now occurred 2 times in this project.
//   - #1 on 2025-11-08 [Handled by adding GIF rendering route]
//   - #2 on 2025-11-09 [Resolved by switching server encoder to gif-encoder-2]
// 🚨 Next steps:
// Add regression tests that call the API route with sample payloads to ensure future refactors keep exports working.
// 🔁 RECURRING ISSUE TRACKER [GIF Frame Data Type Mismatch]
// 🧠 ERROR TYPE: TypeScript signature mismatch between canvas `ImageData` and `gifencoder`
// 📂 FILE: app/api/render-gif/route.ts
// 🧾 HISTORY: This issue has now occurred 2 times in this project.
//   - #1 on 2025-11-09 [Narrowed encoder input to match Node-canvas `ImageData` definitions]
//   - #2 on 2025-11-11 [Normalized frame pixels into `Buffer` before `addFrame` to satisfy the encoder types]
//   - #3 on 2025-11-11 [Published shared `CanvasImageData` typings and wrapped encoder writes behind `addFrameToEncoder`]
//   - #4 on 2025-11-11 [Extracted encoder utilities and covered them with unit tests]
// 🚨 Next steps:
// Wire the new encoder utility tests into CI and keep future frame logic behind the helper so coverage stays focused.

import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import GIFEncoder from 'gifencoder';

import type { RenderGifPayload, RenderLineInput, RenderObjectInput } from '@/lib/render/schema';
import type { QuadraticContext } from '@/lib/render/drawLine';
import { strokeQuadraticCurve } from '@/lib/render/drawLine';
import {
  createServerEventId,
  logServerMessage,
  reportServerError,
} from '@/lib/monitoring/serverLogger';
import { getCanvasModule } from '@/lib/canvas/server';
import type { CanvasLikeContext } from '@/lib/render/canvasContext';
import {
  computeArrowHeadDimensions,
  type ArrowHeadDimensions,
} from '@/lib/render/arrowGeometry';
import type { RenderTimingMetrics } from '@/lib/render/renderMetrics';
import { fetchSnapshot } from '@/lib/render/snapshotStore';
import { addFrameToEncoder, configureEncoderForFastRender, normalizeFrameData } from './encoderUtils';

export const runtime = 'nodejs';

const MIN_LINE_WIDTH = 0.001;
const BACKGROUND_CACHE_LIMIT = 6;
const PREPARED_LINES_CACHE_LIMIT = 32;

type CanvasBindings = ReturnType<typeof getCanvasModule>;
type CanvasFactory = ReturnType<typeof getCanvasModule>['createCanvas'];
type CanvasInstance = ReturnType<CanvasFactory>;
type Canvas2DContext = CanvasInstance extends { getContext(type: '2d'): infer C }
  ? C
  : CanvasLikeContext;
type LoadImageFn = CanvasBindings['loadImage'];
type LoadedImage = Awaited<ReturnType<LoadImageFn>>;

type CachedBackgroundEntry = {
  source: string;
  image: LoadedImage;
  lastUsed: number;
};

type PreparedLinesCacheEntry = {
  prepared: PreparedRenderLine[];
  lastUsed: number;
};

type PreparedRenderLine = {
  original: RenderLineInput;
  strokeWidth: number;
  hasControl: boolean;
  arrowDimensions: ArrowHeadDimensions | null;
  endPoint: { x: number; y: number };
  tangent: { dx: number; dy: number };
  tangentMagnitude: number;
};

const backgroundCache = new Map<string, CachedBackgroundEntry>();
const preparedLinesCache = new Map<string, PreparedLinesCacheEntry>();

/**
 * Next.js runs the frontend and backend together when you execute `npm run dev`;
 * this route lives inside the same dev server, so no separate backend process is required.
 */

export async function GET(request: Request) {
  const requestId = createServerEventId('render_gif_fetch');
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId || sessionId.trim().length === 0) {
      throw new Error('sessionId query parameter is required to fetch a cached GIF.');
    }

    const snapshot = await fetchSnapshot(sessionId.trim());
    if (!snapshot) {
      return NextResponse.json(
        {
          message: 'No prepared GIF is available for this session.',
          requestId,
        },
        { status: 404 },
      );
    }

    const { buffer, meta } = snapshot;
    logServerMessage('info', 'render-gif:fetch-success', {
      requestId,
      sessionId,
      revision: meta.revision,
      payloadHash: meta.payloadHash,
      encodedFrames: meta.metrics.encodedFrames,
      contentLength: meta.contentLength,
    });

    return new NextResponse(toArrayBuffer(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': 'attachment; filename="animation.gif"',
        'Cache-Control': 'no-store',
        'Content-Length': meta.contentLength.toString(),
        'X-Render-Processing-Ms': meta.processingMs.toFixed(2),
        'X-Render-Encoded-Frames': meta.metrics.encodedFrames.toString(),
        'X-Render-Revision': meta.revision.toString(),
        'X-Render-Updated-At': new Date(meta.updatedAt).toISOString(),
      },
    });
  } catch (error) {
    const { errorId, message } = reportServerError(error, {
      hint: 'render-gif:fetch-failure',
      context: {
        requestId,
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

export async function POST(request: Request) {
  const requestId = createServerEventId('render_gif');
  const startedAt = performance.now();
  let payloadSummary: Record<string, unknown> | null = null;

  try {
    const payload = (await request.json()) as RenderGifPayload;

    validatePayload(payload);

    const summary = summarizePayload(payload);
    payloadSummary = summary;

    const { buffer, metrics } = await renderGif(payload);
    const responseBody = toArrayBuffer(buffer);
    const processingMs =
      metrics.decodeMs + metrics.drawMs + metrics.enqueueMs + metrics.finalizeMs;

    logServerMessage('info', 'render-gif:success', {
      requestId,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      ...summary,
      timings: {
        decodeMs: Number(metrics.decodeMs.toFixed(2)),
        drawMs: Number(metrics.drawMs.toFixed(2)),
        enqueueMs: Number(metrics.enqueueMs.toFixed(2)),
        finalizeMs: Number(metrics.finalizeMs.toFixed(2)),
        totalFrames: metrics.totalFrames,
        skippedFrames: metrics.skippedFrames,
        encodedFrames: metrics.encodedFrames,
        processingMs: Number(processingMs.toFixed(2)),
      },
    });

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': 'attachment; filename="animation.gif"',
        'Cache-Control': 'no-store',
        'Content-Length': buffer.byteLength.toString(),
        'X-Render-Processing-Ms': processingMs.toFixed(2),
        'X-Render-Encoded-Frames': metrics.encodedFrames.toString(),
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

export function validatePayload(payload: RenderGifPayload) {
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

export async function renderGif(payload: RenderGifPayload): Promise<{
  buffer: Buffer;
  metrics: RenderTimingMetrics;
}> {
  const { width, height, background, duration, lines, objects } = payload;
  const fps = sanitizeFps(payload.fps);
  const durationMs = Math.max(0, Math.round(duration * 1000));
  const hasAnimatedObjects = Array.isArray(objects) && objects.length > 0;
  const totalFrames = hasAnimatedObjects ? Math.max(1, Math.round(duration * fps)) : 1;
  // Remove minimum delay cap to allow higher frame rates (previously capped at 20ms = 50fps max)
  // Use minimum of 1ms to prevent division by zero, allowing up to 1000fps if needed
  const delayMs = Math.max(1, Math.round(durationMs / totalFrames));

  const canvasBindings = loadCanvasBindings();
  const { createCanvas, loadImage } = canvasBindings;

  const timings: RenderTimingMetrics = {
    decodeMs: 0,
    drawMs: 0,
    enqueueMs: 0,
    finalizeMs: 0,
    totalFrames,
    skippedFrames: 0,
    encodedFrames: 0,
  };

  const decodeStartedAt = performance.now();
  const backgroundImage = await getCachedBackground(loadImage, background);
  timings.decodeMs = performance.now() - decodeStartedAt;

  // Canvas dimensions must be integers - round to ensure exact pixel rendering
  const canvasWidth = Math.round(width);
  const canvasHeight = Math.round(height);
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const context = getContext2d(canvas);

  // Enable high-quality rendering with sub-pixel precision
  if ('imageSmoothingEnabled' in context) {
    (context as Canvas2DContext & { imageSmoothingEnabled: boolean }).imageSmoothingEnabled = true;
  }
  if ('imageSmoothingQuality' in context) {
    (context as Canvas2DContext & { imageSmoothingQuality: string }).imageSmoothingQuality = 'high';
  }

  // CRITICAL: Coordinates are received as pixels (converted from percentage 0-100 in buildRenderPayload)
  // These must match EXACTLY what the user sees in the interface
  // The interface uses SVG viewBox="0 0 100 100" with preserveAspectRatio="none" which stretches non-uniformly
  // We receive pixel coordinates here, so we draw directly in pixels - no additional scaling needed
  // Use exact floating-point coordinates to preserve sub-pixel precision

  const { encoder, completion } = createGifEncoder(canvasWidth, canvasHeight, delayMs);

  const preparedLines = getPreparedRenderLines(Array.isArray(lines) ? lines : []);
  let pendingDelay = delayMs;
  let lastFrameBuffer: Buffer | null = null;

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    const frameStartedAt = performance.now();
    clearFrame(context, canvasWidth, canvasHeight);
    drawBackground(context, backgroundImage, canvasWidth, canvasHeight);

    drawLines(context, preparedLines);
    drawObjects(context, objects, preparedLines, frameIndex, totalFrames);
    timings.drawMs += performance.now() - frameStartedAt;

    const frame = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const frameBuffer = Buffer.from(normalizeFrameData(frame.data));

    if (lastFrameBuffer === null) {
      lastFrameBuffer = frameBuffer;
      continue;
    }

    // Simple byte comparison for duplicate frames (much faster than SHA1)
    if (frameBuffer.equals(lastFrameBuffer)) {
      pendingDelay += delayMs;
      timings.skippedFrames += 1;
      continue;
    }

    const enqueueStartedAt = performance.now();
    encoder.setDelay(pendingDelay);
    addFrameToEncoder(encoder, lastFrameBuffer);
    timings.enqueueMs += performance.now() - enqueueStartedAt;
    timings.encodedFrames += 1;

    pendingDelay = delayMs;
    lastFrameBuffer = frameBuffer;
  }

  if (lastFrameBuffer) {
    const enqueueStartedAt = performance.now();
    encoder.setDelay(pendingDelay);
    addFrameToEncoder(encoder, lastFrameBuffer);
    timings.enqueueMs += performance.now() - enqueueStartedAt;
    timings.encodedFrames += 1;
  }

  const finalizeStartedAt = performance.now();
  encoder.finish();
  const buffer = await completion;
  timings.finalizeMs = performance.now() - finalizeStartedAt;

  return { buffer, metrics: timings };
}

function prepareRenderLines(lines: RenderLineInput[]): PreparedRenderLine[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }

  return lines.map((line) => {
    const strokeWidth = Math.max(MIN_LINE_WIDTH, line.strokeWidth ?? MIN_LINE_WIDTH);
    const approxLength = approximateRenderLineLength(line);
    const arrowDimensions =
      line.endCap === 'arrow' ? computeArrowHeadDimensions(strokeWidth, approxLength) : null;
    const tangent = evaluateLineTangent(line, 1);
    const tangentMagnitude = Math.hypot(tangent.dx, tangent.dy);
    const endPoint = evaluateLinePoint(line, 1);

    return {
      original: line,
      strokeWidth,
      hasControl: hasControlPoint(line),
      arrowDimensions,
      endPoint,
      tangent,
      tangentMagnitude,
    };
  });
}

function getCachedBackground(loadImage: LoadImageFn, source: string) {
  const cacheKey = computeBackgroundCacheKey(source);
  const cached = backgroundCache.get(cacheKey);
  if (cached && cached.source === source) {
    cached.lastUsed = Date.now();
    return cached.image;
  }

  return loadImage(source).then((image) => {
    backgroundCache.set(cacheKey, { source, image, lastUsed: Date.now() });
    pruneCache(backgroundCache, BACKGROUND_CACHE_LIMIT);
    return image;
  });
}

function getPreparedRenderLines(lines: RenderLineInput[]): PreparedRenderLine[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }

  const cacheKey = computeLinesCacheKey(lines);
  const cached = preparedLinesCache.get(cacheKey);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.prepared;
  }

  const prepared = prepareRenderLines(lines);
  preparedLinesCache.set(cacheKey, { prepared, lastUsed: Date.now() });
  pruneCache(preparedLinesCache, PREPARED_LINES_CACHE_LIMIT);
  return prepared;
}

function computeBackgroundCacheKey(source: string) {
  return createHash('sha1').update(source).digest('hex');
}

function computeLinesCacheKey(lines: RenderLineInput[]) {
  const hash = createHash('sha1');
  hash.update(String(lines.length));
  lines.forEach((line) => {
    hash.update(
      [
        line.x1,
        line.y1,
        line.x2,
        line.y2,
        line.controlX ?? '',
        line.controlY ?? '',
        line.strokeColor ?? '',
        line.strokeWidth ?? '',
        line.endCap ?? '',
      ].join('|'),
    );
  });
  return hash.digest('hex');
}

function pruneCache<K, V extends { lastUsed: number }>(cache: Map<K, V>, limit: number) {
  if (cache.size <= limit) {
    return;
  }

  const entries = [...cache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  while (cache.size > limit && entries.length > 0) {
    const [key] = entries.shift()!;
    cache.delete(key);
  }
}

function loadCanvasBindings() {
  try {
    return getCanvasModule();
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? `Unable to initialize canvas bindings: ${error.message}`
        : 'Unable to initialize canvas bindings.';

    if (error instanceof Error) {
      const enhancedError = new Error(message);
      (enhancedError as Error & { cause?: unknown }).cause = error;
      throw enhancedError;
    }

    throw new Error(message);
  }
}

function createGifEncoder(
  width: number,
  height: number,
  delayMs: number,
) {
  const encoder = new GIFEncoder(width, height);
  const chunks: Buffer[] = [];
  let resolveCompletion: ((buffer: Buffer) => void) | null = null;
  let rejectCompletion: ((error: unknown) => void) | null = null;

  const completion = new Promise<Buffer>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });

  const stream = encoder.createReadStream();
  stream.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  stream.once('error', (error) => {
    if (rejectCompletion) {
      rejectCompletion(error);
      rejectCompletion = null;
      resolveCompletion = null;
    }
  });
  stream.once('end', () => {
    if (resolveCompletion) {
      resolveCompletion(Buffer.concat(chunks));
      resolveCompletion = null;
      rejectCompletion = null;
    }
  });

  encoder.setRepeat(0);
  encoder.setDelay(delayMs);
  configureEncoderForFastRender(encoder);
  encoder.start();

  return { encoder, completion };
}

function clearFrame(context: Canvas2DContext, width: number, height: number) {
  if (typeof (context as { clearRect?: unknown }).clearRect === 'function') {
    (context as { clearRect: (x: number, y: number, w: number, h: number) => void }).clearRect(0, 0, width, height);
    return;
  }

  const bitmap = (context as { bitmap?: { data?: { fill?: (...args: number[]) => unknown } } }).bitmap;
  const data = bitmap?.data;
  if (data && typeof data.fill === 'function') {
    data.fill(0);
  }
}

function drawBackground(
  context: Canvas2DContext,
  image: { width: number; height: number },
  width: number,
  height: number,
) {
  if (typeof (context as { drawImage?: unknown }).drawImage !== 'function') {
    return;
  }

  const drawImage = (context as {
    drawImage: (img: unknown, dx: number, dy: number, dw?: number, dh?: number) => void;
  }).drawImage;

  if (drawImage.length >= 5) {
    drawImage.call(context, image, 0, 0, width, height);
  } else {
    drawImage.call(context, image, 0, 0);
  }
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

function drawLines(context: Canvas2DContext, lines: PreparedRenderLine[]) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return;
  }

  lines.forEach((lineInfo) => {
    const line = lineInfo.original;
    const arrowDimensions = lineInfo.arrowDimensions;

    context.save();
    context.beginPath();

    if (line.points && line.points.length > 0) {
      line.points.forEach((p, i) => {
        if (i === 0) {
          context.moveTo(p.x, p.y);
        } else {
          if (p.controlX != null && p.controlY != null) {
            strokeQuadraticCurve(
              context as unknown as QuadraticContext,
              line.points![i - 1].x,
              line.points![i - 1].y,
              p.controlX,
              p.controlY,
              p.x,
              p.y
            );
          } else {
            context.lineTo(p.x, p.y);
          }
        }
      });
    } else {
      context.moveTo(line.x1, line.y1);
      if (lineInfo.hasControl) {
        strokeQuadraticCurve(
          context as unknown as QuadraticContext,
          line.x1,
          line.y1,
          line.controlX!,
          line.controlY!,
          line.x2,
          line.y2,
        );
      } else {
        context.lineTo(line.x2, line.y2);
      }
    }

    context.strokeStyle = line.strokeColor ?? '#FFFFFF';
    context.lineWidth = lineInfo.strokeWidth;
    if ('lineCap' in context) {
      (context as Canvas2DContext & { lineCap: unknown }).lineCap = arrowDimensions ? 'butt' : 'round';
    }
    if ('lineJoin' in context) {
      (context as Canvas2DContext & { lineJoin: unknown }).lineJoin = arrowDimensions ? 'miter' : 'round';
    }
    context.stroke();
    context.restore();
    if (arrowDimensions && lineInfo.tangentMagnitude > 0) {
      const angle = Math.atan2(lineInfo.tangent.dy, lineInfo.tangent.dx);
      drawArrowHead(context, line, lineInfo.endPoint, angle, arrowDimensions);
    }
  });
}

function drawArrowHead(
  context: Canvas2DContext,
  line: RenderLineInput,
  endPoint: { x: number; y: number },
  angle: number,
  dimensions: ArrowHeadDimensions,
) {
  context.save();
  context.translate(endPoint.x, endPoint.y);
  context.rotate(angle);
  context.fillStyle = line.strokeColor ?? '#FFFFFF';
  context.beginPath();
  context.moveTo(0, dimensions.halfWidth);
  context.lineTo(0, -dimensions.halfWidth);
  context.lineTo(dimensions.headLength, 0);
  context.closePath();
  context.fill();
  context.restore();
}

function drawObjects(
  context: Canvas2DContext,
  objects: RenderObjectInput[],
  preparedLines: PreparedRenderLine[],
  frameIndex: number,
  totalFrames: number,
) {
  if (!Array.isArray(objects) || objects.length === 0) {
    return;
  }

  objects.forEach((object) => {
    const lineInfo = preparedLines[object.lineIndex];
    if (!lineInfo) {
      return;
    }

    const line = lineInfo.original;
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
  const baseOffset = typeof object.offset === 'number' ? object.offset : 0;
  const speed = typeof object.speed === 'number' ? object.speed : 1;
  const direction = object.direction === 'backwards' ? -1 : 1;

  const progress = normalizeProgress(baseOffset + direction * speed * (frameIndex / totalFrames));

  const point = evaluateLinePoint(line, progress);
  const tangent = evaluateLineTangent(line, progress);
  const tangentMagnitude = Math.hypot(tangent.dx, tangent.dy);

  if (tangentMagnitude === 0) {
    return null;
  }

  const angle = Math.atan2(tangent.dy, tangent.dx);

  return { x: point.x, y: point.y, angle };
}

function hasControlPoint(line: RenderLineInput): line is RenderLineInput & {
  controlX: number;
  controlY: number;
} {
  return (
    typeof line.controlX === 'number' &&
    Number.isFinite(line.controlX) &&
    typeof line.controlY === 'number' &&
    Number.isFinite(line.controlY)
  );
}

function evaluateLinePoint(line: RenderLineInput, t: number) {
  const clampedT = Math.max(0, Math.min(1, t));

  if (line.points && line.points.length > 0) {
    // Multi-segment path logic
    const totalSegments = line.points.length; // points[0] is start, points[1] is end of first segment if we treat start as separate?
    // Actually, points array usually includes the start point.
    // Let's assume points array is [p0, p1, p2, ...].
    // Segments are (p0, p1), (p1, p2), etc.
    // Total segments = points.length - 1.

    if (line.points.length < 2) return { x: line.points[0].x, y: line.points[0].y };

    const segmentCount = line.points.length - 1;
    const segmentIndex = Math.min(Math.floor(clampedT * segmentCount), segmentCount - 1);
    const segmentT = (clampedT * segmentCount) - segmentIndex;

    const p0 = line.points[segmentIndex];
    const p1 = line.points[segmentIndex + 1];

    if (p1.controlX != null && p1.controlY != null) {
      // Quadratic bezier for this segment
      const oneMinusT = 1 - segmentT;
      const x =
        oneMinusT * oneMinusT * p0.x +
        2 * oneMinusT * segmentT * p1.controlX +
        segmentT * segmentT * p1.x;
      const y =
        oneMinusT * oneMinusT * p0.y +
        2 * oneMinusT * segmentT * p1.controlY +
        segmentT * segmentT * p1.y;
      return { x, y };
    }

    // Linear segment
    return {
      x: p0.x + (p1.x - p0.x) * segmentT,
      y: p0.y + (p1.y - p0.y) * segmentT,
    };
  }

  if (hasControlPoint(line)) {
    const oneMinusT = 1 - clampedT;
    const x =
      oneMinusT * oneMinusT * line.x1 +
      2 * oneMinusT * clampedT * line.controlX +
      clampedT * clampedT * line.x2;
    const y =
      oneMinusT * oneMinusT * line.y1 +
      2 * oneMinusT * clampedT * line.controlY +
      clampedT * clampedT * line.y2;
    return { x, y };
  }

  return {
    x: line.x1 + (line.x2 - line.x1) * clampedT,
    y: line.y1 + (line.y2 - line.y1) * clampedT,
  };
}

function evaluateLineTangent(line: RenderLineInput, t: number) {
  const clampedT = Math.max(0, Math.min(1, t));

  if (line.points && line.points.length > 0) {
    if (line.points.length < 2) return { dx: 0, dy: 0 };

    const segmentCount = line.points.length - 1;
    const segmentIndex = Math.min(Math.floor(clampedT * segmentCount), segmentCount - 1);
    const segmentT = (clampedT * segmentCount) - segmentIndex;

    const p0 = line.points[segmentIndex];
    const p1 = line.points[segmentIndex + 1];

    if (p1.controlX != null && p1.controlY != null) {
      const oneMinusT = 1 - segmentT;
      const dx =
        2 * oneMinusT * (p1.controlX - p0.x) +
        2 * segmentT * (p1.x - p1.controlX);
      const dy =
        2 * oneMinusT * (p1.controlY - p0.y) +
        2 * segmentT * (p1.y - p1.controlY);
      return { dx, dy };
    }

    return {
      dx: p1.x - p0.x,
      dy: p1.y - p0.y,
    };
  }

  if (hasControlPoint(line)) {
    const oneMinusT = 1 - clampedT;
    const dx =
      2 * oneMinusT * (line.controlX - line.x1) + 2 * clampedT * (line.x2 - line.controlX);
    const dy =
      2 * oneMinusT * (line.controlY - line.y1) + 2 * clampedT * (line.y2 - line.controlY);
    return { dx, dy };
  }

  return {
    dx: line.x2 - line.x1,
    dy: line.y2 - line.y1,
  };
}

function approximateRenderLineLength(line: RenderLineInput) {
  if (hasControlPoint(line)) {
    return (
      Math.hypot(line.controlX! - line.x1, line.controlY! - line.y1) +
      Math.hypot(line.x2 - line.controlX!, line.y2 - line.controlY!)
    );
  }

  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

function normalizeProgress(value: number) {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function drawDot(context: Canvas2DContext, size: number) {
  const radius = size / 2;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2, false);
  context.fill();
}

function drawCube(context: Canvas2DContext, size: number) {
  const half = size / 2;
  context.fillRect(-half, -half, size, size);
}

function drawArrow(context: Canvas2DContext, size: number) {
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


function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function getContext2d(canvas: CanvasInstance): Canvas2DContext {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to acquire 2D rendering context.');
  }
  return context as Canvas2DContext;
}

