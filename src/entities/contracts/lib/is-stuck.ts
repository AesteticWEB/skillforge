import { getSkillUpgradeMeta } from '@/entities/skill';
import type { Skill } from '@/entities/skill';

export type StuckState = {
  coins: number;
  companyCash: number;
  activeScenariosCount: number;
  stageSkillIds: readonly string[];
  skills: Skill[];
  availableXp: number;
  canPromote: boolean;
  availableContractsCount: number;
  examAvailable: boolean;
};

export const isStuck = (state: StuckState): boolean => {
  if (state.coins > 0) {
    return false;
  }

  if (state.companyCash > 0) {
    return false;
  }

  if (state.activeScenariosCount > 0) {
    return false;
  }

  const canUpgradeSkill = state.stageSkillIds.some(
    (skillId) => getSkillUpgradeMeta(state.skills, skillId, state.availableXp).canIncrease,
  );
  if (canUpgradeSkill) {
    return false;
  }

  if (state.canPromote) {
    return false;
  }

  if (state.availableContractsCount > 0) {
    return false;
  }

  if (state.examAvailable) {
    return false;
  }

  return true;
};
