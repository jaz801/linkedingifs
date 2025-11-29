import type { RenderGifPayload } from '@/lib/render/schema';
import { recordDownloadMetric } from '@/lib/monitoring/renderMetricsClient';

// 🛠️ EDIT LOG [2025-11-12-C]
// 🔍 WHAT WAS WRONG:
// Download timings from the snapshot and direct flows only surfaced via console logs, so we could not compare processing vs transfer durations across sessions.
// 🤔 WHY IT HAD TO BE CHANGED:
// To hit the 3-second target we need structured telemetry that records which strategy ran and how long each phase took.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Capture the totals inside the shared response consumer and persist them through the render metrics helper, adding the strategy and payload hints for later analysis.
// 🛠️ EDIT LOG [2025-11-12-B]
// 🔍 WHAT WAS WRONG:
// Snapshot downloads failed outright when the cache missed, forcing a manual retry even though the POST route still worked.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a graceful fallback, the new background renderer felt broken whenever users clicked before the cache finished.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Attempt the cached GET first and reuse the streaming logic for a POST fallback so downloads always complete while keeping accurate progress updates.

// 🛠️ EDIT LOG [2025-11-12-A]
// 🔍 WHAT WAS WRONG:
// The downloader still POSTed the entire render payload and waited for the backend to encode on demand, so the new snapshot cache provided no benefit.
// 🤔 WHY IT HAD TO BE CHANGED:
// With auto-rendering in place we need to stream the cached GIF directly by session ID, keeping the progress bar while skipping redundant work.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Switched the helper to GET the prepared snapshot, reusing the streaming progress logic and exposing cached timing headers for the UI.
// 🛠️ EDIT LOG [2025-11-11-J]
// 🔍 WHAT WAS WRONG:
// TypeScript blocked the build because streaming chunks inferred as Uint8Array<ArrayBufferLike> were not accepted as BlobParts.
// 🤔 WHY IT HAD TO BE CHANGED:
// The mismatch surfaced during Next.js builds, so exports could not ship even though the runtime behaviour still worked locally.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Normalize each streamed chunk to a plain ArrayBuffer before building the Blob so the DOM typings match what Blob expects.
// 🛠️ EDIT LOG [2025-11-11-I]
// 🔍 WHAT WAS WRONG:
// Progress updates stopped once the server finished encoding, so the loading bar hit 100% while the GIF was still streaming to the browser.
// 🤔 WHY IT HAD TO BE CHANGED:
// Users still waited several seconds after “wrapping up,” making the determinate progress bar feel dishonest and forcing guesswork about when the file would actually download.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Stream the response body, surface per-chunk download progress, and expose callbacks plus total timings so the UI can keep advancing the bar right up until the file saves.
// 🛠️ EDIT LOG [2025-11-11-H]
// 🔍 WHAT WAS WRONG:
// The client kicked off GIF renders blind, so progress UI stalled with an indeterminate bar and we never learned how long exports actually took.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without feeding real timings back into the UI we could not surface an accurate ETA, leaving users unsure whether to wait or retry the download.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Capture round-trip duration and read the server’s processing header so callers can update their progress estimator with real-world numbers.
// 🛠️ EDIT LOG [2025-11-11-G]
// 🔍 WHAT WAS WRONG:
// Render requests finished silently, so QA could not confirm when the server succeeded or why it failed without digging through network panels.
// 🤔 WHY IT HAD TO BE CHANGED:
// When the render server is under load, support needs immediate console signal to differentiate “in-flight” renders from API failures.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added structured console logging around the render call so successes and failures surface directly in the browser without altering telemetry flows.

type RenderGifError = Error & {
  status?: number;
  errorId?: string;
  requestId?: string;
  cause?: unknown;
};

type DownloadGifBaseOptions = {
  filename?: string;
  onProgress?: (update: DownloadGifProgressUpdate) => void;
};

type DownloadGifFromSnapshotOptions = DownloadGifBaseOptions & {
  sessionId: string;
};

type DownloadGifOnDemandOptions = DownloadGifBaseOptions & {
  payload: RenderGifPayload;
};

