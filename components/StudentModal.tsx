import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Student, TagDefinition } from '../types';
import { TagBadge } from './TagBadge';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, gender: 'male' | 'female' | undefined, tags: string[]) => void;
  editingStudent: Student | null;
  tags: TagDefinition[];
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingStudent,
  tags
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | undefined>(undefined);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (editingStudent) {
        setName(editingStudent.name);
        setGender(editingStudent.gender);
        setSelectedTagIds(editingStudent.tagIds);
      } else {
        setName('');
        setGender(undefined);
        setSelectedTagIds([]);
      }
    }
  }, [isOpen, editingStudent]);

  if (!isOpen) return null;

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, gender, selectedTagIds);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            {editingStudent ? '학생 정보 수정' : '새 학생 등록'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Name and Gender Row */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학생 정보</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름 입력"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
                <label 
                  className={`
                    cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1
                    ${gender === 'male' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}
                  `}
                >
                  <input 
                    type="radio" 
                    name="gender" 
                    value="male" 
                    checked={gender === 'male'} 
                    onChange={() => setGender('male')}
                    className="hidden" 
                  />
                  남
                </label>
                <div className="w-px h-4 bg-gray-300 mx-0.5"></div>
                <label 
                  className={`
                    cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1
                    ${gender === 'female' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}
                  `}
                >
                  <input 
                    type="radio" 
                    name="gender" 
                    value="female" 
                    checked={gender === 'female'} 
                    onChange={() => setGender('female')}
                    className="hidden" 
                  />
                  여
                </label>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">특성 Tag (선택)</label>
            </div>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
              {tags.map(tag => (
                <TagBadge 
                  key={tag.id} 
                  tag={tag} 
                  onClick={() => toggleTag(tag.id)}
                  className={`
                    cursor-pointer text-sm py-1 px-3 rounded-full border transition-all
                    ${selectedTagIds.includes(tag.id) 
                      ? 'ring-2 ring-indigo-500 ring-offset-1 font-bold shadow-sm' 
                      : 'opacity-60 hover:opacity-100 hover:bg-white'}
                  `}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
          >
            {editingStudent ? '수정 완료' : '등록하기'}
          </button>
        </div>
      </div>
    </div>
  );
};