import { Skill } from '../model/skill.model';
import { getIncreaseBlockReason } from './skill-logic';
import { getSkillUpgradeCost } from './skill-cost';

export type SkillUpgradeMeta = {
  skill: Skill | null;
  nextLevel: number | null;
  cost: number | null;
  reason: string | null;
  canIncrease: boolean;
};

export const getSkillUpgradeMeta = (
  skills: Skill[],
  skillId: string,
  availableXp: number,
): SkillUpgradeMeta => {
  const skill = skills.find((item) => item.id === skillId) ?? null;
  if (!skill) {
    return {
      skill: null,
      nextLevel: null,
      cost: null,
      reason: 'Навык не найден',
      canIncrease: false,
    };
  }

  if (skill.level >= skill.maxLevel) {
    return {
      skill,
      nextLevel: null,
      cost: null,
      reason: 'Максимальный уровень',
      canIncrease: false,
    };
  }

  const nextLevel = skill.level + 1;
  const cost = getSkillUpgradeCost(nextLevel);
  const baseReason = getIncreaseBlockReason(skills, skillId);
  if (baseReason) {
    return {
      skill,
      nextLevel,
      cost,
      reason: baseReason === 'Уже максимальный уровень' ? 'Максимальный уровень' : baseReason,
      canIncrease: false,
    };
  }

  if (availableXp < cost) {
    return {
      skill,
      nextLevel,
      cost,
      reason: `Не хватает XP: нужно ${cost}, доступно ${availableXp}`,
      canIncrease: false,
    };
  }

  return {
    skill,
    nextLevel,
    cost,
    reason: null,
    canIncrease: true,
  };
};
