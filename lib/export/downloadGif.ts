import type { RenderGifPayload } from '@/lib/render/schema';

type RenderGifError = Error & {
  status?: number;
  errorId?: string;
  requestId?: string;
  cause?: unknown;
};

type DownloadGifOptions = {
  filename?: string;
};

export async function downloadGIF(animationData: RenderGifPayload, options: DownloadGifOptions = {}) {
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

    throw error;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const filename = options.filename?.trim().length ? options.filename.trim() : 'animation.gif';

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
}

