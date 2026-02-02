export const getSkillUpgradeCost = (nextLevel: number): number => {
  const clampedLevel = Math.min(Math.max(Math.floor(nextLevel), 1), 5);
  return Math.round(6 + clampedLevel * clampedLevel * 2);
};
