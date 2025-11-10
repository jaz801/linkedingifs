'use client';

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

type LinePointerHandler = (event: ReactPointerEvent<SVGLineElement>) => void;
type SurfacePointerHandler = (event: ReactPointerEvent<HTMLDivElement>) => void;

export function useLinesManager({ color, lineWidth, shapeColor }: UseLinesManagerOptions) {
  const drawingSurfaceRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSegment[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
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
        stackOrder: nextCount,
        strokeColor: color.toUpperCase(),
        strokeWidth: lineWidth,
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

      setSelectedLineId(lineId);

      const pointerPoint = getRelativePoint(event);
      const line = lines.find((existing) => existing.id === lineId);
      if (!line) return;

      dragStateRef.current = {
        lineId,
        pointerId: event.pointerId,
        pointerStart: pointerPoint,
        lineStart: line.start,
        lineEnd: line.end,
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
      const clampDelta = (delta: number, startValue: number, endValue: number) => {
        const minDelta = Math.max(-startValue, -endValue);
        const maxDelta = Math.min(100 - startValue, 100 - endValue);
        return Math.min(Math.max(delta, minDelta), maxDelta);
      };

      let deltaX = nextPointer.x - dragState.pointerStart.x;
      let deltaY = nextPointer.y - dragState.pointerStart.y;
      deltaX = clampDelta(deltaX, dragState.lineStart.x, dragState.lineEnd.x);
      deltaY = clampDelta(deltaY, dragState.lineStart.y, dragState.lineEnd.y);

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
              }
            : existing,
        ),
      );
    },
    [getRelativePoint],
  );

  const releasePointerCapture = useCallback((event: ReactPointerEvent<SVGLineElement>) => {
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

  const updateSelectedLineProperties = useCallback(
    (
      next: Partial<
        Pick<
          LineSegment,
          | 'strokeColor'
          | 'strokeWidth'
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
    setSelectedLineId,
    handleSurfacePointerDown,
    handleSurfacePointerMove,
    handleSurfacePointerUp,
    handleSurfacePointerLeave,
    handleLinePointerDown,
    handleLinePointerMove,
    handleLinePointerUp,
    handleLinePointerCancel,
    undoLastLine,
    updateDraftLine,
    updateSelectedLineProperties,
  };
}

