import type { Quest, QuestObjectiveType } from '../model/quest.model';

export type GenerateSessionQuestsParams = {
  seed: string;
  sessionId: string;
};

type QuestTemplate = {
  id: string;
  type: QuestObjectiveType;
  title: string;
  description: string;
  targetMin: number;
  targetMax: number;
  rewardCoinsMin: number;
  rewardCoinsMax: number;
  badgeId: string;
};

type SeedFlags = {
  allowExam: boolean;
  allowPurchase: boolean;
};

export const SESSION_QUEST_BADGE_LABELS: Record<string, string> = {
  'session-scenario-sprint': 'Спринт сценариев',
  'session-scenario-focus': 'Фокус на решениях',
  'session-exam-pass': 'Экзаменатор',
  'session-exam-ready': 'Готов к экзамену',
  'session-purchase-upgrade': 'Апгрейд недели',
  'session-purchase-invest': 'Инвестиция в инструменты',
};

const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'scenario-sprint',
    type: 'scenario',
    title: 'Спринт решений',
    description: 'Пройди несколько сценариев, чтобы ускорить прогресс.',
    targetMin: 1,
    targetMax: 3,
    rewardCoinsMin: 6,
    rewardCoinsMax: 12,
    badgeId: 'session-scenario-sprint',
  },
  {
    id: 'scenario-focus',
    type: 'scenario',
    title: 'Фокус на сценариях',
    description: 'Закрой серию сценариев и закрепи навык принятия решений.',
    targetMin: 2,
    targetMax: 3,
    rewardCoinsMin: 8,
    rewardCoinsMax: 14,
    badgeId: 'session-scenario-focus',
  },
  {
    id: 'exam-pass',
    type: 'exam',
    title: 'Экзамен сессии',
    description: 'Сдай один экзамен, чтобы подтвердить уровень.',
    targetMin: 1,
    targetMax: 1,
    rewardCoinsMin: 10,
    rewardCoinsMax: 16,
    badgeId: 'session-exam-pass',
  },
  {
    id: 'exam-ready',
    type: 'exam',
    title: 'Готов к экзамену',
    description: 'Пройди экзамен и закрепи уверенность в знаниях.',
    targetMin: 1,
    targetMax: 1,
    rewardCoinsMin: 9,
    rewardCoinsMax: 14,
    badgeId: 'session-exam-ready',
  },
  {
    id: 'purchase-upgrade',
    type: 'purchase',
    title: 'Апгрейд инструментов',
    description: 'Сделай покупку в магазине, чтобы усилить команду.',
    targetMin: 1,
    targetMax: 2,
    rewardCoinsMin: 6,
    rewardCoinsMax: 12,
    badgeId: 'session-purchase-upgrade',
  },
  {
    id: 'purchase-invest',
    type: 'purchase',
    title: 'Инвестиция в рост',
    description: 'Купи полезный предмет и ускорь развитие.',
    targetMin: 1,
    targetMax: 2,
    rewardCoinsMin: 7,
    rewardCoinsMax: 13,
    badgeId: 'session-purchase-invest',
  },
];

const hashStringToInt = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const randomInt = (rng: () => number, min: number, max: number): number => {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  if (safeMax <= safeMin) {
    return Math.floor(safeMin);
  }
  return Math.floor(rng() * (safeMax - safeMin + 1)) + safeMin;
};

const parseSeedFlags = (seed: string): SeedFlags => {
  const parts = seed.split('|');
  const flags: SeedFlags = {
    allowExam: true,
    allowPurchase: true,
  };

  for (const part of parts) {
    const [key, rawValue] = part.split('=');
    const value = rawValue?.trim();
    if (!key || value === undefined) {
      continue;
    }
    if (key === 'exam') {
      flags.allowExam = value !== '0' && value.toLowerCase() !== 'false';
    }
    if (key === 'purchase') {
      flags.allowPurchase = value !== '0' && value.toLowerCase() !== 'false';
    }
  }

  return flags;
};

const filterTemplates = (flags: SeedFlags): QuestTemplate[] => {
  return QUEST_TEMPLATES.filter((template) => {
    if (template.type === 'exam' && !flags.allowExam) {
      return false;
    }
    if (template.type === 'purchase' && !flags.allowPurchase) {
      return false;
    }
    return true;
  });
};

const pickTemplates = (
  templates: QuestTemplate[],
  count: number,
  rng: () => number,
): QuestTemplate[] => {
  if (templates.length === 0) {
    return [];
  }

  const result: QuestTemplate[] = [];
  let pool = [...templates];

  while (result.length < count) {
    if (pool.length === 0) {
      pool = [...templates];
    }
    const index = Math.floor(rng() * pool.length);
    result.push(pool[index]);
    pool.splice(index, 1);
  }

  return result;
};

const buildQuest = (
  template: QuestTemplate,
  rng: () => number,
  sessionId: string,
  issuedAtIso: string,
  index: number,
): Quest => {
  const target = randomInt(rng, template.targetMin, template.targetMax);
  const coins = randomInt(rng, template.rewardCoinsMin, template.rewardCoinsMax);

  return {
    id: `quest:${sessionId}:${template.id}:${index}`,
    title: template.title,
    description: template.description,
    objective: {
      type: template.type,
      target: Math.max(1, target),
      current: 0,
    },
    reward: {
      coins: Math.max(0, coins),
      badgeId: template.badgeId,
    },
    status: 'active',
    issuedAtIso,
    sessionId,
  };
};

export const generateSessionQuests = (params: GenerateSessionQuestsParams): Quest[] => {
  const { seed, sessionId } = params;
  const baseSeed = `${seed}:${sessionId}:session-quests`;
  const rng = mulberry32(hashStringToInt(baseSeed));
  const issuedAtIso = sessionId;

  const flags = parseSeedFlags(seed);
  const allowedTemplates = filterTemplates(flags);
  const templates = pickTemplates(allowedTemplates, 3, rng);

  if (templates.length === 0) {
    return [];
  }

  return templates.map((template, index) =>
    buildQuest(template, rng, sessionId, issuedAtIso, index),
  );
};
