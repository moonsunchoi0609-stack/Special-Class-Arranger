
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Student, TagDefinition, SeparationRule, SchoolLevel, AiAnalysisResult } from '../types';
import { MAX_CAPACITY } from '../constants';

// 이름 마스킹 헬퍼 함수
export const maskName = (name: string): string => {
  if (!name) return '';
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '○';
  // 3글자 이상: 가운데 글자(인덱스 1)를 ○로 변경 (예: 홍길동 -> 홍○동, 남궁민수 -> 남○민수)
  return name[0] + '○' + name.slice(2);
};

export const analyzeClasses = async (
  students: Student[],
  tags: TagDefinition[],
  rules: SeparationRule[],
  classCount: number,
  schoolLevel: SchoolLevel
): Promise<AiAnalysisResult | string> => {
  // Decode the API key at runtime using the browser's atob function
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

  // Define Schema for structured output
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      overallScore: {
        type: Type.NUMBER,
        description: "전체적인 반 편성 균형 점수 (0~100점). 높을수록 좋음."
      },
      overallComment: {
        type: Type.STRING,
        description: "전체적인 편성 상태에 대한 종합적인 평가 및 총평 (3~4문장)."
      },
      classes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            classId: { type: Type.STRING, description: "반 번호 (예: '1')" },
            riskScore: { 
              type: Type.NUMBER, 
              description: "해당 반의 지도 난이도/위험도 점수 (0~100점). 높을수록 교사의 부담이 크고 위험함." 
            },
            balanceScore: { 
              type: Type.NUMBER, 
              description: "해당 반의 구성원 조화 및 균형 점수 (0~100점). 높을수록 좋음." 
            },
            comment: { type: Type.STRING, description: "해당 반에 대한 상세 분석 코멘트." }
          },
          required: ["classId", "riskScore", "balanceScore", "comment"]
        }
      },
      recommendations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "전반적인 개선 제안 사항 (텍스트)"
      },
      suggestedMoves: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING, description: "이동 대상 학생의 이름 (제공된 이름 그대로 사용)" },
            currentClass: { type: Type.STRING, description: "현재 반 (미배정인 경우 '미배정')" },
            targetClass: { type: Type.STRING, description: "이동할 목표 반" },
            reason: { type: Type.STRING, description: "이동 제안 사유" }
          },
          required: ["studentName", "currentClass", "targetClass", "reason"]
        },
        description: "균형을 맞추기 위해 구체적으로 이동이 필요한 학생들의 목록 (최적화 제안)"
      },
      predictedScore: {
        type: Type.NUMBER,
        description: "제안된 이동을 모두 수행했을 때 예상되는 전체 균형 점수"
      }
    },
    required: ["overallScore", "overallComment", "classes", "recommendations", "suggestedMoves"]
  };

  let prompt = `
    당신은 특수학교 반편성 전문가입니다.
    현재 반 편성 상황을 분석하고, 만약 개선이 필요하다면 구체적인 학생 이동 제안을 포함한 리포트를 JSON 형식으로 제공해주세요.

    **설정 정보:**
    - 학교 급: ${schoolLevel === 'ELEMENTARY_MIDDLE' ? '초/중학교 (정원 6명)' : '고등학교 (정원 7명)'}
    - 총 학급 수: ${classCount}개
    - 반 정원 제한: ${limit}명

    **특성 Tag 해석 가이드 (중요):**
    1. **부담 가중 요소 (Risk Factors)**: '공격성', '화장실지원', '보행지원', '휠체어', '학부모예민', '분쇄식' 등 -> 교사의 지도 부담을 높임. 특정 반에 몰리면 안 됨.
    2. **부담 경감 요소**: '잦은결석', '교사보조가능' -> 지도 부담을 다소 완화해줌.
    3. **목표**: 
       - 모든 반의 Risk Score를 비슷하게 유지 (특정 반 희생 금지)
       - 성별 균형 (남/녀 비율) 고려
       - '분리 배정 규칙' 준수 필수

    **현재 편성 현황:**
    ${Object.entries(classesMap).map(([classId, classStudents]) => {
        const maleCount = classStudents.filter(s => s.gender === 'male').length;
        const femaleCount = classStudents.filter(s => s.gender === 'female').length;
        return `
      [${classId}반] (총 ${classStudents.length}명 - 남:${maleCount} / 여:${femaleCount})
      학생들: ${classStudents.map(s => {
        const tagsStr = s.tagIds.map(tid => tags.find(t => t.id === tid)?.label).filter(Boolean).join(', ');
        const genderStr = s.gender === 'female' ? '여' : (s.gender === 'male' ? '남' : '');
        let info = [];
        if(genderStr) info.push(genderStr);
        if(tagsStr) info.push(tagsStr);
        return `${maskName(s.name)}(${info.join(', ')})`;
      }).join(' / ')}
    `;
    }).join('\n')}

    **미배정 학생:**
    ${unassigned.map(s => {
        const genderStr = s.gender === 'female' ? '여' : (s.gender === 'male' ? '남' : '');
        const tagsStr = s.tagIds.map(tid => tags.find(t => t.id === tid)?.label).filter(Boolean).join(', ');
        return `${maskName(s.name)}${genderStr ? `(${genderStr})` : ''}[${tagsStr}]`;
    }).join(', ') || '없음'}

    **분리 배정 규칙(서로 같은 반이 되면 안됨):**
    ${rules.map((r, idx) => {
        const names = r.studentIds.map(sid => students.find(s => s.id === sid)?.name).filter(n => n).map(n => maskName(n!)).join(', ');
        return `${idx + 1}. ${names}`;
    }).join('\n') || '없음'}

    **요청 사항:**
    1. 현재 상태의 점수(overallScore)와 반별 점수를 계산하세요.
    2. 만약 불균형이 심하거나 미배정 학생이 있다면, **suggestedMoves** 배열에 구체적인 이동/배정 제안을 담아주세요.
       - 예: "홍○동 학생을 1반에서 2반으로 이동 (2반의 휠체어 학생 부담을 분산하기 위함)"
       - 미배정 학생이 있다면 적절한 반으로 배정하는 제안을 포함하세요.
    3. 제안된 이동을 적용했을 때 예상되는 **predictedScore**를 예측해주세요.
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
            return response.text; // Fallback to raw text if parsing fails
        }
    }
    return "분석 결과를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const errorMessage = error.message || String(error);

    if (errorMessage.includes("API_KEY_HTTP_REFERRER_BLOCKED") || 
        errorMessage.includes("Requests from referer") ||
        (errorMessage.includes("403") && errorMessage.includes("blocked"))) {
      return `🚫 **API 키 설정 오류**\n\n현재 도메인(Referer)이 API 키 허용 목록에 포함되지 않았습니다.\nGoogle Cloud Console 또는 AI Studio에서 API 키 설정을 확인하고, 현재 도메인 주소를 추가해주세요.`;
    }

    if (errorMessage.includes("429") || errorMessage.includes("Quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      return `⚠️ **API 사용량 초과**\n\n잠시 후 다시 시도해 주세요. (Quota Exceeded)`;
    }

    return `⚠️ **AI 분석 중 오류 발생**\n\n오류 내용: ${errorMessage}\n\n잠시 후 다시 시도하거나, 문제가 지속되면 관리자에게 문의하세요.`;
  }
};
