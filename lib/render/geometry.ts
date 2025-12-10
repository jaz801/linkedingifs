import type { RenderLineInput } from './schema';

export function hasControlPoint(line: RenderLineInput): line is RenderLineInput & {
    controlX: number;
    controlY: number;
} {
    return (
        typeof line.controlX === 'number' &&
        Number.isFinite(line.controlX) &&
        typeof line.controlY === 'number' &&
        Number.isFinite(line.controlY)
    );
}

export function evaluateLinePoint(line: RenderLineInput, t: number) {
    const clampedT = Math.max(0, Math.min(1, t));

    if (line.points && line.points.length > 0) {
        if (line.points.length < 2) return { x: line.points[0].x, y: line.points[0].y };

        const segmentCount = line.points.length - 1;
        const segmentIndex = Math.min(Math.floor(clampedT * segmentCount), segmentCount - 1);
        const segmentT = (clampedT * segmentCount) - segmentIndex;

        const p0 = line.points[segmentIndex];
        const p1 = line.points[segmentIndex + 1];

        if (p1.controlX != null && p1.controlY != null) {
            // Quadratic bezier for this segment
            const oneMinusT = 1 - segmentT;
            const x =
                oneMinusT * oneMinusT * p0.x +
                2 * oneMinusT * segmentT * p1.controlX +
                segmentT * segmentT * p1.x;
            const y =
                oneMinusT * oneMinusT * p0.y +
                2 * oneMinusT * segmentT * p1.controlY +
                segmentT * segmentT * p1.y;
            return { x, y };
        }

        // Linear segment
        return {
            x: p0.x + (p1.x - p0.x) * segmentT,
            y: p0.y + (p1.y - p0.y) * segmentT,
        };
    }

    if (hasControlPoint(line)) {
        const oneMinusT = 1 - clampedT;
        const x =
            oneMinusT * oneMinusT * line.x1 +
            2 * oneMinusT * clampedT * line.controlX +
            clampedT * clampedT * line.x2;
        const y =
            oneMinusT * oneMinusT * line.y1 +
            2 * oneMinusT * clampedT * line.controlY +
            clampedT * clampedT * line.y2;
        return { x, y };
    }

    return {
        x: line.x1 + (line.x2 - line.x1) * clampedT,
        y: line.y1 + (line.y2 - line.y1) * clampedT,
    };
}

export function evaluateLineTangent(line: RenderLineInput, t: number) {
    const clampedT = Math.max(0, Math.min(1, t));

    if (line.points && line.points.length > 0) {
        if (line.points.length < 2) return { dx: 0, dy: 0 };

        const segmentCount = line.points.length - 1;
        const segmentIndex = Math.min(Math.floor(clampedT * segmentCount), segmentCount - 1);
        const segmentT = (clampedT * segmentCount) - segmentIndex;

        const p0 = line.points[segmentIndex];
        const p1 = line.points[segmentIndex + 1];

        if (p1.controlX != null && p1.controlY != null) {
            const oneMinusT = 1 - segmentT;
            const dx =
                2 * oneMinusT * (p1.controlX - p0.x) +
                2 * segmentT * (p1.x - p1.controlX);
            const dy =
                2 * oneMinusT * (p1.controlY - p0.y) +
                2 * segmentT * (p1.y - p1.controlY);
            return { dx, dy };
        }

        return {
            dx: p1.x - p0.x,
            dy: p1.y - p0.y,
        };
    }

    if (hasControlPoint(line)) {
        const oneMinusT = 1 - clampedT;
        const dx =
            2 * oneMinusT * (line.controlX - line.x1) + 2 * clampedT * (line.x2 - line.controlX);
        const dy =
            2 * oneMinusT * (line.controlY - line.y1) + 2 * clampedT * (line.y2 - line.controlY);
        return { dx, dy };
    }

    return {
        dx: line.x2 - line.x1,
        dy: line.y2 - line.y1,
    };
}

export function normalizeProgress(value: number) {
    const wrapped = value % 1;
    return wrapped < 0 ? wrapped + 1 : wrapped;
}
