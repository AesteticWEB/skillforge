import { Injectable } from '@angular/core';
import { Observable, defer, from, map, shareReplay } from 'rxjs';
import type { Scenario } from '@/entities/scenario';
import type { DecisionEffects } from '@/entities/decision';
import type { ExamQuestion, ExamOption } from '@/entities/exam';
import type {
  IncidentDecision,
  IncidentDecisionEffects,
  IncidentSeverity,
  IncidentTemplate,
} from '@/entities/incidents';
import type {
  ShopItem,
  ShopCategory,
  ShopItemCurrency,
  ShopItemEffect,
  ShopItemRarity,
  ProfessionId,
  SkillStageId,
} from '@/shared/config';
import { PROFESSION_OPTIONS, SKILL_STAGE_ORDER } from '@/shared/config';

export type ExamContent = {
  id: string;
  professionId: string;
  stage: SkillStageId;
  passScore: number;
  questionCount: number;
};

export type ExamQuestionEntry = {
  question: ExamQuestion;
  professionId: string | null;
};

export type QuickFixContent = {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
};

type ContentItemPayload = {
  id: string;
  title: string;
  description: string;
  priceCoins: number;
  priceCash: number | null;
  rarity: string;
  effectsJson: string;
  enabled: boolean;
};

type ContentScenarioPayload = {
  id: string;
  profession: string;
  stage: string;
  title: string;
  description: string;
  rewardXp: number;
  rewardCoins: number;
  enabled: boolean;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    effectsJson: string;
  }>;
};

type ContentExamPayload = {
  id: string;
  profession: string;
  stage: string;
  passScore: number;
  questionCount: number;
  enabled: boolean;
};

type ContentQuestionPayload = {
  id: string;
  profession: string | null;
  text: string;
  tagsJson: string;
  difficulty: number | null;
  enabled: boolean;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }>;
};

type ContentQuickFixPayload = {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  enabled: boolean;
};

type ContentIncidentPayload = {
  id: string;
  title: string;
  description: string;
  severity: string;
  enabled: boolean;
  options: Array<{
    id: string;
    text: string;
    effectsJson: string;
  }>;
};

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

const parseJsonObject = (value: string | null | undefined): Record<string, unknown> => {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

const parseJsonStringArray = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
    return [];
  } catch {
    return [];
  }
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }
  return fallback;
};

const normalizeStage = (value: string | null | undefined): SkillStageId | null => {
  if (!value) {
    return null;
  }
  return (SKILL_STAGE_ORDER as readonly string[]).includes(value) ? (value as SkillStageId) : null;
};

const normalizeExamProfessionId = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const index = (PROFESSION_OPTIONS as readonly string[]).indexOf(trimmed);
  if (index >= 0) {
    return EXAM_PROFESSION_IDS[index];
  }
  return trimmed;
};

const mapProfessionLabel = (value: string | null | undefined): ProfessionId | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if ((PROFESSION_OPTIONS as readonly string[]).includes(trimmed)) {
    return trimmed as ProfessionId;
  }
  const index = (EXAM_PROFESSION_IDS as readonly string[]).indexOf(trimmed);
  if (index >= 0) {
    return PROFESSION_OPTIONS[index] as ProfessionId;
  }
  return null;
};

const normalizeRarity = (value: string | null | undefined): ShopItemRarity => {
  if (!value) {
    return 'common';
  }
  if (value === 'common' || value === 'uncommon' || value === 'rare' || value === 'epic') {
    return value;
  }
  if (value === 'legendary') {
    return 'legendary';
  }
  return 'common';
};

const normalizeCategory = (value: unknown): ShopCategory | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const allowed = [
    'productivity',
    'learning',
    'quality',
    'health',
    'automation',
    'career',
    'team',
    'ops',
    'networking',
    'security',
    'luxury',
  ] as const;
  return allowed.includes(value as ShopCategory) ? (value as ShopCategory) : null;
};

const normalizeCurrency = (value: unknown): ShopItemCurrency | null => {
  if (value === 'cash' || value === 'coins') {
    return value as ShopItemCurrency;
  }
  return null;
};

