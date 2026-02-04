import type { FinaleChainId, FinaleState, FinaleStep, FinaleStepId } from '../model/finale.model';
import { BOARD_MEETING_STEPS } from '../data/board-meeting';

const CHAINS: Record<FinaleChainId, FinaleStep[]> = {
  board_meeting: BOARD_MEETING_STEPS,
};

export const createEmptyFinaleState = (): FinaleState => ({
  unlocked: false,
  active: false,
  chainId: 'board_meeting',
  currentStepId: 'bm_1',
  completedStepIds: [],
  history: [],
  branchFlags: {},
  finished: false,
});

const cloneStep = (step: FinaleStep): FinaleStep => ({
  ...step,
  choices: step.choices.map((choice) => ({
    ...choice,
    effects: choice.effects ? { ...choice.effects } : undefined,
  })),
});

export const resolveFinaleStep = (
  chainId: FinaleChainId,
  stepId: FinaleStepId,
  branchFlags: Record<string, boolean> = {},
): FinaleStep | null => {
  const step = CHAINS[chainId]?.find((entry) => entry.id === stepId);
  if (!step) {
    return null;
  }
  const resolved = cloneStep(step);

  if (chainId === 'board_meeting') {
    if (stepId === 'bm_4') {
      if (branchFlags['aggressive']) {
        resolved.narrative =
          'После ставки на быстрый рост совет ждёт от тебя смелых решений.\n' +
          'Партнёрская сделка может ускорить масштабирование, но риски велики.\n' +
          'Какой уровень риска ты готов принять?';
      } else if (branchFlags['stability']) {
        resolved.narrative =
          'Совет слышал твой курс на стабильность и хочет понять границы роста.\n' +
          'Партнёрская сделка даёт деньги, но требует дисциплины.\n' +
          'Нужен взвешенный ответ.';
      } else if (branchFlags['ethical']) {
        resolved.narrative =
          'Ты сделал ставку на прозрачность, и это обсуждают на совете.\n' +
          'Сделка с партнёром может укрепить доверие, если условия честные.\n' +
          'Решение должно совпадать с заявленными принципами.';
      }
    }

    if (stepId === 'bm_3' && branchFlags['fastTrackDeal']) {
      resolved.narrative =
        'После ускоренной сделки всплыли вопросы безопасности и комплаенса.\n' +
        'Инвесторы хотят гарантий и план снижения рисков.\n' +
        'Твой ответ определит доверие к команде.';
    }
  }

  return resolved;
};

export const resolveFinaleEndingId = (input: {
  branchFlags: Record<string, boolean>;
  cash: number;
  reputation: number;
  techDebt: number;
}): string => {
  const { branchFlags, cash, reputation, techDebt } = input;

  if (reputation <= 1 || techDebt >= 8) {
    return 'ending_scandal';
  }

  if (branchFlags['aggressive'] && cash >= 10000) {
    return 'ending_growth';
  }

  if (branchFlags['stability'] && techDebt <= 3 && reputation >= 5) {
    return 'ending_stability';
  }

  return 'ending_compromise';
};

export const FINALE_ENDINGS: Record<string, { title: string; summary: string }> = {
  ending_growth: {
    title: 'Агрессивный рост одобрен',
    summary: 'Совет поддержал экспансию, но ждёт доказательств устойчивости.',
  },
  ending_stability: {
    title: 'Курс на устойчивость',
    summary: 'Совет доверил тебе укрепление процессов и снижение рисков.',
  },
  ending_scandal: {
    title: 'Скандал и недоверие',
    summary: 'Риски и репутационные потери заставили совет пересмотреть доверие.',
  },
  ending_compromise: {
    title: 'Компромиссный мандат',
    summary: 'Совет дал шанс, но ожидает быстрых и ощутимых результатов.',
  },
};
