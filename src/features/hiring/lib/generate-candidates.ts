import type { TotalBuffs } from '@/entities/buffs';
import type { SkillStageId } from '@/shared/config';
import { BALANCE } from '@/shared/config';
import type { Candidate, CandidateRole, CandidateTrait } from '../model/candidate.model';

type GenerateCandidatesParams = {
  seed: string;
  stage: SkillStageId;
  reputation: number;
  techDebt: number;
  totalBuffs: TotalBuffs;
  poolSize?: number;
};

type TraitCaps = {
  cashIncomeBonusPct: number;
  incidentReducePct: number;
  techDebtDeltaPerTickAbs: number;
  productivityPct: number;
};

const DEFAULT_TRAIT_CAPS: TraitCaps = {
  cashIncomeBonusPct: 0.3,
  incidentReducePct: 0.3,
  techDebtDeltaPerTickAbs: 1.2,
  productivityPct: 0.3,
};

const FIRST_NAMES = [
  'Алексей',
  'Алина',
  'Виктор',
  'Виктория',
  'Глеб',
  'Дарья',
  'Екатерина',
  'Илья',
  'Кирилл',
  'Леонид',
  'Мария',
  'Никита',
  'Олег',
  'Полина',
  'София',
  'Станислав',
  'Тимур',
  'Юлия',
  'Ярослав',
  'Анна',
];

const LAST_NAMES = [
  'Смирнов',
  'Иванова',
  'Кузнецов',
  'Петрова',
  'Соколов',
  'Морозова',
  'Волков',
  'Новикова',
  'Фёдоров',
  'Попова',
  'Лебедев',
  'Зайцева',
  'Семёнов',
  'Ершова',
  'Павлов',
  'Козлова',
  'Виноградов',
  'Орлова',
  'Беляев',
  'Громова',
];

const BASE_QUALITY_BY_STAGE: Record<SkillStageId, number> = {
  internship: 35,
  junior: 50,
  middle: 65,
  senior: 80,
};

const ROLE_LABELS: Record<CandidateRole, string> = {
  junior: 'джуниор',
  middle: 'миддл',
  senior: 'сеньор',
};

const TRAITS: CandidateTrait[] = [
  {
    id: 'system-thinker',
    title: 'Системный мыслитель',
    desc: 'Строит архитектуру на несколько шагов вперёд.',
    effects: { productivityPct: 0.06, techDebtDeltaPerTick: -0.3 },
  },
  {
    id: 'communicator',
    title: 'Коммуникабельный',
    desc: 'Собирает обратную связь и быстро синхронизирует команду.',
    effects: { cashIncomeBonusPct: 0.05, incidentReducePct: 0.04 },
  },
  {
    id: 'firefighter',
    title: 'Пожарник',
    desc: 'Гасит инциденты быстрее всех, но иногда оставляет техдолг.',
    effects: { incidentReducePct: 0.12, techDebtDeltaPerTick: 0.35 },
  },
  {
    id: 'meticulous',
    title: 'Аккуратист',
    desc: 'Внимателен к деталям, аккуратно снижает техдолг.',
    effects: { techDebtDeltaPerTick: -0.5, productivityPct: -0.02 },
  },
  {
    id: 'optimizer',
    title: 'Оптимизатор',
    desc: 'Ускоряет процессы и добивается прироста эффективности.',
    effects: { productivityPct: 0.1 },
  },
  {
    id: 'security-paranoid',
    title: 'Параноик по безопасности',
    desc: 'Минимизирует риски и снижает число инцидентов.',
    effects: { incidentReducePct: 0.1, productivityPct: -0.03 },
  },
  {
    id: 'innovator',
    title: 'Инноватор',
    desc: 'Ищет новые идеи, ускоряет рост выручки.',
    effects: { cashIncomeBonusPct: 0.08, techDebtDeltaPerTick: 0.25 },
  },
  {
    id: 'documentator',
    title: 'Документатор',
    desc: 'Систематизирует знания и снижает техдолг.',
    effects: { techDebtDeltaPerTick: -0.25, incidentReducePct: 0.03 },
  },
  {
    id: 'team-player',
    title: 'Командный игрок',
    desc: 'Стабилизирует команду и ускоряет поставку.',
    effects: { productivityPct: 0.05, incidentReducePct: 0.03 },
  },
  {
    id: 'bug-hunter',
    title: 'Охотник на баги',
    desc: 'Находит дефекты до продакшена.',
    effects: { incidentReducePct: 0.09 },
  },
  {
    id: 'frugal',
    title: 'Экономный',
    desc: 'Оптимизирует бюджеты и повышает эффективность расходов.',
    effects: { cashIncomeBonusPct: 0.06 },
  },
  {
    id: 'refactorer',
    title: 'Рефакторщик',
    desc: 'Поддерживает кодовую базу в здоровом состоянии.',
    effects: { techDebtDeltaPerTick: -0.6, productivityPct: 0.02 },
  },
  {
    id: 'mentor',
    title: 'Ментор',
    desc: 'Ускоряет рост команды и улучшает процессы.',
    effects: { productivityPct: 0.04, cashIncomeBonusPct: 0.04 },
  },
  {
    id: 'calm-ops',
    title: 'Спокойный операционщик',
    desc: 'Снижает шум и стабилизирует работу сервисов.',
    effects: { incidentReducePct: 0.07, techDebtDeltaPerTick: -0.15 },
  },
];

