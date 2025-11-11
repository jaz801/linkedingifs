// 🛠️ EDIT LOG [2025-11-11-TYP]
// 🔍 WHAT WAS WRONG:
// `gifencoder` ships without type declarations, so the new unit tests failed to compile when ts-node tried to import the helper.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without ambient types the test runner treated the module as `any`, blocking the CommonJS harness we rely on for coverage.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added a minimal ambient module declaration that matches the methods we invoke, keeping the tests type-safe without overcommitting to the full API surface.

declare module 'gifencoder' {
  import type { Readable } from 'node:stream';

  export default class GIFEncoder {
    constructor(width: number, height: number);
    createReadStream(): Readable;
    start(): void;
    setRepeat(repeat: number): void;
    setDelay(milliseconds: number): void;
    setQuality(quality: number): void;
    addFrame(frame: Buffer | number[] | Uint8Array<ArrayBufferLike>): void;
    finish(): void;
  }
}


