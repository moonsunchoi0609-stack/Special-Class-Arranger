import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Student, TagDefinition, SeparationRule, SchoolLevel, AiAnalysisResult } from '../types';
import { MAX_CAPACITY } from '../constants';

// 이름 마스킹 헬퍼 함수
export const maskName = (name: string): string => {
  if (!name) return '';
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '○';
  return name[0] + '○' + name.slice(2);
};

export const analyzeClasses = async (
  students: Student[],
  tags: TagDefinition[],
  rules: SeparationRule[],
  classCount: number,
  schoolLevel: SchoolLevel
): Promise<AiAnalysisResult | string> => {
  const apiKey = typeof __API_KEY_B64__ !== 'undefined' && __API_KEY_B64__ ? atob(__API_KEY_B64__) : '';

  if (!apiKey) {
    return "🚫 **API 키 미설정**\n\n시스템 설정에서 API 키를 확인할 수 없습니다. 관리자에게 문의하거나 네트워크 상태를 확인해주세요.";
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare data context
  const classesMap: Record<string, Student[]> = {};
  for (let i = 1; i <= classCount; i++) {
    classesMap[i.toString()] = students.filter(s => s.assignedClassId === i.toString());
  }
  const unassigned = students.filter(s => !s.assignedClassId);
  const limit = MAX_CAPACITY[schoolLevel];

  // Define Schema strictly matching user's requested structure
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      overallReview: {
        type: Type.STRING,
        description: "전체 반 편성 상태를 아우르는 핵심 종합 문장 1개. (예: 현재 반 편성은 불균형이 심각한 상태입니다.)"
      },
      classBriefs: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "각 반별 현황을 1~2문장으로 요약한 리스트. (예: '1반: 신변처리 업무가 과도합니다.')"
      },
      classDetails: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            classId: { type: Type.STRING },
            statusTitle: { type: Type.STRING, description: "형식: 'N반 (핵심키워드 / ⚠️ 주의 단계)'" },
            currentSituation: { type: Type.STRING, description: "현황: 물리적 지원, 성비 등 구체적 서술" },
            positiveFactors: { type: Type.STRING, description: "긍정적 요소: 완화 요인 등" },
            advice: { type: Type.STRING, description: "조언: 구체적인 해결 방안" },
            riskScore: { type: Type.NUMBER, description: "0~100 (높을수록 위험)" },
            balanceScore: { type: Type.NUMBER, description: "0~100 (높을수록 좋음)" }
          },
          required: ["classId", "statusTitle", "currentSituation", "positiveFactors", "advice", "riskScore", "balanceScore"]
        }
      },
      suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "제안 제목 (예: 제안 1: 성비 불균형 해소)" },
            studentName: { type: Type.STRING, description: "이동할 학생 이름" },
            currentClass: { type: Type.STRING },
            targetClass: { type: Type.STRING },
            reason: { type: Type.STRING, description: "이동해야 하는 이유" },
            expectedEffect: { type: Type.STRING, description: "이동 시 기대되는 구체적 효과 (각 반별 변화 서술)" }
          },
          required: ["title", "studentName", "currentClass", "targetClass", "reason", "expectedEffect"]
        }
      },
      currentScore: { type: Type.NUMBER, description: "현재 상태의 종합 점수 (0~100)" },
      predictedScore: { type: Type.NUMBER, description: "제안 적용 시 예상 종합 점수 (0~100)" }
    },
    required: ["overallReview", "classBriefs", "classDetails", "suggestions", "currentScore", "predictedScore"]
  };

  let prompt = `
    당신은 특수학교 반편성 전문가입니다. 
    제공된 학생 데이터, 태그, 규칙을 분석하여 JSON 포맷으로 리포트를 작성해주세요.

    **분석 목표:**
    1. 교사의 업무 강도(신변처리, 행동중재 등)가 한 반에 쏠리지 않게 균형을 맞추는 것.
    2. 성비 불균형 해소.
    3. 학생 간 충돌(분리 배정) 예방 및 안전 사고 방지.

    **설정 정보:**
    - 학교 급: ${schoolLevel === 'ELEMENTARY_MIDDLE' ? '초/중학교 (정원 6명)' : '고등학교 (정원 7명)'}
    - 총 학급 수: ${classCount}개
    - 반 정원: ${limit}명

    **특성 Tag 해석 가이드:**
    - **고부담 요인**: '공격성', '휠체어', '기저귀', '화장실지원', '분쇄식', '학부모예민', '보행지원' (이 태그들이 한 반에 몰리면 RiskScore 급증)
    - **저부담/완화 요인**: '잦은결석', '교사보조가능' (부담을 줄여줌)
    
    **현재 데이터:**
    ${Object.entries(classesMap).map(([classId, classStudents]) => {
        const maleCount = classStudents.filter(s => s.gender === 'male').length;
        const femaleCount = classStudents.filter(s => s.gender === 'female').length;
        return `
      [${classId}반] (남:${maleCount}, 여:${femaleCount}, 총:${classStudents.length})
      명단: ${classStudents.map(s => {
        const tagsStr = s.tagIds.map(tid => tags.find(t => t.id === tid)?.label).filter(Boolean).join(', ');
        return `${maskName(s.name)}(${s.gender === 'female' ? '여' : '남'}, ${tagsStr})`;
      }).join(' / ')}
    `;
    }).join('\n')}

    **미배정:** ${unassigned.map(s => maskName(s.name)).join(', ') || '없음'}
    **분리규칙:** ${rules.map(r => r.studentIds.map(id => students.find(s => s.id === id)?.name).join(', ')).join(' / ') || '없음'}

    **응답 작성 가이드 (매우 중요):**
    1. **overallReview**: 전체 상황을 꿰뚫는 핵심 문장 하나.
    2. **classBriefs**: "1반: ...", "2반: ..." 형태로 각 반의 핵심 문제를 1줄 요약.
    3. **classDetails**:
       - statusTitle: "N반 (상태요약 / 위험도)" 형태로 작성. 예: "1반 (물리적 지원 과부하 / ⚠️ 경고)"
       - currentSituation: 구체적 수치 포함 (예: "휠체어 2명과 기저귀 3명이 집중됨")
       - positiveFactors: 완화 요인이 있다면 반드시 언급.
    4. **suggestions (변경 제안)**:
       - 현재 상태가 불균형하다면, **반드시 1개 이상의 구체적인 이동 제안**을 포함하세요.
       - expectedEffect: "1반은 ~게 좋아지고, 2반은 ~게 개선됨" 형태로 구체적 작성.
    5. **Scores**: 현재 점수(currentScore)보다 개선 후 점수(predictedScore)가 높게 나오도록 논리적으로 산정하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });
    
    if (response.text) {
        try {
            return JSON.parse(response.text) as AiAnalysisResult;
        } catch (e) {
            console.error("JSON Parsing Error", e);
            return response.text; 
        }
    }
    return "분석 결과를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 에러 처리 로직 유지
    const errorMessage = error.message || String(error);
    if (errorMessage.includes("429")) return "⚠️ API 사용량 초과";
    return `⚠️ 분석 중 오류 발생: ${errorMessage}`;
  }
};