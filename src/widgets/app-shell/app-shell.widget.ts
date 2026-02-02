import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
}
