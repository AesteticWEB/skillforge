import type { ContractDifficulty, ContractType } from '@/entities/contracts';
import type { SkillStageId } from './professions';

export type ContractTemplate = {
  id: string;
  type: ContractType;
  titleRu: string;
  descRu: string;
  difficulty: ContractDifficulty;
  objectiveBase: { min: number; max: number };
  rewardBase: {
    coinsMin: number;
    coinsMax: number;
    cashMin?: number;
    cashMax?: number;
    repMin?: number;
    repMax?: number;
    debtMin?: number;
    debtMax?: number;
  };
  tags: string[];
  weightByStage?: Record<SkillStageId, number>;
};

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'scenario_quick_fix',
    type: 'scenario',
    titleRu: 'Быстрый фикс',
    descRu: 'Закрыть срочный баг, чтобы команда могла двигаться дальше.',
    difficulty: 'легко',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 3, coinsMax: 6, repMin: 0, repMax: 1 },
    tags: ['быстрый фикс', 'баг', 'сценарий'],
    weightByStage: { internship: 1.8, junior: 1.4, middle: 1.0, senior: 0.6 },
  },
  {
    id: 'scenario_feature',
    type: 'scenario',
    titleRu: 'Новая фича',
    descRu: 'Сделать небольшую, но заметную фичу для продукта.',
    difficulty: 'нормально',
    objectiveBase: { min: 1, max: 3 },
    rewardBase: { coinsMin: 5, coinsMax: 9, repMin: 1, repMax: 2 },
    tags: ['фича', 'продукт', 'сценарий'],
    weightByStage: { internship: 0.7, junior: 1.3, middle: 1.4, senior: 1.1 },
  },
  {
    id: 'scenario_refactor',
    type: 'scenario',
    titleRu: 'Рефакторинг модуля',
    descRu: 'Разгрести код, чтобы ускорить будущую разработку.',
    difficulty: 'сложно',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 6, coinsMax: 11, repMin: 1, repMax: 3, debtMin: -2, debtMax: -1 },
    tags: ['рефактор', 'код', 'сценарий'],
    weightByStage: { internship: 0.4, junior: 0.9, middle: 1.4, senior: 1.6 },
  },
  {
    id: 'scenario_optimization',
    type: 'scenario',
    titleRu: 'Оптимизация производительности',
    descRu: 'Снять узкие места и ускорить отклик системы.',
    difficulty: 'сложно',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 7, coinsMax: 12, repMin: 2, repMax: 3, debtMin: -2, debtMax: -1 },
    tags: ['оптимизация', 'производительность', 'сценарий'],
    weightByStage: { internship: 0.2, junior: 0.6, middle: 1.2, senior: 1.6 },
  },
  {
    id: 'exam_certification',
    type: 'exam',
    titleRu: 'Сертификация навыков',
    descRu: 'Пройти официальную сертификацию и подтвердить компетенции.',
    difficulty: 'сложно',
    objectiveBase: { min: 1, max: 1 },
    rewardBase: { coinsMin: 8, coinsMax: 14, repMin: 2, repMax: 4 },
    tags: ['сертификация', 'экзамен'],
    weightByStage: { internship: 0.3, junior: 0.7, middle: 1.3, senior: 1.6 },
  },
  {
    id: 'exam_knowledge_check',
    type: 'exam',
    titleRu: 'Проверка знаний',
    descRu: 'Пройти короткий тест на базовые знания.',
    difficulty: 'легко',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 4, coinsMax: 7, repMin: 1, repMax: 2 },
    tags: ['проверка', 'экзамен'],
    weightByStage: { internship: 1.6, junior: 1.3, middle: 0.8, senior: 0.5 },
  },
  {
    id: 'exam_internal',
    type: 'exam',
    titleRu: 'Внутренний экзамен',
    descRu: 'Сдать экзамен по корпоративным стандартам.',
    difficulty: 'нормально',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 6, coinsMax: 10, repMin: 1, repMax: 3 },
    tags: ['экзамен', 'стандарты'],
    weightByStage: { internship: 0.9, junior: 1.2, middle: 1.2, senior: 1.0 },
  },
  {
    id: 'exam_speed',
    type: 'exam',
    titleRu: 'Экзамен на скорость',
    descRu: 'Проверить знания в условиях ограниченного времени.',
    difficulty: 'сложно',
    objectiveBase: { min: 1, max: 1 },
    rewardBase: { coinsMin: 7, coinsMax: 12, repMin: 2, repMax: 3 },
    tags: ['экзамен', 'скорость'],
    weightByStage: { internship: 0.2, junior: 0.7, middle: 1.1, senior: 1.4 },
  },
  {
    id: 'purchase_upgrade',
    type: 'purchase',
    titleRu: 'Купить улучшение рабочего места',
    descRu: 'Подобрать и приобрести апгрейд для комфортной работы.',
    difficulty: 'легко',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 2, coinsMax: 5, cashMin: 8, cashMax: 12, repMin: 0, repMax: 1 },
    tags: ['покупка', 'сетап'],
    weightByStage: { internship: 1.4, junior: 1.2, middle: 0.9, senior: 0.7 },
  },
  {
    id: 'purchase_setup',
    type: 'purchase',
    titleRu: 'Обновить рабочий сетап',
    descRu: 'Навести порядок в инструментах и окружении.',
    difficulty: 'нормально',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 3, coinsMax: 6, cashMin: 10, cashMax: 16, repMin: 1, repMax: 2 },
    tags: ['сетап', 'инструменты'],
    weightByStage: { internship: 1.0, junior: 1.2, middle: 1.0, senior: 0.8 },
  },
  {
    id: 'purchase_tools',
    type: 'purchase',
    titleRu: 'Оплатить лицензии и инструменты',
    descRu: 'Обновить подписки и получить доступ к нужным сервисам.',
    difficulty: 'нормально',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 3, coinsMax: 6, cashMin: 12, cashMax: 18, repMin: 1, repMax: 2 },
    tags: ['покупка', 'лицензии'],
    weightByStage: { internship: 0.8, junior: 1.1, middle: 1.1, senior: 1.0 },
  },
  {
    id: 'debt_payoff',
    type: 'debt',
    titleRu: 'Погасить техдолг',
    descRu: 'Закрыть накопленные технические задачи.',
    difficulty: 'нормально',
    objectiveBase: { min: 1, max: 3 },
    rewardBase: { coinsMin: 4, coinsMax: 8, repMin: 1, repMax: 2, debtMin: -2, debtMax: -1 },
    tags: ['техдолг', 'стабилизация'],
    weightByStage: { internship: 0.4, junior: 0.8, middle: 1.3, senior: 1.4 },
  },
  {
    id: 'debt_stabilize',
    type: 'debt',
    titleRu: 'Стабилизировать систему',
    descRu: 'Устранить источники нестабильности и снизить риск инцидентов.',
    difficulty: 'сложно',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 6, coinsMax: 10, repMin: 2, repMax: 3, debtMin: -3, debtMax: -2 },
    tags: ['стабилизация', 'техдолг', 'инциденты'],
    weightByStage: { internship: 0.2, junior: 0.6, middle: 1.2, senior: 1.6 },
  },
  {
    id: 'debt_cleanup',
    type: 'debt',
    titleRu: 'Очистить зависимости',
    descRu: 'Убрать хрупкие зависимости и привести код к порядку.',
    difficulty: 'нормально',
    objectiveBase: { min: 1, max: 2 },
    rewardBase: { coinsMin: 4, coinsMax: 7, repMin: 1, repMax: 2, debtMin: -2, debtMax: -1 },
    tags: ['зависимости', 'техдолг'],
    weightByStage: { internship: 0.3, junior: 0.7, middle: 1.2, senior: 1.4 },
  },
];
