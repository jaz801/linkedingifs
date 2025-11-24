// 🛠️ EDIT LOG [2025-11-12-A]
// 🔍 WHAT WAS WRONG:
// Backend render metrics lived inside the API route, so other modules could not share the timing schema without duplicating it.
// 🤔 WHY IT HAD TO BE CHANGED:
// Snapshot storage and future render services need to persist the exact timing fields, and re-declaring the type risks the shapes drifting apart.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Promoted the metrics definition into a shared module so both the API route and snapshot store can import a single, authoritative shape.

export type RenderTimingMetrics = {
  decodeMs: number;
  drawMs: number;
  enqueueMs: number;
  finalizeMs: number;
  totalFrames: number;
  skippedFrames: number;
  encodedFrames: number;
};


