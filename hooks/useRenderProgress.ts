import { useCallback, useEffect, useRef, useState } from 'react';

export type RenderProgressMode = 'idle' | 'processing' | 'transfer' | 'completed';

export type RenderMetrics = {
    totalMs: number | null;
    processingMs: number | null;
    transferMs: number | null;
};

export function useRenderProgress() {
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderEtaSeconds, setRenderEtaSeconds] = useState<number | null>(null);
    const renderProgressTimerRef = useRef<number | null>(null);
    const renderProgressSettledTimeoutRef = useRef<number | null>(null);
    const renderProgressStartRef = useRef<number>(0);
    const lastRenderDurationRef = useRef<number>(4000);
    const renderProgressEstimateRef = useRef<number>(4000);
    const renderProgressModeRef = useRef<RenderProgressMode>('idle');
    const transferBaseProgressRef = useRef<number>(0);
    const transferTotalBytesRef = useRef<number | null>(null);
    const transferStartedAtRef = useRef<number | null>(null);
    const lastTransferDurationRef = useRef<number>(1200);
    const currentProcessingMsRef = useRef<number | null>(null);

    const clearRenderProgressTimeout = useCallback(() => {
        if (renderProgressSettledTimeoutRef.current !== null) {
            window.clearTimeout(renderProgressSettledTimeoutRef.current);
            renderProgressSettledTimeoutRef.current = null;
        }
    }, []);

    const stopRenderProgressInterval = useCallback(() => {
        if (renderProgressTimerRef.current !== null) {
            window.clearInterval(renderProgressTimerRef.current);
            renderProgressTimerRef.current = null;
        }
    }, []);

    const startRenderProgress = useCallback(
        (estimatedMs: number) => {
            const fallbackMs = Number.isFinite(estimatedMs) && estimatedMs > 0 ? estimatedMs : 4000;
            const clampedEstimate = Math.min(Math.max(fallbackMs, 600), 60000);

            clearRenderProgressTimeout();
            stopRenderProgressInterval();

            renderProgressModeRef.current = 'processing';
            renderProgressEstimateRef.current = clampedEstimate;
            transferBaseProgressRef.current = 0;
            transferTotalBytesRef.current = null;
            transferStartedAtRef.current = null;
            currentProcessingMsRef.current = null;

            renderProgressStartRef.current = performance.now();
            setRenderProgress(0.05);
            setRenderEtaSeconds(Math.round((clampedEstimate / 1000) * 10) / 10);

            renderProgressTimerRef.current = window.setInterval(() => {
                const elapsed = performance.now() - renderProgressStartRef.current;
                let estimatedTotal = renderProgressEstimateRef.current;

                if (elapsed > estimatedTotal * 0.98) {
                    estimatedTotal = Math.min(60000, Math.max(elapsed / 0.98, estimatedTotal));
                    renderProgressEstimateRef.current = estimatedTotal;
                }

                const predicted = estimatedTotal > 0 ? elapsed / estimatedTotal : 0;
                const capped = Math.min(0.98, Math.max(0.05, predicted));

                setRenderProgress((previous) => (capped > previous ? capped : previous));

                const remainingMs = Math.max(0, renderProgressEstimateRef.current - elapsed);
                setRenderEtaSeconds(
                    remainingMs > 80 ? Math.round((remainingMs / 1000) * 10) / 10 : 0,
                );
            }, 120);
        },
        [clearRenderProgressTimeout, stopRenderProgressInterval],
    );

    const concludeRenderProgress = useCallback(
        (metrics: RenderMetrics) => {
            clearRenderProgressTimeout();
            stopRenderProgressInterval();

            renderProgressModeRef.current = 'completed';
            transferStartedAtRef.current = null;
            transferTotalBytesRef.current = null;

            const totalMs = metrics.totalMs;
            const processingMs = metrics.processingMs;
            const transferMs = metrics.transferMs;

            if (Number.isFinite(totalMs) && totalMs !== null) {
                const sanitizedTotal = Math.min(Math.max(totalMs, 400), 60000);
                lastRenderDurationRef.current = Math.min(
                    60000,
                    lastRenderDurationRef.current * 0.4 + sanitizedTotal * 0.6,
                );
            } else if (Number.isFinite(processingMs) && processingMs !== null) {
                const sanitizedProcessing = Math.min(Math.max(processingMs, 400), 60000);
                lastRenderDurationRef.current = Math.min(
                    60000,
                    lastRenderDurationRef.current * 0.4 + sanitizedProcessing * 0.6,
                );
            }

            if (Number.isFinite(transferMs) && transferMs !== null) {
                lastTransferDurationRef.current = Math.min(
                    60000,
                    lastTransferDurationRef.current * 0.4 + transferMs * 0.6,
                );
            }

            setRenderProgress(1);
            setRenderEtaSeconds(0);

            renderProgressSettledTimeoutRef.current = window.setTimeout(() => {
                renderProgressModeRef.current = 'idle';
                setRenderProgress(0);
                setRenderEtaSeconds(null);
                renderProgressSettledTimeoutRef.current = null;
            }, 480);
        },
        [clearRenderProgressTimeout, stopRenderProgressInterval],
    );

    const beginTransferProgress = useCallback(
        (maybeTotalBytes: number | null) => {
            if (renderProgressModeRef.current === 'transfer') {
                if (
                    maybeTotalBytes &&
                    maybeTotalBytes > 0 &&
                    (!transferTotalBytesRef.current || transferTotalBytesRef.current <= 0)
                ) {
                    transferTotalBytesRef.current = maybeTotalBytes;
                }
                return transferBaseProgressRef.current;
            }

            renderProgressModeRef.current = 'transfer';
            transferTotalBytesRef.current = maybeTotalBytes ?? null;
            transferStartedAtRef.current = performance.now();
            stopRenderProgressInterval();

            const baseProgress = Math.min(0.95, Math.max(renderProgress, 0.12));
            transferBaseProgressRef.current = baseProgress;

            setRenderProgress((previous) => (previous < baseProgress ? baseProgress : previous));
            setRenderEtaSeconds(null);

            return baseProgress;
        },
        [renderProgress, stopRenderProgressInterval],
    );

    useEffect(() => {
        return () => {
            stopRenderProgressInterval();
            clearRenderProgressTimeout();
            renderProgressModeRef.current = 'idle';
        };
    }, [stopRenderProgressInterval, clearRenderProgressTimeout]);

    return {
        renderProgress,
        setRenderProgress,
        renderEtaSeconds,
        setRenderEtaSeconds,
        startRenderProgress,
        concludeRenderProgress,
        beginTransferProgress,
        renderProgressStartRef,
        renderProgressEstimateRef,
        lastRenderDurationRef,
        lastTransferDurationRef,
        currentProcessingMsRef,
        transferTotalBytesRef,
        renderProgressModeRef,
    };
}
