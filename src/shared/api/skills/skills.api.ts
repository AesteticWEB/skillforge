import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Skill } from '../../../entities/skill/model/skill.model';
import { SKILLS_MOCK } from './skills.mock';

@Injectable({ providedIn: 'root' })
export class SkillsApi {
  getSkills(): Observable<Skill[]> {
    return of(SKILLS_MOCK);
  }
}
