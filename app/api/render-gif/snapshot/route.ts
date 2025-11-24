// 🛠️ EDIT LOG [2025-11-12-A]
// 🔍 WHAT WAS WRONG:
// Downloads still POSTed the full canvas payload and waited for a fresh render, so pre-rendering on edit provided no benefit.
// 🤔 WHY IT HAD TO BE CHANGED:
// To make downloads instant we need an endpoint that accepts incremental renders, caches the result, and skips re-encoding identical payloads.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added a snapshot route that validates payloads, de-duplicates unchanged revisions with payload hashes, and persists the rendered GIF via the new snapshot store.

import { NextResponse } from 'next/server';
import { performance } from 'node:perf_hooks';

import type { RenderGifPayload } from '@/lib/render/schema';
import type { RenderTimingMetrics } from '@/lib/render/renderMetrics';
import {
  computePayloadHash,
  getSnapshotMeta,
  saveSnapshot,
} from '@/lib/render/snapshotStore';
import {
  createServerEventId,
  logServerMessage,
  reportServerError,
} from '@/lib/monitoring/serverLogger';

import { renderGif, validatePayload } from '../route';

type SnapshotRequestBody = {
  sessionId: unknown;
  revision: unknown;
  payload: unknown;
};

type SnapshotResponseBody =
  | {
      status: 'stored';
      revision: number;
      payloadHash: string;
      metrics: RenderTimingMetrics;
      processingMs: number;
      contentLength: number;
      updatedAt: string;
    }
  | {
      status: 'unchanged';
      revision: number;
      payloadHash: string;
      metrics: RenderTimingMetrics;
      processingMs: number;
      contentLength: number;
      updatedAt: string;
    }
  | {
      status: 'stale';
      revision: number;
      payloadHash: string;
    };

export async function POST(request: Request) {
  const requestId = createServerEventId('render_gif_snapshot');
  const startedAt = performance.now();

  try {
    const body = (await request.json()) as SnapshotRequestBody;
    const sessionId = sanitizeSessionId(body.sessionId);
    const revision = sanitizeRevision(body.revision);
    const payload = sanitizePayload(body.payload);

    validatePayload(payload);

    const payloadHash = computePayloadHash(payload);
    const cached = getSnapshotMeta(sessionId);

    if (cached && cached.payloadHash === payloadHash && cached.revision >= revision) {
      return NextResponse.json<SnapshotResponseBody>({
        status: 'unchanged',
        revision: cached.revision,
        payloadHash: cached.payloadHash,
        metrics: cached.metrics,
        processingMs: cached.processingMs,
        contentLength: cached.contentLength,
        updatedAt: new Date(cached.updatedAt).toISOString(),
      });
    }

    if (cached && cached.revision >= revision) {
      return NextResponse.json<SnapshotResponseBody>(
        {
          status: 'stale',
          revision: cached.revision,
          payloadHash: cached.payloadHash,
        },
        { status: 409 },
      );
    }

    const { buffer, metrics } = await renderGif(payload);
    const processingMs = calculateProcessingMs(metrics);
    const meta = await saveSnapshot({
      sessionId,
      revision,
      payloadHash,
      buffer,
      metrics,
      processingMs,
    });

    logServerMessage('info', 'render-gif:snapshot-stored', {
      requestId,
      sessionId,
      revision: meta.revision,
      payloadHash: meta.payloadHash,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      metrics: {
        ...formatMetrics(metrics),
        processingMs: Number(processingMs.toFixed(2)),
      },
    });

    return NextResponse.json<SnapshotResponseBody>({
      status: 'stored',
      revision: meta.revision,
      payloadHash: meta.payloadHash,
      metrics: meta.metrics,
      processingMs: meta.processingMs,
      contentLength: meta.contentLength,
      updatedAt: new Date(meta.updatedAt).toISOString(),
    });
  } catch (error) {
    const { errorId, message } = reportServerError(error, {
      hint: 'render-gif:snapshot-failure',
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

function sanitizeSessionId(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Snapshot requests must include a sessionId string.');
  }
  return value.trim();
}

function sanitizeRevision(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Snapshot requests must include a positive numeric revision.');
  }
  return Math.floor(parsed);
}

function sanitizePayload(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('Snapshot requests must include a render payload.');
  }
  return value as RenderGifPayload;
}

function calculateProcessingMs(metrics: RenderTimingMetrics) {
  return metrics.decodeMs + metrics.drawMs + metrics.enqueueMs + metrics.finalizeMs;
}

function formatMetrics(metrics: RenderTimingMetrics) {
  return {
    decodeMs: Number(metrics.decodeMs.toFixed(2)),
    drawMs: Number(metrics.drawMs.toFixed(2)),
    enqueueMs: Number(metrics.enqueueMs.toFixed(2)),
    finalizeMs: Number(metrics.finalizeMs.toFixed(2)),
    totalFrames: metrics.totalFrames,
    skippedFrames: metrics.skippedFrames,
    encodedFrames: metrics.encodedFrames,
  };
}


