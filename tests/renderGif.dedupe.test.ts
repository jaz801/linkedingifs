// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// We introduced frame deduplication and geometry caching, but had no automated guard to ensure the GIF output stayed pixel-perfect and delays remained intact.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a regression test, subtle encoder changes could silently alter the binary payload or break the timing aggregation the optimisation relies on.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Exercise the public renderGif helper with a deterministic payload, assert timing metrics, and snapshot the resulting GIF hash so optimisations stay verifiable.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import * as PureImage from 'pureimage';
import { Writable } from 'node:stream';

import { renderGif } from '@/app/api/render-gif/route';
import type { RenderGifPayload } from '@/lib/render/schema';

const EXPECTED_SHA1 = 'c7dbdcaba3195b5e56be82ffe5a5394a9f26bdaa';

let cachedBackgroundDataUrl: string | null = null;

async function getBackgroundDataUrl() {
  if (cachedBackgroundDataUrl) {
    return cachedBackgroundDataUrl;
  }

  const canvas = PureImage.make(32, 32, {});
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const chunks: Buffer[] = [];
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    },
  });

  await PureImage.encodePNGToStream(canvas, sink);
  cachedBackgroundDataUrl = `data:image/png;base64,${Buffer.concat(chunks).toString('base64')}`;
  return cachedBackgroundDataUrl;
}

test('renderGif deduplicates identical frames without altering pixels', async () => {
  const background = await getBackgroundDataUrl();
  const payload: RenderGifPayload = {
    width: 32,
    height: 32,
    background,
    duration: 1,
    fps: 5,
    lines: [
      {
        x1: 4,
        y1: 4,
        x2: 28,
        y2: 4,
        strokeColor: '#FFFFFF',
        strokeWidth: 2,
        endCap: 'line',
      },
    ],
    objects: [
      {
        lineIndex: 0,
        type: 'dot',
        color: '#FF0000',
        size: 4,
        speed: 0,
      },
    ],
  };

  const { buffer, metrics } = await renderGif(payload);

  assert.equal(metrics.totalFrames, 5, 'expected total frames derived from duration and fps');
  assert.equal(metrics.skippedFrames, 4, 'duplicate frames should be skipped');
  assert.equal(metrics.encodedFrames, 1, 'only one frame should be encoded after dedupe');

  const hash = createHash('sha1').update(buffer).digest('hex');
  assert.equal(hash, EXPECTED_SHA1, 'GIF binary should stay stable across optimisations');
});


