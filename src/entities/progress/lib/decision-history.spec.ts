import { Skill } from '@/entities/skill';
import {
  createDecisionEntry,
  createProgressSnapshot,
  Progress,
  undoLastDecision,
} from '@/entities/progress';
import { createEmptyFinaleState } from '@/entities/finale';
import { createEmptyEndingState } from '@/entities/ending';
import { BALANCE } from '@/shared/config';

describe('decision history undo', () => {
  it('restores skills, metrics, overrides, and history', () => {
    const skills: Skill[] = [
      { id: 'core', name: 'Core', category: 'Engineering', level: 1, maxLevel: 3, deps: [] },
    ];
    const reputationGain = BALANCE.effects.reputation.gain;
    const techDebtGain = BALANCE.effects.techDebt.gain;
    const skillCost = BALANCE.skills.upgradeCostPerLevel;
    const progress: Progress = {
      skillLevels: { core: 1 },
      decisionHistory: [],
      examHistory: [],
      activeExamRun: null,
      certificates: [],
      activeContracts: [],
      completedContractsHistory: [],
      sessionQuests: [],
      sessionQuestSessionId: null,
      candidatesPool: [],
      candidatesRefreshIndex: 0,
      companyTickIndex: 0,
      finale: createEmptyFinaleState(),
      ending: createEmptyEndingState(),
      specializationId: null,
      reputation: reputationGain,
      techDebt: techDebtGain * 2,
      coins: 5,
      scenarioOverrides: { 'scenario-2': true },
      spentXpOnSkills: 0,
      careerStage: 'internship',
    };

    const snapshot = createProgressSnapshot(progress);
    const historyEntry = createDecisionEntry('scenario-1', 'decision-1', snapshot);

    const progressedSkills = [{ ...skills[0], level: 2 }];
    const progressedProgress: Progress = {
      ...progress,
      skillLevels: { core: 2 },
      reputation: reputationGain * 3,
      techDebt: techDebtGain,
      coins: 1,
      scenarioOverrides: { 'scenario-2': false },
      decisionHistory: [historyEntry],
      spentXpOnSkills: skillCost * 8,
    };

    const result = undoLastDecision(progressedSkills, progressedProgress);

    expect(result.undone).toBe(true);
    expect(result.progress.reputation).toBe(reputationGain);
    expect(result.progress.techDebt).toBe(techDebtGain * 2);
    expect(result.progress.coins).toBe(5);
    expect(result.progress.skillLevels.core).toBe(1);
    expect(result.progress.scenarioOverrides['scenario-2']).toBe(true);
    expect(result.progress.decisionHistory).toHaveLength(0);
    expect(result.skills[0]?.level).toBe(1);
  });
});
