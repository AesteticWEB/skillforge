import { Progress } from '@/entities/progress';
import { Skill } from '@/entities/skill';
import { SKILL_STAGE_ORDER, type ProfessionId, type SkillStageId } from '@/shared/config';
import { selectCoreSkillsForStage } from './core-skills';

export type StageProgress = {
  total: number;
  completed: number;
  isComplete: boolean;
};

export type StagePromotionStatus = {
  stage: SkillStageId;
  nextStage: SkillStageId | null;
  skills: StageProgress;
  scenarios: StageProgress;
  canPromote: boolean;
};

const resolveProgress = (total: number, completed: number): StageProgress => ({
  total,
  completed,
  isComplete: total > 0 && completed >= total,
});

const getNextStageId = (stage: SkillStageId): SkillStageId | null => {
  const index = SKILL_STAGE_ORDER.indexOf(stage);
  if (index === -1) {
    return null;
  }
  return SKILL_STAGE_ORDER[index + 1] ?? null;
};

export const getStagePromotionStatus = (
  progress: Progress,
  skills: Skill[],
  profession: ProfessionId | string,
  stageScenarioIds?: readonly string[],
): StagePromotionStatus => {
  const stage = progress.careerStage ?? 'internship';
  const stageSkillIds = selectCoreSkillsForStage(profession, stage);
  const resolvedScenarioIds = stageScenarioIds ?? [];

  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
  let skillsMaxed = 0;
  for (const id of stageSkillIds) {
    const skill = skillsById.get(id);
    if (skill && skill.level >= skill.maxLevel) {
      skillsMaxed += 1;
    }
  }
  const skillsProgress = resolveProgress(stageSkillIds.length, skillsMaxed);

  const completedScenarios = new Set(progress.decisionHistory.map((entry) => entry.scenarioId));
  let scenariosCompleted = 0;
  for (const id of resolvedScenarioIds) {
    if (completedScenarios.has(id)) {
      scenariosCompleted += 1;
    }
  }
  const scenariosProgress = resolveProgress(resolvedScenarioIds.length, scenariosCompleted);
  const nextStage = getNextStageId(stage);

  return {
    stage,
    nextStage,
    skills: skillsProgress,
    scenarios: scenariosProgress,
    canPromote: Boolean(nextStage) && skillsProgress.isComplete,
  };
};

export const canPromoteToNextStage = (
  progress: Progress,
  skills: Skill[],
  profession: ProfessionId | string,
): boolean => getStagePromotionStatus(progress, skills, profession).canPromote;
