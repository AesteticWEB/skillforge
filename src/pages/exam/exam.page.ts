import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import type { ExamAnswer, ExamAttempt, ExamQuestion, ExamRun } from '@/entities/exam';
import {
  buildExamSession,
  gradeExam,
  isMultiChoiceCorrect,
  isOrderingCorrect,
} from '@/entities/exam';
import { calcExamReward } from '@/entities/rewards';
import {
  BALANCE,
  EXAM_QUESTIONS_BY_ID,
  EXAMS_BY_ID,
  PROFESSION_OPTIONS,
  getExam,
} from '@/shared/config';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';

const EXAM_PROFESSION_IDS = [
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'qa',
  'devops',
  'data-engineer',
  'data-scientist-ml',
  'security',
  'gamedev',
] as const;

type ExamProfessionId = (typeof EXAM_PROFESSION_IDS)[number];

const STAGE_LABELS_RU: Record<'internship' | 'junior' | 'middle' | 'senior', string> = {
  internship: 'Стажировка',
  junior: 'Джуниор',
  middle: 'Миддл',
  senior: 'Сеньор',
};

const mapProfessionToExamId = (profession: string): ExamProfessionId | null => {
  const index = PROFESSION_OPTIONS.indexOf(profession as (typeof PROFESSION_OPTIONS)[number]);
  if (index === -1) {
    return null;
  }
  return EXAM_PROFESSION_IDS[index] ?? null;
};

