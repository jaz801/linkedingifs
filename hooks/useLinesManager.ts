'use client';

// 🛠️ EDIT LOG [2025-11-11-G]
// 🔍 WHAT WAS WRONG:
// Dragging lines rebuilt the entire layer array on every pointer move, so pointer updates turned into O(n) work even when only one layer changed.
// 🤔 WHY IT HAD TO BE CHANGED:
// That per-move cloning caused frame drops once the canvas held dozens of annotations, making line adjustments feel sluggish.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Track the active line index and clamp bounds inside the drag state so moves can patch a single array slot and skip redundant equality work.
// 🛠️ EDIT LOG [2025-11-11-F]
// 🔍 WHAT WAS WRONG:
// Paste (Cmd+V) updated the clipboard reference with the offset duplicate, so subsequent pastes chained off the last clone instead of the original copy.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers expect multiple pastes to reproduce the item they copied, not progressively shifted versions, otherwise alignment drifts with each paste.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Keep the clipboard snapshot immutable during paste by only mutating it on copy; paste now just inserts the offset duplicate while preserving the original buffer.

// 🛠️ EDIT LOG [2025-11-11-E]
// 🔍 WHAT WAS WRONG:
// Dragging a curved line by its body kept stacking the movement delta onto the control point, warping the arc.
// 🤔 WHY IT HAD TO BE CHANGED:
// Repositioning should preserve existing curvature so annotations stay faithful when nudged into place.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Base translate math on the pointer-down snapshot so start, end, and control points travel together without compounding.

// 🛠️ EDIT LOG [2025-11-11-D]
// 🔍 WHAT WAS WRONG:
// Command+C and Command+V did nothing on selected annotations, forcing teams to redraw lines to duplicate them.
// 🤔 WHY IT HAD TO BE CHANGED:
// Recreating identical callouts slowed iteration and introduced spacing errors when designers needed multiple matching arrows.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added clipboard-aware shortcuts that respect focusable elements, clone the selected line, and paste a bounded offset copy so duplicates appear instantly.
// 🛠️ EDIT LOG [2025-11-11-C]
// 🔍 WHAT WAS WRONG:
// Arrow heads rendered short of the line’s true endpoint because round caps extended the stroke, and the “block” option still added geometry users didn’t want.
// 🤔 WHY IT HAD TO BE CHANGED:
// Teams expect the default to be a plain line and the arrow variant to snap cleanly to the tip without a visible gap.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Default new lines to the renamed `line` cap and let downstream renderers decide when to add arrow geometry, eliminating unintended caps.
// 🛠️ EDIT LOG [2025-11-11-B]
// 🔍 WHAT WAS WRONG:
// Newly drawn lines defaulted to rounded tips and there was no way to persist an arrow/block selection, so caps reset between edits and exports.
// 🤔 WHY IT HAD TO BE CHANGED:
// Artists need consistent terminal markers; losing the cap choice every time a line is created or selected broke the new annotation workflow.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Capture the end-cap preference on line creation and expose it through the shared updater so UI controls and exporters stay in sync.
// 🛠️ EDIT LOG [2025-11-11-A]
// 🔍 WHAT WAS WRONG:
// Arrow mode offered no resize or curve handles, so adjusting a finished line required deleting it and redrawing from scratch.
// 🤔 WHY IT HAD TO BE CHANGED:
// Rework sessions involve nudging endpoints onto precise anchors and bending strokes to follow artwork; forcing a redraw wasted time and broke alignment.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added hover-aware handles plus endpoint and midpoint drag logic backed by control-point math, so artists can stretch or curve existing lines directly.

// 🛠️ EDIT LOG [2025-11-10-A]
// 🔍 WHAT WAS WRONG:
// The Delete/Backspace keyboard shortcut always removed the active line, even when the user was typing inside form inputs such as the export filename.
// 🤔 WHY IT HAD TO BE CHANGED:
// Designers lost their most recent line right before exporting because editing text fields triggered the deletion handler.
// ✅ WHY THIS SOLUTION WAS PICKED:
// The key listener now ignores Delete/Backspace events that originate from editable controls or when modifier keys are held, preserving line state during text edits.
// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Unscoped keyboard shortcut
// 📂 FILE: hooks/useLinesManager.ts
// 🧾 HISTORY: This issue has now occurred 1 time in this project.
//   - #1 on 2025-11-10 [Guard Delete/Backspace handler against firing inside editable inputs]
// 🚨 Next steps:
// Audit other global shortcuts to ensure they respect focused form elements.

