import type { CanvasLikeContext } from './canvasContext';
import type { RenderLineInput, RenderObjectInput } from './schema';
import { evaluateLinePoint, evaluateLineTangent, normalizeProgress } from './geometry';

// We need a type that matches what drawObjects expects for prepared lines
// In route.ts it was PreparedRenderLine, but that type was local to route.ts.
// We should define a minimal interface or import it if we export it.
// For now, let's define a compatible interface here or make it generic.

export type ObjectRenderLineInfo = {
    original: RenderLineInput;
};

export function drawObjects(
    context: CanvasLikeContext,
    objects: RenderObjectInput[],
    preparedLines: ObjectRenderLineInfo[],
    frameIndex: number,
    totalFrames: number,
) {
    if (!Array.isArray(objects) || objects.length === 0) {
        return;
    }

    objects.forEach((object) => {
        const lineInfo = preparedLines[object.lineIndex];
        if (!lineInfo) {
            return;
        }

        const line = lineInfo.original;
        const position = calculateObjectPosition(object, line, frameIndex, totalFrames);
        if (!position) {
            return;
        }

        context.save();
        context.translate(position.x, position.y);
        context.rotate(position.angle);
        context.fillStyle = object.color ?? '#FFFFFF';

        const size = Math.max(1, object.size ?? 6);

        switch (object.type) {
            case 'dot':
                drawDot(context, size);
                break;
            case 'cube':
                drawCube(context, size);
                break;
            case 'arrow':
                drawArrow(context, size);
                break;
            default:
                drawDot(context, size);
                break;
        }

        context.restore();
    });
}

export function calculateObjectPosition(
    object: RenderObjectInput,
    line: RenderLineInput,
    frameIndex: number,
    totalFrames: number,
) {
    const baseOffset = typeof object.offset === 'number' ? object.offset : 0;
    const speed = typeof object.speed === 'number' ? object.speed : 1;
    const direction = object.direction === 'backwards' ? -1 : 1;

    const progress = normalizeProgress(baseOffset + direction * speed * (frameIndex / totalFrames));

    const point = evaluateLinePoint(line, progress);
    const tangent = evaluateLineTangent(line, progress);
    const tangentMagnitude = Math.hypot(tangent.dx, tangent.dy);

    if (tangentMagnitude === 0) {
        return null;
    }

    const angle = Math.atan2(tangent.dy, tangent.dx);

    return { x: point.x, y: point.y, angle };
}

function drawDot(context: CanvasLikeContext, size: number) {
    const radius = size / 2;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2, false);
    context.fill();
}

function drawCube(context: CanvasLikeContext, size: number) {
    const half = size / 2;
    context.fillRect(-half, -half, size, size);
}

function drawArrow(context: CanvasLikeContext, size: number) {
    const half = size / 2;
    context.beginPath();
    context.moveTo(-half, half);
    context.lineTo(-half, -half);
    context.lineTo(half, 0);
    context.closePath();
    context.fill();
}
