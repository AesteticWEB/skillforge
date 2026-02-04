import type { EndingId, EndingResult, ResolveEndingInput } from '../model/ending.model';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const ensureNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const buildSummary = (lines: string[]): string =>
  lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

const buildStats = (input: ResolveEndingInput, score: number) => ({
  cash: ensureNumber(input.cash),
  reputation: ensureNumber(input.reputation),
  techDebt: ensureNumber(input.techDebt),
  avgMorale: typeof input.avgMorale === 'number' ? input.avgMorale : undefined,
  companyLevel: input.companyLevel,
  completedContracts: input.counters?.completedContracts,
  incidentsResolved: input.counters?.incidentsResolved,
  finaleFlags: input.finale?.branchFlags ?? {},
  score,
});

const resolveScore = (input: ResolveEndingInput): number => {
  const cash = ensureNumber(input.cash);
  const reputation = ensureNumber(input.reputation);
  const techDebt = ensureNumber(input.techDebt);
  const raw = Math.floor(reputation * 2 + cash / 200 - techDebt * 1.5);
  return clamp(raw, 0, 1000);
};

export const resolveEnding = (state: ResolveEndingInput): EndingResult => {
  const cash = ensureNumber(state.cash);
  const reputation = ensureNumber(state.reputation);
  const techDebt = ensureNumber(state.techDebt);
  const flags = state.finale?.branchFlags ?? {};
  const finaleComplete = Boolean(state.finale?.finished || state.finale?.endingHint);
  const score = resolveScore(state);

  const isBankrupt = cash < 0 || (cash < 500 && techDebt > 80);
  const isScandal = reputation <= 10 || (techDebt >= 90 && flags['aggressive'] === true);
  const isIpo = finaleComplete && cash >= 20000 && reputation >= 70 && techDebt <= 40;
  const isAcq = finaleComplete && cash >= 10000 && reputation >= 50 && techDebt <= 60;
  const isOss =
    finaleComplete &&
    (flags['ethical'] === true || flags['oss'] === true) &&
    reputation >= 40 &&
    techDebt <= 70;

  let endingId: EndingId = 'oss';
  if (isBankrupt) {
    endingId = 'bankrupt';
  } else if (isScandal) {
    endingId = 'scandal';
  } else if (isIpo) {
    endingId = 'ipo';
  } else if (isAcq) {
    endingId = 'acq';
  } else if (isOss) {
    endingId = 'oss';
  }

  switch (endingId) {
    case 'bankrupt':
      return {
        endingId,
        title: 'Банкротство: деньги закончились',
        summary: buildSummary([
          'Кэш оказался ниже безопасного уровня, а техдолг вышел из-под контроля.',
          `Финансовая подушка: ${cash}. Репутация: ${reputation}.`,
          'Совет признал компанию неплатёжеспособной и остановил развитие.',
        ]),
        stats: buildStats(state, score),
      };
    case 'scandal':
      return {
        endingId,
        title: 'Скандал: доверие потеряно',
        summary: buildSummary([
          'Репутация упала слишком низко, чтобы сохранить мандат на развитие.',
          `Показатели: репутация ${reputation}, техдолг ${techDebt}.`,
          'Совет объявил кризис доверия и заморозил стратегические решения.',
        ]),
        stats: buildStats(state, score),
      };
    case 'ipo':
      return {
        endingId,
        title: 'IPO: вы вывели компанию на биржу',
        summary: buildSummary([
          'Финансы и репутация позволили выйти на публичный рынок.',
          `Кэш: ${cash}, репутация: ${reputation}, техдолг: ${techDebt}.`,
          'Совет утвердил IPO и закрепил тебя как лидера роста.',
        ]),
        stats: buildStats(state, score),
      };
    case 'acq':
      return {
        endingId,
        title: 'Поглощение: вас купил крупный игрок',
        summary: buildSummary([
          'Компания стала привлекательной для стратегического игрока.',
          `Кэш: ${cash}, репутация: ${reputation}, техдолг: ${techDebt}.`,
          'Совет принял предложение о поглощении ради стабильного будущего.',
        ]),
        stats: buildStats(state, score),
      };
    case 'oss':
    default:
      return {
        endingId: 'oss',
        title: 'Open Source: вы открыли продукт миру',
        summary: buildSummary([
          'Вы выбрали открытость и доверие сообщества как стратегический курс.',
          `Репутация: ${reputation}, техдолг: ${techDebt}.`,
          finaleComplete
            ? 'Совет согласился на открытие продукта и новый формат развития.'
            : 'Финал не завершён, поэтому совет выбрал путь прозрачности.',
        ]),
        stats: buildStats(state, score),
      };
  }
};
