import type { SkillStageId } from '@/shared/config';

export type AchievementId =
  | 'streak-5'
  | 'maxed-3'
  | 'session-scenario-sprint'
  | 'session-scenario-focus'
  | 'session-exam-pass'
  | 'session-exam-ready'
  | 'session-purchase-upgrade'
  | 'session-purchase-invest';
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
  {
    id: 'session-scenario-sprint',
    title: 'Спринт сценариев',
    description: 'Выполни сценарийный квест сессии.',
  },
  {
    id: 'session-scenario-focus',
    title: 'Фокус на решениях',
    description: 'Закрой серию сценариев в рамках сессии.',
  },
  {
    id: 'session-exam-pass',
    title: 'Экзаменатор',
    description: 'Сдай экзамен в рамках сессионного квеста.',
  },
  {
    id: 'session-exam-ready',
    title: 'Готов к экзамену',
    description: 'Подтверди знания экзаменом в этой сессии.',
  },
  {
    id: 'session-purchase-upgrade',
    title: 'Апгрейд недели',
    description: 'Купи предмет и закрой квест сессии.',
  },
  {
    id: 'session-purchase-invest',
    title: 'Инвестиция в инструменты',
    description: 'Сделай покупку для роста команды в текущей сессии.',
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
