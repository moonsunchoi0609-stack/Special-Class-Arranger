export type SchoolLevel = 'ELEMENTARY_MIDDLE' | 'HIGH';

export interface TagDefinition {
  id: string;
  label: string;
  colorBg: string; // Tailwind class e.g., 'bg-red-100'
  colorText: string; // Tailwind class e.g., 'text-red-800'
}

export interface Student {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  tagIds: string[];
  assignedClassId: string | null; // null means 'Unassigned'
}

export interface SeparationRule {
  id: string;
  studentIds: string[];
}

export interface AppState {
  schoolLevel: SchoolLevel;
  classCount: number;
  students: Student[];
  tags: TagDefinition[];
  separationRules: SeparationRule[];
}

// AI Analysis Types
export interface AiMovement {
  studentId: string;
  studentName: string;
  currentClass: string;
  targetClass: string;
}

export interface AiSuggestion {
  title: string;
  movements: AiMovement[];
  reason: string;
  expectedEffect: string;
  predictedScore: number;
}

export interface ClassDetail {
  classId: string;
  statusTitle: string;
  currentSituation: string;
  positiveFactors: string;
  advice: string;
  riskScore: number;
  balanceScore: number;
}

export interface AiAnalysisResult {
  overallReview: string;
  classBriefs: string[];
  classDetails: ClassDetail[];
  suggestions: AiSuggestion[];
  currentScore: number;
  predictedScore: number;
}