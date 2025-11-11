'use client';

// 🛠️ EDIT LOG [2025-11-11-F]
// 🔍 WHAT WAS WRONG:
// Pointer leave checks assumed `relatedTarget` was always a `Node`, so Render environments threw `Failed to execute 'contains' on 'Node'`.
// 🤔 WHY IT HAD TO BE CHANGED:
// Hover state got stuck on hosted builds because pointer transitions sometimes yield non-Node targets like `window`.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Guard the containment check behind an `instanceof Node` so the handler safely ignores non-DOM targets without crashing.
// 🛠️ EDIT LOG [2025-11-11-E]
// 🔍 WHAT WAS WRONG:
// The canvas deck floated 20px above the tool selector, breaking the visual hinge between the workspace and its controls.
// 🤔 WHY IT HAD TO BE CHANGED:
// Users need the bottom menu to hug the canvas so their eyes do not travel across an artificial gap when switching tools.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Tightened the section gap to 1px so the menu sits flush without disturbing the rest of the responsive layout.
// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// Arrow heads appeared detached because round stroke caps extended past the endpoint, and the default “block” option still rendered an extra block instead of a plain line.
// 🤔 WHY IT HAD TO BE CHANGED:
// The preview must mirror exports exactly—users expect a plain line by default and a flush arrow tip only when asked for.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Switch to butt caps for arrow strokes and render only the arrow polygon so the head meets the endpoint cleanly without adding extra geometry in line mode.
// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// Line previews always ended with rounded caps even after selecting arrow or block heads, so the canvas disagreed with the export.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers need to see the exact terminal marker before exporting; mismatched previews erode trust in the tool.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Derived the end-cap geometry from line state and render it as SVG overlays so the stage reflects the selected head in real time.
// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// Arrow mode rendered static SVG lines, so hovering never surfaced the resize or bend handles designers expect for quick adjustments.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without visual affordances, users had to delete and redraw every stroke to tweak endpoints or add curvature, slowing iteration on annotated GIFs.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Converted lines into path elements, exposed hover-aware endpoint and midpoint handles, and wired their drag events into the line manager so length and curvature edits happen in place.

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useMemo } from 'react';

import type { DraftLine, LineSegment } from '@/lib/canvas/types';
import { approximateLineLength, computeArrowHeadDimensions } from '@/lib/render/arrowGeometry';

type CanvasStageProps = {
  tool: 'arrow' | 'line';
  canvasWidth: number;
  canvasHeight: number;
  color: string;
  lineWidth: number;
  lines: LineSegment[];
  draftLine: DraftLine | null;
  selectedLineId: string | null;
  hoveredLineId: string | null;
  drawingSurfaceRef: RefObject<HTMLDivElement | null>;
  onSurfacePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSurfacePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSurfacePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSurfacePointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onLinePointerDown: (event: ReactPointerEvent<SVGElement>) => void;
  onLinePointerMove: (event: ReactPointerEvent<SVGElement>) => void;
  onLinePointerUp: (event: ReactPointerEvent<SVGElement>) => void;
  onLinePointerCancel: (event: ReactPointerEvent<SVGElement>) => void;
  onLinePointerEnter: (lineId: string | null) => void;
  onLinePointerLeave: (lineId: string) => void;
  children?: ReactNode;
  background: { kind: 'image' | 'pdf-image'; src: string } | null;
};

