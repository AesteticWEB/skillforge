import { Skill } from '../model/skill.model';

export type SkillChangeResult = {
  skills: Skill[];
  nextLevel: number | null;
  reason: string | null;
};

export const clampSkillLevel = (level: number, maxLevel: number): number =>
  Math.min(Math.max(level, 0), maxLevel);

export const getMissingDependencies = (skill: Skill, skills: Skill[]): string[] => {
  if (skill.deps.length === 0) {
    return [];
  }

  const skillsById = new Map(skills.map((item) => [item.id, item]));
  const missing: string[] = [];

  for (const depId of skill.deps) {
    const dependency = skillsById.get(depId);
    const isSatisfied = dependency && dependency.level > 0;
    if (!isSatisfied) {
      missing.push(dependency?.name ?? depId);
    }
  }

  return missing;
};

export const getIncreaseBlockReason = (skills: Skill[], skillId: string): string | null => {
  const skill = skills.find((item) => item.id === skillId);
  if (!skill) {
    return 'Навык не найден';
  }
  if (skill.level >= skill.maxLevel) {
    return 'Уже максимальный уровень';
  }
  const missing = getMissingDependencies(skill, skills);
  if (missing.length > 0) {
    return `Нужно прокачать: ${missing.join(', ')} до уровня 1`;
  }
  return null;
};

export const getDecreaseBlockReason = (skills: Skill[], skillId: string): string | null => {
  const skill = skills.find((item) => item.id === skillId);
  if (!skill) {
    return 'Навык не найден';
  }
  if (skill.level <= 0) {
    return 'Уже минимальный уровень';
  }
  return null;
};

export const changeSkillLevel = (
  skills: Skill[],
  skillId: string,
  delta: number,
): SkillChangeResult => {
  const reason =
    delta >= 0 ? getIncreaseBlockReason(skills, skillId) : getDecreaseBlockReason(skills, skillId);
  if (reason) {
    return { skills, nextLevel: null, reason };
  }

  let nextLevel = 0;
  const updated = skills.map((skill) => {
    if (skill.id !== skillId) {
      return skill;
    }
    nextLevel = clampSkillLevel(skill.level + delta, skill.maxLevel);
    return {
      ...skill,
      level: nextLevel,
    };
  });

  return { skills: updated, nextLevel, reason: null };
};

export const applySkillDelta = (
  skills: Skill[],
  skillId: string,
  delta: number,
): { skills: Skill[]; nextLevel: number | null } => {
  let nextLevel: number | null = null;
  const updated = skills.map((skill) => {
    if (skill.id !== skillId) {
      return skill;
    }
    nextLevel = clampSkillLevel(skill.level + delta, skill.maxLevel);
    return {
      ...skill,
      level: nextLevel,
    };
  });

  if (nextLevel === null) {
    return { skills, nextLevel: null };
  }

  return { skills: updated, nextLevel };
};
