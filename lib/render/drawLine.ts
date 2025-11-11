import type { CanvasLikeContext } from './canvasContext';

// 🛠️ EDIT LOG [2025-11-11-D]
// 🔍 WHAT WAS WRONG:
// TypeScript flagged `ctx.quadraticCurveTo` as possibly undefined during builds, crashing CI even though runtime guards existed.
// 🤔 WHY IT HAD TO BE CHANGED:
// The native quadratic path kept working locally, but production builds failed, blocking deploys and letting the same curve regression resurface.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Call the quadratic method via optional chaining after the guard so TypeScript is satisfied while keeping runtime behaviour intact.
// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// The server-side PureImage shim exposes a `quadraticCurveTo` function signature but leaves it unimplemented, so the previous feature detection still skipped our fallback.
// 🤔 WHY IT HAD TO BE CHANGED:
// Bent annotations continued to disappear after export, blocking handoff even after the first fix landed.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Always approximate quadratic curves when running outside the browser, using an adaptive number of straight segments so exports stay crisp without relying on flaky runtime checks.
// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// The PureImage-backed renderer ignores `quadraticCurveTo`, so curved strokes vanished in exports even though helper objects kept animating.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers rely on bent annotations to match artwork; losing the stroke in the downloaded GIF breaks handoff confidence.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Detect missing quadratic support and approximate the curve with line segments, reusing the same helper everywhere so both browser and server canvases stay consistent.
// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// The renderer only issued straight `lineTo` commands, so any curved line exported from arrow mode snapped back to a flat segment.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without honoring the control point, GIF exports and server renders would diverge from the on-canvas preview whenever designers bent a stroke.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Accept optional quadratic control coordinates and emit a `quadraticCurveTo` when present, preserving curvature across all render targets.

export type LinePath = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  controlX?: number | null;
  controlY?: number | null;
};

export type StaticLine = LinePath & {
  strokeColor: string;
  strokeWidth: number;
};

const MIN_APPROXIMATION_STEPS = 12;
const MAX_APPROXIMATION_STEPS = 64;
const APPROXIMATION_PIXELS_PER_STEP = 4;

export type QuadraticContext = Pick<CanvasLikeContext, 'lineTo'> & {
  quadraticCurveTo?: CanvasLikeContext['quadraticCurveTo'];
};

export function drawLine(ctx: CanvasLikeContext, line: StaticLine) {
  ctx.save();
  try {
    ctx.strokeStyle = line.strokeColor;
    ctx.lineWidth = line.strokeWidth;
    if ('lineCap' in ctx && ctx.lineCap !== undefined) {
      ctx.lineCap = 'round';
    }

    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    if (hasControlPoint(line)) {
      strokeQuadraticCurve(ctx, line.x1, line.y1, line.controlX, line.controlY, line.x2, line.y2);
    } else {
      ctx.lineTo(line.x2, line.y2);
    }
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

export function strokeQuadraticCurve(
  ctx: QuadraticContext,
  startX: number,
  startY: number,
  controlX: number,
  controlY: number,
  endX: number,
  endY: number,
) {
  if (shouldUseNativeQuadratic(ctx)) {
    ctx.quadraticCurveTo?.call(ctx, controlX, controlY, endX, endY);
    return;
  }

  const steps = determineApproximationSteps(startX, startY, controlX, controlY, endX, endY);

  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * controlX + t * t * endX;
    const y = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * controlY + t * t * endY;
    ctx.lineTo(x, y);
  }
}

function hasControlPoint(line: LinePath): line is LinePath & {
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

function shouldUseNativeQuadratic(ctx: QuadraticContext) {
  if (typeof window === 'undefined') {
    return false;
  }

  return typeof ctx.quadraticCurveTo === 'function';
}

function determineApproximationSteps(
  startX: number,
  startY: number,
  controlX: number,
  controlY: number,
  endX: number,
  endY: number,
) {
  const startToControl = Math.hypot(controlX - startX, controlY - startY);
  const controlToEnd = Math.hypot(endX - controlX, endY - controlY);
  const startToEnd = Math.hypot(endX - startX, endY - startY);

  const lengthEstimate = (startToControl + controlToEnd + startToEnd) / 2;
  const rawSteps = Math.ceil(lengthEstimate / APPROXIMATION_PIXELS_PER_STEP);

  return Math.max(MIN_APPROXIMATION_STEPS, Math.min(MAX_APPROXIMATION_STEPS, rawSteps));
}

