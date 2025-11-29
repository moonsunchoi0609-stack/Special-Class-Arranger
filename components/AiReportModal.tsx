import React, { useState, useMemo } from 'react';
import { 
  X, Wand2, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, 
  User, Star, Activity, ThumbsUp, ArrowLeftRight, LayoutDashboard, ChevronDown, ChevronUp, RefreshCcw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { AiAnalysisResult, Student, TagDefinition, AiMovement } from '../types';

interface AiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AiAnalysisResult | string | null;
  students?: Student[];
  tags?: TagDefinition[];
  classCount?: number;
  onReanalyze?: () => void;
  isLoading?: boolean;
}

// Local helper to match mask logic from service
const maskName = (name: string): string => {
  if (!name) return '';
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '○';
  return name[0] + '○' + name.slice(2);
};

// --- SIMULATION VIEW COMPONENT ---
const SimulationView: React.FC<{
  students: Student[];
  movements: AiMovement[];
  classCount: number;
  tags: TagDefinition[];
}> = ({ students, movements, classCount, tags }) => {
  // Logic to calculate simulated state
  const { simulatedStudents, movedStudentIds } = useMemo(() => {
    const movedIds = new Set<string>();
    const mapping = new Map<string, string>(); // maskedName -> targetClassId

    movements.forEach(m => {
        // Normalize class ID (e.g., "1반" -> "1")
        const targetId = m.targetClass.replace(/[^0-9]/g, '');
        mapping.set(m.studentName, targetId);
    });

    const newStudents = students.map(s => {
      const masked = maskName(s.name);
      if (mapping.has(masked)) {
        movedIds.add(s.id);
        return { ...s, assignedClassId: mapping.get(masked)! };
      }
      return s;
    });

    return { simulatedStudents: newStudents, movedStudentIds: movedIds };
  }, [students, movements]);

  // Group by class
  const classes = useMemo(() => {
    const groups: Record<string, Student[]> = {};
    for (let i = 1; i <= classCount; i++) {
        groups[i.toString()] = [];
    }
    // Also handle unassigned if any (though AI assigns usually)
    simulatedStudents.forEach(s => {
        if (s.assignedClassId && groups[s.assignedClassId]) {
            groups[s.assignedClassId].push(s);
        }
    });
    return groups;
  }, [simulatedStudents, classCount]);

  // Sort class IDs numerically to ensure correct order (1, 2, ... 10)
  const sortedClassIds = Object.keys(classes).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-300">
        <div className="p-4 border-b border-slate-200">
            <h5 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <LayoutDashboard size={20} className="text-indigo-600" />
                전체 편성 시뮬레이션
                <span className="text-sm font-normal text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 ml-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 mr-2"></span>
                    이동하는 학생 강조됨
                </span>
            </h5>
        </div>
        {/* Adjusted Container for Scroll */}
        <div className="overflow-x-auto w-full pb-3">
            <div className="flex gap-4 min-w-max p-5 pr-8 items-start">
                {sortedClassIds.map(classId => (
                    <div key={classId} className="w-60 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm flex-shrink-0">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex justify-between items-center">
                            <span className="font-bold text-lg text-slate-800">{classId}반</span>
                            <span className="text-sm bg-slate-200 px-2.5 py-1 rounded-full text-slate-700 font-bold">{classes[classId].length}명</span>
                        </div>
                        <div className="p-3 space-y-2.5">
                            {classes[classId].length === 0 && (
                                <div className="text-center text-sm text-gray-400 py-6">학생 없음</div>
                            )}
                            {classes[classId].sort((a,b)=>a.name.localeCompare(b.name)).map(s => {
                                const isMoved = movedStudentIds.has(s.id);
                                
                                // Find movement info if this student moved
                                let movementLabel = '이동';
                                if (isMoved) {
                                    // We need to find the movement that caused this
                                    const masked = maskName(s.name);
                                    const move = movements.find(m => m.studentName === masked);
                                    if (move) {
                                        const fromClass = move.currentClass.replace(/반$/, '');
                                        movementLabel = `변경 전: ${fromClass}반`;
                                    }
                                }

                                return (
                                    <div key={s.id} className={`
                                        p-3 rounded-lg border text-base relative transition-all
                                        ${isMoved 
                                            ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-md z-10' 
                                            : 'bg-white border-slate-100 hover:border-slate-300'
                                        }
                                    `}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`font-bold text-lg ${isMoved ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                {s.name}
                                            </span>
                                            {isMoved && (
                                                <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded shadow-sm animate-pulse whitespace-nowrap">
                                                    {movementLabel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {s.gender && (
                                                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${s.gender === 'male' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                    {s.gender === 'male' ? '남' : '여'}
                                                </span>
                                            )}
                                            {s.tagIds.map(tid => {
                                                const t = tags.find(tag => tag.id === tid);
                                                return t ? (
                                                    <span key={tid} className={`text-xs px-2 py-0.5 rounded border border-transparent font-medium ${t.colorBg} ${t.colorText}`}>
                                                        {t.label}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export const AiReportModal: React.FC<AiReportModalProps> = ({ 
  isOpen, onClose, analysisResult, students, tags, classCount, onReanalyze, isLoading 
}) => {
  const [expandedSimulations, setExpandedSimulations] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  // 1. Loading State Overlay
  if (isLoading) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
             <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center animate-in fade-in zoom-in duration-200 max-w-sm w-full">
                  <div className="animate-spin text-indigo-600 mb-4">
                      <RefreshCcw size={48} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">AI분석을 재실행 중입니다...</h2>
                  <p className="text-gray-500 text-lg text-center">학생들의 특성과 균형을 면밀히 검토하고 있습니다.</p>
             </div>
        </div>
    );
  }

  // 2. No Result / Closed State
  if (!analysisResult) return null;

  // 3. Error State
  if (typeof analysisResult === 'string') {
    const renderMarkdown = (text: string) => {
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
            className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <h2 className="font-bold text-2xl flex items-center gap-2">
                <Wand2 size={28} className="text-purple-200" />
                AI 분석 결과
              </h2>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
               <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-line leading-relaxed bg-white p-8 rounded-xl shadow-sm border border-purple-100 text-lg">
                   {renderMarkdown(analysisResult)}
               </div>
            </div>
            <div className="p-5 border-t bg-white flex justify-end gap-3">
              <button onClick={onClose} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-colors text-lg">닫기</button>
              {onReanalyze && (
                  <button 
                    onClick={onReanalyze}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 text-lg"
                  >
                    <RefreshCcw size={20} /> 다시 시도
                  </button>
              )}
            </div>
          </div>
        </div>
      );
  }

  // 4. Success State (Structured Data)
  const { currentScore, predictedScore, overallReview, classBriefs, classDetails, suggestions } = analysisResult;
  
  // Use passed classCount or fallback to derived
  const finalClassCount = classCount || classDetails.length;

  // Chart Data Preparation
  const barChartData = classDetails.map(c => ({
    name: `${c.classId.replace(/[^0-9]/g, '')}반`, // Fix double '반' issue by strictly using numbers
    Risk: c.riskScore,
    Balance: c.balanceScore
  }));

  // Helper to find original student by masked name (best effort)
  const getOriginalStudent = (maskedName: string) => {
      if (!students) return undefined;
      // Try to find a student whose masked name matches
      return students.find(s => maskName(s.name) === maskedName);
  };

  const toggleSimulation = (idx: number) => {
    const next = new Set(expandedSimulations);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedSimulations(next);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-[95vw] rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md z-10">
          <h2 className="font-bold text-3xl flex items-center gap-3">
            <Wand2 size={32} className="text-purple-200" />
            AI 분석 리포트
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={32} /></button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-8 space-y-10">
            
            {/* 1. Overall Balance & Evaluation */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Score Card */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px]">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    <h3 className="text-gray-500 font-bold mb-6 uppercase tracking-wider text-base">현재 전체 균형 점수</h3>
                    <div className="relative flex items-center justify-center">
                        <svg className="w-40 h-40 transform -rotate-90">
                            <circle cx="80" cy="80" r="66" stroke="#f3f4f6" strokeWidth="14" fill="none" />
                            <circle 
                                cx="80" cy="80" r="66" 
                                stroke={currentScore >= 80 ? '#22c55e' : currentScore >= 60 ? '#3b82f6' : '#ef4444'} 
                                strokeWidth="14" 
                                fill="none" 
                                strokeDasharray={414.69} 
                                strokeDashoffset={414.69 - (414.69 * currentScore) / 100}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-black text-gray-800">{currentScore}</span>
                            <span className="text-base text-gray-400 font-medium">/ 100</span>
                        </div>
                    </div>
                </div>

                {/* Comment Card */}
                <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-200 relative flex flex-col justify-center">
                     <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                     <h3 className="text-gray-500 font-bold mb-5 uppercase tracking-wider text-base flex items-center gap-2">
                        <TrendingUp size={20} /> 종합 평가
                     </h3>
                     <div className="flex-1 flex items-center">
                        <p className="text-gray-800 leading-relaxed text-2xl font-semibold break-keep">
                            "{overallReview}"
                        </p>
                     </div>
                </div>
            </section>

            {/* Split Section: Chart & Briefs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 2. Class Indicators (Chart) */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 h-full flex flex-col">
                    <h3 className="text-gray-800 font-bold text-xl mb-8 flex items-center gap-2">
                        <Activity size={24} className="text-indigo-500" />
                        반별 지표 비교
                    </h3>
                    <div className="w-full h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 15}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 15}} domain={[0, 100]} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '15px' }}
                                    cursor={{fill: '#f9fafb'}}
                                />
                                <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '15px' }} iconType="circle" />
                                <Bar dataKey="Risk" name="지도 난이도(Risk)" fill="#f87171" radius={[6, 6, 0, 0]} barSize={40} />
                                <Bar dataKey="Balance" name="균형 점수(Balance)" fill="#60a5fa" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* 4. Class Briefs (Status) */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 h-full flex flex-col">
                    <h3 className="text-gray-800 font-bold text-xl mb-6 flex items-center gap-2">
                        <Star size={24} className="text-amber-500" />
                        반별 핵심 현황
                    </h3>
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[360px] lg:max-h-none pr-2">
                        {classBriefs.map((brief, idx) => (
                            <div key={idx} className="flex gap-4 p-5 bg-amber-50/50 rounded-2xl border border-amber-100 hover:bg-amber-50 transition-colors">
                                <CheckCircle className="text-amber-600 flex-shrink-0 mt-1" size={22} />
                                <p className="text-lg text-gray-700 leading-snug">{brief}</p>
                            </div>
                        ))}
                        {classBriefs.length === 0 && (
                            <div className="text-center text-gray-400 py-6 flex-1 flex items-center justify-center text-lg">특별한 제안 사항이 없습니다.</div>
                        )}
                    </div>
                </section>
            </div>

            {/* 3. Current Class Detailed Analysis */}
            <section>
                <h3 className="text-gray-800 font-bold text-xl mb-6 flex items-center gap-2 px-1">
                    <div className="w-1.5 h-7 bg-gray-500 rounded-full"></div>
                    현재 학급별 상세 분석
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {classDetails.map((cls) => (
                        <div key={cls.classId} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
                                <h4 className="text-2xl font-bold text-gray-800 mt-1">
                                    {cls.classId.replace(/[^0-9]/g, '')}반
                                </h4>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-base font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                                        {cls.statusTitle}
                                    </span>
                                    <div className="flex gap-2 text-sm font-bold">
                                        <span className={`px-2 py-1 rounded bg-red-100 text-red-700`}>Risk: {cls.riskScore}</span>
                                        <span className={`px-2 py-1 rounded bg-blue-100 text-blue-700`}>Bal: {cls.balanceScore}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <h5 className="text-sm font-bold text-gray-400 uppercase mb-2">현황</h5>
                                    <p className="text-lg text-gray-700 leading-relaxed">{cls.currentSituation}</p>
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-gray-400 uppercase mb-2">긍정적 요소</h5>
                                    <p className="text-lg text-green-800 leading-relaxed bg-green-50 p-3.5 rounded-xl">{cls.positiveFactors}</p>
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-gray-400 uppercase mb-2">조언</h5>
                                    <p className="text-lg text-amber-800 leading-relaxed bg-amber-50 p-3.5 rounded-xl">{cls.advice}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5. AI Suggested Assignment Analysis (Optimization Moves) */}
            <section className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <h3 className="text-gray-800 font-bold text-2xl flex items-center gap-3">
                        <Wand2 className="text-indigo-600" size={28} />
                        AI가 제안한 최적 편성안
                    </h3>
                    <div className="bg-white px-6 py-2.5 rounded-full border border-indigo-100 text-lg text-gray-500 shadow-sm">
                        AI가 분석한 가장 효과적인 제안입니다.
                    </div>
                </div>

                {suggestions && suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {suggestions.map((sug, idx) => (
                            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-indigo-100 flex flex-col overflow-hidden hover:shadow-md transition-all">
                                
                                <div className="p-8">
                                    {/* Updated Header: Compact Score */}
                                    <div className="flex flex-col justify-between gap-4 mb-6 border-b border-gray-100 pb-6">
                                         <div className="flex items-start justify-between w-full">
                                             <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="bg-indigo-100 text-indigo-700 text-base font-bold px-3 py-1 rounded-full">추천 {idx + 1}</span>
                                                    <h4 className="font-bold text-2xl text-gray-900">{sug.title}</h4>
                                                </div>
                                                <p className="text-lg text-gray-600 leading-relaxed">{sug.reason}</p>
                                             </div>
                                             
                                             {/* Compact Score Badge */}
                                             <div className="flex flex-col items-end ml-4 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">예상 점수</span>
                                                 <div className="flex items-center gap-2">
                                                     <span className="text-3xl font-black text-indigo-600">{sug.predictedScore}</span>
                                                     {sug.predictedScore > currentScore && (
                                                         <span className="bg-green-100 text-green-700 text-sm font-bold px-2 py-0.5 rounded-md">
                                                             +{sug.predictedScore - currentScore}
                                                         </span>
                                                     )}
                                                 </div>
                                             </div>
                                         </div>
                                    </div>

                                    {/* Movements List */}
                                    <div className="space-y-4 mb-6">
                                        {sug.movements.map((move, mIdx) => {
                                            const originalStudent = getOriginalStudent(move.studentName);
                                            return (
                                                <div key={mIdx} className="flex items-center gap-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    
                                                    {/* Student Info */}
                                                    <div className="flex items-center gap-4 min-w-[180px]">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                                            originalStudent?.gender === 'female' 
                                                                ? 'bg-rose-100 text-rose-600' 
                                                                : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                            {originalStudent?.gender === 'female' ? '여' : '남'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-lg">
                                                                {move.studentName}
                                                            </div>
                                                            {/* Tags */}
                                                            {originalStudent && tags && (
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    {originalStudent.tagIds.map(tid => {
                                                                        const t = tags.find(tag => tag.id === tid);
                                                                        return t ? (
                                                                            <span key={t.id} className={`text-xs px-2 py-0.5 rounded leading-none font-medium ${t.colorBg} ${t.colorText}`}>
                                                                                {t.label}
                                                                            </span>
                                                                        ) : null;
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Direction */}
                                                    <div className="flex-1 flex items-center justify-center px-4">
                                                        <div className="flex items-center gap-4 text-lg font-medium w-full max-w-[280px]">
                                                            <div className="flex-1 text-center py-2 bg-white border border-gray-200 rounded-lg text-gray-600">
                                                                {(move.currentClass && move.currentClass !== '미배정') 
                                                                    ? `${move.currentClass.replace(/[^0-9]/g, '')}반` 
                                                                    : '미배정'}
                                                            </div>
                                                            <ArrowRight size={24} className="text-gray-400 flex-shrink-0" />
                                                            <div className="flex-1 text-center py-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                                                                {move.targetClass.replace(/[^0-9]/g, '')}반
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Expected Effect */}
                                    <div className="text-lg bg-green-50 text-green-900 p-4 rounded-xl border border-green-100 flex gap-3">
                                        <CheckCircle size={24} className="mt-0.5 flex-shrink-0" />
                                        <span><strong>기대 효과:</strong> {sug.expectedEffect}</span>
                                    </div>

                                    {/* Simulation Toggle */}
                                    <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                                        <button 
                                            onClick={() => toggleSimulation(idx)}
                                            className="flex items-center gap-2 text-lg font-bold text-indigo-600 hover:text-indigo-800 transition-colors w-full justify-center py-2"
                                        >
                                            {expandedSimulations.has(idx) ? (
                                                <>
                                                    <ChevronUp size={20} />
                                                    시뮬레이션 접기
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown size={20} />
                                                    전체 편성 시뮬레이션 보기
                                                </>
                                            )}
                                        </button>
                                        
                                        {/* Render Simulation View if expanded */}
                                        {expandedSimulations.has(idx) && students && tags && (
                                            <SimulationView 
                                                students={students}
                                                movements={sug.movements}
                                                classCount={finalClassCount}
                                                tags={tags}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-gray-300">
                        <ThumbsUp className="mx-auto text-green-500 mb-4" size={48} />
                        <p className="text-gray-800 font-bold text-xl">현재 편성이 최적 상태입니다.</p>
                        <p className="text-lg text-gray-500 mt-2">추가적인 최적화 제안이 없습니다.</p>
                    </div>
                )}
            </section>

            <div className="mt-10 text-center text-base text-gray-400">
                ※주의: 본 분석 결과는 AI에 의해 생성되었으며, 반드시 참고용으로만 활용해 주시기 바랍니다. 최종 결정은 학교의 상황을 고려하여 진행해 주세요.
            </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-6 border-t bg-white flex justify-end gap-4">
            <button 
                onClick={onClose}
                className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors text-lg"
            >
                닫기
            </button>
            {onReanalyze && (
                <button 
                    onClick={onReanalyze}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-3 text-lg"
                >
                    <RefreshCcw size={22} />
                    AI 분석 재실행
                </button>
            )}
        </div>
      </div>
    </div>
  );
};