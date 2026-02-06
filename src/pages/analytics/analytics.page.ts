import { ChangeDetectionStrategy, Component, computed, inject, isDevMode } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { AchievementsStore } from '@/features/achievements';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { PROFESSION_STAGE_SKILLS, type ProfessionId } from '@/shared/config';

type DecisionStats = {
  debtUp: number;
  debtDown: number;
  repUp: number;
  repDown: number;
  coinUp: number;
  coinDown: number;
  netDebt: number;
  netRep: number;
  netCoins: number;
  total: number;
};

type AnalyticsHistoryEntry = {
  scenarioId: string;
  decisionId: string;
  decidedAt: string;
  scenarioTitle: string;
  decisionText: string;
  effects: Record<string, number>;
  source: 'scenario' | 'exam';
};

type SeniorArchetype = {
  id: 'optimizer' | 'firefighter' | 'diplomat' | 'pragmatist';
  title: string;
  description: string;
};

type ChartPoint = {
  x: number;
  y: number;
};

type TensionChart = {
  points: string;
  areaPoints: string;
  latest: number;
  peak: number;
  min: number;
  max: number;
  metricLabel: string;
  latestPoint: ChartPoint;
  peakPoint: ChartPoint;
};

@Component({
  selector: 'app-analytics-page',
  imports: [CardComponent, ButtonComponent, EmptyStateComponent],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {
  private readonly store = inject(AppStore);
  private readonly achievementsStore = inject(AchievementsStore);
  protected readonly isDevMode = isDevMode();
  protected readonly scenariosCount = this.store.scenariosCount;
  protected readonly history = computed<AnalyticsHistoryEntry[]>(() => {
    const decisionHistory = this.store.decisionHistoryDetailed();
    const examHistory = this.store.examHistory();
    const examsById = this.store.examsById();
    const scenarioEntries = decisionHistory.map((entry) => ({
      ...entry,
      source: 'scenario' as const,
    }));
    const examEntries = examHistory.map((attempt) => {
      const exam = examsById[attempt.examId];
      const decidedAt = attempt.finishedAt ?? attempt.startedAt;
      const decisionText =
        attempt.passed === undefined
          ? 'Экзамен завершён'
          : attempt.passed
            ? 'Экзамен сдан'
            : 'Экзамен провален';
      return {
        scenarioId: `exam:${attempt.examId}`,
        decisionId: attempt.attemptId,
        decidedAt,
        scenarioTitle: exam?.title ?? 'Экзамен',
        decisionText,
        effects: {},
        source: 'exam' as const,
      };
    });
    return [...scenarioEntries, ...examEntries].sort(
      (a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime(),
    );
  });
  protected readonly decisionCount = computed(() => this.history().length);
  protected readonly careerStage = this.store.careerStage;
  protected readonly stageLabel = this.store.stageLabel;
  protected readonly isSenior = computed(() => this.careerStage() === 'senior');
  protected readonly recentHistory = computed(() => {
    const history = this.history();
    const skillMap = new Map(this.store.skills().map((skill) => [skill.id, skill.name]));
    return history
      .slice(-5)
      .reverse()
      .map((entry) => {
        const isExam = entry.source === 'exam';
        return {
          key: `${entry.decidedAt}-${entry.decisionId}`,
          ...entry,
          formattedDate: new Date(entry.decidedAt).toLocaleString(),
          effectsText: this.formatEffects(entry.effects, skillMap),
          sourceLabel: isExam ? 'Экзамен' : null,
        };
      });
  });
  protected readonly completedScenarios = this.store.completedScenarioCount;
  protected readonly topSkills = this.store.topSkillsByLevel;
  protected readonly maxedCoreSkills = computed(() => {
    const profession = this.store.professionId();
    const mapping = PROFESSION_STAGE_SKILLS[profession as ProfessionId];
    if (!mapping) {
      return [];
    }

    const coreIds = new Set([
      ...mapping.internship,
      ...mapping.junior,
      ...mapping.middle,
      ...mapping.senior,
    ]);
    const skillsById = new Map(this.store.skills().map((skill) => [skill.id, skill]));

    return this.achievementsStore
      .skillMasteries()
      .filter((entry) => entry.profession === profession && coreIds.has(entry.skillId))
      .map((entry) => {
        const skill = skillsById.get(entry.skillId);
        return {
          id: entry.skillId,
          name: entry.skillName,
          category: skill?.category ?? 'General',
          maxLevel: skill?.maxLevel ?? 5,
        };
      });
  });
  protected readonly decisionStats = computed<DecisionStats>(() => {
    const history = this.history();
    let debtUp = 0;
    let debtDown = 0;
    let repUp = 0;
    let repDown = 0;
    let coinUp = 0;
    let coinDown = 0;

    history.forEach((entry) => {
      const debt = entry.effects['techDebt'] ?? 0;
      if (debt > 0) {
        debtUp += 1;
      } else if (debt < 0) {
        debtDown += 1;
      }

      const rep = entry.effects['reputation'] ?? 0;
      if (rep > 0) {
        repUp += 1;
      } else if (rep < 0) {
        repDown += 1;
      }

      const coins = entry.effects['coins'] ?? 0;
      if (coins > 0) {
        coinUp += 1;
      } else if (coins < 0) {
        coinDown += 1;
      }
    });

    return {
      debtUp,
      debtDown,
      repUp,
      repDown,
      coinUp,
      coinDown,
      netDebt: this.store.techDebt(),
      netRep: this.store.reputation(),
      netCoins: this.store.coins(),
      total: history.length,
    };
  });
  protected readonly tensionChart = computed<TensionChart>(() => {
    const history = this.history();
    const hasTechDebt = history.some((entry) => typeof entry.effects['techDebt'] === 'number');
    const metricLabel = hasTechDebt ? 'техдолг' : 'репутация';

    let current = 0;
    const values = history.map((entry) => {
      const raw = hasTechDebt
        ? (entry.effects['techDebt'] ?? 0)
        : (entry.effects['reputation'] ?? 0);
      const delta = hasTechDebt ? raw : -raw;
      current += delta;
      return current;
    });

    if (values.length === 0) {
      return {
        points: '',
        areaPoints: '',
        latest: 0,
        peak: 0,
        min: 0,
        max: 0,
        metricLabel,
        latestPoint: { x: 0, y: 0 },
        peakPoint: { x: 0, y: 0 },
      };
    }

    const width = 120;
    const height = 44;
    const series = [0, ...values];
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = Math.max(1, max - min);
    const lastIndex = series.length - 1;
    const toPoint = (value: number, index: number): ChartPoint => {
      const x = (index / lastIndex) * width;
      const y = height - ((value - min) / range) * height;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    };
    const pointList = series.map((value, index) => {
      const point = toPoint(value, index);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    });
    const points = pointList.join(' ');
    const areaPoints = `${points} ${width},${height} 0,${height}`;
    const latestPoint = toPoint(series[lastIndex], lastIndex);
    const peak = Math.max(...series);
    const peakIndex = series.lastIndexOf(peak);
    const peakPoint = toPoint(peak, peakIndex);

    return {
      points,
      areaPoints,
      latest: series[series.length - 1],
      peak,
      min,
      max,
      metricLabel,
      latestPoint,
      peakPoint,
    };
  });
  protected readonly seniorSummary = computed(() => {
    if (this.careerStage() !== 'senior') {
      return null;
    }
    const stats = this.decisionStats();
    return {
      archetype: this.selectSeniorArchetype(stats),
      decisions: stats.total,
      netDebt: stats.netDebt,
      netRep: stats.netRep,
    };
  });
  protected readonly seniorStrengths = computed(() => {
    if (this.careerStage() !== 'senior') {
      return [];
    }
    const skills = this.topSkills();
    if (skills.length === 0) {
      return ['Сильные стороны ещё не определены'];
    }
    return skills.map((skill) => skill.name);
  });
  protected readonly seniorRisks = computed(() => {
    if (this.careerStage() !== 'senior') {
      return [];
    }
    const stats = this.decisionStats();
    const risks: string[] = [];
    if (stats.netDebt >= 3) {
      risks.push('Высокий техдолг: часто выбирались быстрые решения');
    }
    if (stats.netRep <= -2) {
      risks.push('Просела репутация: конфликтные решения');
    }
    if (stats.total < 4) {
      risks.push('Мало решений: не хватило практики');
    }
    if (risks.length === 0) {
      risks.push('Риски не выявлены');
    }
    return risks.slice(0, 3);
  });
  protected readonly skillsError = this.store.skillsError;
  protected readonly scenariosError = this.store.scenariosError;
  protected readonly canUndoDecision = this.store.canUndoDecision;

  protected logDecision(): void {
    const scenario = this.store.scenarios()[0];
    const decision = scenario?.decisions[0];
    if (!scenario || !decision) {
      return;
    }
    this.store.recordDecision(scenario.id, decision.id);
  }

  protected clearHistory(): void {
    if (confirm('Clear decision history?')) {
      this.store.clearDecisionHistory();
    }
  }

  protected undoLastDecision(): void {
    if (this.store.canUndoDecision()) {
      this.store.undoLastDecision();
    }
  }

  private selectSeniorArchetype(stats: DecisionStats): SeniorArchetype {
    const debtBias = stats.debtUp - stats.debtDown;
    const repBias = stats.repUp - stats.repDown;

    if (stats.netDebt <= 1 && debtBias <= -2) {
      return {
        id: 'optimizer',
        title: 'Системный оптимизатор',
        description: 'Стабилизируешь платформу и держишь техдолг под контролем.',
      };
    }
    if (stats.netDebt >= 4 || debtBias >= 2) {
      return {
        id: 'firefighter',
        title: 'Пожарный-спасатель',
        description: 'Берёшься за срочные задачи, но это увеличивает техдолг.',
      };
    }
    if (stats.netRep >= 4 || repBias >= 2) {
      return {
        id: 'diplomat',
        title: 'Дипломат',
        description: 'Выбираешь решения, которые укрепляют доверие и коммуникацию.',
      };
    }
    return {
      id: 'pragmatist',
      title: 'Прагматик',
      description: 'Держишь баланс между скоростью, качеством и отношениями.',
    };
  }

  private formatEffects(effects: Record<string, number>, skillMap: Map<string, string>): string {
    const entries = Object.entries(effects);
    if (entries.length === 0) {
      return 'Без эффектов';
    }
    return entries
      .map(([key, delta]) => {
        const label = this.formatEffectLabel(key, skillMap);
        return `${label} ${delta >= 0 ? '+' : ''}${delta}`;
      })
      .join(', ');
  }

  private formatEffectLabel(key: string, skillMap: Map<string, string>): string {
    if (key === 'reputation') {
      return '\u0420\u0435\u043f\u0443\u0442\u0430\u0446\u0438\u044f';
    }
    if (key === 'techDebt') {
      return '\u0422\u0435\u0445\u0434\u043e\u043b\u0433';
    }
    if (key === 'coins') {
      return 'Coins';
    }
    return skillMap.get(key) ?? key;
  }
}
