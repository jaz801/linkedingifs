// 🛠️ EDIT LOG [2025-11-11-D]
// 🔍 WHAT WAS WRONG:
// Drag handlers recalculated layer lookups and movement bounds on every pointer move, so translating one line scanned the whole stack each frame.
// 🤔 WHY IT HAD TO BE CHANGED:
// Those per-move array walks stack up with dozens of annotations and caused noticeable pointer lag on larger canvases.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Cache the active index plus translation clamps inside the drag state so move events can patch the target line in constant time.
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

export type PathNode = LinePoint & {
  controlPoint?: LinePoint | null; // For the segment ending at this node
};

export type LineShapeType = 'circle' | 'square' | 'triangle';

export type LineEndCap = 'line' | 'arrow';

export type LineSegment = {
  id: string;
  name: string;
  tool: 'line' | 'pen'; // New field to distinguish tool type
  start: LinePoint; // Kept for 'line' tool compatibility
  end: LinePoint;   // Kept for 'line' tool compatibility
  points: PathNode[]; // For 'pen' tool
  stackOrder: number;
  strokeColor: string;
  strokeWidth: number;
  endCap: LineEndCap;
  shapeColor: string;
  shapeType: LineShapeType | null;
  shapeCount: number;
  animateShapes: boolean;
  controlPoint: LinePoint | null; // Kept for 'line' tool compatibility
};

export type DraftLine = {
  start: LinePoint;
  end: LinePoint;
  isShiftLocked: boolean;
};

export type TranslateBounds = {
  minXDelta: number;
  maxXDelta: number;
  minYDelta: number;
  maxYDelta: number;
  // For pen tool, we might need bounds for individual points, but for now global bounds are fine
};

export type DragState = {
  lineId: string;
  pointerId: number;
  kind: 'translate' | 'start' | 'end' | 'control' | 'point' | 'segment_control';
  pointerStart: LinePoint;
  lineStart: LinePoint;
  lineEnd: LinePoint;
  controlPoint: LinePoint | null;
  // For pen tool:
  pointIndex?: number; // Index of the point being dragged
  pointStart?: LinePoint; // Initial position of the point
  lineIndex: number;
  translateBounds: TranslateBounds | null;
};

