import { DecisionEffects } from '@/entities/decision';
import { Skill } from '@/entities/skill';
import { MetricKey, Progress } from '../model/progress.model';

const DEFAULT_METRICS: readonly MetricKey[] = ['reputation', 'techDebt', 'coins'];

export const applyDecisionEffects = (
  skills: Skill[],
  progress: Progress,
  effects: DecisionEffects,
  metricKeys: readonly MetricKey[] = DEFAULT_METRICS,
): { skills: Skill[]; progress: Progress } => {
  const nextSkills = skills;
  const nextSkillLevels = { ...progress.skillLevels };
  let reputation = progress.reputation;
  let techDebt = progress.techDebt;
  let coins = progress.coins;

  for (const [key, delta] of Object.entries(effects)) {
    if (metricKeys.includes(key as MetricKey)) {
      if (key === 'reputation') {
        reputation += delta;
      } else if (key === 'techDebt') {
        techDebt += delta;
      } else if (key === 'coins') {
        coins += delta;
      }
      continue;
    }
  }

  return {
    skills: nextSkills,
    progress: {
      ...progress,
      skillLevels: nextSkillLevels,
      reputation,
      techDebt,
      coins: Math.max(0, coins),
    },
  };
};
