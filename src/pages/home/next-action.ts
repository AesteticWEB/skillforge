import type { StageProgress } from '@/shared/lib/stage/promotion';
import type { SkillStageId } from '@/shared/config';

export type NextAction = {
  id: string;
  title: string;
  description: string;
  route: string;
  reason?: string;
};

type PromotionGate = {
  ok: boolean;
  requiredCert?: {
    professionId: string;
    stage: SkillStageId;
  };
};

export type NextActionContext = {
  isRegistered: boolean;
  onboardingCompleted: boolean;
  stageScenarioProgress: StageProgress;
  stageSkillProgress: StageProgress;
  promotionGate: PromotionGate;
  canAdvanceStage: boolean;
  companyUnlocked: boolean;
  availableContractsCount: number;
  careerStage: SkillStageId;
  endingResolved: boolean;
  isNewGamePlus: boolean;
  ngPlusCount: number;
};

const makeAction = (action: NextAction): NextAction => action;

export const getNextBestAction = (state: NextActionContext): NextAction => {
  if (!state.isRegistered) {
    return makeAction({
      id: 'create-profile',
      title: 'Создать профиль',
      description: 'Заполни логин, пароль и профессию, чтобы начать игру.',
      route: '/',
      reason: 'Без профиля прогресс не сохраняется',
    });
  }

  if (!state.onboardingCompleted) {
    return makeAction({
      id: 'finish-onboarding',
      title: 'Пройти онбординг',
      description: 'Короткий гид по ресурсам, сценариям и экзаменам.',
      route: '/onboarding',
      reason: 'Это займёт 1–2 минуты и объяснит цикл игры',
    });
  }

  if (
    state.stageScenarioProgress.total > 0 &&
    state.stageScenarioProgress.completed < state.stageScenarioProgress.total
  ) {
    return makeAction({
      id: 'complete-scenarios',
      title: 'Пройти сценарии этапа',
      description: 'Сценарии дают награды, XP и продвигают стадию.',
      route: '/simulator',
      reason: 'Сценарии дают награды/XP/coins для прокачки',
    });
  }

  if (
    state.stageScenarioProgress.isComplete &&
    state.stageSkillProgress.total > 0 &&
    state.stageSkillProgress.completed < state.stageSkillProgress.total
  ) {
    return makeAction({
      id: 'upgrade-skills',
      title: 'Прокачать навыки',
      description: 'Подними ключевые навыки до максимума текущего этапа.',
      route: '/skills',
      reason: 'Нужно закрыть 4/4 навыка, чтобы двигаться дальше',
    });
  }

  if (
    state.stageScenarioProgress.isComplete &&
    state.stageSkillProgress.isComplete &&
    !state.promotionGate.ok &&
    state.promotionGate.requiredCert
  ) {
    return makeAction({
      id: 'pass-exam',
      title: 'Сдать экзамен этапа',
      description: 'Экзамен подтверждает уровень и даёт сертификат.',
      route: '/exam',
      reason: 'Сертификат открывает повышение стадии',
    });
  }

  if (state.canAdvanceStage && state.promotionGate.ok) {
    return makeAction({
      id: 'promote-stage',
      title: 'Повысить стадию',
      description: 'Условия выполнены — можно перейти на следующий этап.',
      route: '/profile',
      reason: 'Условия выполнены — можно перейти на следующий этап',
    });
  }

  if (state.companyUnlocked && state.availableContractsCount > 0) {
    return makeAction({
      id: 'take-contract',
      title: 'Взять контракт',
      description: 'Контракты дают ресурсы и двигают компанию вперёд.',
      route: '/company',
      reason: 'Контракты дают cash/coins и продвигают компанию',
    });
  }

  if (state.companyUnlocked) {
    return makeAction({
      id: 'check-shop',
      title: 'Проверить магазин',
      description: 'Предметы усиливают прогресс и дают полезные баффы.',
      route: '/shop',
      reason: 'Предметы дают баффы и упрощают прогресс',
    });
  }

  const hasNgPlus = state.isNewGamePlus || state.ngPlusCount > 0;
  if (state.careerStage === 'senior' && state.endingResolved) {
    return makeAction({
      id: hasNgPlus ? 'ng-plus-goals' : 'ng-plus-start',
      title: hasNgPlus ? 'Продолжить цели NG+' : 'Цели New Game+',
      description: hasNgPlus
        ? 'Продолжай цели повышенной сложности и собирай новые ачивки.'
        : 'Открой усложнённый режим и новые цели развития.',
      route: '/profile',
      reason: 'Попробуй усложнённый режим или новые цели',
    });
  }

  return makeAction({
    id: 'review-profile',
    title: 'Открыть профиль',
    description: 'Проверь текущие цели, прогресс и доступные улучшения.',
    route: '/profile',
  });
};
