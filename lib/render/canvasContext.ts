// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// The GIF route needed explicit typings for `getImageData`, but the shared canvas shim never declared it, so downstream code kept widening frame pixels to `ArrayBuffer`.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without an accurate signature our encoder wrapper regressed type safety and forced every consumer to re-declare the image data shape.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Export a reusable `CanvasImageData` type and surface `getImageData` on the context shim so renderers can depend on a single source of truth.
// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// The fallback renderer's context exposed `quadraticCurveTo` at runtime, but our TypeScript shim forgot to declare it.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without the method in the type, shared helpers could not safely detect support and the compiler blocked the curved-line fallback.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Declare the optional signature so both browser canvases and the PureImage shim advertise curve support consistently.

export type CanvasLikeContext = {
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo?(cpx: number, cpy: number, x: number, y: number): void;
  stroke(): void;
  strokeStyle: string;
  lineWidth: number;
  lineCap?: string;
  fillStyle: string;
  fill(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  closePath(): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  globalAlpha?: number;
  clearRect?(x: number, y: number, width: number, height: number): void;
  drawImage?(
    image: { width: number; height: number },
    dx: number,
    dy: number,
    dWidth?: number,
    dHeight?: number,
  ): void;
  getImageData(x: number, y: number, width: number, height: number): CanvasImageData;
};

export type CanvasImageData = {
  width: number;
  height: number;
  data: Uint8Array | ArrayBuffer;
};

