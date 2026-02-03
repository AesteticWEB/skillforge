import { SKILL_STAGE_LABELS, SKILL_STAGE_ORDER, type SkillStageId } from '@/shared/config';

export type CareerStageSegment = {
  id: SkillStageId;
  title: string;
  achieved: boolean;
  isCurrent: boolean;
};

export type CareerStageProgress = {
  stageId: SkillStageId;
  stageLabel: string;
  segments: CareerStageSegment[];
  isMax: boolean;
  hintText: string;
};

const normalizeStage = (stage: SkillStageId): SkillStageId =>
  SKILL_STAGE_ORDER.includes(stage) ? stage : 'internship';

export const getCareerStageProgress = (stage: SkillStageId): CareerStageProgress => {
  const normalized = normalizeStage(stage);
  const currentIndex = SKILL_STAGE_ORDER.indexOf(normalized);
  const segments = SKILL_STAGE_ORDER.map((id, index) => ({
    id,
    title: SKILL_STAGE_LABELS[id],
    achieved: index <= currentIndex,
    isCurrent: index === currentIndex,
  }));
  const isMax = normalized === 'senior';
  const hintText = isMax
    ? 'Максимальный уровень достигнут'
    : 'Чтобы перейти дальше: прокачай 4 навыка этапа до максимума';

  return {
    stageId: normalized,
    stageLabel: SKILL_STAGE_LABELS[normalized],
    segments,
    isMax,
    hintText,
  };
};
