import type { FinaleStep } from '../model/finale.model';

export const BOARD_MEETING_STEPS: FinaleStep[] = [
  {
    id: 'bm_1',
    title: 'Совет директоров недоволен',
    narrative:
      'Отчёты показывают рост, но ожидания совета стали выше.\n' +
      'Директора хотят понять, куда ты поведёшь компанию дальше.\n' +
      'Нужно выбрать стратегию, которая задаст тон всей встрече.',
    choices: [
      {
        id: 'a',
        title: 'Рост любой ценой',
        description: 'Фокус на скорости и доле рынка, даже если придётся рисковать.',
        effects: { cashDelta: 600, reputationDelta: -1, techDebtDelta: 2, moraleDelta: -2 },
      },
      {
        id: 'b',
        title: 'Устойчивый рост',
        description: 'Балансируем результат и стабильность, укрепляем доверие.',
        effects: { cashDelta: 200, reputationDelta: 2, techDebtDelta: -1, moraleDelta: 1 },
      },
      {
        id: 'c',
        title: 'Сдержанные ожидания',
        description: 'Снижаем давление, чтобы не перегореть и сохранить качество.',
        effects: { cashDelta: 0, reputationDelta: 0, techDebtDelta: 0, moraleDelta: 2 },
      },
    ],
    defaultNext: 'bm_2',
  },
  {
    id: 'bm_2',
    title: 'Инциденты и долги всплывают',
    narrative:
      'На повестке — недавние инциденты и рост техдолга.\n' +
      'Совет требует немедленных действий и объяснений.\n' +
      'Твоё решение повлияет на доверие и динамику команды.',
    choices: [
      {
        id: 'a',
        title: 'Инвестировать в стабильность',
        description: 'Усиливаем качество и инфраструктуру прямо сейчас.',
        effects: { cashDelta: -500, reputationDelta: 1, techDebtDelta: -2, moraleDelta: 1 },
      },
      {
        id: 'b',
        title: 'Скрыть проблему',
        description: 'Сдвигаем фокус на рост, надеясь, что всё рассосётся.',
        effects: { cashDelta: 100, reputationDelta: -2, techDebtDelta: 2, moraleDelta: -1 },
        nextStep: 'bm_4',
      },
      {
        id: 'c',
        title: 'Признать и объяснить',
        description: 'Открыто говорим о рисках и предлагаем план.',
        effects: { cashDelta: -200, reputationDelta: 2, techDebtDelta: 1 },
      },
    ],
    defaultNext: 'bm_3',
  },
  {
    id: 'bm_3',
    title: 'Конфликт интересов и безопасность',
    narrative:
      'Один из инвесторов поднимает вопрос безопасности и комплаенса.\n' +
      'Команда предлагает компромисс, но риски всё ещё заметны.\n' +
      'Нужно определить принцип, по которому будем действовать.',
    choices: [
      {
        id: 'a',
        title: 'Идти на компромисс',
        description: 'Сохраняем темп, принимая часть рисков.',
        effects: { cashDelta: 150, reputationDelta: 0, techDebtDelta: 1 },
      },
      {
        id: 'b',
        title: 'Принципиальная позиция',
        description: 'Жёстко держим стандарты, даже если потеряем скорость.',
        effects: { cashDelta: -250, reputationDelta: 2, techDebtDelta: -1, moraleDelta: 1 },
      },
      {
        id: 'c',
        title: 'Отложить решение',
        description: 'Просим больше времени, чтобы собрать данные.',
        effects: { cashDelta: 0, reputationDelta: -1, techDebtDelta: 1 },
      },
    ],
    defaultNext: 'bm_4',
  },
  {
    id: 'bm_4',
    title: 'Сделка с партнёром',
    narrative:
      'На горизонте крупная сделка с партнёром, которая может ускорить рост.\n' +
      'Условия жёсткие, но дают шанс укрепить позицию на рынке.\n' +
      'Совет ждёт финального решения.',
    choices: [
      {
        id: 'a',
        title: 'Рискованная экспансия',
        description: 'Берём сделку и ускоряем масштабирование.',
        effects: { cashDelta: 800, reputationDelta: -1, techDebtDelta: 2, moraleDelta: -1 },
      },
      {
        id: 'b',
        title: 'Партнёрство с ограничениями',
        description: 'Берём выгоды, но фиксируем границы риска.',
        effects: { cashDelta: 300, reputationDelta: 1, techDebtDelta: 0 },
      },
      {
        id: 'c',
        title: 'Отказаться от сделки',
        description: 'Сохраняем независимость и снижаем риск.',
        effects: { cashDelta: -100, reputationDelta: 0, techDebtDelta: -1, moraleDelta: 1 },
      },
    ],
    defaultNext: 'bm_5',
  },
  {
    id: 'bm_5',
    title: 'Финальное голосование',
    narrative:
      'Совет готов к финальному голосованию.\n' +
      'Оцениваются финансы, репутация и устойчивость команды.\n' +
      'Твоё слово — последнее.',
    choices: [
      {
        id: 'a',
        title: 'Убедить совет в выбранном курсе',
        description: 'Подчёркиваем результаты и готовность к рискам.',
        effects: { cashDelta: 0, reputationDelta: 1 },
      },
      {
        id: 'b',
        title: 'Попросить о доверии',
        description: 'Ставим на долгосрочную устойчивость.',
        effects: { cashDelta: 0, reputationDelta: 2 },
      },
      {
        id: 'c',
        title: 'Принять компромисс',
        description: 'Согласиться на промежуточный план.',
        effects: { cashDelta: 0, reputationDelta: 0 },
      },
    ],
    defaultNext: null,
  },
];
