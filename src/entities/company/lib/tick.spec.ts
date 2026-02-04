import { runCompanyTick } from './tick';
import type { Company, Employee } from '../model/company.model';
import type { TotalBuffs } from '@/entities/buffs';

const EMPTY_BUFFS: TotalBuffs = {
  coinMultiplier: 0,
  coinBonus: 0,
  xpBonusPct: 0,
  repBonusFlat: 0,
  techDebtReduceFlat: 0,
  cashIncomeBonusPct: 0,
  incidentReducePct: 0,
  candidateQualityBonusPct: 0,
};

const createEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: overrides.id ?? 'emp-1',
  name: overrides.name ?? 'Алексей',
  role: overrides.role ?? 'junior',
  quality: overrides.quality ?? 80,
  morale: overrides.morale ?? 90,
  traits: overrides.traits ?? [],
  hiredAtIso: overrides.hiredAtIso ?? '2026-01-01T00:00:00.000Z',
  salaryCash: overrides.salaryCash ?? 1000,
  assignment: overrides.assignment ?? 'delivery',
});

const createCompany = (overrides: Partial<Company> = {}): Company => ({
  cash: overrides.cash ?? 1000,
  unlocked: overrides.unlocked ?? true,
  level: overrides.level ?? 'lead',
  onboardingSeen: overrides.onboardingSeen ?? true,
  employees: overrides.employees ?? [createEmployee()],
  ledger: overrides.ledger ?? [],
  activeIncident: overrides.activeIncident ?? null,
  incidentsHistory: overrides.incidentsHistory ?? [],
});

describe('runCompanyTick', () => {
  it('is deterministic for the same inputs', () => {
    const company = createCompany();
    const state = {
      company,
      reputation: 3,
      techDebt: 2,
      totalBuffs: EMPTY_BUFFS,
    };

    const first = runCompanyTick({ reason: 'scenario', state, seed: 'seed', tickIndex: 1 });
    const second = runCompanyTick({ reason: 'scenario', state, seed: 'seed', tickIndex: 1 });

    expect(first.nextCompany.cash).toBe(second.nextCompany.cash);
    expect(first.nextCompany.employees[0]?.morale).toBe(second.nextCompany.employees[0]?.morale);
    expect(first.incident?.happened).toBe(second.incident?.happened);
    expect(first.ledgerEntry.delta).toEqual(second.ledgerEntry.delta);
    expect(first.ledgerEntry.balanceAfter).toEqual(second.ledgerEntry.balanceAfter);
  });

  it('changes results with a different tick index', () => {
    const company = createCompany();
    const state = {
      company,
      reputation: 3,
      techDebt: 2,
      totalBuffs: EMPTY_BUFFS,
    };

    const first = runCompanyTick({ reason: 'scenario', state, seed: 'seed', tickIndex: 1 });
    const second = runCompanyTick({ reason: 'scenario', state, seed: 'seed', tickIndex: 2 });

    expect(first.ledgerEntry.id).not.toBe(second.ledgerEntry.id);
  });

  it('applies crisis penalties when cash drops below zero', () => {
    const employees = [
      createEmployee({ id: 'emp-a', role: 'senior', assignment: 'refactor', morale: 90 }),
      createEmployee({ id: 'emp-b', role: 'senior', assignment: 'refactor', morale: 90 }),
      createEmployee({ id: 'emp-c', role: 'senior', assignment: 'refactor', morale: 90 }),
    ];
    const company = createCompany({ cash: 0, employees });
    const state = {
      company,
      reputation: 1,
      techDebt: 1,
      totalBuffs: EMPTY_BUFFS,
    };

    const result = runCompanyTick({ reason: 'scenario', state, seed: 'seed', tickIndex: 5 });

    expect(result.reputationDelta).toBeLessThan(0);
    expect(result.nextCompany.employees[0]?.morale).toBeLessThan(90);
  });

  it('reduces incident chance based on mitigation buffs', () => {
    const company = createCompany({ employees: [] });
    const state = {
      company,
      reputation: 0,
      techDebt: 0,
      totalBuffs: { ...EMPTY_BUFFS, incidentReducePct: 0.5 },
    };

    const result = runCompanyTick({ reason: 'scenario', state, seed: 'seed', tickIndex: 1 });
    const line = result.ledgerEntry.lines?.find((entry) => entry.includes('Шанс инцидента'));

    expect(line).toContain('12%');
    expect(line).toContain('6%');
  });

  it('clamps incident mitigation to cap', () => {
    const company = createCompany({ employees: [] });
    const state = {
      company,
      reputation: 0,
      techDebt: 0,
      totalBuffs: { ...EMPTY_BUFFS, incidentReducePct: 2 },
    };

    const result = runCompanyTick({ reason: 'scenario', state, seed: 'seed', tickIndex: 2 });
    const line = result.ledgerEntry.lines?.find((entry) => entry.includes('Шанс инцидента'));

    expect(line).toContain('12%');
    expect(line).toContain('2%');
  });
});
