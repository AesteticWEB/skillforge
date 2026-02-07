import type { CompanyTickReason } from '@/entities/company';
import type { ContractProgressEvent } from '@/entities/contracts';
import type { IncidentTemplate } from '@/entities/incidents';
import type { Progress } from '@/entities/progress';
import type { Scenario } from '@/entities/scenario';
import type { Skill } from '@/entities/skill';
import type { FeatureFlagKey, ShopItem } from '@/shared/config';
import type {
  ContentApi,
  ExamContent,
  ExamQuestionEntry,
  QuickFixContent,
} from '@/shared/api/content/content.api';
import type { ScenariosApi } from '@/shared/api/scenarios/scenarios.api';
import type { SkillsApi } from '@/shared/api/skills/skills.api';
import type { DomainEventBus } from '@/shared/lib/events';
import { migratePersistedState } from '@/shared/persist/schema';
import type { PersistedStateLatest } from '@/shared/persist/schema';
import type { AuthResult, AuthState, ImportResult } from './app.store.state';

type PersistApplyOptions = { allowLegacy?: boolean };

export type AppStoreEffectsDeps = {
  skillsApi: SkillsApi;
  scenariosApi: ScenariosApi;
  contentApi: ContentApi;
  eventBus: DomainEventBus;
};

export type AppStoreEffectsContext = {
  getAuth: () => AuthState;
  setAuth: (auth: AuthState) => void;
  getProgress: () => Progress;
  updateProgress: (updater: (current: Progress) => Progress) => void;
  setSkills: (skills: Skill[]) => void;
  setScenarios: (scenarios: Scenario[]) => void;
  setShopItems: (items: ShopItem[]) => void;
  setExamDefinitions: (items: ExamContent[]) => void;
  setExamQuestions: (items: ExamQuestionEntry[]) => void;
  setIncidentTemplates: (items: IncidentTemplate[]) => void;
  setQuickFixes: (items: QuickFixContent[]) => void;
  setSkillsLoading: (value: boolean) => void;
  setScenariosLoading: (value: boolean) => void;
  setSkillsError: (value: string | null) => void;
  setScenariosError: (value: string | null) => void;
  mergeSkillLevels: (
    skills: Skill[],
    persisted: Record<string, number>,
    useSkillDefaults: boolean,
  ) => Record<string, number>;
  registerLocal: (login: string, password: string, profession: string) => boolean;
  setFeatureFlag: (key: FeatureFlagKey, value: boolean) => void;
  ensureSessionQuests: (force?: boolean) => void;
  updateDailyStreak: () => void;
  applyEventToContracts: (event: ContractProgressEvent) => void;
  applyEventToSessionQuests: (event: ContractProgressEvent) => void;
  applyCompanyTick: (reason: CompanyTickReason) => void;
  updateDifficultyAfterExam: (result: 'pass' | 'fail') => void;
  logDevError: (message: string, payload: unknown) => void;
  captureError: (error: unknown, context: string) => void;
  hydrateFromStorage: () => void;
  syncBackupAvailability: () => void;
  buildPersistPayload: () => PersistedStateLatest;
  buildEmptyPersistPayload: () => PersistedStateLatest;
  applyPersistedState: (state: PersistedStateLatest, options?: PersistApplyOptions) => ImportResult;
  persistToStorage: (payload: PersistedStateLatest) => void;
  getRemoteProgressEnabled: () => boolean;
  setRemoteProgressEnabled: (value: boolean) => void;
  getRemoteSaveTimer: () => number | null;
  setRemoteSaveTimer: (value: number | null) => void;
  getRemotePendingPayload: () => PersistedStateLatest | null;
  setRemotePendingPayload: (payload: PersistedStateLatest | null) => void;
  getRemoteLastSerialized: () => string | null;
  setRemoteLastSerialized: (value: string | null) => void;
  getRemoteSaveInFlight: () => boolean;
  setRemoteSaveInFlight: (value: boolean) => void;
};

export class AppStoreEffects {
  constructor(
    private readonly deps: AppStoreEffectsDeps,
    private readonly ctx: AppStoreEffectsContext,
  ) {}

  init(): void {
    this.ctx.hydrateFromStorage();
    this.ctx.syncBackupAvailability();
    this.load();
    this.ctx.ensureSessionQuests();
    void this.hydrateFromRemote();

    this.deps.eventBus.subscribe('ScenarioCompleted', (event) => {
      this.ctx.updateDailyStreak();
      const progressEvent: ContractProgressEvent = {
        type: 'ScenarioCompleted',
        scenarioId: event.payload.scenarioId,
      };
      this.ctx.applyEventToContracts(progressEvent);
      this.ctx.applyEventToSessionQuests(progressEvent);
      this.ctx.applyCompanyTick('scenario');
    });
    this.deps.eventBus.subscribe('PurchaseMade', (event) => {
      const progressEvent: ContractProgressEvent = {
        type: 'PurchaseMade',
        itemId: event.payload.itemId,
        currency: event.payload.currency,
      };
      this.ctx.applyEventToContracts(progressEvent);
      this.ctx.applyEventToSessionQuests(progressEvent);
    });
    this.deps.eventBus.subscribe('ExamPassed', (event) => {
      this.ctx.updateDailyStreak();
      const progressEvent: ContractProgressEvent = {
        type: 'ExamPassed',
        examId: event.payload.examId,
        stage: event.payload.stage,
      };
      this.ctx.applyEventToContracts(progressEvent);
      this.ctx.applyEventToSessionQuests(progressEvent);
      this.ctx.applyCompanyTick('exam');
      this.ctx.updateDifficultyAfterExam('pass');
    });
    this.deps.eventBus.subscribe('ExamFailed', () => {
      this.ctx.updateDifficultyAfterExam('fail');
    });
  }

