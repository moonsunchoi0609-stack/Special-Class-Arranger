import React from 'react';
import { Pencil, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { Student, TagDefinition } from '../types';
import { TagBadge } from './TagBadge';

interface StudentCardProps {
  student: Student;
  allTags: TagDefinition[];
  isWarning?: boolean;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  // New props for touch drag
  onTouchDragStart?: (student: Student, e: React.TouchEvent, cardRect: DOMRect) => void;
  isGhost?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  allTags,
  isWarning,
  onEdit,
  onDelete,
  onTouchDragStart,
  isGhost
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('studentId', student.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      // Prevent browser scroll when touching the grip
      // But we let the App level handler decide if it should preventDefault (it does in touchmove)
      e.stopPropagation(); 
      if (onTouchDragStart) {
          const cardElement = e.currentTarget.closest('.student-card-container');
          if (cardElement) {
              const rect = cardElement.getBoundingClientRect();
              onTouchDragStart(student, e, rect);
          }
      }
  };

  // Sort tags based on the order in allTags
  const studentTags = allTags
    .filter(tag => student.tagIds.includes(tag.id));

  return (
    <div
      draggable={!isGhost}
      onDragStart={handleDragStart}
      className={`
        student-card-container
        relative group flex flex-col bg-white border rounded-lg p-3 mb-2 transition-all
        ${isGhost ? 'shadow-xl ring-2 ring-indigo-500 bg-indigo-50 opacity-90 scale-105' : 'shadow-sm hover:shadow-md'}
        ${!isGhost && 'cursor-grab active:cursor-grabbing'}
        ${isWarning ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1">
          {/* Grip Handle: Larger touch area for mobile */}
          {!isGhost && (
              <div 
                className="p-1 -ml-1 mr-1 text-gray-400 cursor-grab touch-none"
                onTouchStart={handleTouchStart}
              >
                 <GripVertical size={16} />
              </div>
          )}
          <span className="font-bold text-gray-800">{student.name}</span>
          {isWarning && <AlertTriangle size={16} className="text-red-500 ml-1" />}
        </div>
        {!isGhost && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => onEdit(student)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
                title="수정"
            >
                <Pencil size={14} />
            </button>
            {!student.assignedClassId && (
                <button
                onClick={() => onDelete(student.id)}
                className="p-1 hover:bg-red-100 rounded text-red-500"
                title="삭제"
            >
                <Trash2 size={14} />
            </button>
            )}
            </div>
        )}
      </div>
      
      <div className="flex flex-wrap">
        {studentTags.map(tag => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>
    </div>
  );
};