import type { CandidateTrait } from '@/features/hiring';
import type { ActiveIncident, IncidentHistoryEntry } from '@/entities/incidents';

export const COMPANY_LEVELS = ['none', 'lead', 'manager', 'director', 'cto'] as const;
export const EMPLOYEE_ASSIGNMENTS = ['delivery', 'refactor', 'qa', 'ops', 'sales'] as const;
export const COMPANY_TICK_REASONS = ['scenario', 'exam', 'manual'] as const;
export const COMPANY_LEDGER_REASONS = ['scenario', 'exam', 'manual', 'incident'] as const;

export type CompanyLevel = (typeof COMPANY_LEVELS)[number];
export type EmployeeAssignment = (typeof EMPLOYEE_ASSIGNMENTS)[number];
export type CompanyTickReason = (typeof COMPANY_TICK_REASONS)[number];
export type CompanyLedgerReason = (typeof COMPANY_LEDGER_REASONS)[number];

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
  createdAtIso: string;
  reason: CompanyLedgerReason;
  delta: {
    incomeCash: number;
    salariesCash: number;
    incidentCash?: number;
    netCash: number;
    reputationDelta: number;
    moraleDelta?: number;
  };
  balanceAfter: {
    cash: number;
    reputation?: number;
    avgMorale?: number;
  };
  lines?: string[];
}

export interface Company {
  cash: number;
  unlocked: boolean;
  level: CompanyLevel;
  onboardingSeen: boolean;
  employees: Employee[];
  ledger: CompanyLedgerEntry[];
  activeIncident: ActiveIncident | null;
  incidentsHistory: IncidentHistoryEntry[];
}
