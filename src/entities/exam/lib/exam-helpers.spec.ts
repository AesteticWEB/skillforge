import { isMultiChoiceCorrect, normalizeMultiChoice } from './exam-helpers';
import type { ExamAttempt } from '../model/exam.model';

describe('normalizeMultiChoice', () => {
  it('deduplicates and sorts ids', () => {
    expect(normalizeMultiChoice(['b', 'a', 'a'])).toEqual(['a', 'b']);
  });
});

describe('isMultiChoiceCorrect', () => {
  it('treats order as irrelevant', () => {
    expect(isMultiChoiceCorrect(['a', 'b'], ['b', 'a'])).toBe(true);
  });

  it('returns false for partial selections', () => {
    expect(isMultiChoiceCorrect(['a'], ['a', 'b'])).toBe(false);
  });

  it('returns false when selected is empty but correct is not', () => {
    expect(isMultiChoiceCorrect([], ['a'])).toBe(false);
  });
});

describe('ExamAttempt serialization', () => {
  it('serializes to JSON without losing keys', () => {
    const attempt: ExamAttempt = {
      attemptId: 'attempt-1',
      examId: 'exam-1',
      startedAt: '2024-01-01T00:00:00.000Z',
      finishedAt: '2024-01-01T00:10:00.000Z',
      answers: {
        'question-1': { type: 'singleChoice', selectedOptionId: 'option-1' },
      },
      score: 80,
      passed: true,
    };

    const json = JSON.stringify(attempt);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(Object.keys(parsed).sort()).toEqual(Object.keys(attempt).sort());
  });
});
