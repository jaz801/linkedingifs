// 🛠️ EDIT LOG [2025-01-XX]
// 🔍 WHAT WAS WRONG:
// `approximateLineLength` only handled simple lines with `start`/`end`, completely ignoring pen tool lines with `points` array. This caused incorrect arrow head sizing for pen tool lines.
// 🤔 WHY IT HAD TO BE CHANGED:
// Pen tool lines use a `points` array for multi-segment paths, so length calculation must sum distances between all consecutive points, not just start/end.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added pen tool support by checking `line.tool === 'pen'` and summing distances between all consecutive points in the array. This ensures accurate arrow head dimensions for pen tool lines.
// 🎨 DESIGN PRINCIPLES TO PREVENT REGRESSIONS:
// 1. ALWAYS check `line.tool === 'pen'` before accessing `line.points` - pen tool has different data structure
// 2. ALWAYS handle both `line.points` (pen tool) and `line.start`/`line.end` (line/arrow tools) - they are mutually exclusive
// 3. ALWAYS sum segment distances for pen tool - don't just use start/end distance
// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// Arrow rendering math lived in multiple components, which made the head shape inconsistent between the canvas preview and exported GIFs.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers noticed mismatched geometry whenever one layer tweaked its constants; the arrow should look identical everywhere.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Centralised the sizing helpers so every renderer can share the same arrow dimensions and length guards.

import type { LinePoint, LineSegment } from '@/lib/canvas/types';

export type ArrowHeadDimensions = {
  headLength: number;
  halfWidth: number;
};

const MIN_HEAD_LENGTH = 4.5;
const HEAD_LENGTH_MULTIPLIER = 2.8;
const MAX_HEAD_RATIO = 0.55;
const MIN_HALF_WIDTH_MULTIPLIER = 1.35;
const HALF_WIDTH_LENGTH_RATIO = 0.45;

export function approximateLineLength(line: LineSegment): number {
  // Handle pen tool with multi-segment paths
  if (line.tool === 'pen' && line.points && line.points.length > 0) {
    if (line.points.length < 2) {
      return 0;
    }

    let totalLength = 0;
    for (let i = 0; i < line.points.length - 1; i++) {
      const p0 = line.points[i];
      const p1 = line.points[i + 1];

      // For quadratic bezier segments, approximate using control point
      if (p1.controlPoint) {
        totalLength +=
          distanceBetween(p0, p1.controlPoint) +
          distanceBetween(p1.controlPoint, p1);
      } else {
        // Linear segment
        totalLength += distanceBetween(p0, p1);
      }
    }

    return totalLength;
  }

  // Handle line/arrow tool with single segment
  if (line.controlPoint) {
    return (
      distanceBetween(line.start, line.controlPoint) +
      distanceBetween(line.controlPoint, line.end)
    );
  }

  return distanceBetween(line.start, line.end);
}

export function computeArrowHeadDimensions(
  strokeWidth: number,
  approximateLength: number,
): ArrowHeadDimensions | null {
  if (!Number.isFinite(strokeWidth) || strokeWidth <= 0) {
    return null;
  }
  if (!Number.isFinite(approximateLength) || approximateLength <= 0) {
    return null;
  }

  const desiredHeadLength = Math.max(MIN_HEAD_LENGTH, strokeWidth * HEAD_LENGTH_MULTIPLIER);
  const maxHeadLength = Math.max(approximateLength * MAX_HEAD_RATIO, MIN_HEAD_LENGTH);
  const headLength = Math.min(desiredHeadLength, maxHeadLength);

  if (headLength <= 0.25) {
    return null;
  }

  const desiredHalfWidth = Math.max(
    strokeWidth * MIN_HALF_WIDTH_MULTIPLIER,
    headLength * HALF_WIDTH_LENGTH_RATIO,
  );
  const halfWidth = Math.min(desiredHalfWidth, headLength * 0.95);

  return {
    headLength,
    halfWidth,
  };
}

function distanceBetween(a: LinePoint, b: LinePoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}