  load(): void {
    this.ctx.setSkillsError(null);
    this.ctx.setScenariosError(null);
    this.ctx.setSkillsLoading(true);
    this.ctx.setScenariosLoading(true);

    this.deps.skillsApi.getSkills().subscribe({
      next: (skills) => {
        const mergedLevels = this.ctx.mergeSkillLevels(
          skills,
          this.ctx.getProgress().skillLevels,
          !this.ctx.getAuth().isRegistered,
        );
        const hydratedSkills = skills.map((skill) => ({
          ...skill,
          level: mergedLevels[skill.id],
        }));

        this.ctx.setSkills(hydratedSkills);
        this.ctx.updateProgress((progress) => ({
          ...progress,
          skillLevels: mergedLevels,
        }));
        this.ctx.setSkillsLoading(false);
      },
      error: () => {
        this.ctx.setSkillsError(
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043d\u0430\u0432\u044b\u043a\u0438.',
        );
        this.ctx.setSkills([]);
        this.ctx.setSkillsLoading(false);
      },
    });

    this.deps.scenariosApi.getScenarios().subscribe({
      next: (scenarios) => {
        this.ctx.setScenarios(scenarios);
        this.ctx.setScenariosLoading(false);
      },
      error: () => {
        this.ctx.setScenariosError(
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0438.',
        );
        this.ctx.setScenarios([]);
        this.ctx.setScenariosLoading(false);
      },
    });

    this.deps.contentApi.getItems().subscribe({
      next: (items) => {
        this.ctx.setShopItems(items);
      },
      error: (error) => {
        this.ctx.logDevError('content-items-load-failed', error);
        this.ctx.setShopItems([]);
      },
    });

    this.deps.contentApi.getExams().subscribe({
      next: (exams) => {
        this.ctx.setExamDefinitions(exams);
      },
      error: (error) => {
        this.ctx.logDevError('content-exams-load-failed', error);
        this.ctx.setExamDefinitions([]);
      },
    });

    this.deps.contentApi.getQuestions().subscribe({
      next: (questions) => {
        this.ctx.setExamQuestions(questions);
      },
      error: (error) => {
        this.ctx.logDevError('content-questions-load-failed', error);
        this.ctx.setExamQuestions([]);
      },
    });

    this.deps.contentApi.getIncidents().subscribe({
      next: (incidents) => {
        this.ctx.setIncidentTemplates(incidents);
      },
      error: (error) => {
        this.ctx.logDevError('content-incidents-load-failed', error);
        this.ctx.setIncidentTemplates([]);
      },
    });

    this.deps.contentApi.getQuickFixes().subscribe({
      next: (quickFixes) => {
        this.ctx.setQuickFixes(quickFixes);
      },
      error: (error) => {
        this.ctx.logDevError('content-quickfix-load-failed', error);
        this.ctx.setQuickFixes([]);
      },
    });
  }

  async registerRemote(login: string, password: string, profession: string): Promise<AuthResult> {
    const normalizedLogin = login.trim();
    const normalizedPassword = password.trim();
    const normalizedProfession = profession.trim();
    if (
      normalizedLogin.length === 0 ||
      normalizedPassword.length === 0 ||
      normalizedProfession.length === 0
    ) {
      return {
        ok: false,
        error:
          '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043b\u043e\u0433\u0438\u043d, \u043f\u0430\u0440\u043e\u043b\u044c \u0438 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u044e',
      };
    }
    const result = await this.performAuthRequest(
      '/api/auth/register',
      { login: normalizedLogin, password: normalizedPassword },
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442',
      {
        400: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043b\u043e\u0433\u0438\u043d \u0438 \u043f\u0430\u0440\u043e\u043b\u044c',
        409: '\u041b\u043e\u0433\u0438\u043d \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442',
        429: '\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u043f\u043e\u043f\u044b\u0442\u043e\u043a. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.',
      },
    );
    if (!result.ok) {
      return result;
    }
    this.ctx.registerLocal(normalizedLogin, normalizedPassword, normalizedProfession);
    this.ctx.setRemoteProgressEnabled(true);
    return { ok: true };
  }

