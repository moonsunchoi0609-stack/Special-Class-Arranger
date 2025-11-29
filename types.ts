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
  gender: 'male' | 'female';
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