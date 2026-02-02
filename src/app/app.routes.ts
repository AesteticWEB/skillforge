import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'SkillForge',
    loadComponent: () => import('../pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'onboarding',
    title: 'Onboarding · SkillForge',
    loadComponent: () =>
      import('../pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'skills',
    title: 'Skills · SkillForge',
    loadComponent: () => import('../pages/skills/skills.page').then((m) => m.SkillsPage),
  },
  {
    path: 'simulator',
    title: 'Simulator · SkillForge',
    loadComponent: () =>
      import('../pages/simulator/simulator.page').then((m) => m.SimulatorPage),
  },
  {
    path: 'analytics',
    title: 'Analytics · SkillForge',
    loadComponent: () =>
      import('../pages/analytics/analytics.page').then((m) => m.AnalyticsPage),
  },
];
