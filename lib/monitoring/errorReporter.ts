'use client';

type ReportClientErrorOptions = {
  context?: Record<string, unknown>;
  hint?: string;
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') {
    return { message: String(error) };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unable to serialize error payload' };
  }
}

export async function reportClientError(error: unknown, options: ReportClientErrorOptions = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    error: serializeError(error),
    context: options.context ?? null,
    hint: options.hint ?? null,
    url: window.location?.href ?? null,
    userAgent: window.navigator?.userAgent ?? null,
    timestamp: Date.now(),
  };

  try {
    if (typeof window.navigator?.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const didSend = window.navigator.sendBeacon('/api/log-client-error', blob);
      if (didSend) return;
    }

    await fetch('/api/log-client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (networkError) {
    console.warn('Unable to report client error', networkError, payload);
  }
}

export function bindGlobalErrorListeners() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleError = (event: ErrorEvent) => {
    reportClientError(event.error ?? event.message, {
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'window.error',
      },
    });
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    reportClientError(event.reason, {
      context: {
        type: 'unhandledrejection',
      },
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}


