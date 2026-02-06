import type { ExamConfig, ExamQuestion, ExamSession } from '../model/exam.model';
import { seededShuffle } from './seeded-rng';

type BuildExamSessionParams = {
  exam: ExamConfig;
  questionsById: Record<string, ExamQuestion>;
  seed: string;
  attemptIndex?: number;
  rating?: number;
};

const buildBaseSeed = (seed: string, examId: string, attemptIndex: number): string =>
  `${seed}:${examId}:${attemptIndex}`;

type QuestionBucket = 'basic' | 'normal' | 'advanced';

const BASIC_TAGS = ['basic', 'intro', 'beginner', 'fundamentals'];
const ADVANCED_TAGS = ['advanced', 'hard', 'expert', 'senior'];

const resolveDifficultyBucket = (question: ExamQuestion): QuestionBucket => {
  const tags = (question.tags ?? []).map((tag) => tag.toLowerCase());
  if (tags.some((tag) => BASIC_TAGS.includes(tag))) {
    return 'basic';
  }
  if (tags.some((tag) => ADVANCED_TAGS.includes(tag))) {
    return 'advanced';
  }
  if (question.type === 'ordering' || question.type === 'caseDecision') {
    return 'advanced';
  }
  if (question.type === 'multiChoice') {
    return 'normal';
  }
  const explanationLength = question.explanation?.length ?? 0;
  if (explanationLength >= 200) {
    return 'advanced';
  }
  return 'basic';
};

const clampCount = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.floor(value)));

const pickQuestionsFromBuckets = (
  buckets: Record<QuestionBucket, string[]>,
  total: number,
  seed: string,
  rating: number,
): string[] => {
  const safeTotal = Math.max(0, Math.floor(total));
  if (safeTotal === 0) {
    return [];
  }

  const weights =
    rating < 35
      ? { basic: 0.6, normal: 0.3, advanced: 0.1 }
      : rating > 70
        ? { basic: 0.25, normal: 0.45, advanced: 0.3 }
        : { basic: 0.4, normal: 0.4, advanced: 0.2 };

  const targetBasic = clampCount(safeTotal * weights.basic, 0, safeTotal);
  const targetAdvanced = clampCount(safeTotal * weights.advanced, 0, safeTotal);
  const targetNormal = Math.max(0, safeTotal - targetBasic - targetAdvanced);

  const shuffledBasic = seededShuffle(buckets.basic, `${seed}:basic`);
  const shuffledNormal = seededShuffle(buckets.normal, `${seed}:normal`);
  const shuffledAdvanced = seededShuffle(buckets.advanced, `${seed}:advanced`);

  const picked: string[] = [];
  picked.push(...shuffledBasic.slice(0, targetBasic));
  picked.push(...shuffledNormal.slice(0, targetNormal));
  picked.push(...shuffledAdvanced.slice(0, targetAdvanced));

  const used = new Set(picked);
  const leftovers = [
    ...shuffledBasic.filter((id) => !used.has(id)),
    ...shuffledNormal.filter((id) => !used.has(id)),
    ...shuffledAdvanced.filter((id) => !used.has(id)),
  ];
  const fallback = seededShuffle(leftovers, `${seed}:fallback`);

  while (picked.length < safeTotal && fallback.length > 0) {
    picked.push(fallback[picked.length % fallback.length]);
  }

  return picked;
};

export const buildExamSession = ({
  exam,
  questionsById,
  seed,
  attemptIndex = 0,
  rating = 50,
}: BuildExamSessionParams): ExamSession => {
  const baseSeed = buildBaseSeed(seed, exam.id, attemptIndex);
  const pool = Array.isArray(exam.questionIds) ? [...exam.questionIds] : [];
  const normalizedRating = Math.min(100, Math.max(0, Number.isFinite(rating) ? rating : 50));

  const bucketed = pool.reduce(
    (acc, id) => {
      const question = questionsById[id];
      const bucket = question ? resolveDifficultyBucket(question) : 'normal';
      acc[bucket].push(id);
      return acc;
    },
    { basic: [] as string[], normal: [] as string[], advanced: [] as string[] },
  );

  const shuffledPool = pickQuestionsFromBuckets(
    bucketed,
    exam.questionCount,
    baseSeed,
    normalizedRating,
  );

  if (shuffledPool.length === 0) {
    return {
      examId: exam.id,
      questionIds: [],
      seed: baseSeed,
    };
  }

  const questionIds: string[] = [];
  if (shuffledPool.length >= exam.questionCount) {
    questionIds.push(...shuffledPool.slice(0, exam.questionCount));
  } else {
    for (let index = 0; index < exam.questionCount; index += 1) {
      questionIds.push(shuffledPool[index % shuffledPool.length]);
    }
  }

  return {
    examId: exam.id,
    questionIds,
    seed: baseSeed,
  };
};
