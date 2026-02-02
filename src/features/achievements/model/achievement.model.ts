export type AchievementId = 'streak-5' | 'maxed-3';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  earnedAt: string;
}
