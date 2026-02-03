import { buildExamSession } from './build-exam-session';
import type { ExamConfig, ExamQuestion } from '../model/exam.model';

const makeQuestion = (id: string): ExamQuestion => ({
  id,
  type: 'singleChoice',
  prompt: `Question ${id}`,
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ],
  correctOptionId: 'a',
});

const makeQuestionsById = (ids: string[]): Record<string, ExamQuestion> =>
  ids.reduce(
    (acc, id) => {
      acc[id] = makeQuestion(id);
      return acc;
    },
    {} as Record<string, ExamQuestion>,
  );

const makeExam = (questionIds: string[], questionCount: number): ExamConfig => ({
  id: 'exam_frontend_internship',
  title: 'Frontend Internship Exam',
  professionId: 'frontend',
  stage: 'internship',
  questionCount,
  passScore: 70,
  questionIds,
});

describe('buildExamSession', () => {
  it('is deterministic for the same inputs', () => {
    const pool = Array.from({ length: 20 }, (_, index) => `q_${index + 1}`);
    const exam = makeExam(pool, 10);
    const questionsById = makeQuestionsById(pool);

    const first = buildExamSession({ exam, questionsById, seed: 'seed', attemptIndex: 0 });
    const second = buildExamSession({ exam, questionsById, seed: 'seed', attemptIndex: 0 });

    expect(first.questionIds).toEqual(second.questionIds);
  });

  it('changes order with a different attemptIndex', () => {
    const pool = Array.from({ length: 20 }, (_, index) => `q_${index + 1}`);
    const exam = makeExam(pool, 10);
    const questionsById = makeQuestionsById(pool);

    const first = buildExamSession({ exam, questionsById, seed: 'seed', attemptIndex: 0 });
    const second = buildExamSession({ exam, questionsById, seed: 'seed', attemptIndex: 1 });

    expect(first.questionIds).not.toEqual(second.questionIds);
  });

  it('avoids repeats when pool is large enough', () => {
    const pool = Array.from({ length: 20 }, (_, index) => `q_${index + 1}`);
    const exam = makeExam(pool, 10);
    const questionsById = makeQuestionsById(pool);

    const session = buildExamSession({ exam, questionsById, seed: 'seed', attemptIndex: 0 });
    const uniqueIds = new Set(session.questionIds);

    expect(session.questionIds).toHaveLength(10);
    expect(uniqueIds.size).toBe(10);
    expect(session.questionIds.every((id) => pool.includes(id))).toBe(true);
  });

  it('repeats deterministically when pool is smaller than questionCount', () => {
    const pool = ['q_1', 'q_2', 'q_3'];
    const exam = makeExam(pool, 10);
    const questionsById = makeQuestionsById(pool);

    const first = buildExamSession({ exam, questionsById, seed: 'seed', attemptIndex: 0 });
    const second = buildExamSession({ exam, questionsById, seed: 'seed', attemptIndex: 0 });

    expect(first.questionIds).toEqual(second.questionIds);
    expect(first.questionIds).toHaveLength(10);
    expect(new Set(first.questionIds).size).toBeLessThan(10);
    expect(first.questionIds.every((id) => pool.includes(id))).toBe(true);
  });
});
