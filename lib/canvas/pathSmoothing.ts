/**
 * Path smoothing and simplification utilities for the pen tool.
 * 
 * This module provides algorithms to:
 * 1. Simplify paths by removing redundant points (Douglas-Peucker)
 * 2. Smooth paths using corner-cutting (Chaikin's algorithm)
 * 3. Fit Bézier curves to smoothed paths
 */

export type Point = {
    x: number;
    y: number;
};

export type PointWithControl = Point & {
    controlPoint?: { x: number; y: number };
};

/**
 * Douglas-Peucker algorithm for path simplification.
 * Reduces the number of points in a path while preserving its shape.
 * 
 * @param points - Array of points to simplify
 * @param tolerance - Maximum distance a point can be from the simplified path (in percentage units, 0-100)
 * @returns Simplified array of points
 */
export function simplifyPath(points: Point[], tolerance: number = 0.5): Point[] {
    if (points.length <= 2) {
        return points;
    }

    const sqTolerance = tolerance * tolerance;

    // Find the point with the maximum distance from the line segment
    let maxDistance = 0;
    let maxIndex = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const distance = perpendicularDistanceSquared(points[i], first, last);
        if (distance > maxDistance) {
            maxDistance = distance;
            maxIndex = i;
        }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > sqTolerance) {
        const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
        const right = simplifyPath(points.slice(maxIndex), tolerance);

        // Concatenate results, avoiding duplicate middle point
        return [...left.slice(0, -1), ...right];
    }

    // If max distance is within tolerance, return just the endpoints
    return [first, last];
}

/**
 * Calculate squared perpendicular distance from point to line segment.
 * Using squared distance avoids expensive sqrt operation.
 */
function perpendicularDistanceSquared(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    // Handle degenerate case where line segment is a point
    if (dx === 0 && dy === 0) {
        return distanceSquared(point, lineStart);
    }

    // Calculate parameter t for projection onto line
    const t = Math.max(0, Math.min(1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)
    ));

    // Calculate closest point on line segment
    const closestX = lineStart.x + t * dx;
    const closestY = lineStart.y + t * dy;

    // Return squared distance
    return distanceSquared(point, { x: closestX, y: closestY });
}

function distanceSquared(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return dx * dx + dy * dy;
}

/**
 * Chaikin's corner-cutting algorithm for path smoothing.
 * Creates a smoother curve by iteratively cutting corners.
 * 
 * @param points - Array of points to smooth
 * @param iterations - Number of smoothing iterations (default: 2)
 * @param ratio - Corner cutting ratio, 0.25 = cut 25% from each end (default: 0.25)
 * @returns Smoothed array of points
 */
export function smoothPath(points: Point[], iterations: number = 2, ratio: number = 0.25): Point[] {
    if (points.length <= 2 || iterations <= 0) {
        return points;
    }

    let smoothed = points;

    for (let iter = 0; iter < iterations; iter++) {
        const newPoints: Point[] = [];

        // Keep first point
        newPoints.push(smoothed[0]);

        // Apply corner cutting to intermediate segments
        for (let i = 0; i < smoothed.length - 1; i++) {
            const p0 = smoothed[i];
            const p1 = smoothed[i + 1];

            // Cut corner: create two new points between p0 and p1
            const q = {
                x: p0.x + ratio * (p1.x - p0.x),
                y: p0.y + ratio * (p1.y - p0.y),
            };

            const r = {
                x: p0.x + (1 - ratio) * (p1.x - p0.x),
                y: p0.y + (1 - ratio) * (p1.y - p0.y),
            };

            newPoints.push(q, r);
        }

        // Keep last point
        newPoints.push(smoothed[smoothed.length - 1]);

        smoothed = newPoints;
    }

    return smoothed;
}

/**
 * Fit quadratic Bézier curves to a smoothed path.
 * Calculates control points for smooth curve segments.
 * 
 * @param points - Array of points to fit curves to
 * @returns Array of points with control points for quadratic Bézier curves
 */
export function fitBezierCurves(points: Point[]): PointWithControl[] {
    if (points.length <= 2) {
        return points.map(p => ({ ...p }));
    }

    const result: PointWithControl[] = [];

    // First point has no control point
    result.push({ ...points[0] });

    // For each intermediate segment, calculate control point
    for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];

        if (p2) {
            // Calculate control point as the current point
            // This creates a smooth curve through the points
            const controlPoint = {
                x: p1.x,
                y: p1.y,
            };

            // Add the next point with control point
            result.push({
                ...p1,
                controlPoint,
            });
        } else {
            // Last point has no control point
            result.push({ ...p1 });
        }
    }

    return result;
}

/**
 * Apply full smoothing pipeline to a pen path.
 * Combines simplification, smoothing, and Bézier fitting.
 * 
 * @param points - Raw points from pen tool
 * @param options - Smoothing options
 * @returns Smoothed points with Bézier control points
 */
export function smoothPenPath(
    points: Point[],
    options: {
        simplifyTolerance?: number;
        smoothIterations?: number;
        smoothRatio?: number;
    } = {}
): PointWithControl[] {
    const {
        simplifyTolerance = 0.8,
        smoothIterations = 2,
        smoothRatio = 0.25,
    } = options;

    if (points.length <= 2) {
        return points.map(p => ({ ...p }));
    }

    // Step 1: Simplify to reduce point count
    const simplified = simplifyPath(points, simplifyTolerance);

    // Step 2: Smooth the simplified path
    const smoothed = smoothPath(simplified, smoothIterations, smoothRatio);

    // Step 3: Fit Bézier curves
    const withCurves = fitBezierCurves(smoothed);

    return withCurves;
}
