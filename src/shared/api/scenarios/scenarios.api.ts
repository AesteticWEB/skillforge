import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Scenario } from '../../../entities/scenario/model/scenario.model';
import { SCENARIOS_MOCK } from './scenarios.mock';

@Injectable({ providedIn: 'root' })
export class ScenariosApi {
  getScenarios(): Observable<Scenario[]> {
    return of(SCENARIOS_MOCK);
  }
}
