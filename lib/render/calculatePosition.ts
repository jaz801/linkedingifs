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

