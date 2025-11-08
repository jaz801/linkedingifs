export type RenderLineInput = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
  strokeWidth: number;
};

export type RenderObjectInput = {
  lineIndex: number;
  type: 'dot' | 'cube' | 'arrow';
  color: string;
  size: number;
  speed?: number;
  direction?: 'forward' | 'backwards';
  offset?: number;
};

export type RenderGifPayload = {
  width: number;
  height: number;
  background: string;
  duration: number;
  fps?: number;
  lines: RenderLineInput[];
  objects: RenderObjectInput[];
};

