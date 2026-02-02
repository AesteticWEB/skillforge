import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-skills-page',
  templateUrl: './skills.page.html',
  styleUrl: './skills.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsPage {}
