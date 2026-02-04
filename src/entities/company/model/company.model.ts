import type { CandidateTrait } from '@/features/hiring';

export const COMPANY_LEVELS = ['none', 'lead', 'manager', 'director', 'cto'] as const;
export const EMPLOYEE_ASSIGNMENTS = ['delivery', 'refactor', 'qa', 'ops', 'sales'] as const;
export const COMPANY_TICK_REASONS = ['scenario', 'exam', 'manual'] as const;

export type CompanyLevel = (typeof COMPANY_LEVELS)[number];
export type EmployeeAssignment = (typeof EMPLOYEE_ASSIGNMENTS)[number];
export type CompanyTickReason = (typeof COMPANY_TICK_REASONS)[number];

export interface Employee {
  id: string;
  name: string;
  role: 'junior' | 'middle' | 'senior';
  quality: number;
  morale: number;
  traits: CandidateTrait[];
  hiredAtIso: string;
  salaryCash: number;
  assignment: EmployeeAssignment;
}

export interface CompanyLedgerEntry {
  id: string;
  title: string;
  lines: string[];
  createdAtIso: string;
  reason: CompanyTickReason;
}

export interface Company {
  cash: number;
  unlocked: boolean;
  level: CompanyLevel;
  onboardingSeen: boolean;
  employees: Employee[];
  ledger: CompanyLedgerEntry[];
}
