import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { Scenario } from '@/entities/scenario';
import { BALANCE } from '@/shared/config';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';

@Component({
  selector: 'app-simulator-detail-page',
  imports: [CardComponent, ButtonComponent, RouterLink, NgClass],
  templateUrl: './simulator-detail.page.html',
  styleUrl: './simulator-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatorDetailPage {
  private readonly store = inject(AppStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errorMessage = signal<string | null>(null);
  private readonly wrongOptionId = signal<string | null>(null);

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
  protected readonly rewardXp = computed(() => BALANCE.rewards.scenarioXp);
  protected readonly errorText = this.errorMessage.asReadonly();
  protected readonly wrongOption = this.wrongOptionId.asReadonly();

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
      this.errorMessage.set('РќРµРІРµСЂРЅРѕ, РїРѕРїСЂРѕР±СѓР№ РµС‰С‘ СЂР°Р·');
      this.wrongOptionId.set(decisionId);
      return;
    }

    this.errorMessage.set(null);
    this.wrongOptionId.set(null);
    this.store.applyDecision(current.id, decisionId);
    this.router.navigate(['/simulator']);
  }
}
