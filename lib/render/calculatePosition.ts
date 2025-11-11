// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// Animated helpers moved along a straight interpolation even after a line was curved, so dots drifted off the stroke in exports.
// 🤔 WHY IT HAD TO BE CHANGED:
// Once arrow mode introduces a control point, helper objects must follow the same path or the animation looks broken.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Evaluate quadratic Bézier points and tangents when a control point exists, falling back to straight-line math otherwise.

import type { LinePath } from './drawLine';

export type PositionParams = {
  path: LinePath;
  progress: number;
  direction?: 'forward' | 'backwards';
};

export type ObjectPosition = {
  x: number;
  y: number;
  angle: number;
  progress: number;
};

export function calculatePosition({ path, progress, direction = 'forward' }: PositionParams): ObjectPosition {
  const normalizedProgress = normalizeProgress(progress);
  const effectiveProgress = direction === 'backwards' ? 1 - normalizedProgress : normalizedProgress;

  const hasControl = typeof path.controlX === 'number' && typeof path.controlY === 'number';

  if (hasControl) {
    const controlX = path.controlX as number;
    const controlY = path.controlY as number;
    const oneMinusT = 1 - effectiveProgress;

    const x =
      oneMinusT * oneMinusT * path.x1 +
      2 * oneMinusT * effectiveProgress * controlX +
      effectiveProgress * effectiveProgress * path.x2;
    const y =
      oneMinusT * oneMinusT * path.y1 +
      2 * oneMinusT * effectiveProgress * controlY +
      effectiveProgress * effectiveProgress * path.y2;

    const tangentX =
      2 * oneMinusT * (controlX - path.x1) + 2 * effectiveProgress * (path.x2 - controlX);
    const tangentY =
      2 * oneMinusT * (controlY - path.y1) + 2 * effectiveProgress * (path.y2 - controlY);

    const angle =
      Math.abs(tangentX) + Math.abs(tangentY) === 0 ? Math.atan2(path.y2 - path.y1, path.x2 - path.x1) : Math.atan2(tangentY, tangentX);

    return {
      x,
      y,
      angle,
      progress: effectiveProgress,
    };
  }

  const deltaX = path.x2 - path.x1;
  const deltaY = path.y2 - path.y1;

  const currentX = path.x1 + deltaX * effectiveProgress;
  const currentY = path.y1 + deltaY * effectiveProgress;
  const angle = Math.atan2(deltaY, deltaX);

  return {
    x: currentX,
    y: currentY,
    angle,
    progress: effectiveProgress,
  };
}

function normalizeProgress(rawProgress: number) {
  if (!Number.isFinite(rawProgress)) {
    return 0;
  }

  if (rawProgress >= 0 && rawProgress <= 1) {
    return rawProgress;
  }

  const wrapped = rawProgress % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

