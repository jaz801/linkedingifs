import { useState, useCallback } from 'react';
import * as Mp4Muxer from 'mp4-muxer';
import type { RenderGifPayload, RenderLineInput } from '@/lib/render/schema';
import { drawLine } from '@/lib/render/drawLine';
import { drawObjects, calculateObjectPosition } from '@/lib/render/drawObjects';
import type { CanvasLikeContext } from '@/lib/render/canvasContext';
import { computeArrowHeadDimensions } from '@/lib/render/arrowGeometry';
import { evaluateLinePoint, evaluateLineTangent, normalizeProgress } from '@/lib/render/geometry';

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

            // Ensure dimensions are even numbers (required for many codecs)
            // Round down to nearest even number to avoid white lines if we just floored
            const exportWidth = Math.floor(width / 2) * 2;
            const exportHeight = Math.floor(height / 2) * 2;

            // Prepare muxer
            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width: exportWidth,
                    height: exportHeight,
                },
                fastStart: 'in-memory',
            });

            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => { throw e; },
            });

            videoEncoder.configure({
                codec: 'avc1.4d002a', // Main Profile, Level 4.2 (Supports 1080p @ 60fps)
                width: exportWidth,
                height: exportHeight,
                bitrate: 4_000_000, // 4 Mbps for better quality
                framerate: fps,
            });

            // Prepare offscreen canvas for rendering
            // We use a regular canvas but don't attach it to DOM
            const canvas = document.createElement('canvas');
            canvas.width = exportWidth;
            canvas.height = exportHeight;
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

            const totalFrames = Math.round(duration * fps);
            const frameDurationMicroseconds = 1_000_000 / fps;

            // NOTE: page.tsx already scales coordinates to pixels. We use lines directly.


            // Pre-calculate motion paths for animated shapes to ensure "paced" (constant speed) movement
            // This matches SVG <animateMotion> default behavior.
            const motionPaths = new Map<number, {
                totalLength: number;
                samples: { dist: number; point: { x: number; y: number } }[];
            }>();

            lines.forEach((line, index) => {
                if (!line.shapeType || !line.animateShapes || (line.shapeCount || 0) <= 0) return;

                // Create a LUT (Look Up Table) for the path
                const samplesCount = 200; // Granularity for smooth motion
                const samples: { dist: number; point: { x: number; y: number } }[] = [];
                let totalLength = 0;
                let prevPoint = evaluateLinePoint(line, 0);

                samples.push({ dist: 0, point: prevPoint });

                for (let i = 1; i <= samplesCount; i++) {
                    const t = i / samplesCount;
                    const point = evaluateLinePoint(line, t);
                    const dist = Math.hypot(point.x - prevPoint.x, point.y - prevPoint.y);
                    totalLength += dist;
                    samples.push({ dist: totalLength, point });
                    prevPoint = point;
                }

                motionPaths.set(index, { totalLength, samples });
            });

            const getPointOnPath = (lineIndex: number, progress: number) => {
                const motionPath = motionPaths.get(lineIndex);
                // Fallback to standard evaluation if no LUT (shouldn't happen for animate lines)
                if (!motionPath || motionPath.totalLength === 0) {
                    return {
                        point: evaluateLinePoint(lines[lineIndex], progress),
                        angle: Math.atan2(
                            evaluateLineTangent(lines[lineIndex], progress).dy,
                            evaluateLineTangent(lines[lineIndex], progress).dx
                        )
                    };
                }

                const targetDist = progress * motionPath.totalLength;

                // Find sample segment
                let upperIndex = motionPath.samples.findIndex(s => s.dist >= targetDist);
                if (upperIndex === -1) upperIndex = motionPath.samples.length - 1;
                const lowerIndex = Math.max(0, upperIndex - 1);

                const lower = motionPath.samples[lowerIndex];
                const upper = motionPath.samples[upperIndex];

                const segmentLen = upper.dist - lower.dist;
                const segmentProgress = segmentLen > 0 ? (targetDist - lower.dist) / segmentLen : 0;

                // Linear interpolation between samples
                const x = lower.point.x + (upper.point.x - lower.point.x) * segmentProgress;
                const y = lower.point.y + (upper.point.y - lower.point.y) * segmentProgress;

                // Calculate angle based on the segment vector
                const angle = Math.atan2(upper.point.y - lower.point.y, upper.point.x - lower.point.x);

                return { point: { x, y }, angle };
            };

            const drawAnimatedShapes = (context: CanvasRenderingContext2D, line: RenderLineInput, lineIndex: number, frameIndex: number, totalFramesCount: number) => {
                if (!line.shapeType || !line.animateShapes || (line.shapeCount || 0) <= 0) {
                    return;
                }

                const count = Math.max(1, line.shapeCount || 1);
                // line.objectSize is already scaled in page.tsx buildRenderPayload
                const size = line.objectSize ? Math.max(0.1, line.objectSize) : Math.max(1.5, line.strokeWidth * 1.5);
                const animDuration = 2.8; // Seconds, matching CanvasStage

                // We need to loop count times to draw each shape instance
                for (let index = 0; index < count; index++) {
                    const beginDelay = (animDuration / count) * index;
                    const timeOffset = index === 0 ? 0 : beginDelay;
                    const currentTime = frameIndex / fps;
                    const effectiveTime = (currentTime + timeOffset) % animDuration;
                    const progress = effectiveTime / animDuration;

                    const { point, angle } = getPointOnPath(lineIndex, progress);

                    let opacity = 0;
                    if (progress < 0.1) {
                        opacity = progress / 0.1;
                    } else if (progress < 0.9) {
                        opacity = 1;
                    } else {
                        opacity = 1 - ((progress - 0.9) / 0.1);
                    }

                    if (opacity <= 0.01) continue;

                    /*
                    if (frameIndex % 30 === 0 && index === 0) {
                        console.log(`Animated Shape Debug [Frame ${frameIndex}]`, {
                            type: line.shapeType,
                            at: point,
                            opacity,
                            progress
                        });
                    }
                    */

                    context.save();
                    context.translate(point.x, point.y);
                    context.rotate(angle);
                    context.globalAlpha = opacity;
                    context.fillStyle = line.shapeColor || '#FFF';

                    if (line.shapeType === 'circle') {
                        context.beginPath();
                        context.arc(0, 0, size / 2, 0, Math.PI * 2);
                        context.fill();
                    } else if (line.shapeType === 'square') {
                        const half = size / 2;
                        const rx = size * 0.15;
                        context.beginPath();
                        context.roundRect(-half, -half, size, size, rx);
                        context.fill();
                    } else if (line.shapeType === 'triangle') {
                        const width = size;
                        const height = size * 0.9;
                        context.beginPath();
                        context.moveTo(-width / 2, height / 2);
                        context.lineTo(width / 2, 0);
                        context.lineTo(-width / 2, -height / 2);
                        context.closePath();
                        context.fill();
                    }

                    context.restore();
                }
            };

            for (let i = 0; i < totalFrames; i++) {
                if (i % 30 === 0 || i === 0) console.log(`Rendering Frame ${i}/${totalFrames}`);

                // Clear and draw background
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, exportWidth, exportHeight);

                // Draw background with "object-fit: cover" logic
                if (bgImage.width > 0 && bgImage.height > 0) {
                    const imageAspect = bgImage.width / bgImage.height;
                    const canvasAspect = exportWidth / exportHeight;

                    let drawX = 0, drawY = 0, drawW = exportWidth, drawH = exportHeight;

                    if (imageAspect > canvasAspect) {
                        // Image is wider than canvas: crop sides
                        drawW = exportHeight * imageAspect;
                        drawX = (exportWidth - drawW) / 2;
                    } else {
                        // Image is taller than canvas: crop top/bottom
                        drawH = exportWidth / imageAspect;
                        drawY = (exportHeight - drawH) / 2;
                    }

                    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
                }

                // Draw Lines
                lines.forEach((line, lineIndex) => {
                    if (line.points && line.points.length > 0) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.strokeStyle = line.strokeColor;
                        ctx.lineWidth = line.strokeWidth;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';

                        if (line.isDotted) {
                            ctx.setLineDash([line.strokeWidth * 2, line.strokeWidth * 2]);
                        }

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

                        if (line.isClosed) {
                            ctx.closePath();
                        }

                        ctx.stroke();
                        ctx.restore();
                    } else {
                        // Draw the line path (fallback for simple lines)
                        drawLine(ctx as unknown as CanvasLikeContext, {
                            x1: line.x1,
                            y1: line.y1,
                            x2: line.x2,
                            y2: line.y2,
                            controlX: line.controlX,
                            controlY: line.controlY,
                            strokeColor: line.strokeColor,
                            strokeWidth: line.strokeWidth,
                            isDotted: line.isDotted,
                        });
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

                    // Draw Animated Shapes (New Logic)
                    drawAnimatedShapes(ctx, line, lineIndex, i, totalFrames);
                });

                // Draw Objects (Legacy support if 'objects' is populated, e.g. from older code or different features)
                drawObjects(
                    ctx as unknown as CanvasLikeContext,
                    objects,
                    lines.map(l => ({ original: l })),
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
