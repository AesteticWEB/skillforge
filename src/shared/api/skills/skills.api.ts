import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Skill } from '../../../entities/skill/model/skill.model';
import { SKILLS_MOCK } from './skills.mock';

@Injectable({ providedIn: 'root' })
export class SkillsApi {
  getSkills(): Observable<Skill[]> {
    if (this.shouldFail()) {
      return throwError(() => new Error('Mock skills API failed'));
    }
    return of(SKILLS_MOCK);
  }

  private shouldFail(): boolean {
    return (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('skillforge.failSkills') === 'true'
    );
  }
}
