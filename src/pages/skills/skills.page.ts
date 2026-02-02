import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppStore } from '../../app/store/app.store';
import { CardComponent } from '../../shared/ui/card/card.component';
import { InputComponent } from '../../shared/ui/input/input.component';

@Component({
  selector: 'app-skills-page',
  imports: [CardComponent, InputComponent],
  templateUrl: './skills.page.html',
  styleUrl: './skills.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsPage {
  private readonly store = inject(AppStore);
  protected readonly skillsCount = this.store.skillsCount;
}
