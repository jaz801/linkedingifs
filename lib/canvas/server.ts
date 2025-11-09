import { createRequire } from 'node:module';

import type { Canvas, Image } from 'canvas';

type CanvasModule = {
  createCanvas: (width: number, height: number) => Canvas;
  loadImage: (source: string | Buffer | ArrayBuffer | URL) => Promise<Image>;
};

const require = createRequire(import.meta.url);

let cachedBindings: CanvasModule | null = null;
let cachedError: Error | null = null;

const CANDIDATE_PACKAGES = ['@napi-rs/canvas', 'canvas'] as const;

export function getCanvasModule(): CanvasModule {
  if (cachedBindings) {
    return cachedBindings;
  }

  if (cachedError) {
    throw cachedError;
  }

  const failedAttempts: string[] = [];

  for (const packageName of CANDIDATE_PACKAGES) {
    try {
      const module = require(packageName) as CanvasModule;
      cachedBindings = {
        createCanvas: module.createCanvas,
        loadImage: module.loadImage,
      };
      return cachedBindings;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
      failedAttempts.push(`${packageName}: ${message}`);
    }
  }

  const combinedError = new Error(
    `Unable to load a canvas implementation. Tried ${failedAttempts.length} candidates.`,
  );

  (combinedError as Error & { cause?: unknown }).cause = failedAttempts;

  cachedError = combinedError;
  throw combinedError;
}