export function CanvasStage({
  tool,
  canvasWidth,
  canvasHeight,
  color,
  lineWidth,
  lines,
  draftLine,
  selectedLineId,
  hoveredLineId,
  drawingSurfaceRef,
  onSurfacePointerDown,
  onSurfacePointerMove,
  onSurfacePointerUp,
  onSurfacePointerLeave,
  onLinePointerDown,
  onLinePointerMove,
  onLinePointerUp,
  onLinePointerCancel,
  onLinePointerEnter,
  onLinePointerLeave,
  children,
  background,
}: CanvasStageProps) {
  const canvasAspectRatio = `${canvasWidth} / ${canvasHeight}`;
  const linesWithShapes = useMemo(
    () => lines.filter((line) => line.shapeType && line.shapeCount > 0),
    [lines],
  );

  const buildLinePath = (line: LineSegment) =>
    line.controlPoint
      ? `M ${line.start.x} ${line.start.y} Q ${line.controlPoint.x} ${line.controlPoint.y} ${line.end.x} ${line.end.y}`
      : `M ${line.start.x} ${line.start.y} L ${line.end.x} ${line.end.y}`;

  const evaluateLinePoint = (line: LineSegment, t: number) => {
    const clampedT = Math.max(0, Math.min(1, t));
    if (line.controlPoint) {
      const oneMinusT = 1 - clampedT;
      const x =
        oneMinusT * oneMinusT * line.start.x +
        2 * oneMinusT * clampedT * line.controlPoint.x +
        clampedT * clampedT * line.end.x;
      const y =
        oneMinusT * oneMinusT * line.start.y +
        2 * oneMinusT * clampedT * line.controlPoint.y +
        clampedT * clampedT * line.end.y;
      return { x, y };
    }

    return {
      x: line.start.x + (line.end.x - line.start.x) * clampedT,
      y: line.start.y + (line.end.y - line.start.y) * clampedT,
    };
  };

  const getHandleRadius = (line: LineSegment) => Math.max(0.8, line.strokeWidth * 1.4);

  const evaluateLineTangent = (line: LineSegment, t: number) => {
    const clampedT = Math.max(0, Math.min(1, t));
    if (line.controlPoint) {
      const oneMinusT = 1 - clampedT;
      const dx =
        2 * oneMinusT * (line.controlPoint.x - line.start.x) +
        2 * clampedT * (line.end.x - line.controlPoint.x);
      const dy =
        2 * oneMinusT * (line.controlPoint.y - line.start.y) +
        2 * clampedT * (line.end.y - line.controlPoint.y);
      return { dx, dy };
    }

    return {
      dx: line.end.x - line.start.x,
      dy: line.end.y - line.start.y,
    };
  };

  const renderLineEndCap = (line: LineSegment) => {
    if (line.endCap !== 'arrow') {
      return null;
    }

    const endPoint = evaluateLinePoint(line, 1);
    const tangent = evaluateLineTangent(line, 1);
    const vectorLength = Math.hypot(tangent.dx, tangent.dy);
    if (vectorLength === 0) {
      return null;
    }

    const angle = (Math.atan2(tangent.dy, tangent.dx) * 180) / Math.PI;
    const approxLength = approximateLineLength(line);
    const dimensions = computeArrowHeadDimensions(line.strokeWidth, approxLength);
    if (!dimensions) {
      return null;
    }
    const { headLength, halfWidth } = dimensions;

    return (
      <g
        key={`${line.id}-arrow-head`}
        transform={`translate(${endPoint.x} ${endPoint.y}) rotate(${angle})`}
        style={{ pointerEvents: 'none' }}
      >
        <polygon
          points={`0,${halfWidth} 0,${-halfWidth} ${headLength},0`}
          fill={line.strokeColor}
        />
      </g>
    );
  };

  const renderAnimatedShapes = (line: LineSegment) => {
    if (!line.shapeType) {
      return null;
    }

    const count = Math.max(1, line.shapeCount);
    const size = Math.max(1.5, line.strokeWidth * 1.5);
    const duration = 2.8;

    return Array.from({ length: count }).map((_, index) => {
      const beginDelay = (duration / count) * index;
      const beginValue = index === 0 ? '0s' : `-${beginDelay.toFixed(2)}s`;

      if (line.shapeType === 'circle') {
        return (
          <circle key={`${line.id}-animated-${index}`} r={size / 2} fill={line.shapeColor}>
            <animateMotion
              dur={`${duration}s`}
              repeatCount="indefinite"
              rotate="auto"
              begin={beginValue}
            >
              <mpath xlinkHref={`#line-path-${line.id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              dur={`${duration}s`}
              repeatCount="indefinite"
              values="0;1;1;0"
              keyTimes="0;0.1;0.9;1"
              begin={beginValue}
            />
          </circle>
        );
      }

      if (line.shapeType === 'square') {
        const half = size / 2;
        return (
          <rect
            key={`${line.id}-animated-${index}`}
            x={-half}
            y={-half}
            width={size}
            height={size}
            rx={size * 0.15}
            fill={line.shapeColor}
          >
            <animateMotion
              dur={`${duration}s`}
              repeatCount="indefinite"
              rotate="auto"
              begin={beginValue}
            >
              <mpath xlinkHref={`#line-path-${line.id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              dur={`${duration}s`}
              repeatCount="indefinite"
              values="0;1;1;0"
              keyTimes="0;0.1;0.9;1"
              begin={beginValue}
            />
          </rect>
        );
      }

      const width = size;
      const height = size * 0.9;
      return (
        <polygon
          key={`${line.id}-animated-${index}`}
          points={`${-width / 2},${height / 2} ${width / 2},0 ${-width / 2},${-height / 2}`}
          fill={line.shapeColor}
        >
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            rotate="auto"
            begin={beginValue}
          >
            <mpath xlinkHref={`#line-path-${line.id}`} />
          </animateMotion>
          <animate
            attributeName="opacity"
            dur={`${duration}s`}
            repeatCount="indefinite"
            values="0;1;1;0"
            keyTimes="0;0.1;0.9;1"
            begin={beginValue}
          />
        </polygon>
      );
    });
  };

  const handleSurfacePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'line') return;
    onSurfacePointerDown(event);
  };

  const handleSurfacePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'line') return;
    onSurfacePointerMove(event);
  };

  const handleSurfacePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'line') return;
    onSurfacePointerUp(event);
  };

  const handleSurfacePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'line') return;
    onSurfacePointerLeave(event);
  };

  const handleLinePointerDown = (event: ReactPointerEvent<SVGElement>) => {
    if (tool !== 'arrow') return;
    onLinePointerDown(event);
  };

  const handleLinePointerMove = (event: ReactPointerEvent<SVGElement>) => {
    if (tool !== 'arrow') return;
    onLinePointerMove(event);
  };

  const handleLinePointerUp = (event: ReactPointerEvent<SVGElement>) => {
    if (tool !== 'arrow') return;
    onLinePointerUp(event);
  };

  const handleLinePointerCancel = (event: ReactPointerEvent<SVGElement>) => {
    if (tool !== 'arrow') return;
    onLinePointerCancel(event);
  };

  return (
    <section
      aria-label="Canvas workspace"
      className="order-1 flex w-full flex-col items-center gap-px lg:order-2 lg:max-w-none lg:self-stretch"
    >
      <div className="w-full">
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-stone-900/70 shadow-2xl shadow-black/30">
          <div
            ref={drawingSurfaceRef}
            className={`relative w-full select-none ${tool === 'line' ? 'cursor-crosshair' : 'cursor-default'}`}
            onPointerDown={handleSurfacePointerDown}
            onPointerMove={handleSurfacePointerMove}
            onPointerUp={handleSurfacePointerUp}
            onPointerLeave={handleSurfacePointerLeave}
            style={{ aspectRatio: canvasAspectRatio }}
          >
            {background ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="pointer-events-none h-full w-full object-cover"
                  src={background.src}
                  alt="Uploaded background"
                />
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="pointer-events-none h-full w-full object-cover"
                  src={`https://placehold.co/${canvasWidth}x${canvasHeight}`}
                  alt="Preview"
                />
              </>
            )}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              style={{ pointerEvents: tool === 'arrow' ? 'auto' : 'none' }}
              onPointerLeave={() => {
                if (tool === 'arrow') {
                  onLinePointerEnter(null);
                }
              }}
            >
              {linesWithShapes.length > 0 && (
                <defs>
                  {linesWithShapes.map((line) => (
                    <path
                      key={`${line.id}-path`}
                      id={`line-path-${line.id}`}
                      d={buildLinePath(line)}
                      fill="none"
                    />
                  ))}
                </defs>
              )}
              {lines.map((line) => {
                const isSelected = line.id === selectedLineId;
                const isHovered = hoveredLineId === line.id;
                const showHandles = tool === 'arrow' && (isSelected || isHovered);
                const pathDefinition = buildLinePath(line);
                const midpoint = evaluateLinePoint(line, 0.5);
                const controlHandlePosition = line.controlPoint ?? midpoint;
                const handleRadius = getHandleRadius(line);
                const handleStrokeWidth = Math.max(0.35, line.strokeWidth * 0.35);
                const handleStrokeColor = isSelected ? '#FFFFFF' : '#E6E6E6';

                return (
                  <g
                    key={line.id}
                    onPointerEnter={() => onLinePointerEnter(line.id)}
                    onPointerLeave={(event) => {
                      const relatedTarget = event.relatedTarget;
                      if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
                        return;
                      }
                      onLinePointerLeave(line.id);
                    }}
                  >
                    <path
                      data-line-id={line.id}
                      d={pathDefinition}
                      stroke={line.strokeColor}
                      strokeOpacity={1}
                      strokeWidth={line.strokeWidth}
                      strokeLinecap={line.endCap === 'arrow' ? 'butt' : 'round'}
                      strokeLinejoin={line.endCap === 'arrow' ? 'miter' : 'round'}
                      fill="none"
                      style={{
                        cursor: tool === 'arrow' ? 'grab' : 'default',
                        pointerEvents: tool === 'arrow' ? 'stroke' : 'none',
                      }}
                      className={
                        isSelected ? 'drop-shadow-[0_0_2px_rgba(255,255,255,0.6)]' : undefined
                      }
                      onPointerDown={handleLinePointerDown}
                      onPointerMove={handleLinePointerMove}
                      onPointerUp={handleLinePointerUp}
                      onPointerCancel={handleLinePointerCancel}
                    />
                    {renderLineEndCap(line)}
                    {showHandles && (
                      <g>
                        <circle
                          data-line-id={line.id}
                          data-handle-kind="start"
                          cx={line.start.x}
                          cy={line.start.y}
                          r={handleRadius}
                          fill={line.strokeColor}
                          stroke={handleStrokeColor}
                          strokeWidth={handleStrokeWidth}
                          style={{ cursor: 'grab' }}
                          onPointerDown={handleLinePointerDown}
                          onPointerMove={handleLinePointerMove}
                          onPointerUp={handleLinePointerUp}
                          onPointerCancel={handleLinePointerCancel}
                        />
                        <circle
                          data-line-id={line.id}
                          data-handle-kind="control"
                          cx={controlHandlePosition.x}
                          cy={controlHandlePosition.y}
                          r={handleRadius * 0.9}
                          fill="#F9FAFB"
                          stroke={handleStrokeColor}
                          strokeWidth={handleStrokeWidth}
                          style={{ cursor: 'grab' }}
                          onPointerDown={handleLinePointerDown}
                          onPointerMove={handleLinePointerMove}
                          onPointerUp={handleLinePointerUp}
                          onPointerCancel={handleLinePointerCancel}
                        />
                        <circle
                          data-line-id={line.id}
                          data-handle-kind="end"
                          cx={line.end.x}
                          cy={line.end.y}
                          r={handleRadius}
                          fill={line.strokeColor}
                          stroke={handleStrokeColor}
                          strokeWidth={handleStrokeWidth}
                          style={{ cursor: 'grab' }}
                          onPointerDown={handleLinePointerDown}
                          onPointerMove={handleLinePointerMove}
                          onPointerUp={handleLinePointerUp}
                          onPointerCancel={handleLinePointerCancel}
                        />
                      </g>
                    )}
                    {line.shapeType && line.shapeCount > 0 && line.animateShapes && (
                      <g style={{ pointerEvents: 'none' }}>
                        {renderAnimatedShapes(line)}
                      </g>
                    )}
                  </g>
                );
              })}
              {draftLine && (
                <line
                  x1={draftLine.start.x}
                  y1={draftLine.start.y}
                  x2={draftLine.end.x}
                  y2={draftLine.end.y}
                  stroke={color}
                  strokeOpacity={0.6}
                  strokeWidth={lineWidth}
                  strokeLinecap="round"
                  strokeDasharray="2 2"
                />
              )}
            </svg>

            <span className="pointer-events-none absolute bottom-4 right-4 rounded-xl border border-white/10 bg-stone-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 shadow-lg shadow-black/20">
              {canvasWidth} × {canvasHeight}px
            </span>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

