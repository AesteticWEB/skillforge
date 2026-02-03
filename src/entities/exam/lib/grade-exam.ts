import type { ExamAnswer, ExamConfig, ExamQuestion, ExamSession } from '../model/exam.model';
import { isMultiChoiceCorrect, isOrderingCorrect } from './exam-helpers';

type GradeExamParams = {
  exam: ExamConfig;
  session: ExamSession;
  questionsById: Record<string, ExamQuestion>;
  answers: Record<string, ExamAnswer>;
};

const isAnswerCorrect = (question: ExamQuestion, answer?: ExamAnswer): boolean => {
  if (!answer) {
    return false;
  }

  switch (question.type) {
    case 'singleChoice':
      return answer.type === 'singleChoice' && answer.selectedOptionId === question.correctOptionId;
    case 'caseDecision':
      return answer.type === 'caseDecision' && answer.selectedOptionId === question.correctOptionId;
    case 'multiChoice':
      return (
        answer.type === 'multiChoice' &&
        isMultiChoiceCorrect(answer.selectedOptionIds, question.correctOptionIds)
      );
    case 'ordering':
      return (
        answer.type === 'ordering' &&
        isOrderingCorrect(answer.orderedOptionIds, question.correctOrderOptionIds)
      );
    default:
      return false;
  }
};

declare const ngDevMode: boolean | undefined;
const isDev = typeof ngDevMode !== 'undefined' && ngDevMode;

export const gradeExam = ({
  exam,
  session,
  questionsById,
  answers,
}: GradeExamParams): { score: number; passed: boolean; correctCount: number; total: number } => {
  const total = session.questionIds.length;
  let correctCount = 0;

  for (const questionId of session.questionIds) {
    const question = questionsById[questionId];
    if (!question) {
      if (isDev) {
        console.error('[exams] missing question id:', questionId, 'in exam:', exam.id);
      }
      continue;
    }

    const answer = answers[questionId];
    if (isAnswerCorrect(question, answer)) {
      correctCount += 1;
    }
  }

  const score = total === 0 ? 0 : Math.floor((correctCount / total) * 100);
  return {
    score,
    passed: score >= exam.passScore,
    correctCount,
    total,
  };
};
