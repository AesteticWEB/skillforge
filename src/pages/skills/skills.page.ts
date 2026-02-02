import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardComponent } from '../../shared/ui/card/card.component';
import { InputComponent } from '../../shared/ui/input/input.component';
import { SkillsApi } from '../../shared/api/skills/skills.api';

@Component({
  selector: 'app-skills-page',
  imports: [CardComponent, InputComponent, AsyncPipe],
  templateUrl: './skills.page.html',
  styleUrl: './skills.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsPage {
  private readonly skillsApi = inject(SkillsApi);
  protected readonly skills$ = this.skillsApi.getSkills();
}
