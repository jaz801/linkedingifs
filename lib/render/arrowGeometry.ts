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