const formatDuration = (seconds: number): string => {
  const clamped = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

type RewardBreakdownTone = 'positive' | 'negative' | 'neutral';

type RewardBreakdownLine = {
  label: string;
  value: string;
  hint?: string;
  tone?: RewardBreakdownTone;
};

type ExamRewardBreakdown = {
  totals: RewardBreakdownLine[];
  calculation: RewardBreakdownLine[];
};

type ExamResult = {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  speedBonus: number;
  rewardCoins: number;
  totalCoins: number;
  durationSeconds: number;
  breakdown: ExamRewardBreakdown;
};

@Component({
  selector: 'app-exam-page',
  imports: [CardComponent, ButtonComponent, EmptyStateComponent, NgClass],
  templateUrl: './exam.page.html',
  styleUrl: './exam.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamPage implements OnDestroy {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);
  private readonly now = signal(Date.now());
  private timerId: number | null = null;
  private readonly reviewing = signal(false);
  private readonly result = signal<ExamResult | null>(null);

  protected readonly activeRun = this.store.activeExamRun;
  protected readonly examHistory = this.store.examHistory;
  protected readonly careerStage = this.store.careerStage;
  protected readonly stageLabel = computed(() => STAGE_LABELS_RU[this.careerStage()]);
  protected readonly examProfessionId = computed(() => {
    const raw = this.store.professionId();
    return mapProfessionToExamId(raw);
  });
  protected readonly currentExam = computed(() => {
    const run = this.activeRun();
    if (run) {
      return EXAMS_BY_ID[run.examId] ?? null;
    }
    const professionId = this.examProfessionId();
    if (!professionId) {
      return null;
    }
    return getExam(professionId, this.careerStage()) ?? null;
  });
  protected readonly attemptHistory = computed(() => {
    const exam = this.currentExam();
    if (!exam) {
      return [];
    }
    return this.examHistory()
      .filter((attempt) => attempt.examId === exam.id)
      .slice()
      .reverse();
  });
  protected readonly currentQuestionId = computed(() => {
    const run = this.activeRun();
    if (!run) {
      return null;
    }
    return run.session.questionIds[run.currentIndex] ?? null;
  });
  protected readonly currentQuestion = computed<ExamQuestion | null>(() => {
    const id = this.currentQuestionId();
    return id ? (EXAM_QUESTIONS_BY_ID[id] ?? null) : null;
  });
  protected readonly currentAnswer = computed<ExamAnswer | null>(() => {
    const run = this.activeRun();
    const id = this.currentQuestionId();
    if (!run || !id) {
      return null;
    }
    return run.answers[id] ?? null;
  });
  protected readonly totalQuestions = computed(() => {
    const run = this.activeRun();
    if (run) {
      return run.session.questionIds.length;
    }
    return this.currentExam()?.questionCount ?? 0;
  });
  protected readonly progressLabel = computed(() => {
    const run = this.activeRun();
    if (!run) {
      return null;
    }
    return `Вопрос ${run.currentIndex + 1} / ${run.session.questionIds.length}`;
  });
  protected readonly progressPercent = computed(() => {
    const run = this.activeRun();
    if (!run) {
      return 0;
    }
    const total = run.session.questionIds.length;
    if (total === 0) {
      return 0;
    }
    return Math.round(((run.currentIndex + 1) / total) * 100);
  });
  protected readonly elapsedSeconds = computed(() => {
    const run = this.activeRun();
    if (!run) {
      return 0;
    }
    const startedAt = Date.parse(run.startedAt);
    if (!Number.isFinite(startedAt)) {
      return 0;
    }
    return Math.max(0, Math.floor((this.now() - startedAt) / 1000));
  });
  protected readonly elapsedLabel = computed(() => formatDuration(this.elapsedSeconds()));
  protected readonly isReviewing = this.reviewing.asReadonly();
  protected readonly resultData = this.result.asReadonly();
  protected readonly isLastQuestion = computed(() => {
    const run = this.activeRun();
    if (!run) {
      return false;
    }
    return run.currentIndex >= run.session.questionIds.length - 1;
  });
  protected readonly canGoBack = computed(() => {
    const run = this.activeRun();
    return Boolean(run && run.currentIndex > 0 && !this.reviewing());
  });
  protected readonly canProceed = computed(() => {
    if (this.reviewing()) {
      return false;
    }
    return this.isAnswerComplete(this.currentQuestion(), this.currentAnswer());
  });
  protected readonly currentAnswerCorrect = computed(() => {
    if (!this.reviewing()) {
      return null;
    }
    const question = this.currentQuestion();
    if (!question) {
      return null;
    }
    return this.isAnswerCorrect(question, this.currentAnswer());
  });

  constructor() {
    this.ensureTimer();
    effect(() => {
      if (!this.activeRun()) {
        this.reviewing.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  protected startExam(): void {
    const exam = this.currentExam();
    if (!exam) {
      return;
    }
    const seed = this.resolveSeed(exam.professionId);
    const attemptIndex = this.attemptHistory().length;
    const session = buildExamSession({
      exam,
      questionsById: EXAM_QUESTIONS_BY_ID,
      seed,
      attemptIndex,
    });
    const run: ExamRun = {
      examId: exam.id,
      session,
      startedAt: new Date().toISOString(),
      currentIndex: 0,
      answers: {},
      attemptIndex,
    };
    this.store.setActiveExamRun(run);
    this.reviewing.set(false);
    this.result.set(null);
  }

  protected retryExam(): void {
    this.startExam();
  }

  protected resetActiveRun(): void {
    this.store.setActiveExamRun(null);
    this.reviewing.set(false);
  }

  protected goBack(): void {
    const run = this.activeRun();
    if (!run || run.currentIndex <= 0) {
      return;
    }
    this.reviewing.set(false);
    this.store.updateActiveExamRun({ currentIndex: run.currentIndex - 1 });
  }

  protected confirmAnswer(): void {
    if (!this.canProceed()) {
      return;
    }
    this.reviewing.set(true);
  }

  protected continueAfterExplanation(): void {
    const run = this.activeRun();
    if (!run) {
      return;
    }
    if (this.isLastQuestion()) {
      this.submitExam();
      return;
    }
    this.reviewing.set(false);
    this.store.updateActiveExamRun({ currentIndex: run.currentIndex + 1 });
  }

  protected skipMissingQuestion(): void {
    const run = this.activeRun();
    if (!run) {
      return;
    }
    if (this.isLastQuestion()) {
      this.submitExam();
      return;
    }
    this.reviewing.set(false);
    this.store.updateActiveExamRun({ currentIndex: run.currentIndex + 1 });
  }

  protected selectSingle(optionId: string): void {
    const question = this.currentQuestion();
    if (!question || (question.type !== 'singleChoice' && question.type !== 'caseDecision')) {
      return;
    }
    const questionId = this.currentQuestionId();
    if (!questionId) {
      return;
    }
    const answer: ExamAnswer = {
      type: question.type,
      selectedOptionId: optionId,
    };
    this.updateAnswer(questionId, answer);
  }

  protected toggleMulti(optionId: string): void {
    const question = this.currentQuestion();
    if (!question || question.type !== 'multiChoice') {
      return;
    }
    const questionId = this.currentQuestionId();
    if (!questionId) {
      return;
    }
    const current = this.currentAnswer();
    const selected = new Set(
      current && current.type === 'multiChoice' ? current.selectedOptionIds : [],
    );
    if (selected.has(optionId)) {
      selected.delete(optionId);
    } else {
      selected.add(optionId);
    }
    const answer: ExamAnswer = {
      type: 'multiChoice',
      selectedOptionIds: Array.from(selected),
    };
    this.updateAnswer(questionId, answer);
  }

  protected addOrderingOption(optionId: string): void {
    const question = this.currentQuestion();
    if (!question || question.type !== 'ordering') {
      return;
    }
    const questionId = this.currentQuestionId();
    if (!questionId) {
      return;
    }
    const current = this.currentAnswer();
    const ordered = current && current.type === 'ordering' ? [...current.orderedOptionIds] : [];
    if (ordered.includes(optionId)) {
      return;
    }
    ordered.push(optionId);
    this.updateAnswer(questionId, { type: 'ordering', orderedOptionIds: ordered });
  }

  protected resetOrdering(): void {
    const question = this.currentQuestion();
    if (!question || question.type !== 'ordering') {
      return;
    }
    const questionId = this.currentQuestionId();
    if (!questionId) {
      return;
    }
    this.updateAnswer(questionId, { type: 'ordering', orderedOptionIds: [] });
  }

  protected isSelected(optionId: string): boolean {
    const answer = this.currentAnswer();
    if (!answer) {
      return false;
    }
    if (answer.type === 'singleChoice' || answer.type === 'caseDecision') {
      return answer.selectedOptionId === optionId;
    }
    if (answer.type === 'multiChoice') {
      return answer.selectedOptionIds.includes(optionId);
    }
    return false;
  }

  protected orderingSequence(): string[] {
    const answer = this.currentAnswer();
    if (!answer || answer.type !== 'ordering') {
      return [];
    }
    return answer.orderedOptionIds;
  }

  protected optionLabel(optionId: string): string {
    const question = this.currentQuestion();
    if (!question) {
      return optionId;
    }
    return question.options.find((option) => option.id === optionId)?.text ?? optionId;
  }

  protected submitExam(): void {
    const run = this.activeRun();
    const exam = this.currentExam();
    if (!run || !exam) {
      return;
    }

    const finishedAt = new Date().toISOString();
    const grade = gradeExam({
      exam,
      session: run.session,
      questionsById: EXAM_QUESTIONS_BY_ID,
      answers: run.answers,
    });

    const startedMs = Date.parse(run.startedAt);
    const finishedMs = Date.parse(finishedAt);
    const durationSeconds =
      Number.isFinite(startedMs) && Number.isFinite(finishedMs)
        ? Math.max(0, Math.floor((finishedMs - startedMs) / 1000))
        : 0;
    const rewardCoins = calcExamReward({
      reputation: this.store.reputation(),
      techDebt: this.store.techDebt(),
      score: grade.score,
      maxScore: 100,
      baseCoins: BALANCE.rewards.examCoins,
      buffs: this.store.totalBuffs(),
    });
    const speedBonus = this.calcSpeedBonus(rewardCoins, durationSeconds);
    const totalCoins = rewardCoins + speedBonus;

    const attempt: ExamAttempt = {
      attemptId: `attempt_${exam.id}_${Date.now()}`,
      examId: exam.id,
      startedAt: run.startedAt,
      finishedAt,
      answers: run.answers,
      score: grade.score,
      passed: grade.passed,
    };

    this.store.recordExamAttempt(attempt, totalCoins);
    if (grade.passed) {
      this.store.grantCertificateFromExam({
        examId: exam.id,
        professionId: exam.professionId,
        stage: exam.stage,
        score: grade.score,
        issuedAt: finishedAt,
      });
    }
    this.result.set({
      score: grade.score,
      passed: grade.passed,
      correctCount: grade.correctCount,
      total: grade.total,
      speedBonus,
      rewardCoins,
      totalCoins,
      durationSeconds,
      breakdown: this.buildRewardBreakdown({
        score: grade.score,
        rewardCoins,
        totalCoins,
        speedBonus,
      }),
    });
    this.reviewing.set(false);
  }

  protected goToProfile(): void {
    void this.router.navigateByUrl('/profile');
  }

  protected formatAttemptDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }

  protected formatDurationLabel(seconds: number): string {
    return formatDuration(seconds);
  }

  protected toneClass(tone?: RewardBreakdownTone): string {
    if (tone === 'positive') {
      return 'text-emerald-300';
    }
    if (tone === 'negative') {
      return 'text-rose-300';
    }
    return 'text-slate-200';
  }

  private updateAnswer(questionId: string, answer: ExamAnswer): void {
    const run = this.activeRun();
    if (!run) {
      return;
    }
    this.store.updateActiveExamRun({
      answers: {
        ...run.answers,
        [questionId]: answer,
      },
    });
  }

  private resolveSeed(professionId: string): string {
    const auth = this.store.auth();
    if (auth.login.trim().length > 0) {
      return auth.login.trim();
    }
    const fallback = this.store.user().role?.trim();
    return fallback && fallback.length > 0 ? fallback : professionId;
  }

  private isAnswerComplete(question: ExamQuestion | null, answer: ExamAnswer | null): boolean {
    if (!question) {
      return true;
    }
    if (!answer) {
      return false;
    }
    if (question.type === 'singleChoice' || question.type === 'caseDecision') {
      return (
        (answer.type === 'singleChoice' || answer.type === 'caseDecision') &&
        answer.selectedOptionId.trim().length > 0
      );
    }
    if (question.type === 'multiChoice') {
      return answer.type === 'multiChoice' && answer.selectedOptionIds.length > 0;
    }
    if (question.type === 'ordering') {
      return (
        answer.type === 'ordering' && answer.orderedOptionIds.length === question.options.length
      );
    }
    return false;
  }

  private isAnswerCorrect(question: ExamQuestion, answer: ExamAnswer | null): boolean {
    if (!answer) {
      return false;
    }
    if (question.type === 'singleChoice') {
      return answer.type === 'singleChoice' && answer.selectedOptionId === question.correctOptionId;
    }
    if (question.type === 'caseDecision') {
      return answer.type === 'caseDecision' && answer.selectedOptionId === question.correctOptionId;
    }
    if (question.type === 'multiChoice') {
      return (
        answer.type === 'multiChoice' &&
        isMultiChoiceCorrect(answer.selectedOptionIds, question.correctOptionIds)
      );
    }
    if (question.type === 'ordering') {
      return (
        answer.type === 'ordering' &&
        isOrderingCorrect(answer.orderedOptionIds, question.correctOrderOptionIds)
      );
    }
    return false;
  }

  private calcSpeedBonus(rewardCoins: number, durationSeconds: number): number {
    const config = BALANCE.rewards.examSpeed;
    if (config.stepSeconds <= 0) {
      return 0;
    }
    const raw = Math.floor((config.targetSeconds - durationSeconds) / config.stepSeconds);
    const unclamped = Math.max(0, raw);
    const cap = Math.floor(rewardCoins * config.maxBonusRatio);
    return Math.min(unclamped, cap);
  }

  private buildRewardBreakdown(input: {
    score: number;
    rewardCoins: number;
    totalCoins: number;
    speedBonus: number;
  }): ExamRewardBreakdown {
    const rewards = BALANCE.rewards;
    const reputation = this.store.reputation();
    const techDebt = this.store.techDebt();
    const buffs = this.store.totalBuffs();

    const scoreRatio = Math.max(0, Math.min(1, input.score / 100));
    const scoreMultiplier =
      rewards.exam.minScoreMultiplier +
      (rewards.exam.maxScoreMultiplier - rewards.exam.minScoreMultiplier) * scoreRatio;
    const repMultiplier = this.clampNumber(
      1 + reputation * rewards.reputation.perPoint,
      rewards.reputation.minMultiplier,
      rewards.reputation.maxMultiplier,
    );
    const debtPenalty = Math.min(
      rewards.techDebt.maxPenalty,
      Math.max(0, techDebt) * rewards.techDebt.perPoint,
    );
    const debtMultiplier = Math.max(0, 1 - debtPenalty);
    const buffMultiplier = 1 + (buffs.coinMultiplier ?? 0);
    const buffBonus = buffs.coinBonus ?? 0;

    const totals: RewardBreakdownLine[] = [
      {
        label: 'Итого монет',
        value: `+${input.totalCoins}`,
        tone: 'positive',
      },
      {
        label: 'Бонус за скорость',
        value: input.speedBonus > 0 ? `+${input.speedBonus}` : '0',
        tone: input.speedBonus > 0 ? 'positive' : 'neutral',
      },
    ];

    const calculation: RewardBreakdownLine[] = [
      {
        label: 'База',
        value: `${rewards.examCoins} монет`,
        hint: 'Базовая награда за экзамен.',
      },
      {
        label: 'Множитель результата',
        value: `x${scoreMultiplier.toFixed(2)}`,
        hint: `Счёт: ${input.score}/100`,
        tone: scoreMultiplier >= 1 ? 'positive' : 'negative',
      },
      {
        label: 'Множитель репутации',
        value: `x${repMultiplier.toFixed(2)}`,
        hint: `Репутация: ${reputation}`,
        tone: repMultiplier >= 1 ? 'positive' : 'negative',
      },
      {
        label: 'Множитель техдолга',
        value: `x${debtMultiplier.toFixed(2)}`,
        hint: `Техдолг: ${techDebt}`,
        tone: debtMultiplier >= 1 ? 'positive' : 'negative',
      },
      {
        label: 'Усиления',
        value: `x${buffMultiplier.toFixed(2)} +${buffBonus}`,
        hint: 'Активные усиления.',
      },
      {
        label: 'Бонус за скорость',
        value: `+${input.speedBonus}`,
        hint: `Цель: ${rewards.examSpeed.targetSeconds} сек`,
        tone: input.speedBonus > 0 ? 'positive' : 'neutral',
      },
      {
        label: 'Итого',
        value: `${input.totalCoins} монет`,
        hint: `Минимум ${rewards.minCoins} монет.`,
      },
    ];

    return {
      totals,
      calculation,
    };
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private ensureTimer(): void {
    if (this.timerId !== null || typeof window === 'undefined') {
      return;
    }
    this.timerId = window.setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }
}
