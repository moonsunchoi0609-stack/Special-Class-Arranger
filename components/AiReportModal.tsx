import React from 'react';
import { X, Wand2 } from 'lucide-react';

interface AiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: string;
}

export const AiReportModal: React.FC<AiReportModalProps> = ({ isOpen, onClose, analysisResult }) => {
  if (!isOpen) return null;

  const renderAnalysisText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Wand2 size={20} className="text-purple-200" />
            AI 반편성 분석 결과
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
           <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed bg-white p-6 rounded-lg shadow-sm border border-purple-100 text-base">
               {renderAnalysisText(analysisResult)}
           </div>
        </div>
        
        <div className="p-4 border-t bg-white flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
