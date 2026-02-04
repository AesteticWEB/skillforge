import { BALANCE } from '@/shared/config';
import type { TotalBuffs } from '@/entities/buffs';
import { hashStringToInt, mulberry32 } from '@/entities/exam';
import { getCompanyModifiersFromAssignments } from './assignments';
import type {
  Company,
  CompanyLedgerEntry,
  CompanyTickReason,
  Employee,
} from '../model/company.model';

type RunCompanyTickParams = {
  reason: CompanyTickReason;
  state: {
    company: Company;
    reputation: number;
    techDebt: number;
    totalBuffs?: TotalBuffs;
  };
  seed: string;
  tickIndex: number;
};

type IncidentResult = {
  happened: boolean;
  kind: string;
  costCash: number;
  repPenalty: number;
};

type RunCompanyTickResult = {
  nextCompany: Company;
  reputationDelta: number;
  techDebtDelta?: number;
  incident?: IncidentResult;
  ledgerEntry: CompanyLedgerEntry;
};

type TraitTotals = {
  cashIncomeBonusPct: number;
  incidentReducePct: number;
  techDebtDeltaPerTick: number;
  productivityPct: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number): number => (Number.isFinite(value) ? Math.round(value) : 0);

const formatSigned = (value: number): string => {
  const rounded = round(value);
  return `${rounded >= 0 ? '+' : ''}${rounded}`;
};

const resolveTraitCaps = () => {
  const caps = BALANCE.hiring?.traitEffectCaps;
  return {
    cashIncomeBonusPct: caps?.cashIncomeBonusPct ?? 0.3,
    incidentReducePct: caps?.incidentReducePct ?? 0.3,
    techDebtDeltaPerTickAbs: caps?.techDebtDeltaPerTickAbs ?? 1.2,
    productivityPct: caps?.productivityPct ?? 0.3,
  };
};

const sumTraitEffects = (
  employee: Employee,
  caps: ReturnType<typeof resolveTraitCaps>,
): TraitTotals => {
  const totals: TraitTotals = {
    cashIncomeBonusPct: 0,
    incidentReducePct: 0,
    techDebtDeltaPerTick: 0,
    productivityPct: 0,
  };

  for (const trait of employee.traits ?? []) {
    const effects = trait?.effects;
    if (!effects) {
      continue;
    }
    totals.cashIncomeBonusPct += effects.cashIncomeBonusPct ?? 0;
    totals.incidentReducePct += effects.incidentReducePct ?? 0;
    totals.techDebtDeltaPerTick += effects.techDebtDeltaPerTick ?? 0;
    totals.productivityPct += effects.productivityPct ?? 0;
  }

  totals.cashIncomeBonusPct = clamp(
    totals.cashIncomeBonusPct,
    -caps.cashIncomeBonusPct,
    caps.cashIncomeBonusPct,
  );
  totals.incidentReducePct = clamp(
    totals.incidentReducePct,
    -caps.incidentReducePct,
    caps.incidentReducePct,
  );
  totals.techDebtDeltaPerTick = clamp(
    totals.techDebtDeltaPerTick,
    -caps.techDebtDeltaPerTickAbs,
    caps.techDebtDeltaPerTickAbs,
  );
  totals.productivityPct = clamp(
    totals.productivityPct,
    -caps.productivityPct,
    caps.productivityPct,
  );

  return totals;
};

const resolveLedgerId = (seed: string): string => {
  const hash = hashStringToInt(seed).toString(16);
  return `tick_${hash}`;
};

const resolveLedgerCreatedAt = (tickIndex: number): string => {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  const offsetMs = Math.max(0, Math.floor(tickIndex)) * 1000;
  return new Date(base + offsetMs).toISOString();
};

const buildLedgerTitle = (reason: CompanyTickReason): string => {
  const label: Record<CompanyTickReason, string> = {
    scenario: 'сценарий',
    exam: 'экзамен',
    manual: 'ручной',
  };
  return `Тик компании (${label[reason] ?? reason})`;
};

