import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Scenario } from '@/entities/scenario';
import { ContentApi } from '@/shared/api/content/content.api';

@Injectable({ providedIn: 'root' })
export class ScenariosApi {
  private readonly contentApi = inject(ContentApi);

  getScenarios(): Observable<Scenario[]> {
    return this.contentApi.getScenarios();
  }
}
