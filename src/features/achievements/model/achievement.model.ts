import type { SkillStageId } from '@/shared/config';

export type AchievementId = 'streak-5' | 'maxed-3';
export type SkillMasteryType = 'skill_mastered';

export type AchievementDefinition = {
  id: AchievementId;
  title: string;
  description: string;
};

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'streak-5',
    title: 'Серия из 5 сценариев',
    description: 'Заверши пять сценариев подряд без перерыва.',
  },
  {
    id: 'maxed-3',
    title: 'Три прокачанных навыка',
    description: 'Доведи до максимума три разных навыка.',
  },
];

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  earnedAt: string;
}

export type SkillMasteryAchievement = {
  type: SkillMasteryType;
  skillId: string;
  skillName: string;
  stage: SkillStageId;
  profession: string;
  earnedAt: string;
};
