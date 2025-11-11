// 🛠️ EDIT LOG [2025-11-11-T]
// 🔍 WHAT WAS WRONG:
// The GIF frame conversion helper lived untested, so ArrayBuffer regressions kept sneaking back in without warning.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without automated coverage, swapping encoders or tweaking canvas bindings silently broke builds until someone ran `next build`.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added focused unit tests that exercise both `Uint8Array` and `ArrayBuffer` pathways, ensuring the helper always feeds `Buffer` instances to the encoder.

import assert from 'node:assert/strict';
import test from 'node:test';

import { addFrameToEncoder, normalizeFrameData } from '../app/api/render-gif/encoderUtils';
import type { CanvasImageData } from '../lib/render/canvasContext';

test('normalizeFrameData converts ArrayBufferView into Buffer without copying', () => {
  const source = new Uint8Array([1, 2, 3, 4]);
  const buffer = normalizeFrameData(source);

  assert.equal(buffer.byteLength, source.byteLength);
  assert.equal(buffer[0], 1);
  source[0] = 9;
  assert.equal(buffer[0], 9, 'buffer should reference the same underlying memory');
});

test('normalizeFrameData converts ArrayBuffer into Buffer', () => {
  const source = new Uint8Array([5, 6, 7, 8]).buffer;
  const buffer = normalizeFrameData(source);

  assert.equal(buffer.byteLength, 4);
  assert.deepEqual([...buffer.values()], [5, 6, 7, 8]);
});

test('addFrameToEncoder forwards Buffer data to encoder from Uint8Array frames', () => {
  const frame: CanvasImageData = {
    width: 1,
    height: 1,
    data: new Uint8Array([10, 20]),
  };

  let received: Buffer | null = null;
  const encoder = {
    addFrame: (chunk: Buffer) => {
      received = chunk;
    },
  };

  addFrameToEncoder(encoder, frame);

  assert.ok(received, 'encoder should receive a buffer');
  const buffer = received as Buffer;
  assert.equal(buffer.byteLength, 2);
  assert.deepEqual([...buffer.values()], [10, 20]);
});

test('addFrameToEncoder accepts ArrayBuffer frame data', () => {
  const frame: CanvasImageData = {
    width: 1,
    height: 1,
    data: new Uint8Array([30, 40]).buffer,
  };

  let received: Buffer | null = null;
  const encoder = {
    addFrame: (chunk: Buffer) => {
      received = chunk;
    },
  };

  addFrameToEncoder(encoder, frame);

  assert.ok(received, 'encoder should receive a buffer');
  const buffer = received as Buffer;
  assert.equal(buffer.byteLength, 2);
  assert.deepEqual([...buffer.values()], [30, 40]);
});


