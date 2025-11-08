'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useMemo } from 'react';

import type { DraftLine, LineSegment } from '@/lib/canvas/types';

type CanvasStageProps = {
  tool: 'arrow' | 'line';
  canvasWidth: number;
  canvasHeight: number;
  color: string;
  lineWidth: number;
  lines: LineSegment[];
  draftLine: DraftLine | null;
  selectedLineId: string | null;
  drawingSurfaceRef: RefObject<HTMLDivElement | null>;
  onSurfacePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSurfacePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSurfacePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSurfacePointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onLinePointerDown: (event: ReactPointerEvent<SVGLineElement>) => void;
  onLinePointerMove: (event: ReactPointerEvent<SVGLineElement>) => void;
  onLinePointerUp: (event: ReactPointerEvent<SVGLineElement>) => void;
  onLinePointerCancel: (event: ReactPointerEvent<SVGLineElement>) => void;
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
  drawingSurfaceRef,
  onSurfacePointerDown,
  onSurfacePointerMove,
  onSurfacePointerUp,
  onSurfacePointerLeave,
  onLinePointerDown,
  onLinePointerMove,
  onLinePointerUp,
  onLinePointerCancel,
  children,
  background,
}: CanvasStageProps) {
  const canvasAspectRatio = `${canvasWidth} / ${canvasHeight}`;
  const linesWithShapes = useMemo(
    () => lines.filter((line) => line.shapeType && line.shapeCount > 0),
    [lines],
  );

  const buildLinePath = (line: LineSegment) =>
    `M ${line.start.x} ${line.start.y} L ${line.end.x} ${line.end.y}`;

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

  const handleLinePointerDown = (event: ReactPointerEvent<SVGLineElement>) => {
    if (tool !== 'arrow') return;
    onLinePointerDown(event);
  };

  const handleLinePointerMove = (event: ReactPointerEvent<SVGLineElement>) => {
    if (tool !== 'arrow') return;
    onLinePointerMove(event);
  };

  const handleLinePointerUp = (event: ReactPointerEvent<SVGLineElement>) => {
    if (tool !== 'arrow') return;
    onLinePointerUp(event);
  };

  const handleLinePointerCancel = (event: ReactPointerEvent<SVGLineElement>) => {
    if (tool !== 'arrow') return;
    onLinePointerCancel(event);
  };

  return (
    <section
      aria-label="Canvas workspace"
      className="order-1 flex w-full flex-col items-center gap-5 lg:order-2 lg:max-w-none lg:self-stretch"
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
                return (
                  <g key={line.id}>
                    <line
                      data-line-id={line.id}
                      x1={line.start.x}
                      y1={line.start.y}
                      x2={line.end.x}
                      y2={line.end.y}
                      stroke={line.strokeColor}
                      strokeOpacity={1}
                      strokeWidth={line.strokeWidth}
                      strokeLinecap="round"
                      style={{
                        cursor: tool === 'arrow' ? 'grab' : 'default',
                      }}
                      className={isSelected ? 'drop-shadow-[0_0_2px_rgba(255,255,255,0.6)]' : undefined}
                      onPointerDown={handleLinePointerDown}
                      onPointerMove={handleLinePointerMove}
                      onPointerUp={handleLinePointerUp}
                      onPointerCancel={handleLinePointerCancel}
                    />
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

