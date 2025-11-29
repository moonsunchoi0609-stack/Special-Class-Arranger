import React, { useState } from 'react';
import { 
    Plus, Settings, Wand2, Download,
    X, Square, RefreshCcw,
    ChevronLeft, ChevronRight, HelpCircle,
    Undo, Redo, CheckSquare, FileText
} from 'lucide-react';

import { 
    Student, AppState, AiAnalysisResult 
} from './types';
import { 
    INITIAL_TAGS, TAG_COLORS, UNASSIGNED_ID
} from './constants';
import { ClassColumn } from './components/ClassColumn';
import { StudentCard } from './components/StudentCard';
import { StatsPanel } from './components/StatsPanel';
import { HelpModal } from './components/HelpModal';
import { StudentModal } from './components/StudentModal';
import { AiReportModal } from './components/AiReportModal';
import { Sidebar } from './components/Sidebar';
import { analyzeClasses } from './services/geminiService';
import { exportToExcel } from './utils/exportUtils';
import { useTouchDrag } from './hooks/useTouchDrag';
import { useClassBoard } from './hooks/useClassBoard';

// --- MAIN APP ---

function App() {
  // Use Custom Hook for Business Logic
  const {
    schoolLevel, setSchoolLevel,
    classCount, updateClassCount,
    students,
    tags,
    separationRules,
    history,
    saveHistory,
    undo, redo,
    moveStudent,
    addOrUpdateStudent,
    deleteStudent,
    addTag,
    deleteTag,
    addSeparationRule,
    deleteSeparationRule,
    resetData,
    loadData,
    loadSampleData
  } = useClassBoard();

  // --- UI STATE ---
  const [showStats, setShowStats] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUnassignedOpen, setIsUnassignedOpen] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAiReport, setShowAiReport] = useState(false);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null); // If null, adding new
  const [showStudentModal, setShowStudentModal] = useState(false);
  
  // Separation Creation State
  const [separationSelection, setSeparationSelection] = useState<string[]>([]);
  const [showSeparationMode, setShowSeparationMode] = useState(false);

  // Export State
  const [includeStats, setIncludeStats] = useState(false);

  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- HANDLERS ---
  
  const handleDropStudent = (studentId: string, targetClassId: string) => {
      moveStudent(studentId, targetClassId);
  };

  const { touchDragState, onTouchDragStart } = useTouchDrag(handleDropStudent);

  const openStudentModal = (student?: Student) => {
    setEditingStudent(student || null);
    setShowStudentModal(true);
  };

  const handleSaveStudent = (name: string, gender: 'male' | 'female' | undefined, tags: string[]) => {
    addOrUpdateStudent({
        id: editingStudent?.id,
        name,
        gender,
        tagIds: tags
    });
    setShowStudentModal(false);
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm("정말 이 학생을 삭제하시겠습니까?")) {
        deleteStudent(id);
    }
  };

  // --- TAG HANDLERS ---
  const handleDeleteTag = (tagId: string) => {
      if (window.confirm("이 Tag를 삭제하시겠습니까? 기존 학생들의 Tag도 사라집니다.")) {
          deleteTag(tagId);
      }
  };

  const handleAddTag = (name: string) => {
      const trimmedName = name.trim();
      if (trimmedName) {
          if (tags.some(t => t.label === trimmedName)) {
              alert("이미 존재하는 Tag 이름입니다.");
              return;
          }
          const usedBgColors = new Set(tags.map(t => t.colorBg));
          const availableColors = TAG_COLORS.filter(c => !usedBgColors.has(c.bg));
          const selectedColor = availableColors.length > 0 
            ? availableColors[Math.floor(Math.random() * availableColors.length)]
            : TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

          addTag(trimmedName, selectedColor.bg, selectedColor.text);
      }
  };

  // --- SEPARATION HANDLERS ---
  const toggleSeparationSelect = (studentId: string) => {
      setSeparationSelection(prev => 
        prev.includes(studentId) 
            ? prev.filter(id => id !== studentId)
            : [...prev, studentId]
      );
  };

  const handleCreateRule = () => {
      if (separationSelection.length < 2) {
          alert("2명 이상의 학생을 선택해야 합니다.");
          return;
      }
      addSeparationRule(separationSelection);
      setSeparationSelection([]);
      setShowSeparationMode(false);
  };

  // --- PROJECT MANAGEMENT ---
  const handleReset = () => {
      if (window.confirm("모든 데이터를 초기화하시겠습니까?")) {
          resetData();
          setAiAnalysis(null);
      }
  };

  const handleLoadSample = () => {
      if (students.length > 0 && !window.confirm("현재 데이터가 모두 삭제되고 샘플 데이터로 대체됩니다. 계속하시겠습니까?")) {
          return;
      }
      loadSampleData();
      setAiAnalysis(null);
  };

  const handleSaveProject = () => {
      const data: AppState = { schoolLevel, classCount, students, tags, separationRules };
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `반편성프로젝트_${new Date().toLocaleDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleLoadProject = (file: File) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (!json.students || !json.tags) throw new Error("Invalid Format");
              
              if (window.confirm("현재 작업 중인 내용이 덮어씌워집니다. 계속하시겠습니까?")) {
                  loadData({
                      schoolLevel: json.schoolLevel || 'ELEMENTARY_MIDDLE',
                      classCount: json.classCount || 3,
                      students: (json.students || []).map((s: any) => ({ ...s, gender: s.gender })),
                      tags: json.tags || INITIAL_TAGS,
                      separationRules: json.separationRules || []
                  });
                  setAiAnalysis(null);
                  alert("성공적으로 불러왔습니다.");
              }
          } catch (error) {
              console.error(error);
              alert("파일을 불러오는 중 오류가 발생했습니다.");
          }
      };
      reader.readAsText(file);
  };

  const handleAIAnalyze = async () => {
      setIsAnalyzing(true);
      const result = await analyzeClasses(students, tags, separationRules, classCount, schoolLevel);
      setAiAnalysis(result);
      setIsAnalyzing(false);
      setShowAiReport(true);
  };

  const onExportExcel = () => {
    exportToExcel({ classCount, students, tags, includeStats });
  };

  // --- RENDER HELPERS ---
  const unassignedStudents = students
    .filter(s => !s.assignedClassId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const classList = Array.from({ length: classCount }, (_, i) => (i + 1).toString());

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] bg-gray-100 overflow-hidden text-gray-800 relative">
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        schoolLevel={schoolLevel}
        setSchoolLevel={setSchoolLevel}
        classCount={classCount}
        setClassCount={updateClassCount}
        tags={tags}
        onAddTag={handleAddTag}
        onDeleteTag={handleDeleteTag}
        separationRules={separationRules}
        separationSelection={separationSelection}
        showSeparationMode={showSeparationMode}
        setShowSeparationMode={setShowSeparationMode}
        onCreateRule={handleCreateRule}
        onDeleteRule={deleteSeparationRule}
        students={students}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onLoadSampleData={handleLoadSample}
        onReset={handleReset}
        onExportExcel={onExportExcel}
        includeStats={includeStats}
        setIncludeStats={setIncludeStats}
        saveHistory={saveHistory}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
                {!isSidebarOpen && (
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded text-gray-600">
                        <Settings size={20} />
                    </button>
                )}
                <h2 className="font-bold text-gray-800 text-lg">
                    {schoolLevel === 'ELEMENTARY_MIDDLE' ? '초등/중학' : '고등'} 반편성 보드
                </h2>
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
                    전체 학생: {students.length}명
                </span>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-300 mr-2">
                    <button 
                        onClick={undo}
                        disabled={history.past.length === 0}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-l-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-colors border-r border-gray-200"
                        title="실행 취소 (Ctrl+Z)"
                    >
                        <Undo size={18} />
                    </button>
                    <button 
                        onClick={redo}
                        disabled={history.future.length === 0}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-r-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 transition-colors"
                        title="다시 실행 (Ctrl+Shift+Z)"
                    >
                        <Redo size={18} />
                    </button>
                </div>

                <button 
                    onClick={() => setShowHelpModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-300 transition-colors"
                >
                    <HelpCircle size={16} /> 도움말
                </button>
                <button 
                    onClick={() => setShowStats(!showStats)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors border ${showStats ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Download size={16} className="rotate-180" /> 통계/분석
                </button>
                
                <button 
                    onClick={handleAIAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-70 shadow"
                >
                   {isAnalyzing ? <RefreshCcw className="animate-spin" size={16} /> : <Wand2 size={16} />}
                   AI 분석
                </button>
                {aiAnalysis && !isAnalyzing && (
                    <button
                        onClick={() => setShowAiReport(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-purple-700 border border-purple-200 rounded text-sm font-medium hover:bg-purple-50 transition-colors shadow-sm"
                    >
                         <FileText size={16} /> 리포트
                    </button>
                )}
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-4 bg-gray-50/50">
            {showStats ? (
                <div className="h-full overflow-y-auto">
                    <div className="w-full max-w-5xl mx-auto mt-4 mb-2 flex justify-end px-1">
                        <button 
                            onClick={() => setShowStats(false)} 
                            className="flex items-center gap-1 bg-white text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md"
                        >
                            <span className="text-xs font-bold">닫기</span>
                            <X size={16} />
                        </button>
                    </div>
                    <StatsPanel students={students} tags={tags} classCount={classCount} />
                </div>
            ) : (
                <div className="flex h-full gap-4 w-full">
                    {/* Unassigned Column */}
                    <div className={`flex flex-col h-full transition-all duration-300 ease-in-out flex-shrink-0 ${isUnassignedOpen ? 'w-72' : 'w-12'}`}>
                        {isUnassignedOpen ? (
                            <>
                                <div className="mb-2 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700 whitespace-nowrap">미배정 학생 ({unassignedStudents.length})</h3>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => openStudentModal()}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded shadow transition-colors" title="학생 추가"
                                        >
                                            <Plus size={18} />
                                        </button>
                                        <button 
                                            onClick={() => setIsUnassignedOpen(false)}
                                            className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-1.5 rounded shadow transition-colors" title="접기"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div 
                                    className="bg-gray-100 rounded-xl p-2 border-2 border-dashed border-gray-300 flex-1 overflow-y-auto transition-colors hover:bg-gray-50"
                                    data-drop-zone={UNASSIGNED_ID}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const studentId = e.dataTransfer.getData('studentId');
                                        if (studentId) {
                                            handleDropStudent(studentId, '');
                                        }
                                    }}
                                >
                                    {showSeparationMode && (
                                        <div className="text-center text-xs text-indigo-600 mb-2 font-medium bg-indigo-50 py-1 rounded">
                                            분리할 학생들을 체크하세요
                                        </div>
                                    )}
                                    {unassignedStudents.map(student => (
                                        <div key={student.id} className="flex gap-2 mb-2">
                                            {showSeparationMode && (
                                                <button 
                                                    onClick={() => toggleSeparationSelect(student.id)}
                                                    className={`mt-3 ${separationSelection.includes(student.id) ? 'text-indigo-600' : 'text-gray-300'}`}
                                                >
                                                    {separationSelection.includes(student.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </button>
                                            )}
                                            <div className="flex-1">
                                                <StudentCard 
                                                    student={student} 
                                                    allTags={tags} 
                                                    onEdit={(s) => openStudentModal(s)}
                                                    onDelete={handleDeleteStudent}
                                                    onTouchDragStart={onTouchDragStart}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {unassignedStudents.length === 0 && (
                                        <div className="text-center text-gray-400 mt-10 text-sm">
                                            모든 학생이 배정되었습니다.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div 
                                className="h-full flex flex-col items-center pt-2 bg-gray-200 rounded-xl cursor-pointer hover:bg-gray-300 transition-colors border border-gray-300"
                                onClick={() => setIsUnassignedOpen(true)}
                                title="펼치기"
                            >
                                <button className="mb-4 text-gray-600">
                                    <ChevronRight size={20} />
                                </button>
                                <div className="flex-1 flex items-center justify-center">
                                     <span className="[writing-mode:vertical-lr] text-gray-600 font-bold tracking-widest text-sm whitespace-nowrap">
                                        미배정 학생 ({unassignedStudents.length})
                                     </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Class Columns */}
                    <div className="flex-1 h-full overflow-x-auto pb-2 pl-2 border-l border-gray-200 min-w-0 pr-2">
                        <div className="flex gap-4 h-full">
                            {classList.map(classId => (
                                <div key={classId} className="w-72 h-full flex-shrink-0">
                                    <ClassColumn 
                                        id={classId}
                                        name={`${classId}반`}
                                        students={students.filter(s => s.assignedClassId === classId)}
                                        allTags={tags}
                                        schoolLevel={schoolLevel}
                                        separationRules={separationRules}
                                        onDropStudent={handleDropStudent}
                                        onEditStudent={(s) => openStudentModal(s)}
                                        onDeleteStudent={handleDeleteStudent}
                                        onTouchDragStart={onTouchDragStart}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* TOUCH DRAG OVERLAY */}
      {touchDragState && (
        <div 
            style={{
                position: 'fixed',
                left: touchDragState.currentX,
                top: touchDragState.currentY,
                width: touchDragState.width,
                height: touchDragState.height,
                transform: 'translate(-50%, -50%) rotate(3deg)', 
                pointerEvents: 'none',
                zIndex: 9999,
                opacity: 0.9,
            }}
        >
             <StudentCard 
                student={touchDragState.student}
                allTags={tags}
                onEdit={() => {}}
                onDelete={() => {}}
                isGhost={true}
             />
        </div>
      )}

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      
      <AiReportModal 
        isOpen={showAiReport} 
        onClose={() => setShowAiReport(false)}
        analysisResult={aiAnalysis}
        students={students}
        tags={tags}
        classCount={classCount}
        onReanalyze={handleAIAnalyze}
        isLoading={isAnalyzing}
      />

      <StudentModal 
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        onSave={handleSaveStudent}
        editingStudent={editingStudent}
        tags={tags}
      />
    </div>
  );
}

export default App;