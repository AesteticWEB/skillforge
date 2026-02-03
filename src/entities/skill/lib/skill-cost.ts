import { BALANCE } from '@/shared/config';

export const getSkillUpgradeCost = (nextLevel: number, costPerLevel?: number): number => {
  void nextLevel;
  const resolvedCost =
    typeof costPerLevel === 'number' ? costPerLevel : BALANCE.skills.upgradeCostPerLevel;
  return Math.max(0, Math.floor(resolvedCost));
};
