import { resolveEnding } from './resolve-ending';
import type { ResolveEndingInput } from '../model/ending.model';

const baseInput = (overrides: Partial<ResolveEndingInput> = {}): ResolveEndingInput => ({
  cash: 0,
  reputation: 50,
  techDebt: 30,
  avgMorale: 80,
  companyLevel: 'cto',
  finale: { finished: true, branchFlags: {} },
  counters: { completedContracts: 0, incidents: 0, incidentsResolved: 0 },
  ...overrides,
});

describe('resolveEnding', () => {
  it('returns bankrupt when cash below zero', () => {
    const result = resolveEnding(baseInput({ cash: -1 }));
    expect(result.endingId).toBe('bankrupt');
  });

  it('returns scandal when reputation is zero even with high cash', () => {
    const result = resolveEnding(baseInput({ cash: 99999, reputation: 0 }));
    expect(result.endingId).toBe('scandal');
  });

  it('returns ipo for strong metrics', () => {
    const result = resolveEnding(baseInput({ cash: 30000, reputation: 80, techDebt: 20 }));
    expect(result.endingId).toBe('ipo');
  });

  it('returns acq for solid metrics', () => {
    const result = resolveEnding(baseInput({ cash: 15000, reputation: 60, techDebt: 50 }));
    expect(result.endingId).toBe('acq');
  });

  it('returns oss for ethical path', () => {
    const result = resolveEnding(
      baseInput({
        cash: 2000,
        reputation: 50,
        techDebt: 60,
        finale: { finished: true, branchFlags: { ethical: true } },
      }),
    );
    expect(result.endingId).toBe('oss');
  });

  it('prioritizes bankrupt over scandal', () => {
    const result = resolveEnding(baseInput({ cash: -1, reputation: 0 }));
    expect(result.endingId).toBe('bankrupt');
  });

  it('prioritizes scandal over ipo when both conditions match', () => {
    const result = resolveEnding(baseInput({ cash: 30000, reputation: 0, techDebt: 10 }));
    expect(result.endingId).toBe('scandal');
  });

  it('prioritizes ipo over acq when both conditions match', () => {
    const result = resolveEnding(baseInput({ cash: 25000, reputation: 75, techDebt: 30 }));
    expect(result.endingId).toBe('ipo');
  });

  it('blocks good endings when finale not finished', () => {
    const result = resolveEnding(
      baseInput({
        cash: 30000,
        reputation: 80,
        techDebt: 20,
        finale: { finished: false, branchFlags: {} },
      }),
    );
    expect(result.endingId).toBe('oss');
  });
});
