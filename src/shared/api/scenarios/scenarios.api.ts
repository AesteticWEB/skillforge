import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Scenario } from '@/entities/scenario';
import { SCENARIOS_MOCK } from './scenarios.mock';

@Injectable({ providedIn: 'root' })
export class ScenariosApi {
  getScenarios(): Observable<Scenario[]> {
    if (this.shouldFail()) {
      return throwError(() => new Error('Mock scenarios API failed'));
    }
    return of(SCENARIOS_MOCK);
  }

  private shouldFail(): boolean {
    return (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('skillforge.failScenarios') === 'true'
    );
  }
}
