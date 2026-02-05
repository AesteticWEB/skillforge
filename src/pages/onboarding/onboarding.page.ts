import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';

type OnboardingStep = {
  id: 'resources' | 'scenarios' | 'exams' | 'company';
  title: string;
  bullets: string[];
  nextText: string;
  actionLabel: string;
  actionRoute?: string;
  actionDisabled?: boolean;
};

@Component({
  selector: 'app-onboarding-page',
  imports: [CardComponent, ButtonComponent, RouterLink],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  protected readonly onboardingCompleted = this.store.onboardingCompleted;
  protected readonly stepIndex = signal(0);
  protected readonly steps = computed<OnboardingStep[]>(() => {
    const companyUnlocked = this.store.companyUnlocked();
    const companyLockedNote = 'Откроется позже при Senior и сертификате.';

    return [
      {
        id: 'resources',
        title: 'Ресурсы',
        bullets: [
          'Coins — валюта для покупок и действий.',
          'XP приходит за сценарии и помогает расти.',
          'Репутация и техдолг — последствия решений.',
          'Следи за балансом: долг мешает, репутация помогает.',
        ],
        nextText: 'Открой профиль и проверь стартовые метрики.',
        actionLabel: 'Перейти в профиль',
        actionRoute: '/profile',
      },
      {
        id: 'scenarios',
        title: 'Сценарии',
        bullets: [
          'Проходи ситуации по своей профессии.',
          'Выбирай решение → получаешь награды и последствия.',
          'Пройденные сценарии закрываются, открывая следующий этап.',
        ],
        nextText: 'Выбери сценарий в симуляторе и пройди его.',
        actionLabel: 'Открыть симулятор',
        actionRoute: '/simulator',
      },
      {
        id: 'exams',
        title: 'Экзамены',
        bullets: [
          'Экзамен проверяет уровень этапа.',
          'Успех даёт сертификат и доступ к росту.',
          'Ошибки — это нормально: можно пересдавать.',
        ],
        nextText: 'Проверь уровень на экзамене своего этапа.',
        actionLabel: 'Открыть экзамен',
        actionRoute: '/exam',
      },
      {
        id: 'company',
        title: 'Company + Shop',
        bullets: [
          'Company mode открывается ближе к senior уровню.',
          'Shop даёт предметы/баффы, которые усиливают прогресс.',
          'Смотри «что дальше» на главной — игра подскажет следующий шаг.',
          ...(companyUnlocked ? [] : [companyLockedNote]),
        ],
        nextText: companyUnlocked
          ? 'Загляни в company режим и проверь команду.'
          : 'Загляни в магазин и посмотри доступные баффы.',
        actionLabel: companyUnlocked ? 'Открыть Company' : 'Открыть Shop',
        actionRoute: companyUnlocked ? '/company' : '/shop',
        actionDisabled: false,
      },
    ];
  });
  protected readonly totalSteps = computed(() => this.steps().length);
  protected readonly currentStep = computed(() => this.steps()[this.stepIndex()]);
  protected readonly progressLabel = computed(
    () => `Шаг ${this.stepIndex() + 1}/${this.totalSteps()}`,
  );
  protected readonly progressPercent = computed(() => {
    const total = this.totalSteps();
    return total > 0 ? Math.round(((this.stepIndex() + 1) / total) * 100) : 0;
  });
  protected readonly isFirstStep = computed(() => this.stepIndex() === 0);
  protected readonly isLastStep = computed(() => this.stepIndex() === this.totalSteps() - 1);

  constructor() {
    effect(() => {
      if (this.onboardingCompleted()) {
        void this.router.navigateByUrl('/');
      }
    });
  }

  protected nextStep(): void {
    this.stepIndex.update((current) => Math.min(current + 1, this.totalSteps() - 1));
  }

  protected prevStep(): void {
    this.stepIndex.update((current) => Math.max(0, current - 1));
  }

  protected finishOnboarding(): void {
    this.store.setOnboardingCompleted(true);
    void this.router.navigateByUrl('/');
  }

  protected skipOnboarding(): void {
    this.store.setOnboardingCompleted(true);
    void this.router.navigateByUrl('/');
  }
}