const mapItemPayload = (payload: ContentItemPayload): ShopItem => {
  const raw = parseJsonObject(payload.effectsJson);
  const effects: ShopItemEffect = {
    reputation: toNumber(raw['reputation'], 0) || undefined,
    techDebt: toNumber(raw['techDebt'], 0) || undefined,
    coins: toNumber(raw['coins'], 0) || undefined,
    cash: toNumber(raw['cash'], 0) || undefined,
    xp: toNumber(raw['xp'], 0) || undefined,
  };
  const normalizedEffects = Object.fromEntries(
    Object.entries(effects).filter(([, value]) => typeof value === 'number' && value !== 0),
  ) as ShopItemEffect;

  const currency =
    normalizeCurrency(raw['currency']) ??
    (payload.priceCash && payload.priceCash > 0 ? 'cash' : 'coins');
  const price = currency === 'cash' ? (payload.priceCash ?? 0) : (payload.priceCoins ?? 0);
  const category =
    normalizeCategory(raw['category']) ?? (currency === 'cash' ? 'luxury' : 'productivity');

  return {
    id: payload.id,
    name: payload.title,
    description: payload.description,
    rarity: normalizeRarity(payload.rarity),
    category,
    price: Number.isFinite(price) ? price : 0,
    currency,
    effects: normalizedEffects,
  };
};

const mapScenarioPayload = (payload: ContentScenarioPayload): Scenario | null => {
  const stage = normalizeStage(payload.stage);
  if (!stage) {
    return null;
  }
  const professionLabel = mapProfessionLabel(payload.profession);
  const profession = professionLabel ?? 'all';
  const decisions = (payload.options ?? []).map((option) => {
    const raw = parseJsonObject(option.effectsJson);
    const effects: DecisionEffects = Object.fromEntries(
      Object.entries(raw).filter(([, value]) => typeof value === 'number'),
    ) as DecisionEffects;
    return {
      id: option.id,
      text: option.text,
      effects,
    };
  });
  const correctOptionIds = (payload.options ?? [])
    .filter((option) => option.isCorrect)
    .map((option) => option.id);

  return {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    stage,
    profession,
    rewardXp: toNumber(payload.rewardXp, 0),
    correctOptionIds,
    decisions,
  };
};

const mapExamPayload = (payload: ContentExamPayload): ExamContent | null => {
  const stage = normalizeStage(payload.stage);
  if (!stage) {
    return null;
  }
  const professionId = normalizeExamProfessionId(payload.profession);
  if (!professionId) {
    return null;
  }
  return {
    id: payload.id,
    professionId,
    stage,
    passScore: toNumber(payload.passScore, 70),
    questionCount: Math.max(1, toNumber(payload.questionCount, 10)),
  };
};

const mapQuestionPayload = (payload: ContentQuestionPayload): ExamQuestionEntry | null => {
  const options = (payload.options ?? [])
    .filter((option) => option && typeof option.text === 'string')
    .map((option) => ({ id: option.id, text: option.text }));
  if (options.length < 2) {
    return null;
  }
  const correctIds = (payload.options ?? [])
    .filter((option) => option.isCorrect)
    .map((option) => option.id);
  if (correctIds.length === 0) {
    return null;
  }
  const explanation =
    payload.options?.find((option) => option.isCorrect)?.explanation ??
    payload.options?.[0]?.explanation ??
    '';
  const tags = parseJsonStringArray(payload.tagsJson);
  const questionBase = {
    id: payload.id,
    prompt: payload.text,
    options: options as ExamOption[],
    explanation: explanation || undefined,
    tags: tags.length > 0 ? tags : undefined,
  };
  const question: ExamQuestion =
    correctIds.length > 1
      ? { ...questionBase, type: 'multiChoice', correctOptionIds: correctIds }
      : { ...questionBase, type: 'singleChoice', correctOptionId: correctIds[0] };
  const professionId = normalizeExamProfessionId(payload.profession);

  return {
    question,
    professionId: professionId ?? null,
  };
};

const normalizeIncidentSeverity = (value: string | null | undefined): IncidentSeverity => {
  if (value === 'major' || value === 'critical' || value === 'minor') {
    return value;
  }
  return 'minor';
};

const mapIncidentEffects = (raw: Record<string, unknown>): IncidentDecisionEffects => ({
  cashDelta: toNumber(raw['cashDelta'], 0),
  reputationDelta: toNumber(raw['reputationDelta'], 0),
  techDebtDelta: toNumber(raw['techDebtDelta'], 0),
  moraleDelta: toNumber(raw['moraleDelta'], 0),
});

