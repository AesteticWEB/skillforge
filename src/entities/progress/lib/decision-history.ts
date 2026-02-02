import { clampSkillLevel, Skill } from '@/entities/skill';
import { DecisionHistoryEntry, Progress, ProgressSnapshot } from '../model/progress.model';

export type UndoDecisionResult = {
  skills: Skill[];
  progress: Progress;
  undone: boolean;
  reason?: string;
};

export const createProgressSnapshot = (progress: Progress): ProgressSnapshot => ({
  skillLevels: { ...progress.skillLevels },
  reputation: progress.reputation,
  techDebt: progress.techDebt,
  scenarioOverrides: { ...progress.scenarioOverrides },
});

export const createDecisionEntry = (
  scenarioId: string,
  decisionId: string,
  snapshot: ProgressSnapshot,
): DecisionHistoryEntry => ({
  scenarioId,
  decisionId,
  decidedAt: new Date().toISOString(),
  snapshot,
});

export const restoreSkillsFromSnapshot = (skills: Skill[], snapshot: ProgressSnapshot): Skill[] => {
  return skills.map((skill) => {
    const level = snapshot.skillLevels[skill.id] ?? skill.level;
    return {
      ...skill,
      level: clampSkillLevel(level, skill.maxLevel),
    };
  });
};

export const undoLastDecision = (skills: Skill[], progress: Progress): UndoDecisionResult => {
  const history = progress.decisionHistory;
  const lastEntry = history[history.length - 1];
  if (!lastEntry) {
    return { skills, progress, undone: false, reason: 'Нет решений для отката.' };
  }
  if (!lastEntry.snapshot) {
    return { skills, progress, undone: false, reason: 'Нет снимка для отката.' };
  }

  const nextHistory = history.slice(0, -1);
  const restoredSkills = restoreSkillsFromSnapshot(skills, lastEntry.snapshot);
  const restoredProgress: Progress = {
    ...progress,
    skillLevels: { ...lastEntry.snapshot.skillLevels },
    reputation: lastEntry.snapshot.reputation ?? progress.reputation,
    techDebt: lastEntry.snapshot.techDebt ?? progress.techDebt,
    scenarioOverrides: { ...(lastEntry.snapshot.scenarioOverrides ?? {}) },
    decisionHistory: nextHistory,
  };

  return {
    skills: restoredSkills,
    progress: restoredProgress,
    undone: true,
  };
};
