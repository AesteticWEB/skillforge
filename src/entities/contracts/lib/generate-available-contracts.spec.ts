import { generateAvailableContracts } from './generate-available-contracts';
import type { ContractDifficulty } from '../model/contract.model';

const countDifficulty = (
  contracts: { difficulty: ContractDifficulty }[],
  difficulty: ContractDifficulty,
) => contracts.filter((contract) => contract.difficulty === difficulty).length;

describe('generateAvailableContracts', () => {
  it('is deterministic for the same inputs', () => {
    const first = generateAvailableContracts({
      stage: 'junior',
      reputation: 3,
      techDebt: 2,
      seed: 'seed',
      count: 5,
    });
    const second = generateAvailableContracts({
      stage: 'junior',
      reputation: 3,
      techDebt: 2,
      seed: 'seed',
      count: 5,
    });

    expect(first.map((contract) => contract.id)).toEqual(second.map((contract) => contract.id));
    expect(first.map((contract) => contract.title)).toEqual(
      second.map((contract) => contract.title),
    );
    expect(first.map((contract) => contract.reward)).toEqual(
      second.map((contract) => contract.reward),
    );
  });

  it('changes results with a different seed', () => {
    const first = generateAvailableContracts({
      stage: 'middle',
      reputation: 2,
      techDebt: 1,
      seed: 'a',
      count: 5,
    });
    const second = generateAvailableContracts({
      stage: 'middle',
      reputation: 2,
      techDebt: 1,
      seed: 'b',
      count: 5,
    });

    const firstIds = first.map((contract) => contract.id);
    const secondIds = second.map((contract) => contract.id);
    expect(firstIds).not.toEqual(secondIds);
    expect(firstIds.some((id, index) => id !== secondIds[index])).toBe(true);
  });

  it('favors hard contracts at high reputation', () => {
    const lowRep = generateAvailableContracts({
      stage: 'senior',
      reputation: 0,
      techDebt: 0,
      seed: 'rep',
      count: 6,
    });
    const highRep = generateAvailableContracts({
      stage: 'senior',
      reputation: 10,
      techDebt: 0,
      seed: 'rep',
      count: 6,
    });

    const lowHard = countDifficulty(lowRep, 'сложно');
    const highHard = countDifficulty(highRep, 'сложно');

    expect(highHard).toBeGreaterThanOrEqual(lowHard);
    expect(highHard).toBeGreaterThan(0);
  });

  it('ensures at least one debt contract when tech debt is high', () => {
    const contracts = generateAvailableContracts({
      stage: 'middle',
      reputation: 0,
      techDebt: 12,
      seed: 'debt',
      count: 5,
    });

    expect(
      contracts.some((contract) => contract.objectives.some((obj) => obj.type === 'debt')),
    ).toBe(true);
  });

  it('returns a fallback when templates are empty', async () => {
    jest.resetModules();
    jest.doMock('@/shared/config/contract-templates', () => ({
      CONTRACT_TEMPLATES: [],
    }));

    const { generateAvailableContracts: generateFallback } =
      await import('./generate-available-contracts');
    const contracts = generateFallback({
      stage: 'junior',
      reputation: 0,
      techDebt: 0,
      seed: 'seed',
      count: 5,
    });

    expect(contracts).toHaveLength(1);
    expect(contracts[0].title).toBe('Быстрый фикс');
    expect(contracts[0].objectives[0].type).toBe('scenario');
  });
});