import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  DragState,
  DraftLine,
  LinePoint,
  LineSegment,
  TranslateBounds,
  PathNode,
} from '@/lib/canvas/types';

type UseLinesManagerOptions = {
  color: string;
  lineWidth: number;
  shapeColor: string;
};

type LinePointerHandler = (event: ReactPointerEvent<SVGElement>) => void;
type SurfacePointerHandler = (event: ReactPointerEvent<HTMLDivElement>) => void;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const computeTranslateBounds = (line: LineSegment): TranslateBounds => {
  const xValues = [line.start.x, line.end.x];
  const yValues = [line.start.y, line.end.y];
  if (line.controlPoint) {
    xValues.push(line.controlPoint.x);
    yValues.push(line.controlPoint.y);
  }

  return {
    minXDelta: Math.max(...xValues.map((value) => -value)),
    maxXDelta: Math.min(...xValues.map((value) => 100 - value)),
    minYDelta: Math.max(...yValues.map((value) => -value)),
    maxYDelta: Math.min(...yValues.map((value) => 100 - value)),
  };
};

const resolveDragLineIndex = (lines: LineSegment[], state: DragState) => {
  const candidate = lines[state.lineIndex];
  if (candidate && candidate.id === state.lineId) {
    return state.lineIndex;
  }

  const fallbackIndex = lines.findIndex((line) => line.id === state.lineId);
  if (fallbackIndex !== -1) {
    state.lineIndex = fallbackIndex;
  }
  return fallbackIndex;
};

export type ToolType = 'arrow' | 'line' | 'pen' | 'square' | 'circle';

