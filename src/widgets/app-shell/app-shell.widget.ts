import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ErrorLogStore } from '@/shared/lib/errors';

type NavItem = {
  label: string;
  path: string;
  exact: boolean;
  meta: string;
};

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Overview', path: '/', exact: true, meta: 'Home' },
  { label: 'Onboarding', path: '/onboarding', exact: false, meta: 'Start' },
  { label: 'Skills', path: '/skills', exact: false, meta: 'Graph' },
  { label: 'Simulator', path: '/simulator', exact: false, meta: 'Run' },
  { label: 'Analytics', path: '/analytics', exact: false, meta: 'Insights' },
  { label: 'Debug', path: '/debug', exact: false, meta: 'Dev' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.widget.html',
  styleUrl: './app-shell.widget.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellWidget {
  protected readonly navItems = NAV_ITEMS;
  private readonly errorLog = inject(ErrorLogStore);

  protected readonly fatalError = this.errorLog.fatalError;
  protected readonly errorLogEntries = this.errorLog.lastFive;

  @ViewChildren('navLink') private readonly navLinks!: QueryList<ElementRef<HTMLElement>>;

  protected onNavKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }

    const links = this.navLinks?.toArray().map((link) => link.nativeElement) ?? [];
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
}
