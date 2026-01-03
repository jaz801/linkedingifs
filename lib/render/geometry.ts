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

// Helper to calculate segment lengths and total length
function getPolylineSegments(line: RenderLineInput) {
    if (!line.points || line.points.length < 2) return null;

    const segments: { p0: any, p1: any, length: number, cumulative: number }[] = [];
    let totalLength = 0;

    const count = line.points.length;
    // Iterate points. If closed, we go one extra step wrapping back to 0
    // But we need segments: 0->1, 1->2, ... (n-1)->0 if closed
    const loopLimit = line.isClosed ? count : count - 1;

    for (let i = 0; i < loopLimit; i++) {
        const p0 = line.points[i];
        const p1 = line.points[(i + 1) % count];

        // Calculate segment length
        // Approximate quadratic length if control points exist
        let length = 0;
        if (p1.controlX != null && p1.controlY != null) {
            // Simple approximation for quadratic bezier length
            // A more accurate one would use iterative subdivision or integral, 
            // but chord length + control net is a decent proxy for weighting
            const chord = Math.hypot(p1.x - p0.x, p1.y - p0.y);
            const net = Math.hypot(p1.controlX - p0.x, p1.controlY - p0.y) + Math.hypot(p1.x - p1.controlX, p1.y - p1.controlY);
            length = (chord + net) / 2;
        } else {
            length = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        }

        totalLength += length;
        segments.push({ p0, p1, length, cumulative: totalLength });
    }

    return { segments, totalLength };
}

export function evaluateLinePoint(line: RenderLineInput, t: number) {
    const clampedT = Math.max(0, Math.min(1, t));

    if (line.points && line.points.length > 0) {
        if (line.points.length < 2) return { x: line.points[0].x, y: line.points[0].y };

        const poly = getPolylineSegments(line);
        if (!poly || poly.totalLength === 0) return { x: line.points[0].x, y: line.points[0].y };

        const targetDistance = clampedT * poly.totalLength;
        // Find segment
        const segment = poly.segments.find(s => s.cumulative >= targetDistance) || poly.segments[poly.segments.length - 1];

        const segmentStartDist = segment.cumulative - segment.length;
        const segmentLocalT = segment.length > 0 ? (targetDistance - segmentStartDist) / segment.length : 0;

        const { p0, p1 } = segment;

        if (p1.controlX != null && p1.controlY != null) {
            // Quadratic bezier
            const oneMinusT = 1 - segmentLocalT;
            const x =
                oneMinusT * oneMinusT * p0.x +
                2 * oneMinusT * segmentLocalT * p1.controlX +
                segmentLocalT * segmentLocalT * p1.x;
            const y =
                oneMinusT * oneMinusT * p0.y +
                2 * oneMinusT * segmentLocalT * p1.controlY +
                segmentLocalT * segmentLocalT * p1.y;
            return { x, y };
        }

        // Linear
        return {
            x: p0.x + (p1.x - p0.x) * segmentLocalT,
            y: p0.y + (p1.y - p0.y) * segmentLocalT,
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

        const poly = getPolylineSegments(line);
        if (!poly || poly.totalLength === 0) return { dx: 0, dy: 0 };

        const targetDistance = clampedT * poly.totalLength;
        const segment = poly.segments.find(s => s.cumulative >= targetDistance) || poly.segments[poly.segments.length - 1];

        const segmentStartDist = segment.cumulative - segment.length;
        const segmentLocalT = segment.length > 0 ? (targetDistance - segmentStartDist) / segment.length : 0;

        const { p0, p1 } = segment;

        if (p1.controlX != null && p1.controlY != null) {
            const oneMinusT = 1 - segmentLocalT;
            const dx =
                2 * oneMinusT * (p1.controlX - p0.x) +
                2 * segmentLocalT * (p1.x - p1.controlX);
            const dy =
                2 * oneMinusT * (p1.controlY - p0.y) +
                2 * segmentLocalT * (p1.y - p1.controlY);
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
