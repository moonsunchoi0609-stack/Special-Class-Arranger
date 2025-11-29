import { useState, useEffect } from 'react';
import { Student } from '../types';
import { UNASSIGNED_ID } from '../constants';

interface TouchDragState {
  student: Student;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  width: number;
  height: number;
}

export const useTouchDrag = (
  onDropStudent: (studentId: string, targetClassId: string) => void
) => {
  const [touchDragState, setTouchDragState] = useState<TouchDragState | null>(null);

  const onTouchDragStart = (student: Student, e: React.TouchEvent, cardRect: DOMRect) => {
    const touch = e.touches[0];
    setTouchDragState({
      student,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      width: cardRect.width,
      height: cardRect.height
    });
  };

  useEffect(() => {
    if (!touchDragState) return;

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault(); // Stop scrolling while dragging
      const touch = e.touches[0];
      setTouchDragState(prev => prev ? ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY
      }) : null);
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = target?.closest('[data-drop-zone]');
      
      if (dropZone && touchDragState) {
        const zoneId = dropZone.getAttribute('data-drop-zone');
        // 'unassigned' is the ID for the unassigned area
        const targetClassId = zoneId === UNASSIGNED_ID ? '' : zoneId;
        
        if (targetClassId !== null) {
            onDropStudent(touchDragState.student.id, targetClassId);
        }
      }
      setTouchDragState(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [touchDragState, onDropStudent]);

  return {
    touchDragState,
    onTouchDragStart
  };
};