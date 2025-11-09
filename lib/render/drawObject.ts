import type { CanvasLikeContext } from './canvasContext';

export type DrawableObject = {
  type: 'dot' | 'cube' | 'arrow';
  color: string;
  size: number;
  x: number;
  y: number;
  angle: number;
  opacity?: number;
};

export function drawObject(ctx: CanvasLikeContext, object: DrawableObject) {
  if (object.size <= 0) {
    return;
  }

  const size = object.size;
  const opacity = normalizeOpacity(object.opacity);
  const shouldAdjustOpacity = opacity < 1;

  if (shouldAdjustOpacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
  }

  switch (object.type) {
    case 'dot':
      drawDot(ctx, object.x, object.y, size, object.color);
      break;
    case 'cube':
      drawCube(ctx, object.x, object.y, size, object.color);
      break;
    case 'arrow':
      drawArrow(ctx, object.x, object.y, size, object.angle, object.color);
      break;
    default:
      // no-op for unknown shapes to keep rendering resilient
      break;
  }

  if (shouldAdjustOpacity) {
    ctx.restore();
  }
}

function drawDot(ctx: CanvasLikeContext, x: number, y: number, size: number, color: string) {
  ctx.save();
  try {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  } finally {
    ctx.restore();
  }
}

function drawCube(ctx: CanvasLikeContext, x: number, y: number, size: number, color: string) {
  ctx.save();
  try {
    const half = size / 2;
    ctx.fillStyle = color;
    ctx.fillRect(x - half, y - half, size, size);
  } finally {
    ctx.restore();
  }
}

function drawArrow(
  ctx: CanvasLikeContext,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
) {
  ctx.save();
  try {
    ctx.translate(x, y);
    ctx.rotate(angle);

    const shaftLength = size * 1.6;
    const shaftWidth = Math.max(1, size * 0.2);
    const headLength = size * 0.9;
    const headWidth = size * 0.6;

    ctx.strokeStyle = color;
    ctx.lineWidth = shaftWidth;
    if ('lineCap' in ctx && ctx.lineCap !== undefined) {
      ctx.lineCap = 'round';
    }

    ctx.beginPath();
    ctx.moveTo(-shaftLength / 2, 0);
    ctx.lineTo(shaftLength / 2, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(shaftLength / 2, 0);
    ctx.lineTo(shaftLength / 2 - headLength, headWidth / 2);
    ctx.lineTo(shaftLength / 2 - headLength, -headWidth / 2);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
  } finally {
    ctx.restore();
  }
}

function normalizeOpacity(rawOpacity: number | undefined) {
  if (!Number.isFinite(rawOpacity)) {
    return 1;
  }

  const clamped = Math.max(0, Math.min(1, rawOpacity!));
  return clamped;
}

