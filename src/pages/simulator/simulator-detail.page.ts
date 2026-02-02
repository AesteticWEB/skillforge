import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { Scenario } from '@/entities/scenario';
import { NotificationsStore } from '@/features/notifications';
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
  private readonly notifications = inject(NotificationsStore);
  private readonly lastEffects = signal<Record<string, number> | null>(null);
  private highlightTimer: number | null = null;

  protected readonly scenario = computed<Scenario | null>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return null;
    }
    return this.store.scenarios().find((item) => item.id === id) ?? null;
  });

  protected readonly reputation = this.store.reputation;
  protected readonly techDebt = this.store.techDebt;
  protected readonly decisionCount = this.store.decisionCount;
  protected readonly scenariosError = this.store.scenariosError;
  protected readonly skills = this.store.skills;
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
  protected readonly decisionCards = computed(() => {
    const current = this.scenario();
    if (!current) {
      return [];
    }

    const skillMap = new Map(this.skills().map((skill) => [skill.id, skill.name]));

    return current.decisions.map((decision) => ({
      ...decision,
      effects: this.formatEffects(decision.effects, skillMap),
    }));
  });

  protected chooseDecision(decisionId: string): void {
    const current = this.scenario();
    if (!current || this.isLocked()) {
      return;
    }
    const decision = current.decisions.find((item) => item.id === decisionId);
    if (!decision) {
      return;
    }

    this.store.applyDecision(current.id, decisionId);
    this.showDecisionToast(decision.effects);
    this.highlightEffects(decision.effects);
  }

  protected metricClass(metric: 'reputation' | 'techDebt'): string {
    const delta = this.metricDelta(metric);
    if (delta === 0) {
      return '';
    }
    return delta > 0
      ? 'text-emerald-300 scale-[1.03] transition-transform'
      : 'text-rose-300 scale-[1.03] transition-transform';
  }

  private metricDelta(metric: 'reputation' | 'techDebt'): number {
    const effects = this.lastEffects();
    if (!effects) {
      return 0;
    }
    const value = effects[metric];
    return typeof value === 'number' ? value : 0;
  }

  private highlightEffects(effects: Record<string, number>): void {
    this.lastEffects.set(effects);
    if (this.highlightTimer !== null) {
      window.clearTimeout(this.highlightTimer);
    }
    this.highlightTimer = window.setTimeout(() => this.lastEffects.set(null), 1200);
  }

  private showDecisionToast(effects: Record<string, number>): void {
    const skillMap = new Map(this.skills().map((skill) => [skill.id, skill.name]));
    const parts = this.formatEffectParts(effects, skillMap);
    if (parts.length === 0) {
      return;
    }
    this.notifications.notify(`Эффект: ${parts.join(', ')}`, 'info');
  }

  private formatEffectParts(
    effects: Record<string, number>,
    skillMap: Map<string, string>,
  ): string[] {
    return Object.entries(effects).map(([key, delta]) => {
      const label = this.formatEffectLabel(key, skillMap);
      const sign = delta >= 0 ? '+' : '';
      return `${sign}${delta} ${label}`;
    });
  }

  private formatEffects(
    effects: Record<string, number>,
    skillMap: Map<string, string>,
  ): Array<{ label: string; delta: number }> {
    const entries = Object.entries(effects);
    if (entries.length === 0) {
      return [];
    }
    return entries.map(([key, delta]) => ({
      label: this.formatEffectLabel(key, skillMap),
      delta,
    }));
  }

  private formatEffectLabel(key: string, skillMap: Map<string, string>): string {
    if (key === 'reputation') {
      return 'Репутация';
    }
    if (key === 'techDebt') {
      return 'Техдолг';
    }
    return skillMap.get(key) ?? key;
  }
}
