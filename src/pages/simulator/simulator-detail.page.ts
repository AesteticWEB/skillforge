import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { calcScenarioReward, calcScenarioXp } from '@/entities/rewards';
import { Scenario } from '@/entities/scenario';
import { NotificationsStore } from '@/features/notifications';
import { BALANCE } from '@/shared/config';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { ModalComponent } from '@/shared/ui/modal';

@Component({
  selector: 'app-simulator-detail-page',
  imports: [CardComponent, ButtonComponent, RouterLink, NgClass, ModalComponent],
  templateUrl: './simulator-detail.page.html',
  styleUrl: './simulator-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatorDetailPage {
  private readonly store = inject(AppStore);
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errorMessage = signal<string | null>(null);
  private readonly wrongOptionId = signal<string | null>(null);
  private readonly rewardModalOpen = signal(false);
  private readonly rewardBreakdown = signal<RewardBreakdown | null>(null);

  protected readonly scenario = computed<Scenario | null>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return null;
    }
    return this.store.scenarios().find((item) => item.id === id) ?? null;
  });

  protected readonly reputation = this.store.reputation;
  protected readonly techDebt = this.store.techDebt;
  protected readonly coins = this.store.coins;
  protected readonly decisionCount = this.store.decisionCount;
  protected readonly scenariosError = this.store.scenariosError;
  protected readonly scenarioAccess = computed(() => {
    const current = this.scenario();
    if (!current) {
      return null;
    }
    return this.store.getScenarioAccess(current.id);
  });
  protected readonly isLocked = computed(() => {
    const access = this.scenarioAccess();
    return access ? !access.available : false;
  });
  protected readonly lockReasons = computed(() => this.scenarioAccess()?.reasons ?? []);
  protected readonly decisionCards = computed(() => this.scenario()?.decisions ?? []);
  protected readonly rewardXp = computed(() =>
    calcScenarioXp({ baseXp: BALANCE.rewards.scenarioXp, buffs: this.store.totalBuffs() }),
  );
  protected readonly errorText = this.errorMessage.asReadonly();
  protected readonly wrongOption = this.wrongOptionId.asReadonly();
  protected readonly isRewardModalOpen = this.rewardModalOpen.asReadonly();
  protected readonly rewardData = this.rewardBreakdown.asReadonly();

  protected chooseDecision(decisionId: string): void {
    const current = this.scenario();
    if (!current || this.isLocked()) {
      return;
    }
    const decision = current.decisions.find((item) => item.id === decisionId);
    if (!decision) {
      return;
    }

    const isCorrect = current.correctOptionIds.includes(decisionId);
    if (!isCorrect) {
      this.errorMessage.set('Неверно, попробуй ещё раз');
      this.wrongOptionId.set(decisionId);
      return;
    }

    this.errorMessage.set(null);
    this.wrongOptionId.set(null);
    this.store.applyDecision(current.id, decisionId);
    const breakdown = this.buildScenarioRewardBreakdown(current, decision);
    this.openRewardModal(breakdown);
  }

  protected closeRewardModal(): void {
    if (!this.rewardModalOpen()) {
      return;
    }
    this.rewardModalOpen.set(false);
    this.rewardBreakdown.set(null);
    this.router.navigate(['/simulator']);
  }

  private openRewardModal(breakdown: RewardBreakdown): void {
    if (typeof document === 'undefined') {
      this.notificationsStore.success(breakdown.toastMessage);
      this.router.navigate(['/simulator']);
      return;
    }

    this.rewardBreakdown.set(breakdown);
    this.rewardModalOpen.set(true);
  }

  private buildScenarioRewardBreakdown(
    current: Scenario,
    decision: Scenario['decisions'][number],
  ): RewardBreakdown {
    const progress = this.store.progress();
    const rewards = BALANCE.rewards;
    const reputation = Number.isFinite(progress.reputation) ? progress.reputation : 0;
    const techDebt = Number.isFinite(progress.techDebt) ? progress.techDebt : 0;
    const baseCoins = rewards.scenarioCoins;
    const buffs = this.store.totalBuffs();
    const rewardCoins = calcScenarioReward({
      reputation,
      techDebt,
      baseCoins,
      buffs,
    });
    const rewardXp = calcScenarioXp({ baseXp: rewards.scenarioXp, buffs });

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
    const buffMultiplier = 1 + buffs.coinMultiplier;

    const reputationDelta = decision.effects['reputation'] ?? 0;
    const techDebtDelta = decision.effects['techDebt'] ?? 0;
    const adjustedReputationDelta =
      reputationDelta > 0 ? reputationDelta + buffs.repBonusFlat : reputationDelta;
    const adjustedTechDebtDelta =
      techDebtDelta > 0 ? Math.max(0, techDebtDelta - buffs.techDebtReduceFlat) : techDebtDelta;
    const coinsDelta = decision.effects['coins'] ?? 0;

    const totals: RewardBreakdownLine[] = [
      { label: 'XP', value: `+${rewardXp}`, tone: 'positive' },
      { label: 'Coins', value: `+${rewardCoins}`, tone: 'positive' },
      { label: 'Репутация', value: this.formatDelta(adjustedReputationDelta) },
      { label: 'Техдолг', value: this.formatDelta(adjustedTechDebtDelta) },
    ];

    if (coinsDelta !== 0) {
      totals.push({
        label: 'Coins (эффект решения)',
        value: this.formatDelta(coinsDelta),
      });
    }

    const calculation: RewardBreakdownLine[] = [
      {
        label: 'База',
        value: `${baseCoins} coins`,
        hint: 'Базовая награда сценария.',
      },
      {
        label: 'Репутация',
        value: `x${repMultiplier.toFixed(2)}`,
        hint: `Репутация: ${reputation}`,
        tone: repMultiplier >= 1 ? 'positive' : 'negative',
      },
      {
        label: 'Техдолг',
        value: `x${debtMultiplier.toFixed(2)}`,
        hint: `Техдолг: ${techDebt}`,
        tone: debtMultiplier >= 1 ? 'positive' : 'negative',
      },
      {
        label: 'Баффы',
        value: `x${buffMultiplier.toFixed(2)}`,
        hint: buffMultiplier > 1 ? 'Бонусы от перков и предметов.' : 'Нет активных баффов.',
      },
      {
        label: 'Итог',
        value: `${rewardCoins} coins`,
        hint: `Минимум ${rewards.minCoins} coin.`,
      },
    ];

    const toastMessage = `Награды: +${rewardXp} XP, +${rewardCoins} coins.`;

    return {
      title: 'Награды за сценарий',
      subtitle: current.title,
      totals,
      calculation,
      toastMessage,
    };
  }

  private formatDelta(value: number): string {
    if (value > 0) {
      return `+${value}`;
    }
    if (value < 0) {
      return `${value}`;
    }
    return '0';
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}

type RewardBreakdownTone = 'positive' | 'negative' | 'neutral';

type RewardBreakdownLine = {
  label: string;
  value: string;
  hint?: string;
  tone?: RewardBreakdownTone;
};

type RewardBreakdown = {
  title: string;
  subtitle: string;
  totals: RewardBreakdownLine[];
  calculation: RewardBreakdownLine[];
  toastMessage: string;
};
