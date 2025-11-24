'use client';

// 🛠️ EDIT LOG [2025-11-12-A]
// 🔍 WHAT WAS WRONG:
// Download timings only lived in memory and console logs, so we had no historical record of how close exports got to the 3-second target.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without persisted telemetry we cannot compare optimizations across sessions or surface regressions that push downloads past the goal.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Store the latest timing snapshots in localStorage, trim the list to a manageable size, and echo structured summaries to the console for quick inspection.

const STORAGE_KEY = 'render-metrics-history';
const MAX_ENTRIES = 25;

export type DownloadMetricEntry = {
  source: 'page' | 'downloadGIF';
  timestamp?: number;
  sessionId?: string | null;
  filename?: string | null;
  processingMs: number | null;
  transferDurationMs: number | null;
  totalDurationMs: number | null;
  totalBytes: number | null;
  context?: Record<string, unknown>;
};

export function recordDownloadMetric(entry: DownloadMetricEntry) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const payload: Required<DownloadMetricEntry> = {
    source: entry.source,
    timestamp: entry.timestamp ?? Date.now(),
    sessionId: entry.sessionId ?? null,
    filename: entry.filename ?? null,
    processingMs: sanitizeNumber(entry.processingMs),
    transferDurationMs: sanitizeNumber(entry.transferDurationMs),
    totalDurationMs: sanitizeNumber(entry.totalDurationMs),
    totalBytes: sanitizeNumber(entry.totalBytes),
    context: entry.context ?? {},
  };

  try {
    const existing = readHistory();
    existing.push(payload);
    if (existing.length > MAX_ENTRIES) {
      existing.splice(0, existing.length - MAX_ENTRIES);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    console.info('[render-metrics] entry recorded', payload);
  } catch (error) {
    console.warn('[render-metrics] unable to persist metrics', error, payload);
  }
}

export function readHistory(): Required<DownloadMetricEntry>[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Required<DownloadMetricEntry>[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

function sanitizeNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function isValidEntry(entry: unknown): entry is Required<DownloadMetricEntry> {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  const candidate = entry as Required<DownloadMetricEntry>;
  return (
    (candidate.source === 'page' || candidate.source === 'downloadGIF') &&
    typeof candidate.timestamp === 'number' &&
    candidate.timestamp > 0 &&
    'processingMs' in candidate &&
    'transferDurationMs' in candidate &&
    'totalDurationMs' in candidate &&
    'totalBytes' in candidate &&
    typeof candidate.context === 'object'
  );
}