const SUMMARY_TEMPLATES = [
  (roleLabel: string, traitA: string, traitB?: string) =>
    `Сильный ${roleLabel} с акцентом на «${traitA}»${traitB ? ` и «${traitB}»` : ''}.`,
  (roleLabel: string, traitA: string, traitB?: string) =>
    `Надёжный ${roleLabel}: ${traitA}${traitB ? `, ${traitB}` : ''}.`,
  (roleLabel: string, traitA: string, traitB?: string) =>
    `Ориентирован на результат. Черты: ${traitA}${traitB ? `, ${traitB}` : ''}.`,
  (roleLabel: string, traitA: string, traitB?: string) =>
    `Фокус на «${traitA}»${traitB ? ` и «${traitB}»` : ''}, подходит для сложных задач.`,
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
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  if (safeMax <= safeMin) {
    return safeMin;
  }
  return Math.floor(rng() * (safeMax - safeMin + 1)) + safeMin;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const pick = <T>(items: readonly T[], rng: () => number): T => {
  const index = Math.floor(rng() * items.length);
  return items[Math.min(items.length - 1, Math.max(0, index))];
};

const cloneTrait = (trait: CandidateTrait): CandidateTrait => ({
  ...trait,
  effects: {
    cashIncomeBonusPct: trait.effects.cashIncomeBonusPct ?? 0,
    incidentReducePct: trait.effects.incidentReducePct ?? 0,
    techDebtDeltaPerTick: trait.effects.techDebtDeltaPerTick ?? 0,
    productivityPct: trait.effects.productivityPct ?? 0,
  },
});

const applyTraitCaps = (traits: CandidateTrait[], caps: TraitCaps): CandidateTrait[] => {
  const keys = [
    ['cashIncomeBonusPct', caps.cashIncomeBonusPct],
    ['incidentReducePct', caps.incidentReducePct],
    ['techDebtDeltaPerTick', caps.techDebtDeltaPerTickAbs],
    ['productivityPct', caps.productivityPct],
  ] as const;

  for (const [key, cap] of keys) {
    const total = traits.reduce((sum, trait) => sum + (trait.effects[key] ?? 0), 0);
    const limit = key === 'techDebtDeltaPerTick' ? cap : Math.max(0, cap);
    if (limit <= 0) {
      continue;
    }
    if (Math.abs(total) <= limit) {
      continue;
    }
    const scale = limit / Math.abs(total);
    for (const trait of traits) {
      const value = trait.effects[key] ?? 0;
      trait.effects[key] = Math.round(value * scale * 1000) / 1000;
    }
  }

  return traits;
};

const resolveRole = (quality: number, stage: SkillStageId, rng: () => number): CandidateRole => {
  let role: CandidateRole = 'junior';
  if (quality >= 75) {
    role = 'senior';
  } else if (quality >= 55) {
    role = 'middle';
  }

  if (stage === 'internship') {
    if (role === 'senior') {
      role = 'middle';
    }
    if (role === 'middle' && rng() < 0.4) {
      role = 'junior';
    }
  }

  if (stage === 'junior' && role === 'senior' && rng() < 0.5) {
    role = 'middle';
  }

  return role;
};

const buildSummary = (role: CandidateRole, traits: CandidateTrait[], rng: () => number): string => {
  const roleLabel = ROLE_LABELS[role] ?? role;
  const traitA = traits[0]?.title ?? 'универсальность';
  const traitB = traits[1]?.title;
  const template = pick(SUMMARY_TEMPLATES, rng);
  return template(roleLabel, traitA, traitB);
};

const buildCandidateName = (rng: () => number): string => {
  const first = pick(FIRST_NAMES, rng);
  const last = pick(LAST_NAMES, rng);
  return `${first} ${last}`;
};

const buildTraits = (rng: () => number, minTraits: number, maxTraits: number): CandidateTrait[] => {
  const safeMax = Math.max(minTraits, maxTraits);
  const desired = clamp(randomInt(rng, minTraits, safeMax), minTraits, safeMax);
  const pool = [...TRAITS];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  const selected = pool.slice(0, Math.min(pool.length, desired)).map(cloneTrait);
  const caps = BALANCE.hiring?.traitEffectCaps ?? DEFAULT_TRAIT_CAPS;
  return applyTraitCaps(selected, caps);
};

const resolveQuality = (
  stage: SkillStageId,
  reputation: number,
  techDebt: number,
  totalBuffs: TotalBuffs,
  rng: () => number,
): number => {
  const base = BASE_QUALITY_BY_STAGE[stage] ?? 40;
  const jitter = randomInt(rng, -6, 8);
  const repBonus = clamp(reputation, 0, 50) * 0.6;
  const debtPenalty = clamp(techDebt, 0, 40) * 0.5;
  const buffCap = BALANCE.hiring?.qualityBonusPctMax ?? 0.5;
  const buffPct = clamp(totalBuffs.candidateQualityBonusPct ?? 0, -buffCap, buffCap);
  const buffBonus = base * buffPct;
  const raw = base + jitter + repBonus - debtPenalty + buffBonus;
  return clamp(Math.round(raw), 0, 100);
};

const resolveExpectedSalary = (role: CandidateRole, quality: number): number => {
  const base = role === 'senior' ? 2400 : role === 'middle' ? 1500 : 900;
  const factor = 0.8 + (clamp(quality, 0, 100) / 100) * 0.6;
  return Math.max(0, Math.round(base * factor));
};

export const generateCandidates = (params: GenerateCandidatesParams): Candidate[] => {
  const poolSize = Math.max(1, Math.floor(params.poolSize ?? BALANCE.hiring?.poolSize ?? 6));
  const seed = params.seed;
  const stage = params.stage;
  const reputation = Number.isFinite(params.reputation) ? params.reputation : 0;
  const techDebt = Number.isFinite(params.techDebt) ? params.techDebt : 0;
  const buffs = params.totalBuffs;

  const candidates: Candidate[] = [];

  for (let index = 0; index < poolSize; index += 1) {
    const candidateSeed = `${seed}:${index}`;
    const rng = mulberry32(hashStringToInt(candidateSeed));
    const quality = resolveQuality(stage, reputation, techDebt, buffs, rng);
    const role = resolveRole(quality, stage, rng);
    const traits = buildTraits(rng, 2, BALANCE.hiring?.maxTraitsPerCandidate ?? 3);
    const name = buildCandidateName(rng);
    const summary = buildSummary(role, traits, rng);
    const expectedSalaryCash = resolveExpectedSalary(role, quality);

    candidates.push({
      id: `candidate-${hashStringToInt(candidateSeed).toString(16)}`,
      name,
      role,
      quality,
      expectedSalaryCash,
      traits,
      summary,
      seed: candidateSeed,
    });
  }

  return candidates;
};
