import type { SkillStageId } from '@/shared/config';

export type ExamQuestionType = 'singleChoice' | 'multiChoice' | 'ordering' | 'caseDecision';

export type ExamOption = {
  id: string;
  text: string;
};

export type ExamQuestionBase = {
  id: string;
  type: ExamQuestionType;
  prompt: string;
  options: ExamOption[];
  explanation?: string;
  tags?: string[];
};

export type SingleChoiceQuestion = ExamQuestionBase & {
  type: 'singleChoice';
  correctOptionId: string;
};

export type CaseDecisionQuestion = ExamQuestionBase & {
  type: 'caseDecision';
  correctOptionId: string;
};

export type MultiChoiceQuestion = ExamQuestionBase & {
  type: 'multiChoice';
  correctOptionIds: string[];
};

export type OrderingQuestion = ExamQuestionBase & {
  type: 'ordering';
  correctOrderOptionIds: string[];
};

export type ExamQuestion =
  | SingleChoiceQuestion
  | CaseDecisionQuestion
  | MultiChoiceQuestion
  | OrderingQuestion;

export type ExamConfig = {
  id: string;
  title: string;
  professionId: string;
  stage: SkillStageId;
  questionCount: number;
  passScore: number;
};

export type ExamSession = {
  examId: string;
  questionIds: string[];
  seed: string;
};

export type SingleChoiceAnswer = {
  type: 'singleChoice';
  selectedOptionId: string;
};

export type CaseDecisionAnswer = {
  type: 'caseDecision';
  selectedOptionId: string;
};

export type MultiChoiceAnswer = {
  type: 'multiChoice';
  selectedOptionIds: string[];
};

export type OrderingAnswer = {
  type: 'ordering';
  orderedOptionIds: string[];
};

export type ExamAnswer =
  | SingleChoiceAnswer
  | CaseDecisionAnswer
  | MultiChoiceAnswer
  | OrderingAnswer;

export type ExamAttempt = {
  attemptId: string;
  examId: string;
  startedAt: string;
  finishedAt?: string;
  answers: Record<string, ExamAnswer>;
  score?: number;
  passed?: boolean;
};
