import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { NotificationsStore } from '@/features/notifications';
import { ErrorLogStore } from '@/shared/lib/errors';
import { ToastHostWidget } from '../toast-host/toast-host.widget';

type NavItem = {
  label: string;
  path: string;
  exact: boolean;
  meta: string;
  requiresCompany?: boolean;
  lockHint?: string;
};

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Главная', path: '/', exact: true, meta: 'Старт' },
  { label: 'Профиль', path: '/profile', exact: false, meta: 'Шаг 1' },
  { label: 'Навыки', path: '/skills', exact: false, meta: 'Шаг 2' },
  { label: 'Магазин', path: '/shop', exact: false, meta: 'Бонусы' },
  {
    label: 'Компания',
    path: '/company',
    exact: false,
    meta: 'Контракты',
    requiresCompany: true,
    lockHint: 'Откроется после достижения Senior',
  },
  { label: 'Симулятор', path: '/simulator', exact: false, meta: 'Шаг 3' },
  { label: 'Экзамен', path: '/exam', exact: false, meta: 'Арена' },
  { label: 'Аналитика', path: '/analytics', exact: false, meta: 'Итоги' },
  { label: 'Дебаг', path: '/debug', exact: false, meta: 'Dev' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHostWidget],
  templateUrl: './app-shell.widget.html',
  styleUrl: './app-shell.widget.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellWidget {
  private readonly store = inject(AppStore);
  protected readonly navItems = NAV_ITEMS;
  private readonly errorLog = inject(ErrorLogStore);
  private readonly notifications = inject(NotificationsStore);

  protected readonly fatalError = this.errorLog.fatalError;
  protected readonly errorLogEntries = this.errorLog.lastFive;
  protected readonly isRegistered = this.store.isRegistered;

  @ViewChildren('navLink') private readonly navLinks!: QueryList<ElementRef<HTMLElement>>;

  protected onNavKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }

    const links =
      this.navLinks
        ?.toArray()
        .map((link) => link.nativeElement)
        .filter((link) => link.getAttribute('data-disabled') !== 'true') ?? [];
    if (links.length === 0) {
      return;
    }

    const currentIndex = links.findIndex((link) => link === document.activeElement);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowDown') {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % links.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = currentIndex <= 0 ? links.length - 1 : currentIndex - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = links.length - 1;
    }

    event.preventDefault();
    links[nextIndex]?.focus();
  }

  protected clearFatalError(): void {
    this.errorLog.clearFatal();
  }

  protected clearAllErrors(): void {
    this.errorLog.clearAll();
  }

  protected isNavLocked(): boolean {
    return !this.isRegistered();
  }

  protected isItemLocked(item: NavItem): boolean {
    return Boolean(item.requiresCompany && !this.store.companyUnlocked());
  }

  protected notifyLockedNav(): void {
    this.notifications.notify('Чтобы продолжить, зарегистрируйтесь.', 'info');
  }

  protected notifyCompanyLocked(): void {
    this.notifications.notify('Откроется после достижения Senior.', 'info');
  }
}
