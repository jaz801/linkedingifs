export type LinePoint = {
  x: number;
  y: number;
};

export type LineShapeType = 'circle' | 'square' | 'triangle';

export type LineSegment = {
  id: string;
  name: string;
  start: LinePoint;
  end: LinePoint;
  stackOrder: number;
  strokeColor: string;
  strokeWidth: number;
  shapeColor: string;
  shapeType: LineShapeType | null;
  shapeCount: number;
  animateShapes: boolean;
};

export type DraftLine = {
  start: LinePoint;
  end: LinePoint;
  isShiftLocked: boolean;
};

export type DragState = {
  lineId: string;
  pointerId: number;
  pointerStart: LinePoint;
  lineStart: LinePoint;
  lineEnd: LinePoint;
};

