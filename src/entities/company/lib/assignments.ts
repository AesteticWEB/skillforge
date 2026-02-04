import { BALANCE } from '@/shared/config';
import type { Employee, EmployeeAssignment } from '../model/company.model';

export const ASSIGNMENT_LABELS: Record<EmployeeAssignment, string> = {
  delivery: 'Доставка фич',
  refactor: 'Рефакторинг',
  qa: 'Тестирование',
  ops: 'Операции',
  sales: 'Продажи',
};

export const ASSIGNMENT_OPTIONS = (Object.keys(ASSIGNMENT_LABELS) as EmployeeAssignment[]).map(
  (assignment) => ({
    id: assignment,
    label: ASSIGNMENT_LABELS[assignment],
  }),
);

export type AssignmentModifiers = {
  cashIncomePctTotal: number;
  repDeltaTotal: number;
  debtDeltaTotal: number;
  incidentReducePctTotal: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const getCompanyModifiersFromAssignments = (
  employees: readonly Employee[],
): AssignmentModifiers => {
  const totals: AssignmentModifiers = {
    cashIncomePctTotal: 0,
    repDeltaTotal: 0,
    debtDeltaTotal: 0,
    incidentReducePctTotal: 0,
  };

  const assignments = BALANCE.company?.assignments ?? {};

  for (const employee of employees) {
    const effect = assignments[employee.assignment];
    if (!effect) {
      continue;
    }
    totals.cashIncomePctTotal += effect.cashIncomePct ?? 0;
    totals.repDeltaTotal += effect.repDelta ?? 0;
    totals.debtDeltaTotal += effect.debtDelta ?? 0;
    totals.incidentReducePctTotal += effect.incidentReducePct ?? 0;
  }

  const incidentCap = BALANCE.caps?.incidentReducePctMax ?? 0.5;
  totals.incidentReducePctTotal = clamp(totals.incidentReducePctTotal, 0, incidentCap);

  return totals;
};
