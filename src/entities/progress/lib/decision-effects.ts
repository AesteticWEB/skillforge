import { DecisionEffects } from '@/entities/decision';
import { applySkillDelta, Skill } from '@/entities/skill';
import { MetricKey, Progress } from '../model/progress.model';

const DEFAULT_METRICS: readonly MetricKey[] = ['reputation', 'techDebt'];

export const applyDecisionEffects = (
  skills: Skill[],
  progress: Progress,
  effects: DecisionEffects,
  metricKeys: readonly MetricKey[] = DEFAULT_METRICS,
): { skills: Skill[]; progress: Progress } => {
  let nextSkills = skills;
  const nextSkillLevels = { ...progress.skillLevels };
  let reputation = progress.reputation;
  let techDebt = progress.techDebt;

  for (const [key, delta] of Object.entries(effects)) {
    if (metricKeys.includes(key as MetricKey)) {
      if (key === 'reputation') {
        reputation += delta;
      } else if (key === 'techDebt') {
        techDebt += delta;
      }
      continue;
    }

    const updated = applySkillDelta(nextSkills, key, delta);
    if (updated.nextLevel !== null) {
      nextSkills = updated.skills;
      nextSkillLevels[key] = updated.nextLevel;
    }
  }

  return {
    skills: nextSkills,
    progress: {
      ...progress,
      skillLevels: nextSkillLevels,
      reputation,
      techDebt,
    },
  };
};
