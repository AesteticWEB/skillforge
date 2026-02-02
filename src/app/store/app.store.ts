import { Injectable, computed, inject, signal } from '@angular/core';
import { Scenario } from '../../entities/scenario/model/scenario.model';
import { Skill } from '../../entities/skill/model/skill.model';
import { User } from '../../entities/user/model/user.model';
import { ScenariosApi } from '../../shared/api/scenarios/scenarios.api';
import { SkillsApi } from '../../shared/api/skills/skills.api';

@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly skillsApi = inject(SkillsApi);
  private readonly scenariosApi = inject(ScenariosApi);

  private readonly _user = signal<User>({
    role: 'Frontend Engineer',
    goals: ['Architecture', 'Execution'],
    startDate: '2026-02-02',
  });
  private readonly _skills = signal<Skill[]>([]);
  private readonly _scenarios = signal<Scenario[]>([]);

  readonly user = this._user.asReadonly();
  readonly skills = this._skills.asReadonly();
  readonly scenarios = this._scenarios.asReadonly();

  readonly skillsCount = computed(() => this._skills().length);
  readonly scenariosCount = computed(() => this._scenarios().length);

  constructor() {
    this.load();
  }

  load(): void {
    this.skillsApi.getSkills().subscribe((skills) => this._skills.set(skills));
    this.scenariosApi.getScenarios().subscribe((scenarios) => this._scenarios.set(scenarios));
  }

  setUser(user: User): void {
    this._user.set(user);
  }
}
