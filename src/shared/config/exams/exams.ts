import type { ExamConfig } from '@/entities/exam';
import type { SkillStageId } from '@/shared/config/professions';
import { EXAM_QUESTIONS_BY_ID } from './questions';

type ExamProfessionId =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'mobile'
  | 'qa'
  | 'devops'
  | 'data-engineer'
  | 'data-scientist-ml'
  | 'security'
  | 'gamedev';

type ProfessionConfig = {
  id: ExamProfessionId;
  label: string;
  questionPrefix: string;
};

const PROFESSIONS: ProfessionConfig[] = [
  { id: 'frontend', label: 'Фронтенд', questionPrefix: 'q_fe_' },
  { id: 'backend', label: 'Бэкенд', questionPrefix: 'q_be_' },
  { id: 'fullstack', label: 'Фуллстек', questionPrefix: 'q_fs_' },
  { id: 'mobile', label: 'Мобайл', questionPrefix: 'q_mob_' },
  { id: 'qa', label: 'Тестирование (QA)', questionPrefix: 'q_qa_' },
  { id: 'devops', label: 'DevOps / SRE', questionPrefix: 'q_ops_' },
  { id: 'data-engineer', label: 'Дата-инженер', questionPrefix: 'q_de_' },
  { id: 'data-scientist-ml', label: 'Дата-сайентист / ML', questionPrefix: 'q_ml_' },
  { id: 'security', label: 'Безопасность', questionPrefix: 'q_sec_' },
  { id: 'gamedev', label: 'Геймдев', questionPrefix: 'q_gd_' },
];

const STAGES: SkillStageId[] = ['internship', 'junior', 'middle', 'senior'];
const STAGE_LABELS_RU: Record<SkillStageId, string> = {
  internship: 'Стажировка',
  junior: 'Джуниор',
  middle: 'Миддл',
  senior: 'Сеньор',
};

const QUESTION_COUNT = 10;
const PASS_SCORE = 70;
const PROFESSION_QUESTIONS_PER_EXAM = 7;
const GENERAL_QUESTIONS_PER_EXAM = 3;

const buildId = (prefix: string, index: number): string =>
  `${prefix}${String(index).padStart(3, '0')}`;

const buildIds = (prefix: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => buildId(prefix, index + 1));

const sliceWithWrap = (ids: string[], start: number, count: number): string[] => {
  const result: string[] = [];
  for (let index = 0; index < count; index += 1) {
    result.push(ids[(start + index) % ids.length]);
  }
  return result;
};

const GENERAL_QUESTION_IDS = buildIds('q_gen_', 20);

const PROFESSION_QUESTION_IDS: Record<ExamProfessionId, string[]> = PROFESSIONS.reduce(
  (acc, profession) => {
    acc[profession.id] = buildIds(profession.questionPrefix, 15);
    return acc;
  },
  {} as Record<ExamProfessionId, string[]>,
);

const buildExamId = (professionId: ExamProfessionId, stage: SkillStageId): string =>
  `exam_${professionId}_${stage}`;

const buildExamTitle = (profession: ProfessionConfig, stage: SkillStageId): string =>
  `${profession.label} · ${STAGE_LABELS_RU[stage]} — экзамен`;

const buildExamConfig = (
  profession: ProfessionConfig,
  stage: SkillStageId,
  stageIndex: number,
): ExamConfig => {
  const professionIds = sliceWithWrap(
    PROFESSION_QUESTION_IDS[profession.id],
    stageIndex * PROFESSION_QUESTIONS_PER_EXAM,
    PROFESSION_QUESTIONS_PER_EXAM,
  );
  const generalIds = sliceWithWrap(
    GENERAL_QUESTION_IDS,
    stageIndex * GENERAL_QUESTIONS_PER_EXAM,
    GENERAL_QUESTIONS_PER_EXAM,
  );
  return {
    id: buildExamId(profession.id, stage),
    title: buildExamTitle(profession, stage),
    professionId: profession.id,
    stage,
    questionCount: QUESTION_COUNT,
    passScore: PASS_SCORE,
    questionIds: [...professionIds, ...generalIds],
  };
};

export const EXAMS: ExamConfig[] = PROFESSIONS.flatMap((profession) =>
  STAGES.map((stage, stageIndex) => buildExamConfig(profession, stage, stageIndex)),
);

export const EXAMS_BY_ID: Record<string, ExamConfig> = EXAMS.reduce(
  (acc, exam) => {
    acc[exam.id] = exam;
    return acc;
  },
  {} as Record<string, ExamConfig>,
);

export const getExam = (professionId: string, stage: SkillStageId): ExamConfig | undefined =>
  EXAMS.find((exam) => exam.professionId === professionId && exam.stage === stage);

const validateExams = (exams: ExamConfig[]): void => {
  if (exams.length !== PROFESSIONS.length * STAGES.length) {
    console.error(`[exams] Unexpected exam count: ${exams.length}`);
  }

  const examIds = new Set<string>();
  for (const exam of exams) {
    if (examIds.has(exam.id)) {
      console.error(`[exams] Duplicate id: ${exam.id}`);
    }
    examIds.add(exam.id);

    if (exam.questionIds.length !== exam.questionCount) {
      console.error(`[exams] Question count mismatch: ${exam.id}`);
    }

    if (exam.passScore !== PASS_SCORE) {
      console.error(`[exams] Invalid passScore: ${exam.id}`);
    }

    const uniqueQuestionIds = new Set(exam.questionIds);
    if (uniqueQuestionIds.size !== exam.questionIds.length) {
      console.error(`[exams] Duplicate questionIds: ${exam.id}`);
    }

    for (const questionId of exam.questionIds) {
      if (!EXAM_QUESTIONS_BY_ID[questionId]) {
        console.error('[exams] missing question id:', questionId, 'in exam:', exam.id);
      }
    }
  }
};

declare const ngDevMode: boolean | undefined;
const isDev = typeof ngDevMode !== 'undefined' && ngDevMode;
if (isDev) {
  validateExams(EXAMS);
}
