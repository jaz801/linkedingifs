declare module 'gif.js/optimized' {
  type GifFrameSource = CanvasRenderingContext2D | HTMLCanvasElement | ImageData;
  type GifEventHandler = (...args: unknown[]) => void;

  export default class GIF {
    constructor(options: Record<string, unknown>);
    addFrame(source: GifFrameSource, options: { delay: number; copy?: boolean }): void;
    on(event: 'finished', handler: (blob: Blob) => void): void;
    on(event: 'progress', handler: (progress: number) => void): void;
    on(event: 'abort', handler: GifEventHandler): void;
    on(event: string, handler: GifEventHandler): void;
    render(): void;
  }
}

declare module 'gif.js' {
  import type GIF from 'gif.js/optimized';
  export default GIF;
}

declare module 'gif.js/dist/gif.worker.js?url' {
  const url: string;
  export default url;
}

declare module 'gif.js/dist/gif.js' {
  const GIF: typeof import('gif.js/optimized')['default'];
  export default GIF;
}

declare module 'pdfjs-dist/legacy/build/pdf' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export const version: string | undefined;
  export function getDocument(
    options: unknown,
  ): {
    promise: Promise<{
      getPage(pageNumber: number): Promise<{
        getViewport(params: { scale: number }): { width: number; height: number };
        render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): {
          promise: Promise<void>;
        };
        cleanup(): void;
      }>;
      cleanup(): void;
      destroy(): void;
    }>;
  };
}

declare module 'pdfjs-dist/legacy/build/pdf.worker?url' {
  const url: string;
  export default url;
}

declare module 'gif-encoder-2' {
  import type { Readable } from 'stream';
  import type { SKRSContext2D } from '@napi-rs/canvas';

  export default class GIFEncoder {
    constructor(
      width: number,
      height: number,
      algorithm?: 'neuquant' | 'octree',
      useOptimizer?: boolean,
      totalFrames?: number,
    );
    createReadStream(stream?: Readable): Readable;
    start(): void;
    setRepeat(repeat: number): void;
    setDelay(milliseconds: number): void;
    setQuality(quality: number): void;
    addFrame(frame: CanvasRenderingContext2D | SKRSContext2D | ImageData | Uint8Array | Buffer): void;
    finish(): void;
  }
}

declare module '@pencil.js/canvas-gif-encoder' {
  import type { CanvasRenderingContext2D } from 'canvas';
  import type { SKRSContext2D } from '@napi-rs/canvas';

  export default class CanvasGifEncoder {
    constructor(width: number, height: number, options?: Record<string, unknown>);
    start(): void;
    finish(): void;
    setRepeat(repeat: number): void;
    setDelay(milliseconds: number): void;
    setQuality(quality: number): void;
    addFrame(
      frame: CanvasRenderingContext2D | SKRSContext2D | ImageData | Uint8Array | Buffer,
      delay?: number,
    ): void;
    readonly streamInfo: {
      data?: Buffer | Uint8Array | number[] | string;
    };
  }
}


