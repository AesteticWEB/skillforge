import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly navItems = [
    { label: 'Overview', path: '/', exact: true, meta: 'Home' },
    { label: 'Onboarding', path: '/onboarding', exact: false, meta: 'Start' },
    { label: 'Skills', path: '/skills', exact: false, meta: 'Graph' },
    { label: 'Simulator', path: '/simulator', exact: false, meta: 'Run' },
    { label: 'Analytics', path: '/analytics', exact: false, meta: 'Insights' },
  ];
}
