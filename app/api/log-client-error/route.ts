// 🛠️ EDIT LOG [Cursor Rule #1]
// 🔍 WHAT WAS WRONG:
// Client-side error reports attempted to POST to `/api/log-client-error`, but the route did not exist, so every beacon returned 404 and diagnostics were lost.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without server ingestion, we could not correlate frontend failures with server-side logs, leaving production issues silent.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added a lightweight logging endpoint that accepts the structured payload, tags it with a request ID, and stores the metadata via the shared server logger for future transport.
//
// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Missing error ingestion endpoint
// 📂 FILE: app/api/log-client-error/route.ts
// 🧾 HISTORY: This issue has now occurred 1 time in this project.
//   - #1 on 2025-11-09 [Created logging route]
// 🚨 Next steps:
// Forward these logs to a persistent store (e.g. S3, Sentry) once credentials are available.

import { NextResponse } from 'next/server';

import {
  createServerEventId,
  logServerMessage,
  reportServerError,
} from '@/lib/monitoring/serverLogger';

export const runtime = 'nodejs';

type ClientErrorPayload = {
  error?: unknown;
  context?: Record<string, unknown> | null;
  hint?: string | null;
  url?: string | null;
  userAgent?: string | null;
  timestamp?: number;
};

export async function POST(request: Request) {
  const requestId = createServerEventId('client_error');

  try {
    const body = (await request.json()) as ClientErrorPayload;

    logServerMessage('warn', 'client-error:ingested', {
      requestId,
      hint: body.hint ?? null,
      url: body.url ?? null,
      userAgent: body.userAgent ?? null,
      context: body.context ?? null,
      error: body.error ?? null,
      timestamp: body.timestamp ?? Date.now(),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { errorId, message } = reportServerError(error, {
      hint: 'client-error:ingest-failed',
      context: { requestId },
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
