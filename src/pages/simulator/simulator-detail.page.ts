import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppStore } from '../../app/store/app.store';
import { Scenario } from '../../entities/scenario/model/scenario.model';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-simulator-detail-page',
  imports: [CardComponent, ButtonComponent, RouterLink],
  templateUrl: './simulator-detail.page.html',
  styleUrl: './simulator-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatorDetailPage {
  private readonly store = inject(AppStore);
  private readonly route = inject(ActivatedRoute);

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
  protected readonly decisionCards = computed(() => {
    const current = this.scenario();
    if (!current) {
      return [];
    }

    return current.decisions.map((decision) => ({
      ...decision,
      effectsText: this.formatEffects(decision.effects),
    }));
  });

  protected chooseDecision(decisionId: string): void {
    const current = this.scenario();
    if (!current) {
      return;
    }
    this.store.applyDecision(current.id, decisionId);
  }

  private formatEffects(effects: Record<string, number>): string {
    const entries = Object.entries(effects);
    if (entries.length === 0) {
      return 'No effects';
    }
    return entries
      .map(([key, delta]) => `${key} ${delta >= 0 ? '+' : ''}${delta}`)
      .join(', ');
  }
}