const mapIncidentPayload = (payload: ContentIncidentPayload): IncidentTemplate | null => {
  const options = payload.options ?? [];
  if (options.length < 3) {
    return null;
  }
  const decisionIds = ['a', 'b', 'c'] as const;
  const decisions = decisionIds.map((decisionId, index) => {
    const option = options[index];
    const raw = parseJsonObject(option?.effectsJson ?? '{}');
    const effects = mapIncidentEffects(raw);
    const title = option?.text ?? `Decision ${decisionId.toUpperCase()}`;
    const decision: IncidentDecision = {
      id: decisionId,
      title,
      description: '',
      effects,
    };
    return decision;
  });

  return {
    id: payload.id,
    titleRu: payload.title,
    descRu: payload.description,
    severity: normalizeIncidentSeverity(payload.severity),
    decisions: decisions as [IncidentDecision, IncidentDecision, IncidentDecision],
  };
};

const mapQuickFixPayload = (payload: ContentQuickFixPayload): QuickFixContent => ({
  id: payload.id,
  title: payload.title,
  description: payload.description,
  rewardCoins: toNumber(payload.rewardCoins, 10),
});

const fetchJson = <T>(url: string): Observable<T> =>
  defer(() =>
    from(
      fetch(url).then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const message = typeof data?.error === 'string' ? data.error : response.statusText;
          throw new Error(message || `Request failed (${response.status})`);
        }
        return response.json() as Promise<T>;
      }),
    ),
  );

@Injectable({ providedIn: 'root' })
export class ContentApi {
  private items$?: Observable<ShopItem[]>;
  private scenarios$?: Observable<Scenario[]>;
  private exams$?: Observable<ExamContent[]>;
  private questions$?: Observable<ExamQuestionEntry[]>;
  private incidents$?: Observable<IncidentTemplate[]>;
  private quickFixes$?: Observable<QuickFixContent[]>;

  getItems(): Observable<ShopItem[]> {
    if (!this.items$) {
      this.items$ = fetchJson<{ ok: boolean; items: ContentItemPayload[] }>(
        '/api/content/items',
      ).pipe(
        map((response) => response.items ?? []),
        map((items) => items.filter((item) => item.enabled).map(mapItemPayload)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.items$;
  }

  getScenarios(): Observable<Scenario[]> {
    if (!this.scenarios$) {
      this.scenarios$ = fetchJson<{ ok: boolean; scenarios: ContentScenarioPayload[] }>(
        '/api/content/scenarios',
      ).pipe(
        map((response) => response.scenarios ?? []),
        map((scenarios) =>
          scenarios
            .filter((scenario) => scenario.enabled)
            .map(mapScenarioPayload)
            .filter((scenario): scenario is Scenario => Boolean(scenario)),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.scenarios$;
  }

  getExams(): Observable<ExamContent[]> {
    if (!this.exams$) {
      this.exams$ = fetchJson<{ ok: boolean; exams: ContentExamPayload[] }>(
        '/api/content/exams',
      ).pipe(
        map((response) => response.exams ?? []),
        map((exams) =>
          exams
            .filter((exam) => exam.enabled)
            .map(mapExamPayload)
            .filter((exam): exam is ExamContent => Boolean(exam)),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.exams$;
  }

  getQuestions(): Observable<ExamQuestionEntry[]> {
    if (!this.questions$) {
      this.questions$ = fetchJson<{ ok: boolean; questions: ContentQuestionPayload[] }>(
        '/api/content/questions',
      ).pipe(
        map((response) => response.questions ?? []),
        map((questions) =>
          questions
            .filter((question) => question.enabled)
            .map(mapQuestionPayload)
            .filter((question): question is ExamQuestionEntry => Boolean(question)),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.questions$;
  }

  getIncidents(): Observable<IncidentTemplate[]> {
    if (!this.incidents$) {
      this.incidents$ = fetchJson<{ ok: boolean; incidents: ContentIncidentPayload[] }>(
        '/api/content/incidents',
      ).pipe(
        map((response) => response.incidents ?? []),
        map((incidents) =>
          incidents
            .filter((incident) => incident.enabled)
            .map(mapIncidentPayload)
            .filter((incident): incident is IncidentTemplate => Boolean(incident)),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.incidents$;
  }

  getQuickFixes(): Observable<QuickFixContent[]> {
    if (!this.quickFixes$) {
      this.quickFixes$ = fetchJson<{ ok: boolean; quickFixes: ContentQuickFixPayload[] }>(
        '/api/content/quick-fixes',
      ).pipe(
        map((response) => response.quickFixes ?? []),
        map((quickFixes) =>
          quickFixes.filter((quickFix) => quickFix.enabled).map(mapQuickFixPayload),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.quickFixes$;
  }
}
