// 🛠️ EDIT LOG [2025-11-12-B]
// 🔍 WHAT WAS WRONG:
// Snapshot fetches kept running to completion even after new revisions arrived, so the client waited on stale responses instead of jumping to the latest render.
// 🤔 WHY IT HAD TO BE CHANGED:
// Allowing aborted requests to propagate lets the UI cancel wasted work and start encoding the freshest payload immediately.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Accept an AbortSignal in the helper and pass it through to fetch so callers can stop in-flight requests without duplicating request code.

// 🛠️ EDIT LOG [2025-11-12-A]
// 🔍 WHAT WAS WRONG:
// The client only knew how to fire on-demand renders, so the auto-render loop had no way to push updated payloads to the backend snapshot cache.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a dedicated helper the page would duplicate fetch logic and struggle to interpret snapshot responses (stored, unchanged, stale) cleanly.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Wrapped the snapshot API call in a typed helper that normalises responses and surfaces metrics so the UI can reuse background render timings.

import type { RenderGifPayload } from '@/lib/render/schema';
import type { RenderTimingMetrics } from '@/lib/render/renderMetrics';

export type SnapshotStatus = 'stored' | 'unchanged' | 'stale';

export type PrepareSnapshotResponse = {
  status: SnapshotStatus;
  revision: number;
  payloadHash: string;
  metrics?: RenderTimingMetrics;
  processingMs?: number;
  contentLength?: number;
  updatedAt?: string;
};

export type PrepareSnapshotOptions = {
  sessionId: string;
  revision: number;
  payload: RenderGifPayload;
  signal?: AbortSignal;
};

export async function prepareRenderSnapshot({
  sessionId,
  revision,
  payload,
  signal,
}: PrepareSnapshotOptions): Promise<PrepareSnapshotResponse> {
  const response = await fetch('/api/render-gif/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      sessionId,
      revision,
      payload,
    }),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    const error = new Error(message || 'Failed to prepare render snapshot.');
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const body = (await response.json()) as PrepareSnapshotResponse;
  return body;
}

async function extractErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (data && typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    // ignore parse failures
  }
  return response.statusText;
}


