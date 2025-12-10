import { useState, useCallback } from 'react';
import * as Mp4Muxer from 'mp4-muxer';
import type { RenderGifPayload } from '@/lib/render/schema';
import { drawLine } from '@/lib/render/drawLine';
import { drawObjects } from '@/lib/render/drawObjects';
import type { CanvasLikeContext } from '@/lib/render/canvasContext';
import { computeArrowHeadDimensions } from '@/lib/render/arrowGeometry';
import { evaluateLinePoint, evaluateLineTangent } from '@/lib/render/geometry';

type UseMp4ExportOptions = {
    onProgress?: (progress: number) => void;
};

export function useMp4Export() {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const exportMp4 = useCallback(async (
        payload: RenderGifPayload,
        { onProgress }: UseMp4ExportOptions = {}
    ): Promise<Blob> => {
        setIsExporting(true);
        setError(null);

        try {
            const { width, height, fps = 30, duration, lines, objects, background } = payload;

            // Prepare muxer
            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width,
                    height,
                },
                fastStart: 'in-memory',
            });

            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => { throw e; },
            });

            videoEncoder.configure({
                codec: 'avc1.4d002a', // Main Profile, Level 4.2 (Supports 1080p @ 60fps)
                width,
                height,
                bitrate: 4_000_000, // 4 Mbps for better quality
                framerate: fps,
            });

            // Prepare offscreen canvas for rendering
            // We use a regular canvas but don't attach it to DOM
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', {
                willReadFrequently: true,
                alpha: false // MP4 doesn't support alpha usually, and we have a background
            });

            if (!ctx) throw new Error('Could not create canvas context');

            // Load background image
            const bgImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = background;
            });

            // Prepare lines (calculate arrow heads etc once if possible, but drawLine handles it)
            // Actually drawLine expects StaticLine which is slightly different from RenderLineInput
            // We need to map RenderLineInput to what drawLine expects or update drawLine.
            // drawLine takes StaticLine = LinePath & { strokeColor, strokeWidth }
            // RenderLineInput has more fields.
            // Also drawLine handles quadratic curves.

            // We also need to handle Arrow Heads which drawLine might not handle fully 
            // (route.ts handles them separately in drawLines).
            // Let's replicate the drawLines logic from route.ts here or extract it too.
            // For now, I'll implement the draw loop here using the shared helpers.

            const totalFrames = Math.round(duration * fps);
            const frameDurationMicroseconds = 1_000_000 / fps;

            // Pre-calculate line info for object animation
            const preparedLines = lines.map(line => ({ original: line }));

            for (let i = 0; i < totalFrames; i++) {
                // Clear and draw background
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(bgImage, 0, 0, width, height);

                // Draw Lines
                lines.forEach(line => {
                    // Draw the line path
                    drawLine(ctx as unknown as CanvasLikeContext, {
                        x1: line.x1,
                        y1: line.y1,
                        x2: line.x2,
                        y2: line.y2,
                        controlX: line.controlX,
                        controlY: line.controlY,
                        strokeColor: line.strokeColor,
                        strokeWidth: line.strokeWidth,
                        // drawLine doesn't handle 'points' (pen tool) yet? 
                        // Wait, route.ts handles 'points' manually.
                        // We need to handle pen tool points here too.
                    });

                    // Handle Pen Tool Points if present
                    if (line.points && line.points.length > 0) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.strokeStyle = line.strokeColor;
                        ctx.lineWidth = line.strokeWidth;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';

                        line.points.forEach((p, idx) => {
                            if (idx === 0) {
                                ctx.moveTo(p.x, p.y);
                            } else {
                                if (p.controlX != null && p.controlY != null) {
                                    ctx.quadraticCurveTo(p.controlX, p.controlY, p.x, p.y);
                                } else {
                                    ctx.lineTo(p.x, p.y);
                                }
                            }
                        });
                        ctx.stroke();
                        ctx.restore();
                    }

                    // Draw Arrow Head if needed
                    if (line.endCap === 'arrow') {
                        // Calculate arrow position/rotation
                        // For pen tool: last segment
                        // For line tool: end point + tangent
                        let endPoint, tangent;

                        if (line.points && line.points.length > 0) {
                            // Pen tool arrow logic
                            const last = line.points[line.points.length - 1];
                            const prev = line.points[line.points.length - 2];
                            if (last && prev) {
                                endPoint = { x: last.x, y: last.y };
                                tangent = { dx: last.x - prev.x, dy: last.y - prev.y };
                            }
                        } else {
                            // Line tool arrow logic
                            endPoint = evaluateLinePoint(line, 1);
                            tangent = evaluateLineTangent(line, 1);
                        }

                        if (endPoint && tangent) {
                            const angle = Math.atan2(tangent.dy, tangent.dx);
                            // Approximate length for sizing
                            const length = line.points ? 100 : Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
                            const dimensions = computeArrowHeadDimensions(line.strokeWidth, length);

                            if (dimensions) {
                                ctx.save();
                                ctx.translate(endPoint.x, endPoint.y);
                                ctx.rotate(angle);
                                ctx.fillStyle = line.strokeColor;
                                ctx.beginPath();
                                ctx.moveTo(0, dimensions.halfWidth);
                                ctx.lineTo(0, -dimensions.halfWidth);
                                ctx.lineTo(dimensions.headLength, 0);
                                ctx.closePath();
                                ctx.fill();
                                ctx.restore();
                            }
                        }
                    }
                });

                // Draw Objects
                drawObjects(
                    ctx as unknown as CanvasLikeContext,
                    objects,
                    preparedLines,
                    i,
                    totalFrames
                );

                // Encode frame
                const bitmap = await createImageBitmap(canvas);
                const frame = new VideoFrame(bitmap, {
                    timestamp: i * frameDurationMicroseconds,
                    duration: frameDurationMicroseconds,
                });

                videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
                frame.close();

                if (onProgress) {
                    onProgress((i + 1) / totalFrames);
                }

                // Yield to event loop
                await new Promise(r => setTimeout(r, 0));
            }

            await videoEncoder.flush();
            muxer.finalize();

            const { buffer } = muxer.target;
            return new Blob([buffer], { type: 'video/mp4' });

        } catch (err) {
            console.error('MP4 Export failed:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
            throw err;
        } finally {
            setIsExporting(false);
        }
    }, []);

    return { exportMp4, isExporting, error };
}
