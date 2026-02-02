import { Skill } from '@/entities/skill';
import {
  createDecisionEntry,
  createProgressSnapshot,
  Progress,
  undoLastDecision,
} from '@/entities/progress';

describe('decision history undo', () => {
  it('restores skills, metrics, overrides, and history', () => {
    const skills: Skill[] = [
      { id: 'core', name: 'Core', category: 'Engineering', level: 1, maxLevel: 3, deps: [] },
    ];
    const progress: Progress = {
      skillLevels: { core: 1 },
      decisionHistory: [],
      reputation: 1,
      techDebt: 2,
      scenarioOverrides: { 'scenario-2': true },
    };

    const snapshot = createProgressSnapshot(progress);
    const historyEntry = createDecisionEntry('scenario-1', 'decision-1', snapshot);

    const progressedSkills = [{ ...skills[0], level: 2 }];
    const progressedProgress: Progress = {
      ...progress,
      skillLevels: { core: 2 },
      reputation: 3,
      techDebt: 1,
      scenarioOverrides: { 'scenario-2': false },
      decisionHistory: [historyEntry],
    };

    const result = undoLastDecision(progressedSkills, progressedProgress);

    expect(result.undone).toBe(true);
    expect(result.progress.reputation).toBe(1);
    expect(result.progress.techDebt).toBe(2);
    expect(result.progress.skillLevels.core).toBe(1);
    expect(result.progress.scenarioOverrides['scenario-2']).toBe(true);
    expect(result.progress.decisionHistory).toHaveLength(0);
    expect(result.skills[0]?.level).toBe(1);
  });
});