export type DownloadGifProgressUpdate =
  | {
    phase: 'processing-complete';
    processingMs: number | null;
    elapsedMs: number;
  }
  | {
    phase: 'transfer';
    transferredBytes: number;
    totalBytes: number | null;
    elapsedMs: number;
  }
  | {
    phase: 'complete';
    processingMs: number | null;
    transferDurationMs: number | null;
    totalBytes: number | null;
    totalDurationMs: number;
  };

export type DownloadGifResult = {
  processingMs: number | null;
  responseDurationMs: number;
  blobSize: number;
  transferDurationMs: number | null;
  totalBytes: number | null;
  totalDurationMs: number;
};

export async function downloadGifFromSnapshot({
  sessionId,
  filename,
  onProgress,
}: DownloadGifFromSnapshotOptions): Promise<DownloadGifResult> {
  const requestStartedAt = performance.now();

  console.info('[render-gif] Fetching prepared GIF', { sessionId });

  const response = await fetch(`/api/render-gif?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw await buildRenderGifError(response, 'snapshot');
  }

  return consumeGifResponse(response, {
    filename,
    onProgress,
    requestStartedAt,
    strategy: 'snapshot',
    sessionId,
    context: {
      headers: pickTimingHeaders(response.headers),
    },
  });
}

export async function downloadGifOnDemand({
  payload,
  filename,
  onProgress,
}: DownloadGifOnDemandOptions): Promise<DownloadGifResult> {
  const requestStartedAt = performance.now();

  console.info('[render-gif] Rendering GIF on demand');

  const response = await fetch('/api/render-gif', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildRenderGifError(response, 'direct');
  }

  return consumeGifResponse(response, {
    filename,
    onProgress,
    requestStartedAt,
    strategy: 'direct',
    sessionId: null,
    context: {
      headers: pickTimingHeaders(response.headers),
      lineCount: Array.isArray(payload.lines) ? payload.lines.length : null,
      objectCount: Array.isArray(payload.objects) ? payload.objects.length : null,
      width: payload.width,
      height: payload.height,
    },
  });
}

type ConsumeGifResponseOptions = {
  filename?: string;
  onProgress?: (update: DownloadGifProgressUpdate) => void;
  requestStartedAt: number;
  strategy: 'snapshot' | 'direct';
  sessionId?: string | null;
  context?: Record<string, unknown>;
};

async function consumeGifResponse(
  response: Response,
  { filename, onProgress, requestStartedAt, strategy, sessionId, context }: ConsumeGifResponseOptions,
): Promise<DownloadGifResult> {
  const rawProcessingMs = response.headers.get('X-Render-Processing-Ms');
  const parsedProcessingMs =
    typeof rawProcessingMs === 'string' && rawProcessingMs.trim().length > 0
      ? Number.parseFloat(rawProcessingMs)
      : Number.NaN;
  const processingElapsedMs = performance.now() - requestStartedAt;
  const processingMs = Number.isFinite(parsedProcessingMs) ? parsedProcessingMs : processingElapsedMs;
  const contentLengthHeader = response.headers.get('Content-Length');
  const parsedTotalBytes =
    contentLengthHeader && contentLengthHeader.trim().length > 0
      ? Number.parseInt(contentLengthHeader, 10)
      : Number.NaN;
  const totalBytes = Number.isFinite(parsedTotalBytes) && parsedTotalBytes > 0 ? parsedTotalBytes : null;

  if (onProgress) {
    onProgress({
      phase: 'processing-complete',
      processingMs: Number.isFinite(parsedProcessingMs) ? parsedProcessingMs : null,
      elapsedMs: processingElapsedMs,
    });
  }

  let blob: Blob;
  let transferDurationMs: number | null = null;
  let transferredBytes = 0;

  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const blobParts: BlobPart[] = [];
    const transferStartedAt = performance.now();

    if (onProgress) {
      onProgress({
        phase: 'transfer',
        transferredBytes,
        totalBytes,
        elapsedMs: 0,
      });
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        blobParts.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
        transferredBytes += value.byteLength;
        const elapsed = performance.now() - transferStartedAt;
        if (onProgress) {
          onProgress({
            phase: 'transfer',
            transferredBytes,
            totalBytes,
            elapsedMs: elapsed,
          });
        }
      }
    }

    transferDurationMs = performance.now() - transferStartedAt;
    blob = new Blob(blobParts, { type: 'image/gif' });
  } else {
    const transferStartedAt = performance.now();
    blob = await response.blob();
    transferDurationMs = performance.now() - transferStartedAt;
    transferredBytes = blob.size;
    if (onProgress) {
      onProgress({
        phase: 'transfer',
        transferredBytes,
        totalBytes: blob.size,
        elapsedMs: transferDurationMs,
      });
    }
  }

  const totalDurationMs = performance.now() - requestStartedAt;
  const resolvedTotalBytes = totalBytes ?? blob.size;

  recordDownloadMetric({
    source: 'downloadGIF',
    sessionId: sessionId ?? null,
    filename: filename?.trim().length ? filename.trim() : 'animation.gif',
    processingMs: Number.isFinite(parsedProcessingMs) ? parsedProcessingMs : null,
    transferDurationMs,
    totalDurationMs,
    totalBytes: resolvedTotalBytes,
    context: {
      strategy,
      blobSize: blob.size,
      headers: pickTimingHeaders(response.headers),
      ...context,
    },
  });

  if (onProgress) {
    onProgress({
      phase: 'complete',
      processingMs: Number.isFinite(parsedProcessingMs) ? parsedProcessingMs : null,
      transferDurationMs,
      totalBytes: resolvedTotalBytes,
      totalDurationMs,
    });
  }

  const url = URL.createObjectURL(blob);
  const resolvedFilename = filename?.trim().length ? filename.trim() : 'animation.gif';

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = resolvedFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    console.info('[render-gif] Render completed', {
      strategy,
      status: response.status,
      filename: resolvedFilename,
      blobSize: blob.size,
      processingMs: Number.isFinite(parsedProcessingMs) ? parsedProcessingMs : null,
      transferDurationMs,
      totalDurationMs,
    });
  } finally {
    // Delay revocation to ensure the browser has time to handle the download
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  return {
    processingMs: Number.isFinite(processingMs) ? processingMs : null,
    responseDurationMs: totalDurationMs,
    blobSize: blob.size,
    transferDurationMs,
    totalBytes: resolvedTotalBytes,
    totalDurationMs,
  };
}

async function buildRenderGifError(
  response: Response,
  strategy: 'snapshot' | 'direct',
): Promise<RenderGifError> {
  let message =
    strategy === 'snapshot' ? 'Failed to fetch cached GIF.' : 'Failed to render GIF.';
  let errorId: string | undefined;
  let requestId: string | undefined;
  let cause: unknown | undefined;

  try {
    const errorBody = await response.json();
    cause = errorBody;
    if (typeof errorBody?.message === 'string') {
      message = errorBody.message;
    }
    if (typeof errorBody?.errorId === 'string') {
      errorId = errorBody.errorId;
    }
    if (typeof errorBody?.requestId === 'string') {
      requestId = errorBody.requestId;
    }
  } catch {
    // ignore parsing failure and bubble generic message
  }

  const error = new Error(message) as RenderGifError;
  error.name = 'RenderGifError';
  error.status = response.status;
  if (errorId) {
    error.errorId = errorId;
  }
  if (requestId) {
    error.requestId = requestId;
  }
  if (cause !== undefined) {
    error.cause = cause;
  }

  console.error('[render-gif] Render failed', {
    strategy,
    status: response.status,
    message: error.message,
    errorId,
    requestId,
  });

  return error;
}

function pickTimingHeaders(headers: Headers) {
  const processing = headers.get('X-Render-Processing-Ms');
  const revision = headers.get('X-Render-Revision');
  const updatedAt = headers.get('X-Render-Updated-At');
  const encodedFrames = headers.get('X-Render-Encoded-Frames');

  return {
    processingMs: processing ? Number.parseFloat(processing) : null,
    revision: revision ? Number.parseInt(revision, 10) : null,
    updatedAt: updatedAt ?? null,
    encodedFrames: encodedFrames ? Number.parseInt(encodedFrames, 10) : null,
  };
}

