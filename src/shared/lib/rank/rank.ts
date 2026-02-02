export type RankStageId = 'internship' | 'junior' | 'middle' | 'senior';

export type RankStage = {
  id: RankStageId;
  title: string;
  minXp: number;
  maxXp: number | null;
  nextXp: number | null;
};

export type RankProgress = {
  stageId: RankStageId;
  stageTitle: string;
  stageIndex: number;
  stages: RankStage[];
  xp: number;
  progressPercent: number;
  progressWidth: string;
  nextLevelXp: number | null;
  nextLevelText: string;
  isMax: boolean;
};

export const RANK_STAGES: RankStage[] = [
  { id: 'internship', title: 'Стажировка', minXp: 0, maxXp: 99, nextXp: 100 },
  { id: 'junior', title: 'Junior', minXp: 100, maxXp: 249, nextXp: 250 },
  { id: 'middle', title: 'Middle', minXp: 250, maxXp: 449, nextXp: 450 },
  { id: 'senior', title: 'Senior', minXp: 450, maxXp: null, nextXp: null },
];

export const getRankProgress = (rawXp: number): RankProgress => {
  const normalizedXp = Number.isFinite(rawXp) ? Math.max(0, Math.floor(rawXp)) : 0;
  const resolvedIndex = RANK_STAGES.findIndex((stage) => {
    if (stage.nextXp === null) {
      return normalizedXp >= stage.minXp;
    }
    return normalizedXp >= stage.minXp && normalizedXp < stage.nextXp;
  });
  const stageIndex = resolvedIndex === -1 ? 0 : resolvedIndex;
  const stage = RANK_STAGES[stageIndex] ?? RANK_STAGES[0];
  const isMax = stage.nextXp === null;
  const nextXp = stage.nextXp ?? stage.minXp;
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
    xp: normalizedXp,
    progressPercent,
    progressWidth: `${progressPercent.toFixed(0)}%`,
    nextLevelXp,
    nextLevelText,
    isMax,
  };
};
