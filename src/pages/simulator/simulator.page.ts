import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { InputComponent } from '@/shared/ui/input';
import { SkeletonComponent } from '@/shared/ui/skeleton';

@Component({
  selector: 'app-simulator-page',
  imports: [CardComponent, InputComponent, EmptyStateComponent, SkeletonComponent, RouterLink],
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
}
