import { DecisionEffects } from '@/entities/decision';
import { applyDecisionEffects, Progress } from '@/entities/progress';
import { Skill } from '@/entities/skill';
import { BALANCE } from '@/shared/config';

describe('decision effects', () => {
  it('applies metrics without auto-upgrading skills', () => {
    const skills: Skill[] = [
      { id: 'core', name: 'Core', category: 'Engineering', level: 0, maxLevel: 3, deps: [] },
    ];
    const progress: Progress = {
      skillLevels: { core: 0 },
      decisionHistory: [],
      examHistory: [],
      activeExamRun: null,
      certificates: [],
      activeContracts: [],
      completedContractsHistory: [],
      specializationId: null,
      reputation: 0,
      techDebt: 0,
      coins: 4,
      scenarioOverrides: {},
      spentXpOnSkills: 0,
      careerStage: 'internship',
    };
    const reputationDelta = BALANCE.effects.reputation.gain * 2;
    const techDebtDelta = -BALANCE.effects.techDebt.relief;
    const coinsDelta = -10;
    const effects: DecisionEffects = {
      reputation: reputationDelta,
      techDebt: techDebtDelta,
      coins: coinsDelta,
      core: BALANCE.effects.skill.gain,
    };

    const result = applyDecisionEffects(skills, progress, effects);

    expect(result.progress.reputation).toBe(reputationDelta);
    expect(result.progress.techDebt).toBe(techDebtDelta);
    expect(result.progress.coins).toBe(0);
    expect(result.skills[0]?.level).toBe(0);
    expect(result.progress.skillLevels.core).toBe(0);
  });
});
