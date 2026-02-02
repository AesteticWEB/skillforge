import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { CardComponent } from '@/shared/ui/card';
import { InputComponent } from '@/shared/ui/input';

@Component({
  selector: 'app-simulator-page',
  imports: [CardComponent, InputComponent, RouterLink],
  templateUrl: './simulator.page.html',
  styleUrl: './simulator.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatorPage {
  private readonly store = inject(AppStore);
  protected readonly scenariosError = this.store.scenariosError;
  protected readonly search = signal('');
  protected readonly hasSearch = computed(() => this.search().trim().length > 0);

  protected readonly filteredScenarios = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.store.scenarioAccessList();
    }
    return this.store
      .scenarioAccessList()
      .filter((entry) => entry.scenario.title.toLowerCase().includes(term));
  });
}