export function useLinesManager({ color, lineWidth, shapeColor, tool, objectSize }: UseLinesManagerOptions & { tool: ToolType; objectSize: number }) {
  const drawingSurfaceRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSegment[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [draftLine, setDraftLine] = useState<DraftLine | null>(null);
  const draftLineRef = useRef<DraftLine | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const lineCounterRef = useRef(0);
  const clipboardLineRef = useRef<LineSegment | null>(null);

  // Track the active pen path being drawn
  const activePenLineIdRef = useRef<string | null>(null);

  const updateDraftLine = useCallback((next: DraftLine | null) => {
    draftLineRef.current = next;
    setDraftLine(next);
  }, []);

  // Reset active pen line when tool changes
  useEffect(() => {
    if (tool !== 'pen') {
      activePenLineIdRef.current = null;
      setTimeout(() => updateDraftLine(null), 0);
    }
  }, [tool, updateDraftLine]);

  const orderedLines = useMemo(() => {
    return [...lines].sort((a, b) => b.stackOrder - a.stackOrder);
  }, [lines]);

  const selectedLine = useMemo(() => {
    return lines.find((line) => line.id === selectedLineId) ?? null;
  }, [lines, selectedLineId]);

  const getRelativePoint = useCallback((event: ReactPointerEvent<Element>): LinePoint => {
    const surface = drawingSurfaceRef.current;
    if (!surface) {
      return { x: 0, y: 0 };
    }

    const rect = surface.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * 100;
    const relativeY = ((event.clientY - rect.top) / rect.height) * 100;

    return {
      x: Math.min(100, Math.max(0, relativeX)),
      y: Math.min(100, Math.max(0, relativeY)),
    };
  }, []);

  const undoLastLine = useCallback(() => {
    let didUndo = false;

    setLines((prevLines) => {
      if (prevLines.length === 0) {
        return prevLines;
      }

      // If we are drawing a pen line, undoing should remove the last point?
      // For now, let's keep simple undo behavior (remove last object)
      // But if we are in the middle of drawing a pen line, maybe we should remove the last point?
      // The user request didn't specify undo behavior for points.
      // Let's stick to removing the whole object for now to be safe, or check if activePenLineId matches.

      const nextLines = prevLines.slice(0, -1);
      const removedLine = prevLines[prevLines.length - 1];
      didUndo = true;

      if (removedLine.id === activePenLineIdRef.current) {
        activePenLineIdRef.current = null;
        updateDraftLine(null);
      }

      setSelectedLineId((currentSelectedId) => {
        if (currentSelectedId === removedLine.id) {
          const nextSelected = nextLines[nextLines.length - 1];
          return nextSelected ? nextSelected.id : null;
        }

        if (currentSelectedId && !nextLines.some((line) => line.id === currentSelectedId)) {
          return null;
        }

        return currentSelectedId;
      });
      setHoveredLineId((currentHoveredId) =>
        removedLine && currentHoveredId === removedLine.id ? null : currentHoveredId,
      );

      return nextLines;
    });

    return didUndo;
  }, [updateDraftLine]);

  const finalizeLine = useCallback(
    (endPoint: LinePoint, shiftKey: boolean) => {
      const current = draftLineRef.current;
      if (!current) return;

      let finalEnd = endPoint;
      if (shiftKey) {
        const dx = endPoint.x - current.start.x;
        const dy = endPoint.y - current.start.y;

        if (tool === 'line' || tool === 'arrow' || tool === 'pen') {
          // Flatten/Ortho snap logic
          if (Math.abs(dx) > Math.abs(dy)) {
            finalEnd = { x: endPoint.x, y: current.start.y };
          } else {
            finalEnd = { x: current.start.x, y: endPoint.y };
          }
        } else if (tool === 'square' || tool === 'circle') {
          // 1:1 Aspect Ratio
          const size = Math.max(Math.abs(dx), Math.abs(dy));
          finalEnd = {
            x: current.start.x + (dx >= 0 ? size : -size),
            y: current.start.y + (dy >= 0 ? size : -size),
          };
        }
      }

      const deltaX = finalEnd.x - current.start.x;
      const deltaY = finalEnd.y - current.start.y;

      if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) {
        updateDraftLine(null);
        return;
      }

      lineCounterRef.current += 1;
      const nextCount = lineCounterRef.current;

      let points: PathNode[] = [];
      let isClosed = false;

      if (tool === 'square') {
        // Generate rectangle points
        // TL -> TR -> BR -> BL
        const x1 = current.start.x;
        const y1 = current.start.y;
        const x2 = finalEnd.x;
        const y2 = finalEnd.y;

        points = [
          { x: x1, y: y1 },
          { x: x2, y: y1 },
          { x: x2, y: y2 },
          { x: x1, y: y2 }
        ];
        isClosed = true;
      } else if (tool === 'circle') {
        const x1 = Math.min(current.start.x, finalEnd.x);
        const y1 = Math.min(current.start.y, finalEnd.y);
        const w = Math.abs(finalEnd.x - current.start.x);
        const h = Math.abs(finalEnd.y - current.start.y);
        const rx = w / 2;
        const ry = h / 2;
        const cx = x1 + rx;
        const cy = y1 + ry;

        // 4 Segments: Right -> Bottom -> Left -> Top -> Right
        // We use control points to approximate the circle (squircle/oval).
        // The controlPoint property on a node belongs to the segment ENDING at that node.
        // So for the first point (start), we don't have a control point.
        // For subsequent points, we define the control point that leads to them.

        points = [
          { x: cx + rx, y: cy }, // Start (Right) - MoveTo
          {
            x: cx,
            y: cy + ry,
            controlPoint: { x: cx + rx, y: cy + ry }
          }, // Bottom (Curve from Right to Bottom, CP at BR)
          {
            x: cx - rx,
            y: cy,
            controlPoint: { x: cx - rx, y: cy + ry }
          }, // Left (Curve from Bottom to Left, CP at BL)
          {
            x: cx,
            y: cy - ry,
            controlPoint: { x: cx - rx, y: cy - ry }
          }, // Top (Curve from Left to Top, CP at TL)
          {
            x: cx + rx,
            y: cy,
            controlPoint: { x: cx + rx, y: cy - ry }
          }, // Right (Curve from Top to Right, CP at TR)
        ];
        isClosed = true;
      }

      const nextLine: LineSegment = {
        id: `line-${nextCount}`,
        name: tool === 'square' ? `Square ${nextCount}` : tool === 'circle' ? `Circle ${nextCount}` : `Line ${nextCount}`,
        tool: (tool === 'line' || tool === 'arrow') ? 'line' : (tool === 'pen' ? 'pen' : (tool === 'square' ? 'square' : (tool === 'circle' ? 'circle' : 'line'))),
        // Actually, schema.ts LineSegment doesn't strictly enum tools.
        // But `drawObjects` etc don't care about tool.
        // `useLinesManager` state has `tool: string`.
        // Let's store the tool name if it fits.
        // Existing code: tool: 'arrow' | 'line' | 'pen'.
        // I should keep `tool: 'line'` for shapes so they behave like lines?
        // Or extend `LineSegment['tool']`.
        // Let's extend logic to use 'shape' or keep 'line'.
        // If I use 'line', `isClosed` handles the shape nature.
        start: current.start,
        end: finalEnd,
        points: points,
        isClosed: isClosed,
        controlPoint: null,
        stackOrder: nextCount,
        strokeColor: color.toUpperCase(),
        strokeWidth: lineWidth,
        endCap: 'line',
        shapeColor: shapeColor.toUpperCase(),
        shapeType: null,
        shapeCount: 1,
        animateShapes: true,
        objectSize: objectSize,
        isDotted: false,
      };

      setLines((prevLines) => [...prevLines, nextLine]);
      setSelectedLineId(nextLine.id);
      updateDraftLine(null);
    },
    [color, lineWidth, shapeColor, updateDraftLine, tool],
  );

  const handleSurfacePointerDown: SurfacePointerHandler = useCallback(
    (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();

      const target = event.currentTarget;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      target.setPointerCapture(event.pointerId);

      const startPoint = getRelativePoint(event);

      if (tool === 'pen') {
        const activeId = activePenLineIdRef.current;

        if (activeId) {
          // Check if we should close the path
          const activeLine = lines.find(l => l.id === activeId);
          if (activeLine && activeLine.points.length > 0) {
            const firstPoint = activeLine.points[0];
            const distance = Math.hypot(startPoint.x - firstPoint.x, startPoint.y - firstPoint.y);
            const CLOSURE_THRESHOLD = 5; // Distance threshold for closing the path

            if (distance < CLOSURE_THRESHOLD && activeLine.points.length >= 2) {
              // Close the path
              setLines((prev) => prev.map(line => {
                if (line.id === activeId) {
                  return {
                    ...line,
                    isClosed: true
                  };
                }
                return line;
              }));

              // Reset active pen line and draft
              activePenLineIdRef.current = null;
              updateDraftLine(null);
              return;
            }
          }

          // Add point to existing pen line (preserve exact placement)
          setLines((prev) => prev.map(line => {
            if (line.id === activeId) {
              return {
                ...line,
                points: [...line.points, { ...startPoint }]
              };
            }
            return line;
          }));

          // Update draft line to start from this new point
          updateDraftLine({
            start: startPoint,
            end: startPoint,
            isShiftLocked: event.shiftKey,
          });
        } else {
          // Start new pen line
          lineCounterRef.current += 1;
          const nextCount = lineCounterRef.current;
          const newId = `line-${nextCount}`;

          const newLine: LineSegment = {
            id: newId,
            name: `Path ${nextCount}`,
            tool: 'pen',
            start: startPoint, // Not used for pen but kept for types
            end: startPoint,   // Not used for pen but kept for types
            points: [{ ...startPoint }],
            isClosed: false,
            controlPoint: null,
            stackOrder: nextCount,
            strokeColor: color.toUpperCase(),
            strokeWidth: lineWidth,
            endCap: 'line',
            shapeColor: shapeColor.toUpperCase(),
            shapeType: null,
            shapeCount: 1,
            animateShapes: true,
            objectSize: objectSize,
            isDotted: false,
          };

          setLines(prev => [...prev, newLine]);
          setSelectedLineId(newId);
          activePenLineIdRef.current = newId;

          updateDraftLine({
            start: startPoint,
            end: startPoint,
            isShiftLocked: event.shiftKey,
          });
        }
        return;
      }

      // Normal Line Tool Logic
      updateDraftLine({
        start: startPoint,
        end: startPoint,
        isShiftLocked: event.shiftKey,
      });
    },
    [getRelativePoint, updateDraftLine, tool, color, lineWidth, shapeColor, lines],
  );

  const handleSurfacePointerMove: SurfacePointerHandler = useCallback(
    (event) => {
      const current = draftLineRef.current;
      if (!current) return;

      event.preventDefault();

      const nextEnd = getRelativePoint(event);
      const isShiftLocked = event.shiftKey || current.isShiftLocked;

      let finalEnd = nextEnd;
      if (isShiftLocked) {
        const dx = nextEnd.x - current.start.x;
        const dy = nextEnd.y - current.start.y;

        if (tool === 'line' || tool === 'arrow' || tool === 'pen') {
          // Ortho snap
          if (Math.abs(dx) > Math.abs(dy)) {
            finalEnd = { x: nextEnd.x, y: current.start.y };
          } else {
            finalEnd = { x: current.start.x, y: nextEnd.y };
          }
        } else if (tool === 'square' || tool === 'circle') {
          // 1:1 Aspect Ratio
          const size = Math.max(Math.abs(dx), Math.abs(dy));
          finalEnd = {
            x: current.start.x + (dx >= 0 ? size : -size),
            y: current.start.y + (dy >= 0 ? size : -size)
          };
        }
      }

      updateDraftLine({
        start: current.start,
        end: finalEnd,
        isShiftLocked,
      });
    },
    [getRelativePoint, updateDraftLine, tool],
  );

  const handleSurfacePointerUp: SurfacePointerHandler = useCallback(
    (event) => {
      if (tool === 'pen') {
        // Pen tool doesn't finish on mouse up, it waits for next click
        return;
      }

      const current = draftLineRef.current;
      if (!current) return;

      event.preventDefault();

      const target = event.currentTarget;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }

      const endPoint = getRelativePoint(event);
      finalizeLine(endPoint, event.shiftKey || current.isShiftLocked);
    },
    [finalizeLine, getRelativePoint, tool],
  );

  const handleSurfacePointerLeave: SurfacePointerHandler = useCallback(
    (event) => {
      if (tool === 'pen') return; // Don't auto-finish pen lines on leave

      const current = draftLineRef.current;
      if (!current) return;

      const endPoint = getRelativePoint(event);
      finalizeLine(endPoint, event.shiftKey || current.isShiftLocked);
    },
    [finalizeLine, getRelativePoint, tool],
  );

  const handleLinePointerDown: LinePointerHandler = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();

      const lineId = event.currentTarget.dataset.lineId;
      if (!lineId) return;

      // If we are in pen mode and click on a line, maybe we want to select it?
      // Or if we are in arrow mode, we want to edit it.
      if (tool !== 'arrow') return;

      const targetHandle = (event.currentTarget.dataset.handleKind as DragState['kind']) ?? 'translate';
      const pointIndexStr = event.currentTarget.dataset.pointIndex;
      const pointIndex = pointIndexStr ? parseInt(pointIndexStr, 10) : undefined;

      setSelectedLineId(lineId);
      setHoveredLineId(lineId);

      const pointerPoint = getRelativePoint(event);
      const lineIndex = lines.findIndex((existing) => existing.id === lineId);
      if (lineIndex === -1) return;
      const line = lines[lineIndex];

      dragStateRef.current = {
        lineId,
        pointerId: event.pointerId,
        kind: targetHandle,
        pointerStart: pointerPoint,
        lineStart: line.start,
        lineEnd: line.end,
        controlPoint: line.controlPoint,
        lineIndex,
        translateBounds: targetHandle === 'translate' ? computeTranslateBounds(line) : null,
        pointIndex,
        pointStart: pointIndex !== undefined && line.points[pointIndex] ? { ...line.points[pointIndex] } : undefined,
      };

      const target = event.currentTarget;
      if (!target.hasPointerCapture(event.pointerId)) {
        target.setPointerCapture(event.pointerId);
      }
    },
    [getRelativePoint, lines, tool],
  );

  const handleLinePointerMove: LinePointerHandler = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      event.preventDefault();

      const nextPointer = getRelativePoint(event);

      if (dragState.kind === 'point' && dragState.pointIndex !== undefined) {
        setLines((prevLines) => {
          const resolvedIndex = resolveDragLineIndex(prevLines, dragState);
          if (resolvedIndex === -1) return prevLines;

          const existing = prevLines[resolvedIndex];
          if (!existing.points || !existing.points[dragState.pointIndex!]) return prevLines;

          // Scaling Logic for Shapes
          if (event.shiftKey && (existing.tool === 'square' || existing.tool === 'circle')) {
            const points = existing.points;
            if (points.length < 4) return prevLines; // Shapes need at least 4 points

            let anchorIndex = -1;
            const idx = dragState.pointIndex!;

            if (existing.tool === 'square') {
              // Square: 0:TL, 1:TR, 2:BR, 3:BL
              // Anchor is opposite corner
              anchorIndex = (idx + 2) % 4;
            } else if (existing.tool === 'circle') {
              // Circle: 5 points (0=Right, 1=Bottom, 2=Left, 3=Top, 4=Right)
              // Cardinal dragging
              // If dragging 0 or 4 (R) -> Anchor 2 (L)
              // If dragging 1 (B) -> Anchor 3 (T)
              // If dragging 2 (L) -> Anchor 0 (R)
              // If dragging 3 (T) -> Anchor 1 (B)
              if (idx === 0 || idx === 4) anchorIndex = 2;
              else if (idx === 1) anchorIndex = 3;
              else if (idx === 2) anchorIndex = 0;
              else if (idx === 3) anchorIndex = 1;
            }

            if (anchorIndex !== -1 && points[anchorIndex]) {
              const anchor = points[anchorIndex];
              const originalPoint = points[idx];

              // Vector from anchor to original draggable point
              const vOriginalX = originalPoint.x - anchor.x;
              const vOriginalY = originalPoint.y - anchor.y;
              const originalDist = Math.hypot(vOriginalX, vOriginalY);

              // Vector from anchor to current mouse position
              const vCurrentX = nextPointer.x - anchor.x;
              const vCurrentY = nextPointer.y - anchor.y;
              const currentDist = Math.hypot(vCurrentX, vCurrentY);

              if (originalDist < 0.001) return prevLines; // Avoid div by zero

              // Determine scale factor
              // We can just use the ratio of distances for simple uniform scaling
              // To handle direction, we can project current onto original vector, but visual dragging
              // usually implies just magnitude scaling if we want to follow the mouse "outward" or "inward"
              // Correct logic using projection to allow "negative" scale if flipped?
              // For now, assume positive scale magnitude (resizing, not flipping handled here simplified)

              // Better: Project vCurrent onto vOriginal to find how far along the original diagonal we are
              const dot = vCurrentX * vOriginalX + vCurrentY * vOriginalY;
              const scale = dot / (originalDist * originalDist);

              // Apply scale to ALL points relative to anchor
              const nextPoints = points.map(p => {
                const dx = p.x - anchor.x;
                const dy = p.y - anchor.y;
                let newControl: { x: number, y: number } | undefined = undefined;

                if (p.controlPoint) {
                  const cdx = p.controlPoint.x - anchor.x;
                  const cdy = p.controlPoint.y - anchor.y;
                  newControl = {
                    x: anchor.x + cdx * scale,
                    y: anchor.y + cdy * scale
                  };
                }

                return {
                  ...p,
                  x: anchor.x + dx * scale,
                  y: anchor.y + dy * scale,
                  controlPoint: newControl
                };
              });

              const nextLines = prevLines.slice();
              nextLines[resolvedIndex] = {
                ...existing,
                points: nextPoints
              };
              return nextLines;
            }
          }

          // Fallback to standard point dragging
          const nextLines = prevLines.slice();
          const nextPoints = [...existing.points];
          nextPoints[dragState.pointIndex!] = {
            ...nextPoints[dragState.pointIndex!],
            x: nextPointer.x,
            y: nextPointer.y,
          };

          nextLines[resolvedIndex] = {
            ...existing,
            points: nextPoints
          };
          return nextLines;
        });
        return;
      }

      if (dragState.kind === 'segment_control' && dragState.pointIndex !== undefined) {
        setLines((prevLines) => {
          const resolvedIndex = resolveDragLineIndex(prevLines, dragState);
          if (resolvedIndex === -1) return prevLines;

          const existing = prevLines[resolvedIndex];
          if (!existing.points || !existing.points[dragState.pointIndex!]) return prevLines;

          const nextLines = prevLines.slice();
          const nextPoints = [...existing.points];
          nextPoints[dragState.pointIndex!] = {
            ...nextPoints[dragState.pointIndex!],
            controlPoint: { x: nextPointer.x, y: nextPointer.y }
          };

          nextLines[resolvedIndex] = {
            ...existing,
            points: nextPoints
          };
          return nextLines;
        });
        return;
      }

      if (dragState.kind === 'translate') {
        const bounds = dragState.translateBounds;
        const rawDeltaX = nextPointer.x - dragState.pointerStart.x;
        const rawDeltaY = nextPointer.y - dragState.pointerStart.y;
        const deltaX =
          bounds !== null ? clamp(rawDeltaX, bounds.minXDelta, bounds.maxXDelta) : rawDeltaX;
        const deltaY =
          bounds !== null ? clamp(rawDeltaY, bounds.minYDelta, bounds.maxYDelta) : rawDeltaY;

        setLines((prevLines) => {
          const resolvedIndex = resolveDragLineIndex(prevLines, dragState);
          if (resolvedIndex === -1) {
            return prevLines;
          }

          const existing = prevLines[resolvedIndex];

          // Handle Pen Path Translation
          if (existing.tool === 'pen') {
            const nextLines = prevLines.slice();
            nextLines[resolvedIndex] = {
              ...existing,
              points: existing.points.map(p => ({
                ...p,
                x: p.x + deltaX,
                y: p.y + deltaY,
                controlPoint: p.controlPoint ? {
                  x: p.controlPoint.x + deltaX,
                  y: p.controlPoint.y + deltaY
                } : undefined
              }))
            };
            return nextLines;
          }

          const nextLine: LineSegment = {
            ...existing,
            start: {
              x: dragState.lineStart.x + deltaX,
              y: dragState.lineStart.y + deltaY,
            },
            end: {
              x: dragState.lineEnd.x + deltaX,
              y: dragState.lineEnd.y + deltaY,
            },
            controlPoint: dragState.controlPoint
              ? {
                x: dragState.controlPoint.x + deltaX,
                y: dragState.controlPoint.y + deltaY,
              }
              : null,
          };

          const controlPointChanged =
            (existing.controlPoint === null && nextLine.controlPoint !== null) ||
            (existing.controlPoint !== null &&
              nextLine.controlPoint !== null &&
              (existing.controlPoint.x !== nextLine.controlPoint.x ||
                existing.controlPoint.y !== nextLine.controlPoint.y));

          if (
            existing.start.x === nextLine.start.x &&
            existing.start.y === nextLine.start.y &&
            existing.end.x === nextLine.end.x &&
            existing.end.y === nextLine.end.y &&
            !controlPointChanged
          ) {
            return prevLines;
          }

          const nextLines = prevLines.slice();
          nextLines[resolvedIndex] = nextLine;
          return nextLines;
        });
        return;
      }

      if (dragState.kind === 'start') {
        setLines((prevLines) => {
          const resolvedIndex = resolveDragLineIndex(prevLines, dragState);
          if (resolvedIndex === -1) {
            return prevLines;
          }

          const existing = prevLines[resolvedIndex];
          if (existing.start.x === nextPointer.x && existing.start.y === nextPointer.y) {
            return prevLines;
          }

          const nextLines = prevLines.slice();
          nextLines[resolvedIndex] = {
            ...existing,
            start: { ...nextPointer },
          };
          return nextLines;
        });
        return;
      }

      if (dragState.kind === 'end') {
        setLines((prevLines) => {
          const resolvedIndex = resolveDragLineIndex(prevLines, dragState);
          if (resolvedIndex === -1) {
            return prevLines;
          }

          const existing = prevLines[resolvedIndex];
          if (existing.end.x === nextPointer.x && existing.end.y === nextPointer.y) {
            return prevLines;
          }

          const nextLines = prevLines.slice();
          nextLines[resolvedIndex] = {
            ...existing,
            end: { ...nextPointer },
          };
          return nextLines;
        });
        return;
      }

      if (dragState.kind === 'control') {
        dragState.controlPoint = { ...nextPointer };
        setLines((prevLines) => {
          const resolvedIndex = resolveDragLineIndex(prevLines, dragState);
          if (resolvedIndex === -1) {
            return prevLines;
          }

          const existing = prevLines[resolvedIndex];
          if (
            existing.controlPoint &&
            existing.controlPoint.x === nextPointer.x &&
            existing.controlPoint.y === nextPointer.y
          ) {
            return prevLines;
          }

          const nextLines = prevLines.slice();
          nextLines[resolvedIndex] = {
            ...existing,
            controlPoint: { ...nextPointer },
          };
          return nextLines;
        });
      }
    },
    [getRelativePoint],
  );

  const releasePointerCapture = useCallback((event: ReactPointerEvent<SVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleLinePointerUp: LinePointerHandler = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      event.preventDefault();
      releasePointerCapture(event);
      dragStateRef.current = null;
    },
    [releasePointerCapture],
  );

  const handleLinePointerCancel: LinePointerHandler = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      releasePointerCapture(event);
      dragStateRef.current = null;
    },
    [releasePointerCapture],
  );

  const handleLinePointerEnter = useCallback((lineId: string | null) => {
    if (lineId === null) {
      setHoveredLineId(null);
    } else {
      setHoveredLineId(lineId);
    }
  }, []);

  const handleLinePointerLeave = useCallback((lineId: string) => {
    setHoveredLineId((current) => {
      if (dragStateRef.current && dragStateRef.current.lineId === lineId) {
        return current;
      }
      return current === lineId ? null : current;
    });
  }, []);

  const updateSelectedLineProperties = useCallback(
    (
      next: Partial<
        Pick<
          LineSegment,
          | 'strokeColor'
          | 'strokeWidth'
          | 'endCap'
          | 'shapeType'
          | 'shapeCount'
          | 'animateShapes'
          | 'shapeColor'
          | 'isDotted'
          | 'objectSize'
        >
      >,
    ) => {
      if (!selectedLineId) return;
      setLines((prevLines) =>
        prevLines.map((line) =>
          line.id === selectedLineId
            ? {
              ...line,
              ...next,
            }
            : line,
        ),
      );
    },
    [selectedLineId],
  );

  useEffect(() => {
    const isEditableElement = (element: EventTarget | null): element is HTMLElement => {
      if (!element || !(element instanceof HTMLElement)) {
        return false;
      }

      if (element.isContentEditable) {
        return true;
      }

      const tagName = element.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
      }

      const role = element.getAttribute('role');
      return role === 'textbox' || role === 'combobox' || role === 'spinbutton';
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const { target } = event;
      const activeElement = document.activeElement;

      if (isEditableElement(target) || isEditableElement(activeElement)) {
        return;
      }

      const metaOnly = event.metaKey && !event.ctrlKey && !event.altKey;
      const key = event.key.toLowerCase();

      if ((event.key === 'Delete' || event.key === 'Backspace') && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (!selectedLineId) {
          return;
        }
        event.preventDefault();
        setLines((prev) => prev.filter((line) => line.id !== selectedLineId));
        setSelectedLineId(null);
        setHoveredLineId((currentHoveredId) => (currentHoveredId === selectedLineId ? null : currentHoveredId));
        return;
      }

      if (metaOnly && key === 'c') {
        if (!selectedLine) {
          return;
        }
        event.preventDefault();
        clipboardLineRef.current = {
          ...selectedLine,
          start: { ...selectedLine.start },
          end: { ...selectedLine.end },
          points: selectedLine.points ? selectedLine.points.map(p => ({ ...p })) : [],
          controlPoint: selectedLine.controlPoint ? { ...selectedLine.controlPoint } : null,
        };
        return;
      }

      if (metaOnly && key === 'v') {
        const copied = clipboardLineRef.current;
        if (!copied) {
          return;
        }
        event.preventDefault();
        const delta = 3;
        const shiftWithinBounds = (value: number) => {
          const grow = value + delta;
          if (grow <= 100) {
            return grow;
          }
          const shrink = value - delta;
          return shrink >= 0 ? shrink : value;
        };

        const offsetPoint = (point: LinePoint | null): LinePoint | null => {
          if (!point) {
            return null;
          }
          return {
            x: shiftWithinBounds(point.x),
            y: shiftWithinBounds(point.y),
          };
        };

        lineCounterRef.current += 1;
        const nextOrder = lineCounterRef.current;
        const nextLine: LineSegment = {
          ...copied,
          id: `line-${nextOrder}`,
          name: `Line ${nextOrder}`,
          stackOrder: nextOrder,
          start: offsetPoint(copied.start)!,
          end: offsetPoint(copied.end)!,
          points: copied.points ? copied.points.map(p => ({ ...p, x: shiftWithinBounds(p.x), y: shiftWithinBounds(p.y) })) : [],
          isClosed: copied.isClosed ?? false,
          controlPoint: offsetPoint(copied.controlPoint),
        };

        setLines((prev) => [...prev, nextLine]);
        setSelectedLineId(nextLine.id);
        setHoveredLineId(nextLine.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLineId, selectedLine]);

  return {
    drawingSurfaceRef,
    lines,
    orderedLines,
    draftLine,
    selectedLine,
    selectedLineId,
    hoveredLineId,
    setSelectedLineId,
    handleSurfacePointerDown,
    handleSurfacePointerMove,
    handleSurfacePointerUp,
    handleSurfacePointerLeave,
    handleLinePointerDown,
    handleLinePointerMove,
    handleLinePointerUp,
    handleLinePointerCancel,
    handleLinePointerEnter,
    handleLinePointerLeave,
    undoLastLine,
    updateDraftLine,
    updateSelectedLineProperties,
  };
}

