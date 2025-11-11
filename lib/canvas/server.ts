// 🛠️ EDIT LOG [2025-11-11-BG]
// 🔍 WHAT WAS WRONG:
// Repeated GIF renders re-decoded identical background data URLs on every frame request, wasting time in base64 parsing and buffer allocation.
// 🤔 WHY IT HAD TO BE CHANGED:
// Backgrounds rarely change between exports; avoiding needless PNG buffer work frees CPU for real rendering without altering pixel output.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added a tiny capped cache of decoded PNG buffers keyed by the data URL so repeated loads reuse the same Buffer while staying memory safe.
// Bugfix (2025-11-09-F): provide the required options argument to `PureImage.make` so TypeScript accepts the call signature.
// Bugfix: pureimage lacks decodePNGFromBuffer export, so load images via stream decoding.
import * as PureImage from 'pureimage';
import { Readable } from 'node:stream';

type PureImageCanvas = ReturnType<typeof PureImage.make>;
type PureImageImage = Awaited<ReturnType<typeof PureImage.decodePNGFromStream>>;

type CanvasModule = {
  createCanvas: (width: number, height: number) => PureImageCanvas;
  loadImage: (source: string | Buffer | ArrayBuffer | URL) => Promise<PureImageImage>;
};

const MAX_CACHED_PNG_BUFFERS = 8;
const cachedPngBuffers = new Map<string, Buffer>();

let cachedBindings: CanvasModule | null = null;

export function getCanvasModule(): CanvasModule {
  if (!cachedBindings) {
    cachedBindings = {
      createCanvas: createPureImageCanvas,
      loadImage: loadPureImage,
    };
  }

  return cachedBindings;
}

function createPureImageCanvas(width: number, height: number): PureImageCanvas {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new TypeError('Canvas width and height must be finite numbers');
  }

  return PureImage.make(
    Math.max(0, Math.floor(width)),
    Math.max(0, Math.floor(height)),
    {},
  );
}

async function loadPureImage(source: string | Buffer | ArrayBuffer | URL) {
  const buffer = await getPngBuffer(source);
  const stream = Readable.from(buffer);
  const image = await PureImage.decodePNGFromStream(stream);
  return image;
}

async function getPngBuffer(source: string | Buffer | ArrayBuffer | URL) {
  if (Buffer.isBuffer(source)) {
    return source;
  }

  if (source instanceof ArrayBuffer) {
    return Buffer.from(source);
  }

  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      const cacheKey = source;
      const cached = cachedPngBuffers.get(cacheKey);
      if (cached) {
        return cached;
      }

      const base64 = extractBase64Payload(source);
      const buffer = Buffer.from(base64, 'base64');
      rememberPngBuffer(cacheKey, buffer);
      return buffer;
    }
    throw new Error('Only base64 data URLs are supported when loading images from strings.');
  }

  if (source instanceof URL) {
    if (source.protocol === 'data:') {
      return getPngBuffer(source.toString());
    }
    throw new Error('Image loading via remote URLs is disabled in the render pipeline.');
  }

  throw new Error('Unsupported image source type.');
}

function extractBase64Payload(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) {
    throw new Error('Expected a base64-encoded PNG data URL.');
  }
  return match[1];
}

function rememberPngBuffer(key: string, buffer: Buffer) {
  cachedPngBuffers.set(key, buffer);
  if (cachedPngBuffers.size > MAX_CACHED_PNG_BUFFERS) {
    const oldestKey = cachedPngBuffers.keys().next().value;
    if (typeof oldestKey === 'string') {
      cachedPngBuffers.delete(oldestKey);
    }
  }
}

