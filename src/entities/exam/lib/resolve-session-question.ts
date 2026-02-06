import type { ExamQuestion } from '../model/exam.model';
import { seededShuffle } from './seeded-rng';

const resolveOptionsSeed = (seed: string, questionId: string): string =>
  `${seed}:options:${questionId}`;

const resolveMultiCountSeed = (seed: string, questionId: string): string =>
  `${seed}:multi-count:${questionId}`;

const resolveMultiCorrectSeed = (seed: string, questionId: string): string =>
  `${seed}:multi-correct:${questionId}`;

const resolveMultiChoiceCorrect = (question: ExamQuestion, seed: string): string[] => {
  if (question.type !== 'multiChoice') {
    return [];
  }
  const unique = Array.from(new Set(question.correctOptionIds));
  if (unique.length <= 2) {
    return unique;
  }

  const countChoices = unique.length >= 3 ? [2, 3] : [unique.length];
  const pickedCount =
    seededShuffle(countChoices, resolveMultiCountSeed(seed, question.id))[0] ?? unique.length;
  const targetCount = Math.min(unique.length, Math.max(1, pickedCount));

  return seededShuffle(unique, resolveMultiCorrectSeed(seed, question.id)).slice(0, targetCount);
};

export const resolveExamQuestionForSession = (
  question: ExamQuestion,
  sessionSeed: string,
): ExamQuestion => {
  const options = seededShuffle(question.options, resolveOptionsSeed(sessionSeed, question.id));

  if (question.type === 'multiChoice') {
    return {
      ...question,
      options,
      correctOptionIds: resolveMultiChoiceCorrect(question, sessionSeed),
    };
  }

  return {
    ...question,
    options,
  };
};
