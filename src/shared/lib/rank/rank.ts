export type RankStageId = 'internship' | 'junior' | 'middle' | 'senior';

export type RankStage = {
  id: RankStageId;
  title: string;
  minXp: number;
  maxXp: number | null;
  nextXp: number | null;
};

export type RankStageSegment = {
  id: RankStageId;
  title: string;
  achieved: boolean;
};

export type RankProgress = {
  stageId: RankStageId;
  stageTitle: string;
  stageIndex: number;
  stages: RankStage[];
  segments: RankStageSegment[];
  xp: number;
  progressPercent: number;
  progressWidth: string;
  nextLevelXp: number | null;
  nextLevelText: string;
  isMax: boolean;
};

export const RANK_STAGES: RankStage[] = [
  { id: 'internship', title: 'Стажировка', minXp: 0, maxXp: 19, nextXp: 20 },
  { id: 'junior', title: 'Junior', minXp: 20, maxXp: 39, nextXp: 40 },
  { id: 'middle', title: 'Middle', minXp: 40, maxXp: 59, nextXp: 60 },
  { id: 'senior', title: 'Senior', minXp: 60, maxXp: null, nextXp: null },
];

const normalizeXp = (rawXp: number): number =>
  Number.isFinite(rawXp) ? Math.max(0, Math.floor(rawXp)) : 0;

export const selectRank = (rawXp: number): RankStage => {
  const normalizedXp = normalizeXp(rawXp);
  const resolvedIndex = RANK_STAGES.findIndex((stage) => {
    if (stage.nextXp === null) {
      return normalizedXp >= stage.minXp;
    }
    return normalizedXp >= stage.minXp && normalizedXp < stage.nextXp;
  });
  const stageIndex = resolvedIndex === -1 ? 0 : resolvedIndex;
  return RANK_STAGES[stageIndex] ?? RANK_STAGES[0];
};

export const selectNextThreshold = (rawXp: number): number | null => {
  const stage = selectRank(rawXp);
  return stage.nextXp ?? null;
};

export const selectStageSegments = (rawXp: number): RankStageSegment[] => {
  const normalizedXp = normalizeXp(rawXp);
  return RANK_STAGES.map((stage) => ({
    id: stage.id,
    title: stage.title,
    achieved: normalizedXp >= stage.minXp,
  }));
};

export const getRankProgress = (rawXp: number): RankProgress => {
  const normalizedXp = Number.isFinite(rawXp) ? Math.max(0, Math.floor(rawXp)) : 0;
  const stage = selectRank(normalizedXp);
  const stageIndex = RANK_STAGES.findIndex((item) => item.id === stage.id);
  const isMax = stage.nextXp === null;
  const nextXp = selectNextThreshold(normalizedXp) ?? stage.minXp;
  const progressPercent = isMax
    ? 100
    : Math.min(100, Math.max(0, ((normalizedXp - stage.minXp) / (nextXp - stage.minXp)) * 100));
  const nextLevelXp = isMax ? null : Math.max(0, nextXp - normalizedXp);
  const nextLevelText = isMax
    ? 'Максимальный уровень достигнут'
    : `До следующего уровня: ${nextLevelXp} XP`;

  return {
    stageId: stage.id,
    stageTitle: stage.title,
    stageIndex,
    stages: RANK_STAGES,
    segments: selectStageSegments(normalizedXp),
    xp: normalizedXp,
    progressPercent,
    progressWidth: `${progressPercent.toFixed(0)}%`,
    nextLevelXp,
    nextLevelText,
    isMax,
  };
};
