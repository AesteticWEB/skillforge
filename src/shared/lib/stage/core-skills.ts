import { PROFESSION_STAGE_SKILLS, type ProfessionId, type SkillStageId } from '@/shared/config';

export const selectCoreSkillsForStage = (
  professionId: ProfessionId | string,
  careerStage: SkillStageId,
): readonly string[] => {
  const mapping = PROFESSION_STAGE_SKILLS[professionId as ProfessionId];
  return mapping?.[careerStage] ?? [];
};
