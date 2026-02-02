import { DecisionEffects } from '@/entities/decision';
import { applyDecisionEffects, Progress } from '@/entities/progress';
import { Skill } from '@/entities/skill';

describe('decision effects', () => {
  it('applies metrics and skill deltas', () => {
    const skills: Skill[] = [
      { id: 'core', name: 'Core', category: 'Engineering', level: 0, maxLevel: 3, deps: [] },
    ];
    const progress: Progress = {
      skillLevels: { core: 0 },
      decisionHistory: [],
      reputation: 0,
      techDebt: 0,
    };
    const effects: DecisionEffects = {
      reputation: 2,
      techDebt: -1,
      core: 1,
    };

    const result = applyDecisionEffects(skills, progress, effects);

    expect(result.progress.reputation).toBe(2);
    expect(result.progress.techDebt).toBe(-1);
    expect(result.skills[0]?.level).toBe(1);
    expect(result.progress.skillLevels.core).toBe(1);
  });
});
