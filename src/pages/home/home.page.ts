import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { InputComponent } from '@/shared/ui/input';
import { PROFESSION_OPTIONS } from '@/shared/config';
import { RANK_STAGES } from '@/shared/lib/rank';

@Component({
  selector: 'app-home-page',
  imports: [CardComponent, ButtonComponent, InputComponent, RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  protected readonly isLoginOpen = signal(false);
  protected readonly login = signal('');
  protected readonly password = signal('');
  protected readonly profession = signal('');
  protected readonly professionOptions = PROFESSION_OPTIONS;
  protected readonly rankStages = RANK_STAGES;
  protected readonly hasProfile = this.store.hasProfile;
  protected readonly isRegistered = this.store.isRegistered;
  protected readonly auth = this.store.auth;
  protected readonly xp = this.store.xp;
  protected readonly rankProgress = this.store.rankProgress;
  protected readonly loginBlockReason = computed(() => {
    if (this.login().trim().length === 0) {
      return 'Введите логин';
    }
    if (this.password().trim().length === 0) {
      return 'Введите пароль';
    }
    if (this.profession().trim().length === 0) {
      return 'Выберите профессию';
    }
    return null;
  });
  protected readonly isLoginDisabled = computed(() => this.loginBlockReason() !== null);

  protected openLogin(): void {
    this.isLoginOpen.set(true);
  }

  protected closeLogin(): void {
    this.isLoginOpen.set(false);
  }

  protected submitLogin(): void {
    if (this.isLoginDisabled()) {
      return;
    }

    const registered = this.store.register(this.login(), this.password(), this.profession());
    if (registered) {
      this.password.set('');
      this.isLoginOpen.set(false);
    }
  }

  protected startOnboarding(): void {
    void this.router.navigateByUrl('/onboarding');
  }

  protected setProfession(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.profession.set(target?.value ?? '');
  }
}
