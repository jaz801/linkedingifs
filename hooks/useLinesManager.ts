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

export function useLinesManager({ color, lineWidth, shapeColor }: UseLinesManagerOptions) {
  const drawingSurfaceRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSegment[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [draftLine, setDraftLine] = useState<DraftLine | null>(null);
  const draftLineRef = useRef<DraftLine | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const lineCounterRef = useRef(0);
  const clipboardLineRef = useRef<LineSegment | null>(null);

  const updateDraftLine = useCallback((next: DraftLine | null) => {
    draftLineRef.current = next;
    setDraftLine(next);
  }, []);

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

      const nextLines = prevLines.slice(0, -1);
      const removedLine = prevLines[prevLines.length - 1];
      didUndo = true;

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
  }, []);

  const finalizeLine = useCallback(
    (endPoint: LinePoint, shiftKey: boolean) => {
      const current = draftLineRef.current;
      if (!current) return;

      const finalEnd = shiftKey ? { x: endPoint.x, y: current.start.y } : endPoint;
      const deltaX = finalEnd.x - current.start.x;
      const deltaY = finalEnd.y - current.start.y;

      if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) {
        updateDraftLine(null);
        return;
      }

      lineCounterRef.current += 1;
      const nextCount = lineCounterRef.current;
      const nextLine: LineSegment = {
        id: `line-${nextCount}`,
        name: `Line ${nextCount}`,
        start: current.start,
        end: finalEnd,
        controlPoint: null,
        stackOrder: nextCount,
        strokeColor: color.toUpperCase(),
        strokeWidth: lineWidth,
        endCap: 'line',
        shapeColor: shapeColor.toUpperCase(),
        shapeType: null,
        shapeCount: 1,
        animateShapes: true,
      };

      setLines((prevLines) => [...prevLines, nextLine]);
      setSelectedLineId(nextLine.id);
      updateDraftLine(null);
    },
    [color, lineWidth, shapeColor, updateDraftLine],
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

      updateDraftLine({
        start: startPoint,
        end: startPoint,
        isShiftLocked: event.shiftKey,
      });
    },
    [getRelativePoint, updateDraftLine],
  );

  const handleSurfacePointerMove: SurfacePointerHandler = useCallback(
    (event) => {
      const current = draftLineRef.current;
      if (!current) return;

      event.preventDefault();

      const nextEnd = getRelativePoint(event);
      const isShiftLocked = event.shiftKey || current.isShiftLocked;

      updateDraftLine({
        start: current.start,
        end: isShiftLocked ? { x: nextEnd.x, y: current.start.y } : nextEnd,
        isShiftLocked,
      });
    },
    [getRelativePoint, updateDraftLine],
  );

  const handleSurfacePointerUp: SurfacePointerHandler = useCallback(
    (event) => {
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
    [finalizeLine, getRelativePoint],
  );

  const handleSurfacePointerLeave: SurfacePointerHandler = useCallback(
    (event) => {
      const current = draftLineRef.current;
      if (!current) return;

      const endPoint = getRelativePoint(event);
      finalizeLine(endPoint, event.shiftKey || current.isShiftLocked);
    },
    [finalizeLine, getRelativePoint],
  );

  const handleLinePointerDown: LinePointerHandler = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();

      const lineId = event.currentTarget.dataset.lineId;
      if (!lineId) return;

      const targetHandle = (event.currentTarget.dataset.handleKind as DragState['kind']) ?? 'translate';

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
      };

      const target = event.currentTarget;
      if (!target.hasPointerCapture(event.pointerId)) {
        target.setPointerCapture(event.pointerId);
      }
    },
    [getRelativePoint, lines],
  );

  const handleLinePointerMove: LinePointerHandler = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      event.preventDefault();

      const nextPointer = getRelativePoint(event);
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

