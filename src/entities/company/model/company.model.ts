import type { CandidateTrait } from '@/features/hiring';

export const COMPANY_LEVELS = ['none', 'lead', 'manager', 'director', 'cto'] as const;

export type CompanyLevel = (typeof COMPANY_LEVELS)[number];

export interface Employee {
  id: string;
  name: string;
  role: 'junior' | 'middle' | 'senior';
  quality: number;
  morale: number;
  traits: CandidateTrait[];
  hiredAtIso: string;
  salaryCash: number;
}

export interface Company {
  cash: number;
  unlocked: boolean;
  level: CompanyLevel;
  onboardingSeen: boolean;
  employees: Employee[];
}
