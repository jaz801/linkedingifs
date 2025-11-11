// 🛠️ EDIT LOG [2025-11-11-AU]
// 🔍 WHAT WAS WRONG:
// GIF frame conversion lived inline in the route, so it was untested and type drift kept breaking builds whenever the encoder or canvas typings shifted.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a dedicated helper, every refactor reintroduced the same ArrayBuffer vs Uint8Array mismatch and we had no focused place to assert the behaviour.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Extracted the conversion into a shared utility that exposes both the normalization helper and the encoder entry-point, making it trivial to cover with unit tests.

import type GIFEncoder from 'gifencoder';

import type { CanvasImageData } from '@/lib/render/canvasContext';

type EncoderLike = Pick<GIFEncoder, 'addFrame'>;

export function normalizeFrameData(source: ArrayBuffer | ArrayBufferView): Buffer {
  if (ArrayBuffer.isView(source)) {
    const view = source as ArrayBufferView;
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  }

  return Buffer.from(source);
}

export function addFrameToEncoder(encoder: EncoderLike, frame: CanvasImageData) {
  encoder.addFrame(normalizeFrameData(frame.data));
}


