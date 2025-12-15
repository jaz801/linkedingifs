// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// GIF payloads never described the terminal cap shape, so backend renders defaulted to rounded tips even when the UI showed block or arrow heads.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without shared metadata exports drifted from the preview, breaking the promise that downloaded GIFs match what artists see.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added an explicit `endCap` flag to each render line so front-end, exporter, and server all honor the selected head style.
// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// Render payloads only described straight line segments, so the backend and exporter couldn’t replay the new curved edits from arrow mode.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without control-point data, GIF exports would flatten curved annotations back into straight lines, diverging from the canvas preview.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added optional quadratic control coordinates to each line payload so every renderer can faithfully reproduce stretched or curved strokes.

import type { LineEndCap } from '@/lib/canvas/types';

export type RenderLineInput = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  controlX?: number | null;
  controlY?: number | null;
  points?: { x: number; y: number; controlX?: number | null; controlY?: number | null }[];
  isClosed?: boolean;
  strokeColor: string;
  strokeWidth: number;
  endCap: LineEndCap;
  isDotted?: boolean;
};

export type RenderObjectInput = {
  lineIndex: number;
  type: 'dot' | 'cube' | 'arrow';
  color: string;
  size: number;
  speed?: number;
  direction?: 'forward' | 'backwards';
  offset?: number;
};

export type RenderGifPayload = {
  width: number;
  height: number;
  background: string;
  duration: number;
  fps?: number;
  lines: RenderLineInput[];
  objects: RenderObjectInput[];
};

