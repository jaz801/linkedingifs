// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// The so-called block head still rendered a capped tip and arrow heads sat a few pixels short of the actual endpoint thanks to rounded line caps.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers reported the arrow looking detached and expected the default option to behave like a plain line with no extra geometry.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Renamed the default cap to an explicit line mode and rely on it for unadorned strokes, reserving arrow geometry for the dedicated option.
// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// Line endpoints always rendered as rounded strokes, so the new arrow/block heads couldn't be previewed or exported consistently.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without explicit cap metadata the UI, renderer, and exporter would disagree about end shapes, breaking annotations in the downloaded GIF.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Introduced a typed `LineEndCap` flag and threaded it through the shared line model so every layer can render the same terminal geometry.
// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// Arrow mode treated every finished stroke as immutable, so users could not adjust length or bend a line without redrawing it from scratch.
// 🤔 WHY IT HAD TO BE CHANGED:
// Annotating backgrounds requires nudging endpoints to precise anchors and adding curved emphasis; forcing redraws slowed iteration and produced misaligned overlays.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Introduced optional control-point support and richer drag-state metadata so the UI can surface endpoint and midpoint handles for resizing and curvature edits.

export type LinePoint = {
  x: number;
  y: number;
};

export type LineShapeType = 'circle' | 'square' | 'triangle';

export type LineEndCap = 'line' | 'arrow';

export type LineSegment = {
  id: string;
  name: string;
  start: LinePoint;
  end: LinePoint;
  stackOrder: number;
  strokeColor: string;
  strokeWidth: number;
  endCap: LineEndCap;
  shapeColor: string;
  shapeType: LineShapeType | null;
  shapeCount: number;
  animateShapes: boolean;
  controlPoint: LinePoint | null;
};

export type DraftLine = {
  start: LinePoint;
  end: LinePoint;
  isShiftLocked: boolean;
};

export type DragState = {
  lineId: string;
  pointerId: number;
  kind: 'translate' | 'start' | 'end' | 'control';
  pointerStart: LinePoint;
  lineStart: LinePoint;
  lineEnd: LinePoint;
  controlPoint: LinePoint | null;
};

