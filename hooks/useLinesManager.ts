'use client';

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

import type { DragState, DraftLine, LinePoint, LineSegment } from '@/lib/canvas/types';

type UseLinesManagerOptions = {
  color: string;
  lineWidth: number;
  shapeColor: string;
};

type LinePointerHandler = (event: ReactPointerEvent<SVGElement>) => void;
type SurfacePointerHandler = (event: ReactPointerEvent<HTMLDivElement>) => void;

export function useLinesManager({ color, lineWidth, shapeColor }: UseLinesManagerOptions) {
  const drawingSurfaceRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSegment[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [draftLine, setDraftLine] = useState<DraftLine | null>(null);
  const draftLineRef = useRef<DraftLine | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const lineCounterRef = useRef(0);

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
      const line = lines.find((existing) => existing.id === lineId);
      if (!line) return;

      dragStateRef.current = {
        lineId,
        pointerId: event.pointerId,
        kind: targetHandle,
        pointerStart: pointerPoint,
        lineStart: line.start,
        lineEnd: line.end,
        controlPoint: line.controlPoint,
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
        const baseXValues = [dragState.lineStart.x, dragState.lineEnd.x];
        const baseYValues = [dragState.lineStart.y, dragState.lineEnd.y];
        if (dragState.controlPoint) {
          baseXValues.push(dragState.controlPoint.x);
          baseYValues.push(dragState.controlPoint.y);
        }

        const clampDelta = (delta: number, baseValues: number[]) => {
          if (baseValues.length === 0) {
            return delta;
          }
          const minDelta = Math.max(...baseValues.map((value) => -value));
          const maxDelta = Math.min(...baseValues.map((value) => 100 - value));
          return Math.min(Math.max(delta, minDelta), maxDelta);
        };

        let deltaX = nextPointer.x - dragState.pointerStart.x;
        let deltaY = nextPointer.y - dragState.pointerStart.y;
        deltaX = clampDelta(deltaX, baseXValues);
        deltaY = clampDelta(deltaY, baseYValues);

        setLines((prevLines) =>
          prevLines.map((existing) =>
            existing.id === dragState.lineId
              ? {
                  ...existing,
                  start: {
                    x: dragState.lineStart.x + deltaX,
                    y: dragState.lineStart.y + deltaY,
                  },
                  end: {
                    x: dragState.lineEnd.x + deltaX,
                    y: dragState.lineEnd.y + deltaY,
                  },
                  controlPoint: existing.controlPoint
                    ? {
                        x: existing.controlPoint.x + deltaX,
                        y: existing.controlPoint.y + deltaY,
                      }
                    : dragState.controlPoint
                      ? {
                          x: dragState.controlPoint.x + deltaX,
                          y: dragState.controlPoint.y + deltaY,
                        }
                      : null,
                }
              : existing,
          ),
        );
        return;
      }

      if (dragState.kind === 'start') {
        setLines((prevLines) =>
          prevLines.map((existing) =>
            existing.id === dragState.lineId
              ? {
                  ...existing,
                  start: nextPointer,
                }
              : existing,
          ),
        );
        return;
      }

      if (dragState.kind === 'end') {
        setLines((prevLines) =>
          prevLines.map((existing) =>
            existing.id === dragState.lineId
              ? {
                  ...existing,
                  end: nextPointer,
                }
              : existing,
          ),
        );
        return;
      }

      if (dragState.kind === 'control') {
        dragState.controlPoint = nextPointer;
        setLines((prevLines) =>
          prevLines.map((existing) =>
            existing.id === dragState.lineId
              ? {
                  ...existing,
                  controlPoint: nextPointer,
                }
              : existing,
          ),
        );
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
    if (!selectedLineId) return;

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
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const { target } = event;
      const activeElement = document.activeElement;

      if (isEditableElement(target) || isEditableElement(activeElement)) {
        return;
      }

      setLines((prev) => prev.filter((line) => line.id !== selectedLineId));
      setSelectedLineId(null);
      setHoveredLineId((currentHoveredId) => (currentHoveredId === selectedLineId ? null : currentHoveredId));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLineId]);

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