export const runCompanyTick = ({
  reason,
  state,
  seed,
  tickIndex,
}: RunCompanyTickParams): RunCompanyTickResult => {
  const company = state.company;
  const employees = Array.isArray(company.employees) ? company.employees : [];
  const tickBalance = BALANCE.company?.tick;
  const moraleBalance = tickBalance?.morale;
  const incidentBalance = tickBalance?.incident;
  const crisisBalance = tickBalance?.crisis;
  const salaryByRole = tickBalance?.salaryByRole ?? { junior: 0, middle: 0, senior: 0 };
  const rng = mulberry32(hashStringToInt(`${seed}:tick:${tickIndex}:${reason}`));

  const traitCaps = resolveTraitCaps();
  let traitCashIncomeBonusPct = 0;
  let traitIncidentReducePct = 0;
  let traitTechDebtDelta = 0;

  let employeeIncomeTotal = 0;
  for (const employee of employees) {
    const traitTotals = sumTraitEffects(employee, traitCaps);
    traitCashIncomeBonusPct += traitTotals.cashIncomeBonusPct;
    traitIncidentReducePct += traitTotals.incidentReducePct;
    traitTechDebtDelta += traitTotals.techDebtDeltaPerTick;

    const qualityFactor = clamp(employee.quality / 100, 0, 1);
    const productivityFactor = Math.max(0, 1 + traitTotals.productivityPct);
    employeeIncomeTotal +=
      (tickBalance?.incomePerEmployeeCash ?? 0) * qualityFactor * productivityFactor;
  }

  const assignmentModifiers = getCompanyModifiersFromAssignments(employees);
  const totalBuffs = state.totalBuffs ?? {
    coinMultiplier: 0,
    coinBonus: 0,
    xpBonusPct: 0,
    repBonusFlat: 0,
    techDebtReduceFlat: 0,
    cashIncomeBonusPct: 0,
    incidentReducePct: 0,
    candidateQualityBonusPct: 0,
  };

  const cashIncomeBonusCap = BALANCE.caps?.cashIncomeBonusPctMax ?? 0.3;
  const totalCashIncomeBonusPct = clamp(
    assignmentModifiers.cashIncomePctTotal +
      totalBuffs.cashIncomeBonusPct +
      traitCashIncomeBonusPct,
    0,
    cashIncomeBonusCap,
  );

  const incidentReduceCap =
    incidentBalance?.chanceReduceCapPct ?? BALANCE.caps?.incidentReducePctMax ?? 0.5;
  const totalIncidentReducePct = clamp(
    assignmentModifiers.incidentReducePctTotal +
      totalBuffs.incidentReducePct +
      traitIncidentReducePct,
    0,
    incidentReduceCap,
  );

  const baseIncome = round(tickBalance?.baseIncomeCash ?? 0);
  let income = baseIncome + employeeIncomeTotal;
  income = round(income * (1 + totalCashIncomeBonusPct));

  const salaries = round(
    employees.reduce((sum, employee) => sum + (salaryByRole[employee.role] ?? 0), 0),
  );

  const cashDelta = round(income - salaries);
  let nextCash = company.cash + cashDelta;

  let reputationDelta = round(assignmentModifiers.repDeltaTotal);
  const techDebtDelta = round(assignmentModifiers.debtDeltaTotal + traitTechDebtDelta);

  let moraleDelta =
    cashDelta >= 0
      ? round(moraleBalance?.driftUpWhenProfitable ?? 0)
      : -round(moraleBalance?.driftDownWhenCrisis ?? 0);

  const incidentChanceBase = incidentBalance?.baseChance ?? 0;
  const incidentChanceFromDebt = incidentBalance?.chanceFromTechDebtPct ?? 0;
  let incidentChance = incidentChanceBase + state.techDebt * incidentChanceFromDebt;
  incidentChance = clamp(incidentChance - totalIncidentReducePct, 0, 0.95);

  const incidentRoll = rng();
  let incident: IncidentResult | undefined;
  if (incidentRoll < incidentChance) {
    const costCash = round(incidentBalance?.baseCostCash ?? 0);
    const repPenalty = round(incidentBalance?.baseRepPenalty ?? 0);
    nextCash -= costCash;
    reputationDelta -= repPenalty;
    moraleDelta -= round(incidentBalance?.moralePenalty ?? 0);
    incident = {
      happened: true,
      kind: 'Инцидент в проде',
      costCash,
      repPenalty,
    };
  }

  const crisisRepPenalty = round(crisisBalance?.repPenalty ?? 0);
  const crisisMoralePenalty = round(crisisBalance?.moralePenalty ?? 0);
  const isCrisis = nextCash < 0;
  if (isCrisis) {
    reputationDelta -= crisisRepPenalty;
    moraleDelta -= crisisMoralePenalty;
  }

  const moraleMin = moraleBalance?.min ?? 0;
  const moraleMax = moraleBalance?.max ?? 100;

  const nextEmployees = employees.map((employee) => ({
    ...employee,
    morale: clamp(round(employee.morale + moraleDelta), moraleMin, moraleMax),
  }));

  const nextCompany: Company = {
    ...company,
    cash: Math.max(0, round(nextCash)),
    employees: nextEmployees,
  };

  const ledgerLines: string[] = [
    `Доход: +${round(income)} cash`,
    `Зарплаты: -${round(salaries)} cash`,
    `Итог за тик: ${formatSigned(cashDelta)} cash`,
    `Баланс: ${formatSigned(nextCompany.cash)} cash`,
    `Мораль: ${formatSigned(moraleDelta)}`,
    `Шанс инцидента: ${Math.round(incidentChance * 1000) / 10}%`,
    incident?.happened
      ? `Инцидент: да (-${incident.costCash} cash, -${incident.repPenalty} реп.)`
      : 'Инцидент: нет',
  ];

  if (techDebtDelta !== 0) {
    ledgerLines.push(`Техдолг: ${formatSigned(techDebtDelta)}`);
  }
  if (reputationDelta !== 0) {
    ledgerLines.push(`Репутация: ${formatSigned(reputationDelta)}`);
  }
  if (isCrisis) {
    ledgerLines.push('Кризис: cash ниже нуля — штраф репутации/морали');
  }

  const ledgerEntry: CompanyLedgerEntry = {
    id: resolveLedgerId(`${seed}:tick:${tickIndex}:${reason}`),
    title: buildLedgerTitle(reason),
    lines: ledgerLines,
    createdAtIso: resolveLedgerCreatedAt(tickIndex),
    reason,
  };

  return {
    nextCompany,
    reputationDelta,
    techDebtDelta,
    incident,
    ledgerEntry,
  };
};
