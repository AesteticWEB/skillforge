import type { ExamConfig, ExamQuestion, ExamSession } from '../model/exam.model';
import { seededShuffle } from './seeded-rng';

type BuildExamSessionParams = {
  exam: ExamConfig;
  questionsById: Record<string, ExamQuestion>;
  seed: string;
  attemptIndex?: number;
};

const buildBaseSeed = (seed: string, examId: string, attemptIndex: number): string =>
  `${seed}:${examId}:${attemptIndex}`;

export const buildExamSession = ({
  exam,
  questionsById,
  seed,
  attemptIndex = 0,
}: BuildExamSessionParams): ExamSession => {
  void questionsById;

  const baseSeed = buildBaseSeed(seed, exam.id, attemptIndex);
  const pool = Array.isArray(exam.questionIds) ? [...exam.questionIds] : [];
  const shuffledPool = seededShuffle(pool, baseSeed);

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
