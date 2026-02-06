import {
  MAX_ACTIVE_CONTRACTS,
  canAcceptContract,
  createQuickFixContract,
  ensureQuickFixContract,
  isQuickFixContract,
  isStuck,
  resolveQuickFixCompletion,
} from '@/entities/contracts';
import type { Skill } from '@/entities/skill';

const BASE_SKILL: Skill = {
  id: 'skill-core',
  name: 'Core',
  category: 'Engineering',
  level: 0,
  maxLevel: 1,
  deps: [],
};

describe('contracts', () => {
  it('enforces active contract limit', () => {
    expect(canAcceptContract(MAX_ACTIVE_CONTRACTS - 1)).toBe(true);
    expect(canAcceptContract(MAX_ACTIVE_CONTRACTS)).toBe(false);
  });

  it('detects stuck state', () => {
    const stuck = isStuck({
      coins: 0,
      companyCash: 0,
      activeScenariosCount: 0,
      stageSkillIds: [BASE_SKILL.id],
      skills: [BASE_SKILL],
      availableXp: 0,
      canPromote: false,
      availableContractsCount: 0,
      examAvailable: false,
    });

    expect(stuck).toBe(true);
  });

  it('does not mark stuck when scenarios are available', () => {
    const stuck = isStuck({
      coins: 0,
      companyCash: 0,
      activeScenariosCount: 1,
      stageSkillIds: [BASE_SKILL.id],
      skills: [BASE_SKILL],
      availableXp: 0,
      canPromote: false,
      availableContractsCount: 0,
      examAvailable: false,
    });

    expect(stuck).toBe(false);
  });

  it('adds quick fix contract when stuck', () => {
    const result = ensureQuickFixContract({
      available: [],
      active: [],
      stuck: true,
      stage: 'internship',
      seed: 'seed',
    });

    expect(result.added).toBe(true);
    expect(result.available).toHaveLength(1);
    expect(isQuickFixContract(result.available[0])).toBe(true);
  });

  it('does not duplicate quick fix contract', () => {
    const first = ensureQuickFixContract({
      available: [],
      active: [],
      stuck: true,
      stage: 'internship',
      seed: 'seed',
    });
    const second = ensureQuickFixContract({
      available: first.available,
      active: [],
      stuck: true,
      stage: 'internship',
      seed: 'seed',
    });

    expect(second.added).toBe(false);
    expect(second.available).toHaveLength(1);
  });

  it('builds quick fix completion entry with reward', () => {
    const quickFix = createQuickFixContract({ seed: 'seed' });
    const completedAtIso = '2026-02-05T10:00:00.000Z';
    const completion = resolveQuickFixCompletion({
      available: [quickFix],
      active: [],
      completedAtIso,
    });

    expect(completion).not.toBeNull();
    if (!completion) {
      return;
    }

    expect(completion.completedEntry.id).toBe(quickFix.id);
    expect(completion.completedEntry.completedAtIso).toBe(completedAtIso);
    expect(completion.reward.coins).toBeGreaterThan(0);
    expect(completion.available).toHaveLength(0);
  });
});
