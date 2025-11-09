// 🛠️ EDIT LOG [Cursor Rule #1]
// 🔍 WHAT WAS WRONG:
// Server-side failures were only printed with raw console.error calls, making it hard to correlate client reports, aggregate occurrences, or surface metadata about the failing payload.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without structured logging, diagnosing intermittent GIF export crashes required reproducing locally because production logs lacked request identifiers and payload context.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Provide a lightweight structured logger that tags each event with an identifier, normalizes unknown errors, and emits JSON-friendly metadata that can be shipped to external monitoring later.
//
// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Unstructured server logging
// 📂 FILE: lib/monitoring/serverLogger.ts
// 🧾 HISTORY: This issue has now occurred 1 time in this project.
//   - #1 on 2025-11-09 [Introduced structured server logging helpers]
// 🚨 Next steps:
// Consider piping logs into a dedicated transport (e.g. Logtail, Datadog) instead of relying on stdout once deployed.

import { randomUUID } from 'node:crypto';

type ServerLogLevel = 'info' | 'warn' | 'error';

type ReportServerErrorOptions = {
  hint?: string;
  context?: Record<string, unknown> | null;
};

type ReportServerErrorResult = {
  errorId: string;
  message: string;
};

export function createServerEventId(prefix: string): string {
  try {
    return `${prefix}_${randomUUID()}`;
  } catch {
    const randomSuffix = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}_${randomSuffix}`;
  }
}

export function logServerMessage(
  level: ServerLogLevel,
  hint: string,
  details: Record<string, unknown> = {},
) {
  const timestamp = new Date().toISOString();
  const payload = {
    timestamp,
    level,
    hint,
    ...normalizeLogDetails(details),
  };

  const log = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;

  log(`[${payload.timestamp}] ${payload.hint}`, payload);
}

export function reportServerError(
  error: unknown,
  options: ReportServerErrorOptions = {},
): ReportServerErrorResult {
  const errorId = createServerEventId('error');
  const hint = options.hint ?? 'server-error';
  const serializedError = serializeUnknownError(error);

  logServerMessage('error', hint, {
    errorId,
    error: serializedError,
    context: normalizeLogDetails(options.context ?? {}),
  });

  return {
    errorId,
    message: serializedError.message ?? 'Unexpected server error.',
  };
}

function serializeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const base: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    for (const key of Object.keys(error)) {
      if (key in base) {
        continue;
      }
      base[key] = (error as Record<string, unknown>)[key];
    }

    if ('cause' in error) {
      base.cause = normalizeCause((error as Error & { cause?: unknown }).cause);
    }

    return base;
  }

  if (typeof error === 'object' && error !== null) {
    return normalizeLogDetails(error as Record<string, unknown>);
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: String(error) };
}

function normalizeLogDetails(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (value instanceof Buffer) {
      normalized[key] = `<Buffer length=${value.length}>`;
      continue;
    }

    if (Array.isArray(value)) {
      normalized[key] = value.map((entry, index) =>
        typeof entry === 'object' && entry !== null
          ? normalizeLogDetails({ [`[${index}]`]: entry })[`[${index}]`]
          : entry,
      );
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      normalized[key] = normalizeLogDetails(value as Record<string, unknown>);
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function normalizeCause(cause: unknown) {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
    };
  }

  if (typeof cause === 'string') {
    return { message: cause };
  }

  return cause;
}