  async loginRemote(login: string, password: string): Promise<AuthResult> {
    const normalizedLogin = login.trim();
    const normalizedPassword = password.trim();
    if (normalizedLogin.length === 0 || normalizedPassword.length === 0) {
      return {
        ok: false,
        error:
          '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043b\u043e\u0433\u0438\u043d \u0438 \u043f\u0430\u0440\u043e\u043b\u044c',
      };
    }
    const result = await this.performAuthRequest(
      '/api/auth/login',
      { login: normalizedLogin, password: normalizedPassword },
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043e\u0439\u0442\u0438',
      {
        400: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043b\u043e\u0433\u0438\u043d \u0438 \u043f\u0430\u0440\u043e\u043b\u044c',
        401: '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043b\u043e\u0433\u0438\u043d \u0438\u043b\u0438 \u043f\u0430\u0440\u043e\u043b\u044c',
        429: '\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u043f\u043e\u043f\u044b\u0442\u043e\u043a. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.',
      },
    );
    if (!result.ok) {
      return result;
    }
    const currentAuth = this.ctx.getAuth();
    this.ctx.setAuth({
      login: normalizedLogin,
      profession: currentAuth.profession ?? '',
      isRegistered: true,
    });
    this.ctx.setRemoteProgressEnabled(true);
    await this.hydrateFromRemote();
    if (!this.ctx.getAuth().isRegistered) {
      this.ctx.setAuth({
        login: normalizedLogin,
        profession: currentAuth.profession ?? '',
        isRegistered: true,
      });
    }
    this.ctx.setFeatureFlag('demoMode', false);
    return { ok: true };
  }

  persistProgress(): void {
    const payload = this.ctx.buildPersistPayload();
    if (this.ctx.getRemoteProgressEnabled()) {
      this.ctx.persistToStorage(payload);
      this.scheduleRemotePersist(payload);
      return;
    }
    this.ctx.persistToStorage(payload);
  }

  private async performAuthRequest(
    url: string,
    payload: Record<string, unknown>,
    fallback: string,
    statusMap: Record<number, string>,
  ): Promise<AuthResult> {
    if (typeof fetch !== 'function') {
      return { ok: false, error: fallback };
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return { ok: true };
      }
      const data = await response.json().catch(() => null);
      const mapped = statusMap[response.status];
      const error = mapped || (typeof data?.error === 'string' ? data.error : null) || fallback;
      return { ok: false, error };
    } catch {
      return { ok: false, error: fallback };
    }
  }

  private async hydrateFromRemote(): Promise<void> {
    if (typeof fetch !== 'function') {
      return;
    }
    try {
      const response = await fetch('/api/progress', { credentials: 'include' });
      if (response.status === 401) {
        return;
      }
      if (!response.ok) {
        return;
      }
      const data = await response.json().catch(() => null);
      this.ctx.setRemoteProgressEnabled(true);
      const stateJson = typeof data?.stateJson === 'string' ? data.stateJson : null;
      if (!stateJson) {
        this.ctx.applyPersistedState(this.ctx.buildEmptyPersistPayload(), { allowLegacy: false });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(stateJson);
      } catch (error) {
        this.ctx.captureError(error, 'persist:remote-parse');
        return;
      }
      const migrated = migratePersistedState(parsed);
      if (!migrated) {
        return;
      }
      const result = this.ctx.applyPersistedState(migrated, { allowLegacy: false });
      if (!result.ok) {
        this.ctx.captureError(
          new Error(result.error ?? 'Invalid remote payload'),
          'persist:remote-apply',
        );
      }
    } catch (error) {
      this.ctx.captureError(error, 'persist:remote-load');
    }
  }

  private scheduleRemotePersist(payload: PersistedStateLatest): void {
    this.ctx.setRemotePendingPayload(payload);
    if (this.ctx.getRemoteSaveTimer() !== null) {
      return;
    }
    const timer = window.setTimeout(() => {
      this.ctx.setRemoteSaveTimer(null);
      void this.flushRemotePersist();
    }, 1500);
    this.ctx.setRemoteSaveTimer(timer);
  }

  private async flushRemotePersist(): Promise<void> {
    if (this.ctx.getRemoteSaveInFlight()) {
      return;
    }
    const payload = this.ctx.getRemotePendingPayload();
    if (!payload) {
      return;
    }
    this.ctx.setRemotePendingPayload(null);
    let serialized = '';
    try {
      serialized = JSON.stringify(payload);
    } catch {
      return;
    }
    if (serialized === this.ctx.getRemoteLastSerialized()) {
      return;
    }
    if (serialized.length > 1_000_000) {
      return;
    }
    this.ctx.setRemoteSaveInFlight(true);
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stateJson: serialized }),
      });
      if (response.status === 401) {
        this.ctx.setRemoteProgressEnabled(false);
        this.ctx.persistToStorage(payload);
        return;
      }
      if (response.ok) {
        this.ctx.setRemoteLastSerialized(serialized);
      }
    } catch (error) {
      this.ctx.captureError(error, 'persist:remote-save');
    } finally {
      this.ctx.setRemoteSaveInFlight(false);
    }
  }
}
