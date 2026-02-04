import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import type {
  FinaleChoiceId,
  FinaleHistoryEntry,
  FinaleState,
  FinaleStep,
} from '@/entities/finale';
import { FINALE_ENDINGS, FINALE_STEP_IDS, resolveFinaleStep } from '@/entities/finale';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { InputComponent } from '@/shared/ui/input';
import { SkeletonComponent } from '@/shared/ui/skeleton';

@Component({
  selector: 'app-simulator-page',
  imports: [
    CardComponent,
    InputComponent,
    EmptyStateComponent,
    SkeletonComponent,
    RouterLink,
    ButtonComponent,
  ],
  templateUrl: './simulator.page.html',
  styleUrl: './simulator.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatorPage {
  private readonly store = inject(AppStore);
  protected readonly scenariosError = this.store.scenariosError;
  protected readonly scenariosLoading = this.store.scenariosLoading;
  protected readonly search = signal('');
  protected readonly hasSearch = computed(() => this.search().trim().length > 0);
  protected readonly simulatorV2 = computed(() => this.store.featureFlags().simulatorV2);
  protected readonly totalXp = this.store.xp;
  protected readonly availableXp = this.store.availableXpForSkills;
  protected readonly stageLabel = this.store.stageLabel;
  protected readonly stageScenarioProgress = this.store.stageScenarioProgress;
  protected readonly company = this.store.company;
  protected readonly finale = this.store.finale;
  protected readonly finaleUnlocked = computed(() => this.finale().unlocked);
  protected readonly finaleActive = computed(() => this.finale().active);
  protected readonly finaleFinished = computed(() => this.finale().finished);
  protected readonly finaleStep = computed(() => {
    const finale = this.finale();
    if (!finale.active || finale.finished) {
      return null;
    }
    return resolveFinaleStep(finale.chainId, finale.currentStepId, finale.branchFlags);
  });
  protected readonly finaleStepIndex = computed(() => {
    const completed = this.finale().completedStepIds.length;
    return Math.min(FINALE_STEP_IDS.length, Math.max(1, completed + 1));
  });
  protected readonly finaleStepTotal = FINALE_STEP_IDS.length;
  protected readonly finaleWarning = computed(
    () => this.finale().active && this.company().level !== 'cto',
  );
  protected readonly finaleSummary = computed(() => this.buildFinaleSummary(this.finale()));
  protected readonly finaleEnding = computed(() => this.resolveFinaleEnding(this.finale()));
  protected readonly stageScenarioRemaining = computed(() => {
    const progress = this.stageScenarioProgress();
    return Math.max(0, progress.total - progress.completed);
  });

  protected readonly filteredScenarios = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.store.scenarioAccessList();
    }
    return this.store.scenarioAccessList().filter((entry) => {
      const title = entry.scenario.title.toLowerCase();
      if (title.includes(term)) {
        return true;
      }
      if (!this.simulatorV2()) {
        return false;
      }
      return entry.scenario.description.toLowerCase().includes(term);
    });
  });

  protected startFinale(): void {
    this.store.startFinaleChain();
  }

  protected chooseFinaleChoice(choiceId: FinaleChoiceId): void {
    this.store.chooseFinaleOption(choiceId);
  }

  protected formatFinaleNarrative(step: FinaleStep | null): string {
    return step?.narrative ?? '';
  }

  protected formatFinaleEndingTitle(): string {
    return this.finaleEnding()?.title ?? 'Финал завершён';
  }

  protected formatFinaleEndingSummary(): string {
    return this.finaleEnding()?.summary ?? 'Итоги совета директоров зафиксированы.';
  }

  private resolveFinaleEnding(finale: FinaleState): { title: string; summary: string } | null {
    if (!finale.finished || !finale.endingId) {
      return null;
    }
    return FINALE_ENDINGS[finale.endingId] ?? null;
  }

  private buildFinaleSummary(finale: FinaleState): string[] {
    if (!finale.history.length) {
      return [];
    }
    return finale.history.map((entry) => this.resolveFinaleHistoryLabel(entry, finale));
  }

  private resolveFinaleHistoryLabel(entry: FinaleHistoryEntry, finale: FinaleState): string {
    const step = resolveFinaleStep(finale.chainId, entry.stepId, finale.branchFlags);
    const choice = step?.choices.find((item) => item.id === entry.choiceId);
    const stepTitle = step?.title ?? entry.stepId;
    const choiceTitle = choice?.title ?? entry.choiceId;
    return `${stepTitle}: ${choiceTitle}`;
  }
}
