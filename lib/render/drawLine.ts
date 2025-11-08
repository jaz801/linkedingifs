import type { SKRSContext2D } from '@napi-rs/canvas';

export type LinePath = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type StaticLine = LinePath & {
  strokeColor: string;
  strokeWidth: number;
};

type DrawingContext = CanvasRenderingContext2D | SKRSContext2D;

export function drawLine(ctx: DrawingContext, line: StaticLine) {
  ctx.save();
  try {
    ctx.strokeStyle = line.strokeColor;
    ctx.lineWidth = line.strokeWidth;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

