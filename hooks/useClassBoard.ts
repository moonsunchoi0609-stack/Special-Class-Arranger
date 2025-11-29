import { useState, useEffect, useCallback } from 'react';
import { AppState, Student, TagDefinition, SeparationRule, SchoolLevel } from '../types';
import { INITIAL_TAGS, MAX_CAPACITY } from '../constants';

export const useClassBoard = () => {
  // --- STATE ---
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('ELEMENTARY_MIDDLE');
  const [classCount, setClassCount] = useState<number>(3);
  const [students, setStudents] = useState<Student[]>([]);
  const [tags, setTags] = useState<TagDefinition[]>(INITIAL_TAGS);
  const [separationRules, setSeparationRules] = useState<SeparationRule[]>([]);
  
  // History State
  const [history, setHistory] = useState<{ past: AppState[]; future: AppState[] }>({ past: [], future: [] });

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('classHelperData');
    if (saved) {
      try {
        const parsed: AppState = JSON.parse(saved);
        setSchoolLevel(parsed.schoolLevel);
        setClassCount(parsed.classCount);
        
        const migratedStudents = (parsed.students || []).map(s => ({
            ...s,
            gender: s.gender
        }));
        setStudents(migratedStudents);
        
        setTags(parsed.tags);
        setSeparationRules(parsed.separationRules);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  useEffect(() => {
    const data: AppState = { schoolLevel, classCount, students, tags, separationRules };
    localStorage.setItem('classHelperData', JSON.stringify(data));
  }, [schoolLevel, classCount, students, tags, separationRules]);

  // --- HISTORY MANAGEMENT ---
  const saveHistory = useCallback(() => {
    const current: AppState = { schoolLevel, classCount, students, tags, separationRules };
    setHistory(prev => ({
      past: [...prev.past, current],
      future: []
    }));
  }, [schoolLevel, classCount, students, tags, separationRules]);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    
    const current: AppState = { schoolLevel, classCount, students, tags, separationRules };
    
    setHistory({
      past: newPast,
      future: [current, ...history.future]
    });
    
    setSchoolLevel(previous.schoolLevel);
    setClassCount(previous.classCount);
    setStudents(previous.students);
    setTags(previous.tags);
    setSeparationRules(previous.separationRules);
  }, [history, schoolLevel, classCount, students, tags, separationRules]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    const current: AppState = { schoolLevel, classCount, students, tags, separationRules };
    
    setHistory(prev => ({
      past: [...prev.past, current],
      future: newFuture
    }));

    setSchoolLevel(next.schoolLevel);
    setClassCount(next.classCount);
    setStudents(next.students);
    setTags(next.tags);
    setSeparationRules(next.separationRules);
  }, [history, schoolLevel, classCount, students, tags, separationRules]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);


  // --- ACTIONS ---

  const moveStudent = (studentId: string, targetClassId: string) => {
    saveHistory();
    setStudents(prev => prev.map(s => {
        if (s.id !== studentId) return s;
        const finalClassId = targetClassId === '' ? null : targetClassId;
        return { ...s, assignedClassId: finalClassId };
    }));
  };

  const addOrUpdateStudent = (studentData: { id?: string, name: string, gender: 'male' | 'female' | undefined, tagIds: string[] }) => {
    saveHistory();
    if (studentData.id) {
        // Update
        setStudents(prev => prev.map(s => 
            s.id === studentData.id 
                ? { ...s, name: studentData.name, gender: studentData.gender, tagIds: studentData.tagIds }
                : s
        ));
    } else {
        // Add
        const newStudent: Student = {
            id: Date.now().toString(),
            name: studentData.name,
            gender: studentData.gender,
            tagIds: studentData.tagIds,
            assignedClassId: null
        };
        setStudents(prev => [...prev, newStudent]);
    }
  };

  const deleteStudent = (id: string) => {
    saveHistory();
    setStudents(prev => prev.filter(s => s.id !== id));
    setSeparationRules(prev => prev.map(r => ({
        ...r,
        studentIds: r.studentIds.filter(sid => sid !== id)
    })).filter(r => r.studentIds.length > 1));
  };

  const addTag = (name: string, colorBg: string, colorText: string) => {
    saveHistory();
    const newTag: TagDefinition = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label: name,
        colorBg,
        colorText
    };
    setTags(prev => [...prev, newTag]);
  };

  const deleteTag = (tagId: string) => {
    saveHistory();
    setTags(prev => prev.filter(t => t.id !== tagId));
    setStudents(prev => prev.map(s => ({
        ...s,
        tagIds: s.tagIds.filter(tid => tid !== tagId)
    })));
  };

  const addSeparationRule = (studentIds: string[]) => {
    saveHistory();
    const newRule: SeparationRule = {
        id: `rule-${Date.now()}`,
        studentIds
    };
    setSeparationRules(prev => [...prev, newRule]);
  };

  const deleteSeparationRule = (ruleId: string) => {
    saveHistory();
    setSeparationRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const resetData = () => {
    saveHistory();
    setStudents([]);
    setSeparationRules([]);
    setTags(INITIAL_TAGS);
  };

  const loadData = (data: AppState) => {
    saveHistory();
    setSchoolLevel(data.schoolLevel);
    setClassCount(data.classCount);
    setStudents(data.students);
    setTags(data.tags);
    setSeparationRules(data.separationRules);
  };

  const loadSampleData = () => {
    saveHistory();
    const capacityPerClass = MAX_CAPACITY[schoolLevel];
    const totalCount = classCount * capacityPerClass;

    const lastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "전", "홍", "문", "손", "배", "백", "허"];
    const firstNames = ["민준", "서준", "도윤", "예준", "시우", "하준", "지호", "주원", "지후", "준우", "서윤", "서연", "지우", "지유", "하윤", "서현", "민서", "하은", "지아", "수아", "은지", "지원", "현우", "민재", "채원", "다은", "가은", "준영", "현준", "예은", "유진", "시현", "건우", "우진", "민규", "예원", "윤우", "서아", "연우", "하율", "다인", "연주", "승우", "지민", "유나", "가윤", "시은", "준호", "동현"];

    const generatedStudents: Student[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < totalCount; i++) {
        let name = "";
        let attempts = 0;
        while (attempts < 50) {
             const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
             const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
             const candidate = ln + fn;
             if (!usedNames.has(candidate)) {
                 name = candidate;
                 break;
             }
             attempts++;
        }
        if (!name) name = `학생${i+1}`; 
        usedNames.add(name);

        const gender: 'male' | 'female' = Math.random() < 0.6 ? 'male' : 'female';
        const rand = Math.random();
        let tagCount = 0;
        if (rand > 0.7) tagCount = 2; 
        else if (rand > 0.15) tagCount = 1; 

        const shuffledTags = [...INITIAL_TAGS].sort(() => 0.5 - Math.random());
        const selectedTagIds = shuffledTags.slice(0, tagCount).map(t => t.id);
        const assignedClassId = (Math.floor(i / capacityPerClass) + 1).toString();

        generatedStudents.push({
            id: `sample-${Date.now()}-${i}`,
            name,
            gender,
            tagIds: selectedTagIds,
            assignedClassId: assignedClassId
        });
    }

    setStudents(generatedStudents);
    setSeparationRules([]);
    setTags(INITIAL_TAGS); 
    
    alert(`현재 설정(${schoolLevel === 'ELEMENTARY_MIDDLE' ? '초/중등' : '고등'}, ${classCount}학급)에 맞춰 ${totalCount}명의 샘플 데이터가 생성되어 각 반에 자동 배정되었습니다.`);
  };

  return {
    // State
    schoolLevel, setSchoolLevel,
    classCount, setClassCount,
    students, setStudents,
    tags, setTags,
    separationRules, setSeparationRules,
    history,
    
    // Actions
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
  };
};
