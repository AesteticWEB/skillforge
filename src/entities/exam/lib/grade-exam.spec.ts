import { gradeExam } from './grade-exam';
import type { ExamAnswer, ExamConfig, ExamQuestion, ExamSession } from '../model/exam.model';

const makeOptions = (ids: string[]) => ids.map((id) => ({ id, text: id.toUpperCase() }));

const QUESTIONS: Record<string, ExamQuestion> = {
  q1: {
    id: 'q1',
    type: 'singleChoice',
    prompt: 'Single',
    options: makeOptions(['a', 'b']),
    correctOptionId: 'a',
  },
  q2: {
    id: 'q2',
    type: 'multiChoice',
    prompt: 'Multi',
    options: makeOptions(['a', 'b', 'c']),
    correctOptionIds: ['a', 'b'],
  },
  q3: {
    id: 'q3',
    type: 'ordering',
    prompt: 'Ordering',
    options: makeOptions(['a', 'b', 'c']),
    correctOrderOptionIds: ['a', 'b', 'c'],
  },
  q4: {
    id: 'q4',
    type: 'caseDecision',
    prompt: 'Case',
    options: makeOptions(['a', 'b']),
    correctOptionId: 'b',
  },
};

const EXAM: ExamConfig = {
  id: 'exam_frontend_internship',
  title: 'Frontend Internship Exam',
  professionId: 'frontend',
  stage: 'internship',
  questionCount: 4,
  passScore: 70,
  questionIds: ['q1', 'q2', 'q3', 'q4'],
};

const SESSION: ExamSession = {
  examId: EXAM.id,
  questionIds: ['q1', 'q2', 'q3', 'q4'],
  seed: 'seed',
};

describe('gradeExam', () => {
  it('returns score 100 when all answers are correct', () => {
    const answers: Record<string, ExamAnswer> = {
      q1: { type: 'singleChoice', selectedOptionId: 'a' },
      q2: { type: 'multiChoice', selectedOptionIds: ['b', 'a'] },
      q3: { type: 'ordering', orderedOptionIds: ['a', 'b', 'c'] },
      q4: { type: 'caseDecision', selectedOptionId: 'b' },
    };

    const result = gradeExam({ exam: EXAM, session: SESSION, questionsById: QUESTIONS, answers });

    expect(result.score).toBe(100);
    expect(result.correctCount).toBe(4);
    expect(result.passed).toBe(true);
  });

  it('floors the score for partial correctness', () => {
    const answers: Record<string, ExamAnswer> = {
      q1: { type: 'singleChoice', selectedOptionId: 'a' },
      q2: { type: 'multiChoice', selectedOptionIds: ['a', 'b'] },
    };

    const result = gradeExam({ exam: EXAM, session: SESSION, questionsById: QUESTIONS, answers });

    expect(result.score).toBe(50);
    expect(result.correctCount).toBe(2);
    expect(result.passed).toBe(false);
  });

  it('returns score 0 when there are no answers', () => {
    const result = gradeExam({
      exam: EXAM,
      session: SESSION,
      questionsById: QUESTIONS,
      answers: {},
    });

    expect(result.score).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.passed).toBe(false);
  });
});
