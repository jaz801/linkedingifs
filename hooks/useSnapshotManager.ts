import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareRenderSnapshot } from '@/lib/render/prepareSnapshot';
import { reportClientError } from '@/lib/monitoring/errorReporter';
import type { RenderGifPayload } from '@/lib/render/schema';

export type SnapshotState = 'idle' | 'pending' | 'ready';

function isAbortError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const maybeName = (error as { name?: unknown }).name;
    return typeof maybeName === 'string' && maybeName === 'AbortError';
}

function smoothDurationEstimate(previous: number, sample: number) {
    return Math.min(60000, previous * 0.4 + sample * 0.6);
}

export function useSnapshotManager({
    preparedBackground,
    renderSessionId,
    lastRenderDurationRef,
}: {
    preparedBackground: string | null;
    renderSessionId: string;
    lastRenderDurationRef: React.MutableRefObject<number>;
}) {
    const [snapshotState, setSnapshotState] = useState<SnapshotState>('idle');
    const snapshotRevisionRef = useRef(0);
    const lastStoredSnapshotRevisionRef = useRef(0);
    const pendingSnapshotPromiseRef = useRef<Promise<void> | null>(null);
    const pendingSnapshotRevisionRef = useRef<number | null>(null);
    const snapshotAbortControllerRef = useRef<AbortController | null>(null);
    const scheduledSnapshotTimeoutRef = useRef<number | null>(null);
    const latestSnapshotPayloadRef = useRef<RenderGifPayload | null>(null);
    const currentProcessingMsRef = useRef<number | null>(null);

    const evaluateSnapshotState = useCallback(() => {
        if (!preparedBackground) {
            setSnapshotState('idle');
            return;
        }

        const hasPendingTimer = scheduledSnapshotTimeoutRef.current !== null;
        const hasPendingRequest = pendingSnapshotPromiseRef.current !== null;
        const hasStoredLatest =
            snapshotRevisionRef.current > 0 &&
            lastStoredSnapshotRevisionRef.current >= snapshotRevisionRef.current;

        if (hasStoredLatest && !hasPendingTimer && !hasPendingRequest) {
            setSnapshotState('ready');
            return;
        }

        if (hasPendingTimer || hasPendingRequest || snapshotRevisionRef.current > lastStoredSnapshotRevisionRef.current) {
            setSnapshotState('pending');
            return;
        }

        setSnapshotState('idle');
    }, [preparedBackground]);

    const recordSnapshotMetrics = useCallback(
        (processingMs: number | null | undefined) => {
            if (typeof processingMs !== 'number' || !Number.isFinite(processingMs) || processingMs <= 0) {
                return;
            }
            const sanitized = Math.min(Math.max(processingMs, 400), 60000);
            currentProcessingMsRef.current = sanitized;
            lastRenderDurationRef.current = smoothDurationEstimate(lastRenderDurationRef.current, sanitized);
        },
        [lastRenderDurationRef],
    );

    const scheduleSnapshot = useCallback(
        (payload: RenderGifPayload) => {
            latestSnapshotPayloadRef.current = payload;
            const sessionId = renderSessionId;
            const revision = snapshotRevisionRef.current + 1;
            snapshotRevisionRef.current = revision;
            setSnapshotState('pending');

            const previousController = snapshotAbortControllerRef.current;
            if (previousController) {
                previousController.abort();
            }
            const controller = new AbortController();
            snapshotAbortControllerRef.current = controller;

            const promise = (async () => {
                try {
                    const response = await prepareRenderSnapshot({
                        sessionId,
                        revision,
                        payload,
                        signal: controller.signal,
                    });

                    if (response.status === 'stored' || response.status === 'unchanged') {
                        lastStoredSnapshotRevisionRef.current = response.revision;
                        recordSnapshotMetrics(response.processingMs ?? null);
                        if (response.revision >= snapshotRevisionRef.current) {
                            evaluateSnapshotState();
                        }
                    } else if (response.status === 'stale') {
                        lastStoredSnapshotRevisionRef.current = Math.max(
                            lastStoredSnapshotRevisionRef.current,
                            response.revision,
                        );
                    }
                } catch (error) {
                    if (isAbortError(error)) {
                        return;
                    }
                    console.error('Failed to prepare render snapshot', error);
                    reportClientError(error, {
                        hint: 'prepareRenderSnapshot',
                        context: {
                            sessionId,
                            revision,
                        },
                    });
                    setSnapshotState('idle');
                    evaluateSnapshotState();
                } finally {
                    if (snapshotAbortControllerRef.current === controller) {
                        snapshotAbortControllerRef.current = null;
                    }
                }
            })();

            pendingSnapshotRevisionRef.current = revision;
            pendingSnapshotPromiseRef.current = promise.finally(() => {
                if (pendingSnapshotRevisionRef.current === revision) {
                    pendingSnapshotPromiseRef.current = null;
                    pendingSnapshotRevisionRef.current = null;
                }
                evaluateSnapshotState();
            });

            return pendingSnapshotPromiseRef.current;
        },
        [evaluateSnapshotState, recordSnapshotMetrics, renderSessionId],
    );

    const flushPendingSnapshot = useCallback(async () => {
        if (scheduledSnapshotTimeoutRef.current !== null && latestSnapshotPayloadRef.current) {
            const payload = latestSnapshotPayloadRef.current;
            window.clearTimeout(scheduledSnapshotTimeoutRef.current);
            scheduledSnapshotTimeoutRef.current = null;
            const scheduled = scheduleSnapshot(payload);
            if (scheduled) {
                try {
                    await scheduled;
                } catch (error) {
                    if (!isAbortError(error)) {
                        console.error('Snapshot preparation failed', error);
                    }
                }
            }
        }

        if (pendingSnapshotPromiseRef.current) {
            try {
                await pendingSnapshotPromiseRef.current;
            } catch (error) {
                if (!isAbortError(error)) {
                    console.error('Snapshot preparation failed', error);
                }
            }
        }

        if (
            lastStoredSnapshotRevisionRef.current < snapshotRevisionRef.current &&
            latestSnapshotPayloadRef.current
        ) {
            const scheduled = scheduleSnapshot(latestSnapshotPayloadRef.current);
            if (scheduled) {
                try {
                    await scheduled;
                } catch (error) {
                    if (!isAbortError(error)) {
                        console.error('Snapshot preparation failed', error);
                    }
                }
            }
        }
        evaluateSnapshotState();
    }, [evaluateSnapshotState, scheduleSnapshot]);

    const triggerImmediateSnapshot = useCallback(() => {
        const payload = latestSnapshotPayloadRef.current;
        if (!payload) {
            return;
        }

        if (scheduledSnapshotTimeoutRef.current !== null) {
            window.clearTimeout(scheduledSnapshotTimeoutRef.current);
            scheduledSnapshotTimeoutRef.current = null;
        }

        setSnapshotState('pending');
        const scheduled = scheduleSnapshot(payload);
        if (!scheduled) {
            evaluateSnapshotState();
        }
    }, [evaluateSnapshotState, scheduleSnapshot]);

    return {
        snapshotState,
        setSnapshotState,
        scheduleSnapshot,
        flushPendingSnapshot,
        triggerImmediateSnapshot,
        evaluateSnapshotState,
        recordSnapshotMetrics,
        latestSnapshotPayloadRef,
        scheduledSnapshotTimeoutRef,
        snapshotRevisionRef,
        lastStoredSnapshotRevisionRef,
    };
}
