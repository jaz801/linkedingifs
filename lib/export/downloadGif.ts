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

import type { RenderGifPayload } from '@/lib/render/schema';

type RenderGifError = Error & {
  status?: number;
  errorId?: string;
  requestId?: string;
  cause?: unknown;
};

type DownloadGifOptions = {
  filename?: string;
  onProgress?: (update: DownloadGifProgressUpdate) => void;
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

export async function downloadGIF(
  animationData: RenderGifPayload,
  options: DownloadGifOptions = {},
): Promise<{
  processingMs: number | null;
  responseDurationMs: number;
  blobSize: number;
  transferDurationMs: number | null;
  totalBytes: number | null;
  totalDurationMs: number;
}> {
  const requestStartedAt = performance.now();

  console.info('[render-gif] Requesting GIF render', {
    width: animationData.width,
    height: animationData.height,
    lineCount: animationData.lines.length,
    objectCount: animationData.objects.length,
  });

  const response = await fetch('/api/render-gif', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(animationData),
  });

  if (!response.ok) {
    let message = 'Failed to render GIF.';
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
    error.errorId = errorId;
    if (requestId) {
      error.requestId = requestId;
    }
    if (cause !== undefined) {
      error.cause = cause;
    }

    console.error('[render-gif] Render failed', {
      status: response.status,
      message: error.message,
      errorId,
      requestId,
    });

    throw error;
  }

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

  if (options.onProgress) {
    options.onProgress({
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

    if (options.onProgress) {
      options.onProgress({
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
        if (options.onProgress) {
          options.onProgress({
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
    if (options.onProgress) {
      options.onProgress({
        phase: 'transfer',
        transferredBytes,
        totalBytes: blob.size,
        elapsedMs: transferDurationMs,
      });
    }
  }

  const totalDurationMs = performance.now() - requestStartedAt;
  const resolvedTotalBytes = totalBytes ?? blob.size;

  if (options.onProgress) {
    options.onProgress({
      phase: 'complete',
      processingMs: Number.isFinite(parsedProcessingMs) ? parsedProcessingMs : null,
      transferDurationMs,
      totalBytes: resolvedTotalBytes,
      totalDurationMs,
    });
  }

  const url = URL.createObjectURL(blob);
  const filename = options.filename?.trim().length ? options.filename.trim() : 'animation.gif';

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    console.info('[render-gif] Render completed', {
      status: response.status,
      filename,
      blobSize: blob.size,
      processingMs: Number.isFinite(parsedProcessingMs) ? parsedProcessingMs : null,
      transferDurationMs,
      totalDurationMs,
    });
  } finally {
    URL.revokeObjectURL(url);
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

